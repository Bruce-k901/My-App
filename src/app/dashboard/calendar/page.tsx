"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePanelStore } from "@/lib/stores/panel-store";

export default function CalendarPage() {
  const router = useRouter();
  const { setCalendarOpen } = usePanelStore();

  useEffect(() => {
    setCalendarOpen(true);
    router.replace("/dashboard");
  }, [router, setCalendarOpen]);

  return null;
}
