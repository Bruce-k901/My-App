import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { ModuleAccordion, type ModuleSummary } from "@/components/courses/module-accordion";
import { CourseHeader } from "@/components/courses/CourseHeader";
import { courseManifestSchema, type CourseManifest } from "courses/uk-l2-food-hygiene/schemas/course";
import { moduleManifestSchema } from "courses/uk-l2-food-hygiene/schemas/module";
import { pagesSchema, type Page } from "courses/uk-l2-food-hygiene/schemas/page";
import { safeParseOrThrow } from "courses/uk-l2-food-hygiene/schemas/validate";

const COURSE_DIR = path.join(process.cwd(), "courses", "uk-l2-food-hygiene");
type LoadedModule = {
  summary: ModuleSummary;
  durationMin?: number;
  pages: Page[];
};

async function readJsonFile<T>(...segments: string[]): Promise<T> {
  const filePath = path.join(COURSE_DIR, ...segments);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

function cleanText(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  const text = Array.isArray(value) ? value.join(" ") : value;
  return text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function interactionLabelFor(page: Page): string | undefined {
  switch (page.type) {
    case "drag_drop":
      return "Drag & drop";
    case "hotspot":
      return "Hotspot exploration";
    case "reorder":
      return "Ordering challenge";
    case "branch":
      return "Scenario decision";
    case "handwash":
      return "Sequencer";
    case "temperature":
      return "Temperature dial";
    default:
      return undefined;
  }
}

function summarisePage(page: Page) {
  const base = {
    id: page.id,
    title: "title" in page && page.title ? page.title : page.id,
    description: undefined as string | undefined,
    interactionType: undefined as string | undefined,
  };

  switch (page.type) {
    case "content":
    case "recap":
    case "lottie": {
      const description =
        "body" in page ? cleanText(page.body as string | string[] | undefined) : undefined;
      return {
        ...base,
        title: page.title ?? base.title,
        type: "content" as const,
        description,
      };
    }
    case "quiz_ref":
      return {
        ...base,
        title: "Module knowledge check",
        type: "quiz" as const,
        description: `${page.count} question quiz`,
      };
    case "drag_drop":
    case "hotspot":
    case "reorder":
    case "branch":
    case "temperature":
      return {
        ...base,
        title: "prompt" in page && page.prompt ? page.prompt : base.title,
        type: "interaction" as const,
        description: "prompt" in page ? (page.prompt as string) : undefined,
        interactionType: interactionLabelFor(page),
      };
    case "handwash":
      return {
        ...base,
        title: "Handwashing sequence",
        type: "interaction" as const,
        description: `Order ${page.steps.length} steps correctly`,
        interactionType: interactionLabelFor(page),
      };
    case "completion":
      return {
        ...base,
        title: page.title ?? "Completion",
        type: "completion" as const,
        description: cleanText(page.body),
      };
    default:
      return {
        ...base,
        type: "content" as const,
      };
  }
}

async function loadModule(moduleId: string): Promise<LoadedModule> {
  const manifestRaw = await readJsonFile("modules", moduleId, "module.json");
  const manifest = safeParseOrThrow(
    moduleManifestSchema,
    manifestRaw,
    `${moduleId} manifest`
  );

  const pagesRaw = await readJsonFile("modules", moduleId, "pages.json");
  const pages = safeParseOrThrow(pagesSchema, pagesRaw, `${moduleId} pages`);

  const pageLookup = new Map(pages.map((page) => [page.id, summarisePage(page)]));
  const orderedPages = manifest.pages
    .map((id) => pageLookup.get(id))
    .filter(Boolean) as ModuleSummary["pages"];

  return {
    summary: {
      id: manifest.id,
      title: manifest.title,
      pages: orderedPages,
      quizItems: manifest.quiz?.count ?? 0,
    },
    durationMin: manifest.duration_min,
    pages,
  };
}

async function loadLearningModules(moduleIds: Array<{ id: string }>) {
  const modules: ModuleSummary[] = [];
  let totalDuration = 0;

  for (const moduleRef of moduleIds) {
    if (!moduleRef.id.startsWith("m")) continue;
    const loaded = await loadModule(moduleRef.id);
    modules.push(loaded.summary);
    if (loaded.durationMin) {
      totalDuration += loaded.durationMin;
    }
  }

  return { modules, totalDuration };
}

export default async function FoodSafetyCoursePage() {
  let course: CourseManifest;

  try {
    const courseRaw = await readJsonFile("course.json");
    course = safeParseOrThrow(courseManifestSchema, courseRaw, "course manifest");
  } catch (error) {
    console.error("Course manifest missing", error);
    notFound();
  }

  const { modules: learningModules, totalDuration } = await loadLearningModules(course.modules);
  const finalModule = await loadModule("final");
  const certificationModule = await loadModule("certification");

  const completionPage = certificationModule.pages.find((page) => page.type === "completion");
  const completionCopy =
    completionPage && "body" in completionPage
      ? cleanText(completionPage.body)
      : "Completion details are captured and exported for compliance records.";

  const deliveryModes = ["self-study", "assisted onboarding", "blended refresher"];
  const targetAudience = [
    "Front and back of house food handlers",
    "Supervisors responsible for hygiene",
    "Retail or hospitality staff handling open food",
    "Care and education settings needing Level 2 certification",
  ];

  const prerequisites = [
    "Basic literacy and numeracy",
    "Able to follow site food safety procedures",
    "Device with audio support for voiceovers",
  ];

  const learningOutcomes = [
    "Explain UK food safety law and personal duties",
    "Identify and control biological, chemical, and physical hazards",
    "Prevent contamination and manage allergens in service",
    "Apply personal hygiene, cleaning, and pest controls",
    "Maintain safe temperatures for storage, prep, cooking, and service",
    "Operate HACCP-style records and prepare for inspections",
  ];

  const finalQuestionCount = finalModule.summary.quizItems;
  const totalDurationLabel = totalDuration ? `~${totalDuration} minutes` : "~4 hours";

  return (
    <OrgContentWrapper
      title={course.title}
      subtitle="Self-study programme aligned to UK compliance requirements"
    >
      <CourseHeader />

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_26px_rgba(236,72,153,0.12)]">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Course mode</p>
            <p className="text-xl font-semibold text-white">Self-study (Level 2)</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Estimated duration</p>
            <p className="text-xl font-semibold text-white">{totalDurationLabel}</p>
            <p className="text-xs text-slate-400">Learners can pause and resume as needed</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Assessment</p>
            <p className="text-xl font-semibold text-white">{course.pass_mark_percent}% pass mark</p>
            <p className="text-xs text-slate-400">{finalQuestionCount} question final knowledge check</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Jurisdiction</p>
            <p className="text-xl font-semibold text-white">United Kingdom</p>
            <p className="text-xs text-slate-400">Version {course.version}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200">
          {deliveryModes.map((mode) => (
            <span key={mode} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 capitalize">
              {mode}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Learning outcomes</h2>
          <ul className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
            {learningOutcomes.map((outcome) => (
              <li key={outcome} className="flex gap-2">
                <span aria-hidden className="pt-1 text-magenta-300">•</span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-sm font-semibold text-white">Ideal for</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {targetAudience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-sm font-semibold text-white">Prerequisites</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {prerequisites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Self-study flow</h2>
          <p className="text-sm text-slate-300">
            Each module blends short-form content, interactive challenges, and a topic quiz so learners can progress independently.
          </p>
        </div>
        <ModuleAccordion modules={learningModules} />
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold text-white">Final assessment</h3>
          <p className="mt-2 text-sm text-slate-200">
            Learners complete a {finalQuestionCount} question knowledge check with deferred feedback. Completion results are posted straight into the Training Matrix.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold text-white">Completion hand-off</h3>
          <p className="mt-2 text-sm text-slate-200">{completionCopy}</p>
        </div>
      </section>
    </OrgContentWrapper>
  );
}



