"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { ArchivedUser } from "@/types/archived-user";
import { ChevronLeft } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

export default function ArchivedUsersPage() {
  const [archived, setArchived] = useState<ArchivedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadArchivedUsers();
  }, []);

  const loadArchivedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("archived_users")
        .select("id, original_id, auth_user_id, full_name, email, role, position_title, company_id, site_id, archived_at, created_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setArchived(data || []);
    } catch (error: any) {
      showToast({
        title: "Failed to load archived users",
        description: error?.message || "Please try again",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (id: string) => {
    const confirmed = confirm("Restore this user?");
    if (!confirmed) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("archived_users")
        .select("auth_user_id, full_name, email, position, role, app_role, boh_foh, company_id, site_id, original_id")
        .eq("id", id)
        .single();

      if (fetchError || !data) throw fetchError || new Error("Archived user not found");

      // Restore to profiles table
      const { error: restoreError } = await supabase.from("profiles").insert({
        auth_user_id: data.auth_user_id,
        full_name: data.full_name,
        email: data.email,
        position_title: data.position, // back into position_title
        role: data.role,
        app_role: data.app_role,
        boh_foh: data.boh_foh,
        company_id: data.company_id,
        site_id: data.site_id,
      });

      if (restoreError) throw restoreError;

      // Remove from archived_users table
      const { error: deleteError } = await supabase
        .from("archived_users")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Update local state
      setArchived(prev => prev.filter(u => u.id !== id));
      
      showToast({
        title: "User restored",
        description: "User has been restored to the active users list",
        type: "success"
      });
    } catch (error: any) {
      showToast({
        title: "Restore failed",
        description: error?.message || "Failed to restore user",
        type: "error"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Archived Users</h2>
        <p className="text-neutral-400">Loading archived users...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-white">
          Archived Users
        </h1>

        <div className="flex gap-2">
          {/* Back to Users */}
          <Tooltip.Provider delayDuration={100}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button 
                  onClick={() => router.push('/dashboard/users')}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500/20 hover:shadow-[0_0_8px_#d946ef] transition-all duration-200" 
                >
                  <ChevronLeft size={18} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content 
                side="top" 
                align="center" 
                sideOffset={6}
                className="rounded-md px-2 py-1 text-sm font-medium bg-neutral-900 border border-fuchsia-500 text-fuchsia-400 shadow-[0_0_6px_#d946ef]"
              >
                Users
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
      
      {archived.length === 0 ? (
        <p className="text-neutral-400">No archived users found.</p>
      ) : (
        archived.map(u => (
          <Card key={u.id} className="bg-neutral-900 border-neutral-700">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div>
                <p className="font-medium text-neutral-200">{u.full_name || "Unknown User"}</p>
                <p className="text-xs text-neutral-400">{u.email}</p>
                {u.role && (
                  <p className="text-xs text-neutral-500 capitalize">{u.role}</p>
                )}
              </div>
              <Button
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                onClick={() => handleUnarchive(u.id)}
              >
                Restore
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}