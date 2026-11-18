import type { ChartMetric, Size, SimulatorConfig } from "@/types/simulator";
import { simulate, viewportSamples } from "@/lib/geometry/simulate";
import type { CropMetrics } from "@/types/simulator";

export const METRIC_LABELS: Record<ChartMetric, { label: string; unit: string; short: string }> = {
  cropped: { label: "Image cropped", unit: "%", short: "Cropped" },
  visible: { label: "Image visible", unit: "%", short: "Visible" },
  coverage: { label: "Container coverage", unit: "%", short: "Coverage" },
  scale: { label: "Rendered image scale", unit: "×", short: "Scale" },
  resolution: { label: "Required source width at DPR", unit: "px", short: "Source px" },
};

export function metricValue(m: CropMetrics, metric: ChartMetric, dpr: number): number {
  switch (metric) {
    case "cropped":
      return m.imageCroppedPercentage;
    case "visible":
      return m.imageVisiblePercentage;
    case "coverage":
      return m.containerCoveragePercentage;
    case "scale":
      return Math.max(m.scaleX, m.scaleY);
    case "resolution":
      return m.renderedWidth * dpr;
  }
}

export type SeriesRow = { vw: number } & Record<string, number>;

/** One row per sampled viewport width, one column per compared ratio. */
export function computeSeries(
  config: SimulatorConfig,
  original: Size,
  ratios: string[],
  metric: ChartMetric,
  count = 120,
): SeriesRow[] {
  const widths = viewportSamples(config.analysis.minViewport, config.analysis.maxViewport, count);
  return widths.map((vw) => {
    const row: SeriesRow = { vw };
    for (const r of ratios) {
      const m = simulate(config, original, { viewportWidth: vw, aspectRatio: r }).metrics;
      row[r] = metricValue(m, metric, config.analysis.devicePixelRatio);
    }
    return row;
  });
}

export function seriesToCsv(
  config: SimulatorConfig,
  original: Size,
  ratios: string[],
): string {
  const widths = viewportSamples(config.analysis.minViewport, config.analysis.maxViewport, 100000);
  const header = ["viewport_width", "aspect_ratio", "container_width", "container_height", "rendered_width", "rendered_height", "visible_pct", "cropped_pct", "coverage_pct", "crop_top", "crop_right", "crop_bottom", "crop_left"];
  const lines = [header.join(",")];
  for (const r of ratios) {
    for (const vw of widths) {
      const m = simulate(config, original, { viewportWidth: vw, aspectRatio: r }).metrics;
      lines.push(
        [vw, r, m.containerWidth, m.containerHeight, m.renderedWidth, m.renderedHeight, m.imageVisiblePercentage, m.imageCroppedPercentage, m.containerCoveragePercentage, m.crop.top, m.crop.right, m.crop.bottom, m.crop.left]
          .map((v) => (typeof v === "number" ? Number(v.toFixed(4)) : v))
          .join(","),
      );
    }
  }
  return lines.join("\n");
}
