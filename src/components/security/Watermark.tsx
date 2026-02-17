"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export function Watermark() {
  const pathname = usePathname();
  const { user, profile } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isDashboard = pathname?.startsWith("/dashboard") || pathname?.startsWith("/app");

  useEffect(() => {
    if (!isDashboard || !user) return;

    const identifier =
      profile?.email ||
      user.email ||
      user.id?.slice(0, 8) ||
      "user";
    const sessionHash = user.id
      ? user.id.slice(0, 6).toUpperCase()
      : Date.now().toString(36).toUpperCase();
    const watermarkText = `${identifier}  ${sessionHash}`;

    function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const tileW = 400 * dpr;
      const tileH = 200 * dpr;
      canvas.width = tileW;
      canvas.height = tileH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, tileW, tileH);
      ctx.save();
      ctx.translate(tileW / 2, tileH / 2);
      ctx.rotate((-30 * Math.PI) / 180);

      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark
        ? "rgba(255, 255, 255, 0.025)"
        : "rgba(0, 0, 0, 0.03)";
      ctx.font = `${12 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(watermarkText, 0, 0);
      ctx.restore();

      if (containerRef.current) {
        containerRef.current.style.backgroundImage = `url(${canvas.toDataURL()})`;
        containerRef.current.style.backgroundRepeat = "repeat";
        containerRef.current.style.backgroundSize = `${400}px ${200}px`;
      }
    }

    render();

    // Re-render when theme changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") render();
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    // Tamper resistance: re-inject if container is removed
    const CONTAINER_ID = "__wm";
    const bodyObserver = new MutationObserver(() => {
      if (!document.getElementById(CONTAINER_ID) && containerRef.current) {
        document.body.appendChild(containerRef.current);
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      bodyObserver.disconnect();
    };
  }, [isDashboard, user, profile?.email]);

  if (!isDashboard || !user) return null;

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div
        ref={containerRef}
        id="__wm"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
    </>
  );
}
