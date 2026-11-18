import type { BreakpointRange, SimulatorConfig } from "@/types/simulator";
import { CONFIG_VERSION, createDefaultConfig } from "./defaults";
import { parseConfig } from "./schema";

/**
 * URL format: `?v=1&vw=430&mode=fixed&h=640&ar=9:16&fit=cover&x=50&y=50…`
 * Frequently shared settings get short, readable keys; everything else uses
 * its dotted config path. Only values that differ from defaults are written,
 * except the core keys below which are always present for readability.
 */
const SHORT_KEYS: Record<string, string> = {
  "viewport.width": "vw",
  "viewport.height": "vh",
  "viewport.browserChrome": "chrome",
  "image.source": "src",
  "image.sampleId": "img",
  "image.url": "url",
  "image.aspectRatio": "ar",
  "image.aspectRatioStrategy": "as",
  "image.focalPoint": "focal",
  "image.keepFocalCentered": "fc",
  "container.widthMode": "wm",
  "container.horizontalGutter": "gut",
  "container.widthPercent": "wp",
  "container.fixedWidth": "fw",
  "container.maxWidth": "mw",
  "container.gridColumns": "cols",
  "container.gridSpan": "span",
  "container.gridGap": "gap",
  "container.heightMode": "mode",
  "container.height": "h",
  "container.aspectRatio": "car",
  "container.viewportHeightValue": "vhv",
  "container.viewportUnit": "vu",
  "container.fluidMin": "fmin",
  "container.fluidPreferredVw": "fvw",
  "container.fluidMax": "fmax",
  "container.contentHeight": "ch",
  "container.contentPadding": "cp",
  "container.minHeight": "minh",
  "container.maxHeight": "maxh",
  "container.minWidth": "minw",
  "container.maxWidthConstraint": "maxw",
  "container.background": "bg",
  "rendering.objectFit": "fit",
  "rendering.objectPositionX": "x",
  "rendering.objectPositionY": "y",
  "workspace.zoom": "z",
  "workspace.view": "view",
  "analysis.minViewport": "rmin",
  "analysis.maxViewport": "rmax",
  "analysis.devicePixelRatio": "dpr",
  "analysis.compareRatios": "cmp",
  "analysis.breakpoints": "bp",
  "analysis.strategy": "opt",
  "analysis.comparisonWidths": "cw",
  "analysis.comparisonRatios": "cr",
};

const ALWAYS = ["viewport.width", "container.heightMode", "container.height", "image.aspectRatio", "rendering.objectFit", "rendering.objectPositionX", "rendering.objectPositionY"];

/** Paths stored as 0–1 internally but shown as percentages in URLs. */
const PERCENT_PATHS = new Set(["rendering.objectPositionX", "rendering.objectPositionY"]);

const LONG_KEYS = Object.fromEntries(Object.entries(SHORT_KEYS).map(([path, key]) => [key, path]));

type Leaf = string | number | boolean | null | unknown[] | Record<string, unknown>;

function leaves(obj: Record<string, unknown>, prefix = ""): Array<[string, Leaf]> {
  const out: Array<[string, Leaf]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && path !== "image.focalPoint") {
      out.push(...leaves(v as Record<string, unknown>, path));
    } else {
      out.push([path, v as Leaf]);
    }
  }
  return out;
}

function round(n: number, digits = 4): number {
  return Number(n.toFixed(digits));
}

function encodeValue(path: string, value: Leaf): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(PERCENT_PATHS.has(path) ? round(value * 100, 2) : round(value));
  if (path === "analysis.breakpoints") {
    return (value as BreakpointRange[]).map((b) => `${b.min}-${b.max}`).join(",");
  }
  if (path === "image.focalPoint") {
    const f = value as { x: number; y: number };
    return `${round(f.x * 100, 2)},${round(f.y * 100, 2)}`;
  }
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

function decodeValue(path: string, raw: string, template: unknown): unknown {
  if (path === "analysis.breakpoints") {
    return raw
      .split(",")
      .filter(Boolean)
      .map((pair, i) => {
        const [min, max] = pair.split("-").map(Number);
        return { id: `bp-${i + 1}`, min, max };
      });
  }
  if (path === "image.focalPoint") {
    if (!raw) return null;
    const [x, y] = raw.split(",").map(Number);
    return { x: x / 100, y: y / 100 };
  }
  if (template === null) return raw === "" ? null : Number(raw);
  if (typeof template === "boolean") return raw === "1" || raw === "true";
  if (typeof template === "number") {
    const n = Number(raw);
    return PERCENT_PATHS.has(path) ? n / 100 : n;
  }
  if (Array.isArray(template)) {
    const parts = raw.split(",").filter(Boolean);
    return typeof template[0] === "number" ? parts.map(Number) : parts;
  }
  return raw;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function serializeConfig(config: SimulatorConfig): URLSearchParams {
  const defaults = Object.fromEntries(leaves(createDefaultConfig() as unknown as Record<string, unknown>));
  const params = new URLSearchParams();
  params.set("v", String(CONFIG_VERSION));
  for (const [path, value] of leaves(config as unknown as Record<string, unknown>)) {
    if (path === "version") continue;
    // Never put local object URLs in a shared link.
    if (path === "image.url" && config.image.source !== "url") continue;
    if (!ALWAYS.includes(path) && same(value, defaults[path])) continue;
    params.set(SHORT_KEYS[path] ?? path, encodeValue(path, value));
  }
  return params;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let node = target;
  for (const k of keys.slice(0, -1)) {
    if (typeof node[k] !== "object" || node[k] == null) node[k] = {};
    node = node[k] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/** Reconstructs a configuration from URL parameters. Returns null if no config params are present. */
export function deserializeConfig(params: URLSearchParams): { config: SimulatorConfig; errors: string[] } | null {
  if (!params.has("v") && !params.has("vw") && !params.has("ar")) return null;
  const defaults = createDefaultConfig();
  const templates = Object.fromEntries(leaves(defaults as unknown as Record<string, unknown>));
  const patch: Record<string, unknown> = { version: Number(params.get("v") ?? CONFIG_VERSION) };
  for (const [key, raw] of params.entries()) {
    const path = LONG_KEYS[key] ?? key;
    if (!(path in templates)) continue;
    setPath(patch, path, decodeValue(path, raw, templates[path]));
  }
  return parseConfig(patch);
}

export function buildShareUrl(config: SimulatorConfig, base: string): string {
  const url = new URL(base);
  url.search = serializeConfig(config).toString().replace(/%3A/gi, ":").replace(/%2C/gi, ",");
  url.hash = "";
  return url.toString();
}
