import { describe, expect, it } from "vitest";
import type { CodeFormat, SimulatorConfig } from "@/types/simulator";
import { createDefaultConfig } from "@/lib/configuration/defaults";
import { simulate } from "@/lib/geometry/simulate";
import { planAssets } from "@/lib/optimization/asset-planner";
import {
  buildSizesAttribute,
  codeLanguage,
  CODE_FORMAT_LABELS,
  cssHeight,
  cssWidth,
  generateCode,
  type CodegenInput,
} from "@/lib/codegen/generate-code";

const original = { width: 2400, height: 1600 };

function input(config: SimulatorConfig, withPlan = false): CodegenInput {
  return {
    config,
    sim: simulate(config, original),
    plan: withPlan ? planAssets(config, original) : null,
    imageSrc: "/images/hero.webp",
    alt: "Descriptive alternative text",
  };
}

function gen(format: CodeFormat, mutate?: (c: SimulatorConfig) => void, withPlan = false): string {
  const config = createDefaultConfig();
  mutate?.(config);
  return generateCode(format, input(config, withPlan));
}

describe("code generation", () => {
  it("html for the default config", () => {
    const html = gen("html");
    expect(html).toContain("height: 640px");
    expect(html).toContain("object-fit: cover");
    expect(html).toContain("object-position: 50% 50%");
    expect(html).toContain('class="image-container"');
    expect(html).toContain('width="900"');
    expect(html).toContain('height="1600"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('sizes="100vw"');
  });

  it("tailwind uses named or arbitrary object positions", () => {
    expect(gen("tailwind")).toContain("object-center");
    const custom = gen("tailwind", (c) => {
      c.rendering.objectPositionX = 0.3;
      c.rendering.objectPositionY = 0.7;
    });
    expect(custom).toContain("object-[30%_70%]");
    const corner = gen("tailwind", (c) => {
      c.rendering.objectPositionX = 0;
      c.rendering.objectPositionY = 1;
    });
    expect(corner).toContain("object-left-bottom");
    expect(gen("tailwind")).toContain("h-[640px]");
  });

  it("next uses next/image with fill and sizes", () => {
    const next = gen("next");
    expect(next).toContain('import Image from "next/image";');
    expect(next).toContain("fill");
    expect(next).toContain('sizes="100vw"');
    expect(next).toContain('className="object-cover object-center"');
    expect(next).toContain("relative h-[640px] w-full overflow-hidden");
  });

  it("react emits a typed component", () => {
    const tsx = gen("react");
    expect(tsx).toContain("export function HeroImage(");
    expect(tsx).toContain("HeroImageProps");
    expect(tsx).toContain('objectFit: "cover"');
  });

  it("aspect height mode emits aspect-ratio", () => {
    const html = gen("html", (c) => (c.container.heightMode = "aspect"));
    expect(html).toContain("aspect-ratio: 16 / 9");
    expect(gen("tailwind", (c) => (c.container.heightMode = "aspect"))).toContain("aspect-[16/9]");
  });

  it("auto height mode uses the effective source ratio", () => {
    expect(gen("html", (c) => (c.container.heightMode = "auto"))).toContain("aspect-ratio: 9 / 16");
  });

  it("fluid height mode emits clamp()", () => {
    expect(gen("html", (c) => (c.container.heightMode = "fluid"))).toContain("clamp(320px, 50vw, 640px)");
    expect(gen("tailwind", (c) => (c.container.heightMode = "fluid"))).toContain("h-[clamp(320px,50vw,640px)]");
  });

  it("viewport height mode emits the unit", () => {
    expect(gen("html", (c) => (c.container.heightMode = "viewport"))).toContain("height: 75svh");
  });

  it("sizes attribute reflects the width strategy", () => {
    const c = createDefaultConfig();
    expect(buildSizesAttribute(c)).toBe("100vw");
    c.container.horizontalGutter = 16;
    expect(buildSizesAttribute(c)).toBe("calc(100vw - 32px)");
    c.container.widthMode = "max";
    expect(buildSizesAttribute(c)).toContain("1280px");
    expect(buildSizesAttribute(c)).toBe("(min-width: 1312px) 1280px, calc(100vw - 32px)");
    c.container.widthMode = "fixed";
    expect(buildSizesAttribute(c)).toBe("640px");
    c.container.widthMode = "percent";
    c.container.horizontalGutter = 0;
    c.container.widthPercent = 50;
    expect(buildSizesAttribute(c)).toBe("50vw");
    c.container.widthMode = "grid";
    expect(buildSizesAttribute(c)).toBe("calc(50vw - 12px)");
  });

  it("css width/height expressions", () => {
    const c = createDefaultConfig();
    expect(cssWidth(c)).toBe("100%");
    expect(cssHeight(c)).toBe("640px");
    c.container.widthMode = "max";
    c.container.horizontalGutter = 16;
    expect(cssWidth(c)).toBe("min(100% - 32px, 1280px)");
  });

  it("grid mode emits a parent grid and a span", () => {
    const html = gen("html", (c) => (c.container.widthMode = "grid"));
    expect(html).toContain("grid-template-columns: repeat(12, minmax(0, 1fr))");
    expect(html).toContain("grid-column: span 6");
  });

  it("picture with a plan emits one source per asset × format", () => {
    const config = createDefaultConfig();
    const plan = planAssets(config, original);
    const out = generateCode("picture", input(config, true));
    const sources = out.match(/<source/g) ?? [];
    expect(sources.length).toBe(plan.assets.length * plan.formats.length);
    expect(out).toContain("media=");
    expect(out).toContain('type="image/avif"');
    expect(out).toContain("<picture>");
    if (plan.assets.length > 1) expect(out).toMatch(/hero-\d+(\.\d+)?x\d+(\.\d+)?-\d+w\.avif/);
  });

  it("picture without a plan emits format sources only", () => {
    const out = gen("picture");
    expect((out.match(/<source/g) ?? []).length).toBe(2);
    expect(out).not.toContain("media=");
  });

  it("escapes user-provided overlay strings", () => {
    const mutate = (c: SimulatorConfig) => {
      c.overlay.enabled = true;
      c.overlay.heading = '<script>alert("x")</script>';
    };
    const html = gen("html", mutate);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('aria-hidden="true"');
    // JSX renders it as a string expression, never as markup.
    expect(gen("react", mutate)).toContain('{"<script>alert(\\"x\\")</script>"}');
    expect(gen("next", mutate)).not.toMatch(/>\s*<script>/);
  });

  it("labels and languages", () => {
    expect(CODE_FORMAT_LABELS.next).toBe("Next.js");
    expect(codeLanguage("react")).toBe("tsx");
    expect(codeLanguage("picture")).toBe("html");
  });

  it("never emits long floating point numbers", () => {
    const formats: CodeFormat[] = ["html", "tailwind", "react", "next", "picture"];
    for (const f of formats) {
      const out = gen(
        f,
        (c) => {
          c.container.widthMode = "grid";
          c.container.gridColumns = 7;
          c.container.gridSpan = 3;
          c.container.horizontalGutter = 13;
          c.rendering.objectPositionX = 1 / 3;
          c.overlay.enabled = true;
        },
        true,
      );
      expect(out).not.toMatch(/\d\.\d{3,}/);
    }
  });
});
