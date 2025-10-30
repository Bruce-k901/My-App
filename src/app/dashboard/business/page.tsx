"use client";

import { useAppContext } from "@/context/AppContext";
import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function OrganizationBusinessPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading, user } = useAppContext();

  // One-time sync: if user has a profile company_id but no metadata.company_id, sync it
  useEffect(() => {
    async function syncCompanyToMetadata() {
      try {
        if (!user) return;
        const u: any = user;
        if (u?.user_metadata?.company_id) return; // already synced

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", u.id)
          .single();

        if (profile?.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", profile.company_id)
            .single();

          await supabase.auth.updateUser({
            data: {
              company_id: profile.company_id,
              company_name: company?.name || "",
            },
          });

          console.log("✅ Synced existing company to metadata");
          // Refresh to reload context
          window.location.reload();
        }
      } catch (e) {
        // non-fatal
      }
    }

    syncCompanyToMetadata();
  }, [user]);

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return null;

  return (
    <OrgContentWrapper title="">
      <BusinessDetailsTab />
    </OrgContentWrapper>
  );
}