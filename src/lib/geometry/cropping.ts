import type { CropMetrics, ObjectFit } from "@/types/simulator";
import { computeFit } from "./object-fit";
import { intersectRendered } from "./image-intersection";

/**
 * Full crop / coverage analysis for an effective source rendered in a container.
 * Values keep full floating-point precision; round only for display.
 */
export function computeCropMetrics(
  Iw: number,
  Ih: number,
  Cw: number,
  Ch: number,
  fit: ObjectFit,
  Px = 0.5,
  Py = 0.5,
): CropMetrics {
  const f = computeFit(Iw, Ih, Cw, Ch, fit, Px, Py);
  const { renderedWidth: Rw, renderedHeight: Rh, offsetX, offsetY, scaleX, scaleY } = f;

  const crop = {
    left: Math.max(0, -offsetX),
    right: Math.max(0, offsetX + Rw - Cw),
    top: Math.max(0, -offsetY),
    bottom: Math.max(0, offsetY + Rh - Ch),
  };

  const empty = {
    left: Math.max(0, offsetX),
    right: Math.max(0, Cw - (offsetX + Rw)),
    top: Math.max(0, offsetY),
    bottom: Math.max(0, Ch - (offsetY + Rh)),
  };

  const visible = intersectRendered(Cw, Ch, offsetX, offsetY, Rw, Rh);
  const visibleArea = visible.width * visible.height;

  const imageVisiblePercentage = (visibleArea / (Rw * Rh)) * 100;
  const containerCoveragePercentage = (visibleArea / (Cw * Ch)) * 100;

  const sourceCrop = {
    left: crop.left / scaleX,
    right: crop.right / scaleX,
    top: crop.top / scaleY,
    bottom: crop.bottom / scaleY,
  };

  return {
    ...f,
    containerWidth: Cw,
    containerHeight: Ch,
    crop,
    sourceCrop,
    empty,
    visibleArea,
    imageVisiblePercentage,
    imageCroppedPercentage: 100 - imageVisiblePercentage,
    containerCoveragePercentage,
    emptySpacePercentage: 100 - containerCoveragePercentage,
    visibleSourceRect: {
      x: sourceCrop.left,
      y: sourceCrop.top,
      width: Iw - sourceCrop.left - sourceCrop.right,
      height: Ih - sourceCrop.top - sourceCrop.bottom,
    },
  };
}

export type CropSeverity = "none" | "low" | "moderate" | "severe";

export function cropSeverity(croppedPercentage: number): CropSeverity {
  if (croppedPercentage < 0.05) return "none";
  if (croppedPercentage < 25) return "low";
  if (croppedPercentage < 50) return "moderate";
  return "severe";
}
