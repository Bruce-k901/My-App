"use client";

import React from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui";

export default function QuickActions() {
  const router = useRouter();
  const go = (href: string) => {
    router.prefetch(href);
    router.push(href);
  };
  return (
    <GlassCard className="text-center">
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => go("/tasks/new")} variant="primary">Add Task</Button>
        <Button onClick={() => go("/sites/new")} variant="primary">Add Site</Button>
        <Button onClick={() => go("/ppm")} variant="primary">View PPMs</Button>
        <Button onClick={() => go("/sops")} variant="primary">Review SOPs</Button>
      </div>
    </GlassCard>
  );
}