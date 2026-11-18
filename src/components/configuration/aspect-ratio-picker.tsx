"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, ChevronDown, Crosshair, RotateCcw } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import {
  ASPECT_RATIO_CATEGORIES,
  QUICK_RATIOS,
  formatDecimal,
  invertRatio,
  normalizeRatio,
  parseRatio,
} from "@/lib/assets/aspect-ratios";
import { Label, NumberInput, Segmented, Slider } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { InfoButton } from "@/components/docs/info-button";
import { useSimulation } from "@/hooks/use-simulator";
import { cropPositionForFocalPoint } from "@/lib/geometry/effective-source";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Tooltip } from "@/components/ui/tooltip";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { cn, fmt } from "@/lib/utils";
import type { AspectRatioStrategy } from "@/types/simulator";

/** Ratio chooser used for both source and container ratios. */
export function RatioChooser({
  value,
  onChange,
  allowNative,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  allowNative?: boolean;
  label: string;
}) {
  const parsed = value === "native" ? null : parseRatio(value);
  const [w, setW] = useState<number | null>(parsed?.width ?? 16);
  const [h, setH] = useState<number | null>(parsed?.height ?? 9);
  // Keep the custom W:H fields in step with presets chosen elsewhere.
  useEffect(() => {
    if (!parsed) return;
    setW(parsed.width);
    setH(parsed.height);
  }, [parsed?.width, parsed?.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const quick = allowNative ? ["native", ...QUICK_RATIOS.slice(0, 5)] : QUICK_RATIOS;
  const isQuick = quick.includes(value);

  const chip = (r: string) => (
    <button
      key={r}
      type="button"
      role="radio"
      aria-checked={value === r}
      onClick={() => onChange(r)}
      className={cn(
        "num h-8 rounded-md border text-xs transition-colors",
        value === r
          ? "border-accent bg-accent-soft text-accent-text"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {r === "native" ? "Native" : r}
    </button>
  );

  const applyCustom = (nw: number | null, nh: number | null) => {
    if (nw && nh && nw > 0 && nh > 0) onChange(`${nw}:${nh}`);
  };

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5">
        {quick.map(chip)}
      </div>
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger
            className={cn(
              "num flex h-8 flex-1 items-center justify-between rounded-md border px-2.5 text-xs transition-colors",
              !isQuick ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {!isQuick ? value : "All ratios"}
            <ChevronDown className="size-3" aria-hidden />
          </PopoverTrigger>
          <PopoverContent className="w-[300px] space-y-3" align="start" side="right">
            {ASPECT_RATIO_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">{cat.label}</div>
                <div role="radiogroup" aria-label={`${cat.label} ratios`} className="grid grid-cols-4 gap-1">
                  {cat.presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      role="radio"
                      aria-checked={value === p.label}
                      onClick={() => onChange(p.label)}
                      className={cn(
                        "num h-7 rounded border text-[11px]",
                        value === p.label
                          ? "border-accent bg-accent-soft text-accent-text"
                          : "border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>
        <Tooltip content="Invert ratio">
          <button
            type="button"
            aria-label="Invert aspect ratio"
            disabled={value === "native"}
            onClick={() => onChange(invertRatio(value))}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeftRight className="size-3.5" />
          </button>
        </Tooltip>
      </div>
      <div className="flex items-center gap-1.5">
        <NumberInput label="Custom ratio width" value={w} min={0.01} max={100000} onChange={(v) => { setW(v); applyCustom(v, h); }} placeholder="W" />
        <span className="text-subtle-foreground">:</span>
        <NumberInput label="Custom ratio height" value={h} min={0.01} max={100000} onChange={(v) => { setH(v); applyCustom(w, v); }} placeholder="H" />
      </div>
      {parsed && (
        <p className="num text-[11px] text-muted-foreground">
          {normalizeRatio(parsed.width, parsed.height)} · {formatDecimal(parsed.value, 4)}:1 ·{" "}
          {parsed.value < 1 ? "portrait" : parsed.value > 1 ? "landscape" : "square"}
        </p>
      )}
    </div>
  );
}

/**
 * Chooses which region of the original becomes the cropped source asset.
 * Only axes with room to move get a slider.
 */
function SourceCropPosition() {
  const image = useSimulatorStore((s) => s.config.image);
  const patch = useSimulatorStore((s) => s.patch);
  const sim = useSimulation();
  const { original, effective } = sim;
  const slackX = original.width - effective.sourceRect.width;
  const slackY = original.height - effective.sourceRect.height;
  const ratio = effective.sourceRect.width / effective.sourceRect.height;
  const set = (p: Partial<{ sourceCropX: number; sourceCropY: number }>) => patch("image", p);
  const axes = [
    { key: "sourceCropX" as const, label: "Horizontal", slack: slackX, value: image.sourceCropX, start: effective.sourceRect.x },
    { key: "sourceCropY" as const, label: "Vertical", slack: slackY, value: image.sourceCropY, start: effective.sourceRect.y },
  ].filter((a) => a.slack > 0.5);

  if (axes.length === 0) return null;
  return (
    <div className="space-y-2.5 rounded-md border border-border p-2.5" data-testid="source-crop-position">
      <Label aside={<InfoButton topic="crop-area" />} hint="Which part of the original is kept when cropping to this ratio. Drag the dashed box in the cropping preview, or use the slider. This is separate from object-position, which crops again inside the container.">
        Crop area
      </Label>
      {axes.map((a) => (
        <div key={a.key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {a.label} <span className="num text-subtle-foreground">· {fmt(a.start, 0)}px from {a.key === "sourceCropX" ? "left" : "top"}</span>
            </span>
            <NumberInput
              label={`${a.label} crop area position percent`}
              value={a.value * 100}
              min={0}
              max={100}
              suffix="%"
              digits={1}
              className="w-[72px] [&_input]:h-6 [&_input]:text-[11px]"
              onChange={(v) => v != null && set({ [a.key]: v / 100 })}
            />
          </div>
          <Slider
            label={`${a.label} crop area position`}
            min={0}
            max={100}
            step={0.5}
            value={a.value * 100}
            onChange={(v) => set({ [a.key]: v / 100 })}
          />
        </div>
      ))}
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => set({ sourceCropX: 0.5, sourceCropY: 0.5 })}>
          <RotateCcw /> Center
        </Button>
        {image.focalPoint && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const p = cropPositionForFocalPoint(image.focalPoint!, original.width, original.height, ratio);
              set({ sourceCropX: Math.round(p.x * 1000) / 1000, sourceCropY: Math.round(p.y * 1000) / 1000 });
            }}
          >
            <Crosshair /> Align to focal point
          </Button>
        )}
      </div>
    </div>
  );
}

export function AspectRatioPicker() {
  const image = useSimulatorStore((s) => s.config.image);
  const patch = useSimulatorStore((s) => s.patch);
  const source = useSourceImage();
  const native = source.original.width / source.original.height;

  return (
    <div className="space-y-3">
      <RatioChooser
        label="Source image aspect ratio"
        allowNative
        value={image.aspectRatio}
        onChange={(aspectRatio) =>
          patch("image", {
            aspectRatio,
            // Selecting a preset for a photograph defaults to cropping, never stretching.
            aspectRatioStrategy: aspectRatio === "native" ? image.aspectRatioStrategy : image.aspectRatioStrategy === "native" ? "crop" : image.aspectRatioStrategy,
          })
        }
      />
      {image.source !== "test" ? (
        <div className="space-y-1.5">
          <Label hint="How the source asset is produced at the selected ratio. This happens before the component crops anything, and is reported separately.">
            Source sizing
          </Label>
          <Segmented<AspectRatioStrategy>
            label="Source sizing strategy"
            size="sm"
            value={image.aspectRatio === "native" ? "native" : image.aspectRatioStrategy}
            onChange={(aspectRatioStrategy) => patch("image", { aspectRatioStrategy, ...(aspectRatioStrategy === "native" ? { aspectRatio: "native" } : {}) })}
            options={[
              { value: "native", label: "Native", tooltip: `Use the original unchanged (${formatDecimal(native, 3)}:1)` },
              { value: "crop", label: "Crop", tooltip: "Create the source asset by cropping the original" },
              { value: "distort", label: "Distort", tooltip: "Stretch the original to the ratio — distorts the image" },
            ]}
          />
          {image.aspectRatioStrategy === "distort" && image.aspectRatio !== "native" && (
            <p className="text-[11px] text-warning-text">Distortion mode: the photograph is stretched, not cropped.</p>
          )}
          {image.aspectRatioStrategy === "crop" && image.aspectRatio !== "native" && <SourceCropPosition />}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">The test image is generated natively at this ratio.</p>
      )}
    </div>
  );
}
