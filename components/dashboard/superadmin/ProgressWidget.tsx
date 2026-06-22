"use client";

export function ProgressWidget({
  done,
  total,
  color: _color,
}: {
  done: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  const bgColor = pct >= 100 ? "#4A7A3A" : `color-mix(in srgb, #8A6010 ${100 - pct}%, #B89B5B ${pct}%)`;
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-parch-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: bgColor }}
        />
      </div>
      <span className="text-[10px] tabular-nums" style={{ color: "var(--color-text-faded)" }}>
        {done}/{total}
      </span>
    </div>
  );
}
