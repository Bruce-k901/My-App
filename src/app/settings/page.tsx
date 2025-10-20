'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/ToastProvider';
import { AppContextProvider } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import CheckboxCustom from '@/components/ui/CheckboxCustom';

import Image from 'next/image';
import logoFallback from '@/assets/checkly_logo_touching_blocks.png';

type ProfileSettings = {
  user_id: string;
  company_id: string;
  site_id: string | null;
  receive_email_digests: boolean;
  include_incidents: boolean;
  include_tasks: boolean;
  notify_temperature_warnings: boolean;
  sound_vibration: boolean;
};

function SettingsInner() {
  const { userId, companyId, siteId, company, role, refresh } = useAppContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const defaults = useMemo<ProfileSettings | null>(() => {
    if (!userId || !companyId) return null;
    return {
      user_id: userId,
      company_id: companyId,
      site_id: siteId,
      receive_email_digests: true,
      include_incidents: true,
      include_tasks: true,
      notify_temperature_warnings: true,
      sound_vibration: false,
    };
  }, [userId, companyId, siteId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId || !companyId) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("profile_settings")
          .select("*")
          .eq("user_id", userId)
          .limit(1);
        const row = data?.[0] as ProfileSettings | undefined;
        setSettings(row ?? defaults);
        setLogoUrl(company?.logo_url ?? null);
      } catch (e) {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId, companyId, defaults]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Upsert the row (insert or update)
      const payload = { ...settings } as any;
      const { error } = await supabase.from("profile_settings").upsert(payload, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      showToast("Settings saved", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof ProfileSettings, value: boolean | string | null) => {
    setSettings((s) => (s ? { ...s, [key]: value } as ProfileSettings : s));
  };

  const uploadLogo = async (file: File) => {
    if (!companyId) return showToast("No company detected.", "error");
    setUploading(true);
    try {
      const path = `${companyId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("company_logos").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/png",
      } as any);
      if (upErr) throw upErr;
      const { data: pub } = await supabase.storage.from("company_logos").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Failed to retrieve public URL");
      const { error: updErr } = await supabase.from("companies").update({ logo_url: publicUrl }).eq("id", companyId);
      if (updErr) throw updErr;
      setLogoUrl(publicUrl);
      showToast("Logo updated", "success");
      await refresh();
    } catch (e: any) {
      showToast(e?.message || "Failed to upload logo", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <section className="px-6 py-8"><p className="text-slate-400">Loading…</p></section>;
  if (!settings) return <section className="px-6 py-8"><p className="text-slate-400">No settings available.</p></section>;

  return (
    <section className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <p className="text-sm text-slate-400 mb-6">Control notifications and company branding.</p>

      {/* Branding (admins only) */}
      {role === "admin" && (
        <div className="space-y-4 mb-8 p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Company Logo</p>
              <p className="text-sm text-slate-400">Upload a logo for headers and emails.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Show current logo */}
            {logoUrl ? (
              <img src={logoUrl} alt="Company logo" className="h-12 w-auto object-contain border border-neutral-800 rounded" />
            ) : (
              <Image src={logoFallback} alt="Default logo" className="h-12 w-auto object-contain" />
            )}
            <label className="btn-glass text-sm px-3 py-2 cursor-pointer">
              {uploading ? "Uploading…" : "Upload Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                }}
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">Recommended size: 320×80 (PNG or SVG). Stored in public bucket.</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div>
            <p className="font-medium">Receive Daily Email Digest</p>
            <p className="text-sm text-slate-400">Sends a daily summary to your email.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.receive_email_digests}
            onChange={(e) => update("receive_email_digests", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div>
            <p className="font-medium">Include Incident Counts</p>
            <p className="text-sm text-slate-400">Show open incidents in digest.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.include_incidents}
            onChange={(e) => update("include_incidents", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div>
            <p className="font-medium">Include Task Summary</p>
            <p className="text-sm text-slate-400">Show incomplete tasks for today.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.include_tasks}
            onChange={(e) => update("include_tasks", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div>
            <p className="font-medium">Include Tasks</p>
            <p className="text-sm text-slate-400">Include task completion status in digest.</p>
          </div>
          <CheckboxCustom
            checked={settings.include_tasks}
            onChange={(checked: boolean) => update("include_tasks", checked)}
            size={20}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div>
            <p className="font-medium">Temperature Warnings</p>
            <p className="text-sm text-slate-400">Include failed temperature logs in digest.</p>
          </div>
          <CheckboxCustom
            checked={settings.notify_temperature_warnings}
            onChange={(checked: boolean) => update("notify_temperature_warnings", checked)}
            size={20}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded border border-neutral-800 bg-[#0f1220]">
          <div>
            <p className="font-medium">Sound / Vibration on New Alerts</p>
            <p className="text-sm text-slate-400">Play a sound and vibrate (mobile) when a new notification arrives.</p>
          </div>
          <CheckboxCustom
            checked={settings.sound_vibration}
            onChange={(checked: boolean) => update("sound_vibration", checked)}
            size={20}
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="btn-gradient text-sm px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <AppContextProvider>
      <ToastProvider>
        <SettingsInner />
      </ToastProvider>
    </AppContextProvider>
  );
}