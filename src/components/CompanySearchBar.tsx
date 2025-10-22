"use client";
import { useState, useEffect } from "react";

interface SearchResult {
  id: string;
  name: string;
  postcode?: string;
  region?: string;
}

export default function CompanySearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/companyLookup?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err: any) {
        console.warn("Lookup failed", err);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => clearTimeout(delay);
  }, [query]);

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Start typing company name..."
        className="w-full rounded border border-gray-300 p-2 text-black"
      />
      {loading && <div className="absolute right-3 top-2 text-xs text-gray-400">...</div>}

      {results.length > 0 && (
        <ul className="absolute z-50 bg-white border border-gray-200 rounded shadow-md w-full max-h-60 overflow-y-auto">
          {results.map((r) => (
            <li
              key={r.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setQuery(r.name);
                setResults([]);
                // later: trigger form autofill here
              }}
            >
              <div className="font-medium text-black">{r.name}</div>
              {r.postcode && (
                <div className="text-xs text-gray-600">
                  {r.postcode} • {r.region}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}