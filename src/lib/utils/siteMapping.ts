export async function mapSiteNamesToIds(supabase: any, companyId: string, names: string[]): Promise<string[]> {
  if (!names?.length) return [];
  const { data, error } = await supabase
    .from("sites")
    .select("id,name")
    .eq("company_id", companyId);
  if (error) throw error;
  const nameToId = Object.fromEntries((data || []).map((s: any) => [s.name, s.id]));
  return names.map((n) => nameToId[n]).filter(Boolean);
}