'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { ContentBlock } from '../components/ContentBlock';
import { DragDrop } from '../components/DragDrop';
import HotspotRoom from '../components/HotspotRoom';
import { MultiChoice } from '../components/MultiChoice';
import { Reorder } from '../components/Reorder';
import { SingleChoice } from '../components/SingleChoice';
import TemperatureDial from '../components/TemperatureDial';
import HandwashSequencer from '../components/HandwashSequencer';
import BranchScenario from '../components/BranchScenario';
import LottiePlayer from '../../components/LottiePlayer';
import type { Page } from '../schemas/page';
import { scoreMulti, scoreSingle } from './scoring';
import { useAttemptStore } from './useAttemptStore';

export type RendererProps = {
  page: Page;
  onContinue: () => void;
  setCanProceed: (value: boolean) => void;
  setTitle: (title?: string) => void;
  setRightPanel: (content: ReactNode) => void;
};

export function Renderer({
  page,
  onContinue,
  setCanProceed,
  setTitle,
  setRightPanel,
}: RendererProps) {
  const router = useRouter();
  const scores = useAttemptStore((state) => state.scores);

  const completionInfo = useMemo(() => {
    if (page.type !== 'completion') {
      return null;
    }

    const requiredModules = page.requires?.modules ?? [];
    const missingModules = requiredModules.filter((id) => scores.modules[id] === undefined);
    const moduleValues = Object.values(scores.modules);
    const averagePercent =
      moduleValues.length > 0 ? Math.round(moduleValues.reduce((sum, value) => sum + value, 0) / moduleValues.length) : 0;
    const overallPercent = scores.final?.percent ?? averagePercent;
    const minOverall = page.requires?.minOverallPercent;
    const meetsOverall = minOverall === undefined || overallPercent >= minOverall;

    return {
      requiredModules,
      missingModules,
      overallPercent,
      meetsOverall,
      ready: missingModules.length === 0 && meetsOverall,
    };
  }, [page, scores.final, scores.modules]);

  useEffect(() => {
    if (page.type === 'content') {
      setTitle(page.title);
      setRightPanel(
        <div className="space-y-3 text-sm text-slate-200">
          <p>{page.body}</p>
        </div>
      );
      setCanProceed(true);
    } else if (page.type === 'completion') {
      setTitle(page.title);
      const missing = completionInfo?.missingModules ?? [];
      setRightPanel(
        <div className="space-y-3 text-sm text-slate-200">
          <p className="font-semibold text-white">Completion requirements</p>
          <ul className="list-disc space-y-1 pl-4">
            {(page.requires?.modules ?? []).map((moduleId) => {
              const met = !missing.includes(moduleId);
              return (
                <li key={moduleId} className={met ? 'text-emerald-200' : 'text-red-200'}>
                  {moduleId.toUpperCase()} {met ? 'ready' : 'not complete'}
                </li>
              );
            })}
          </ul>
          <p>
            Overall score:{' '}
            <span className={completionInfo?.meetsOverall ? 'text-emerald-200' : 'text-red-200'}>
              {completionInfo?.overallPercent ?? 0}%
            </span>
            {page.requires?.minOverallPercent !== undefined ? ` (needs ${page.requires.minOverallPercent}% or higher)` : null}
          </p>
        </div>
      );
      setCanProceed(completionInfo?.ready ?? false);
    } else if (page.type === 'lottie') {
      setTitle(page.title);
      setRightPanel(
        page.caption ? <p className="text-sm text-slate-200">{page.caption}</p> : <p className="text-sm text-slate-200">Play the animation, then continue.</p>
      );
      setCanProceed(false);
    } else if (page.type === 'recap') {
      setTitle('Module recap');
      setRightPanel(
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-100">
          {page.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      );
      setCanProceed(true);
    } else if (page.type === 'quiz_ref') {
      setTitle('Knowledge check');
      setRightPanel(<p className="text-sm text-slate-200">Start the quiz to record your score.</p>);
      setCanProceed(false);
    } else {
      setTitle(undefined);
      setRightPanel(<p className="text-sm text-slate-200">Complete the interaction to unlock Next.</p>);
      setCanProceed(false);
    }
  }, [page, setCanProceed, setRightPanel, setTitle, completionInfo]);

  switch (page.type) {
    case 'content':
      return <ContentBlock title={page.title} body={page.body} media={page.media} />;
    case 'single_choice':
      return (
        <SingleChoice
          stem={page.stem}
          options={page.options}
          correctIndex={page.answer}
          onDone={(picked) => {
            const ok = scoreSingle(picked, page.answer) === 1;
            setCanProceed(ok);
            if (ok) {
              onContinue();
            }
          }}
        />
      );
    case 'multi_choice':
      return (
        <MultiChoice
          stem={page.stem}
          options={page.options}
          correctIndices={page.answers}
          onDone={(picked) => {
            const ok = scoreMulti(picked, page.answers) === 1;
            setCanProceed(ok);
            if (ok) {
              onContinue();
            }
          }}
        />
      );
    case 'drag_drop':
      return <DragDrop pairs={page.pairs} prompt={page.prompt} onDone={(correct) => setCanProceed(correct)} />;
    case 'reorder':
      return <Reorder steps={page.steps} prompt={page.prompt} onDone={(correct) => setCanProceed(correct)} />;
    case 'hotspot':
      return (
        <HotspotRoom
          image={page.image}
          spots={page.spots}
          prompt={page.prompt}
          onDone={(ok) => {
            setCanProceed(ok);
          }}
        />
      );
    case 'temperature':
      return (
        <TemperatureDial
          min={page.min}
          max={page.max}
          value={page.initial}
          safeColdMax={page.safeColdMax}
          hotHoldMin={page.hotHoldMin}
          onDone={(withinSafe) => {
            setCanProceed(withinSafe);
            if (withinSafe) {
              onContinue();
            }
          }}
        />
      );
    case 'handwash':
      return (
        <HandwashSequencer
          steps={page.steps}
          onDone={(ok) => {
            setCanProceed(ok);
            if (ok) {
              onContinue();
            }
          }}
        />
      );
    case 'branch':
      return (
        <BranchScenario
          title={page.title}
          stem={page.stem}
          options={page.options}
          correctIndex={page.correctIndex}
          onDone={(_, correct) => {
            setCanProceed(correct);
            if (correct) {
              onContinue();
            }
          }}
        />
      );
    case 'lottie':
      return (
        <div className="space-y-4 text-slate-200">
          {page.title ? <h3 className="text-xl font-semibold text-white">{page.title}</h3> : null}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
            <LottiePlayer src={page.src} loop={page.loop ?? false} className="w-full" />
          </div>
          {page.caption ? <p className="text-sm text-slate-300">{page.caption}</p> : null}
          <button
            type="button"
            onClick={() => setCanProceed(true)}
            className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            Continue
          </button>
        </div>
      );
    case 'recap':
      return (
        <div className="space-y-4 text-slate-200">
          <h3 className="text-xl font-semibold text-white">Key takeaways</h3>
          <ul className="list-disc space-y-2 pl-5">
            {page.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCanProceed(true)}
            className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            Continue
          </button>
        </div>
      );
    case 'quiz_ref':
      return (
        <div className="space-y-4 text-slate-200">
          <h3 className="text-xl font-semibold text-white">Module knowledge check</h3>
          <p>Next up: randomly selected questions from the {page.pool} pool. Ready?</p>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            Start quiz
          </button>
        </div>
      );
    case 'completion': {
      return (
        <div className="space-y-5 text-slate-200">
          {page.media ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
              <Image src={page.media} alt="" width={960} height={360} className="h-auto w-full object-cover" />
            </div>
          ) : null}
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm">
            <p className="font-semibold text-white">Overall score</p>
            <p>
              {completionInfo?.overallPercent ?? 0}%{' '}
              {page.requires?.minOverallPercent !== undefined
                ? `(needs ${page.requires.minOverallPercent}% or higher)`
                : null}
            </p>
            {page.requires?.modules ? (
              <ul className="mt-2 space-y-1">
                {page.requires.modules.map((moduleId) => {
                  const missing = completionInfo?.missingModules ?? [];
                  const met = !missing.includes(moduleId);
                  return (
                    <li key={moduleId} className={`flex items-center justify-between rounded-xl border px-3 py-1 ${met ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/40 bg-red-500/10 text-red-200'}`}>
                      <span className="font-semibold">{moduleId.toUpperCase()}</span>
                      <span>{met ? 'Complete' : 'Incomplete'}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => router.push('/training/courses/l2-food-hygiene/certificate')}
            disabled={!completionInfo?.ready}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
              completionInfo?.ready
                ? 'border-pink-400/70 bg-pink-500/20 text-pink-100 hover:border-pink-300 hover:text-white'
                : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            {page.actions?.ctaLabel ?? 'Generate certificate'}
          </button>
          <p className="text-xs text-slate-400">
            Certificates are also available at{' '}
            <Link href="/training/courses/l2-food-hygiene/certificate" className="underline">
              /training/courses/l2-food-hygiene/certificate
            </Link>
            .
          </p>
        </div>
      );
    }
    default:
      return (
        <div className="space-y-2 rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">
          Unsupported page type: {(page as Page).type}
        </div>
      );
  }
}
