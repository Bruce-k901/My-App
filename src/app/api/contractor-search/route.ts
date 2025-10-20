import { NextResponse } from "next/server";

type CHItem = {
  title: string;
  company_number: string;
  address_snippet?: string;
  address?: { postal_code?: string; locality?: string };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  const key = process.env.COMPANIES_HOUSE_KEY || "";
  const auth = "Basic " + Buffer.from(key + ":").toString("base64");

  // 1) Companies House search (official name + registered address/postcode)
  const chRes = await fetch(
    `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(
      q
    )}`,
    { headers: { Authorization: auth } }
  );

  if (!chRes.ok) {
    const msg = await chRes.text().catch(() => String(chRes.status));
    console.error("CH error:", chRes.status, msg);
    return NextResponse.json([], { status: 200 }); // fail-soft
  }

  const chJson = await chRes.json().catch(() => ({ items: [] as CHItem[] }));
  const items: CHItem[] = Array.isArray(chJson?.items) ? chJson.items : [];

  // 2) DuckDuckGo enrichment (best-effort website/summary)
  const ddgRes = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(
      q + " UK"
    )}&format=json&no_redirect=1&no_html=1`
  ).catch(() => null);
  const ddg = ddgRes ? await ddgRes.json().catch(() => ({})) : {};
  const ddgWebsite =
    ddg?.AbstractURL ||
    (Array.isArray(ddg?.Results) && ddg.Results[0]?.FirstURL) ||
    "";

  // Map output
  const mapped = items.slice(0, 8).map((c) => ({
    source: "companies_house",
    name: c.title,
    registered_address: c.address_snippet || "",
    postcode: c.address?.postal_code || "",
    locality: c.address?.locality || "",
    company_number: c.company_number,
    website: ddgWebsite, // heuristic; not 1:1 per result, but useful hint
    // You can compute region in DB via trigger; we pass postcode onward.
  }));

  return NextResponse.json(mapped);
}