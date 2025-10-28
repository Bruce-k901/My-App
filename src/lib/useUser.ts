import { useAppContext } from "@/context/AppContext";

export function useUser() {
  const { profile, companyId, siteId } = useAppContext();
  
  return {
    profile: {
      ...profile,
      company_id: companyId,
      site_id: siteId
    }
  };
}
