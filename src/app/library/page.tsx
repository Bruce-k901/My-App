"use client";
import React from "react";
import Link from "next/link";

export default function LibraryPage() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Library</h1>
          <p className="text-theme-tertiary text-sm">Saved routines, reports, and assets.</p>
        </div>
        <Link href="/tasks" className="text-sm px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10">Back to Tasks</Link>
      </div>
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-theme-tertiary text-sm">Library features coming soon.</p>
      </div>
    </section>
  );
}