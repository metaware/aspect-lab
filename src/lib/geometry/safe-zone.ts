import type { Rect, Size, SimulatorConfig } from "@/types/simulator";
import { intersectRects } from "./image-intersection";
import { simulate, viewportSamples } from "./simulate";
import { isFocalVisible } from "./focal-point";

export interface SafeZone {
  /** Region visible at every sampled viewport, in effective-source pixels. Null when nothing is guaranteed. */
  rect: Rect | null;
  /** Union bounding box of visible regions across the range. */
  potentialRect: Rect;
  safePercentage: number;
  sourceSize: Size;
  focalIncluded: boolean | null;
  samples: number;
}

/**
 * Intersects the source-coordinate visible rectangles across a viewport range.
 * Visible rectangles move monotonically with width in practice, but the range
 * is sampled densely (plus both ends) rather than assuming that.
 */
export function computeSafeZone(
  config: SimulatorConfig,
  original: Size,
  minViewport: number,
  maxViewport: number,
): SafeZone {
  const widths = viewportSamples(minViewport, maxViewport, 128);
  let safe: Rect | null = null;
  let union: Rect | null = null;
  let first = true;
  let sourceSize: Size = original;
  let focal = null as ReturnType<typeof simulate>["focal"];

  for (const w of widths) {
    const sim = simulate(config, original, { viewportWidth: w });
    sourceSize = { width: sim.effective.width, height: sim.effective.height };
    focal = sim.focal;
    const v = sim.metrics.visibleSourceRect;
    if (first) {
      safe = v;
      union = v;
      first = false;
    } else {
      safe = safe ? intersectRects(safe, v) : null;
      const u: Rect = union!;
      const x = Math.min(u.x, v.x);
      const y = Math.min(u.y, v.y);
      union = {
        x,
        y,
        width: Math.max(u.x + u.width, v.x + v.width) - x,
        height: Math.max(u.y + u.height, v.y + v.height) - y,
      };
    }
  }

  const area = sourceSize.width * sourceSize.height;
  return {
    rect: safe,
    potentialRect: union ?? { x: 0, y: 0, ...sourceSize },
    safePercentage: safe ? ((safe.width * safe.height) / area) * 100 : 0,
    sourceSize,
    focalIncluded:
      focal == null ? null : safe != null && isFocalVisible(focal, safe, sourceSize.width, sourceSize.height),
    samples: widths.length,
  };
}
