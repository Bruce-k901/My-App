// @salsa - SALSA Compliance: Traceability report page
'use client';

import { useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Layers,
  Printer,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
} from '@/components/ui/icons';
import TraceSearchBar from '@/components/stockly/TraceSearchBar';
import TraceabilityTree from '@/components/stockly/TraceabilityTree';
import MassBalanceCard from '@/components/stockly/MassBalanceCard';
import type { TraceResult } from '@/lib/types/stockly';

export default function TraceabilityPage() {
  const { companyId } = useAppContext();
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock recall exercise state
  const [mockExercise, setMockExercise] = useState(false);
  const [exerciseStartTime, setExerciseStartTime] = useState<Date | null>(null);
  const [exerciseEndTime, setExerciseEndTime] = useState<Date | null>(null);
  const [backwardResult, setBackwardResult] = useState<TraceResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // @salsa — Run trace
  async function handleTrace(batchId: string, direction: 'forward' | 'backward') {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stockly/traceability/${direction}?batchId=${batchId}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Trace failed');
        return;
      }

      setTraceResult(json.data);

      // If mock exercise, run both directions
      if (mockExercise && !exerciseEndTime) {
        if (direction === 'forward') {
          // Also run backward
          const backRes = await fetch(`/api/stockly/traceability/backward?batchId=${batchId}`);
          const backJson = await backRes.json();
          if (backJson.success) setBackwardResult(backJson.data);
        } else {
          // Also run forward
          const fwdRes = await fetch(`/api/stockly/traceability/forward?batchId=${batchId}`);
          const fwdJson = await fwdRes.json();
          if (fwdJson.success) setBackwardResult(fwdJson.data);
        }

        // Stop timer
        setExerciseEndTime(new Date());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // @salsa — Start mock recall exercise
  function startMockExercise() {
    setMockExercise(true);
    setExerciseStartTime(new Date());
    setExerciseEndTime(null);
    setTraceResult(null);
    setBackwardResult(null);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }

  function stopMockExercise() {
    setMockExercise(false);
    setExerciseStartTime(null);
    setExerciseEndTime(null);
    setBackwardResult(null);
    setElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
            <Layers className="w-6 h-6 text-stockly-dark dark:text-stockly" />
            Traceability
          </h1>
          <p className="text-sm text-theme-secondary mt-1">
            Trace raw materials through production to finished goods and customers
          </p>
        </div>
        <div className="flex gap-2">
          {!mockExercise ? (
            <button
              onClick={startMockExercise}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-sm font-medium transition-colors"
            >
              <Shield className="w-4 h-4" />
              Mock Recall Exercise
            </button>
          ) : (
            <button
              onClick={stopMockExercise}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
            >
              Stop Exercise
            </button>
          )}
          {traceResult && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme-border text-theme-secondary hover:bg-theme-bg-secondary text-sm font-medium transition-colors print:hidden"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          )}
        </div>
      </div>

      {/* Mock exercise banner */}
      {mockExercise && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Mock Recall Exercise in Progress</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  SALSA requires traceability within 4 hours. Enter a batch code and trace to complete the exercise.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className={`font-mono text-lg font-bold ${
                elapsed > 14400 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {formatElapsed(elapsed)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-theme-bg-primary border border-theme-border rounded-lg p-4 print:hidden">
        <TraceSearchBar onTrace={handleTrace} loading={loading} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {traceResult && (
        <div className="space-y-4">
          {/* Exercise complete banner */}
          {mockExercise && exerciseEndTime && exerciseStartTime && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">Exercise Complete</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Completed in {formatElapsed(elapsed)}.
                    {elapsed <= 14400
                      ? ' Within the 4-hour SALSA requirement.'
                      : ' Exceeded the 4-hour target — review and improve processes.'}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Started: {exerciseStartTime.toLocaleString('en-GB')} | Completed: {exerciseEndTime.toLocaleString('en-GB')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trace direction header */}
          <div className="print:block">
            <h2 className="text-lg font-bold text-theme-primary">
              {traceResult.direction === 'forward' ? 'Forward Trace' : 'Backward Trace'}
              <span className="text-sm font-normal text-theme-secondary ml-2">
                from batch {traceResult.batch?.batch_code}
              </span>
            </h2>
          </div>

          {/* Tree visualization */}
          <div className="bg-theme-bg-primary border border-theme-border rounded-lg p-4 overflow-x-auto print:border-0 print:p-0">
            <TraceabilityTree
              nodes={traceResult.nodes}
              links={traceResult.links}
              direction={traceResult.direction}
            />
          </div>

          {/* Mass balance */}
          {traceResult.mass_balance && (
            <MassBalanceCard
              totalInput={traceResult.mass_balance.total_input}
              totalOutput={traceResult.mass_balance.total_output}
              variance={traceResult.mass_balance.variance}
              variancePercent={traceResult.mass_balance.variance_percent}
              unit={traceResult.mass_balance.unit}
            />
          )}

          {/* Backward result (mock exercise shows both directions) */}
          {backwardResult && (
            <div className="space-y-4 mt-6">
              <h2 className="text-lg font-bold text-theme-primary">
                {backwardResult.direction === 'forward' ? 'Forward Trace' : 'Backward Trace'}
                <span className="text-sm font-normal text-theme-secondary ml-2">
                  (complementary direction)
                </span>
              </h2>
              <div className="bg-theme-bg-primary border border-theme-border rounded-lg p-4 overflow-x-auto print:border-0 print:p-0">
                <TraceabilityTree
                  nodes={backwardResult.nodes}
                  links={backwardResult.links}
                  direction={backwardResult.direction}
                />
              </div>
              {backwardResult.mass_balance && (
                <MassBalanceCard
                  totalInput={backwardResult.mass_balance.total_input}
                  totalOutput={backwardResult.mass_balance.total_output}
                  variance={backwardResult.mass_balance.variance}
                  variancePercent={backwardResult.mass_balance.variance_percent}
                  unit={backwardResult.mass_balance.unit}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!traceResult && !loading && !error && (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">Enter a batch code to begin</h3>
          <p className="text-sm text-theme-secondary max-w-md mx-auto">
            Search for a batch code above and choose a trace direction to visualise the full supply chain.
          </p>
        </div>
      )}
    </div>
  );
}
