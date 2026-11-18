"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { usePreviewModel } from "@/hooks/use-preview-model";
import { cropSeverity } from "@/lib/geometry/cropping";
import { ALL_ASPECT_RATIO_PRESETS } from "@/lib/assets/aspect-ratios";
import { VIEWPORT_MAX, VIEWPORT_MIN } from "@/lib/configuration/defaults";
import { NativeSelect, NumberInput, Segmented, Label } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { cn, fmt, fmtPct } from "@/lib/utils";
import type { ComparisonMode } from "@/types/simulator";
import { ComponentPreview } from "./component-preview";

const ZOOMS = [0.1, 0.2, 0.25, 0.33, 0.5];

function ComparisonCard({ viewportWidth, aspectRatio, zoom, label }: { viewportWidth?: number; aspectRatio?: string; zoom: number; label: string }) {
  const model = usePreviewModel({ viewportWidth, aspectRatio });
  const m = model.sim.metrics;
  const sev = cropSeverity(m.imageCroppedPercentage);
  return (
    <figure className="flex shrink-0 flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="num text-[13px] font-medium">{label}</span>
        <span
          className={cn(
            "num text-xs",
            sev === "severe" ? "text-danger-text" : sev === "moderate" ? "text-warning-text" : "text-visible-text",
          )}
        >
          {fmtPct(m.imageCroppedPercentage)} cropped
        </span>
      </figcaption>
      <ComponentPreview model={model} zoom={zoom} showOutline={false} showOverlay />
      <span className="num text-[11px] text-muted-foreground">
        {fmt(m.containerWidth)} × {fmt(m.containerHeight)}
        {m.emptySpacePercentage > 0.05 && ` · ${fmtPct(m.emptySpacePercentage)} empty`}
      </span>
    </figure>
  );
}

export function ViewportComparison() {
  const a = useSimulatorStore((s) => s.config.analysis);
  const vw = useSimulatorStore((s) => s.config.viewport.width);
  const patch = useSimulatorStore((s) => s.patch);
  const [zoom, setZoom] = useState(0.25);
  const [newWidth, setNewWidth] = useState<number | null>(null);

  const widths = [...a.comparisonWidths].sort((x, y) => x - y);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>Compare</Label>
          <Segmented<ComparisonMode>
            label="Comparison mode"
            size="sm"
            className="w-[320px]"
            value={a.comparisonMode}
            onChange={(comparisonMode) => patch("analysis", { comparisonMode })}
            options={[
              { value: "viewports", label: "Viewport widths" },
              { value: "ratios", label: `Ratios at ${vw}px` },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Shared zoom</Label>
          <Segmented
            label="Comparison zoom"
            size="sm"
            className="w-[240px]"
            value={String(zoom)}
            onChange={(v) => setZoom(Number(v))}
            options={ZOOMS.map((z) => ({ value: String(z), label: `${Math.round(z * 100)}%` }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {a.comparisonMode === "viewports" ? (
          <>
            {widths.map((w) => (
              <span key={w} className="num inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface pl-2 pr-1 text-xs">
                {w}px
                <button type="button" aria-label={`Remove ${w}px`} onClick={() => patch("analysis", { comparisonWidths: a.comparisonWidths.filter((x) => x !== w) })} className="rounded p-0.5 text-subtle-foreground hover:text-foreground">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {a.comparisonWidths.length < 12 && (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newWidth && !a.comparisonWidths.includes(newWidth)) patch("analysis", { comparisonWidths: [...a.comparisonWidths, newWidth] });
                  setNewWidth(null);
                }}
              >
                <NumberInput label="Add comparison width" value={newWidth} allowEmpty placeholder="Width" min={VIEWPORT_MIN} max={VIEWPORT_MAX} digits={0} className="w-[84px] [&_input]:h-7" onChange={setNewWidth} />
                <Button type="submit" size="sm" variant="ghost">
                  <Plus /> Add
                </Button>
              </form>
            )}
          </>
        ) : (
          <>
            {a.comparisonRatios.map((r) => (
              <span key={r} className="num inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface pl-2 pr-1 text-xs">
                {r}
                <button type="button" aria-label={`Remove ${r}`} onClick={() => patch("analysis", { comparisonRatios: a.comparisonRatios.filter((x) => x !== r) })} className="rounded p-0.5 text-subtle-foreground hover:text-foreground">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {a.comparisonRatios.length < 8 && (
              <NativeSelect
                label="Add ratio to compare"
                className="w-[120px] [&_select]:h-7 [&_select]:text-xs"
                value=""
                onChange={(v) => v && patch("analysis", { comparisonRatios: [...a.comparisonRatios, v] })}
                options={[{ value: "", label: "Add ratio…" }, ...ALL_ASPECT_RATIO_PRESETS.filter((p) => !a.comparisonRatios.includes(p.label)).map((p) => ({ value: p.label, label: p.label }))]}
              />
            )}
          </>
        )}
      </div>

      <div className="canvas-dots overflow-x-auto rounded-lg border border-border scrollbar-thin" data-testid="comparison-strip">
        <div className="flex w-max items-start gap-10 p-8">
          {a.comparisonMode === "viewports"
            ? widths.map((w) => <ComparisonCard key={w} viewportWidth={w} zoom={zoom} label={`${w}px`} />)
            : a.comparisonRatios.map((r) => <ComparisonCard key={r} aspectRatio={r} zoom={zoom} label={r} />)}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        All previews share one zoom scale, so fixed-height components appear at identical heights.
      </p>
    </div>
  );
}
