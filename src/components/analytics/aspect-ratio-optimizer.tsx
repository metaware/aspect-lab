"use client";

import { useMemo } from "react";
import { Plus, Trash2, Sigma, Info } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { useAnalyticsConfig } from "@/hooks/use-simulator";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { recommendForBreakpoints } from "@/lib/optimization/aspect-ratio-optimizer";
import { formatDecimal, closestPreset } from "@/lib/assets/aspect-ratios";
import { VIEWPORT_MAX, VIEWPORT_MIN } from "@/lib/configuration/defaults";
import { Label, NativeSelect, NumberInput } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { cn, fmtPct } from "@/lib/utils";
import type { OptimizationStrategy } from "@/types/simulator";

const STRATEGIES: Array<{ value: OptimizationStrategy; label: string }> = [
  { value: "worst-case", label: "Minimize worst-case cropping" },
  { value: "average", label: "Minimize average cropping" },
  { value: "preferred", label: "Optimize for a preferred viewport" },
  { value: "fewest-assets", label: "Minimize number of assets" },
];

export function BreakpointEditor() {
  const breakpoints = useSimulatorStore((s) => s.config.analysis.breakpoints);
  const patch = useSimulatorStore((s) => s.patch);
  const update = (id: string, p: Partial<{ min: number; max: number }>) =>
    patch("analysis", { breakpoints: breakpoints.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {breakpoints.map((b) => (
        <div key={b.id} className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          <NumberInput label="Breakpoint minimum" value={b.min} min={VIEWPORT_MIN} max={VIEWPORT_MAX} digits={0} className="w-[64px] [&_input]:h-6 [&_input]:px-1.5 [&_input]:text-xs" onChange={(v) => v && update(b.id, { min: v })} />
          <span className="text-subtle-foreground">–</span>
          <NumberInput label="Breakpoint maximum" value={b.max} min={VIEWPORT_MIN} max={VIEWPORT_MAX} digits={0} className="w-[64px] [&_input]:h-6 [&_input]:px-1.5 [&_input]:text-xs" onChange={(v) => v && update(b.id, { max: v })} />
          <button
            type="button"
            aria-label={`Remove ${b.min}–${b.max} breakpoint`}
            disabled={breakpoints.length <= 1}
            onClick={() => patch("analysis", { breakpoints: breakpoints.filter((x) => x.id !== b.id) })}
            className="rounded p-1 text-subtle-foreground hover:text-danger-text disabled:opacity-30"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      {breakpoints.length < 12 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const last = [...breakpoints].sort((x, y) => x.max - y.max).at(-1);
            const min = Math.min(VIEWPORT_MAX - 1, (last?.max ?? 1919) + 1);
            patch("analysis", {
              breakpoints: [...breakpoints, { id: `bp-${Date.now().toString(36)}`, min, max: Math.min(VIEWPORT_MAX, min + 639) }],
            });
          }}
        >
          <Plus /> Range
        </Button>
      )}
    </div>
  );
}

function Crop({ v }: { v: number }) {
  return <span className={cn("num", v >= 50 ? "text-danger-text" : v >= 25 ? "text-warning-text" : "")}>{fmtPct(v)}</span>;
}

export function AspectRatioOptimizer() {
  const config = useAnalyticsConfig(220);
  const live = useSimulatorStore((s) => s.config.analysis);
  const patch = useSimulatorStore((s) => s.patch);
  const { original } = useSourceImage();
  const recs = useMemo(() => recommendForBreakpoints(config, original), [config, original]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[260px] space-y-1.5">
          <Label>Optimization strategy</Label>
          <NativeSelect label="Optimization strategy" value={live.strategy} onChange={(strategy) => patch("analysis", { strategy })} options={STRATEGIES} />
        </div>
        {live.strategy === "preferred" && (
          <div className="w-[120px] space-y-1.5">
            <Label>Preferred viewport</Label>
            <NumberInput label="Preferred viewport" value={live.preferredViewport} min={VIEWPORT_MIN} max={VIEWPORT_MAX} suffix="px" digits={0} onChange={(v) => v && patch("analysis", { preferredViewport: v })} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Breakpoint ranges</Label>
          <BreakpointEditor />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border scrollbar-thin">
        <table className="w-full min-w-[880px] text-[13px]">
          <caption className="sr-only">Aspect ratio recommendations per breakpoint range</caption>
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-subtle-foreground">
              <th className="px-3 py-2 font-medium">Range</th>
              <th className="px-3 py-2 font-medium">Current ratio · min / avg / max</th>
              <th className="px-3 py-2 font-medium">Mathematical optimum</th>
              <th className="px-3 py-2 font-medium">Recommended standard · min / avg / max</th>
              <th className="px-3 py-2 text-right font-medium">Asset @{config.analysis.devicePixelRatio}×</th>
            </tr>
          </thead>
          <tbody>
            {recs.map((r) => (
              <tr key={r.range.id} className="border-b border-border last:border-0">
                <td className="num px-3 py-2.5 text-muted-foreground">
                  {r.range.min}–{r.range.max}px
                </td>
                <td className="num px-3 py-2.5">
                  <Crop v={r.current.min} /> / <Crop v={r.current.average} /> / <Crop v={r.current.max} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="num flex items-center gap-1.5">
                    {r.closedForm && <Sigma className="size-3 text-accent-text" aria-label="Closed-form result" />}
                    {formatDecimal(r.optimal.ratio, 3)}:1
                    <span className="text-[11px] text-subtle-foreground">≈ {closestPreset(r.optimal.ratio).label}</span>
                  </div>
                  <div className="num text-[11px] text-muted-foreground">worst {fmtPct(r.optimal.max)} · avg {fmtPct(r.optimal.average)}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="num mr-2 inline-flex h-6 items-center rounded-md bg-accent-soft px-2 text-xs font-medium text-accent-text">{r.standard.label}</span>
                  <span className="num">
                    <Crop v={r.standard.min} /> / <Crop v={r.standard.average} /> / <Crop v={r.standard.max} />
                  </span>
                </td>
                <td className="num px-3 py-2.5 text-right">
                  {r.assetSize.width} × {r.assetSize.height}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 rounded-md bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          <span className="text-foreground">Mathematical, not artistic.</span> For fixed-height, full-width cover containers
          the worst-case optimum is exact: √(min × max) ÷ height (<Sigma className="inline size-3" aria-label="sigma" />). Other
          modes are evaluated numerically across the range. Standard ratios are ranked by actual cropping. Minimizing
          cropping can&apos;t guarantee your subject stays in frame — check the safe zone and focal point.
        </p>
      </div>
    </div>
  );
}
