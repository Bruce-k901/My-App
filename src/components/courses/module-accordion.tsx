"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Activity, ListChecks } from '@/components/ui/icons';

interface ModulePageSummary {
  id: string;
  title: string;
  type: string;
  description?: string;
  durationSec?: number;
  interactionType?: string;
}

export interface ModuleSummary {
  id: string;
  title: string;
  pages: ModulePageSummary[];
  quizItems: number;
}

interface ModuleAccordionProps {
  modules: ModuleSummary[];
}

const TYPE_LABELS: Record<string, string> = {
  content: "Content",
  interaction: "Interaction",
  quiz: "Module quiz",
  final_quiz: "Final assessment",
  completion: "Completion",
  onboarding: "Onboarding",
};

export function ModuleAccordion({ modules }: ModuleAccordionProps) {
  const [openModule, setOpenModule] = useState<string | null>(modules[0]?.id ?? null);

  return (
    <div className="space-y-4">
      {modules.map((module) => {
        const isOpen = openModule === module.id;

        return (
          <article key={module.id} className="rounded-xl border border-white/10 bg-white/5">
            <header className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpenModule((prev) => (prev === module.id ? null : module.id))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-magenta-500/50 hover:text-magenta-200"
                  aria-expanded={isOpen}
                  aria-controls={`module-${module.id}`}
                >
                  {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
                <div>
                  <h3 className="text-base font-semibold text-white">{module.title}</h3>
                  <p className="text-xs text-slate-400">Module {module.id.slice(1)} • {module.quizItems} quiz questions</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Activity className="h-4 w-4" />
                Self-study sequence
              </div>
            </header>

            {isOpen && (
              <div id={`module-${module.id}`} className="border-t border-white/10">
                <ul className="divide-y divide-white/5">
                  {module.pages.map((page) => {
                    const label = TYPE_LABELS[page.type] ?? page.type;
                    const Icon = page.type === "quiz" || page.type === "final_quiz" ? ListChecks : FileText;

                    return (
                      <li key={page.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#121622] text-magenta-200">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{page.title || page.id}</p>
                            <p className="text-xs text-slate-400">{label}</p>
                            {page.description && (
                              <p className="mt-1 text-xs text-slate-300">{page.description}</p>
                            )}
                            {page.interactionType && (
                              <p className="mt-1 text-xs text-slate-400">Interaction: {page.interactionType}</p>
                            )}
                          </div>
                        </div>
                        {page.durationSec ? (
                          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            ~{Math.round(page.durationSec / 60)} min
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}



