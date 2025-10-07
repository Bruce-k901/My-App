"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/components/ui/ToastProvider";

type Task = {
  id: string;
  company_id: string;
  site_id: string;
  checklist_template_id: string | null;
  name: string;
  day_part: string | null;
  frequency: string | null;
  due_date: string;
  assigned_to: string | null;
  status: string;
  completed_at: string | null;
  notes: string | null;
  photo_path: string | null;
};

function statusColor(status?: string) {
  switch (status) {
    case "completed":
      return "text-emerald-400";
    case "in_progress":
      return "text-amber-400";
    case "missed":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

export default function StaffTaskList() {
  const { siteId, companyId } = useAppContext();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const t of tasks) {
      const key = t.day_part || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    // Sort day parts in a preferred order
    const order = ["opening", "pre-service", "service", "close", "Other"];
    return Object.entries(groups).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [tasks]);

  useEffect(() => {
    let mounted = true;
    const fetchTasks = async () => {
      if (!siteId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("site_id", siteId)
        .eq("due_date", today)
        .neq("status", "completed")
        .order("day_part", { ascending: true });
      setLoading(false);
      if (error) {
        showToast(`Failed to load tasks: ${error.message}`, "error");
      } else if (mounted) {
        const rows = (data || []) as Task[];
        setTasks(rows);
        // Generate signed URLs for any photos
        const generateSigned = async () => {
          const entries: [string, string][] = [];
          for (const t of rows) {
            if (t.photo_path) {
              const { data: signed } = await supabase.storage
                .from("task_photos")
                .createSignedUrl(t.photo_path, 3600);
              const url = signed?.signedUrl;
              if (url) entries.push([t.id, url]);
            }
          }
          if (mounted && entries.length) {
            setPhotoUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
          }
        };
        generateSigned();
      }
    };
    fetchTasks();

    const channel = supabase
      .channel("tasks_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `site_id=eq.${siteId}` },
        () => {
          // Re-fetch on any task change for this site
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [siteId, today, showToast]);

  const logEvent = async (task: Task, action: string, details: any) => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) return;
      await supabase.from("task_events").insert({
        task_id: task.id,
        company_id: task.company_id,
        site_id: task.site_id,
        user_id: userId,
        action,
        details,
      });
    } catch (_) {
      // Non-blocking audit; ignore failures
    }
  };

  const toggleComplete = async (task: Task, checked: boolean) => {
    const status = checked ? "completed" : "pending";
    const completed_at = checked ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("tasks")
      .update({ status, completed_at })
      .eq("id", task.id);
    if (error) showToast(`Update failed: ${error.message}`, "error");
    else {
      showToast(checked ? "Task completed" : "Marked as pending", "success");
      logEvent(task, "status_change", { to: status });
    }
  };

  const saveNotes = async (task: Task, notes: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ notes })
      .eq("id", task.id);
    if (error) showToast(`Failed to save notes: ${error.message}`, "error");
    else {
      showToast("Notes saved", "success");
      logEvent(task, "notes_update", { len: notes.length });
    }
  };

  const uploadPhoto = async (task: Task, file: File) => {
    if (!companyId || !siteId) {
      showToast("Missing company or site context", "error");
      return;
    }
    // Storage path (without bucket name)
    const path = `${companyId}/${siteId}/${task.id}/${file.name}`;
    const { error: upErr } = await supabase.storage.from("task_photos").upload(path, file, {
      upsert: true,
    });
    if (upErr) {
      showToast(`Upload failed: ${upErr.message}`, "error");
      return;
    }
    const { error: updErr } = await supabase
      .from("tasks")
      .update({ photo_path: path })
      .eq("id", task.id);
    if (updErr) {
      showToast(`Failed to attach photo: ${updErr.message}`, "error");
      return;
    }
    showToast("Photo attached", "success");
    const { data: signed } = await supabase.storage.from("task_photos").createSignedUrl(path, 3600);
    const url = signed?.signedUrl;
    if (url) setPhotoUrls((prev) => ({ ...prev, [task.id]: url }));
    logEvent(task, "photo_upload", { path, filename: file.name });
  };

  if (!siteId) {
    return <p className="text-slate-500">No site selected. Choose a site to view tasks.</p>;
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(236,72,153,0.12)]">
      <h2 className="text-lg font-semibold mb-3">Today’s Tasks</h2>
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-slate-500 text-sm">No tasks for today.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([part, items]) => (
            <div key={part}>
              <h3 className="text-sm font-semibold text-slate-300 mb-2 capitalize">{part.replace("_", " ")}</h3>
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t.id} className="flex flex-col gap-2 rounded border border-neutral-800 bg-[#191c26] p-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={t.status === "completed"}
                          onChange={(e) => toggleComplete(t, e.target.checked)}
                        />
                        <span className={`text-sm ${statusColor(t.status)}`}>{t.name}</span>
                      </label>
                      <span className="text-xs text-slate-500 capitalize">{t.day_part ?? ""}</span>
                    </div>

                    <textarea
                      defaultValue={t.notes ?? ""}
                      placeholder="Add notes…"
                      className="w-full text-sm rounded bg-[#0f1220] border border-neutral-800 p-2 text-slate-200"
                      onBlur={(e) => saveNotes(t, e.target.value)}
                    />

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {t.completed_at ? (
                          <>Completed at {new Date(t.completed_at).toLocaleTimeString()}</>
                        ) : (
                          <>Pending</>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {photoUrls[t.id] ? (
                          <>
                            <img src={photoUrls[t.id]} alt="Task photo" className="h-10 w-10 rounded object-cover border border-neutral-800" />
                            <a href={photoUrls[t.id]} target="_blank" rel="noreferrer" className="text-xs text-magenta-400 hover:text-magenta-300">
                              View Photo
                            </a>
                          </>
                        ) : null}
                        <label className="text-xs text-slate-300 cursor-pointer">
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadPhoto(t, file);
                              e.currentTarget.value = ""; // reset
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}