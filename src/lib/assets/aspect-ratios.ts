export interface AspectRatioPreset {
  label: string;
  width: number;
  height: number;
}

export interface AspectRatioCategory {
  id: "portrait" | "square" | "landscape" | "ultrawide";
  label: string;
  presets: AspectRatioPreset[];
}

function p(label: string): AspectRatioPreset {
  const [w, h] = label.split(":").map(Number);
  return { label, width: w, height: h };
}

export const ASPECT_RATIO_CATEGORIES: AspectRatioCategory[] = [
  {
    id: "portrait",
    label: "Portrait",
    presets: ["1:3", "1:2", "9:19.5", "9:16", "3:5", "5:8", "2:3", "5:7", "3:4", "4:5", "5:6", "7:8"].map(p),
  },
  { id: "square", label: "Square", presets: [p("1:1")] },
  {
    id: "landscape",
    label: "Landscape",
    presets: ["8:7", "6:5", "5:4", "4:3", "3:2", "8:5", "5:3", "16:9", "17:9", "18:9", "2:1"].map(p),
  },
  {
    id: "ultrawide",
    label: "Ultrawide",
    presets: ["21:9", "2.35:1", "2.39:1", "24:10", "32:9", "3:1", "4:1"].map(p),
  },
];

export const ALL_ASPECT_RATIO_PRESETS: AspectRatioPreset[] = ASPECT_RATIO_CATEGORIES.flatMap((c) => c.presets);

/** Quick-pick ratios shown as chips in the configuration panel. */
export const QUICK_RATIOS = ["9:16", "2:3", "4:5", "1:1", "4:3", "16:9"];

export interface ParsedRatio {
  width: number;
  height: number;
  value: number;
}

/** Parses "W:H", "W/H", "WxH" or a decimal string. Returns null when invalid. */
export function parseRatio(input: string | null | undefined): ParsedRatio | null {
  if (!input) return null;
  const s = input.trim();
  const parts = s.split(/\s*[:/x×]\s*/i);
  let w: number;
  let h: number;
  if (parts.length === 2) {
    w = Number(parts[0]);
    h = Number(parts[1]);
  } else if (parts.length === 1) {
    w = Number(parts[0]);
    h = 1;
  } else {
    return null;
  }
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { width: w, height: h, value: w / h };
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Normalizes integer ratios (1920:1080 → 16:9). Decimal ratios are reduced to "x:1". */
export function normalizeRatio(width: number, height: number): string {
  if (Number.isInteger(width) && Number.isInteger(height)) {
    const d = gcd(width, height);
    return `${width / d}:${height / d}`;
  }
  return `${formatDecimal(width / height)}:1`;
}

export function formatDecimal(value: number, digits = 3): string {
  return Number(value.toFixed(digits)).toString();
}

export function invertRatio(input: string): string {
  const r = parseRatio(input);
  if (!r) return input;
  const parts = input.split(/\s*[:/x×]\s*/i);
  if (parts.length === 2) return `${parts[1]}:${parts[0]}`;
  return `1:${formatDecimal(r.value)}`;
}

export function orientationOf(value: number): "portrait" | "square" | "landscape" {
  if (Math.abs(value - 1) < 1e-6) return "square";
  return value < 1 ? "portrait" : "landscape";
}

/** Closest named preset by logarithmic distance. */
export function closestPreset(value: number): AspectRatioPreset {
  let best = ALL_ASPECT_RATIO_PRESETS[0];
  let bestDist = Infinity;
  for (const preset of ALL_ASPECT_RATIO_PRESETS) {
    const d = Math.abs(Math.log(preset.width / preset.height) - Math.log(value));
    if (d < bestDist) {
      bestDist = d;
      best = preset;
    }
  }
  return best;
}
