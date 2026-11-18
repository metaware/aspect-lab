import type { SimulatorConfig } from "@/types/simulator";

export const CONFIG_VERSION = 1 as const;

export const VIEWPORT_MIN = 320;
export const VIEWPORT_MAX = 3840;

export const DEFAULT_BREAKPOINTS = [
  { id: "bp-mobile", min: 360, max: 767 },
  { id: "bp-tablet", min: 768, max: 1023 },
  { id: "bp-laptop", min: 1024, max: 1535 },
  { id: "bp-desktop", min: 1536, max: 1920 },
];

export const DEFAULT_COMPARISON_WIDTHS = [360, 390, 430, 767, 1024, 1440, 1535];

export function createDefaultConfig(): SimulatorConfig {
  return {
    version: CONFIG_VERSION,
    viewport: { width: 390, height: 844, browserChrome: 0 },
    image: {
      source: "sample",
      sampleId: "landscape",
      url: "",
      aspectRatio: "9:16",
      aspectRatioStrategy: "crop",
      focalPoint: null,
      keepFocalCentered: false,
    },
    container: {
      widthMode: "full",
      horizontalGutter: 0,
      widthPercent: 100,
      fixedWidth: 640,
      maxWidth: 1280,
      gridColumns: 12,
      gridSpan: 6,
      gridGap: 24,
      heightMode: "fixed",
      height: 640,
      aspectRatio: "16:9",
      viewportHeightValue: 75,
      viewportUnit: "svh",
      fluidMin: 320,
      fluidPreferredVw: 50,
      fluidMax: 640,
      contentHeight: 360,
      contentPadding: 48,
      minHeight: null,
      maxHeight: null,
      minWidth: null,
      maxWidthConstraint: null,
      background: "#18181b",
    },
    rendering: { objectFit: "cover", objectPositionX: 0.5, objectPositionY: 0.5 },
    workspace: {
      zoom: 0.5,
      zoomMode: "manual",
      view: "component",
      showDimensions: true,
      showCropOverlay: true,
      showGrid: true,
      showRulers: false,
      showSafeZone: false,
      showOutline: true,
    },
    analysis: {
      minViewport: 360,
      maxViewport: 1535,
      devicePixelRatio: 2,
      chartMetric: "cropped",
      compareRatios: ["9:16", "4:5", "1:1", "16:9"],
      breakpoints: DEFAULT_BREAKPOINTS.map((b) => ({ ...b })),
      strategy: "worst-case",
      preferredViewport: 390,
      comparisonMode: "viewports",
      comparisonWidths: [...DEFAULT_COMPARISON_WIDTHS],
      comparisonRatios: ["9:16", "4:5", "1:1", "4:3", "16:9"],
      maxCropTolerance: 35,
      maxVariants: 4,
      formats: ["avif", "webp"],
      codeFormat: "html",
    },
    overlay: {
      enabled: false,
      heading: "Find your next horizon",
      description: "Curated journeys through the world's most dramatic landscapes.",
      showDescription: true,
      primaryCta: "Start exploring",
      showPrimaryCta: true,
      secondaryCta: "Learn more",
      showSecondaryCta: true,
      showLogo: false,
      showBadge: true,
      badge: "New season",
      scrim: "gradient",
      gradientDirection: "to-top",
      opacity: 0.6,
      textColor: "#ffffff",
      alignX: "start",
      alignY: "end",
      padding: 32,
      maxContentWidth: 520,
    },
  };
}
