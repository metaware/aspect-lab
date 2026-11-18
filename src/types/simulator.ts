export type ObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down";
export type AspectRatioStrategy = "native" | "crop" | "distort";
export type ImageSourceKind = "sample" | "upload" | "url" | "test";
export type WidthMode = "full" | "percent" | "fixed" | "max" | "grid";
export type HeightMode = "fixed" | "aspect" | "auto" | "viewport" | "fluid" | "content";
export type ViewportUnit = "vh" | "svh" | "dvh" | "lvh";
export type DevicePixelRatio = 1 | 1.5 | 2 | 3;
export type ChartMetric = "cropped" | "visible" | "coverage" | "scale" | "resolution";
export type OptimizationStrategy = "worst-case" | "average" | "preferred" | "fewest-assets";
export type ComparisonMode = "viewports" | "ratios";
export type PreviewView = "component" | "source" | "split";
export type CodeFormat = "html" | "tailwind" | "react" | "next" | "picture";
export type ContentAlign = "start" | "center" | "end";
export type GradientDirection = "to-top" | "to-bottom" | "to-left" | "to-right";
export type ImageFormat = "avif" | "webp" | "jpeg";

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A 2D point expressed as fractions (0–1) of a reference box. */
export interface UnitPoint {
  x: number;
  y: number;
}

export interface BreakpointRange {
  id: string;
  min: number;
  max: number;
}

export interface ContainerConfig {
  widthMode: WidthMode;
  /** Gutter applied to each side of the viewport. */
  horizontalGutter: number;
  widthPercent: number;
  fixedWidth: number;
  maxWidth: number;
  gridColumns: number;
  gridSpan: number;
  gridGap: number;
  heightMode: HeightMode;
  height: number;
  aspectRatio: string;
  viewportHeightValue: number;
  viewportUnit: ViewportUnit;
  fluidMin: number;
  fluidPreferredVw: number;
  fluidMax: number;
  contentHeight: number;
  contentPadding: number;
  minHeight: number | null;
  maxHeight: number | null;
  minWidth: number | null;
  maxWidthConstraint: number | null;
  background: string;
}

export interface ViewportConfig {
  width: number;
  height: number;
  /** Simulated browser UI (address bar, toolbars) subtracted for svh/dvh. */
  browserChrome: number;
}

export interface SimulatorConfig {
  version: 1;
  viewport: ViewportConfig;
  image: {
    source: ImageSourceKind;
    sampleId: string;
    url: string;
    /** "native" or "W:H" */
    aspectRatio: string;
    aspectRatioStrategy: AspectRatioStrategy;
    /** Focal point in original image coordinates (0–1). */
    focalPoint: UnitPoint | null;
    keepFocalCentered: boolean;
    /**
     * Where the "crop to selected ratio" box sits inside the original (0–1 on
     * each axis, like object-position). Independent of the container's
     * object-position, which applies afterwards.
     */
    sourceCropX: number;
    sourceCropY: number;
  };
  container: ContainerConfig;
  rendering: {
    objectFit: ObjectFit;
    objectPositionX: number;
    objectPositionY: number;
  };
  workspace: {
    zoom: number;
    zoomMode: "manual" | "fit";
    view: PreviewView;
    showDimensions: boolean;
    showCropOverlay: boolean;
    showGrid: boolean;
    showRulers: boolean;
    showSafeZone: boolean;
    showOutline: boolean;
  };
  analysis: {
    minViewport: number;
    maxViewport: number;
    devicePixelRatio: DevicePixelRatio;
    chartMetric: ChartMetric;
    compareRatios: string[];
    breakpoints: BreakpointRange[];
    strategy: OptimizationStrategy;
    preferredViewport: number;
    comparisonMode: ComparisonMode;
    comparisonWidths: number[];
    comparisonRatios: string[];
    maxCropTolerance: number;
    maxVariants: number;
    formats: ImageFormat[];
    codeFormat: CodeFormat;
  };
  overlay: {
    enabled: boolean;
    heading: string;
    description: string;
    showDescription: boolean;
    primaryCta: string;
    showPrimaryCta: boolean;
    secondaryCta: string;
    showSecondaryCta: boolean;
    showLogo: boolean;
    showBadge: boolean;
    badge: string;
    scrim: "none" | "gradient" | "dark";
    gradientDirection: GradientDirection;
    opacity: number;
    textColor: string;
    alignX: ContentAlign;
    alignY: ContentAlign;
    padding: number;
    maxContentWidth: number;
  };
}

/** Intrinsic facts about the loaded original image. */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string | null;
  fileSize: number | null;
  name: string | null;
}

/** The conceptual source asset after applying the aspect ratio strategy. */
export interface EffectiveSource {
  width: number;
  height: number;
  strategy: AspectRatioStrategy;
  /** Region of the original image used for the asset, in original pixels. */
  sourceRect: Rect;
  /** Percentage of the original image discarded to produce the asset. */
  sourceCroppedPercentage: number;
  distorted: boolean;
}

export interface ResolvedContainer {
  requested: Size;
  resolved: Size;
  availableWidth: number;
}

export interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FitResult {
  renderedWidth: number;
  renderedHeight: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface CropMetrics extends FitResult {
  containerWidth: number;
  containerHeight: number;
  /** Crop in rendered CSS pixels. */
  crop: Edges;
  /** Crop in effective-source pixels. */
  sourceCrop: Edges;
  /** Empty container space on each edge in CSS pixels. */
  empty: Edges;
  visibleArea: number;
  imageVisiblePercentage: number;
  imageCroppedPercentage: number;
  containerCoveragePercentage: number;
  emptySpacePercentage: number;
  /** Visible region in effective-source pixel coordinates. */
  visibleSourceRect: Rect;
}
