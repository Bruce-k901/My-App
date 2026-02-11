"use client";

import { useAppContext } from "@/context/AppContext";
import StaffTaskList from "@/components/tasks/StaffTaskList";
import { MessagingWidget } from "./MessagingWidget";

export default function StaffDashboard() {
  const { loading, tasks, temperatureLogs, incidents, siteId } = useAppContext();
  if (loading) return <Loading />;

  return (
    <section className="px-6 py-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {!siteId && <SetupPrompt />}

      <MessagingWidget />

      {/* Operational Task List */}
      <StaffTaskList />

      <Widget title="Temperature">
        {temperatureLogs.length === 0 ? (
          <Empty text="No recent temperature logs." />
        ) : (
          <ul className="text-sm text-slate-300 space-y-2">
            {temperatureLogs.slice(0, 6).map((l: any) => (
              <li key={l.id} className="flex justify-between">
                <span>{l.device ?? "Device"}</span>
                <span className="text-slate-500">{l.reading ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="Alerts">
        {incidents.length === 0 ? (
          <Empty text="No open incidents." />
        ) : (
          <ul className="text-sm text-slate-300 space-y-2">
            {incidents.slice(0, 6).map((i: any) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.type ?? `Incident #${i.id}`}</span>
                <span className="text-slate-500">{i.status ?? "open"}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </section>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(211, 126, 145,0.12)]">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-slate-500 text-sm">{text}</p>;
}

function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-slate-400">Loading dashboard…</p>
    </div>
  );
}

function SetupPrompt() {
  return (
    <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-[#141823] p-4">
      <p className="text-slate-300 text-sm">
        No site assigned to your account yet. Ask your manager to assign you to a site to see tasks
        and logs.
      </p>
    </div>
  );
}