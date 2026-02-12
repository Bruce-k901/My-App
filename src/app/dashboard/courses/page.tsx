// Last updated: 2025-11-25 19:29
import Link from "next/link";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { Play } from "@/components/ui/icons";
import { COURSES } from "@/lib/navigation-constants";

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CoursesPage() {
  return (
    <OrgContentWrapper title="Available Courses (Updated)">
 <p className="text-sm text-theme-secondary">
        Build internal knowledge and plug training gaps with ready-made compliance courses. Select a course to view trainer notes, module content, and supporting assets.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COURSES.map((course) => (
          <div
            key={course.slug}
 className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-theme-surface p-5 shadow-sm transition dark:border-white/10 dark:shadow-none hover:border-magenta-500/40 hover:shadow-[0_0_26px_rgba(211, 126, 145,0.15)] dark:hover:shadow-[0_0_26px_rgba(211, 126, 145,0.2)]"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-magenta-600 dark:text-magenta-200">
                <span className="rounded-full border border-magenta-400/60 px-2 py-0.5 font-semibold uppercase tracking-wider dark:border-magenta-400/40">
                  {course.badge}
                </span>
 <span className="text-theme-tertiary">{course.level}</span>
              </div>
 <h2 className="text-lg font-semibold text-theme-primary group-hover:text-magenta-600 dark:group-hover:text-magenta-100">
                {course.title}
              </h2>
 <p className="text-sm text-theme-secondary">{course.description}</p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
 <span className="text-sm text-theme-tertiary">{course.duration}</span>
              <div className="flex items-center gap-2">
                <Link
                  href={course.href}
 className="text-sm text-theme-secondary transition-colors hover:text-theme-primary"
                >
                  View details
                </Link>
                <Link
                  href={course.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-module-fg bg-transparent px-4 py-1.5 text-xs font-medium text-module-fg transition-all duration-200 ease-in-out hover:bg-module-fg/[0.10] hover:shadow-[0_0_12px_rgba(var(--module-fg),0.25)] dark:hover:bg-transparent dark:hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)]"
                >
                  <Play className="h-3.5 w-3.5" />
                  Start
                </Link>
              </div>
            </div>
          </div>
        ))}
      </section>
    </OrgContentWrapper>
  );
}
