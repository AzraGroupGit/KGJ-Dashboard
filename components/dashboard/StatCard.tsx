// components/dashboard/StatCard.tsx

import { ChevronUp, ChevronDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: "blue" | "green" | "purple" | "orange" | "red" | "indigo" | "yellow";
  /** Percentage change vs comparison period. Positive = better, negative = worse. */
  delta?: number;
  /** Override arrow direction: true = up is good, false = up is bad */
  higherIsBetter?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  color,
  delta,
  higherIsBetter = true,
}: StatCardProps) {
  const colors = {
    blue: "bg-[#c9a227]/10 border-blue-200",
    green: "bg-[#c9a227]/10 border-green-200",
    purple: "bg-[#c9a227]/10 border-purple-200",
    orange: "bg-orange-500/[0.08] border-orange-200",
    red: "bg-red-500/[0.08] border-red-200",
    indigo: "bg-[#c9a227]/10 border-indigo-200",
    yellow: "bg-yellow-500/[0.08] border-yellow-200",
  };

  const isGood =
    delta !== undefined && delta !== null
      ? higherIsBetter
        ? delta >= 0
        : delta <= 0
      : null;

  return (
    <div className={`${colors[color]} rounded-xl border p-6`}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-medium text-[#e8e2d4]">{title}</h3>
        {delta !== undefined && delta !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isGood
                ? "bg-green-100 text-green-700"
                : "bg-red-500/[0.12] text-red-300"
            }`}
          >
            {delta >= 0 ? (
              <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[#f0f4ff]">{value}</p>
      {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
    </div>
  );
}
