// components/dashboard/StatCard.tsx

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
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
    indigo: "bg-indigo-50 border-indigo-200",
    yellow: "bg-yellow-50 border-yellow-200",
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
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {delta !== undefined && delta !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isGood
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {delta >= 0 ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
