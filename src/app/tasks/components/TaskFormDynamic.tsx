"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import CheckboxCustom from "@/components/ui/CheckboxCustom";

type Item = {
  id: string;
  task_id: string;
  label: string;
  input_type: "text" | "checkbox" | "select" | string;
  required: boolean;
  options: string[] | null;
};

async function fetchItems(taskId: string): Promise<Item[]> {
  const { data, error } = await supabase.from("checklist_items").select("*").eq("task_id", taskId).order("id");
  if (error) throw error;
  return (data || []) as any;
}

export default function TaskFormDynamic({ task }: { task: any }) {
  const taskId = task?.id as string;
  const qc = useQueryClient();
  const { data: items } = useQuery({ queryKey: ["checklist_items", taskId], queryFn: () => fetchItems(taskId), enabled: !!taskId });
  const [values, setValues] = useState<Record<string, any>>(() => ({ ...(task?.details || {}) }));

  useEffect(() => {
    setValues({ ...(task?.details || {}) });
  }, [taskId]);

  const saveMutation = useMutation({
    mutationFn: async (next: Record<string, any>) => {
      const { error } = await supabase.from("tasks").update({ details: next }).eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["task", taskId] });
      const prev = qc.getQueryData<any>(["task", taskId]);
      if (prev) qc.setQueryData(["task", taskId], { ...prev, details: next });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["task", taskId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });

  const onChange = (key: string, val: any) => {
    const next = { ...values, [key]: val };
    setValues(next);
    saveMutation.mutate(next);
  };

  const renderField = (item: Item) => {
    const key = item.id;
    const val = values[key];
    const label = item.label;
    const base = "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-magenta-500/40";
    if (item.input_type === "text") {
      return <input className={base} value={val || ""} onChange={(e) => onChange(key, e.target.value)} placeholder={label} />;
    }
    if (item.input_type === "checkbox") {
      return (
        <label className="flex items-center space-x-2">
          <CheckboxCustom
            checked={!!val}
            onChange={(checked: boolean) => onChange(key, checked)}
            size={16}
          />
          <span className="text-sm">{label}</span>
        </label>
      );
    }
    if (item.input_type === "select") {
      const opts = item.options || [];
      return (
        <select className={base} value={val || ""} onChange={(e) => onChange(key, e.target.value)}>
          <option value="">Select…</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return <input className={base} value={val || ""} onChange={(e) => onChange(key, e.target.value)} placeholder={label} />;
  };

  if (!taskId) return null;

  return (
    <div className="space-y-4">
      {items && items.length > 0 ? (
        items.map((item) => (
          <div key={item.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">{item.label}</p>
            {renderField(item)}
          </div>
        ))
      ) : (
        <div className="text-sm text-slate-400">No form items for this task.</div>
      )}
    </div>
  );
}