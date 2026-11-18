import type { CodeFormat, ContentAlign, ImageFormat, SimulatorConfig } from "@/types/simulator";
import type { Simulation } from "@/lib/geometry/simulate";
import type { AssetPlan, PlannedAsset } from "@/lib/optimization/asset-planner";
import { normalizeRatio, parseRatio } from "@/lib/assets/aspect-ratios";
import { clamp } from "@/lib/geometry/validate";

export interface CodegenInput {
  config: SimulatorConfig;
  sim: Simulation;
  /** Asset plan used by the <picture> art-direction format. */
  plan: AssetPlan | null;
  imageSrc: string;
  alt: string;
}

export const CODE_FORMAT_LABELS: Record<CodeFormat, string> = {
  html: "HTML + CSS",
  tailwind: "Tailwind CSS",
  react: "React",
  next: "Next.js",
  picture: "Picture (art direction)",
};

export function codeLanguage(format: CodeFormat): "html" | "tsx" {
  return format === "react" || format === "next" ? "tsx" : "html";
}

export function generateCode(format: CodeFormat, input: CodegenInput): string {
  switch (format) {
    case "html":
      return generateHtml(input, false);
    case "picture":
      return generateHtml(input, true);
    case "tailwind":
      return generateTailwind(input);
    case "react":
      return generateReact(input);
    case "next":
      return generateNext(input);
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers

/** Rounds to ≤2 decimals and strips trailing zeros. */
function num(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
}

function px(n: number): string {
  return `${num(n)}px`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsxAttrValue(s: string): string {
  return /["&<>{}\\]/.test(s) ? `{${JSON.stringify(s)}}` : `"${s}"`;
}

function jsxText(s: string): string {
  return /[<>{}&]/.test(s) ? `{${JSON.stringify(s)}}` : s;
}

/** Tailwind arbitrary value: no spaces after commas, other spaces as underscores. */
function tw(value: string): string {
  return value.replace(/,\s+/g, ",").replace(/\s+/g, "_");
}

const sameNumber = (a: number, b: number) => Math.abs(a - b) < 1e-4;

// ---------------------------------------------------------------------------
// Width / height model

/** Width as `a × parent + b` (px), optionally capped. */
interface LinearWidth {
  a: number;
  b: number;
  cap: number | null;
}

function gutterTotal(config: SimulatorConfig): number {
  return 2 * Math.max(0, config.container.horizontalGutter);
}

function gridDims(config: SimulatorConfig) {
  const c = config.container;
  const cols = Math.max(1, Math.round(c.gridColumns));
  const span = clamp(Math.round(c.gridSpan), 1, cols);
  return { cols, span, gap: Math.max(0, c.gridGap) };
}

function linearWidth(config: SimulatorConfig): LinearWidth {
  const c = config.container;
  const G = gutterTotal(config);
  switch (c.widthMode) {
    case "full":
      return { a: 1, b: -G, cap: null };
    case "percent": {
      const p = c.widthPercent / 100;
      return { a: p, b: -G * p, cap: null };
    }
    case "fixed":
      return { a: 0, b: c.fixedWidth, cap: null };
    case "max":
      return { a: 1, b: -G, cap: c.maxWidth };
    case "grid": {
      const { cols, span, gap } = gridDims(config);
      const k = span / cols;
      return { a: k, b: -(G + (cols - 1) * gap) * k + (span - 1) * gap, cap: null };
    }
  }
}

function renderLinear(a: number, b: number, unit: "%" | "vw"): string {
  if (sameNumber(a, 0)) return px(b);
  const rel = `${num(a * 100)}${unit}`;
  if (sameNumber(b, 0)) return rel;
  return `calc(${rel} ${b < 0 ? "-" : "+"} ${px(Math.abs(b))})`;
}

/** Container width as a CSS expression relative to its parent. */
export function cssWidth(config: SimulatorConfig): string {
  const { a, b, cap } = linearWidth(config);
  const base = renderLinear(a, b, "%");
  if (cap == null) return base;
  const inner = base.startsWith("calc(") ? base.slice(5, -1) : base;
  return `min(${inner}, ${px(cap)})`;
}

/** Container height as a CSS expression; ratio- and content-driven modes are `auto`. */
export function cssHeight(config: SimulatorConfig): string {
  const c = config.container;
  switch (c.heightMode) {
    case "fixed":
      return px(c.height);
    case "viewport":
      return `${num(c.viewportHeightValue)}${c.viewportUnit}`;
    case "fluid":
      return `clamp(${px(c.fluidMin)}, ${num(c.fluidPreferredVw)}vw, ${px(c.fluidMax)})`;
    case "aspect":
    case "auto":
    case "content":
      return "auto";
  }
}

/** Effective max-width: the max mode cap combined with the max-width constraint. */
function maxWidthCap(config: SimulatorConfig): number | null {
  const c = config.container;
  const caps = [c.widthMode === "max" ? c.maxWidth : null, c.maxWidthConstraint].filter(
    (v): v is number => v != null && v > 0,
  );
  return caps.length ? Math.min(...caps) : null;
}

function minWidthFloor(config: SimulatorConfig): number | null {
  const m = config.container.minWidth;
  return m != null && m > 0 ? m : null;
}

export function buildSizesAttribute(config: SimulatorConfig): string {
  const { a, b } = linearWidth(config);
  const cap = maxWidthCap(config);
  const floor = minWidthFloor(config);
  if (sameNumber(a, 0)) {
    let w = b;
    if (cap != null) w = Math.min(w, cap);
    if (floor != null) w = Math.max(w, floor);
    return px(w);
  }
  if (floor != null && cap != null && floor >= cap) return px(floor);
  const parts: string[] = [];
  // Viewport width at which the fluid expression reaches a given size.
  const at = (w: number) => (w - b) / a;
  if (cap != null) parts.push(`(min-width: ${Math.ceil(at(cap))}px) ${px(cap)}`);
  if (floor != null) parts.push(`(max-width: ${Math.floor(at(floor))}px) ${px(floor)}`);
  parts.push(renderLinear(a, b, "vw"));
  return parts.join(", ");
}

function aspectValue(config: SimulatorConfig, sim: Simulation): string | null {
  const c = config.container;
  if (c.heightMode === "aspect") {
    const r = parseRatio(c.aspectRatio) ?? { width: 16, height: 9 };
    return `${num(r.width)} / ${num(r.height)}`;
  }
  if (c.heightMode === "auto") {
    const w = Math.max(1, Math.round(sim.effective.width));
    const h = Math.max(1, Math.round(sim.effective.height));
    return normalizeRatio(w, h).replace(":", " / ");
  }
  return null;
}

function contentMinHeight(config: SimulatorConfig): number {
  const c = config.container;
  return Math.max(c.contentHeight + 2 * c.contentPadding, c.minHeight ?? 0);
}

function positionValue(sim: Simulation): string {
  return `${num(sim.position.x * 100)}% ${num(sim.position.y * 100)}%`;
}

const NAMED_POSITIONS: Record<string, string> = {
  "0.5,0.5": "center",
  "0.5,0": "top",
  "0.5,1": "bottom",
  "0,0.5": "left",
  "1,0.5": "right",
  "0,0": "left-top",
  "1,0": "right-top",
  "0,1": "left-bottom",
  "1,1": "right-bottom",
};

function twPosition(sim: Simulation): string {
  const snap = (v: number) => [0, 0.5, 1].find((s) => sameNumber(v, s));
  const x = snap(sim.position.x);
  const y = snap(sim.position.y);
  if (x != null && y != null) return `object-${NAMED_POSITIONS[`${x},${y}`]}`;
  return `object-[${tw(positionValue(sim))}]`;
}

const showsBackground = (config: SimulatorConfig) =>
  config.rendering.objectFit !== "cover" && config.rendering.objectFit !== "fill";

// ---------------------------------------------------------------------------
// Declarative parts shared by the CSS and inline-style renderers

type Decl = [string, string];

type PartKey =
  | "grid"
  | "container"
  | "image"
  | "scrim"
  | "content"
  | "inner"
  | "logo"
  | "badge"
  | "heading"
  | "description"
  | "actions"
  | "cta"
  | "ctaPrimary";

const FLEX_ALIGN: Record<ContentAlign, string> = { start: "flex-start", center: "center", end: "flex-end" };

function gridDecls(config: SimulatorConfig): Decl[] {
  const { cols, gap } = gridDims(config);
  const g = config.container.horizontalGutter;
  const decls: Decl[] = [
    ["display", "grid"],
    ["grid-template-columns", `repeat(${cols}, minmax(0, 1fr))`],
    ["gap", px(gap)],
  ];
  if (g > 0) decls.push(["padding-inline", px(g)]);
  return decls;
}

function containerDecls(config: SimulatorConfig, sim: Simulation): Decl[] {
  const c = config.container;
  const g = Math.max(0, c.horizontalGutter);
  const d: Decl[] = [["position", "relative"]];

  switch (c.widthMode) {
    case "full":
      d.push(["width", cssWidth(config)]);
      if (g > 0) d.push(["margin-inline", "auto"]);
      break;
    case "percent":
      d.push(["width", cssWidth(config)]);
      if (g > 0) d.push(["margin-inline-start", px(g)]);
      break;
    case "fixed":
      d.push(["width", px(c.fixedWidth)]);
      break;
    case "max":
      d.push(["width", g > 0 ? `calc(100% - ${px(2 * g)})` : "100%"]);
      break;
    case "grid":
      d.push(["grid-column", `span ${gridDims(config).span}`]);
      break;
  }
  const cap = maxWidthCap(config);
  if (cap != null) d.push(["max-width", px(cap)]);
  if (c.widthMode === "max") d.push(["margin-inline", "auto"]);
  const floor = minWidthFloor(config);
  if (floor != null) d.push(["min-width", px(floor)]);

  const aspect = aspectValue(config, sim);
  if (aspect) d.push(["aspect-ratio", aspect]);
  else if (c.heightMode === "content") d.push(["min-height", px(contentMinHeight(config))]);
  else d.push(["height", cssHeight(config)]);
  if (c.heightMode !== "content" && c.minHeight != null && c.minHeight > 0) d.push(["min-height", px(c.minHeight)]);
  if (c.maxHeight != null && c.maxHeight > 0) d.push(["max-height", px(c.maxHeight)]);

  d.push(["overflow", "hidden"]);
  if (showsBackground(config)) d.push(["background", c.background]);
  return d;
}

function imageDecls(config: SimulatorConfig, sim: Simulation): Decl[] {
  return [
    ["position", "absolute"],
    ["inset", "0"],
    ["width", "100%"],
    ["height", "100%"],
    ["object-fit", config.rendering.objectFit],
    ["object-position", positionValue(sim)],
  ];
}

const GRADIENT_DIRECTION = { "to-top": "to top", "to-bottom": "to bottom", "to-left": "to left", "to-right": "to right" };

function scrimDecls(config: SimulatorConfig): Decl[] | null {
  const o = config.overlay;
  if (o.scrim === "none") return null;
  const color = `rgb(0 0 0 / ${num(o.opacity)})`;
  const background =
    o.scrim === "dark" ? color : `linear-gradient(${GRADIENT_DIRECTION[o.gradientDirection]}, ${color}, rgb(0 0 0 / 0))`;
  return [
    ["position", "absolute"],
    ["inset", "0"],
    ["background", background],
    ["pointer-events", "none"],
  ];
}

function contentDecls(config: SimulatorConfig): Decl[] {
  const o = config.overlay;
  const isContentMode = config.container.heightMode === "content";
  const d: Decl[] = isContentMode
    ? [
        ["position", "relative"],
        ["min-height", "inherit"],
        ["box-sizing", "border-box"],
      ]
    : [
        ["position", "absolute"],
        ["inset", "0"],
      ];
  if (o.enabled) {
    d.push(
      ["display", "flex"],
      ["flex-direction", "column"],
      ["justify-content", FLEX_ALIGN[o.alignY]],
      ["align-items", FLEX_ALIGN[o.alignX]],
      ["text-align", o.alignX],
      ["color", o.textColor],
    );
  }
  d.push(["padding", px(isContentMode ? config.container.contentPadding : o.padding)]);
  return d;
}

function overlayDecls(config: SimulatorConfig): Record<"inner" | "logo" | "badge" | "heading" | "description" | "actions" | "cta" | "ctaPrimary", Decl[]> {
  const o = config.overlay;
  const logoMargin: Decl[] =
    o.alignX === "center" ? [["margin-inline", "auto"]] : o.alignX === "end" ? [["margin-inline-start", "auto"]] : [];
  return {
    inner: [["max-width", px(o.maxContentWidth)]],
    logo: [["display", "block"], ["height", "32px"], ["width", "auto"], ["margin-bottom", "16px"], ...logoMargin],
    badge: [
      ["display", "inline-block"],
      ["margin-bottom", "12px"],
      ["padding", "4px 10px"],
      ["border-radius", "999px"],
      ["background", "rgb(255 255 255 / 0.15)"],
      ["font-size", "12px"],
      ["font-weight", "600"],
    ],
    heading: [["margin", "0"], ["font-size", "clamp(28px, 4vw, 48px)"], ["line-height", "1.1"]],
    description: [["margin", "12px 0 0"], ["opacity", "0.9"]],
    actions: [
      ["display", "flex"],
      ["flex-wrap", "wrap"],
      ["gap", "12px"],
      ["margin-top", "24px"],
      ["justify-content", FLEX_ALIGN[o.alignX]],
    ],
    cta: [
      ["padding", "10px 18px"],
      ["border", "1px solid currentColor"],
      ["border-radius", "6px"],
      ["color", "inherit"],
      ["font-weight", "600"],
      ["text-decoration", "none"],
    ],
    ctaPrimary: [["background", o.textColor], ["border-color", o.textColor], ["color", "#111111"]],
  };
}

function buildParts(config: SimulatorConfig, sim: Simulation): Partial<Record<PartKey, Decl[]>> {
  const needsContent = config.overlay.enabled || config.container.heightMode === "content";
  return {
    grid: config.container.widthMode === "grid" ? gridDecls(config) : undefined,
    container: containerDecls(config, sim),
    image: imageDecls(config, sim),
    scrim: config.overlay.enabled ? scrimDecls(config) ?? undefined : undefined,
    content: needsContent ? contentDecls(config) : undefined,
    ...(config.overlay.enabled ? overlayDecls(config) : {}),
  };
}

// ---------------------------------------------------------------------------
// Tailwind classes

const TW_JUSTIFY: Record<ContentAlign, string> = { start: "justify-start", center: "justify-center", end: "justify-end" };
const TW_ITEMS: Record<ContentAlign, string> = { start: "items-start", center: "items-center", end: "items-end" };
const TW_TEXT: Record<ContentAlign, string> = { start: "text-left", center: "text-center", end: "text-right" };
const TW_DIRECTION = { "to-top": "t", "to-bottom": "b", "to-left": "l", "to-right": "r" };

function twClasses(config: SimulatorConfig, sim: Simulation): Partial<Record<PartKey, string>> {
  const c = config.container;
  const o = config.overlay;
  const g = Math.max(0, c.horizontalGutter);
  const out: Partial<Record<PartKey, string>> = {};

  if (c.widthMode === "grid") {
    const { cols, gap } = gridDims(config);
    out.grid = ["grid", `grid-cols-${cols}`, `gap-[${px(gap)}]`, g > 0 ? `px-[${px(g)}]` : ""].filter(Boolean).join(" ");
  }

  const cls: string[] = ["relative"];
  const aspect = aspectValue(config, sim);
  if (aspect) cls.push(`aspect-[${aspect.replace(" / ", "/")}]`);
  else if (c.heightMode === "content") cls.push(`min-h-[${px(contentMinHeight(config))}]`);
  else cls.push(`h-[${tw(cssHeight(config))}]`);
  if (c.heightMode !== "content" && c.minHeight != null && c.minHeight > 0) cls.push(`min-h-[${px(c.minHeight)}]`);
  if (c.maxHeight != null && c.maxHeight > 0) cls.push(`max-h-[${px(c.maxHeight)}]`);

  switch (c.widthMode) {
    case "full":
      cls.push(g > 0 ? `mx-auto w-[${tw(cssWidth(config))}]` : "w-full");
      break;
    case "percent":
      cls.push(`w-[${tw(cssWidth(config))}]`);
      if (g > 0) cls.push(`ms-[${px(g)}]`);
      break;
    case "fixed":
      cls.push(`w-[${px(c.fixedWidth)}]`);
      break;
    case "max":
      cls.push("mx-auto", g > 0 ? `w-[${tw(`calc(100% - ${px(2 * g)})`)}]` : "w-full");
      break;
    case "grid":
      cls.push(`col-span-${gridDims(config).span}`);
      break;
  }
  const cap = maxWidthCap(config);
  if (cap != null) cls.push(`max-w-[${px(cap)}]`);
  const floor = minWidthFloor(config);
  if (floor != null) cls.push(`min-w-[${px(floor)}]`);
  cls.push("overflow-hidden");
  if (showsBackground(config)) cls.push(`bg-[${c.background}]`);
  out.container = cls.join(" ");

  out.image = `absolute inset-0 size-full object-${config.rendering.objectFit} ${twPosition(sim)}`;

  const isContentMode = c.heightMode === "content";
  if (o.enabled || isContentMode) {
    const content = isContentMode ? ["relative", "min-h-[inherit]"] : ["absolute", "inset-0"];
    if (o.enabled) {
      content.push("flex", "flex-col", TW_JUSTIFY[o.alignY], TW_ITEMS[o.alignX], TW_TEXT[o.alignX], `text-[${o.textColor}]`);
    }
    content.push(`p-[${px(isContentMode ? c.contentPadding : o.padding)}]`);
    out.content = content.join(" ");
  }

  if (o.enabled) {
    const alpha = Math.round(clamp(o.opacity, 0, 1) * 100);
    if (o.scrim === "dark") out.scrim = `pointer-events-none absolute inset-0 bg-black/${alpha}`;
    else if (o.scrim === "gradient") {
      out.scrim = `pointer-events-none absolute inset-0 bg-linear-to-${TW_DIRECTION[o.gradientDirection]} from-black/${alpha} to-transparent`;
    }
    out.inner = `max-w-[${px(o.maxContentWidth)}]`;
    out.logo = ["mb-4 block h-8 w-auto", o.alignX === "center" ? "mx-auto" : o.alignX === "end" ? "ms-auto" : ""]
      .filter(Boolean)
      .join(" ");
    out.badge = "mb-3 inline-block rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold";
    out.heading = "text-3xl leading-tight font-semibold md:text-5xl";
    out.description = "mt-3 opacity-90 md:text-lg";
    out.actions = `mt-6 flex flex-wrap gap-3 ${TW_JUSTIFY[o.alignX]}`;
    out.cta = "rounded-md border border-current px-4 py-2 text-sm font-semibold";
    out.ctaPrimary = `rounded-md border border-[${o.textColor}] bg-[${o.textColor}] px-4 py-2 text-sm font-semibold text-zinc-950`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Markup tree

interface Dialect {
  jsx: boolean;
  /** Attribute that styles a part (class, className or style), or null. */
  style(part: PartKey): string | null;
  /** Lines for the primary image/picture element. */
  media(indent: string): string[];
  /** Tag name for the overlay logo image. */
  logoTag: string;
  /** Rendered within the content wrapper when there is no overlay. */
  placeholder: string;
}

function attr(d: Dialect, name: string, value: string | number): string {
  if (!d.jsx) return `${name}="${escapeHtml(String(value))}"`;
  const jsxName = name === "srcset" ? "srcSet" : name === "fetchpriority" ? "fetchPriority" : name;
  return typeof value === "number" ? `${jsxName}={${value}}` : `${jsxName}=${jsxAttrValue(value)}`;
}

function text(d: Dialect, s: string): string {
  return d.jsx ? jsxText(s) : escapeHtml(s);
}

/** Renders a start tag, wrapping attributes onto separate lines when long. */
function tag(indent: string, name: string, attrs: (string | null)[], close: ">" | " />"): string[] {
  const list = attrs.filter((a): a is string => !!a);
  const single = `${indent}<${name}${list.map((a) => ` ${a}`).join("")}${close}`;
  if (single.length <= 120) return [single];
  return [`${indent}<${name}`, ...list.map((a) => `${indent}  ${a}`), `${indent}${close.trim()}`];
}

function element(indent: string, name: string, attrs: (string | null)[], body: string): string[] {
  const open = tag(indent, name, attrs, ">");
  if (open.length === 1) return [`${open[0]}${body}</${name}>`];
  if (!body) return [...open.slice(0, -1), `${indent}></${name}>`];
  return [...open, `${indent}  ${body}`, `${indent}</${name}>`];
}

function renderMarkup(config: SimulatorConfig, d: Dialect): string[] {
  const o = config.overlay;
  const lines: string[] = [];
  const hasGrid = config.container.widthMode === "grid";
  let indent = "";
  if (hasGrid) {
    lines.push(...tag(indent, "div", [d.style("grid")], ">"));
    indent += "  ";
  }
  lines.push(...tag(indent, "div", [d.style("container")], ">"));
  const i1 = `${indent}  `;
  lines.push(...d.media(i1));

  if (o.enabled && o.scrim !== "none") {
    const attrs = [d.style("scrim"), 'aria-hidden="true"'];
    lines.push(...(d.jsx ? tag(i1, "div", attrs, " />") : element(i1, "div", attrs, "")));
  }

  const needsContent = o.enabled || config.container.heightMode === "content";
  if (needsContent) {
    lines.push(...tag(i1, "div", [d.style("content")], ">"));
    const i2 = `${i1}  `;
    if (!o.enabled) {
      lines.push(`${i2}${d.placeholder}`);
    } else {
      lines.push(...tag(i2, "div", [d.style("inner")], ">"));
      const i3 = `${i2}  `;
      if (o.showLogo) {
        lines.push(
          ...tag(
            i3,
            d.logoTag,
            [d.style("logo"), attr(d, "src", "/images/logo.svg"), attr(d, "alt", "Company name"), attr(d, "width", 120), attr(d, "height", 32)],
            d.jsx ? " />" : ">",
          ),
        );
      }
      if (o.showBadge && o.badge) lines.push(...element(i3, "span", [d.style("badge")], text(d, o.badge)));
      lines.push(...element(i3, "h2", [d.style("heading")], text(d, o.heading)));
      if (o.showDescription && o.description) {
        lines.push(...element(i3, "p", [d.style("description")], text(d, o.description)));
      }
      const ctas: string[][] = [];
      if (o.showPrimaryCta && o.primaryCta) {
        ctas.push(element(`${i3}  `, "a", [attr(d, "href", "#"), d.style("ctaPrimary")], text(d, o.primaryCta)));
      }
      if (o.showSecondaryCta && o.secondaryCta) {
        ctas.push(element(`${i3}  `, "a", [attr(d, "href", "#"), d.style("cta")], text(d, o.secondaryCta)));
      }
      if (ctas.length) {
        lines.push(...tag(i3, "div", [d.style("actions")], ">"), ...ctas.flat(), `${i3}</div>`);
      }
      lines.push(`${i2}</div>`);
    }
    lines.push(`${i1}</div>`);
  }

  lines.push(`${indent}</div>`);
  if (hasGrid) lines.push("</div>");
  return lines;
}

// ---------------------------------------------------------------------------
// Image sources

interface SrcParts {
  base: string;
  ext: string;
}

function splitSrc(src: string): SrcParts {
  const clean = src.split(/[?#]/)[0] || "/images/hero.jpg";
  const m = clean.match(/^(.*)\.([a-z0-9]+)$/i);
  return m ? { base: m[1], ext: m[2] } : { base: clean, ext: "jpg" };
}

const FORMAT_EXT: Record<ImageFormat, string> = { avif: "avif", webp: "webp", jpeg: "jpg" };

/** Responsive widths up to (and including) the source width. */
function candidateWidths(maxWidth: number): number[] {
  const max = Math.max(1, Math.round(maxWidth));
  return [...new Set([...[640, 960, 1280, 1920, 2560, 3840].filter((w) => w < max), max])];
}

function srcsetFor(base: string, ext: string, widths: number[], infix = ""): string {
  return widths.map((w) => `${base}${infix}-${w}w.${ext} ${w}w`).join(", ");
}

function sourceSize(sim: Simulation) {
  return { width: Math.round(sim.effective.width), height: Math.round(sim.effective.height) };
}

function imgAttrs(d: Dialect, input: CodegenInput, srcset: boolean): (string | null)[] {
  const { base, ext } = splitSrc(input.imageSrc);
  const size = sourceSize(input.sim);
  return [
    attr(d, "src", input.imageSrc),
    srcset ? attr(d, "srcset", srcsetFor(base, ext, candidateWidths(size.width))) : null,
    srcset ? attr(d, "sizes", buildSizesAttribute(input.config)) : null,
    attr(d, "width", size.width),
    attr(d, "height", size.height),
    attr(d, "alt", input.alt),
    attr(d, "loading", "lazy"),
    attr(d, "decoding", "async"),
  ];
}

/** Non-overlapping media query for an asset given its neighbours. */
function assetMedia(assets: PlannedAsset[], i: number): string | null {
  const parts: string[] = [];
  if (i > 0) parts.push(`(min-width: ${assets[i].min}px)`);
  if (i < assets.length - 1) parts.push(`(max-width: ${num(assets[i + 1].min - 0.02)}px)`);
  return parts.length ? parts.join(" and ") : null;
}

function pictureMedia(d: Dialect, input: CodegenInput, indent: string): string[] {
  const { base } = splitSrc(input.imageSrc);
  const sizes = buildSizesAttribute(input.config);
  const formats: ImageFormat[] = input.plan?.formats.length ? input.plan.formats : ["avif", "webp"];
  const fallback: ImageFormat = formats.includes("jpeg") ? "jpeg" : formats.includes("webp") ? "webp" : formats[formats.length - 1];
  const i1 = `${indent}  `;
  const lines = [`${indent}<picture>`];

  const assets = input.plan && input.plan.assets.length > 1 ? [...input.plan.assets].sort((a, b) => a.min - b.min) : null;
  if (assets) {
    const dpr = Math.max(1, input.plan?.devicePixelRatio ?? 1);
    const infixOf = (a: PlannedAsset) => `-${a.ratioLabel.replace(/:/g, "x")}`;
    const widthsOf = (a: PlannedAsset) => [...new Set([Math.round(a.size.width / dpr), a.size.width])];
    assets.forEach((asset, i) => {
      const media = assetMedia(assets, i);
      for (const f of formats) {
        lines.push(
          ...tag(
            i1,
            "source",
            [
              media ? attr(d, "media", media) : null,
              attr(d, "type", `image/${f}`),
              attr(d, "srcset", srcsetFor(base, FORMAT_EXT[f], widthsOf(asset), infixOf(asset))),
              attr(d, "sizes", sizes),
              attr(d, "width", asset.size.width),
              attr(d, "height", asset.size.height),
            ],
            d.jsx ? " />" : ">",
          ),
        );
      }
    });
    const last = assets[assets.length - 1];
    lines.push(
      ...tag(
        i1,
        "img",
        [
          d.style("image"),
          attr(d, "src", `${base}${infixOf(last)}-${last.size.width}w.${FORMAT_EXT[fallback]}`),
          attr(d, "width", last.size.width),
          attr(d, "height", last.size.height),
          attr(d, "alt", input.alt),
          attr(d, "loading", "lazy"),
          attr(d, "decoding", "async"),
        ],
        d.jsx ? " />" : ">",
      ),
    );
  } else {
    const size = sourceSize(input.sim);
    const widths = candidateWidths(size.width);
    for (const f of formats) {
      lines.push(
        ...tag(
          i1,
          "source",
          [attr(d, "type", `image/${f}`), attr(d, "srcset", srcsetFor(base, FORMAT_EXT[f], widths)), attr(d, "sizes", sizes)],
          d.jsx ? " />" : ">",
        ),
      );
    }
    lines.push(
      ...tag(
        i1,
        "img",
        [
          d.style("image"),
          attr(d, "src", `${base}-${size.width}w.${FORMAT_EXT[fallback]}`),
          attr(d, "width", size.width),
          attr(d, "height", size.height),
          attr(d, "alt", input.alt),
          attr(d, "loading", "lazy"),
          attr(d, "decoding", "async"),
        ],
        d.jsx ? " />" : ">",
      ),
    );
  }
  lines.push(`${indent}</picture>`);
  return lines;
}

// ---------------------------------------------------------------------------
// Format renderers

const CSS_CLASS: Record<PartKey, string> = {
  grid: "image-grid",
  container: "image-container",
  image: "",
  scrim: "image-scrim",
  content: "image-content",
  inner: "image-content-inner",
  logo: "image-logo",
  badge: "image-badge",
  heading: "image-heading",
  description: "image-description",
  actions: "image-actions",
  cta: "image-cta",
  ctaPrimary: "image-cta image-cta--primary",
};

function cssSelector(part: PartKey, picture: boolean): string {
  if (part === "image") return picture ? ".image-container > picture > img" : ".image-container > img";
  if (part === "ctaPrimary") return ".image-cta--primary";
  return `.${CSS_CLASS[part]}`;
}

function generateHtml(input: CodegenInput, picture: boolean): string {
  const parts = buildParts(input.config, input.sim);
  const d: Dialect = {
    jsx: false,
    style: (part) => (parts[part] && CSS_CLASS[part] ? `class="${CSS_CLASS[part]}"` : null),
    media: (indent) =>
      picture ? pictureMedia(d, input, indent) : tag(indent, "img", imgAttrs(d, input, true), ">"),
    logoTag: "img",
    placeholder: "<!-- Content -->",
  };
  const markup = renderMarkup(input.config, d);
  const css: string[] = [];
  for (const key of Object.keys(CSS_CLASS) as PartKey[]) {
    const decls = parts[key];
    if (!decls) continue;
    css.push(`  ${cssSelector(key, picture)} {`, ...decls.map(([p, v]) => `    ${p}: ${v};`), "  }");
  }
  return [...markup, "", "<style>", ...css, "</style>", ""].join("\n");
}

function generateTailwind(input: CodegenInput): string {
  const classes = twClasses(input.config, input.sim);
  const d: Dialect = {
    jsx: false,
    style: (part) => (classes[part] ? `class="${classes[part]}"` : null),
    media: (indent) => tag(indent, "img", [d.style("image"), ...imgAttrs(d, input, true)], ">"),
    logoTag: "img",
    placeholder: "<!-- Content -->",
  };
  return [...renderMarkup(input.config, d), ""].join("\n");
}

function camelCase(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function generateReact(input: CodegenInput): string {
  const parts = buildParts(input.config, input.sim);
  // Inline styles don't cascade: fold the base CTA styles into the primary one.
  if (parts.ctaPrimary && parts.cta) {
    parts.ctaPrimary = [...new Map([...parts.cta, ...parts.ctaPrimary]).entries()];
  }
  const { base, ext } = splitSrc(input.imageSrc);
  const size = sourceSize(input.sim);
  const sizes = buildSizesAttribute(input.config);

  const d: Dialect = {
    jsx: true,
    style: (part) => (parts[part] ? `style={styles.${part}}` : null),
    media: (indent) =>
      tag(
        indent,
        "img",
        [
          "src={src}",
          "srcSet={srcSet}",
          attr(d, "sizes", sizes),
          attr(d, "width", size.width),
          attr(d, "height", size.height),
          "alt={alt}",
          attr(d, "loading", "lazy"),
          attr(d, "decoding", "async"),
          d.style("image"),
        ],
        " />",
      ),
    logoTag: "img",
    placeholder: "{/* Content */}",
  };

  const styleLines: string[] = [];
  for (const key of Object.keys(CSS_CLASS) as PartKey[]) {
    const decls = parts[key];
    if (!decls) continue;
    styleLines.push(
      `  ${key}: {`,
      ...decls.map(([p, v]) => `    ${camelCase(p)}: ${JSON.stringify(v)},`),
      "  },",
    );
  }

  const body = renderMarkup(input.config, d).map((l) => `    ${l}`);
  return [
    'import type { CSSProperties } from "react";',
    "",
    "interface HeroImageProps {",
    "  src?: string;",
    "  srcSet?: string;",
    "  alt?: string;",
    "}",
    "",
    "const styles = {",
    ...styleLines,
    "} satisfies Record<string, CSSProperties>;",
    "",
    "export function HeroImage({",
    `  src = ${JSON.stringify(input.imageSrc)},`,
    `  srcSet = ${JSON.stringify(srcsetFor(base, ext, candidateWidths(size.width)))},`,
    `  alt = ${JSON.stringify(input.alt)},`,
    "}: HeroImageProps) {",
    "  return (",
    ...body,
    "  );",
    "}",
    "",
  ].join("\n");
}

function generateNext(input: CodegenInput): string {
  const classes = twClasses(input.config, input.sim);
  const imageClass = `object-${input.config.rendering.objectFit} ${twPosition(input.sim)}`;
  const d: Dialect = {
    jsx: true,
    style: (part) => (classes[part] ? `className="${classes[part]}"` : null),
    media: (indent) =>
      tag(
        indent,
        "Image",
        [
          attr(d, "src", input.imageSrc),
          attr(d, "alt", input.alt),
          "fill",
          attr(d, "sizes", buildSizesAttribute(input.config)),
          `className="${imageClass}"`,
        ],
        " />",
      ),
    logoTag: "Image",
    placeholder: "{/* Content */}",
  };
  const body = renderMarkup(input.config, d).map((l) => `    ${l}`);
  return [
    'import Image from "next/image";',
    "",
    "export function HeroImage() {",
    "  return (",
    ...body,
    "  );",
    "}",
    "",
  ].join("\n");
}
