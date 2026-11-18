import type { AspectRatioStrategy, EffectiveSource, Rect, UnitPoint } from "@/types/simulator";
import { assertDimension, clamp } from "./validate";

/**
 * Derives the conceptual source asset from the original image.
 * - native: original unchanged
 * - crop: largest region of the original matching `ratio`, placed by
 *   `cropPosition` (0–1 per axis, like object-position; 0.5 = centered)
 * - distort: original resampled (never upscaled) to `ratio`
 */
export function computeEffectiveSource(
  originalWidth: number,
  originalHeight: number,
  ratio: number | null,
  strategy: AspectRatioStrategy,
  cropPosition: UnitPoint = { x: 0.5, y: 0.5 },
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
    const rect: Rect = {
      x: (originalWidth - w) * clamp(cropPosition.x, 0, 1),
      y: (originalHeight - h) * clamp(cropPosition.y, 0, 1),
      width: w,
      height: h,
    };
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

/**
 * Crop position (0–1 per axis) that centers the crop box on a focal point,
 * clamped so the box stays inside the original. Axes with no slack return 0.5.
 */
export function cropPositionForFocalPoint(
  focal: UnitPoint,
  originalWidth: number,
  originalHeight: number,
  ratio: number,
): UnitPoint {
  const nativeRatio = originalWidth / originalHeight;
  const w = nativeRatio > ratio ? originalHeight * ratio : originalWidth;
  const h = nativeRatio > ratio ? originalHeight : originalWidth / ratio;
  const axis = (f: number, full: number, size: number) =>
    full - size < 1e-9 ? 0.5 : clamp((f * full - size / 2) / (full - size), 0, 1);
  return { x: axis(focal.x, originalWidth, w), y: axis(focal.y, originalHeight, h) };
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
