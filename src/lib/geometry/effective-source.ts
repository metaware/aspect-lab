import type { AspectRatioStrategy, EffectiveSource, Rect, UnitPoint } from "@/types/simulator";
import { assertDimension } from "./validate";

/**
 * Derives the conceptual source asset from the original image.
 * - native: original unchanged
 * - crop: largest centered region of the original matching `ratio`
 * - distort: original resampled (never upscaled) to `ratio`
 */
export function computeEffectiveSource(
  originalWidth: number,
  originalHeight: number,
  ratio: number | null,
  strategy: AspectRatioStrategy,
): EffectiveSource {
  assertDimension(originalWidth, "original width");
  assertDimension(originalHeight, "original height");
  const full: Rect = { x: 0, y: 0, width: originalWidth, height: originalHeight };
  const nativeRatio = originalWidth / originalHeight;

  if (strategy === "native" || ratio == null || Math.abs(ratio - nativeRatio) < 1e-9) {
    return {
      width: originalWidth,
      height: originalHeight,
      strategy: ratio == null ? "native" : strategy,
      sourceRect: full,
      sourceCroppedPercentage: 0,
      distorted: false,
    };
  }

  if (strategy === "crop") {
    let w = originalWidth;
    let h = originalHeight;
    if (nativeRatio > ratio) w = originalHeight * ratio;
    else h = originalWidth / ratio;
    const rect: Rect = { x: (originalWidth - w) / 2, y: (originalHeight - h) / 2, width: w, height: h };
    return {
      width: w,
      height: h,
      strategy,
      sourceRect: rect,
      sourceCroppedPercentage: (1 - (w * h) / (originalWidth * originalHeight)) * 100,
      distorted: false,
    };
  }

  const w = Math.min(originalWidth, originalHeight * ratio);
  return {
    width: w,
    height: w / ratio,
    strategy,
    sourceRect: full,
    sourceCroppedPercentage: 0,
    distorted: true,
  };
}

/** Maps a focal point from original-image fractions into effective-source fractions. */
export function focalToEffective(
  focal: UnitPoint,
  originalWidth: number,
  originalHeight: number,
  source: EffectiveSource,
): UnitPoint {
  const r = source.sourceRect;
  return {
    x: (focal.x * originalWidth - r.x) / r.width,
    y: (focal.y * originalHeight - r.y) / r.height,
  };
}
