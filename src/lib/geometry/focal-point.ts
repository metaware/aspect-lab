import type { UnitPoint } from "@/types/simulator";
import { clamp } from "./validate";

/**
 * Object-position (0–1) that places a focal point (in effective-source
 * fractions) as close as possible to the container center. When the rendered
 * image is the same size as the container along an axis, position has no
 * effect and 0.5 is returned.
 */
export function positionForFocalPoint(
  focal: UnitPoint,
  Rw: number,
  Rh: number,
  Cw: number,
  Ch: number,
): UnitPoint {
  return {
    x: axisPosition(focal.x, Rw, Cw),
    y: axisPosition(focal.y, Rh, Ch),
  };
}

function axisPosition(f: number, rendered: number, container: number): number {
  const slack = container - rendered;
  if (Math.abs(slack) < 1e-9) return 0.5;
  // offset = slack * P, and we want offset + f * rendered = container / 2
  const ideal = (container / 2 - f * rendered) / slack;
  return clamp(ideal, 0, 1);
}

/** Whether a focal point (effective-source fractions) is inside a visible source rect. */
export function isFocalVisible(
  focal: UnitPoint,
  visible: { x: number; y: number; width: number; height: number },
  Iw: number,
  Ih: number,
): boolean {
  const fx = focal.x * Iw;
  const fy = focal.y * Ih;
  const eps = 1e-6;
  return (
    fx >= visible.x - eps &&
    fx <= visible.x + visible.width + eps &&
    fy >= visible.y - eps &&
    fy <= visible.y + visible.height + eps
  );
}
