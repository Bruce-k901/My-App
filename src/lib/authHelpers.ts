import { supabase } from "@/lib/supabase";

// Global fetch helper for consistent Supabase queries
export async function fetchFrom(
  table: string, 
  filters: Record<string, any> = {},
  companyId?: string | null
) {
  // Use the provided companyId or fallback for demos
  const effectiveCompanyId = companyId || "f99510bc-b290-47c6-8f12-282bea67bd91";

  let query = supabase.from(table).select("*").eq("company_id", effectiveCompanyId);
  
  // Apply additional filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

// Helper for fetching with custom select
export async function fetchFromWithSelect(
  table: string,
  select: string,
  filters: Record<string, any> = {},
  companyId?: string | null
) {
  const effectiveCompanyId = companyId || "f99510bc-b290-47c6-8f12-282bea67bd91";

  let query = supabase.from(table).select(select).eq("company_id", effectiveCompanyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

// Helper for inserting with automatic company_id
export async function insertInto(
  table: string,
  data: Record<string, any>,
  companyId?: string | null
) {
  const effectiveCompanyId = companyId || "f99510bc-b290-47c6-8f12-282bea67bd91";
  
  const dataWithCompanyId = {
    ...data,
    company_id: effectiveCompanyId
  };
  
  return supabase.from(table).insert(dataWithCompanyId);
}

// Helper for updating with company_id filter
export async function updateIn(
  table: string,
  data: Record<string, any>,
  filters: Record<string, any> = {},
  companyId?: string | null
) {
  const effectiveCompanyId = companyId || "f99510bc-b290-47c6-8f12-282bea67bd91";

  let query = supabase.from(table).update(data).eq("company_id", effectiveCompanyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

// Helper for deleting with company_id filter
export async function deleteFrom(
  table: string,
  filters: Record<string, any> = {},
  companyId?: string | null
) {
  const effectiveCompanyId = companyId || "f99510bc-b290-47c6-8f12-282bea67bd91";

  let query = supabase.from(table).delete().eq("company_id", effectiveCompanyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}