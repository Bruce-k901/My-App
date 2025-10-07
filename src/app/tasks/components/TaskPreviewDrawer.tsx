"use client";
import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import TaskFormDynamic from "./TaskFormDynamic";

async function fetchTask(taskId: string | null) {
  if (!taskId) return null;
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
  if (error) throw error;
  return data as any;
}

const ACCENTS: Record<string, string> = {
  safety: "#F59E0B",
  hygiene: "#2563EB",
  maintenance: "#22C55E",
  compliance: "#EC4899",
  audit: "#14B8A6",
};

export default function TaskPreviewDrawer({ taskId, open, onClose, fullScreen }: { taskId: string | null; open: boolean; onClose: () => void; fullScreen?: boolean }) {
  const { data: task } = useQuery({ queryKey: ["task", taskId], queryFn: () => fetchTask(taskId), enabled: !!taskId });
  const accent = useMemo(() => {
    const key = (task?.category || "").toLowerCase();
    return ACCENTS[key] || "#2563EB";
  }, [task]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: fullScreen ? 0 : 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: fullScreen ? 0 : 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={fullScreen ? "fixed inset-0 z-50 bg-[#0b0e17]/80 backdrop-blur" : "rounded-2xl bg-white/5 border border-white/10 overflow-hidden"}
          role="dialog"
          aria-modal
        >
          {/* Panel */}
          <div className={fullScreen ? "mx-auto mt-8 max-w-2xl rounded-2xl bg-[#0f1220] border border-white/10" : "h-full"}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ boxShadow: `inset 0 3px 0 ${accent}` }}>
              <div>
                <p className="text-sm font-semibold">{task?.name || "Task"}</p>
                <p className="text-xs text-slate-400">{task?.frequency || ""}</p>
              </div>
              <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10">Close</button>
            </div>

            <div className="p-4">
              {taskId ? <TaskFormDynamic task={task} /> : <div className="text-sm text-slate-400">Select a task to preview.</div>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}