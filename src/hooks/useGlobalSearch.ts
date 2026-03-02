"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export interface DataSearchResult {
  id: string;
  label: string;
  href: string;
  category: string;
}

interface SearchTable {
  table: string;
  nameColumn: string;
  category: string;
  hrefPrefix: string;
  /** If true, link to hrefPrefix/{id}. Otherwise link to hrefPrefix (list page). */
  linkToDetail: boolean;
}

const SEARCH_TABLES: SearchTable[] = [
  { table: "profiles", nameColumn: "full_name", category: "Staff", hrefPrefix: "/dashboard/people", linkToDetail: true },
  { table: "task_templates", nameColumn: "name", category: "Tasks", hrefPrefix: "/dashboard/tasks/compliance", linkToDetail: false },
  { table: "sop_entries", nameColumn: "title", category: "SOPs", hrefPrefix: "/dashboard/sops/view", linkToDetail: true },
  { table: "incidents", nameColumn: "title", category: "Incidents", hrefPrefix: "/dashboard/incidents", linkToDetail: false },
  { table: "global_documents", nameColumn: "name", category: "Documents", hrefPrefix: "/dashboard/documents", linkToDetail: false },
  { table: "recipes", nameColumn: "name", category: "Recipes", hrefPrefix: "/dashboard/stockly/recipes", linkToDetail: false },
  { table: "stock_items", nameColumn: "name", category: "Stock Items", hrefPrefix: "/dashboard/stockly/stock-items", linkToDetail: false },
  { table: "assets", nameColumn: "name", category: "Assets", hrefPrefix: "/dashboard/assets", linkToDetail: false },
  { table: "suppliers", nameColumn: "name", category: "Suppliers", hrefPrefix: "/dashboard/stockly/suppliers", linkToDetail: false },
];

export function useGlobalSearch(query: string) {
  const { companyId } = useAppContext();
  const [results, setResults] = useState<DataSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(0);

  useEffect(() => {
    if (!query || query.length < 2 || !companyId) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestId = ++abortRef.current;

    const timer = setTimeout(async () => {
      try {
        const promises = SEARCH_TABLES.map(async (t) => {
          const { data, error } = await supabase
            .from(t.table)
            .select(`id, ${t.nameColumn}`)
            .eq("company_id", companyId)
            .ilike(t.nameColumn, `%${query}%`)
            .limit(5);

          if (error || !data) return [];

          return data.map((row: any) => ({
            id: `${t.category}-${row.id}`,
            label: row[t.nameColumn] || "",
            href: t.linkToDetail ? `${t.hrefPrefix}/${row.id}` : t.hrefPrefix,
            category: t.category,
          }));
        });

        const settled = await Promise.allSettled(promises);
        // Only update if this is still the latest request
        if (requestId !== abortRef.current) return;

        const all: DataSearchResult[] = [];
        for (const result of settled) {
          if (result.status === "fulfilled") {
            all.push(...result.value);
          }
        }
        setResults(all);
      } catch {
        // Silently handle — stale request or network error
      } finally {
        if (requestId === abortRef.current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, companyId]);

  return { results, loading };
}
