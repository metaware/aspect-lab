import type {
  CropMetrics,
  EffectiveSource,
  ResolvedContainer,
  Size,
  SimulatorConfig,
  UnitPoint,
} from "@/types/simulator";
import { parseRatio } from "@/lib/assets/aspect-ratios";
import { computeEffectiveSource, focalToEffective } from "./effective-source";
import { resolveContainer } from "./resolve-container";
import { computeCropMetrics } from "./cropping";
import { computeFit } from "./object-fit";
import { isFocalVisible, positionForFocalPoint } from "./focal-point";

export interface SimulationOverrides {
  viewportWidth?: number;
  /** Override the selected source aspect ratio ("native" or "W:H"). */
  aspectRatio?: string;
}

export interface Simulation {
  original: Size;
  effective: EffectiveSource;
  container: ResolvedContainer;
  /** Object position actually applied (0–1), after focal-point adjustment. */
  position: UnitPoint;
  metrics: CropMetrics;
  /** Focal point in effective-source fractions, if any. */
  focal: UnitPoint | null;
  focalInSource: boolean;
  focalVisible: boolean | null;
}

/** Ratio requested for the source asset, or null for native. */
export function selectedSourceRatio(config: SimulatorConfig, override?: string): number | null {
  const value = override ?? config.image.aspectRatio;
  if (value === "native") return null;
  return parseRatio(value)?.value ?? null;
}

/** The single pipeline every preview, inspector row and chart point goes through. */
export function simulate(
  config: SimulatorConfig,
  original: Size,
  overrides: SimulationOverrides = {},
): Simulation {
  const ratio = selectedSourceRatio(config, overrides.aspectRatio);
  // The technical test image is generated natively at the selected ratio.
  const strategy = config.image.source === "test" ? "native" : config.image.aspectRatioStrategy;
  const originalSize =
    config.image.source === "test" && ratio != null ? testImageSize(ratio) : original;
  const effective = computeEffectiveSource(originalSize.width, originalSize.height, ratio, strategy);

  const viewport = { ...config.viewport, width: overrides.viewportWidth ?? config.viewport.width };
  const container = resolveContainer(config.container, viewport, effective.width / effective.height);
  const { width: Cw, height: Ch } = container.resolved;
  const fit = config.rendering.objectFit;

  const focal = config.image.focalPoint
    ? focalToEffective(config.image.focalPoint, originalSize.width, originalSize.height, effective)
    : null;
  const focalInSource = focal != null && focal.x >= 0 && focal.x <= 1 && focal.y >= 0 && focal.y <= 1;

  let position: UnitPoint = { x: config.rendering.objectPositionX, y: config.rendering.objectPositionY };
  if (focal && focalInSource && config.image.keepFocalCentered) {
    const f = computeFit(effective.width, effective.height, Cw, Ch, fit);
    position = positionForFocalPoint(focal, f.renderedWidth, f.renderedHeight, Cw, Ch);
  }

  const metrics = computeCropMetrics(effective.width, effective.height, Cw, Ch, fit, position.x, position.y);
  const focalVisible =
    focal == null
      ? null
      : focalInSource && isFocalVisible(focal, metrics.visibleSourceRect, effective.width, effective.height);

  return {
    original: originalSize,
    effective,
    container,
    position,
    metrics,
    focal,
    focalInSource,
    focalVisible,
  };
}

/** Test image size for a ratio: 2400px on the long edge. */
export function testImageSize(ratio: number): Size {
  const long = 2400;
  return ratio >= 1
    ? { width: long, height: Math.round(long / ratio) }
    : { width: Math.round(long * ratio), height: long };
}

/** Evenly spaced integer viewport widths including both ends. */
export function viewportSamples(min: number, max: number, count = 96): number[] {
  const lo = Math.round(Math.min(min, max));
  const hi = Math.round(Math.max(min, max));
  if (hi - lo + 1 <= count) return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const out = new Set<number>();
  for (let i = 0; i < count; i++) out.add(Math.round(lo + ((hi - lo) * i) / (count - 1)));
  return [...out].sort((a, b) => a - b);
}
