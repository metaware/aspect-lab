"use client";

import { useId, type ReactNode } from "react";
import type { ContainerConfig, HeightMode, ObjectFit, Rect, WidthMode } from "@/types/simulator";
import { computeCropMetrics } from "@/lib/geometry/cropping";
import { resolveContainer } from "@/lib/geometry/resolve-container";
import { positionForFocalPoint } from "@/lib/geometry/focal-point";
import { createDefaultConfig } from "@/lib/configuration/defaults";
import { cn } from "@/lib/utils";

/*
 * Documentation diagrams. Geometry comes from the same engine the simulator
 * uses, so every illustration is to scale. The miniature photo uses fixed
 * illustrative colors (it is picture content, not interface chrome).
 */

/** Intrinsic size of the miniature photo (3:2, like the landscape sample). */
const PW = 300;
const PH = 200;
/** Subject (a lone tree) used for focal point diagrams, as photo fractions. */
const SUBJECT = { x: 0.76, y: 0.62 };

function PhotoArt({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fbfdc" />
          <stop offset="1" stopColor="#f2e2c2" />
        </linearGradient>
      </defs>
      <rect width={PW} height={PH} fill={`url(#sky-${uid})`} />
      <circle cx={62} cy={52} r={17} fill="#fde68a" />
      <path d="M0 140 L70 70 L120 115 L180 50 L250 112 L300 80 L300 200 L0 200 Z" fill="#8aa79d" />
      <path d="M180 50 L196 66 L188 64 L180 72 L172 63 L166 64 Z" fill="#f8fafc" />
      <path d="M0 165 Q80 128 150 152 T300 140 L300 200 L0 200 Z" fill="#4f7c6b" />
      <path d="M0 200 L0 182 Q120 162 300 178 L300 200 Z" fill="#2f5246" />
      <g transform={`translate(${SUBJECT.x * PW} ${SUBJECT.y * PH})`}>
        <rect x={-2} y={2} width={4} height={14} fill="#3b2a1a" />
        <path d="M0 -22 L13 4 L-13 4 Z" fill="#1f3d32" />
        <path d="M0 -32 L10 -10 L-10 -10 Z" fill="#1f3d32" />
      </g>
    </>
  );
}

/** The miniature photo stretched into `rect`, showing `view` (a region of the photo). */
function Photo({ rect, view = { x: 0, y: 0, width: PW, height: PH } }: { rect: Rect; view?: Rect }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <PhotoArt uid={uid} />
    </svg>
  );
}

function Hatch({ id }: { id: string }) {
  return (
    <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={6} stroke="var(--guide)" strokeWidth={1} opacity={0.5} />
    </pattern>
  );
}

function Label({ x, y, children, anchor = "middle" }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={9} fill="var(--muted-foreground)" className="num">
      {children}
    </text>
  );
}

export function Figure({ children, caption, className }: { children: ReactNode; caption?: ReactNode; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-center rounded-lg border border-border bg-canvas p-3">{children}</div>
      {caption && <figcaption className="text-[12px] leading-snug text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

export function FigureGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 | 5 | 6 }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6" }[columns];
  return <div className={cn("grid grid-cols-2 gap-3", cols)}>{children}</div>;
}

/**
 * A container with the photo fitted inside by the real object-fit math.
 * The faded, hatched area outside the box is what the component crops away.
 */
export function FitDiagram({
  box,
  fit = "cover",
  pos = { x: 0.5, y: 0.5 },
  ghost = true,
  scale = 1,
  view,
  background = "var(--surface)",
}: {
  box: { width: number; height: number };
  fit?: ObjectFit;
  pos?: { x: number; y: number };
  ghost?: boolean;
  scale?: number;
  /** Region of the photo used as the source asset (for source-crop diagrams). */
  view?: Rect;
  background?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const src = view ?? { x: 0, y: 0, width: PW, height: PH };
  // Intrinsic size: 100 units on the long edge, so "none" reads sensibly.
  const Iw = (src.width / Math.max(src.width, src.height)) * 100;
  const Ih = (src.height / Math.max(src.width, src.height)) * 100;
  const m = computeCropMetrics(Iw, Ih, box.width, box.height, fit, pos.x, pos.y);
  const rendered = { x: m.offsetX, y: m.offsetY, width: m.renderedWidth, height: m.renderedHeight };
  const minX = Math.min(0, rendered.x) - 6;
  const minY = Math.min(0, rendered.y) - 6;
  const maxX = Math.max(box.width, rendered.x + rendered.width) + 6;
  const maxY = Math.max(box.height, rendered.y + rendered.height) + 6;
  const vbW = ghost ? maxX - minX : box.width + 12;
  const vbH = ghost ? maxY - minY : box.height + 12;
  const ox = ghost ? minX : -6;
  const oy = ghost ? minY : -6;
  return (
    <svg viewBox={`${ox} ${oy} ${vbW} ${vbH}`} width={vbW * scale} height={vbH * scale} className="max-w-full" aria-hidden>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect width={box.width} height={box.height} />
        </clipPath>
        <Hatch id={`hatch-${uid}`} />
      </defs>
      {ghost && m.imageCroppedPercentage > 0.1 && (
        <g opacity={0.35}>
          <Photo rect={rendered} view={src} />
          <rect {...rendered} fill={`url(#hatch-${uid})`} />
        </g>
      )}
      <rect width={box.width} height={box.height} fill={background} />
      <g clipPath={`url(#clip-${uid})`}>
        <Photo rect={rendered} view={src} />
      </g>
      <rect width={box.width} height={box.height} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
    </svg>
  );
}

/** Source sizing: native vs crop-to-ratio vs distort. */
export function StrategyDiagram({ strategy }: { strategy: "native" | "crop" | "distort" }) {
  const uid = useId().replace(/:/g, "");
  const ratio = 9 / 16;
  const cropW = PH * ratio;
  if (strategy === "native") {
    return (
      <svg viewBox={`-4 -4 ${PW + 8} ${PH + 8}`} width={150} aria-hidden>
        <Photo rect={{ x: 0, y: 0, width: PW, height: PH }} />
        <rect width={PW} height={PH} fill="none" stroke="var(--accent)" strokeWidth={3} />
      </svg>
    );
  }
  if (strategy === "crop") {
    const x = (PW - cropW) / 2;
    return (
      <svg viewBox={`-4 -4 ${PW + 8} ${PH + 8}`} width={150} aria-hidden>
        <defs>
          <Hatch id={`h-${uid}`} />
        </defs>
        <Photo rect={{ x: 0, y: 0, width: PW, height: PH }} />
        <path d={`M0 0H${PW}V${PH}H0Z M${x} 0V${PH}H${x + cropW}V0Z`} fillRule="evenodd" fill="var(--source-cropped)" />
        <rect x={x} y={0} width={cropW} height={PH} fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="10 6" />
      </svg>
    );
  }
  const h = 200;
  return (
    <svg viewBox={`-4 -4 ${PW + 8} ${PH + 8}`} width={150} aria-hidden>
      <Photo rect={{ x: (PW - h * ratio) / 2, y: 0, width: h * ratio, height: h }} />
      <rect x={(PW - h * ratio) / 2} y={0} width={h * ratio} height={h} fill="none" stroke="var(--danger)" strokeWidth={3} />
    </svg>
  );
}

/** Crop-to-ratio box positioned along the original (0 = left, 1 = right). */
export function CropAreaDiagram({ at }: { at: number }) {
  const cropW = PH; // 1:1
  const x = (PW - cropW) * at;
  return (
    <svg viewBox={`-4 -4 ${PW + 8} ${PH + 8}`} width={150} aria-hidden>
      <Photo rect={{ x: 0, y: 0, width: PW, height: PH }} />
      <path d={`M0 0H${PW}V${PH}H0Z M${x} 0V${PH}H${x + cropW}V0Z`} fillRule="evenodd" fill="var(--source-cropped)" />
      <rect x={x} y={0} width={cropW} height={PH} fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="10 6" />
    </svg>
  );
}

const BASE_CONTAINER: ContainerConfig = createDefaultConfig().container;

/** A viewport frame (dashed) with the resolved container inside it, for a width mode. */
export function WidthModeDiagram({ mode }: { mode: WidthMode }) {
  const vw = 1200;
  const k = 0.16;
  const c: ContainerConfig = {
    ...BASE_CONTAINER,
    widthMode: mode,
    horizontalGutter: mode === "full" ? 0 : 60,
    widthPercent: 60,
    fixedWidth: 520,
    maxWidth: 800,
    gridColumns: 12,
    gridSpan: 4,
    gridGap: 24,
    heightMode: "fixed",
    height: 420,
  };
  const r = resolveContainer(c, { width: vw, height: 800, browserChrome: 0 }, 1.5).resolved;
  const left = mode === "max" ? (vw - r.width) / 2 : c.horizontalGutter;
  const H = 420 * k;
  return (
    <svg viewBox={`-4 -4 ${vw * k + 8} ${H + 22}`} width={vw * k + 8} className="max-w-full" aria-hidden>
      <rect width={vw * k} height={H} fill="none" stroke="var(--guide)" strokeDasharray="4 3" strokeWidth={1} />
      {mode === "grid" &&
        Array.from({ length: 12 }, (_, i) => {
          const col = (vw - 2 * c.horizontalGutter - 11 * c.gridGap) / 12;
          return (
            <rect key={i} x={(c.horizontalGutter + i * (col + c.gridGap)) * k} y={0} width={col * k} height={H} fill="var(--accent-soft)" />
          );
        })}
      <svg x={left * k} y={0} width={r.width * k} height={H} viewBox={`0 0 ${r.width} 420`} preserveAspectRatio="none" overflow="hidden">
        <FitDiagramInner width={r.width} height={420} />
      </svg>
      <rect x={left * k} y={0} width={r.width * k} height={H} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      <Label x={(vw * k) / 2} y={H + 14}>
        {Math.round(r.width)}px in a {vw}px viewport
      </Label>
    </svg>
  );
}

/** Photo cover-fitted into a w×h box, in that box's own coordinates. */
function FitDiagramInner({ width, height }: { width: number; height: number }) {
  const m = computeCropMetrics(PW, PH, width, height, "cover");
  return <Photo rect={{ x: m.offsetX, y: m.offsetY, width: m.renderedWidth, height: m.renderedHeight }} />;
}

/** The same component at a narrow and a wide viewport, for a height mode. */
export function HeightModeDiagram({ mode }: { mode: HeightMode }) {
  const k = 0.11;
  const c: ContainerConfig = {
    ...BASE_CONTAINER,
    heightMode: mode,
    height: 480,
    aspectRatio: "16:9",
    viewportHeightValue: 60,
    viewportUnit: "svh",
    fluidMin: 300,
    fluidPreferredVw: 40,
    fluidMax: 560,
    contentHeight: 360,
    contentPadding: 40,
  };
  const widths = [390, 1280];
  const vh = 800;
  const sizes = widths.map((w) => resolveContainer(c, { width: w, height: vh, browserChrome: 0 }, 1.5).resolved);
  const gap = 18;
  const totalW = widths.reduce((s, w) => s + w * k, 0) + gap;
  const maxH = Math.max(...sizes.map((s) => s.height)) * k;
  let x = 0;
  return (
    <svg viewBox={`-24 -4 ${totalW + 48} ${maxH + 24}`} width={totalW + 48} className="max-w-full" aria-hidden>
      {sizes.map((s, i) => {
        const node = (
          <g key={i} transform={`translate(${x} ${maxH - s.height * k})`}>
            <svg width={s.width * k} height={s.height * k} viewBox={`0 0 ${s.width} ${s.height}`} preserveAspectRatio="none" overflow="hidden">
              <FitDiagramInner width={s.width} height={s.height} />
              {mode === "content" && (
                <g>
                  <rect x={40} y={s.height - 200} width={s.width * 0.5} height={40} rx={6} fill="white" opacity={0.85} />
                  <rect x={40} y={s.height - 140} width={s.width * 0.35} height={24} rx={6} fill="white" opacity={0.6} />
                </g>
              )}
            </svg>
            <rect width={s.width * k} height={s.height * k} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
            <text x={(s.width * k) / 2} y={s.height * k + 13} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" className="num">
              {widths[i]}w · {Math.round(s.height)}h
            </text>
          </g>
        );
        x += widths[i] * k + gap;
        return node;
      })}
    </svg>
  );
}

/** Visible regions at the narrowest and widest viewport, and their intersection (the safe zone). */
export function SafeZoneDiagram() {
  const uid = useId().replace(/:/g, "");
  const narrow = computeCropMetrics(PW, PH, 360, 640, "cover").visibleSourceRect;
  const wide = computeCropMetrics(PW, PH, 1535, 640, "cover").visibleSourceRect;
  const x = Math.max(narrow.x, wide.x);
  const y = Math.max(narrow.y, wide.y);
  const safe = {
    x,
    y,
    width: Math.min(narrow.x + narrow.width, wide.x + wide.width) - x,
    height: Math.min(narrow.y + narrow.height, wide.y + wide.height) - y,
  };
  return (
    <svg viewBox={`-6 -6 ${PW + 12} ${PH + 12}`} width={260} className="max-w-full" aria-hidden>
      <defs>
        <Hatch id={`h-${uid}`} />
      </defs>
      <Photo rect={{ x: 0, y: 0, width: PW, height: PH }} />
      <path d={`M0 0H${PW}V${PH}H0Z M${safe.x} ${safe.y}v${safe.height}h${safe.width}v${-safe.height}Z`} fillRule="evenodd" fill="var(--cropped)" />
      <rect {...narrow} fill="none" stroke="var(--chart-2)" strokeWidth={2.5} />
      <rect {...wide} fill="none" stroke="var(--chart-3)" strokeWidth={2.5} />
      <rect {...safe} fill="none" stroke="var(--warning)" strokeWidth={3} strokeDasharray="8 5" />
    </svg>
  );
}

/** Original photo with a focal point marker on the subject. */
export function FocalMarkerDiagram() {
  return (
    <svg viewBox={`-4 -4 ${PW + 8} ${PH + 8}`} width={180} aria-hidden>
      <Photo rect={{ x: 0, y: 0, width: PW, height: PH }} />
      <circle cx={SUBJECT.x * PW} cy={SUBJECT.y * PH - 8} r={16} fill="none" stroke="var(--visible)" strokeWidth={3} />
      <circle cx={SUBJECT.x * PW} cy={SUBJECT.y * PH - 8} r={4} fill="var(--visible)" />
    </svg>
  );
}

/** Object position that keeps the subject centered in a tall container. */
export function focalCenteredPosition(box: { width: number; height: number }) {
  const Iw = 100;
  const Ih = (100 * PH) / PW;
  const m = computeCropMetrics(Iw, Ih, box.width, box.height, "cover");
  return positionForFocalPoint({ x: SUBJECT.x, y: SUBJECT.y - 0.04 }, m.renderedWidth, m.renderedHeight, box.width, box.height);
}

/** Container with a simulated hero overlay: scrim, heading, text and buttons. */
export function OverlayDiagram({ scrim }: { scrim: "none" | "gradient" | "dark" }) {
  const uid = useId().replace(/:/g, "");
  const W = 240;
  const H = 150;
  const m = computeCropMetrics(PW, PH, W, H, "cover");
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} width={W} className="max-w-full" aria-hidden>
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="black" stopOpacity={0.7} />
          <stop offset="0.7" stopColor="black" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`c-${uid}`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c-${uid})`}>
        <Photo rect={{ x: m.offsetX, y: m.offsetY, width: m.renderedWidth, height: m.renderedHeight }} />
        {scrim === "gradient" && <rect width={W} height={H} fill={`url(#g-${uid})`} />}
        {scrim === "dark" && <rect width={W} height={H} fill="black" opacity={0.45} />}
        <rect x={16} y={H - 70} width={120} height={12} rx={3} fill="white" />
        <rect x={16} y={H - 52} width={160} height={6} rx={3} fill="white" opacity={0.75} />
        <rect x={16} y={H - 30} width={52} height={16} rx={4} fill="white" />
        <rect x={74} y={H - 30} width={52} height={16} rx={4} fill="none" stroke="white" />
      </g>
      <rect width={W} height={H} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
    </svg>
  );
}

/** Constant-scale canvas: different widths, same rendered height. */
export function ConstantScaleDiagram() {
  const widths = [360, 767, 1535];
  const k = 0.1;
  let x = 0;
  const gap = 14;
  const total = widths.reduce((s, w) => s + w * k, 0) + gap * (widths.length - 1);
  return (
    <svg viewBox={`-20 -4 ${total + 40} 90`} width={total + 40} className="max-w-full" aria-hidden>
      {widths.map((w) => {
        const node = (
          <g key={w} transform={`translate(${x} 0)`}>
            <svg width={w * k} height={64} viewBox={`0 0 ${w} 640`} preserveAspectRatio="none" overflow="hidden">
              <FitDiagramInner width={w} height={640} />
            </svg>
            <rect width={w * k} height={64} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
            <Label x={(w * k) / 2} y={78}>
              {w}px
            </Label>
          </g>
        );
        x += w * k + gap;
        return node;
      })}
      <line x1={-2} x2={total + 2} y1={0} y2={0} stroke="var(--guide)" strokeDasharray="3 3" opacity={0.6} />
      <line x1={-2} x2={total + 2} y1={64} y2={64} stroke="var(--guide)" strokeDasharray="3 3" opacity={0.6} />
    </svg>
  );
}

/** Sketch of the cropping chart: cropping vs viewport width for three ratios. */
export function ChartSketch() {
  const W = 260;
  const H = 120;
  const ratios = [9 / 16, 4 / 5, 16 / 9];
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  const xs = Array.from({ length: 40 }, (_, i) => 360 + ((1535 - 360) * i) / 39);
  const toX = (vw: number) => ((vw - 360) / (1535 - 360)) * W;
  return (
    <svg viewBox={`-24 -8 ${W + 32} ${H + 24}`} width={W + 32} className="max-w-full" aria-hidden>
      <line x1={0} x2={W} y1={H} y2={H} stroke="var(--border-strong)" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="var(--border)" />
      <Label x={-4} y={4} anchor="end">100%</Label>
      <Label x={-4} y={H + 3} anchor="end">0%</Label>
      <Label x={0} y={H + 13} anchor="start">360px</Label>
      <Label x={W} y={H + 13} anchor="end">1535px</Label>
      {ratios.map((r, i) => {
        const pts = xs
          .map((vw) => {
            const c = computeCropMetrics(r * 100, 100, vw, 640, "cover").imageCroppedPercentage;
            return `${toX(vw).toFixed(1)},${(H - (c / 100) * H).toFixed(1)}`;
          })
          .join(" ");
        return <polyline key={r} points={pts} fill="none" stroke={colors[i]} strokeWidth={2} />;
      })}
      <line x1={toX(430)} x2={toX(430)} y1={0} y2={H} stroke="var(--accent)" strokeWidth={1.2} />
    </svg>
  );
}

/** Asset planner: viewport range split into asset variants. */
export function AssetPlanSketch() {
  const segments = [
    { from: 360, to: 767, label: "5:6" },
    { from: 768, to: 1023, label: "4:3" },
    { from: 1024, to: 1535, label: "18:9" },
  ];
  const W = 260;
  const toX = (v: number) => ((v - 360) / (1535 - 360)) * W;
  return (
    <svg viewBox={`-4 -4 ${W + 8} 52`} width={W + 8} className="max-w-full" aria-hidden>
      {segments.map((s, i) => (
        <g key={s.label}>
          <rect
            x={toX(s.from)}
            y={6}
            width={toX(s.to) - toX(s.from) - 2}
            height={22}
            rx={4}
            fill={i % 2 ? "var(--accent-soft)" : "var(--surface)"}
            stroke="var(--accent)"
          />
          <text x={(toX(s.from) + toX(s.to)) / 2} y={21} textAnchor="middle" fontSize={10} fill="var(--accent-text)" className="num">
            {s.label}
          </text>
          <Label x={toX(s.from)} y={42} anchor="start">
            {s.from}
          </Label>
        </g>
      ))}
      <Label x={W} y={42} anchor="end">
        1535
      </Label>
    </svg>
  );
}

/** Optimizer: candidate ratios scored by worst-case crop; best one highlighted. */
export function OptimizerSketch() {
  const candidates = ["2:3", "3:4", "4:5", "5:6", "1:1", "4:3"];
  const W = 260;
  const H = 90;
  const scores = candidates.map((label) => {
    const [a, b] = label.split(":").map(Number);
    const r = a / b;
    const worst = Math.max(
      computeCropMetrics(r * 100, 100, 360, 640, "cover").imageCroppedPercentage,
      computeCropMetrics(r * 100, 100, 767, 640, "cover").imageCroppedPercentage,
    );
    return { label, worst };
  });
  const best = scores.reduce((m, s) => (s.worst < m.worst ? s : m));
  const bw = W / candidates.length - 8;
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 24}`} width={W + 8} className="max-w-full" aria-hidden>
      {scores.map((s, i) => {
        const h = (s.worst / 100) * H;
        const x = i * (bw + 8);
        const isBest = s === best;
        return (
          <g key={s.label}>
            <rect x={x} y={H - h} width={bw} height={h} rx={3} fill={isBest ? "var(--accent)" : "var(--border-strong)"} />
            <text x={x + bw / 2} y={H + 13} textAnchor="middle" fontSize={9} fill={isBest ? "var(--accent-text)" : "var(--muted-foreground)"} className="num">
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Generic code sketch. */
export function CodeSketch() {
  const lines = [
    [".image-container {", 0],
    ["height: 640px;", 1],
    ["overflow: hidden;", 1],
    ["}", 0],
    [".image-container img {", 0],
    ["object-fit: cover;", 1],
    ["object-position: 50% 50%;", 1],
    ["}", 0],
  ] as const;
  return (
    <pre className="num w-full max-w-[280px] rounded-md bg-surface px-3 py-2 text-[10.5px] leading-[1.6] text-muted-foreground">
      {lines.map(([t, indent], i) => (
        <div key={i} style={{ paddingLeft: indent * 12 }}>
          {t}
        </div>
      ))}
    </pre>
  );
}
