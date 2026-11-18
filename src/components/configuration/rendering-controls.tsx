"use client";

import { RotateCcw, Crosshair, X } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { OBJECT_FIT_DESCRIPTIONS } from "@/lib/geometry/object-fit";
import { getSample } from "@/lib/assets/sample-images";
import { Label, NumberInput, Segmented, Slider, SwitchRow } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/hooks/use-simulator";
import { cn, fmt } from "@/lib/utils";
import type { ObjectFit } from "@/types/simulator";

export function ObjectFitSelector() {
  const fit = useSimulatorStore((s) => s.config.rendering.objectFit);
  const patch = useSimulatorStore((s) => s.patch);
  return (
    <div className="space-y-2">
      <Segmented<ObjectFit>
        label="Object fit"
        value={fit}
        columns={3}
        onChange={(objectFit) => patch("rendering", { objectFit })}
        options={(["cover", "contain", "fill", "none", "scale-down"] as const).map((v) => ({
          value: v,
          label: v,
          tooltip: OBJECT_FIT_DESCRIPTIONS[v],
        }))}
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">{OBJECT_FIT_DESCRIPTIONS[fit]}</p>
    </div>
  );
}

const GRID: Array<[number, number, string]> = [
  [0, 0, "Top left"],
  [0.5, 0, "Top center"],
  [1, 0, "Top right"],
  [0, 0.5, "Center left"],
  [0.5, 0.5, "Center"],
  [1, 0.5, "Center right"],
  [0, 1, "Bottom left"],
  [0.5, 1, "Bottom center"],
  [1, 1, "Bottom right"],
];

export function ObjectPositionControl() {
  const r = useSimulatorStore((s) => s.config.rendering);
  const keep = useSimulatorStore((s) => s.config.image.keepFocalCentered && s.config.image.focalPoint != null);
  const patch = useSimulatorStore((s) => s.patch);
  const sim = useSimulation();
  const set = (x: number, y: number) =>
    patch("rendering", { objectPositionX: Math.min(1, Math.max(0, x)), objectPositionY: Math.min(1, Math.max(0, y)) });
  const applied = sim.position;

  return (
    <div className={cn("space-y-3", keep && "opacity-60")}>
      <div className="flex gap-3">
        <div role="radiogroup" aria-label="Object position presets" className="grid size-[84px] shrink-0 grid-cols-3 gap-1 rounded-md border border-border bg-surface p-1">
          {GRID.map(([x, y, label]) => {
            const active = Math.abs(r.objectPositionX - x) < 1e-3 && Math.abs(r.objectPositionY - y) < 1e-3;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={label}
                title={label}
                disabled={keep}
                onClick={() => set(x, y)}
                className="group flex items-center justify-center rounded-sm hover:bg-surface-hover"
              >
                <span className={cn("size-2 rounded-full transition-colors", active ? "bg-accent" : "bg-border-strong group-hover:bg-muted-foreground")} />
              </button>
            );
          })}
        </div>
        <div className="flex-1 space-y-2.5">
          {(["x", "y"] as const).map((axis) => {
            const value = axis === "x" ? r.objectPositionX : r.objectPositionY;
            return (
              <div key={axis} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{axis === "x" ? "Horizontal" : "Vertical"}</span>
                  <NumberInput
                    label={`${axis === "x" ? "Horizontal" : "Vertical"} position percent`}
                    value={value * 100}
                    min={0}
                    max={100}
                    suffix="%"
                    digits={1}
                    className="w-[72px] [&_input]:h-6 [&_input]:text-[11px]"
                    onChange={(v) => v != null && (axis === "x" ? set(v / 100, r.objectPositionY) : set(r.objectPositionX, v / 100))}
                  />
                </div>
                <Slider
                  label={`${axis === "x" ? "Horizontal" : "Vertical"} object position`}
                  min={0}
                  max={100}
                  step={0.5}
                  value={value * 100}
                  onChange={(v) => (axis === "x" ? set(v / 100, r.objectPositionY) : set(r.objectPositionX, v / 100))}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <code className="num text-[11px] text-muted-foreground">
          object-position: {fmt(applied.x * 100, 1)}% {fmt(applied.y * 100, 1)}%
        </code>
        <Button size="sm" variant="ghost" onClick={() => set(0.5, 0.5)} disabled={keep}>
          <RotateCcw /> Center
        </Button>
      </div>
      {keep && <p className="text-[11px] text-accent-text">Position is driven by the focal point.</p>}
    </div>
  );
}

export function FocalPointControl() {
  const image = useSimulatorStore((s) => s.config.image);
  const picking = useSimulatorStore((s) => s.focalPicking);
  const setPicking = useSimulatorStore((s) => s.setFocalPicking);
  const patch = useSimulatorStore((s) => s.patch);
  const sim = useSimulation();
  const fp = image.focalPoint;

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={picking ? "primary" : "secondary"}
          className="flex-1"
          aria-pressed={picking}
          onClick={() => {
            setPicking(!picking);
            if (!picking) useSimulatorStore.getState().patch("workspace", { view: useSimulatorStore.getState().config.workspace.view === "component" ? "split" : useSimulatorStore.getState().config.workspace.view });
          }}
        >
          <Crosshair /> {picking ? "Click the original image…" : fp ? "Move focal point" : "Set focal point"}
        </Button>
        {image.source === "sample" && !getSample(image.sampleId).generated && (
          <Button size="sm" variant="ghost" onClick={() => patch("image", { focalPoint: getSample(image.sampleId).focal })}>
            Suggest
          </Button>
        )}
        {fp && (
          <Button size="icon-sm" variant="ghost" aria-label="Clear focal point" onClick={() => patch("image", { focalPoint: null, keepFocalCentered: false })}>
            <X />
          </Button>
        )}
      </div>
      {fp && (
        <>
          <p className="num text-[11px] text-muted-foreground">
            Focal point {fmt(fp.x * 100)}%, {fmt(fp.y * 100)}% of original ·{" "}
            <span className={sim.focalVisible ? "text-visible-text" : "text-danger-text"}>
              {!sim.focalInSource ? "removed by source crop" : sim.focalVisible ? "visible" : "cropped out"}
            </span>
          </p>
          <SwitchRow
            label="Keep focal point centered"
            hint="Computes object-position so the focal point sits as close to the container center as possible, clamped to valid bounds. Focal coordinates and object-position are separate values."
            checked={image.keepFocalCentered}
            onChange={(keepFocalCentered) => patch("image", { keepFocalCentered })}
          />
        </>
      )}
    </div>
  );
}

export function OverlayControls() {
  const o = useSimulatorStore((s) => s.config.overlay);
  const patch = useSimulatorStore((s) => s.patch);
  const set = (p: Partial<typeof o>) => patch("overlay", p);
  return (
    <div className="space-y-3">
      <SwitchRow label="Show content overlay" checked={o.enabled} onChange={(enabled) => set({ enabled })} />
      {o.enabled && (
        <>
          <input
            aria-label="Heading text"
            value={o.heading}
            onChange={(e) => set({ heading: e.target.value })}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[13px]"
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <SwitchRow label="Description" checked={o.showDescription} onChange={(showDescription) => set({ showDescription })} />
            <SwitchRow label="Badge" checked={o.showBadge} onChange={(showBadge) => set({ showBadge })} />
            <SwitchRow label="Primary CTA" checked={o.showPrimaryCta} onChange={(showPrimaryCta) => set({ showPrimaryCta })} />
            <SwitchRow label="Secondary" checked={o.showSecondaryCta} onChange={(showSecondaryCta) => set({ showSecondaryCta })} />
            <SwitchRow label="Logo" checked={o.showLogo} onChange={(showLogo) => set({ showLogo })} />
          </div>
          <div className="space-y-1.5">
            <Label>Scrim</Label>
            <Segmented
              label="Scrim"
              size="sm"
              value={o.scrim}
              onChange={(scrim) => set({ scrim })}
              options={[
                { value: "none", label: "None" },
                { value: "gradient", label: "Gradient" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
          {o.scrim === "gradient" && (
            <Segmented
              label="Gradient direction"
              size="sm"
              value={o.gradientDirection}
              onChange={(gradientDirection) => set({ gradientDirection })}
              options={[
                { value: "to-top", label: "↑", ariaLabel: "To top" },
                { value: "to-bottom", label: "↓", ariaLabel: "To bottom" },
                { value: "to-left", label: "←", ariaLabel: "To left" },
                { value: "to-right", label: "→", ariaLabel: "To right" },
              ]}
            />
          )}
          <div className="space-y-1">
            <Label aside={<span className="num text-[11px]">{Math.round(o.opacity * 100)}%</span>}>Overlay opacity</Label>
            <Slider label="Overlay opacity" min={0} max={1} step={0.01} value={o.opacity} onChange={(opacity) => set({ opacity })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Align X</Label>
              <Segmented label="Horizontal content alignment" size="sm" value={o.alignX} onChange={(alignX) => set({ alignX })} options={[{ value: "start", label: "L" }, { value: "center", label: "C" }, { value: "end", label: "R" }]} />
            </div>
            <div className="space-y-1.5">
              <Label>Align Y</Label>
              <Segmented label="Vertical content alignment" size="sm" value={o.alignY} onChange={(alignY) => set({ alignY })} options={[{ value: "start", label: "T" }, { value: "center", label: "M" }, { value: "end", label: "B" }]} />
            </div>
            <div className="space-y-1.5">
              <Label>Padding</Label>
              <NumberInput label="Content padding" value={o.padding} min={0} max={400} suffix="px" onChange={(v) => v != null && set({ padding: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Max width</Label>
              <NumberInput label="Content max width" value={o.maxContentWidth} min={1} max={4000} suffix="px" onChange={(v) => v && set({ maxContentWidth: v })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="text-color">Text color</Label>
            <input id="text-color" type="color" value={o.textColor.slice(0, 7)} onChange={(e) => set({ textColor: e.target.value })} className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5" />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Prefer real HTML text over text baked into images: it reflows, stays crisp and is accessible.
          </p>
        </>
      )}
    </div>
  );
}
