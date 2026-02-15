"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { User, Bell, Building2, Lock, Mail, Save, Eye, EyeOff, Upload, Image as ImageIcon, Palette, Workflow, Accessibility, Loader2, Send, CheckCircle } from '@/components/ui/icons';
import SiteSelector from '@/components/ui/SiteSelector';
import { AlertSettingsCard } from '@/components/settings/AlertSettingsCard';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { WorkflowTab } from '@/components/settings/WorkflowTab';
import { AccessibilityTab } from '@/components/settings/AccessibilityTab';

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

type Tab = 'profile' | 'appearance' | 'notifications' | 'workflow' | 'accessibility' | 'company';

export default function SettingsPage() {
  const { profile, companyId, siteId, company, role, userId } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    position_title: '',
    home_site: '',
  });
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Notification settings
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  
  // Company settings
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Email connection test
  const [emailConfig, setEmailConfig] = useState<{
    configured: boolean;
    details?: { resendFrom?: string };
  } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [lastTestSent, setLastTestSent] = useState<number | null>(null);

  const defaults = useMemo<ProfileSettings | null>(() => {
    if (!userId || !companyId) return null;
    return {
      user_id: userId,
      company_id: companyId,
      site_id: siteId || null,
      receive_email_digests: true,
      include_incidents: true,
      include_tasks: true,
      notify_temperature_warnings: true,
      sound_vibration: false,
    };
  }, [userId, companyId, siteId]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        position_title: profile.position_title || '',
        home_site: profile.home_site || '',
      });
    }
  }, [profile]);

  // Load notification settings
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId || !companyId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profile_settings")
          .select("*")
          .eq("profile_id", userId)
          .limit(1);
        
        if (error) {
          // Extract meaningful error information
          const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
          const errorInfo = {
            message: error.message || 'Unknown error',
            code: error.code || 'NO_CODE',
            details: error.details || null,
            hint: error.hint || null,
            // Check if error object has any properties
            hasProperties: errorKeys.length > 0,
            keys: errorKeys,
            // Stringified version for debugging
            stringified: JSON.stringify(error),
            // Raw error for inspection
            raw: error
          };
          
          // Log error information for debugging
          // Empty error objects ({}) typically indicate:
          // - Table doesn't exist (PGRST116)
          // - RLS policy violation (406)
          // - Network/connection issue
          if (errorInfo.hasProperties || errorInfo.message !== 'Unknown error') {
            console.error('Error loading settings:', errorInfo);
          } else {
            // Empty error object - likely table doesn't exist or RLS issue
            console.warn('Settings query returned empty error object. This may indicate the profile_settings table does not exist or RLS is blocking access. Using defaults.');
          }
          // Always use defaults when there's an error - this is safe
        }
        
        const row = data?.[0] as ProfileSettings | undefined;
        setSettings(row ?? defaults);
        setLogoUrl(company?.logo_url ?? null);
      } catch (e) {
        // Handle caught errors with better information extraction
        const errorInfo = e instanceof Error 
          ? { message: e.message, stack: e.stack, name: e.name }
          : { error: e, type: typeof e, stringified: JSON.stringify(e) };
        console.error('Error loading settings:', errorInfo);
        // Use defaults on error
        setSettings(defaults);
        setLogoUrl(company?.logo_url ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId, companyId, defaults, company]);

  // Check email configuration on mount
  useEffect(() => {
    fetch('/api/test-email-config')
      .then((r) => r.json())
      .then(setEmailConfig)
      .catch(() => setEmailConfig({ configured: false }));
  }, []);

  const canSendTest = !lastTestSent || Date.now() - lastTestSent > 60000;

  // Re-enable button after cooldown
  useEffect(() => {
    if (!lastTestSent) return;
    const remaining = 60000 - (Date.now() - lastTestSent);
    if (remaining <= 0) return;
    const timer = setTimeout(() => setLastTestSent(null), remaining);
    return () => clearTimeout(timer);
  }, [lastTestSent]);

  const handleSendTestEmail = async () => {
    if (!profileForm.email) {
      toast.error('No email address found on your profile');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profileForm.email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Test email sent! Check your inbox.');
        setLastTestSent(Date.now());
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch {
      toast.error('Network error sending test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const updateSettings = (key: keyof ProfileSettings, value: boolean | string | null) => {
    setSettings((s) => (s ? { ...s, [key]: value } as ProfileSettings : s));
  };

  const saveProfile = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name || null,
          phone_number: profileForm.phone_number || null,
          position_title: profileForm.position_title || null,
          home_site: profileForm.home_site || null,
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(`Failed to change password: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = { ...settings } as any;
      const { error } = await supabase.from("profile_settings").upsert(payload, { onConflict: "profile_id" });
      if (error) {
        throw error;
      }
      toast.success('Notification settings saved');
    } catch (error: any) {
      console.error('Error saving notifications:', error);
      
      // Handle empty error objects or errors without messages
      let errorMessage = 'Failed to save settings';
      if (error) {
        if (error.message) {
          errorMessage = `Failed to save settings: ${error.message}`;
        } else if (error.code) {
          errorMessage = `Failed to save settings (${error.code})`;
        } else if (typeof error === 'string') {
          errorMessage = `Failed to save settings: ${error}`;
        } else {
          // Try to extract any useful information from the error
          const errorStr = JSON.stringify(error);
          if (errorStr && errorStr !== '{}') {
            errorMessage = `Failed to save settings: ${errorStr}`;
          }
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!companyId) {
      toast.error('No company detected');
      return;
    }
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
      toast.success('Logo updated successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(`Failed to upload logo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-theme-secondary">Loading settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'workflow' as Tab, label: 'Workflow', icon: Workflow },
    { id: 'accessibility' as Tab, label: 'Accessibility', icon: Accessibility },
    ...(role === 'Admin' ? [{ id: 'company' as Tab, label: 'Company', icon: Building2 }] : []),
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">Settings</h1>
        <p className="text-theme-secondary">Manage your account, notifications, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-theme mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2
                ${isActive
                  ? "border-module-fg text-module-fg"
                  : "border-transparent text-theme-secondary hover:text-theme-secondary"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Information */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-theme-button border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] text-theme-secondary cursor-not-allowed"
                />
                <p className="text-xs text-theme-tertiary mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-theme-button border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                  placeholder="+44 123 456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Position Title
                </label>
                <input
                  type="text"
                  value={profileForm.position_title}
                  onChange={(e) => setProfileForm({ ...profileForm, position_title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-theme-button border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                  placeholder="e.g., Manager, Chef, Staff"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Home Site
                </label>
                <SiteSelector
                  value={profileForm.home_site}
                  onChange={(id) => setProfileForm({ ...profileForm, home_site: id || '' })}
                  placeholder="Select home site"
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-6">
              <Button
                onClick={saveProfile}
                disabled={saving}
                loading={saving}
                variant="primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Change Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 rounded-lg bg-theme-button border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme-secondary"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 rounded-lg bg-theme-button border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme-secondary"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-theme-tertiary">
                Password must be at least 6 characters long
              </p>
            </div>
            <div className="mt-6">
              <Button
                onClick={changePassword}
                disabled={saving || !passwordForm.newPassword || !passwordForm.confirmPassword}
                loading={saving}
                variant="primary"
              >
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && <AppearanceTab />}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && settings && (
        <div className="space-y-6">
          {/* Email Connection Card */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Email Connection
            </h2>

            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {emailConfig === null ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                ) : emailConfig.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Not Configured
                  </span>
                )}
              </div>

              {/* Config Details */}
              {emailConfig?.configured && emailConfig.details?.resendFrom && (
                <div className="text-sm text-theme-secondary space-y-1 p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                  <p><span className="text-theme-tertiary">Sender:</span> {emailConfig.details.resendFrom}</p>
                  <p><span className="text-theme-tertiary">Domain:</span> {emailConfig.details.resendFrom.split('@')[1]}</p>
                </div>
              )}

              {/* Not configured message */}
              {emailConfig && !emailConfig.configured && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Configure Resend API key in environment variables to enable email delivery.
                </p>
              )}

              {/* Send Test Email */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSendTestEmail}
                  disabled={!emailConfig?.configured || isSendingTest || !canSendTest}
                  variant="outline"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
                {lastTestSent && !canSendTest && (
                  <p className="text-xs text-theme-tertiary">Please wait 60 seconds before sending another test</p>
                )}
              </div>

              {/* Email Preview */}
              <details className="mt-2">
                <summary className="text-sm text-theme-tertiary cursor-pointer hover:text-theme-secondary transition-colors">
                  Preview email content
                </summary>
                <div className="mt-2 p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] text-sm text-theme-secondary space-y-1">
                  <p><span className="text-theme-tertiary">From:</span> Opsly &lt;noreply@opslytech.com&gt;</p>
                  <p><span className="text-theme-tertiary">To:</span> {profileForm.email || 'your email'}</p>
                  <p><span className="text-theme-tertiary">Subject:</span> Opsly Test Email</p>
                  <p className="pt-2 text-theme-tertiary">Confirms your email system is configured correctly and lists the types of emails the platform can send (digests, notifications, recruitment, invitations).</p>
                </div>
              </details>
            </div>
          </div>

          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                <div className="flex-1">
                  <p className="font-medium text-theme-primary">Receive Daily Email Digest</p>
                  <p className="text-sm text-theme-secondary mt-1">Sends a daily summary to your email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.receive_email_digests}
                    onChange={(e) => updateSettings("receive_email_digests", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 dark:focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {settings.receive_email_digests && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                    <div className="flex-1">
                      <p className="font-medium text-theme-primary">Include Incident Counts</p>
                      <p className="text-sm text-theme-secondary mt-1">Show open incidents in digest</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.include_incidents}
                        onChange={(e) => updateSettings("include_incidents", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 dark:focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                    <div className="flex-1">
                      <p className="font-medium text-theme-primary">Include Task Summary</p>
                      <p className="text-sm text-theme-secondary mt-1">Show incomplete tasks for today</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.include_tasks}
                        onChange={(e) => updateSettings("include_tasks", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 dark:focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                    <div className="flex-1">
                      <p className="font-medium text-theme-primary">Temperature Warnings</p>
                      <p className="text-sm text-theme-secondary mt-1">Include failed temperature logs in digest</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notify_temperature_warnings}
                        onChange={(e) => updateSettings("notify_temperature_warnings", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 dark:focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </>
              )}

              {/* In-App Alert Settings - Uses the AlertSettingsCard component */}
              <AlertSettingsCard />
            </div>
            <div className="mt-6">
              <Button
                onClick={saveNotifications}
                disabled={saving}
                loading={saving}
                variant="primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Tab */}
      {activeTab === 'workflow' && <WorkflowTab />}

      {/* Accessibility Tab */}
      {activeTab === 'accessibility' && <AccessibilityTab />}

      {/* Company Tab (Admin only) */}
      {activeTab === 'company' && role === 'Admin' && (
        <div className="space-y-6">
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Company Branding
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="h-16 w-auto object-contain border border-theme rounded-lg p-2 bg-gray-50 dark:bg-white/[0.02]"
                    />
                  ) : (
                    <div className="h-16 w-32 border border-theme rounded-lg p-2 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadLogo(file);
                      }}
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      className="cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-theme-tertiary mt-2">
                  Recommended size: 320×80px (PNG or SVG). Logo will appear in headers and emails.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Billing & Plans
            </h2>
            <div className="text-center py-8">
              <p className="text-theme-secondary mb-4">
                Billing management will be available soon.
              </p>
              <p className="text-sm text-theme-tertiary">
                Contact support for billing inquiries or plan changes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
