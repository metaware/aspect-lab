"use client";

import { fmt } from "@/lib/utils";

/** Bracket-style width/height annotations drawn outside the scaled container. */
export function DimensionGuides({
  width,
  height,
  zoom,
  heightLabel,
  widthLabel,
}: {
  width: number;
  height: number;
  zoom: number;
  heightLabel?: string;
  widthLabel?: string;
}) {
  const w = width * zoom;
  const h = height * zoom;
  return (
    <>
      <div className="pointer-events-none absolute left-0 flex flex-col items-center" style={{ top: -38, width: w }} aria-hidden>
        <span className="num mb-1 whitespace-nowrap text-xs text-muted-foreground">
          {fmt(width)}px{widthLabel ? <span className="text-subtle-foreground"> · {widthLabel}</span> : null}
        </span>
        <div className="h-2 w-full border-x border-t border-guide/70" />
      </div>
      <div className="pointer-events-none absolute top-0 flex items-center" style={{ right: -44, height: h }} aria-hidden>
        <div className="h-full w-2 border-y border-r border-guide/70" />
        <span
          className="num ml-1.5 whitespace-nowrap text-xs text-muted-foreground"
          style={{ writingMode: "vertical-rl" }}
        >
          {fmt(height)}px{heightLabel ? <span className="text-subtle-foreground"> · {heightLabel}</span> : null}
        </span>
      </div>
    </>
  );
}

function niceStep(zoom: number): number {
  // Aim for ~60 screen pixels between labelled ticks.
  const target = 60 / zoom;
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find((s) => s >= target) ?? 1000;
}

/** Rulers hugging the container's top and left edges, in container CSS px. */
export function Rulers({ width, height, zoom }: { width: number; height: number; zoom: number }) {
  const step = niceStep(zoom);
  const minor = step / 5;
  const ticks = (len: number) => {
    const out: Array<{ v: number; major: boolean }> = [];
    for (let v = 0; v <= len + 0.001; v += minor) out.push({ v, major: Math.abs(v / step - Math.round(v / step)) < 1e-6 });
    return out;
  };
  return (
    <>
      <svg
        className="pointer-events-none absolute left-0 overflow-visible text-subtle-foreground"
        style={{ top: -14, width: width * zoom, height: 12 }}
        aria-hidden
      >
        {ticks(width).map(({ v, major }) => (
          <g key={v}>
            <line x1={v * zoom} x2={v * zoom} y1={major ? 0 : 7} y2={12} stroke="currentColor" strokeWidth={1} opacity={major ? 0.8 : 0.4} />
            {major && v > 0 && (
              <text x={v * zoom + 2} y={7} fontSize={8} className="num" fill="currentColor">
                {v}
              </text>
            )}
          </g>
        ))}
      </svg>
      <svg
        className="pointer-events-none absolute top-0 overflow-visible text-subtle-foreground"
        style={{ left: -14, width: 12, height: height * zoom }}
        aria-hidden
      >
        {ticks(height).map(({ v, major }) => (
          <g key={v}>
            <line y1={v * zoom} y2={v * zoom} x1={major ? 0 : 7} x2={12} stroke="currentColor" strokeWidth={1} opacity={major ? 0.8 : 0.4} />
            {major && v > 0 && (
              <text x={0} y={v * zoom - 2} fontSize={8} className="num" fill="currentColor" transform={`rotate(-90 0 ${v * zoom - 2})`}>
                {v}
              </text>
            )}
          </g>
        ))}
      </svg>
    </>
  );
}
