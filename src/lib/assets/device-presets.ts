export interface ViewportPresetGroup {
  label: string;
  widths: number[];
  boundary?: boolean;
}

export const VIEWPORT_PRESETS: ViewportPresetGroup[] = [
  { label: "Small mobile", widths: [320, 360, 375] },
  { label: "Mobile", widths: [390, 393, 414, 430] },
  { label: "Large mobile", widths: [480, 600, 640] },
  { label: "Mobile boundary", widths: [767], boundary: true },
  { label: "Tablet", widths: [768, 820, 834, 1024] },
  { label: "Laptop", widths: [1280, 1366, 1440] },
  { label: "Desktop boundary", widths: [1535], boundary: true },
  { label: "Desktop", widths: [1536, 1600, 1920] },
  { label: "Large desktop", widths: [2560, 3840] },
];

/** Common viewport heights paired with preset widths (used when picking a preset). */
export const PRESET_HEIGHTS: Record<number, number> = {
  320: 568,
  360: 800,
  375: 812,
  390: 844,
  393: 852,
  414: 896,
  430: 932,
  480: 854,
  600: 960,
  640: 960,
  767: 1024,
  768: 1024,
  820: 1180,
  834: 1194,
  1024: 1366,
  1280: 800,
  1366: 768,
  1440: 900,
  1535: 864,
  1536: 864,
  1600: 900,
  1920: 1080,
  2560: 1440,
  3840: 2160,
};

/** Breakpoint markers drawn on charts and rulers. */
export const BREAKPOINT_MARKERS = [
  { width: 640, label: "sm" },
  { width: 768, label: "md" },
  { width: 1024, label: "lg" },
  { width: 1280, label: "xl" },
  { width: 1536, label: "2xl" },
];

export const DEVICE_PIXEL_RATIOS = [1, 1.5, 2, 3] as const;
