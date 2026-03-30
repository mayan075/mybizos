"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function AdminSparkline({
  data,
  width = 120,
  height = 32,
  color = "currentColor",
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={cn("opacity-30", className)}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: padding + ((max - value) / range) * (height - padding * 2),
  }));

  // Build a smooth path using quadratic bezier curves
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`;
  }

  // Fill area under the curve
  const lastPoint = points[points.length - 1]!;
  const fillPath =
    path +
    ` L ${lastPoint.x} ${height} L ${points[0]!.x} ${height} Z`;

  return (
    <svg width={width} height={height} className={className}>
      <defs>
        <linearGradient id={`sparkline-fill-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={fillPath}
        fill={`url(#sparkline-fill-${color.replace(/[^a-z0-9]/gi, "")})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
