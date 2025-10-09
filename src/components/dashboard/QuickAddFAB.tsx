"use client";

import { Plus, ClipboardList, AlertOctagon, FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuickAddFAB() {
  const router = useRouter();
  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-40">
      <button className="w-12 h-12 rounded-full bg-pink-600 hover:bg-pink-500 text-white shadow-lg flex items-center justify-center">
        <Plus className="w-5 h-5" />
      </button>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push("/tasks/new")}
          className="text-xs px-3 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] backdrop-blur-md flex items-center gap-2"
        >
          <ClipboardList className="w-4 h-4 text-pink-400" /> Add Task
        </button>
        <button
          onClick={() => router.push("/incidents/new")}
          className="text-xs px-3 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] backdrop-blur-md flex items-center gap-2"
        >
          <AlertOctagon className="w-4 h-4 text-pink-400" /> Log Incident
        </button>
        <button
          onClick={() => router.push("/reports/certificates/new")}
          className="text-xs px-3 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] backdrop-blur-md flex items-center gap-2"
        >
          <FilePlus2 className="w-4 h-4 text-pink-400" /> Upload Cert
        </button>
      </div>
    </div>
  );
}