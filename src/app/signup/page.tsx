"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { AuthLayout } from "@/components/layouts";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Sparkles, Clipboard } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    sites: "",
    phone: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 14; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setForm({ ...form, password });
    setShowPassword(true);
    setGenerated(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          company: form.company,
          sites: form.sites,
          phone: form.phone,
        },
      },
    });

    setLoading(false);
    if (error) setError(error.message);
    else router.push("/login");
  };

  return (
    <AuthLayout>
      {/* Autofill fix for dark mode */}
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
      `}</style>

      <GlassCard>
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent">
          Create your Checkly account
        </h1>

        <p className="text-center text-gray-400 mb-8 text-sm">
          Start your free 14-day trial — no credit card required
        </p>

        {error && (
          <p className="text-red-500 text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Full Name</label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Your name"
              className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Business or Company Name</label>
            <input
              name="company"
              type="text"
              value={form.company}
              onChange={handleChange}
              required
              placeholder="Company"
              className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Number of Sites / Locations</label>
            <input
              name="sites"
              type="number"
              value={form.sites}
              onChange={handleChange}
              required
              placeholder="e.g. 3"
              className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Phone Number (optional)</label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="(555) 555-5555"
              className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Work Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@company.com"
              className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Password"
                className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-400 hover:text-magenta-400 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="flex items-center gap-2 text-sm text-magenta-400 hover:text-magenta-300 transition mx-auto mt-1"
            >
              <Sparkles size={16} /> Generate secure password
            </button>
            {generated && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(form.password)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition mx-auto mt-2"
                aria-label="Copy generated password"
              >
                <Clipboard size={14} /> Copy generated password
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3 mt-4 font-semibold text-white border border-white/20 bg-transparent hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-magenta-400 hover:text-magenta-300 transition-colors">
            Log in
          </Link>
        </p>
        <p className="mt-8 text-center text-xs text-gray-500">
          By continuing, you agree to our {""}
          <Link href="/terms" className="underline underline-offset-4 hover:text-gray-300">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-gray-300">Privacy Policy</Link>.
        </p>
      </GlassCard>
    </AuthLayout>
  );
}
