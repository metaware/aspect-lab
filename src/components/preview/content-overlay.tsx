"use client";

import type { SimulatorConfig } from "@/types/simulator";

const ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end" };
const GRADIENT: Record<string, string> = {
  "to-top": "to top",
  "to-bottom": "to bottom",
  "to-left": "to left",
  "to-right": "to right",
};

/**
 * Simulated hero content rendered at true CSS size inside the container.
 * Colors here are user content (configurable), not interface tokens.
 */
export function ContentOverlay({ overlay }: { overlay: SimulatorConfig["overlay"] }) {
  if (!overlay.enabled) return null;
  const scrim =
    overlay.scrim === "dark"
      ? `rgba(0,0,0,${overlay.opacity})`
      : overlay.scrim === "gradient"
        ? `linear-gradient(${GRADIENT[overlay.gradientDirection]}, rgba(0,0,0,${overlay.opacity}) 0%, rgba(0,0,0,${overlay.opacity * 0.35}) 45%, transparent 75%)`
        : undefined;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {scrim && <div className="absolute inset-0" style={{ background: scrim }} />}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          padding: overlay.padding,
          alignItems: ALIGN[overlay.alignX],
          justifyContent: ALIGN[overlay.alignY],
          textAlign: overlay.alignX === "center" ? "center" : overlay.alignX === "end" ? "right" : "left",
          color: overlay.textColor,
        }}
      >
        {overlay.showLogo && (
          <div className="absolute flex items-center gap-2 text-sm font-semibold" style={{ top: overlay.padding, left: overlay.padding }}>
            <span className="inline-block size-6 rounded-md border-2" style={{ borderColor: overlay.textColor }} />
            Brand
          </div>
        )}
        <div style={{ maxWidth: overlay.maxContentWidth }} className="flex flex-col gap-3" data-align={overlay.alignX}>
          {overlay.showBadge && overlay.badge && (
            <span
              className="w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                borderColor: `${overlay.textColor}55`,
                alignSelf: ALIGN[overlay.alignX],
                background: "rgba(255,255,255,0.08)",
              }}
            >
              {overlay.badge}
            </span>
          )}
          <h2 className="text-[clamp(1.5rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-tight" style={{ textWrap: "balance" }}>
            {overlay.heading}
          </h2>
          {overlay.showDescription && overlay.description && (
            <p className="text-base leading-relaxed opacity-85">{overlay.description}</p>
          )}
          {(overlay.showPrimaryCta || overlay.showSecondaryCta) && (
            <div className="mt-2 flex flex-wrap gap-2" style={{ justifyContent: ALIGN[overlay.alignX] }}>
              {overlay.showPrimaryCta && (
                <span className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900">{overlay.primaryCta}</span>
              )}
              {overlay.showSecondaryCta && (
                <span className="rounded-md border px-4 py-2 text-sm font-medium" style={{ borderColor: `${overlay.textColor}66` }}>
                  {overlay.secondaryCta}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
