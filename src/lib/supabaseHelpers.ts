import { supabase } from "@/lib/supabase";

// Enhanced Supabase helpers that require companyId from auth context
// These functions should be used instead of direct supabase.from() calls

export class SupabaseQueryBuilder {
  private companyId: string;
  private table: string;

  constructor(table: string, companyId: string) {
    if (!companyId) {
      throw new Error("Company ID is required for data access");
    }
    this.table = table;
    this.companyId = companyId;
  }

  // Select with automatic company_id filtering
  select(columns: string = "*") {
    return supabase.from(this.table).select(columns).eq("company_id", this.companyId);
  }

  // Insert with automatic company_id
  insert(data: Record<string, any> | Record<string, any>[]) {
    const dataArray = Array.isArray(data) ? data : [data];
    const dataWithCompanyId = dataArray.map(item => ({
      ...item,
      company_id: this.companyId
    }));
    return supabase.from(this.table).insert(dataWithCompanyId);
  }

  // Update with company_id filter
  update(data: Record<string, any>) {
    return supabase.from(this.table).update(data).eq("company_id", this.companyId);
  }

  // Delete with company_id filter
  delete() {
    return supabase.from(this.table).delete().eq("company_id", this.companyId);
  }

  // Upsert with automatic company_id
  upsert(data: Record<string, any> | Record<string, any>[]) {
    const dataArray = Array.isArray(data) ? data : [data];
    const dataWithCompanyId = dataArray.map(item => ({
      ...item,
      company_id: this.companyId
    }));
    return supabase.from(this.table).upsert(dataWithCompanyId);
  }
}

// Factory function to create query builders
export function createQueryBuilder(table: string, companyId: string) {
  return new SupabaseQueryBuilder(table, companyId);
}

// Helper functions for common patterns
export async function fetchCompanyData(
  table: string,
  companyId: string,
  select: string = "*",
  filters: Record<string, any> = {}
) {
  if (!companyId) {
    throw new Error("Company ID is required for data access");
  }

  let query = supabase.from(table).select(select).eq("company_id", companyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

export async function fetchSiteData(
  table: string,
  companyId: string,
  siteId: string,
  select: string = "*",
  filters: Record<string, any> = {}
) {
  if (!companyId) {
    throw new Error("Company ID is required for data access");
  }
  if (!siteId) {
    throw new Error("Site ID is required for site-scoped data access");
  }

  let query = supabase.from(table).select(select).eq("company_id", companyId).eq("site_id", siteId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

export async function insertCompanyData(
  table: string,
  companyId: string,
  data: Record<string, any>
) {
  if (!companyId) {
    throw new Error("Company ID is required for data access");
  }

  const dataWithCompanyId = {
    ...data,
    company_id: companyId
  };

  return supabase.from(table).insert(dataWithCompanyId);
}

export async function updateCompanyData(
  table: string,
  companyId: string,
  data: Record<string, any>,
  filters: Record<string, any> = {}
) {
  if (!companyId) {
    throw new Error("Company ID is required for data access");
  }

  let query = supabase.from(table).update(data).eq("company_id", companyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

export async function deleteCompanyData(
  table: string,
  companyId: string,
  filters: Record<string, any> = {}
) {
  if (!companyId) {
    throw new Error("Company ID is required for data access");
  }

  let query = supabase.from(table).delete().eq("company_id", companyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

// Hook for using Supabase with auth context
export function useSupabaseWithAuth(companyId: string | null) {
  if (!companyId) {
    throw new Error("Company ID is required for data access");
  }

  return {
    query: (table: string) => createQueryBuilder(table, companyId),
    fetchCompanyData: (table: string, select?: string, filters?: Record<string, any>) =>
      fetchCompanyData(table, companyId, select, filters),
    fetchSiteData: (table: string, siteId: string, select?: string, filters?: Record<string, any>) =>
      fetchSiteData(table, companyId, siteId, select, filters),
    insertCompanyData: (table: string, data: Record<string, any>) =>
      insertCompanyData(table, companyId, data),
    updateCompanyData: (table: string, data: Record<string, any>, filters?: Record<string, any>) =>
      updateCompanyData(table, companyId, data, filters),
    deleteCompanyData: (table: string, filters?: Record<string, any>) =>
      deleteCompanyData(table, companyId, filters),
  };
}
