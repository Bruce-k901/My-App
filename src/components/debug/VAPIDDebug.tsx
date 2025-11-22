"use client";

import { useEffect, useState } from "react";
import * as pushNotifications from "@/lib/notifications/pushNotifications";

/**
 * Debug component to check VAPID key status
 * Add this to your dashboard to see what's available
 */
export function VAPIDDebug() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      const keyStatus = pushNotifications.getVAPIDKeyStatus();
      const envCheck = {
        // @ts-ignore - accessing process.env in browser
        directAccess: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "NOT FOUND",
        // @ts-ignore
        allNextPublic: Object.keys(process.env || {}).filter((k: string) =>
          k.startsWith("NEXT_PUBLIC_")
        ),
      };
      setStatus({ ...keyStatus, ...envCheck });
    };

    checkStatus();
  }, []);

  if (!status) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 m-4">
      <h3 className="text-yellow-400 font-bold mb-2">VAPID Key Debug</h3>
      <div className="text-sm text-white/80 space-y-1 font-mono">
        <div>
          <strong>Key Exists:</strong> {status.exists ? "✅ YES" : "❌ NO"}
        </div>
        <div>
          <strong>Key Length:</strong> {status.length} (expected: 87)
        </div>
        <div>
          <strong>Key Prefix:</strong> {status.prefix}
        </div>
        <div>
          <strong>Correct Format:</strong>{" "}
          {status.isCorrectFormat ? "✅ YES" : "❌ NO"}
        </div>
        <div>
          <strong>Direct Access:</strong>{" "}
          {status.directAccess !== "NOT FOUND"
            ? `✅ ${status.directAccess.substring(0, 20)}...`
            : "❌ NOT FOUND"}
        </div>
        <div>
          <strong>All NEXT_PUBLIC_ vars:</strong> {status.allNextPublic?.join(", ") || "NONE"}
        </div>
        <div className="mt-2 text-xs text-white/60">
          <strong>Full Key:</strong> {status.actualValue || "NOT SET"}
        </div>
      </div>
    </div>
  );
}

