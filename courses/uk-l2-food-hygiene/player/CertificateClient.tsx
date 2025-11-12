'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LAST_PAYLOAD_STORAGE_KEY, type BuildPayloadArgs } from './payload';

interface CertificatePayload {
  course_id: string;
  learner: { full_name: string; position: string; home_site: string };
  attempt: { started_at: string; completed_at: string; duration_sec: number };
  scores: { modules: Record<string, number>; final?: { percent: number; passed: boolean } };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function CertificateClient() {
  const [payload, setPayload] = useState<CertificatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_PAYLOAD_STORAGE_KEY);
      if (!raw) {
        setError('No completed attempt found. Complete the course first.');
        return;
      }
      const parsed = JSON.parse(raw) as CertificatePayload;
      setPayload(parsed);
    } catch (err) {
      console.error('Failed to load certificate payload', err);
      setError('Could not load certificate data.');
    }
  }, []);

  const moduleScores = useMemo(() => {
    if (!payload) return [] as [string, number][];
    return Object.entries(payload.scores.modules);
  }, [payload]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-white">
        <div className="rounded-2xl border border-red-500/60 bg-red-500/10 p-6 shadow">
          <h1 className="text-2xl font-semibold">Certificate unavailable</h1>
          <p className="mt-3 text-sm text-red-100">{error}</p>
          <Link
            href="/training/courses/l2-food-hygiene/start"
            className="mt-6 inline-flex items-center rounded-xl border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white"
          >
            Launch course
          </Link>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-white">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow">
          <p className="text-sm text-slate-200">Loading certificate data…</p>
        </div>
      </div>
    );
  }

  const finalScore = payload.scores.final;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white">
      <div className="rounded-3xl border border-white/15 bg-neutral-900/80 p-8 shadow-xl shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-pink-300">Certificate of completion</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Level 2 Food Hygiene and Safety</h1>
        <p className="mt-6 text-sm text-slate-200">
          This certifies that <span className="font-semibold text-white">{payload.learner.full_name}</span> successfully
          completed the module on {formatDate(payload.attempt.completed_at)}.
        </p>

        <dl className="mt-6 grid gap-4 text-sm text-slate-100 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Position</dt>
            <dd>{payload.learner.position || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Home site</dt>
            <dd>{payload.learner.home_site || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Started</dt>
            <dd>{formatDate(payload.attempt.started_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Completed</dt>
            <dd>{formatDate(payload.attempt.completed_at)}</dd>
          </div>
        </dl>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Scores</h2>
          <p className="mt-1 text-sm text-slate-300">
            Final score: <span className="font-semibold text-white">{finalScore ? `${finalScore.percent}%` : 'Pending'}</span>
            {finalScore ? (
              <span className={`ml-2 inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${finalScore.passed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
                {finalScore.passed ? 'Passed' : 'Not passed'}
              </span>
            ) : null}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            {moduleScores.length === 0 ? (
              <li className="text-slate-400">Module scores unavailable</li>
            ) : (
              moduleScores.map(([moduleId, percent]) => (
                <li key={moduleId} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-4 py-2">
                  <span className="font-medium text-white">Module {moduleId.toUpperCase()}</span>
                  <span>{percent}%</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/training/courses/l2-food-hygiene/start"
            className="inline-flex items-center rounded-xl border border-pink-400/70 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white"
          >
            Return to course
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:border-white/40"
          >
            Print certificate
          </button>
        </div>
      </div>
    </div>
  );
}
