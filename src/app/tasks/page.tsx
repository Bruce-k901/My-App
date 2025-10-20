"use client";
import React, { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import FiltersSidebar, { Filters } from "./components/FiltersSidebar";
import TaskList from "./components/TaskList";
import TaskPreviewDrawer from "./components/TaskPreviewDrawer";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

function TasksPageInner() {
  const { siteId } = useAppContext();
  const params = useSearchParams();
  const initialSite = params.get("site_id") || siteId || null;
  const [filters, setFilters] = useState<Filters>({ site_id: initialSite, status: "open" });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPos = useRef<number>(0);

  const onOpenTask = (taskId: string) => {
    scrollPos.current = scrollRef.current?.scrollTop || 0;
    setSelectedTaskId(taskId);
    setDrawerOpen(true);
  };

  const onCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedTaskId(null);
    // restore scroll
    if (scrollRef.current) scrollRef.current.scrollTop = scrollPos.current;
  };

  const tabs = useMemo(
    () => [
      { href: "/tasks", label: "My Tasks" },
      { href: "/templates", label: "Templates" },
      { href: "/library", label: "Library" },
    ],
    []
  );

  return (
    <section className="w-full h-[calc(100vh-64px)]">
      {/* Top Tabs & Actions */}
      <div className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0b0e17]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-1.5 rounded-full text-sm transition btn-pill ${t.href === "/tasks" ? "bg-white/10 border border-white/20" : "hover:bg-white/10"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <Link href="/tasks/create" className="btn-glass-cta">Create Task</Link>
        </div>
      </div>

      {/* Tri-Pane Grid */}
      <div className="max-w-7xl mx-auto px-4 h-[calc(100vh-64px-49px)] grid grid-cols-12 gap-4">
        {/* Filters Sidebar */}
        <aside className="hidden md:block md:col-span-3">
          <FiltersSidebar filters={filters} onChange={setFilters} />
        </aside>

        {/* Task List */}
        <div ref={scrollRef} className="col-span-12 md:col-span-6 overflow-y-auto">
          <TaskList filters={filters} onOpenTask={onOpenTask} />
        </div>

        {/* Drawer (desktop) */}
        <div className="hidden lg:block lg:col-span-3">
          <TaskPreviewDrawer taskId={selectedTaskId} open={drawerOpen} onClose={onCloseDrawer} />
        </div>
      </div>

      {/* Drawer (mobile as modal) */}
      <div className="lg:hidden">
        <TaskPreviewDrawer taskId={selectedTaskId} open={drawerOpen} onClose={onCloseDrawer} fullScreen />
      </div>
    </section>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading tasks…</div>}>
      <EntityPageLayout title="Tasks" searchPlaceholder="Search">
        <TasksPageInner />
      </EntityPageLayout>
    </Suspense>
  );
}