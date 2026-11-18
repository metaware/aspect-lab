"use client";

import { useSimulatorStore } from "@/store/simulator-store";
import { Label, NativeSelect, NumberInput } from "@/components/ui/controls";
import { useSimulation } from "@/hooks/use-simulator";
import { fmt } from "@/lib/utils";
import type { HeightMode, ViewportUnit, WidthMode } from "@/types/simulator";
import { RatioChooser } from "./aspect-ratio-picker";

function Field({ label, children, hint, htmlFor }: { label: string; children: React.ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label hint={hint} htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ContainerWidthControls() {
  const c = useSimulatorStore((s) => s.config.container);
  const patch = useSimulatorStore((s) => s.patch);
  const set = (p: Partial<typeof c>) => patch("container", p);
  const sim = useSimulation();

  return (
    <div className="space-y-3">
      <NativeSelect<WidthMode>
        label="Container width mode"
        value={c.widthMode}
        onChange={(widthMode) => set({ widthMode })}
        options={[
          { value: "full", label: "Full width" },
          { value: "percent", label: "Percentage of viewport" },
          { value: "fixed", label: "Fixed width" },
          { value: "max", label: "Fluid with max width" },
          { value: "grid", label: "Grid column span" },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        {c.widthMode !== "fixed" && (
          <Field label="Gutter" hint="Horizontal padding on each side of the viewport.">
            <NumberInput label="Horizontal gutter per side" value={c.horizontalGutter} min={0} max={800} suffix="px" onChange={(v) => v != null && set({ horizontalGutter: v })} />
          </Field>
        )}
        {c.widthMode === "percent" && (
          <Field label="Width">
            <NumberInput label="Width percentage" value={c.widthPercent} min={1} max={100} suffix="%" onChange={(v) => v && set({ widthPercent: v })} />
          </Field>
        )}
        {c.widthMode === "fixed" && (
          <Field label="Width">
            <NumberInput label="Fixed width" value={c.fixedWidth} min={1} max={10000} suffix="px" onChange={(v) => v && set({ fixedWidth: v })} />
          </Field>
        )}
        {c.widthMode === "max" && (
          <Field label="Max width">
            <NumberInput label="Maximum width" value={c.maxWidth} min={1} max={10000} suffix="px" onChange={(v) => v && set({ maxWidth: v })} />
          </Field>
        )}
        {c.widthMode === "grid" && (
          <>
            <Field label="Columns">
              <NumberInput label="Grid columns" value={c.gridColumns} min={1} max={24} digits={0} onChange={(v) => v && set({ gridColumns: Math.round(v), gridSpan: Math.min(c.gridSpan, Math.round(v)) })} />
            </Field>
            <Field label="Span">
              <NumberInput label="Column span" value={c.gridSpan} min={1} max={c.gridColumns} digits={0} onChange={(v) => v && set({ gridSpan: Math.round(v) })} />
            </Field>
            <Field label="Gap">
              <NumberInput label="Column gap" value={c.gridGap} min={0} max={400} suffix="px" onChange={(v) => v != null && set({ gridGap: v })} />
            </Field>
          </>
        )}
      </div>
      <p className="num text-[11px] text-muted-foreground">
        Resolved width <span className="text-foreground">{fmt(sim.container.resolved.width)}px</span>
        {c.widthMode === "grid" && ` · ${c.gridSpan}/${c.gridColumns} columns`}
      </p>
    </div>
  );
}

const HEIGHT_MODES: Array<{ value: HeightMode; label: string; hint: string }> = [
  { value: "fixed", label: "Fixed", hint: "A set pixel height. Constant across viewport widths." },
  { value: "aspect", label: "Ratio", hint: "Height derived from width via a container aspect ratio, independent of the image ratio." },
  { value: "auto", label: "Auto", hint: "Height follows the source image's aspect ratio so the full image fits." },
  { value: "viewport", label: "Viewport", hint: "vh / svh / dvh / lvh of the simulated viewport (not your browser window)." },
  { value: "fluid", label: "Fluid", hint: "clamp(min, preferred vw, max)." },
  { value: "content", label: "Content", hint: "Simplified simulation: height grows with content height plus padding." },
];

export function ContainerHeightControls() {
  const c = useSimulatorStore((s) => s.config.container);
  const patch = useSimulatorStore((s) => s.patch);
  const set = (p: Partial<typeof c>) => patch("container", p);
  const sim = useSimulation();
  const { requested, resolved } = sim.container;
  const constrained = Math.abs(requested.width - resolved.width) > 0.01 || Math.abs(requested.height - resolved.height) > 0.01;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Container height mode" className="grid grid-cols-3 gap-1.5">
        {HEIGHT_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={c.heightMode === m.value}
            title={m.hint}
            onClick={() => set({ heightMode: m.value })}
            className={
              c.heightMode === m.value
                ? "h-8 rounded-md border border-accent bg-accent-soft text-xs text-accent-text"
                : "h-8 rounded-md border border-border bg-surface text-xs text-muted-foreground hover:border-border-strong hover:text-foreground"
            }
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{HEIGHT_MODES.find((m) => m.value === c.heightMode)?.hint}</p>

      {c.heightMode === "fixed" && (
        <NumberInput label="Container height" value={c.height} min={1} max={10000} suffix="px" stepper onChange={(v) => v && set({ height: v })} />
      )}
      {c.heightMode === "aspect" && (
        <RatioChooser label="Container aspect ratio" value={c.aspectRatio} onChange={(aspectRatio) => set({ aspectRatio })} />
      )}
      {c.heightMode === "viewport" && (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Viewport height value" value={c.viewportHeightValue} min={1} max={1000} onChange={(v) => v && set({ viewportHeightValue: v })} />
          <NativeSelect<ViewportUnit>
            label="Viewport unit"
            value={c.viewportUnit}
            onChange={(viewportUnit) => set({ viewportUnit })}
            options={[
              { value: "vh", label: "vh" },
              { value: "svh", label: "svh (small)" },
              { value: "dvh", label: "dvh (dynamic)" },
              { value: "lvh", label: "lvh (large)" },
            ]}
          />
          <p className="col-span-2 text-[11px] text-warning-text">Uses the simulated viewport height, not your browser window.</p>
        </div>
      )}
      {c.heightMode === "fluid" && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <Field label="Min">
              <NumberInput label="Minimum height" value={c.fluidMin} min={1} max={10000} onChange={(v) => v && set({ fluidMin: v })} />
            </Field>
            <Field label="vw">
              <NumberInput label="Preferred height in vw" value={c.fluidPreferredVw} min={1} max={1000} onChange={(v) => v && set({ fluidPreferredVw: v })} />
            </Field>
            <Field label="Max">
              <NumberInput label="Maximum height" value={c.fluidMax} min={1} max={10000} onChange={(v) => v && set({ fluidMax: v })} />
            </Field>
          </div>
          <code className="num block rounded-md bg-surface px-2 py-1.5 text-[11px] text-muted-foreground">
            height: clamp({c.fluidMin}px, {c.fluidPreferredVw}vw, {c.fluidMax}px);
          </code>
        </div>
      )}
      {c.heightMode === "content" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Content height">
            <NumberInput label="Content height" value={c.contentHeight} min={1} max={10000} suffix="px" onChange={(v) => v && set({ contentHeight: v })} />
          </Field>
          <Field label="Padding (y)">
            <NumberInput label="Vertical content padding" value={c.contentPadding} min={0} max={1000} suffix="px" onChange={(v) => v != null && set({ contentPadding: v })} />
          </Field>
          <p className="col-span-2 text-[11px] text-muted-foreground">Simplified layout simulation, not a full browser layout engine.</p>
        </div>
      )}

      <details className="group rounded-md border border-border">
        <summary className="cursor-pointer select-none px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
          Size constraints {constrained && <span className="text-accent-text">· active</span>}
        </summary>
        <div className="grid grid-cols-2 gap-2 border-t border-border p-2.5">
          {(
            [
              ["minWidth", "Min width"],
              ["maxWidthConstraint", "Max width"],
              ["minHeight", "Min height"],
              ["maxHeight", "Max height"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <NumberInput label={label} value={c[key]} min={1} max={10000} allowEmpty placeholder="none" suffix="px" onChange={(v) => set({ [key]: v } as Partial<typeof c>)} />
            </Field>
          ))}
        </div>
      </details>
      <dl className="num grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-muted-foreground">Requested</dt>
        <dd className="text-right">{fmt(requested.width)} × {fmt(requested.height)}</dd>
        <dt className="text-muted-foreground">Resolved</dt>
        <dd className="text-right text-foreground">{fmt(resolved.width)} × {fmt(resolved.height)}</dd>
      </dl>
    </div>
  );
}

export function ContainerBackground() {
  const bg = useSimulatorStore((s) => s.config.container.background);
  const patch = useSimulatorStore((s) => s.patch);
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor="bg-color" hint="Fills empty space in contain, none and scale-down modes.">
        Container background
      </Label>
      <div className="flex items-center gap-1.5">
        <span className="num text-[11px] text-muted-foreground">{bg}</span>
        <input
          id="bg-color"
          type="color"
          value={bg.length === 4 ? `#${[...bg.slice(1)].map((ch) => ch + ch).join("")}` : bg.slice(0, 7)}
          onChange={(e) => patch("container", { background: e.target.value })}
          className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
      </div>
    </div>
  );
}
