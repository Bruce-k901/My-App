import Link from "next/link";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

const COURSES = [
  {
    slug: "food-safety",
    title: "Food Safety Level 2 (UK)",
    description:
      "Self-study, mobile-friendly flow with interactive content, module quizzes, and a 30-question final assessment aligned to UK hygiene law.",
    duration: "Approx. 4 hours",
    level: "Level 2 • Self-study",
    badge: "Updated"
  },
];

export default function CoursesPage() {
  return (
    <OrgContentWrapper title="Courses">
      <p className="text-sm text-slate-300">
        Build internal knowledge and plug training gaps with ready-made compliance courses. Select a course to view trainer notes, module content, and supporting assets.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COURSES.map((course) => (
          <Link
            key={course.slug}
            href={`/dashboard/courses/${course.slug}`}
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
            <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
              <span>{course.duration}</span>
              <span className="inline-flex items-center gap-1 text-magenta-200 group-hover:text-magenta-100">
                View course
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </section>
    </OrgContentWrapper>
  );
}


