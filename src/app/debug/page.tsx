"use client";

import { supabase } from "@/lib/supabase";

export default function DebugPage() {
  async function forceRefresh() {
    const { data, error } = await supabase.auth.refreshSession();
    console.log("Session object:", data?.session);
    if (error) {
      console.error("Error refreshing session:", error);
      alert("Refresh failed – check console.");
    } else {
      alert("Session refreshed. Check console for JWT.");
    }
  }

  return (
    <div style={{ padding: "2rem", color: "white" }}>
      <h1>Debug Token Refresh</h1>
      <button
        onClick={forceRefresh}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#EC4899",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Force Refresh
      </button>
    </div>
  );
}