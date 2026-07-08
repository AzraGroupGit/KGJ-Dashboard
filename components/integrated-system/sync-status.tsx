"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface SyncStatusProps {
  lastSyncAt?: string | null;
}

export default function SyncStatus({ lastSyncAt }: SyncStatusProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const lastSync = lastSyncAt ? new Date(lastSyncAt) : null;
  const minutesAgo = lastSync
    ? Math.floor((now - lastSync.getTime()) / 60_000)
    : null;

  const isHealthy = minutesAgo !== null && minutesAgo < 15;
  const isWarning = minutesAgo !== null && minutesAgo >= 15 && minutesAgo < 60;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-[#2a2522] px-3 py-1.5 shadow-sm">
      <div
        className={`h-2 w-2 rounded-full ${
          lastSync === null
            ? "bg-gray-300"
            : isHealthy
              ? "bg-emerald-500/[0.08]0"
              : isWarning
                ? "bg-[#c9a227]/100"
                : "bg-red-500/[0.08]0"
        }`}
      />
      <div className="flex items-center gap-1 text-xs text-[#e8e2d4]">
        <RefreshCw className="h-3 w-3" />
        {lastSync ? (
          isHealthy ? (
            <span>Sync {minutesAgo} menit lalu</span>
          ) : (
            <span>Sync {minutesAgo} menit lalu</span>
          )
        ) : (
          <span>Belum ada sync</span>
        )}
      </div>
    </div>
  );
}
