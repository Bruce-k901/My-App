"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import GlassCard from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";
import {
  Eye, EyeOff, Sparkles, Clipboard, CheckCircle2,
  User, Shield, Building2, Heart, ChevronRight, ChevronLeft,
  Loader2, FileText,
} from "@/components/ui/icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ProfileRow = Record<string, any>;

const TOTAL_STEPS = 6;

const STEP_META: { label: string; icon: any }[] = [
  { label: "Account Security", icon: Shield },
  { label: "Personal Details", icon: User },
  { label: "Compliance", icon: FileText },
  { label: "Banking", icon: Building2 },
  { label: "Emergency Contact", icon: Heart },
  { label: "Complete", icon: CheckCircle2 },
];

/* ------------------------------------------------------------------ */
/*  Shared input class                                                 */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-theme-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teamly/60 focus:border-transparent transition-all duration-200 text-sm";

const selectClass =
  "w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-theme-primary focus:outline-none focus:ring-2 focus:ring-teamly/60 focus:border-transparent transition-all duration-200 text-sm appearance-none";

const labelClass = "block text-theme-tertiary text-sm mb-1.5";

/* ------------------------------------------------------------------ */
/*  Progress bar                                                       */
/* ------------------------------------------------------------------ */

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div
            key={stepNum}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              done
                ? "bg-teamly"
                : active
                  ? "bg-teamly/60"
                  : "bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main content                                                       */
/* ------------------------------------------------------------------ */

function SetupAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state
  const [step, setStep] = useState(1);
  const [canSetup, setCanSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Profile data fetched after step 1
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);

  // Step 1 — Account Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Step 2 — Personal Details
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");

  // Step 3 — Compliance
  const [niNumber, setNiNumber] = useState("");
  const [rtwStatus, setRtwStatus] = useState("");
  const [rtwDocType, setRtwDocType] = useState("");
  const [rtwDocNumber, setRtwDocNumber] = useState("");
  const [rtwExpiry, setRtwExpiry] = useState("");

  // Step 4 — Banking
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Step 5 — Emergency Contact
  const [ecName, setEcName] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecEmail, setEcEmail] = useState("");

  /* ---------------------------------------------------------------- */
  /*  Session establishment (same logic as before)                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const urlParams =
      hash && hash.includes("access_token")
        ? new URLSearchParams(hash.replace("#", ""))
        : undefined;

    const access_token =
      urlParams?.get("access_token") ??
      searchParams?.get("access_token") ??
      null;
    const refresh_token =
      urlParams?.get("refresh_token") ??
      searchParams?.get("refresh_token") ??
      null;
    const code = searchParams?.get("code") ?? null;

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          if (error) {
            setError(
              "Invalid invitation link. Please contact your administrator."
            );
          } else if (data?.session) {
            setCanSetup(true);
          }
        })
        .catch(() => {
          setError(
            "Invalid invitation link. Please contact your administrator."
          );
        });
    } else if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error) {
            setError(
              "Invalid invitation link. Please contact your administrator."
            );
          } else if (data?.session) {
            setCanSetup(true);
          }
        })
        .catch(() => {
          setError(
            "Invalid invitation link. Please contact your administrator."
          );
        });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setCanSetup(true);
        } else {
          setError(
            "No valid session found. Please use the invitation link from your email."
          );
        }
      });
    }
  }, [searchParams]);

  /* ---------------------------------------------------------------- */
  /*  Fetch profile after session is ready                             */
  /* ---------------------------------------------------------------- */

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!prof) return;
    setProfile(prof);

    // Pre-fill form fields from existing data
    setPhone(prof.phone_number || "");
    setDateOfBirth(prof.date_of_birth || "");
    setGender(prof.gender || "");
    setNationality(prof.nationality || "");
    setAddressLine1(prof.address_line_1 || "");
    setAddressLine2(prof.address_line_2 || "");
    setCity(prof.city || "");
    setCounty(prof.county || "");
    setPostcode(prof.postcode || "");
    setNiNumber(prof.national_insurance_number || "");
    setRtwStatus(prof.right_to_work_status || "");
    setRtwDocType(prof.right_to_work_document_type || "");
    setRtwDocNumber(prof.right_to_work_document_number || "");
    setRtwExpiry(prof.right_to_work_expiry || "");
    setBankName(prof.bank_name || "");
    setAccountHolderName(prof.bank_account_name || prof.full_name || "");
    setSortCode(prof.bank_sort_code || "");
    setAccountNumber(prof.bank_account_number || "");

    if (
      prof.emergency_contacts &&
      Array.isArray(prof.emergency_contacts) &&
      prof.emergency_contacts[0]
    ) {
      const ec = prof.emergency_contacts[0];
      setEcName(ec.name || "");
      setEcRelationship(ec.relationship || "");
      setEcPhone(ec.phone || "");
      setEcEmail(ec.email || "");
    }

    // Fetch site name for welcome card
    if (prof.site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("name")
        .eq("id", prof.site_id)
        .single();
      if (site) setSiteName(site.name);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  const generatePassword = () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let p = "";
    for (let i = 0; i < 14; i++) {
      p += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(p);
    setConfirmPassword(p);
    setShowPassword(true);
    setGenerated(true);
  };

  const generatePin = () => {
    setPinCode(Math.floor(1000 + Math.random() * 9000).toString());
  };

  /* ---------------------------------------------------------------- */
  /*  Save helpers per step                                            */
  /* ---------------------------------------------------------------- */

  const saveProfileFields = async (fields: Record<string, any>) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", profile.id);
      if (err) throw err;
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step 1 submit — Password + PIN                                   */
  /* ---------------------------------------------------------------- */

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!canSetup) {
      setError("Please use the invitation link from your email.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!pinCode || pinCode.length !== 4) {
      setError("Please enter a 4-digit PIN code.");
      return;
    }

    setLoading(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) {
        setError(pwErr.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ pin_code: pinCode })
          .eq("id", user.id);
      }

      // Fetch profile data for remaining steps
      await fetchProfile();
      setStep(2);
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step 2 submit — Personal details                                 */
  /* ---------------------------------------------------------------- */

  const handleStep2Next = async () => {
    setError(null);
    try {
      await saveProfileFields({
        phone_number: phone.trim() || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        nationality: nationality.trim() || null,
        address_line_1: addressLine1.trim() || null,
        address_line_2: addressLine2.trim() || null,
        city: city.trim() || null,
        county: county.trim() || null,
        postcode: postcode.trim().toUpperCase() || null,
      });
      setStep(3);
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step 3 submit — Compliance                                       */
  /* ---------------------------------------------------------------- */

  const handleStep3Next = async () => {
    setError(null);
    try {
      await saveProfileFields({
        national_insurance_number: niNumber.trim().toUpperCase() || null,
        right_to_work_status: rtwStatus || null,
        right_to_work_document_type: rtwDocType || null,
        right_to_work_document_number: rtwDocNumber.trim() || null,
        right_to_work_expiry: rtwExpiry || null,
      });
      setStep(4);
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step 4 submit — Banking                                          */
  /* ---------------------------------------------------------------- */

  const handleStep4Next = async () => {
    setError(null);
    try {
      await saveProfileFields({
        bank_name: bankName.trim() || null,
        bank_account_name: accountHolderName.trim() || null,
        bank_account_number: accountNumber.trim() || null,
        bank_sort_code: sortCode.trim().replace(/[^0-9]/g, "") || null,
      });
      setStep(5);
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step 5 submit — Emergency contact                                */
  /* ---------------------------------------------------------------- */

  const handleStep5Next = async () => {
    setError(null);
    try {
      const contacts =
        ecName.trim()
          ? [
              {
                name: ecName.trim(),
                relationship: ecRelationship.trim() || null,
                phone: ecPhone.trim() || null,
                email: ecEmail.trim() || null,
              },
            ]
          : null;

      await saveProfileFields({ emergency_contacts: contacts });
      setStep(6);
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step 6 — redirect to dashboard                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (step === 6) {
      const timer = setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */

  const stepInfo = STEP_META[step - 1];
  const StepIcon = stepInfo.icon;

  const renderNavButtons = (
    onNext: () => void,
    onSkip?: () => void,
    nextLabel = "Continue",
    backStep?: number
  ) => (
    <div className="flex items-center gap-3 mt-6">
      {backStep && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep(backStep);
          }}
          className="flex items-center gap-1 text-sm text-theme-tertiary hover:text-theme-secondary transition"
        >
          <ChevronLeft size={16} /> Back
        </button>
      )}
      <div className="flex-1" />
      {onSkip && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            onSkip();
          }}
          className="text-sm text-theme-tertiary hover:text-theme-secondary transition"
        >
          Skip
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teamly hover:bg-teamly/90 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            {nextLabel} <ChevronRight size={16} />
          </>
        )}
      </button>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Step renderers                                                   */
  /* ---------------------------------------------------------------- */

  const renderStep1 = () => (
    <form onSubmit={handleStep1Submit} className="space-y-4">
      {!canSetup && (
        <p className="text-theme-tertiary text-sm text-center">
          Waiting for invitation session&hellip; If this page wasn&apos;t opened
          from your email link, please check your email and click the invitation
          link again.
        </p>
      )}

      {/* Password */}
      <div>
        <label className={labelClass}>Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min 8 characters"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-3 text-theme-tertiary hover:text-teamly transition"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button
          type="button"
          onClick={generatePassword}
          className="flex items-center gap-1.5 text-xs text-teamly hover:text-teamly/80 transition mx-auto mt-1.5"
        >
          <Sparkles size={14} /> Generate secure password
        </button>
        {generated && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(password)}
            className="flex items-center gap-1.5 text-xs text-theme-tertiary hover:text-theme-secondary transition mx-auto mt-1"
          >
            <Clipboard size={12} /> Copy password
          </button>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className={labelClass}>Confirm Password</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Re-enter password"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-3 text-theme-tertiary hover:text-teamly transition"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* PIN */}
      <div>
        <label className={labelClass}>PIN Code (4 digits)</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showPin ? "text" : "password"}
              value={pinCode}
              onChange={(e) =>
                setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              required
              maxLength={4}
              minLength={4}
              placeholder="4-digit PIN"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-3 text-theme-tertiary hover:text-teamly transition"
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="button"
            onClick={generatePin}
            className="px-4 py-3 rounded-xl bg-transparent border border-teamly/40 text-teamly hover:bg-teamly/10 transition text-sm"
          >
            Generate
          </button>
        </div>
        <p className="text-xs text-theme-tertiary mt-1">
          Your PIN is used for quick clock-in access.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !canSetup}
        className="w-full rounded-xl py-3 mt-2 font-semibold text-white bg-teamly hover:bg-teamly/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Setting up account\u2026" : "Continue"}
      </button>
    </form>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Welcome card — read-only summary */}
      {profile && (
        <div className="rounded-xl bg-teamly/5 border border-teamly/20 px-4 py-3 mb-2">
          <p className="text-sm text-theme-secondary">
            Welcome, <span className="font-semibold text-theme-primary">{profile.full_name}</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-theme-tertiary">
            {profile.position_title && <span>{profile.position_title}</span>}
            {profile.app_role && <span>{profile.app_role}</span>}
            {siteName && <span>{siteName}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07700 900000"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Nationality</label>
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. British"
            className={inputClass}
          />
        </div>
      </div>

      {/* Address */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wider mb-3">
          Address
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Address line 1"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Address line 2 (optional)"
              className={inputClass}
            />
          </div>
          <div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className={inputClass}
            />
          </div>
          <div>
            <input
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="County"
              className={inputClass}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Postcode"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {renderNavButtons(handleStep2Next, () => setStep(3), "Continue", 1)}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>National Insurance Number</label>
        <input
          value={niNumber}
          onChange={(e) =>
            setNiNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9))
          }
          placeholder="e.g. QQ123456C"
          maxLength={9}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Right to Work Status</label>
        <select
          value={rtwStatus}
          onChange={(e) => setRtwStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">Select</option>
          <option value="verified">Verified (UK/Irish citizen)</option>
          <option value="pending">Pending verification</option>
          <option value="not_required">Not required</option>
        </select>
      </div>

      {rtwStatus === "pending" && (
        <>
          <div>
            <label className={labelClass}>Document Type</label>
            <select
              value={rtwDocType}
              onChange={(e) => setRtwDocType(e.target.value)}
              className={selectClass}
            >
              <option value="">Select</option>
              <option value="passport">Passport</option>
              <option value="biometric_residence_permit">
                Biometric Residence Permit
              </option>
              <option value="share_code">Share Code</option>
              <option value="visa">Visa</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Document Number / Share Code</label>
            <input
              value={rtwDocNumber}
              onChange={(e) => setRtwDocNumber(e.target.value)}
              placeholder="Enter document number"
              className={inputClass}
            />
          </div>
          {(rtwDocType === "visa" ||
            rtwDocType === "biometric_residence_permit" ||
            rtwDocType === "share_code") && (
            <div>
              <label className={labelClass}>Expiry Date</label>
              <input
                type="date"
                value={rtwExpiry}
                onChange={(e) => setRtwExpiry(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </>
      )}

      {renderNavButtons(handleStep3Next, () => setStep(4), "Continue", 2)}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <p className="text-xs text-theme-tertiary">
        Your bank details are used for payroll. They are stored securely and only
        visible to your employer.
      </p>

      <div>
        <label className={labelClass}>Bank Name</label>
        <input
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="e.g. Barclays"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Account Holder Name</label>
        <input
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          placeholder="Name on your bank account"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Sort Code</label>
          <input
            value={sortCode}
            onChange={(e) => setSortCode(e.target.value)}
            placeholder="00-00-00"
            maxLength={8}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Account Number</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="12345678"
            maxLength={8}
            className={inputClass}
          />
        </div>
      </div>

      {renderNavButtons(handleStep4Next, () => setStep(5), "Continue", 3)}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <p className="text-xs text-theme-tertiary">
        Please provide details for someone we can contact in an emergency.
      </p>

      <div>
        <label className={labelClass}>Contact Name</label>
        <input
          value={ecName}
          onChange={(e) => setEcName(e.target.value)}
          placeholder="Full name"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Relationship</label>
        <select
          value={ecRelationship}
          onChange={(e) => setEcRelationship(e.target.value)}
          className={selectClass}
        >
          <option value="">Select</option>
          <option value="spouse">Spouse / Partner</option>
          <option value="parent">Parent</option>
          <option value="sibling">Sibling</option>
          <option value="child">Son / Daughter</option>
          <option value="friend">Friend</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={ecPhone}
            onChange={(e) => setEcPhone(e.target.value)}
            placeholder="Phone number"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email (optional)</label>
          <input
            type="email"
            value={ecEmail}
            onChange={(e) => setEcEmail(e.target.value)}
            placeholder="Email address"
            className={inputClass}
          />
        </div>
      </div>

      {renderNavButtons(handleStep5Next, () => setStep(6), "Finish", 4)}
    </div>
  );

  const renderStep6 = () => (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teamly/10 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-teamly" />
      </div>
      <h3 className="text-xl font-semibold text-theme-primary mb-2">
        You&apos;re All Set!
      </h3>
      <p className="text-sm text-theme-tertiary mb-6">
        Your account is ready. Redirecting to your dashboard&hellip;
      </p>
      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teamly hover:bg-teamly/90 text-white font-medium text-sm transition"
      >
        Go to Dashboard <ChevronRight size={16} />
      </button>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <AuthLayout>
      {/* Autofill dark mode fix */}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          box-shadow: 0 0 0px 1000px rgba(17, 19, 25, 0.8) inset !important;
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        select option {
          background-color: #1a1a2e;
          color: #fff;
        }
      `}</style>

      <GlassCard className="max-w-lg">
        <StepProgress current={step} />

        {/* Step header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-teamly/10 flex items-center justify-center shrink-0">
            <StepIcon size={18} className="text-teamly" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-theme-primary">
              {stepInfo.label}
            </h1>
            <p className="text-xs text-theme-tertiary">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>
        </div>

        {/* Step content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}

        {/* Error / Message */}
        {error && (
          <p className="mt-4 text-sm text-red-400 text-center" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm text-green-400 text-center" role="status">
            {message}
          </p>
        )}

        {/* Footer */}
        {step === 1 && (
          <div className="text-center mt-5">
            <button
              onClick={() => router.push("/login")}
              className="text-teamly hover:text-teamly/80 text-sm transition"
            >
              Back to login
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-theme-tertiary">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="underline underline-offset-4 hover:text-theme-secondary"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="underline underline-offset-4 hover:text-theme-secondary"
          >
            Privacy Policy
          </a>
          .
        </p>
      </GlassCard>
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper with Suspense                                         */
/* ------------------------------------------------------------------ */

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <GlassCard className="max-w-lg">
            <div className="text-center py-8">
              <Loader2
                size={24}
                className="animate-spin text-teamly mx-auto"
              />
            </div>
          </GlassCard>
        </AuthLayout>
      }
    >
      <SetupAccountContent />
    </Suspense>
  );
}
