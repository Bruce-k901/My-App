// src/app/api/companyEnrich/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { LRUCache } from "lru-cache";

const COMPANIES_HOUSE_KEY = process.env.COMPANIES_HOUSE_API_KEY;

type EnrichResult = {
  website: string | null;
  address_line: string | null;
  postcode: string | null;
  source: string;
};

// In-memory 24h cache
const CACHE = new LRUCache<string, EnrichResult>({ max: 1000, ttl: 1000 * 60 * 60 * 24 });

// Basic rate limiter (per-IP)
const RATE_LIMIT = 20; // requests
const RATE_WINDOW = 60 * 1000; // per minute
const ipHits = new Map<string, { count: number; start: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = ipHits.get(ip) || { count: 0, start: now };
  if (now - rec.start > RATE_WINDOW) {
    rec.count = 1;
    rec.start = now;
  } else rec.count++;
  ipHits.set(ip, rec);
  return rec.count > RATE_LIMIT;
}

function safeDomain(url: string | undefined | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

function slugifyName(name: string) {
  return (name || "")
    .toLowerCase()
    .replace(/limited|ltd|plc|llp|uk|holdings|group/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24); // keep it simple
}

const DENY_HOSTS = new Set([
  "duckduckgo.com","wikipedia.org","en.wikipedia.org","wikidata.org",
  "facebook.com","m.facebook.com","instagram.com","linkedin.com","x.com","twitter.com",
  "google.com","www.google.com","maps.google.com","youtube.com",
  "yelp.com","trustpilot.com","companieshouse.gov.uk","find-and-update.company-information.service.gov.uk",
  "company-information.service.gov.uk","bing.com"
]);

function hostFrom(url: string | null | undefined) {
  try { return url ? new URL(url).hostname.replace(/^www\./,"") : null; } catch { return null; }
}

function looksLikeOfficial(hostname: string | null, companyName: string) {
  if (!hostname) return false;
  if (DENY_HOSTS.has(hostname) || Array.from(DENY_HOSTS).some(d => hostname.endsWith(d))) return false;
  const token = slugifyName(companyName);
  if (!token) return false;
  const h = hostname.replace(/^www\./,"").toLowerCase();
  // basic fuzzy checks
  return h.includes(token) || token.includes(h.replace(/\.[a-z.]+$/,""));
}

async function fetchJSON(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) return null;
  return await r.json();
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) return null;
  return await r.text();
}

function parseWebsiteFromHtml(html: string, baseUrl?: string) {
  const $ = cheerio.load(html || "");
  const canonical =
    $('link[rel="canonical"]').attr("href") ||
    $('meta[property="og:url"]').attr("content") ||
    $('meta[name="og:url"]').attr("content") ||
    baseUrl;

  const site = safeDomain(canonical || baseUrl); // always reduce to scheme+host
  const addr = $("address").first().text().trim() || null;
  return { website: site, address_line: addr };
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (rateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const companyNumber = searchParams.get("company_number");
  const query = searchParams.get("query");
  const cacheKey = companyNumber ? `ch:${companyNumber}` : `q:${(query || "").toLowerCase()}`;

  if (CACHE.has(cacheKey)) return NextResponse.json(CACHE.get(cacheKey)!);

  // 1) Companies House
  if (companyNumber && COMPANIES_HOUSE_KEY) {
    try {
      const profileUrl = `https://api.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`;
      const auth = "Basic " + Buffer.from(`${COMPANIES_HOUSE_KEY}:`).toString("base64");
      const profile = await fetchJSON(profileUrl, { Authorization: auth });
      if (profile) {
        const website = safeDomain(profile?.links?.website);
        const address =
          profile?.registered_office_address?.address_line_1 ||
          profile?.registered_office_address?.locality ||
          null;
        const postcode = profile?.registered_office_address?.postal_code || null;
        const result = { website, address_line: address, postcode, source: "companies_house" };
        CACHE.set(cacheKey, result);
        if (website) return NextResponse.json(result);
      }
    } catch (err) {
      console.error("Companies House fetch failed:", err);
    }
  }

  // 2) DuckDuckGo fallback
  const searchTerm = query || "";
  if (!searchTerm) return NextResponse.json({ website: null, address_line: null, postcode: null, source: "none" });

  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchTerm)}&format=json`;
    const ddg = await fetchJSON(ddgUrl);
    const candidates: string[] = [];

    const add = (url?: string) => {
      if (url && !candidates.includes(url)) candidates.push(url);
    };

    (ddg?.RelatedTopics || []).forEach((t: any) => {
      if (t.FirstURL) add(t.FirstURL);
      (t.Topics || []).forEach((s: any) => add(s.FirstURL));
    });
    (ddg?.Results || []).forEach((r: any) => add(r.FirstURL));

    const uniq = Array.from(new Set(candidates)).slice(0, 8);

    // Try each candidate
    for (const c of uniq) {
      const h = hostFrom(c);
      if (!looksLikeOfficial(h, searchTerm)) continue;   // << filter here

      try {
        const html = await fetchText(c, { "User-Agent": "EAGBot/1.0 (+https://yourdomain.co)" });
        if (!html) continue;
        const parsed = parseWebsiteFromHtml(html, c);
        const siteHost = hostFrom(parsed.website || c);
        if (!looksLikeOfficial(siteHost, searchTerm)) continue;  // << filter again after parsing

        const out = {
          website: safeDomain(parsed.website || c),
          address_line: parsed.address_line || null,
          postcode: null,
          source: "duckduckgo",
        };
        CACHE.set(cacheKey, out);
        return NextResponse.json(out);
      } catch {
        // try next
      }
    }
  } catch (err) {
    console.error("DuckDuckGo failed:", err);
  }

  const none = { website: null, address_line: null, postcode: null, source: "none" };
  CACHE.set(cacheKey, none);
  return NextResponse.json(none);
}