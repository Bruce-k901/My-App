// Last updated: 2025-11-25 19:29
import Link from "next/link";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { Play } from "lucide-react";
import { COURSES } from "@/lib/navigation-constants";

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CoursesPage() {
  return (
    <OrgContentWrapper title="Available Courses (Updated)">
      <p className="text-sm text-slate-300">
        Build internal knowledge and plug training gaps with ready-made compliance courses. Select a course to view trainer notes, module content, and supporting assets.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COURSES.map((course) => (
          <div
            key={course.slug}
            className="group flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-magenta-500/40 hover:shadow-[0_0_26px_rgba(236,72,153,0.2)]"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-magenta-200">
                <span className="rounded-full border border-magenta-400/40 px-2 py-0.5 font-semibold uppercase tracking-wider">
                  {course.badge}
                </span>
                <span className="text-slate-400">{course.level}</span>
              </div>
              <h2 className="text-lg font-semibold text-white group-hover:text-magenta-100">
                {course.title}
              </h2>
              <p className="text-sm text-slate-300">{course.description}</p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">{course.duration}</span>
              <div className="flex items-center gap-2">
                <Link
                  href={
                    course.slug === 'food-safety' 
                      ? '/learn/uk-l2-food-safety-v3' 
                      : course.slug === 'health-and-safety'
                      ? '/learn/uk-l2-health-and-safety'
                      : course.slug === 'allergens'
                      ? '/learn/uk-l2-allergens'
                      : `/dashboard/courses/${course.slug}`
                  }
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  View details
                </Link>
                <Link
                  href={
                    course.slug === 'food-safety' 
                      ? '/learn/uk-l2-food-safety-v3' 
                      : course.slug === 'health-and-safety'
                      ? '/learn/uk-l2-health-and-safety'
                      : course.slug === 'allergens'
                      ? '/learn/uk-l2-allergens'
                      : `/dashboard/courses/${course.slug}`
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EC4899] bg-transparent px-4 py-1.5 text-xs font-medium text-[#EC4899] transition-all duration-200 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
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
