import type { ContainerConfig, ResolvedContainer, ViewportConfig, ViewportUnit } from "@/types/simulator";
import { parseRatio } from "@/lib/assets/aspect-ratios";
import { clamp } from "./validate";

const MIN_DIMENSION = 1;

/** Available inline space once outer gutters are removed. */
export function availableWidth(container: ContainerConfig, viewportWidth: number): number {
  return Math.max(MIN_DIMENSION, viewportWidth - 2 * Math.max(0, container.horizontalGutter));
}

/** Width of a CSS grid track span: (avail − gaps) / cols × span + inner gaps. */
export function gridSpanWidth(available: number, columns: number, span: number, gap: number): number {
  const cols = Math.max(1, Math.round(columns));
  const s = clamp(Math.round(span), 1, cols);
  const column = (available - (cols - 1) * gap) / cols;
  return column * s + (s - 1) * gap;
}

export function requestedWidth(container: ContainerConfig, viewportWidth: number): number {
  const available = availableWidth(container, viewportWidth);
  switch (container.widthMode) {
    case "full":
      return available;
    case "percent":
      return (available * container.widthPercent) / 100;
    case "fixed":
      return container.fixedWidth;
    case "max":
      return Math.min(available, container.maxWidth);
    case "grid":
      return gridSpanWidth(available, container.gridColumns, container.gridSpan, container.gridGap);
  }
}

/** Height basis for each viewport-relative unit in the simulated viewport. */
export function viewportUnitBasis(unit: ViewportUnit, viewport: ViewportConfig): number {
  const large = viewport.height;
  const small = Math.max(MIN_DIMENSION, viewport.height - Math.max(0, viewport.browserChrome));
  switch (unit) {
    case "vh":
    case "lvh":
      return large;
    case "svh":
    case "dvh":
      // dvh is shown in its "toolbars expanded" state, matching svh.
      return small;
  }
}

export function requestedHeight(
  container: ContainerConfig,
  width: number,
  viewport: ViewportConfig,
  effectiveImageRatio: number,
): number {
  switch (container.heightMode) {
    case "fixed":
      return container.height;
    case "aspect": {
      const r = parseRatio(container.aspectRatio)?.value ?? 16 / 9;
      return width / r;
    }
    case "auto":
      return width / effectiveImageRatio;
    case "viewport":
      return (container.viewportHeightValue / 100) * viewportUnitBasis(container.viewportUnit, viewport);
    case "fluid":
      return clamp((container.fluidPreferredVw / 100) * viewport.width, container.fluidMin, container.fluidMax);
    case "content":
      return container.contentHeight + 2 * container.contentPadding;
  }
}

function applyRange(value: number, min: number | null, max: number | null): number {
  let v = value;
  if (max != null && max > 0) v = Math.min(v, max);
  // CSS: min-* wins over max-* when they conflict.
  if (min != null && min > 0) v = Math.max(v, min);
  return v;
}

/**
 * Resolves the container box for a viewport. Width is resolved first (with
 * min/max-width), then height from the resolved width (with min/max-height).
 */
export function resolveContainer(
  container: ContainerConfig,
  viewport: ViewportConfig,
  effectiveImageRatio: number,
): ResolvedContainer {
  const available = availableWidth(container, viewport.width);
  const reqW = Math.max(MIN_DIMENSION, requestedWidth(container, viewport.width));
  const resW = Math.max(MIN_DIMENSION, applyRange(reqW, container.minWidth, container.maxWidthConstraint));
  const reqH = Math.max(MIN_DIMENSION, requestedHeight(container, resW, viewport, effectiveImageRatio));
  const resH = Math.max(MIN_DIMENSION, applyRange(reqH, container.minHeight, container.maxHeight));
  return {
    requested: { width: reqW, height: reqH },
    resolved: { width: resW, height: resH },
    availableWidth: available,
  };
}
