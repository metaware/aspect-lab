"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { useAnalyticsConfig } from "@/hooks/use-simulator";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { planAssets } from "@/lib/optimization/asset-planner";
import { DEVICE_PIXEL_RATIOS } from "@/lib/assets/device-presets";
import { Label, NumberInput, Segmented, Slider } from "@/components/ui/controls";
import { cn, fmtPct } from "@/lib/utils";
import type { DevicePixelRatio, ImageFormat } from "@/types/simulator";
import { AnalysisRangeControls } from "./cropping-chart";
import { BreakpointEditor } from "./aspect-ratio-optimizer";

const FORMATS: ImageFormat[] = ["avif", "webp", "jpeg"];

export function AssetRecommendations() {
  const config = useAnalyticsConfig(220);
  const a = useSimulatorStore((s) => s.config.analysis);
  const patch = useSimulatorStore((s) => s.patch);
  const { original } = useSourceImage();
  const plan = useMemo(() => planAssets(config, original), [config, original]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label aside={<span className="num text-xs">{a.maxCropTolerance}%</span>}>Max acceptable cropping</Label>
          <Slider label="Maximum acceptable cropping" min={0} max={90} step={1} value={a.maxCropTolerance} onChange={(maxCropTolerance) => patch("analysis", { maxCropTolerance })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Max variants</Label>
            <NumberInput label="Maximum number of image variants" value={a.maxVariants} min={1} max={8} stepper digits={0} onChange={(v) => v && patch("analysis", { maxVariants: Math.round(v) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Target DPR</Label>
            <Segmented
              label="Target device pixel ratio"
              size="sm"
              value={String(a.devicePixelRatio)}
              onChange={(v) => patch("analysis", { devicePixelRatio: Number(v) as DevicePixelRatio })}
              options={DEVICE_PIXEL_RATIOS.map((d) => ({ value: String(d), label: `${d}×` }))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Formats</Label>
          <div className="flex gap-1.5" role="group" aria-label="Preferred image formats">
            {FORMATS.map((f) => {
              const on = a.formats.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? a.formats.filter((x) => x !== f) : FORMATS.filter((x) => x === f || a.formats.includes(x));
                    if (next.length) patch("analysis", { formats: next });
                  }}
                  className={cn(
                    "num h-8 rounded-md border px-2.5 text-xs uppercase",
                    on ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Viewport range</Label>
          <AnalysisRangeControls />
        </div>
        <div className="space-y-1.5">
          <Label hint="Asset boundaries snap to these ranges and to common CSS breakpoints.">Target breakpoints</Label>
          <BreakpointEditor />
        </div>
      </div>

      {plan.warnings.map((w) => (
        <p key={w} className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-[12px] leading-snug text-warning-text">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden /> {w}
        </p>
      ))}
      {plan.toleranceMet && (
        <p className="flex items-center gap-2 text-[12px] text-visible-text">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {plan.assets.length} asset{plan.assets.length === 1 ? "" : "s"} keep cropping ≤ {a.maxCropTolerance}% (worst {fmtPct(plan.worstCrop)}).
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border scrollbar-thin">
        <table className="w-full min-w-[640px] text-[13px]">
          <caption className="sr-only">Suggested responsive image assets</caption>
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-subtle-foreground">
              <th className="px-3 py-2 font-medium">Breakpoint</th>
              <th className="px-3 py-2 font-medium">Asset ratio</th>
              <th className="px-3 py-2 font-medium">Worst / avg crop</th>
              <th className="px-3 py-2 text-right font-medium">Minimum resolution @{plan.devicePixelRatio}×</th>
              <th className="px-3 py-2 text-right font-medium">Files</th>
            </tr>
          </thead>
          <tbody>
            {plan.assets.map((asset) => (
              <tr key={`${asset.min}-${asset.max}`} className="border-b border-border last:border-0">
                <td className="num px-3 py-2.5 text-muted-foreground">
                  {asset.min}–{asset.max}px
                </td>
                <td className="px-3 py-2.5">
                  <span className="num inline-flex h-6 items-center rounded-md bg-accent-soft px-2 text-xs font-medium text-accent-text">{asset.ratioLabel}</span>
                </td>
                <td className="num px-3 py-2.5">
                  <span className={cn(asset.worstCrop > a.maxCropTolerance && "text-warning-text")}>{fmtPct(asset.worstCrop)}</span>
                  <span className="text-muted-foreground"> / {fmtPct(asset.averageCrop)}</span>
                </td>
                <td className="num px-3 py-2.5 text-right">
                  {asset.size.width} × {asset.size.height}px
                </td>
                <td className="num px-3 py-2.5 text-right text-xs text-muted-foreground">{plan.formats.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Resolution = largest rendered image size across each range × DPR, rounded up at the asset&apos;s ratio. The Code tab&apos;s
        Picture output uses this plan for art direction.
      </p>
    </div>
  );
}
