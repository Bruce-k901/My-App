import Link from "next/link";

export function CourseHeader() {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] dark:border-neutral-800 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-900/60 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Food Safety Level 2 (UK)</h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-secondary">
            Self-study compliance course aligned to UK hygiene law, ready for team onboarding or refresher training.
          </p>
        </div>
        <div className="ml-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Link
            href="/learn/uk-l2-food-safety"
            className="rounded-lg bg-transparent border border-[#D37E91] text-[#D37E91] px-4 py-2 text-sm font-semibold hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all duration-200"
          >
            Launch course
          </Link>
          <Link
            href="/dashboard/people/training"
            className="rounded-lg border border-[rgb(var(--border))] dark:border-theme px-4 py-2 text-sm text-[rgb(var(--text-secondary))] dark:text-theme-primary transition hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-800"
          >
            Training & records
          </Link>
          <Link
            href="/dashboard/training"
            className="rounded-lg border border-[rgb(var(--border))] dark:border-theme px-4 py-2 text-sm text-[rgb(var(--text-secondary))] dark:text-theme-primary transition hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-800"
          >
            Open Training Matrix
          </Link>
        </div>
      </div>
 <p className="mt-3 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
        Work through the modules, complete the final assessment, then return to the dashboard. Training records can be viewed in Training.
      </p>
    </div>
  );
}


