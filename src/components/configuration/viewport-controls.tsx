"use client";

import { useSimulatorStore } from "@/store/simulator-store";
import { VIEWPORT_PRESETS, PRESET_HEIGHTS } from "@/lib/assets/device-presets";
import { VIEWPORT_MAX, VIEWPORT_MIN } from "@/lib/configuration/defaults";
import { Label, NativeSelect, NumberInput, Slider } from "@/components/ui/controls";

/** Slider on a log scale so 320–3840 stays precise at mobile widths. */
const toSlider = (w: number) => Math.log(w / VIEWPORT_MIN) / Math.log(VIEWPORT_MAX / VIEWPORT_MIN);
const fromSlider = (t: number) => Math.round(VIEWPORT_MIN * Math.pow(VIEWPORT_MAX / VIEWPORT_MIN, t));

export function ViewportControls() {
  const viewport = useSimulatorStore((s) => s.config.viewport);
  const heightMode = useSimulatorStore((s) => s.config.container.heightMode);
  const patch = useSimulatorStore((s) => s.patch);
  const setWidth = (width: number) => patch("viewport", { width: Math.min(VIEWPORT_MAX, Math.max(VIEWPORT_MIN, Math.round(width))) });
  const presetValue = VIEWPORT_PRESETS.some((g) => g.widths.includes(viewport.width)) ? String(viewport.width) : "";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="vw-input" aside={<span className="num text-[13px] text-foreground">{viewport.width}px</span>}>
          Viewport width
        </Label>
        <Slider
          label="Viewport width"
          min={0}
          max={1}
          step={0.0005}
          value={toSlider(viewport.width)}
          onChange={(t) => setWidth(fromSlider(t))}
        />
        <div className="flex gap-1.5">
          <NumberInput
            id="vw-input"
            label="Viewport width in pixels"
            value={viewport.width}
            min={VIEWPORT_MIN}
            max={VIEWPORT_MAX}
            step={1}
            suffix="px"
            stepper
            digits={0}
            onChange={(v) => v != null && setWidth(v)}
            className="flex-1"
          />
        </div>
        <NativeSelect
          label="Viewport preset"
          value={presetValue as string}
          onChange={(v) => {
            if (!v) return;
            const w = Number(v);
            patch("viewport", { width: w, height: PRESET_HEIGHTS[w] ?? viewport.height });
          }}
          options={[
            { value: "", label: "Device presets…" },
            ...VIEWPORT_PRESETS.flatMap((g) =>
              g.widths.map((w) => ({ value: String(w), label: `${w}px${g.boundary ? " (boundary)" : ""}`, group: g.label })),
            ),
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="vh-input" hint="Used by viewport-relative height units (vh, svh, dvh, lvh).">
            Viewport height
          </Label>
          <NumberInput id="vh-input" label="Viewport height" value={viewport.height} min={200} max={4000} suffix="px" digits={0} onChange={(v) => v && patch("viewport", { height: v })} />
        </div>
        {heightMode === "viewport" && (
          <div className="space-y-1.5">
            <Label htmlFor="chrome-input" hint="Simulated browser UI. svh and dvh subtract it; vh and lvh do not.">
              Browser UI
            </Label>
            <NumberInput id="chrome-input" label="Simulated browser UI height" value={viewport.browserChrome} min={0} max={400} suffix="px" digits={0} onChange={(v) => v != null && patch("viewport", { browserChrome: v })} />
          </div>
        )}
      </div>
    </div>
  );
}
