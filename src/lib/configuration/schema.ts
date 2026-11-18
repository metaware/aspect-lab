import { z } from "zod";
import type { SimulatorConfig } from "@/types/simulator";
import { parseRatio } from "@/lib/assets/aspect-ratios";
import { CONFIG_VERSION, VIEWPORT_MAX, VIEWPORT_MIN, createDefaultConfig } from "./defaults";

const positive = z.number().finite().positive();
const nonNegative = z.number().finite().min(0);
const unit = z.number().finite().min(0).max(1);
const ratioString = z.string().refine((v) => parseRatio(v) != null, "Invalid aspect ratio");
const optionalPx = positive.nullable();
const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);

export const configSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  viewport: z.object({
    width: z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX),
    height: positive.max(4000),
    browserChrome: nonNegative.max(400),
  }),
  image: z.object({
    source: z.enum(["sample", "upload", "url", "test"]),
    sampleId: z.string().max(64),
    url: z.string().max(2048),
    aspectRatio: z.union([z.literal("native"), ratioString]),
    aspectRatioStrategy: z.enum(["native", "crop", "distort"]),
    focalPoint: z.object({ x: unit, y: unit }).nullable(),
    keepFocalCentered: z.boolean(),
    sourceCropX: unit,
    sourceCropY: unit,
  }),
  container: z.object({
    widthMode: z.enum(["full", "percent", "fixed", "max", "grid"]),
    horizontalGutter: nonNegative.max(800),
    widthPercent: positive.max(100),
    fixedWidth: positive.max(10000),
    maxWidth: positive.max(10000),
    gridColumns: z.number().int().min(1).max(24),
    gridSpan: z.number().int().min(1).max(24),
    gridGap: nonNegative.max(400),
    heightMode: z.enum(["fixed", "aspect", "auto", "viewport", "fluid", "content"]),
    height: positive.max(10000),
    aspectRatio: ratioString,
    viewportHeightValue: positive.max(1000),
    viewportUnit: z.enum(["vh", "svh", "dvh", "lvh"]),
    fluidMin: positive.max(10000),
    fluidPreferredVw: positive.max(1000),
    fluidMax: positive.max(10000),
    contentHeight: positive.max(10000),
    contentPadding: nonNegative.max(1000),
    minHeight: optionalPx,
    maxHeight: optionalPx,
    minWidth: optionalPx,
    maxWidthConstraint: optionalPx,
    background: hexColor,
  }),
  rendering: z.object({
    objectFit: z.enum(["cover", "contain", "fill", "none", "scale-down"]),
    objectPositionX: unit,
    objectPositionY: unit,
  }),
  workspace: z.object({
    zoom: z.number().finite().min(0.05).max(4),
    zoomMode: z.enum(["manual", "fit"]),
    view: z.enum(["component", "source", "split"]),
    showDimensions: z.boolean(),
    showCropOverlay: z.boolean(),
    showGrid: z.boolean(),
    showRulers: z.boolean(),
    showSafeZone: z.boolean(),
    showOutline: z.boolean(),
  }),
  analysis: z.object({
    minViewport: z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX),
    maxViewport: z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX),
    devicePixelRatio: z.union([z.literal(1), z.literal(1.5), z.literal(2), z.literal(3)]),
    chartMetric: z.enum(["cropped", "visible", "coverage", "scale", "resolution"]),
    compareRatios: z.array(ratioString).max(6),
    breakpoints: z
      .array(
        z.object({
          id: z.string().max(32),
          min: z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX),
          max: z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX),
        }),
      )
      .max(12),
    strategy: z.enum(["worst-case", "average", "preferred", "fewest-assets"]),
    preferredViewport: z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX),
    comparisonMode: z.enum(["viewports", "ratios"]),
    comparisonWidths: z.array(z.number().finite().min(VIEWPORT_MIN).max(VIEWPORT_MAX)).max(12),
    comparisonRatios: z.array(ratioString).max(8),
    maxCropTolerance: z.number().finite().min(0).max(100),
    maxVariants: z.number().int().min(1).max(8),
    formats: z.array(z.enum(["avif", "webp", "jpeg"])).max(3),
    codeFormat: z.enum(["html", "tailwind", "react", "next", "picture"]),
  }),
  overlay: z.object({
    enabled: z.boolean(),
    heading: z.string().max(160),
    description: z.string().max(400),
    showDescription: z.boolean(),
    primaryCta: z.string().max(60),
    showPrimaryCta: z.boolean(),
    secondaryCta: z.string().max(60),
    showSecondaryCta: z.boolean(),
    showLogo: z.boolean(),
    showBadge: z.boolean(),
    badge: z.string().max(40),
    scrim: z.enum(["none", "gradient", "dark"]),
    gradientDirection: z.enum(["to-top", "to-bottom", "to-left", "to-right"]),
    opacity: unit,
    textColor: hexColor,
    alignX: z.enum(["start", "center", "end"]),
    alignY: z.enum(["start", "center", "end"]),
    padding: nonNegative.max(400),
    maxContentWidth: positive.max(4000),
  }),
}) satisfies z.ZodType<SimulatorConfig>;

type DeepPartial<T> = T extends object ? (T extends unknown[] ? T : { [K in keyof T]?: DeepPartial<T[K]> }) : T;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v != null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in out)) continue;
    out[k] = isPlainObject(out[k]) && isPlainObject(v) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/**
 * Migrates older configuration versions forward. Only v1 exists today; future
 * versions add a step here so existing shared URLs and JSON keep working.
 */
function migrate(input: Record<string, unknown>): Record<string, unknown> {
  const version = typeof input.version === "number" ? input.version : CONFIG_VERSION;
  if (version === CONFIG_VERSION) return input;
  return { ...input, version: CONFIG_VERSION };
}

/**
 * Validates an untrusted config (JSON import, localStorage). Unknown keys are
 * dropped, missing keys fall back to defaults, and each top-level section that
 * fails validation is reset to its default rather than rejecting everything.
 */
export function parseConfig(input: unknown): { config: SimulatorConfig; errors: string[] } {
  const defaults = createDefaultConfig();
  if (!isPlainObject(input)) return { config: defaults, errors: ["Configuration must be an object"] };
  const merged = deepMerge(defaults, migrate(input) as DeepPartial<SimulatorConfig>);
  merged.version = CONFIG_VERSION;
  const result = configSchema.safeParse(merged);
  if (result.success) return { config: result.data, errors: [] };

  const errors: string[] = [];
  const repaired = { ...merged } as Record<string, unknown>;
  const failed = new Set(result.error.issues.map((i) => String(i.path[0])));
  for (const key of failed) {
    errors.push(`Invalid "${key}" settings were reset to defaults`);
    repaired[key] = (defaults as unknown as Record<string, unknown>)[key];
  }
  const second = configSchema.safeParse(repaired);
  return second.success ? { config: second.data, errors } : { config: defaults, errors };
}
