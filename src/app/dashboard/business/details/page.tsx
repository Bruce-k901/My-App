"use client";

import { useAppContext } from "@/context/AppContext";
import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import BackToSetup from "@/components/dashboard/BackToSetup";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BusinessDetailsPage() {
  const { user } = useAppContext();
  const router = useRouter();

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
          // Use API route to bypass RLS
          try {
            const response = await fetch(`/api/company/get?id=${profile.company_id}`);
            if (response.ok) {
              const company = await response.json();
              await supabase.auth.updateUser({
                data: {
                  company_id: profile.company_id,
                  company_name: company?.name || "",
                },
              });

              router.refresh();
            }
          } catch (e) {
            console.error("Error syncing company to metadata:", e);
          }
        }
      } catch (e) {
        // non-fatal
      }
    }

    syncCompanyToMetadata();
  }, [user, router]);

  return (
    <div className="w-full">
      <OrgContentWrapper title="Company Details" suppressHydrationWarning>
        <BackToSetup />
        <BusinessDetailsTab />
      </OrgContentWrapper>
    </div>
  );
}
