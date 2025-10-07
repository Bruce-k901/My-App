"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
    if (error) alert(error.message);
    else router.push("/login");
  };

  return (
    <MarketingSubPageLayout>
      <section className="flex items-center justify-center px-6 py-10 bg-[#0b0d13]">
        {/* Autofill Fix */}
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

        <div className="w-full max-w-md">
          <Card className="bg-[#141823]/90 backdrop-blur border border-neutral-800 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-8 rounded-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-3 bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent">
              Create your Checkly account
            </h1>

            <p className="text-center text-slate-300 mb-6 text-sm">
              Start your free 14-day trial — no credit card required
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { name: "name", placeholder: "Full Name", type: "text", required: true },
                {
                  name: "company",
                  placeholder: "Business or Company Name",
                  type: "text",
                  required: true,
                },
                {
                  name: "sites",
                  placeholder: "Number of Sites / Locations",
                  type: "number",
                  required: true,
                },
                {
                  name: "phone",
                  placeholder: "Phone Number (optional)",
                  type: "tel",
                  required: false,
                },
                { name: "email", placeholder: "Work Email", type: "email", required: true },
              ].map((field) => (
                <input
                  key={field.name}
                  {...field}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  className="w-full rounded-xl px-4 py-3 bg-[#191c26] border border-neutral-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300 autofill:shadow-[inset_0_0_0_1000px_rgba(17,19,25,0.8)]"
                />
              ))}

              {/* Password Field */}
              <div className="relative">
                <input
                  name="password"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl px-4 py-3 bg-[#191c26] border border-neutral-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-slate-400 hover:text-magenta-400 transition"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3 mt-4 font-semibold text-white border border-neutral-800 bg-[#191c26] hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.35)]"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <p className="text-center text-slate-400 mt-6 text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-magenta-400 hover:text-magenta-300 transition-colors"
              >
                Log in
              </Link>
            </p>
          </Card>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
