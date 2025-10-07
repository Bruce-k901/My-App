"use client";
import React from "react";
import { CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Task } from "./TaskList";
import { useAppContext } from "@/context/AppContext";

export default function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const qc = useQueryClient();
  const { email } = useAppContext();

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").update({ status: "completed" }).eq("id", task.id);
      if (error) throw error;
      // Insert notification
      await supabase.from("notifications").insert({
        company_id: task.company_id,
        site_id: task.site_id,
        type: "task",
        severity: "info",
        message: `Task completed: ${task.name}${email ? ` by ${email}` : ""}`,
        status: "new",
      });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      if (prev) qc.setQueryData<Task[]>(["tasks"], prev.map((t) => (t.id === task.id ? { ...t, status: "completed" } : t)));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <div className="group px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition relative overflow-hidden">
      {/* Accent hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-blue-500/5 via-magenta-500/5 to-transparent" />
      <div className="relative flex items-center justify-between">
        <button
          className={`mr-3 w-5 h-5 rounded-full border ${task.status === "completed" ? "bg-green-500/40 border-green-500/60" : "border-white/20"}`}
          aria-label="Complete task"
          onClick={() => completeMutation.mutate()}
        />
        <div className="flex-1">
          <p className="text-sm font-medium">{task.name}</p>
          <p className="text-xs text-slate-400">{task.frequency || ""}</p>
        </div>
        <button onClick={onOpen} className="text-slate-400 hover:text-white flex items-center text-xs">
          Preview
          <CheckCircle2 className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
        </button>
      </div>
    </div>
  );
}