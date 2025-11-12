"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Failed to load JSON (${response.status}): ${url}\n${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

type Manifest = {
  course_id: string;
  flow: string[];
  assessment: {
    module_quiz_items: number;
    final_items: number;
    pass_mark_percent: number;
  };
};

type ModuleInfo = {
  id: string;
  title: string;
  objectives?: string[];
};

type OnboardingPage = {
  id: string;
  type: "onboarding";
  title: string;
  text: string;
  fields: {
    key: string;
    label: string;
    type: string;
    required: boolean;
  }[];
  cta: { label: string; next: string };
};

type ContentPage = {
  id: string;
  type: "content";
  title: string;
  text: string;
  media?: string;
};

type InteractionPage = {
  id: string;
  type: "interaction";
  title: string;
  text: string;
  media?: string;
  interaction:
    | { type: "drag_drop"; pairs: [string, string][] }
    | { type: "reorder"; steps: string[] };
  feedback: { correct: string; incorrect: string };
};

type ModuleQuizPage = {
  id: string;
  type: "quiz";
  module_id: string;
  random_items: number;
  feedback_mode: "immediate";
};

type FinalQuizPage = {
  id: string;
  type: "final_quiz";
  random_items: number;
  feedback_mode: "deferred";
};

type CompletionPage = {
  id: string;
  type: "completion";
  title: string;
  text: string;
};

type Page =
  | OnboardingPage
  | ContentPage
  | InteractionPage
  | ModuleQuizPage
  | FinalQuizPage
  | CompletionPage;

type Learner = { full_name: string; position: string; home_site: string };

type Scores = {
  module_quizzes: Record<string, number>;
  final: { score_percent: number; passed: boolean } | null;
};

export default function SelfStudyPlayer({
  baseUrl = "/selfstudy/uk-l2-food-hygiene/uk_l2_food_hygiene_selfstudy_v1_0",
}: {
  baseUrl?: string;
}) {
  const { profile, user } = useAppContext();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [idx, setIdx] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [scores, setScores] = useState<Scores>({ module_quizzes: {}, final: null });
  const [attemptStart] = useState(() => new Date().toISOString());
  const [moduleObjectives, setModuleObjectives] = useState<Record<string, ModuleInfo>>({});

  const [homeSiteName, setHomeSiteName] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function loadSiteName(siteId: string) {
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("name")
          .eq("id", siteId)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error("Failed to resolve site name", error);
          setHomeSiteName(siteId);
          return;
        }
        setHomeSiteName(data?.name ?? siteId);
      } catch (error) {
        if (active) {
          console.error("Failed to resolve site name", error);
          setHomeSiteName(siteId);
        }
      }
    }

    const siteIdentifier =
      profile?.home_site ||
      profile?.site_name ||
      profile?.site ||
      profile?.site_id ||
      (user?.user_metadata?.home_site as string | undefined);

    if (!siteIdentifier) {
      setHomeSiteName("");
    } else if (profile?.site_name) {
      setHomeSiteName(profile.site_name);
    } else if (profile?.home_site && profile?.home_site !== siteIdentifier) {
      // If home_site already holds a friendly label, use it as-is.
      setHomeSiteName(profile.home_site);
    } else if (/^[0-9a-fA-F-]{36}$/.test(siteIdentifier)) {
      loadSiteName(siteIdentifier);
    } else {
      setHomeSiteName(siteIdentifier);
    }

    return () => {
      active = false;
    };
  }, [profile, user]);

  const onboardingDefaults = useMemo<Learner>(() => {
    const fullNameFromProfile =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      "";
    const fullName = fullNameFromProfile.trim() || (user?.user_metadata?.full_name as string | undefined) || "";

    const position =
      profile?.position_title ||
      profile?.position ||
      profile?.job_title ||
      (user?.user_metadata?.position as string | undefined) ||
      "";

    return {
      full_name: fullName,
      position,
      home_site: homeSiteName,
    };
  }, [profile, user, homeSiteName]);

  useEffect(() => {
    fetchJson<Manifest>(`${baseUrl}/course_manifest.json`)
      .then(setManifest)
      .catch((error) => console.error("Failed to load manifest", error));
  }, [baseUrl]);

  useEffect(() => {
    fetchJson<ModuleInfo[]>(`${baseUrl}/../data/modules.json`)
      .then((modules) => {
        const map: Record<string, ModuleInfo> = {};
        modules.forEach((mod) => {
          map[mod.id] = mod;
        });
        setModuleObjectives(map);
      })
      .catch((error) => console.error("Failed to load module summaries", error));
  }, [baseUrl]);

  useEffect(() => {
    if (!manifest) return;
    const pid = manifest.flow[idx];
    fetchJson<Page>(`${baseUrl}/pages/${pid}.json`)
      .then(setPage)
      .catch((error) => console.error("Failed to load page", error));
  }, [manifest, idx, baseUrl]);

  const progress = useMemo(() => {
    if (!manifest) return 0;
    return Math.round(((idx + 1) / manifest.flow.length) * 100);
  }, [manifest, idx]);

  const resolveAsset = useCallback(
    (path?: string | null) => {
      if (!path) return undefined;
      if (path.startsWith("data:")) return path;
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) {
        return path;
      }
      const cleanBase = baseUrl.replace(/\/$/, "");
      if (path.startsWith("/")) {
        return path;
      }
      return `${cleanBase}/${path.replace(/^\//, "")}`;
    },
    [baseUrl]
  );

  if (!manifest || !page) {
    return uiShell(<p>Loading…</p>, progress);
  }

  const goNext = () => {
    if (idx < manifest.flow.length - 1) {
      setIdx((current) => current + 1);
    }
  };

  const goBack = () => {
    if (idx > 0) {
      setIdx((current) => current - 1);
    }
  };

  if (page.type === "onboarding") {
    return uiShell(
      <Onboarding
        page={page}
        defaultValues={onboardingDefaults}
        lockFields={Boolean(
          onboardingDefaults.full_name ||
          onboardingDefaults.position ||
          onboardingDefaults.home_site
        )}
        onSubmit={(data) => {
          setLearner(data);
          const nextId = page.cta.next;
          const jump = manifest.flow.indexOf(nextId);
          setIdx(jump >= 0 ? jump : idx + 1);
        }}
      />,
      progress,
      undefined,
      undefined
    );
  }

  if (page.type === "content") {
    const moduleId = page.id.split("_")[0];
    return uiShell(
      <Content
        title={page.title}
        text={page.text}
        media={resolveAsset(page.media)}
        module={moduleObjectives[moduleId]}
        slideHref={resolveAsset(`slides/${moduleId}.md`)}
      />,
      progress,
      goBack,
      goNext
    );
  }

  if (page.type === "interaction") {
    return uiShell(
      <Interaction
        page={{ ...page, media: resolveAsset(page.media) }}
        onPass={goNext}
        onBack={goBack}
      />,
      progress,
      goBack,
      undefined
    );
  }

  if (page.type === "quiz") {
    return uiShell(
      <ModuleQuiz
        moduleId={page.module_id}
        count={page.random_items}
        feedbackMode={page.feedback_mode}
        onDone={(percent) => {
          setScores((prev) => ({
            ...prev,
            module_quizzes: { ...prev.module_quizzes, [page.module_id]: percent },
          }));
          goNext();
        }}
      />,
      progress,
      goBack,
      undefined
    );
  }

  if (page.type === "final_quiz") {
    return uiShell(
      <FinalQuiz
        count={page.random_items}
        onDone={(percent) => {
          const passed = percent >= manifest.assessment.pass_mark_percent;
          setScores((prev) => ({
            ...prev,
            final: { score_percent: percent, passed },
          }));
          goNext();
        }}
      />,
      progress,
      goBack,
      undefined
    );
  }

  if (page.type === "completion") {
    const payload = {
      course_id: manifest.course_id,
      learner,
      attempt: {
        started_at: attemptStart,
        completed_at: new Date().toISOString(),
        duration_sec: 0,
      },
      scores,
    };

    return uiShell(
      <Completion title={page.title} text={page.text} payload={payload} />,
      progress,
      goBack,
      undefined
    );
  }

  return uiShell(<p>Unsupported page type.</p>, progress, goBack, goNext);
}

function uiShell(
  content: JSX.Element,
  progress: number,
  onBack?: () => void,
  onNext?: () => void
) {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow">
        <div className="text-neutral-100">{content}</div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="rounded-lg border border-orange-400/60 px-4 py-2 text-sm text-orange-200 transition hover:border-orange-300 hover:text-orange-100 hover:shadow-[0_0_12px_rgba(251,146,60,0.35)] disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:shadow-none"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            className="rounded-lg border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-200 transition hover:border-pink-300 hover:text-pink-100 hover:shadow-[0_0_16px_rgba(236,72,153,0.45)] disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:shadow-none"
          >
            Next
          </button>
        </div>
        <div className="mt-6 h-2 rounded-full bg-neutral-800">
          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function Content({
  title,
  text,
  media,
  module,
  slideHref,
}: {
  title: string;
  text: string;
  media?: string;
  module?: ModuleInfo;
  slideHref?: string;
}) {
  const [showDeck, setShowDeck] = useState(false);
  const [deckContent, setDeckContent] = useState<string | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [deckLoading, setDeckLoading] = useState(false);

  useEffect(() => {
    if (!showDeck || deckContent !== null || !slideHref) return;
    setDeckLoading(true);
    fetch(slideHref)
      .then((response) => response.text())
      .then((markdown) => {
        setDeckContent(markdown);
        setDeckError(null);
      })
      .catch((error) => {
        console.error("Failed to load slide deck", error);
        setDeckError("Could not load the module deck.");
      })
      .finally(() => setDeckLoading(false));
  }, [showDeck, deckContent, slideHref]);

  return (
    <div>
      <h2 className="mb-4 text-3xl font-semibold text-pink-200">{title}</h2>
      {media ? (
        <img
          src={media}
          alt=""
          className="mb-4 w-full rounded-lg border border-neutral-800 bg-neutral-950 object-contain"
        />
      ) : null}
      <p className="leading-relaxed text-slate-200">{text}</p>
      {module?.objectives && module.objectives.length ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-white">Learning objectives</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-200">
            {module.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {slideHref ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDeck((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-200 transition hover:border-pink-300 hover:text-pink-100 hover:shadow-[0_0_16px_rgba(236,72,153,0.45)]"
          >
            {showDeck ? "Hide module deck" : "View module deck"}
          </button>
          {showDeck ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-4">
              {deckLoading ? (
                <p className="text-sm text-slate-300">Loading deck…</p>
              ) : deckError ? (
                <p className="text-sm text-red-400">{deckError}</p>
              ) : deckContent ? (
                <div className="markdown-viewer prose prose-invert max-w-none text-sm">
                  <DeckMarkdown content={deckContent} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DeckMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.type === "ul") {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ml-4 list-disc space-y-1 text-slate-200">
          {listBuffer.items.map((item, index) => (
            <li key={index}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="ml-4 list-decimal space-y-1 text-slate-200">
          {listBuffer.items.map((item, index) => (
            <li key={index}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
    }
    listBuffer = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-semibold text-pink-200">
          {line.replace(/^##\s+/, "")}
        </h3>
      );
      return;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-2xl font-semibold text-white">
          {line.replace(/^#\s+/, "")}
        </h2>
      );
      return;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(orderedMatch[2]);
      return;
    }

    const checkboxMatch = line.match(/^\-\s*\[( |x)\]\s+(.*)$/i);
    if (checkboxMatch) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      const checked = checkboxMatch[1].toLowerCase() === "x";
      listBuffer.items.push(`${checked ? "☑" : "☐"} ${checkboxMatch[2]}`);
      return;
    }

    if (line.startsWith("- ")) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(line.replace(/^-\s+/, ""));
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="text-slate-200">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  flushList();

  return <>{elements}</>;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-black/40 px-1 py-0.5 text-xs text-orange-200">
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function Onboarding({
  page,
  onSubmit,
  defaultValues,
  lockFields = false,
}: {
  page: OnboardingPage;
  onSubmit: (data: Learner) => void;
  defaultValues?: Partial<Learner>;
  lockFields?: boolean;
}) {
  const initialState = useMemo(() => {
    const next: Record<string, string> = {};
    page.fields.forEach((field) => {
      const value = defaultValues?.[field.key as keyof Learner];
      next[field.key] = typeof value === "string" ? value : "";
    });
    return next;
  }, [page.fields, defaultValues]);

  const [state, setState] = useState<Record<string, string>>(initialState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  return (
    <div>
      <h2 className="mb-3 text-3xl font-semibold text-pink-200">{page.title}</h2>
      <p className="mb-5 text-sm text-slate-300">{page.text}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {page.fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-2 text-sm text-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</span>
            <input
              type="text"
              value={state[field.key] ?? ""}
              onChange={(event) =>
                lockFields
                  ? undefined
                  : setState((prev) => ({ ...prev, [field.key]: event.target.value }))
              }
              readOnly={lockFields}
              disabled={lockFields}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900"
              required={field.required}
            />
          </label>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        className="mt-4 rounded-lg border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-200 transition hover:border-pink-300 hover:text-pink-100 hover:shadow-[0_0_16px_rgba(236,72,153,0.45)]"
        onClick={() => {
          const missing = page.fields.filter((field) => field.required && !state[field.key]);
          if (missing.length) {
            setError("Please complete all required fields before starting.");
            return;
          }
          setError(null);
          onSubmit(state as Learner);
        }}
      >
        {page.cta.label}
      </button>
      <p className="mt-2 text-xs text-slate-400">
        Start with your details, then progress through all modules. Your results are saved automatically.
      </p>
    </div>
  );
}

function Interaction({ page, onPass, onBack }: { page: InteractionPage; onPass: () => void; onBack: () => void }) {
  const [attempt, setAttempt] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setAttempt({});
    setFeedback(null);
  }, [page.id]);

  const submit = () => {
    const ok = page.interaction.type === "drag_drop"
      ? page.interaction.pairs.every(([left, right]) => attempt[left] === right)
      : page.interaction.type === "reorder"
        ? JSON.stringify(Object.values(attempt)) === JSON.stringify(page.interaction.steps)
        : false;

    if (ok) {
      setFeedback(page.feedback.correct);
      onPass();
    } else {
      setFeedback(page.feedback.incorrect);
    }
  };

  return (
    <div>
      <h2 className="mb-3 text-3xl font-semibold text-pink-200">{page.title}</h2>
      {page.media ? (
        <img
          src={page.media}
          alt=""
          className="mb-4 w-full rounded-lg border border-neutral-800 bg-neutral-950 object-contain"
        />
      ) : null}
      <p className="mb-4 text-slate-200">{page.text}</p>

      {page.interaction.type === "drag_drop" ? (
        <div className="space-y-3">
          {page.interaction.pairs.map(([left]) => (
            <div key={left} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">{left}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(new Set(page.interaction.pairs.map(([, right]) => right))).map((right) => {
                  const selected = attempt[left] === right;
                  return (
                    <button
                      key={right}
                      type="button"
                      onClick={() => setAttempt((prev) => ({ ...prev, [left]: right }))}
                      className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm transition ${
                        selected
                          ? "border-pink-400/70 bg-pink-400/10 text-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.35)]"
                          : "border-neutral-700 text-slate-200 hover:border-neutral-500"
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 transition ${
                          selected ? "opacity-100 text-pink-200" : "opacity-0 text-slate-400 group-hover:opacity-40"
                        }`}
                      />
                      <span>{right}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {page.interaction.type === "reorder" ? (
        <div className="space-y-2">
          {page.interaction.steps.map((step, index) => {
            const selected = Object.values(attempt).includes(step);
            return (
              <button
                key={step}
                type="button"
                onClick={() => setAttempt((prev) => ({ ...prev, [index]: step }))}
                className={`group flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected
                    ? "border-pink-400/70 bg-pink-400/10 text-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.35)]"
                    : "border-neutral-700 bg-neutral-950 text-slate-100 hover:border-neutral-500"
                }`}
              >
                <Check
                  className={`h-4 w-4 transition ${
                    selected ? "opacity-100 text-pink-200" : "opacity-0 text-slate-400 group-hover:opacity-40"
                  }`}
                />
                <span>{step}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-orange-400/60 px-4 py-2 text-sm text-orange-200 transition hover:border-orange-300 hover:text-orange-100 hover:shadow-[0_0_12px_rgba(251,146,60,0.35)]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-200 transition hover:border-pink-300 hover:text-pink-100 hover:shadow-[0_0_16px_rgba(236,72,153,0.45)]"
          >
            Check
          </button>
        </div>
      {feedback ? <p className="mt-3 text-sm text-slate-200">{feedback}</p> : null}
    </div>
  );
}

function ModuleQuiz({
  moduleId,
  count,
  feedbackMode,
  onDone,
}: {
  moduleId: string;
  count: number;
  feedbackMode: "immediate";
  onDone: (percent: number) => void;
}) {
  // TODO 2: replace with your production question bank wired into Supabase or other storage.
  const inlinePool: Record<string, [string, string, string[]][]> = {
    m1: [["Who inspects locally?", "Environmental health", ["Police", "DVLA", "HMRC"]]],
    m2: [["Which is biological?", "Listeria", ["Glass", "Allergen residue", "Detergent"]]],
    m3: [["Allergen cross-contact means…", "Allergen transfers to safe food", ["Cleaning checklist", "Cooking method", "Delivery note"]]],
    m4: [["Cover a cut with…", "Blue waterproof plaster", ["Nothing", "Clear tape", "Paper tissue"]]],
    m5: [["Hot holding minimum", "63 C", ["55 C", "60 C", "50 C"]]],
    m6: [["Correct order", "Clean then disinfect", ["Disinfect then clean", "Either", "Skip cleaning"]]],
    m7: [["Cracked board", "Remove from use", ["Keep using", "Flip over", "Paint over"]]],
    m8: [["CCP fail means", "Take corrective action and record", ["Ignore", "Delete record", "Wait days"]]],
  };

  const pool = inlinePool[moduleId] ?? [];
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const maxItems = Math.min(count, pool.length);
  const entry = pool[index] ?? null;
  const options = useMemo(() => {
    if (!entry) return [] as string[];
    const [_, correct, distractors] = entry;
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
  }, [entry]);

  useEffect(() => {
    if (completed) return;
    if (maxItems === 0) {
      onDone(100);
      setCompleted(true);
    } else if (index >= maxItems) {
      onDone(Math.round((score / maxItems) * 100));
      setCompleted(true);
    }
  }, [completed, index, maxItems, onDone, score]);

  if (maxItems === 0) {
    return (
      <div>
        <h2 className="mb-3 text-3xl font-semibold text-pink-200">Module knowledge check</h2>
        <p className="text-slate-300">No quiz items configured for this module.</p>
      </div>
    );
  }

  if (index >= maxItems) {
    return (
      <div>
        <h2 className="mb-3 text-3xl font-semibold text-pink-200">Module knowledge check</h2>
        <p className="text-slate-300">Great work! Moving to the next section…</p>
      </div>
    );
  }

  if (!entry) {
    return null;
  }
  const [stem, correct] = entry;

  return (
    <div>
      <h2 className="mb-3 text-3xl font-semibold text-pink-200">Module knowledge check</h2>
      <p className="mb-4 text-slate-200">{stem}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              if (option === correct) {
                setScore((prev) => prev + 1);
              }
              setIndex((prev) => prev + 1);
            }}
            className="group flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:border-pink-300 hover:text-pink-100 hover:shadow-[0_0_12px_rgba(236,72,153,0.35)]"
          >
            <Check className="h-3 w-3 opacity-0 transition group-hover:opacity-50" />
            <span>{option}</span>
          </button>
        ))}
      </div>
      {feedbackMode === "immediate" ? (
        <p className="mt-3 text-xs text-slate-400">Immediate feedback is shown after you answer.</p>
      ) : null}
    </div>
  );
}

function FinalQuiz({ count, onDone }: { count: number; onDone: (percent: number) => void }) {
  useEffect(() => {
    // Placeholder response; integrate with production assessment service.
    onDone(85);
  }, [onDone]);

  return (
    <div>
      <h2 className="mb-3 text-3xl font-semibold text-pink-200">Final assessment</h2>
      <p className="text-slate-200">
        Complete the {count}-question assessment to finish the course. Your score will appear on the
        completion screen.
      </p>
    </div>
  );
}

function Completion({ title, text, payload }: { title: string; text: string; payload: unknown }) {
  return (
    <div>
      <h2 className="mb-3 text-3xl font-semibold text-pink-200">{title}</h2>
      <p className="mb-4 text-slate-200">{text}</p>
      <ResultSummary payload={payload} />
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard/training"
          className="rounded-lg border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-200 transition hover:border-pink-300 hover:text-pink-100 hover:shadow-[0_0_16px_rgba(236,72,153,0.45)]"
        >
          Return to Training Matrix
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30 hover:text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}


function ResultSummary({ payload }: { payload: any }) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const learner = (payload as any).learner ?? {};
  const scores = (payload as any).scores ?? {};

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold text-white">Result summary</h3>
      <dl className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Learner</dt>
          <dd>{learner.full_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Position</dt>
          <dd>{learner.position || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Home site</dt>
          <dd>{learner.home_site || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Final score</dt>
          <dd>
            {scores?.final?.score_percent != null
              ? `${scores.final.score_percent}%`
              : "Pending"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Pass mark</dt>
          <dd>{scores?.final?.passed ? "Met" : "Not met"}</dd>
        </div>
      </dl>
    </div>
  );
}


