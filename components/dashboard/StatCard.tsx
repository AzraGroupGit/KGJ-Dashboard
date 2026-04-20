// components/dashboard/StatCard.tsx

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  subtitle?: string;
  color: "blue" | "green" | "purple" | "orange" | "red" | "indigo" | "yellow";
}

export default function StatCard({
  title,
  value,
  trend,
  subtitle,
  color,
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

  return (
    <div className={`${colors[color]} rounded-xl border p-6`}>
      <div className="flex items-center justify-between">
        {trend && (
          <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
