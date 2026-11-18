"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { usePreviewModel } from "@/hooks/use-preview-model";
import { useSafeZone } from "@/hooks/use-safe-zone";
import { cropSeverity } from "@/lib/geometry/cropping";
import { normalizeRatio, formatDecimal } from "@/lib/assets/aspect-ratios";
import { DEVICE_PIXEL_RATIOS } from "@/lib/assets/device-presets";
import { Segmented } from "@/components/ui/controls";
import { Section } from "@/components/ui/overlays";
import { SourceImagePreview, CropLegend } from "@/components/preview/source-image-preview";
import { cn, fmt, fmtBytes, fmtPct, fmtPx, fmtSize } from "@/lib/utils";
import type { DevicePixelRatio } from "@/types/simulator";
import type { Simulation } from "@/lib/geometry/simulate";

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "visible" | "warning" | "danger" | "muted" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "num text-right text-[12px]",
          tone === "visible" && "text-visible-text",
          tone === "warning" && "text-warning-text",
          tone === "danger" && "text-danger-text",
          tone === "muted" && "text-subtle-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ratioText(w: number, h: number) {
  const r = w / h;
  const n = Number.isInteger(Math.round(w * 1000) / 1000) && Number.isInteger(Math.round(h * 1000) / 1000) ? normalizeRatio(Math.round(w), Math.round(h)) : null;
  return n && n.length <= 9 ? `${n} · ${formatDecimal(r, 3)}` : `${formatDecimal(r, 3)}:1`;
}

const SEVERITY_LABEL = { none: "No cropping", low: "Light cropping", moderate: "Moderate cropping", severe: "Severe cropping" } as const;

function Headline({ sim }: { sim: Simulation }) {
  const m = sim.metrics;
  const severity = cropSeverity(m.imageCroppedPercentage);
  const fit = useSimulatorStore((s) => s.config.rendering.objectFit);
  const showsEmpty = m.emptySpacePercentage > 0.05;
  const color = severity === "severe" ? "text-danger-text" : severity === "moderate" ? "text-warning-text" : "text-visible-text";
  const bar = severity === "severe" ? "bg-danger" : severity === "moderate" ? "bg-warning" : "bg-visible";
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">Image visible</div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <span className={cn("text-[34px] font-semibold leading-none tracking-tight tabular-nums", color)} aria-live="polite">
            {fmtPct(m.imageVisiblePercentage)}
          </span>
          <span className="num pb-0.5 text-xs text-muted-foreground">{fmtPct(m.imageCroppedPercentage)} crop</span>
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {SEVERITY_LABEL[severity]}
          {showsEmpty && ` · ${fmtPct(m.emptySpacePercentage)} empty space`}
          {fit === "fill" && " · distorted"}
        </div>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-border"
        role="meter"
        aria-label="Visible portion of the image"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(m.imageVisiblePercentage * 10) / 10}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-200", bar)} style={{ width: `${m.imageVisiblePercentage}%` }} />
      </div>
    </div>
  );
}

interface Indicator {
  tone: "ok" | "info" | "warning" | "danger";
  text: string;
}

function qualityIndicators(sim: Simulation, dpr: number, fit: string, distortMode: boolean): Indicator[] {
  const out: Indicator[] = [];
  const m = sim.metrics;
  const scale = Math.max(m.scaleX, m.scaleY);
  const needed = scale * dpr;
  if (scale > 1.001) out.push({ tone: "warning", text: `Upscaled ${fmt(scale, 2)}× beyond the source asset's native resolution.` });
  if (needed > 1.001)
    out.push({
      tone: needed > 1.5 ? "danger" : "warning",
      text: `Insufficient for ${dpr}× DPR: needs ${fmt(m.renderedWidth * dpr, 0)} × ${fmt(m.renderedHeight * dpr, 0)}px, source is ${fmt(sim.effective.width, 0)} × ${fmt(sim.effective.height, 0)}px.`,
    });
  if (fit === "fill" && Math.abs(m.scaleX / m.scaleY - 1) > 0.005)
    out.push({ tone: "danger", text: `object-fit: fill distorts the image (x ${fmt(m.scaleX, 3)} vs y ${fmt(m.scaleY, 3)}).` });
  if (distortMode && sim.effective.distorted) out.push({ tone: "danger", text: "Source asset is stretched (distortion mode)." });
  if (m.imageCroppedPercentage >= 50) out.push({ tone: "danger", text: `${fmtPct(m.imageCroppedPercentage)} of the image is cropped.` });
  else if (m.imageCroppedPercentage >= 25) out.push({ tone: "warning", text: `${fmtPct(m.imageCroppedPercentage)} of the image is cropped.` });
  if (sim.focal && sim.focalVisible === false)
    out.push({ tone: "danger", text: sim.focalInSource ? "Focal point is outside the visible region." : "Focal point is removed by the source asset crop." });
  if (out.length === 0) out.push({ tone: "ok", text: `Sharp at ${dpr}× and no significant cropping.` });
  return out;
}

const TONE_ICON = { ok: CheckCircle2, info: Info, warning: AlertTriangle, danger: XCircle };
const TONE_CLASS = {
  ok: "text-visible-text bg-visible-soft",
  info: "text-muted-foreground bg-surface",
  warning: "text-warning-text bg-warning-soft",
  danger: "text-danger-text bg-danger-soft",
};

export function InspectorPanel() {
  const { config, sim, source } = usePreviewModel();
  const patch = useSimulatorStore((s) => s.patch);
  const safeZone = useSafeZone(config.workspace.showSafeZone);
  const m = sim.metrics;
  const e = sim.effective;
  const dpr = config.analysis.devicePixelRatio;
  const showEmpty = ["contain", "none", "scale-down"].includes(config.rendering.objectFit) || m.emptySpacePercentage > 0.05;
  const indicators = qualityIndicators(sim, dpr, config.rendering.objectFit, config.image.aspectRatioStrategy === "distort");
  const sameAxisScale = Math.abs(m.scaleX - m.scaleY) < 1e-9;

  return (
    <div className="px-4 pb-6 pt-4">
      <h2 className="mb-3 text-[15px] font-semibold">Image inspector</h2>
      <Headline sim={sim} />

      <div className="mt-5 space-y-2">
        <h3 className="text-[13px] font-medium">Cropping preview</h3>
        <div className="flex justify-center rounded-lg border border-border bg-canvas p-2.5">
          <SourceImagePreview sim={sim} src={source.src} safeZone={safeZone} maxHeight={240} className="w-auto max-w-full" rangeLabel={`${config.analysis.minViewport}–${config.analysis.maxViewport}px`} />
        </div>
        <CropLegend sourceCropped={e.sourceCroppedPercentage > 0.01} />
      </div>

      <dl className="mt-4 border-t border-border pt-3">
        <Row label="Container" value={fmtSize(m.containerWidth, m.containerHeight)} />
        <Row label="Rendered image" value={fmtSize(m.renderedWidth, m.renderedHeight)} />
        <Row label="Top crop" value={fmtPx(m.crop.top)} tone={m.crop.top > 0.05 ? undefined : "muted"} />
        <Row label="Bottom crop" value={fmtPx(m.crop.bottom)} tone={m.crop.bottom > 0.05 ? undefined : "muted"} />
        <Row label="Left crop" value={fmtPx(m.crop.left)} tone={m.crop.left > 0.05 ? undefined : "muted"} />
        <Row label="Right crop" value={fmtPx(m.crop.right)} tone={m.crop.right > 0.05 ? undefined : "muted"} />
      </dl>

      <Section title="Quality">
        <ul className="space-y-1.5">
          {indicators.map((i) => {
            const Icon = TONE_ICON[i.tone];
            return (
              <li key={i.text} className={cn("flex gap-2 rounded-md px-2.5 py-2 text-[12px] leading-snug", TONE_CLASS[i.tone])}>
                <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
                <span>{i.text}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">Device pixel ratio</span>
          <Segmented<string>
            label="Simulated device pixel ratio"
            size="sm"
            className="w-[160px]"
            value={String(dpr)}
            onChange={(v) => patch("analysis", { devicePixelRatio: Number(v) as DevicePixelRatio })}
            options={DEVICE_PIXEL_RATIOS.map((d) => ({ value: String(d), label: `${d}×` }))}
          />
        </div>
      </Section>

      <Section title="Source image">
        <dl>
          <Row label="Original" value={fmtSize(sim.original.width, sim.original.height, 0)} />
          <Row label="Native ratio" value={ratioText(sim.original.width, sim.original.height)} />
          <Row label="Effective source" value={fmtSize(e.width, e.height)} />
          <Row label="Effective ratio" value={ratioText(e.width, e.height)} />
          <Row label="Sizing strategy" value={e.strategy === "crop" ? "Crop to ratio" : e.strategy === "distort" ? "Resize (distort)" : "Native"} tone={e.distorted ? "danger" : undefined} />
          <Row label="Removed by source crop" value={fmtPct(e.sourceCroppedPercentage)} tone={e.sourceCroppedPercentage > 0.05 ? "warning" : "muted"} />
          {e.strategy === "crop" && e.sourceCroppedPercentage > 0.05 && (
            <>
              <Row label="Crop area origin" value={`${fmt(e.sourceRect.x, 0)}, ${fmt(e.sourceRect.y, 0)}`} />
              <Row
                label="Crop area position"
                value={`${fmt(config.image.sourceCropX * 100)}% ${fmt(config.image.sourceCropY * 100)}%`}
              />
            </>
          )}
          <Row label="Format" value={source.meta.format ?? "—"} />
          <Row label="File size" value={fmtBytes(source.meta.fileSize)} />
        </dl>
      </Section>

      <Section title="Container">
        <dl>
          <Row label="Viewport" value={`${config.viewport.width} × ${config.viewport.height}`} />
          <Row label="Requested" value={fmtSize(sim.container.requested.width, sim.container.requested.height)} />
          <Row label="Resolved" value={fmtSize(m.containerWidth, m.containerHeight)} />
          <Row label="Container ratio" value={`${formatDecimal(m.containerWidth / m.containerHeight, 3)}:1`} />
          <Row label="Width mode" value={config.container.widthMode} />
          <Row label="Height mode" value={config.container.heightMode} />
        </dl>
      </Section>

      <Section title="Rendering">
        <dl>
          <Row label="object-fit" value={config.rendering.objectFit} />
          <Row label="object-position" value={`${fmt(sim.position.x * 100)}% ${fmt(sim.position.y * 100)}%`} />
          <Row label="Rendered size" value={fmtSize(m.renderedWidth, m.renderedHeight)} />
          <Row label="Offset" value={`${fmt(m.offsetX)}, ${fmt(m.offsetY)}`} />
          <Row label="Scale" value={sameAxisScale ? `${fmt(m.scaleX, 4)}×` : `x ${fmt(m.scaleX, 3)} · y ${fmt(m.scaleY, 3)}`} tone={sameAxisScale ? undefined : "danger"} />
          <Row
            label="Scaling"
            value={Math.max(m.scaleX, m.scaleY) > 1.0001 ? "Upscaling" : Math.max(m.scaleX, m.scaleY) < 0.9999 ? "Downscaling" : "1:1"}
            tone={Math.max(m.scaleX, m.scaleY) > 1.0001 ? "warning" : undefined}
          />
        </dl>
      </Section>

      <Section title="Cropping">
        <dl>
          <Row label="Visible" value={fmtPct(m.imageVisiblePercentage, 2)} tone="visible" />
          <Row label="Cropped" value={fmtPct(m.imageCroppedPercentage, 2)} />
        </dl>
        <table className="num w-full text-[12px]">
          <caption className="sr-only">Crop per edge in CSS and source pixels</caption>
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-subtle-foreground">
              <th className="text-left font-medium">Edge</th>
              <th className="text-right font-medium">CSS px</th>
              <th className="text-right font-medium">Source px</th>
            </tr>
          </thead>
          <tbody>
            {(["top", "bottom", "left", "right"] as const).map((edge) => (
              <tr key={edge}>
                <td className="py-0.5 capitalize text-muted-foreground">{edge}</td>
                <td className="text-right">{fmt(m.crop[edge])}</td>
                <td className="text-right">{fmt(m.sourceCrop[edge])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {showEmpty && (
        <Section title="Empty space">
          <dl>
            <Row label="Container occupied" value={fmtPct(m.containerCoveragePercentage, 2)} />
            <Row label="Container empty" value={fmtPct(m.emptySpacePercentage, 2)} />
            <Row label="Top / bottom" value={`${fmt(m.empty.top)} / ${fmt(m.empty.bottom)}px`} />
            <Row label="Left / right" value={`${fmt(m.empty.left)} / ${fmt(m.empty.right)}px`} />
          </dl>
          <p className="text-[11px] text-muted-foreground">Empty space is container area without image — not image cropping.</p>
        </Section>
      )}

      {safeZone && (
        <Section title="Safe zone">
          <dl>
            <Row label="Range" value={`${config.analysis.minViewport}–${config.analysis.maxViewport}px`} />
            <Row label="Always visible" value={fmtPct(safeZone.safePercentage)} tone="visible" />
            <Row
              label="Focal point"
              value={safeZone.focalIncluded == null ? "Not set" : safeZone.focalIncluded ? "Always visible" : "Sometimes cropped"}
              tone={safeZone.focalIncluded === false ? "danger" : safeZone.focalIncluded ? "visible" : "muted"}
            />
          </dl>
          <p className="text-[11px] text-muted-foreground">
            Place subjects and any baked-in content inside the dashed region. HTML text overlays are more flexible and accessible than text in images.
          </p>
        </Section>
      )}
    </div>
  );
}
