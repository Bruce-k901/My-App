"use client";

import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import { Button, Input } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingSubPageLayout>
      <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-6 sm:py-10">
        <GlassCard className="py-6 sm:py-8 px-4 sm:px-6 w-full max-w-md mx-auto">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-4 sm:mb-6 text-theme-primary">
            Contact Us
          </h1>
          
          {submitted ? (
            <div className="text-center py-8">
              <p className="text-green-400 mb-4">Thank you for your message!</p>
              <p className="text-theme-tertiary text-sm">We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
              <div>
                <label className="block text-theme-tertiary text-sm mb-2">Name</label>
                <Input
                  placeholder="Your Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-theme-tertiary text-sm mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-theme-tertiary text-sm mb-2">Message</label>
                <textarea
                  placeholder="Your message..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:border-[#D37E91]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </GlassCard>
      </main>
    </MarketingSubPageLayout>
  );
}

