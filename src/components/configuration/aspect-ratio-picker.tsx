"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import {
  ASPECT_RATIO_CATEGORIES,
  QUICK_RATIOS,
  formatDecimal,
  invertRatio,
  normalizeRatio,
  parseRatio,
} from "@/lib/assets/aspect-ratios";
import { Label, NumberInput, Segmented } from "@/components/ui/controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Tooltip } from "@/components/ui/tooltip";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { cn } from "@/lib/utils";
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
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">The test image is generated natively at this ratio.</p>
      )}
    </div>
  );
}
