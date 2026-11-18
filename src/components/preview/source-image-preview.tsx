"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Rect } from "@/types/simulator";
import type { Simulation } from "@/lib/geometry/simulate";
import type { SafeZone } from "@/lib/geometry/safe-zone";
import { useSimulatorStore } from "@/store/simulator-store";
import { cn, fmt, fmtPct } from "@/lib/utils";

/** Maps a rect in effective-source px to original-image px. */
export function effectiveToOriginal(sim: Simulation, r: Rect): Rect {
  const s = sim.effective.sourceRect;
  const kx = s.width / sim.effective.width;
  const ky = s.height / sim.effective.height;
  return { x: s.x + r.x * kx, y: s.y + r.y * ky, width: r.width * kx, height: r.height * ky };
}

function rectPath(r: Rect) {
  return `M${r.x} ${r.y}h${r.width}v${r.height}h${-r.width}Z`;
}

/**
 * The entire original image with what the component loses. Fits the space it
 * is given (unlike the constant-scale component preview).
 */
export function SourceImagePreview({
  sim,
  src,
  safeZone,
  showMeasurements = true,
  className,
  maxHeight,
  rangeLabel,
}: {
  sim: Simulation;
  src: string | null;
  safeZone?: SafeZone | null;
  showMeasurements?: boolean;
  className?: string;
  maxHeight?: number | string;
  rangeLabel?: string;
}) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [displayWidth, setDisplayWidth] = useState(300);
  const focalPicking = useSimulatorStore((s) => s.focalPicking);
  const focalPoint = useSimulatorStore((s) => s.config.image.focalPoint);
  const patch = useSimulatorStore((s) => s.patch);
  const setFocalPicking = useSimulatorStore((s) => s.setFocalPicking);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setDisplayWidth(e.contentRect.width || 300));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: W, height: H } = sim.original;
  const k = W / displayWidth; // original px per screen px
  const sourceRect = sim.effective.sourceRect;
  const visible = effectiveToOriginal(sim, sim.metrics.visibleSourceRect);
  const hasVisible = visible.width > 0 && visible.height > 0;
  const safe = safeZone?.rect ? effectiveToOriginal(sim, safeZone.rect) : null;
  const full: Rect = { x: 0, y: 0, width: W, height: H };
  const sourceCropped = sim.effective.sourceCroppedPercentage > 0.01;
  const sc = sim.metrics.sourceCrop;
  // Source-crop measurements expressed in original px.
  const kx = sourceRect.width / sim.effective.width;
  const ky = sourceRect.height / sim.effective.height;

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!focalPicking) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
    patch("image", { focalPoint: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 } });
    setFocalPicking(false);
  };

  const fs = 11 * k;
  const label = (text: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} fontSize={fs} className="num" fill="white" stroke="rgba(0,0,0,0.55)" strokeWidth={3 * k} paintOrder="stroke">
      {text}
    </text>
  );

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={cn("block h-auto w-full select-none", focalPicking && "cursor-crosshair", className)}
      style={{ maxHeight, aspectRatio: `${W} / ${H}` }}
      onClick={onClick}
      role="img"
      aria-label={`Original image ${Math.round(W)} by ${Math.round(H)} pixels. ${fmtPct(sim.metrics.imageVisiblePercentage)} of the source asset is visible in the component${sourceCropped ? `; the source asset itself discards ${fmtPct(sim.effective.sourceCroppedPercentage)} of the original` : ""}.`}
      data-testid="source-preview"
    >
      <defs>
        <pattern id={`hatch-${id}`} width={8 * k} height={8 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8 * k} stroke="var(--cropped-hatch)" strokeWidth={1.5 * k} />
        </pattern>
      </defs>
      {src ? <image href={src} x={0} y={0} width={W} height={H} preserveAspectRatio="none" /> : <rect {...full} fill="var(--surface)" />}

      {/* Removed by source-asset crop (before the component) */}
      {sourceCropped && (
        <path d={`${rectPath(full)} ${rectPath(sourceRect)}`} fillRule="evenodd" fill="var(--source-cropped)" />
      )}
      {/* Cropped by the component */}
      {hasVisible && (
        <>
          <path d={`${rectPath(sourceRect)} ${rectPath(visible)}`} fillRule="evenodd" fill="var(--cropped)" />
          <path d={`${rectPath(sourceRect)} ${rectPath(visible)}`} fillRule="evenodd" fill={`url(#hatch-${id})`} />
          <rect {...visible} fill="none" stroke="var(--visible)" strokeWidth={2 * k} />
        </>
      )}
      {sourceCropped && (
        <rect {...sourceRect} fill="none" stroke="var(--guide)" strokeDasharray={`${4 * k} ${3 * k}`} strokeWidth={1 * k} opacity={0.8} />
      )}

      {safe && (
        <g>
          <rect {...safe} fill="none" stroke="var(--warning)" strokeWidth={1.5 * k} strokeDasharray={`${5 * k} ${3 * k}`} />
          {label(rangeLabel ? `Safe ${rangeLabel}` : "Safe zone", safe.x + 4 * k, safe.y + fs * 1.3, "start")}
        </g>
      )}

      {showMeasurements && hasVisible && (
        <g aria-hidden>
          {sc.top > 0.5 && label(`${fmt(sc.top * ky, 0)}px`, visible.x + visible.width / 2, visible.y - 6 * k)}
          {sc.bottom > 0.5 && label(`${fmt(sc.bottom * ky, 0)}px`, visible.x + visible.width / 2, visible.y + visible.height + fs * 1.2)}
          {sc.left > 0.5 && label(`${fmt(sc.left * kx, 0)}px`, visible.x - 6 * k, visible.y + visible.height / 2, "end")}
          {sc.right > 0.5 && label(`${fmt(sc.right * kx, 0)}px`, visible.x + visible.width + 6 * k, visible.y + visible.height / 2, "start")}
        </g>
      )}

      {focalPoint && (
        <g>
          <circle
            cx={focalPoint.x * W}
            cy={focalPoint.y * H}
            r={9 * k}
            fill="none"
            stroke={sim.focalVisible ? "var(--visible)" : "var(--danger)"}
            strokeWidth={2 * k}
          />
          <circle cx={focalPoint.x * W} cy={focalPoint.y * H} r={2.5 * k} fill={sim.focalVisible ? "var(--visible)" : "var(--danger)"} />
          <line x1={focalPoint.x * W - 14 * k} x2={focalPoint.x * W - 10 * k} y1={focalPoint.y * H} y2={focalPoint.y * H} stroke="white" strokeWidth={1.5 * k} />
          <line x1={focalPoint.x * W + 10 * k} x2={focalPoint.x * W + 14 * k} y1={focalPoint.y * H} y2={focalPoint.y * H} stroke="white" strokeWidth={1.5 * k} />
        </g>
      )}
    </svg>
  );
}

export function CropLegend({ sourceCropped }: { sourceCropped: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[2px] border-2 border-visible" aria-hidden /> Visible
      </li>
      <li className="flex items-center gap-1.5">
        <span className="hatch size-2.5 rounded-[2px] bg-cropped" aria-hidden /> Cropped by component
      </li>
      {sourceCropped && (
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ background: "var(--source-cropped)" }} aria-hidden /> Removed by source asset crop
        </li>
      )}
    </ul>
  );
}
