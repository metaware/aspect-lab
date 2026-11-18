import type { BreakpointRange, OptimizationStrategy, Size, SimulatorConfig } from "@/types/simulator";
import { ALL_ASPECT_RATIO_PRESETS, formatDecimal, type AspectRatioPreset } from "@/lib/assets/aspect-ratios";
import { simulate, viewportSamples } from "@/lib/geometry/simulate";
import { clamp } from "@/lib/geometry/validate";

export interface RangeStats {
  min: number;
  max: number;
  average: number;
  /** Cropping at the preferred viewport (clamped into the range). */
  atPreferred: number;
}

export interface RatioEvaluation extends RangeStats {
  ratio: number;
  label: string;
  /** Largest rendered image size across the range (CSS px). */
  maxRendered: Size;
}

export interface BreakpointRecommendation {
  range: BreakpointRange;
  /** Cropping of the currently selected source ratio over this range. */
  current: RangeStats;
  /** Mathematically optimal ratio for the chosen strategy. */
  optimal: RatioEvaluation;
  /** Best standard preset by actual cropping performance. */
  standard: RatioEvaluation;
  /** Minimum asset resolution for the standard ratio at the target DPR. */
  assetSize: Size;
  closedForm: boolean;
}

const SEARCH_MIN = 0.2;
const SEARCH_MAX = 5;

/**
 * Evaluates a candidate source ratio across viewport samples, using the full
 * configuration (width/height modes, fit, position, focal point).
 * Candidates are evaluated with the crop strategy: the asset is authored at the ratio.
 */
export function evaluateRatio(
  config: SimulatorConfig,
  original: Size,
  ratio: number,
  widths: number[],
  preferredViewport: number,
  label = `${formatDecimal(ratio)}:1`,
): RatioEvaluation {
  const asCrop: SimulatorConfig =
    config.image.aspectRatioStrategy === "native"
      ? { ...config, image: { ...config.image, aspectRatioStrategy: "crop" } }
      : config;
  const ar = `${ratio}:1`;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let maxW = 0;
  let maxH = 0;
  for (const w of widths) {
    const m = simulate(asCrop, original, { viewportWidth: w, aspectRatio: ar }).metrics;
    const c = m.imageCroppedPercentage;
    min = Math.min(min, c);
    max = Math.max(max, c);
    sum += c;
    maxW = Math.max(maxW, m.renderedWidth);
    maxH = Math.max(maxH, m.renderedHeight);
  }
  const pv = clamp(preferredViewport, widths[0], widths[widths.length - 1]);
  const atPreferred = simulate(asCrop, original, { viewportWidth: pv, aspectRatio: ar }).metrics.imageCroppedPercentage;
  return { ratio, label, min, max, average: sum / widths.length, atPreferred, maxRendered: { width: maxW, height: maxH } };
}

function objective(e: RatioEvaluation, strategy: OptimizationStrategy): number {
  switch (strategy) {
    case "average":
      return e.average + e.max * 1e-6;
    case "preferred":
      return e.atPreferred + e.max * 1e-6;
    case "worst-case":
    case "fewest-assets":
      return e.max + e.average * 1e-6;
  }
}

/**
 * Exact optimum for fixed-height, full-width (gutter-aware), cover with no
 * width/height constraints: the geometric mean of container widths over height.
 */
export function closedFormOptimalRatio(config: SimulatorConfig, minViewport: number, maxViewport: number): number | null {
  const c = config.container;
  const eligible =
    config.rendering.objectFit === "cover" &&
    c.heightMode === "fixed" &&
    c.widthMode === "full" &&
    c.minWidth == null &&
    c.maxWidthConstraint == null &&
    c.minHeight == null &&
    c.maxHeight == null;
  if (!eligible) return null;
  const a = Math.max(1, minViewport - 2 * c.horizontalGutter);
  const b = Math.max(1, maxViewport - 2 * c.horizontalGutter);
  return Math.sqrt(a * b) / c.height;
}

export function sampleWidths(range: { min: number; max: number }): number[] {
  return viewportSamples(range.min, range.max, 48);
}

/** Log-scale grid search followed by golden-section refinement. */
export function searchOptimalRatio(
  config: SimulatorConfig,
  original: Size,
  widths: number[],
  strategy: OptimizationStrategy,
  preferredViewport: number,
): RatioEvaluation {
  const evalAt = (r: number) => evaluateRatio(config, original, r, widths, preferredViewport);
  const steps = 80;
  let best = evalAt(SEARCH_MIN);
  let bestIndex = 0;
  for (let i = 1; i <= steps; i++) {
    const r = SEARCH_MIN * Math.pow(SEARCH_MAX / SEARCH_MIN, i / steps);
    const e = evalAt(r);
    if (objective(e, strategy) < objective(best, strategy)) {
      best = e;
      bestIndex = i;
    }
  }
  const step = Math.log(SEARCH_MAX / SEARCH_MIN) / steps;
  let lo = Math.log(SEARCH_MIN) + Math.max(0, bestIndex - 1) * step;
  let hi = Math.log(SEARCH_MIN) + Math.min(steps, bestIndex + 1) * step;
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 28; i++) {
    const m1 = hi - phi * (hi - lo);
    const m2 = lo + phi * (hi - lo);
    if (objective(evalAt(Math.exp(m1)), strategy) <= objective(evalAt(Math.exp(m2)), strategy)) hi = m2;
    else lo = m1;
  }
  const refined = evalAt(Math.exp((lo + hi) / 2));
  return objective(refined, strategy) <= objective(best, strategy) ? refined : best;
}

export function bestPreset(
  config: SimulatorConfig,
  original: Size,
  widths: number[],
  strategy: OptimizationStrategy,
  preferredViewport: number,
  presets: AspectRatioPreset[] = ALL_ASPECT_RATIO_PRESETS,
): RatioEvaluation {
  let best: RatioEvaluation | null = null;
  for (const p of presets) {
    const e = evaluateRatio(config, original, p.width / p.height, widths, preferredViewport, p.label);
    if (!best || objective(e, strategy) < objective(best, strategy) - 1e-9) best = e;
  }
  return best!;
}

/** Minimum asset size at `ratio` covering the largest rendered size × DPR, rounded up. */
export function assetResolution(maxRendered: Size, ratio: number, dpr: number): Size {
  const needW = maxRendered.width * dpr;
  const needH = maxRendered.height * dpr;
  const width = Math.ceil(Math.max(needW, needH * ratio) - 1e-6);
  return { width, height: Math.ceil(width / ratio - 1e-6) };
}

export function recommendForBreakpoints(config: SimulatorConfig, original: Size): BreakpointRecommendation[] {
  const { strategy, preferredViewport, devicePixelRatio } = config.analysis;
  const ranges = config.analysis.breakpoints
    .map((b) => ({ ...b, min: Math.min(b.min, b.max), max: Math.max(b.min, b.max) }))
    .sort((a, b) => a.min - b.min);
  if (ranges.length === 0) return [];

  // "Fewest assets": a single ratio across the union of all ranges.
  const union = { min: ranges[0].min, max: Math.max(...ranges.map((r) => r.max)) };
  const shared =
    strategy === "fewest-assets"
      ? {
          optimal: searchOptimalRatio(config, original, sampleWidths(union), strategy, preferredViewport),
          standard: bestPreset(config, original, sampleWidths(union), strategy, preferredViewport),
        }
      : null;

  return ranges.map((range) => {
    const widths = sampleWidths(range);
    const currentRatio = simulate(config, original, { viewportWidth: range.min });
    const current = evaluateRatio(
      config,
      original,
      currentRatio.effective.width / currentRatio.effective.height,
      widths,
      preferredViewport,
    );
    const closed = strategy === "worst-case" ? closedFormOptimalRatio(config, range.min, range.max) : null;
    let optimal: RatioEvaluation;
    if (shared) optimal = evaluateRatio(config, original, shared.optimal.ratio, widths, preferredViewport);
    else if (closed != null) optimal = evaluateRatio(config, original, closed, widths, preferredViewport);
    else optimal = searchOptimalRatio(config, original, widths, strategy, preferredViewport);

    const standard = shared
      ? evaluateRatio(config, original, shared.standard.ratio, widths, preferredViewport, shared.standard.label)
      : bestPreset(config, original, widths, strategy, preferredViewport);

    return {
      range,
      current,
      optimal,
      standard,
      assetSize: assetResolution(standard.maxRendered, standard.ratio, devicePixelRatio),
      closedForm: closed != null && !shared,
    };
  });
}
