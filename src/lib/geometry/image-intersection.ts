import type { Rect } from "@/types/simulator";

/** Intersection of the rendered image rectangle with the container rectangle. */
export function intersectRendered(
  Cw: number,
  Ch: number,
  offsetX: number,
  offsetY: number,
  Rw: number,
  Rh: number,
): Rect {
  const x = Math.max(0, offsetX);
  const y = Math.max(0, offsetY);
  const width = Math.max(0, Math.min(Cw, offsetX + Rw) - x);
  const height = Math.max(0, Math.min(Ch, offsetY + Rh) - y);
  return { x, y, width, height };
}

/** Rectangle intersection; null when the rectangles do not overlap. */
export function intersectRects(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}
