'use client';

import { useEffect, useMemo, useState } from 'react';

type Learner = { full_name: string; position: string; home_site: string };

type OnboardingFormProps = {
  onSubmit: (learner: Learner) => void;
  defaultValues?: Partial<Learner>;
};

/**
 * Collects learner details before launching the self-study player.
 * If default values are provided (e.g. from the signed-in user's profile) we
 * auto-populate empty fields without preventing the learner from editing them.
 */
export function OnboardingForm({ onSubmit, defaultValues }: OnboardingFormProps) {
  const normalizedDefaults = useMemo(
    () => ({
      full_name: defaultValues?.full_name?.trim() ?? '',
      position: defaultValues?.position?.trim() ?? '',
      home_site: defaultValues?.home_site?.trim() ?? '',
    }),
    [defaultValues?.full_name, defaultValues?.position, defaultValues?.home_site]
  );

  const [form, setForm] = useState<Learner>({
    full_name: normalizedDefaults.full_name,
    position: normalizedDefaults.position,
    home_site: normalizedDefaults.home_site,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      full_name: prev.full_name || normalizedDefaults.full_name,
      position: prev.position || normalizedDefaults.position,
      home_site: prev.home_site || normalizedDefaults.home_site,
    }));
  }, [normalizedDefaults.full_name, normalizedDefaults.position, normalizedDefaults.home_site]);

  const handleSubmit = () => {
    if (!form.full_name.trim() || !form.position.trim() || !form.home_site.trim()) {
      setError('Please complete all required fields before starting.');
      return;
    }
    setError(null);
    onSubmit({
      full_name: form.full_name.trim(),
      position: form.position.trim(),
      home_site: form.home_site.trim(),
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm text-slate-200">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Full name
          </span>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
            className="w-full rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
            placeholder={normalizedDefaults.full_name || 'Your name'}
          />
        </label>
        <label className="text-sm text-slate-200">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Position
          </span>
          <input
            type="text"
            value={form.position}
            onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
            className="w-full rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
            placeholder={normalizedDefaults.position || 'e.g. Head Chef'}
          />
        </label>
        <label className="text-sm text-slate-200">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Home site
          </span>
          <input
            type="text"
            value={form.home_site}
            onChange={(event) => setForm((prev) => ({ ...prev, home_site: event.target.value }))}
            className="w-full rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
            placeholder={normalizedDefaults.home_site || 'Primary site / venue'}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          Start module
        </button>
      </div>
    </form>
  );
}
