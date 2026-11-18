"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { useSimulatorStore } from "@/store/simulator-store";
import { useAnalyticsConfig } from "@/hooks/use-simulator";
import { useSourceImage } from "@/hooks/use-image-metadata";
import { simulate } from "@/lib/geometry/simulate";
import { planAssets } from "@/lib/optimization/asset-planner";
import { CODE_FORMAT_LABELS, codeLanguage, generateCode } from "@/lib/codegen/generate-code";
import { Segmented } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/utils";
import type { CodeFormat } from "@/types/simulator";

type Highlighter = (code: string, lang: "html" | "tsx") => Promise<string>;
let highlighterPromise: Promise<Highlighter> | null = null;

/** Shiki is loaded lazily, only when the code tab is opened. */
function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= import("shiki").then(async ({ createHighlighter }) => {
    const h = await createHighlighter({ themes: ["github-light", "github-dark-dimmed"], langs: ["html", "tsx"] });
    return async (code, lang) =>
      h.codeToHtml(code, { lang, themes: { light: "github-light", dark: "github-dark-dimmed" }, defaultColor: "light" });
  });
  return highlighterPromise;
}

const EXT: Record<CodeFormat, string> = { html: "html", tailwind: "html", react: "tsx", next: "tsx", picture: "html" };

export function CodeGenerator() {
  const config = useAnalyticsConfig(120);
  const format = useSimulatorStore((s) => s.config.analysis.codeFormat);
  const patch = useSimulatorStore((s) => s.patch);
  const { original } = useSourceImage();
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    const sim = simulate(config, original);
    const plan = format === "picture" ? planAssets(config, original) : null;
    return generateCode(format, { config, sim, plan, imageSrc: "/images/hero.webp", alt: "Descriptive alternative text" });
  }, [config, original, format]);

  useEffect(() => {
    let cancelled = false;
    getHighlighter()
      .then((hl) => hl(code, codeLanguage(format)))
      .then((out) => !cancelled && setHtml(out))
      .catch(() => !cancelled && setHtml(null));
    return () => {
      cancelled = true;
    };
  }, [code, format]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented<CodeFormat>
          label="Code format"
          size="sm"
          className="w-[min(620px,100%)]"
          value={format}
          onChange={(codeFormat) => patch("analysis", { codeFormat })}
          options={(Object.keys(CODE_FORMAT_LABELS) as CodeFormat[]).map((f) => ({ value: f, label: CODE_FORMAT_LABELS[f] }))}
        />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="ghost" aria-label="Download code" onClick={() => downloadText(code, `aspectlab-${format}.${EXT[format]}`)}>
            <Download />
          </Button>
        </div>
      </div>
      <div className="relative max-h-[460px] overflow-auto rounded-lg border border-border bg-surface scrollbar-thin">
        {html ? (
          <div className="p-4 text-[12.5px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:font-mono" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="p-4 font-mono text-[12.5px] leading-relaxed text-foreground">{code}</pre>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        The <code className="num">sizes</code> attribute follows your container width strategy. Replace image paths and alt text with your own.
      </p>
    </div>
  );
}
