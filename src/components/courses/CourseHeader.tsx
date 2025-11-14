import Link from "next/link";

export function CourseHeader() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-white">Food Safety Level 2 (UK)</h1>
          <p className="text-sm text-slate-300">
            Self-study compliance course aligned to UK hygiene law, ready for team onboarding or refresher training.
          </p>
        </div>
        <div className="ml-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Link
            href="/training/courses/l2-food-hygiene/start"
            className="rounded-lg bg-transparent border border-[#EC4899] text-[#EC4899] px-4 py-2 text-sm font-semibold hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200"
          >
            Launch course
          </Link>
          <Link
            href="/training/courses/l2-food-hygiene/certificate"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-neutral-800"
          >
            View certificate portal
          </Link>
          <Link
            href="/dashboard/training"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-neutral-800"
          >
            Open Training Matrix
          </Link>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Start with your details, work through modules m1–m7, complete the final assessment, then generate your certificate.
      </p>
    </div>
  );
}


