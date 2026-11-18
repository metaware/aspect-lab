import type { ImageFormat, Size, SimulatorConfig } from "@/types/simulator";
import { BREAKPOINT_MARKERS } from "@/lib/assets/device-presets";
import { assetResolution, bestPreset, sampleWidths, type RatioEvaluation } from "./aspect-ratio-optimizer";

export interface PlannedAsset {
  min: number;
  max: number;
  ratioLabel: string;
  ratio: number;
  worstCrop: number;
  averageCrop: number;
  size: Size;
}

export interface AssetPlan {
  assets: PlannedAsset[];
  worstCrop: number;
  toleranceMet: boolean;
  /** Fewest variants that would meet the tolerance, if achievable with the candidate splits. */
  variantsNeeded: number | null;
  formats: ImageFormat[];
  devicePixelRatio: number;
  warnings: string[];
}

/**
 * Splits [minViewport, maxViewport] into at most `maxVariants` contiguous
 * ranges (cutting only at configured or standard breakpoints) so that the
 * worst-case cropping of each range's best standard ratio is minimized.
 * Uses the fewest variants that satisfy the cropping tolerance.
 */
export function planAssets(config: SimulatorConfig, original: Size): AssetPlan {
  const { minViewport, maxViewport, maxCropTolerance, maxVariants, devicePixelRatio, formats, preferredViewport } =
    config.analysis;
  const lo = Math.min(minViewport, maxViewport);
  const hi = Math.max(minViewport, maxViewport);

  const cutSet = new Set<number>();
  for (const b of config.analysis.breakpoints) {
    cutSet.add(b.min);
    cutSet.add(b.max + 1);
  }
  for (const m of [480, ...BREAKPOINT_MARKERS.map((b) => b.width)]) cutSet.add(m);
  const cuts = [lo, ...[...cutSet].filter((c) => c > lo && c <= hi).sort((a, b) => a - b), hi + 1];
  const n = cuts.length - 1;

  const cache = new Map<string, RatioEvaluation>();
  const segment = (i: number, j: number) => {
    const key = `${i}-${j}`;
    let e = cache.get(key);
    if (!e) {
      const range = { min: cuts[i], max: cuts[j] - 1 };
      e = bestPreset(config, original, sampleWidths(range), "worst-case", preferredViewport);
      cache.set(key, e);
    }
    return e;
  };

  // dp[k][j]: best worst-case crop covering segments [0, j) with k assets.
  const K = Math.min(Math.max(1, maxVariants), n);
  const dp: number[][] = Array.from({ length: K + 1 }, () => Array(n + 1).fill(Infinity));
  const prev: number[][] = Array.from({ length: K + 1 }, () => Array(n + 1).fill(-1));
  dp[0][0] = 0;
  for (let k = 1; k <= K; k++) {
    for (let j = 1; j <= n; j++) {
      for (let i = k - 1; i < j; i++) {
        if (!Number.isFinite(dp[k - 1][i])) continue;
        const v = Math.max(dp[k - 1][i], segment(i, j).max);
        if (v < dp[k][j] - 1e-9) {
          dp[k][j] = v;
          prev[k][j] = i;
        }
      }
    }
  }

  let chosenK = K;
  let variantsNeeded: number | null = null;
  for (let k = 1; k <= K; k++) {
    if (dp[k][n] <= maxCropTolerance + 1e-9) {
      chosenK = k;
      variantsNeeded = k;
      break;
    }
  }

  const assets: PlannedAsset[] = [];
  let j = n;
  for (let k = chosenK; k >= 1; k--) {
    const i = prev[k][j];
    const e = segment(i, j);
    assets.unshift({
      min: cuts[i],
      max: cuts[j] - 1,
      ratioLabel: e.label,
      ratio: e.ratio,
      worstCrop: e.max,
      averageCrop: e.average,
      size: assetResolution(e.maxRendered, e.ratio, devicePixelRatio),
    });
    j = i;
  }

  // Merge neighbours that ended up with the same ratio.
  const merged: PlannedAsset[] = [];
  for (const a of assets) {
    const last = merged[merged.length - 1];
    if (last && last.ratioLabel === a.ratioLabel) {
      last.max = a.max;
      last.worstCrop = Math.max(last.worstCrop, a.worstCrop);
      last.size = {
        width: Math.max(last.size.width, a.size.width),
        height: Math.max(last.size.height, a.size.height),
      };
    } else merged.push({ ...a, size: { ...a.size } });
  }

  const worstCrop = Math.max(...merged.map((a) => a.worstCrop));
  const toleranceMet = worstCrop <= maxCropTolerance + 1e-9;
  const warnings: string[] = [];
  if (!toleranceMet) {
    warnings.push(
      `A maximum of ${maxCropTolerance}% cropping cannot be achieved with ${maxVariants} variant${maxVariants === 1 ? "" : "s"}. ` +
        `The best plan crops up to ${worstCrop.toFixed(1)}%. Allow more variants, raise the tolerance, or change the container sizing.`,
    );
  }
  if (merged.some((a) => a.size.width > 4096 || a.size.height > 4096)) {
    warnings.push("Some assets exceed 4096px. Consider capping DPR for very large viewports.");
  }

  return { assets: merged, worstCrop, toleranceMet, variantsNeeded, formats, devicePixelRatio, warnings };
}
