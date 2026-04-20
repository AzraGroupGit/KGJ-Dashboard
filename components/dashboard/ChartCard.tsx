// components/dashboard/ChartCard.tsx

"use client";

import { useEffect, useRef } from "react";

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
}

interface ChartCardProps {
  title: string;
  type: "bar" | "line";
  labels: string[];
  datasets: ChartDataset[];
  period?: string;
  formatValue?: (v: number) => string;
}

export default function ChartCard({
  title,
  type,
  labels,
  datasets,
  period,
  formatValue,
}: ChartCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !labels.length || !datasets.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to its CSS layout size (avoid blurry canvas on retina)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padLeft = 64;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 36;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    ctx.clearRect(0, 0, W, H);

    const allValues = datasets.flatMap((d) => d.data);
    const maxValue = Math.max(...allValues, 1);

    // Grid lines
    const gridLines = 4;
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const y = padTop + chartH - (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      const val = (maxValue / gridLines) * i;
      ctx.fillStyle = "#9ca3af";
      ctx.font = `10px system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(
        formatValue ? formatValue(val) : val >= 1_000_000 ? `${(val / 1_000_000).toFixed(0)}M` : String(Math.round(val)),
        padLeft - 6,
        y + 3,
      );
    }

    if (type === "bar") {
      const groupWidth = chartW / labels.length;
      const barPad = groupWidth * 0.15;
      const totalBarPad = barPad * (datasets.length + 1);
      const barW = (groupWidth - totalBarPad) / datasets.length;

      datasets.forEach((dataset, dsIdx) => {
        dataset.data.forEach((value, i) => {
          const barH = (value / maxValue) * chartH;
          const groupX = padLeft + i * groupWidth;
          const x = groupX + barPad + dsIdx * (barW + barPad / datasets.length);
          const y = padTop + chartH - barH;

          const grad = ctx.createLinearGradient(x, y, x, y + barH);
          grad.addColorStop(0, dataset.color + "cc");
          grad.addColorStop(1, dataset.color);
          ctx.fillStyle = grad;

          const r = Math.min(4, barW / 2);
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + barW - r, y);
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
          ctx.lineTo(x + barW, y + barH);
          ctx.lineTo(x, y + barH);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
        });
      });

      // X labels
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      labels.forEach((label, i) => {
        const x = padLeft + i * (chartW / labels.length) + chartW / labels.length / 2;
        ctx.fillText(label, x, padTop + chartH + 20);
      });
    } else {
      // Line chart
      const stepX = chartW / (labels.length - 1 || 1);

      datasets.forEach((dataset) => {
        const points = dataset.data.map((v, i) => ({
          x: padLeft + i * stepX,
          y: padTop + chartH - (v / maxValue) * chartH,
        }));

        // Fill area
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.lineTo(points[points.length - 1].x, padTop + chartH);
        ctx.lineTo(points[0].x, padTop + chartH);
        ctx.closePath();
        ctx.fillStyle = dataset.color + "18";
        ctx.fill();

        // Line
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Dots
        points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = dataset.color;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
          ctx.fillStyle = "#fff";
          ctx.fill();
        });
      });

      // X labels
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      labels.forEach((label, i) => {
        ctx.fillText(label, padLeft + i * stepX, padTop + chartH + 20);
      });
    }
  }, [type, labels, datasets, formatValue]);

  // Legend
  const visibleDatasets = datasets.filter((d) => d.data.some((v) => v > 0));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {visibleDatasets.length > 1 && (
          <div className="flex gap-3">
            {visibleDatasets.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: d.color }} />
                {d.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="w-full h-56" />
      {period && (
        <p className="mt-3 text-center text-xs text-gray-400">{period}</p>
      )}
    </div>
  );
}
