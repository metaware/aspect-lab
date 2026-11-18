"use client";

import { useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, X, Table2, LineChart as LineIcon } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { useAnalyticsConfig } from "@/hooks/use-simulator";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { computeSeries, METRIC_LABELS } from "@/lib/analytics/series";
import { BREAKPOINT_MARKERS } from "@/lib/assets/device-presets";
import { ALL_ASPECT_RATIO_PRESETS, parseRatio } from "@/lib/assets/aspect-ratios";
import { VIEWPORT_MAX, VIEWPORT_MIN } from "@/lib/configuration/defaults";
import { Label, NativeSelect, NumberInput, Segmented } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { cn, fmt } from "@/lib/utils";
import type { ChartMetric } from "@/types/simulator";

const MAX_SERIES = 6;
const SLOTS = [1, 2, 3, 4, 5, 6].map((i) => `var(--chart-${i})`);

/** Stable color slots: a ratio keeps its color while it stays on the chart. */
function useStableSlots(keys: string[]) {
  const map = useRef(new Map<string, number>());
  const m = map.current;
  for (const k of [...m.keys()]) if (!keys.includes(k)) m.delete(k);
  for (const k of keys) {
    if (m.has(k)) continue;
    const used = new Set(m.values());
    m.set(k, [0, 1, 2, 3, 4, 5].find((i) => !used.has(i)) ?? 0);
  }
  return (k: string) => SLOTS[m.get(k) ?? 0];
}

function formatValue(v: number, metric: ChartMetric) {
  if (metric === "scale") return `${fmt(v, 3)}×`;
  if (metric === "resolution") return `${fmt(v, 0)}px`;
  return `${v.toFixed(1)}%`;
}

export function AnalysisRangeControls() {
  const a = useSimulatorStore((s) => s.config.analysis);
  const patch = useSimulatorStore((s) => s.patch);
  return (
    <div className="flex items-center gap-1.5">
      <NumberInput label="Analysis range minimum viewport" value={a.minViewport} min={VIEWPORT_MIN} max={VIEWPORT_MAX} suffix="px" digits={0} className="w-[92px]" onChange={(v) => v && patch("analysis", { minViewport: v })} />
      <span className="text-subtle-foreground">–</span>
      <NumberInput label="Analysis range maximum viewport" value={a.maxViewport} min={VIEWPORT_MIN} max={VIEWPORT_MAX} suffix="px" digits={0} className="w-[92px]" onChange={(v) => v && patch("analysis", { maxViewport: v })} />
    </div>
  );
}

export function CroppingChart() {
  const config = useAnalyticsConfig();
  const live = useSimulatorStore((s) => s.config);
  const patch = useSimulatorStore((s) => s.patch);
  const { original } = useSourceImage();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [adding, setAdding] = useState("");
  const a = live.analysis;
  const ratios = a.compareRatios;
  const colorOf = useStableSlots(ratios);

  const data = useMemo(
    () => computeSeries(config, original, config.analysis.compareRatios, config.analysis.chartMetric),
    [config, original],
  );
  const metric = config.analysis.chartMetric;
  const isPct = metric === "cropped" || metric === "visible" || metric === "coverage";
  const lo = Math.min(a.minViewport, a.maxViewport);
  const hi = Math.max(a.minViewport, a.maxViewport);

  const addRatio = (r: string) => {
    if (!parseRatio(r) || ratios.includes(r) || ratios.length >= MAX_SERIES) return;
    patch("analysis", { compareRatios: [...ratios, r] });
    setAdding("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>Metric</Label>
          <Segmented<ChartMetric>
            label="Chart metric"
            size="sm"
            value={a.chartMetric}
            onChange={(chartMetric) => patch("analysis", { chartMetric })}
            className="w-[min(520px,90vw)]"
            options={(Object.keys(METRIC_LABELS) as ChartMetric[]).map((m) => ({ value: m, label: METRIC_LABELS[m].short, tooltip: METRIC_LABELS[m].label }))}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label>Viewport range</Label>
            <AnalysisRangeControls />
          </div>
          <Segmented
            label="Chart or table"
            size="sm"
            value={view}
            onChange={setView}
            className="w-[76px]"
            options={[
              { value: "chart", label: <LineIcon className="size-3.5" />, ariaLabel: "Chart view" },
              { value: "table", label: <Table2 className="size-3.5" />, ariaLabel: "Table view" },
            ]}
          />
        </div>
      </div>

      {/* Legend doubles as the series editor. */}
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Compared aspect ratios">
        {ratios.map((r) => (
          <span key={r} className="num inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface pl-2 pr-1 text-xs">
            <span className="h-0.5 w-3 rounded-full" style={{ background: colorOf(r) }} aria-hidden />
            {r}
            {r === live.image.aspectRatio && <span className="text-[10px] text-accent-text">current</span>}
            <button
              type="button"
              aria-label={`Remove ${r}`}
              onClick={() => patch("analysis", { compareRatios: ratios.filter((x) => x !== r) })}
              className="rounded p-0.5 text-subtle-foreground hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {ratios.length < MAX_SERIES && (
          <div className="flex items-center gap-1">
            <NativeSelect
              label="Add aspect ratio"
              className="w-[120px] [&_select]:h-7 [&_select]:text-xs"
              value={adding}
              onChange={(v) => addRatio(v)}
              options={[{ value: "", label: "Add ratio…" }, ...ALL_ASPECT_RATIO_PRESETS.filter((p) => !ratios.includes(p.label)).map((p) => ({ value: p.label, label: p.label }))]}
            />
            {live.image.aspectRatio !== "native" && !ratios.includes(live.image.aspectRatio) && (
              <Button size="sm" variant="ghost" onClick={() => addRatio(live.image.aspectRatio)}>
                <Plus /> Current
              </Button>
            )}
          </div>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">Up to {MAX_SERIES} ratios · uses your full container, fit and position settings</span>
      </div>

      {view === "chart" ? (
        <div className="h-[320px] w-full" role="img" aria-label={`${METRIC_LABELS[metric].label} by viewport width for ${ratios.join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="vw"
                type="number"
                domain={[lo, hi]}
                tickFormatter={(v) => `${v}`}
                tick={{ fill: "var(--subtle-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                stroke="var(--border-strong)"
                tickLine={false}
                unit="px"
              />
              <YAxis
                domain={isPct ? [0, 100] : ["auto", "auto"]}
                tickFormatter={(v) => (isPct ? `${v}%` : metric === "scale" ? `${fmt(v, 2)}×` : `${fmt(v, 0)}`)}
                tick={{ fill: "var(--subtle-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                stroke="transparent"
                tickLine={false}
                width={56}
              />
              {BREAKPOINT_MARKERS.filter((b) => b.width > lo && b.width < hi).map((b) => (
                <ReferenceLine
                  key={b.width}
                  x={b.width}
                  stroke="var(--border-strong)"
                  strokeDasharray="3 3"
                  label={{ value: b.label, position: "top", fill: "var(--subtle-foreground)", fontSize: 10 }}
                />
              ))}
              {live.viewport.width >= lo && live.viewport.width <= hi && (
                <ReferenceLine
                  x={live.viewport.width}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  label={{ value: `${live.viewport.width}px`, position: "insideTopRight", fill: "var(--accent-text)", fontSize: 10 }}
                />
              )}
              <ChartTooltip
                cursor={{ stroke: "var(--guide)", strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border border-border bg-panel px-3 py-2 text-xs shadow-xl">
                      <div className="num mb-1 font-medium text-foreground">{label}px viewport</div>
                      {[...payload]
                        .sort((x, y) => Number(y.value) - Number(x.value))
                        .map((p) => (
                          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="h-0.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                              <span className="num">{String(p.dataKey)}</span>
                            </span>
                            <span className="num text-foreground">{formatValue(Number(p.value), metric)}</span>
                          </div>
                        ))}
                    </div>
                  ) : null
                }
              />
              {ratios.map((r) => (
                <Line
                  key={r}
                  type="linear"
                  dataKey={r}
                  stroke={colorOf(r)}
                  strokeWidth={r === live.image.aspectRatio ? 2.5 : 2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--panel)" }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <SeriesTable data={data} ratios={ratios} metric={metric} />
      )}
    </div>
  );
}

function SeriesTable({ data, ratios, metric }: { data: ReturnType<typeof computeSeries>; ratios: string[]; metric: ChartMetric }) {
  const step = Math.max(1, Math.floor(data.length / 24));
  const rows = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  return (
    <div className="max-h-[320px] overflow-auto rounded-md border border-border scrollbar-thin">
      <table className="num w-full text-xs">
        <caption className="sr-only">{METRIC_LABELS[metric].label} by viewport width</caption>
        <thead className="sticky top-0 bg-panel">
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Viewport</th>
            {ratios.map((r) => (
              <th key={r} className="px-3 py-2 text-right font-medium">
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.vw} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-1.5 text-muted-foreground">{row.vw}px</td>
              {ratios.map((r) => (
                <td key={r} className={cn("px-3 py-1.5 text-right")}>
                  {formatValue(row[r], metric)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
