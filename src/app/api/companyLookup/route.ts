import { NextResponse } from "next/server";
import { deriveRegionFromPostcode } from "@/lib/locationLookup";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  if (!query) return NextResponse.json({ results: [] });

  const res = await fetch(
    `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(process.env.COMPANIES_HOUSE_API_KEY + ":")}`
      }
    }
  );

  const json = await res.json();

  const results =
    json?.items?.slice(0, 10).map((c: any) => {
      const addr = c.address || {};
      const postcode = addr.postal_code || extractPostcode(c.address_snippet);

      return {
        id: c.company_number,
        name: c.title,
        address_line:
          addr.address_line_1 ||
          addr.premises ||
          c.address_snippet?.split(",")[0]?.trim() ||
          "",
        postcode: postcode || "",
        region: deriveRegionFromPostcode(postcode) || "", // << direct tie-in
        status: c.company_status,
      };
    }) || [];

  return NextResponse.json({ results });
}

function extractPostcode(snippet: string | undefined) {
  if (!snippet) return "";
  const match = snippet.match(/\b[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}\b/i);
  return match ? match[0].toUpperCase() : "";
}