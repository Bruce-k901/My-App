"use client";
import React, { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import TaskCard from "./TaskCard";
import TaskGroupHeader from "./TaskGroupHeader";
import type { Filters } from "./FiltersSidebar";

export type Task = {
  id: string;
  company_id: string;
  site_id: string;
  name: string;
  status: string | null;
  due_date: string | null;
  day_part: string | null;
  frequency?: string | null;
  assigned_to?: string | null;
  category?: string | null;
  details?: any;
};

async function fetchTasks(filters: Filters): Promise<Task[]> {
  let query = supabase.from("tasks").select("*");
  if (filters.site_id) query = query.eq("site_id", filters.site_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.frequency) query = query.eq("frequency", filters.frequency);
  query = query.order("day_part", { ascending: true }).order("due_date", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as any;
}

export default function TaskList({ filters, onOpenTask }: { filters: Filters; onOpenTask: (id: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tasks", filters], queryFn: () => fetchTasks(filters) });

  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = { opening: [], service: [], close: [] };
    for (const t of data || []) {
      const key = (t.day_part || "service") as keyof typeof groups;
      (groups[key] ||= []).push(t);
    }
    return groups;
  }, [data]);

  if (isLoading) return <div className="p-6 text-slate-400">Loading tasks…</div>;

  const renderGroup = (key: string, label: string, color: string) => (
    <div key={key} className="mb-6">
      <TaskGroupHeader label={label} color={color} />
      <div className="space-y-3">
        {(grouped[key] || []).map((t) => (
          <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
        ))}
        {(grouped[key] || []).length === 0 && (
          <div className="px-4 py-3 text-sm text-slate-400">No tasks.</div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#0b0e17]/80 backdrop-blur border-b border-white/10 px-4 py-2">
        <p className="text-xs uppercase tracking-widest text-slate-400">Tasks</p>
      </div>
      <div className="px-2 py-3">
        {renderGroup("opening", "Before Open", "#2563EB")}
        {renderGroup("service", "All Day", "#F59E0B")}
        {renderGroup("close", "After Close", "#6B7280")}
      </div>
    </div>
  );
}