"use client";

import { useAppContext } from "@/context/AppContext";
import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OrganizationBusinessPage() {
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

              console.log("✅ Synced existing company to metadata");
              // Use router.refresh() instead of window.location.reload() to prevent hydration issues
              router.refresh();
            }
          } catch (e) {
            console.error("Error syncing company to metadata:", e);
            // non-fatal, continue
          }
        }
      } catch (e) {
        // non-fatal
      }
    }

    syncCompanyToMetadata();
  }, [user, router]);

  // Layout already handles hydration - just render content
  return (
    <div className="w-full">
      <OrgContentWrapper title="" suppressHydrationWarning>
        <BusinessDetailsTab />
      </OrgContentWrapper>
    </div>
  );
}