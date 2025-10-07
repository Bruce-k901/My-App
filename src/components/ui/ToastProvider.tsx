"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import Toast from "./Toast";

type ToastItem = { id: number; message: string; type?: "success" | "error" | "info" | "warning"; durationMs?: number };

type ToastContextValue = {
  showToast: (messageOrOptions: string | { title?: string; description?: string; type?: ToastItem["type"]; durationMs?: number }, type?: ToastItem["type"], durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const showToast = (
    messageOrOptions: string | { title?: string; description?: string; type?: ToastItem["type"]; durationMs?: number },
    type: ToastItem["type"] = "info",
    durationMs = 3000
  ) => {
    let message: string;
    let resolvedType: ToastItem["type"] = type;
    let resolvedDuration = durationMs;

    if (typeof messageOrOptions === "string") {
      message = messageOrOptions;
    } else {
      const { title, description, type: optType, durationMs: optDuration } = messageOrOptions;
      message = [title, description].filter(Boolean).join(": ");
      if (optType) resolvedType = optType;
      if (optDuration) resolvedDuration = optDuration;
    }

    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, message, type: resolvedType, durationMs: resolvedDuration }]);
    // Auto remove handled by each Toast's onClose
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} durationMs={t.durationMs} onClose={() => setItems((prev) => prev.filter((i) => i.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}