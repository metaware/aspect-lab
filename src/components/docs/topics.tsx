"use client";

import type { ReactNode } from "react";
import {
  AssetPlanSketch,
  ChartSketch,
  CodeSketch,
  ConstantScaleDiagram,
  CropAreaDiagram,
  FitDiagram,
  FocalMarkerDiagram,
  HeightModeDiagram,
  OptimizerSketch,
  OverlayDiagram,
  SafeZoneDiagram,
  StrategyDiagram,
  WidthModeDiagram,
  focalCenteredPosition,
} from "./illustrations";

export interface TopicOption {
  name: string;
  description: ReactNode;
  figure?: ReactNode;
}

export interface Topic {
  id: TopicId;
  title: string;
  group: "Configure" | "Workspace" | "Analyze" | "Share";
  summary: ReactNode;
  /** Lead illustration shown under the summary. */
  figure?: ReactNode;
  figureCaption?: ReactNode;
  options?: TopicOption[];
  /** Columns for the option figures grid. */
  optionColumns?: 2 | 3 | 4 | 5 | 6;
  details?: ReactNode;
  tips: ReactNode[];
  related?: TopicId[];
}

export type TopicId =
  | "source-image"
  | "aspect-ratio"
  | "crop-area"
  | "viewport"
  | "container-width"
  | "container-height"
  | "object-fit"
  | "position"
  | "focal-point"
  | "overlay"
  | "canvas"
  | "inspector"
  | "safe-zone"
  | "cropping-chart"
  | "compare"
  | "optimizer"
  | "asset-planner"
  | "code"
  | "sharing";

const tall = { width: 64, height: 100 };

export const TOPICS: Topic[] = [
  {
    id: "source-image",
    title: "Source image",
    group: "Configure",
    summary: "The original image the simulation runs on. Everything else (ratio, fit, position) is applied to this image.",
    options: [
      { name: "Sample library", description: "Ten curated images, each chosen for a different cropping challenge: wide landscapes, a portrait with the face off-center, symmetrical architecture, people across the full width, an off-center subject, and a calibration grid." },
      { name: "Upload", description: "Drag and drop, browse, or paste from the clipboard. JPEG, PNG, WebP, AVIF and GIF (first frame). The file stays in your browser and is never uploaded or put in share links." },
      { name: "Remote URL", description: "Any HTTPS image. If the server blocks pixel access (CORS), previews still work but PNG exports and generated crop assets are unavailable." },
      { name: "Technical test image", description: "A generated grid with numbered cells, centerlines, edge labels, corner markers and safe-zone rings. It is drawn natively at the selected ratio, which makes exact crops easy to read." },
    ],
    tips: [
      "Use the calibration grid to check precisely which rows and columns survive at a breakpoint.",
      "Upload the real hero asset from your design file to see how it behaves before engineering builds it.",
      "The thumbnail panel shows intrinsic size, format and file size, which is useful for spotting oversized assets.",
    ],
    related: ["aspect-ratio", "inspector"],
  },
  {
    id: "aspect-ratio",
    title: "Aspect ratio & source sizing",
    group: "Configure",
    summary: "Sets the aspect ratio of the source asset you would ship. This is not the container's shape; it describes the image file itself.",
    figureCaption: "Native keeps the original. Crop cuts a region of the original. Distort stretches it.",
    options: [
      { name: "Native", description: "Use the original exactly as it is.", figure: <StrategyDiagram strategy="native" /> },
      { name: "Crop to ratio", description: "Default for presets. Produces the asset by cutting the largest region of the original that matches the ratio. You choose which region with the crop area controls.", figure: <StrategyDiagram strategy="crop" /> },
      { name: "Distort", description: "Stretches the original to the ratio. It is marked as distortion because subjects get squashed; use it only to demonstrate the problem.", figure: <StrategyDiagram strategy="distort" /> },
    ],
    details: (
      <p>
        Presets are grouped as portrait, square, landscape and ultrawide. Custom ratios accept any positive W:H (e.g. 1200:628) and show the normalized form and decimal. The ⇄ button inverts the ratio. Cropping the source and cropping by the container are separate operations, and the inspector reports them separately.
      </p>
    ),
    tips: [
      "Compare 9:16 and 4:5 for a mobile hero, then switch to the cropping chart to see how each behaves across widths.",
      "Use Native to see the image's own behavior before deciding whether a dedicated asset is worth producing.",
    ],
    related: ["crop-area", "object-fit", "optimizer"],
  },
  {
    id: "crop-area",
    title: "Crop area",
    group: "Configure",
    summary: "When cropping to a ratio, chooses which part of the original becomes the asset. For example, which 1072×1072 square of a 1920×1072 photo.",
    optionColumns: 3,
    options: [
      { name: "Left (0%)", description: "Box against the left edge.", figure: <CropAreaDiagram at={0} /> },
      { name: "Center (50%)", description: "Default.", figure: <CropAreaDiagram at={0.5} /> },
      { name: "Right (100%)", description: "Box against the right edge.", figure: <CropAreaDiagram at={1} /> },
    ],
    details: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Drag</b> the orange dashed box on the cropping preview, or focus it and use the arrow keys (Shift moves 10%).
        </li>
        <li>
          <b>Sliders</b> appear only for axes with room to move. A 1:1 crop of a wide photo moves horizontally only.
        </li>
        <li>
          <b>Align to focal point</b> centers the box on your marked subject, clamped to the image.
        </li>
      </ul>
    ),
    tips: [
      "Crop area chooses the asset; Position then crops again inside the container. Set the crop area first.",
      "Shared links remember it (scx/scy in the URL), so reviewers see the same crop.",
    ],
    related: ["aspect-ratio", "position", "focal-point"],
  },
  {
    id: "viewport",
    title: "Viewport",
    group: "Configure",
    summary: "The simulated browser window. Viewport width drives the container's width; viewport height only matters for vh, svh, dvh and lvh heights.",
    figure: <WidthModeDiagram mode="max" />,
    figureCaption: "The dashed frame is the viewport; the orange box is the component inside it.",
    details: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The slider is logarithmic, so mobile widths get fine control and large desktops still fit (320–3840px).</li>
        <li>Device presets include the 767px and 1535px breakpoint boundaries. Use [ and ] to nudge by 1px, or Shift for 10px.</li>
        <li>Browser UI (shown for viewport-height modes) simulates the address bar: svh and dvh subtract it, vh and lvh don&apos;t.</li>
      </ul>
    ),
    tips: [
      "Step through 767 → 768 to see exactly what changes at a breakpoint.",
      "Viewport width is separate from component width. A max-width container stops growing even as the viewport does.",
    ],
    related: ["container-width", "container-height", "compare"],
  },
  {
    id: "container-width",
    title: "Container width",
    group: "Configure",
    summary: "How wide the component is at a given viewport. The resolved pixel width appears under the controls and in the inspector.",
    optionColumns: 2,
    options: [
      { name: "Full width", description: "Viewport width minus the gutter on each side.", figure: <WidthModeDiagram mode="full" /> },
      { name: "Percentage", description: "A percentage of the available width.", figure: <WidthModeDiagram mode="percent" /> },
      { name: "Fixed", description: "An exact pixel width, whatever the viewport.", figure: <WidthModeDiagram mode="fixed" /> },
      { name: "Fluid with max width", description: "Grows with the viewport until a maximum, then stays centered.", figure: <WidthModeDiagram mode="max" /> },
      { name: "Grid column span", description: "Spans N of M grid columns with a gap; the width includes the inner gaps.", figure: <WidthModeDiagram mode="grid" /> },
    ],
    details: <p>Optional min-width and max-width constraints apply after the mode, so the inspector shows both the requested and the resolved size.</p>,
    tips: [
      "Model a card in a 12-column grid (span 4, gap 24) to see how much a thumbnail really crops on laptops.",
      "Max-width containers stop growing, so cropping often stops changing past that width. Check this in the chart.",
    ],
    related: ["container-height", "viewport", "code"],
  },
  {
    id: "container-height",
    title: "Container height",
    group: "Configure",
    summary: "How tall the component is. This is usually the biggest factor in how much an image crops. Each diagram shows the same component at 390px and 1280px.",
    optionColumns: 2,
    options: [
      { name: "Fixed", description: "Constant pixel height at every width. Wide screens crop heavily.", figure: <HeightModeDiagram mode="fixed" /> },
      { name: "Aspect ratio", description: "Height follows width through a container ratio (independent of the image ratio).", figure: <HeightModeDiagram mode="aspect" /> },
      { name: "Auto", description: "Height follows the image's own ratio, so the full image fits.", figure: <HeightModeDiagram mode="auto" /> },
      { name: "Viewport (vh/svh/dvh/lvh)", description: "A share of the simulated viewport height, not your real browser window.", figure: <HeightModeDiagram mode="viewport" /> },
      { name: "Fluid clamp()", description: "clamp(min, preferred vw, max), which grows with width between two bounds.", figure: <HeightModeDiagram mode="fluid" /> },
      { name: "Content", description: "Height comes from content plus padding. This is a simplified simulation, not a full layout engine.", figure: <HeightModeDiagram mode="content" /> },
    ],
    details: <p>Min-height and max-height constraints apply last. The inspector shows the requested and resolved size so you can see when a constraint kicked in.</p>,
    tips: [
      "A fixed 640px hero is great on phones but crops most of a landscape image on desktop. Try fluid clamp() instead.",
      "Viewport-height heroes depend on the device's height too. Test 390×844 against 390×664.",
    ],
    related: ["container-width", "object-fit", "safe-zone"],
  },
  {
    id: "object-fit",
    title: "Object fit",
    group: "Configure",
    summary: "The CSS object-fit value: how the image is scaled into the container. The faded, hatched area is what gets cropped away.",
    optionColumns: 5,
    options: [
      { name: "cover", description: "Fills the box, keeps proportions, and crops the overflow. The default.", figure: <FitDiagram box={tall} fit="cover" /> },
      { name: "contain", description: "Shows the whole image and leaves empty bands (letterboxing).", figure: <FitDiagram box={tall} fit="contain" /> },
      { name: "fill", description: "Stretches to the box. The image is distorted.", figure: <FitDiagram box={tall} fit="fill" /> },
      { name: "none", description: "Intrinsic size, no scaling, so it may crop or leave space.", figure: <FitDiagram box={tall} fit="none" /> },
      { name: "scale-down", description: "The smaller of none and contain. It never upscales.", figure: <FitDiagram box={{ width: 140, height: 100 }} fit="scale-down" /> },
    ],
    details: <p>Container background fills any empty space (contain, none, scale-down). Empty space is reported separately from cropping. They are different problems.</p>,
    tips: [
      "Product shots often want contain on a neutral background. Hero photography usually wants cover.",
      "If quality warnings show upscaling, scale-down shows what the image would look like if it were never enlarged.",
    ],
    related: ["position", "container-height", "inspector"],
  },
  {
    id: "position",
    title: "Position",
    group: "Configure",
    summary: "CSS object-position: which part of the rendered image stays in the box when cover crops. It changes where the crop happens, not how much.",
    optionColumns: 3,
    options: [
      { name: "0% (left)", description: "Keeps the left side.", figure: <FitDiagram box={tall} pos={{ x: 0, y: 0.5 }} /> },
      { name: "50% (center)", description: "Default.", figure: <FitDiagram box={tall} pos={{ x: 0.5, y: 0.5 }} /> },
      { name: "100% (right)", description: "Keeps the right side.", figure: <FitDiagram box={tall} pos={{ x: 1, y: 0.5 }} /> },
    ],
    details: <p>Use the 3×3 grid, the sliders, exact percentages, or drag the image inside the component preview. Dragging switches off &ldquo;keep focal point centered&rdquo;.</p>,
    tips: [
      "Portraits usually want vertical position around 20–35% so heads aren't cut off on wide screens.",
      "Total crop percentage doesn't change with position; check the per-edge numbers in the inspector instead.",
    ],
    related: ["focal-point", "crop-area", "object-fit"],
  },
  {
    id: "focal-point",
    title: "Focal point",
    group: "Configure",
    summary: "Marks the important subject on the original image. AspectLab can then keep it centered and warns you when a crop loses it.",
    optionColumns: 2,
    options: [
      { name: "Mark the subject", description: "Click Set focal point, then click the subject on the original (cropping preview). Suggest uses each sample's known subject.", figure: <FocalMarkerDiagram /> },
      { name: "Keep focal point centered", description: "Computes object-position so the subject sits as close to the container center as possible, clamped to valid bounds.", figure: <FitDiagram box={tall} pos={focalCenteredPosition(tall)} /> },
    ],
    details: <p>The focal point is stored in original-image coordinates and is separate from object-position. The inspector flags it as removed by the source crop, cropped out, or always visible within the safe zone.</p>,
    tips: [
      "Set a focal point, then use Align to focal point in Crop area to build the asset around the subject.",
      "With the safe zone on, a focal point outside the dashed box means some viewports will lose the subject.",
    ],
    related: ["position", "crop-area", "safe-zone"],
  },
  {
    id: "overlay",
    title: "Content overlay",
    group: "Configure",
    summary: "Simulates hero content (badge, heading, text, buttons, logo) on top of the image, at true size, to check legibility and collisions with the subject.",
    optionColumns: 3,
    options: [
      { name: "No scrim", description: "Text directly on the photo.", figure: <OverlayDiagram scrim="none" /> },
      { name: "Gradient scrim", description: "Fades from one edge; set the direction and opacity.", figure: <OverlayDiagram scrim="gradient" /> },
      { name: "Dark scrim", description: "Uniform darkening for maximum contrast.", figure: <OverlayDiagram scrim="dark" /> },
    ],
    details: <p>Alignment, padding, maximum content width and text color are adjustable. Overlay text is real HTML, which is why it&apos;s generally better than text baked into the image.</p>,
    tips: [
      "Turn on the safe zone with an overlay to make sure the copy never lands on the subject at any width.",
      "Check the 360px and 1535px extremes: overlays that fit on desktop often cover faces on mobile.",
    ],
    related: ["safe-zone", "focal-point"],
  },
  {
    id: "canvas",
    title: "Canvas & preview",
    group: "Workspace",
    summary: "The component preview renders at true CSS size and a constant zoom, so a fixed-height component keeps the same visual height as the viewport changes.",
    figure: <ConstantScaleDiagram />,
    figureCaption: "At a constant zoom, 360px, 767px and 1535px components all render at the same height.",
    details: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Views:</b> Component shows what users see, Cropping shows what the source loses, and Split shows both.
        </li>
        <li>
          <b>Zoom:</b> presets from 10% to 200%, or Fit (an explicit mode that never overrides a manual zoom). Use ⌘/Ctrl + scroll or pinch to zoom at the pointer.
        </li>
        <li>
          <b>Tools:</b> Pan (or hold Space), Grid, Rulers, Dimensions, Cropped area (the faded overflow), Outline and Safe zone.
        </li>
        <li>Scrolling over a zoomed canvas pans it; when the canvas fits, scrolling moves the page.</li>
      </ul>
    ),
    tips: ["Press ? for all keyboard shortcuts.", "Drag the image inside the component to set object-position by hand."],
    related: ["safe-zone", "compare"],
  },
  {
    id: "inspector",
    title: "Inspector",
    group: "Workspace",
    summary: "Live numbers for the current setup: how much of the image is visible, where it's cropped, scaling, empty space and quality warnings.",
    details: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Image visible</b> is the share of the source asset shown in the component. Cropping preview draws the same on the original.
        </li>
        <li>
          <b>Crop per edge</b> is reported in CSS pixels and in source-image pixels.
        </li>
        <li>
          <b>Quality</b> warns about upscaling, too few pixels for the chosen DPR (1×, 1.5×, 2× or 3×), distortion, heavy cropping, and a lost focal point.
        </li>
        <li>
          <b>Empty space</b> (contain, none, scale-down) is reported separately; it isn&apos;t cropping.
        </li>
      </ul>
    ),
    tips: ["Set DPR to 2× for modern phones. The resolution warning tells you the minimum asset size you need."],
    related: ["object-fit", "safe-zone", "asset-planner"],
  },
  {
    id: "safe-zone",
    title: "Safe zone",
    group: "Workspace",
    summary: "The part of the image that stays visible at every viewport width in the analysis range. Subjects and baked-in content placed inside it are never cropped.",
    figure: <SafeZoneDiagram />,
    figureCaption: (
      <>
        Blue: visible at 360px. Green: visible at 1535px. Dashed amber: visible at both, the safe zone. The darker area is cropped at some width.
      </>
    ),
    details: (
      <p>
        AspectLab runs the full simulation at 128 evenly spaced widths across the analysis range (360–1535px by default) using all your settings, and intersects the visible regions. Turn it on with the Safe zone tool or press S. The inspector shows the percentage that is always visible and whether your focal point is inside it. With contain, the whole image is always visible.
      </p>
    ),
    tips: [
      "Hand the safe zone to photographers and illustrators as the area where the subject must sit.",
      "Narrow the analysis range to one breakpoint (e.g. 768–1023) to get a per-asset safe zone.",
    ],
    related: ["focal-point", "overlay", "cropping-chart"],
  },
  {
    id: "cropping-chart",
    title: "Cropping analysis",
    group: "Analyze",
    summary: "A chart of how a metric changes as the viewport widens, for up to six source ratios, using your full configuration.",
    figure: <ChartSketch />,
    figureCaption: "Each line is a ratio; the vertical line is the current viewport. Dips to 0% are widths where that ratio fits exactly.",
    details: <p>Metrics: image cropped, image visible, container coverage, rendered scale, and the source width needed at the chosen DPR. Breakpoint markers (sm–2xl) are drawn for reference, and a table view shows the same data.</p>,
    tips: [
      "Find the ratio with the lowest worst-case line across your mobile range: that's your mobile asset.",
      "Switch the metric to source px to read the exact asset width to export at each breakpoint.",
    ],
    related: ["optimizer", "compare"],
  },
  {
    id: "compare",
    title: "Compare",
    group: "Analyze",
    summary: "Shows the same component side by side at several viewport widths, or at several ratios at one width, all at one shared zoom.",
    figure: <ConstantScaleDiagram />,
    figureCaption: "A shared scale means fixed-height components line up exactly.",
    tips: ["Use ratio mode at 390px to pick between 4:5, 9:16 and 1:1 for a mobile card.", "Export the strip as a PNG for design reviews."],
    related: ["canvas", "cropping-chart"],
  },
  {
    id: "optimizer",
    title: "Breakpoint optimizer",
    group: "Analyze",
    summary: "For each breakpoint range, finds the source ratio that crops the least, and the best standard ratio by actual cropping.",
    figure: <OptimizerSketch />,
    figureCaption: "Worst-case cropping across 360–767px at 640px tall. 5:6 wins over 4:5 by a small margin.",
    details: (
      <p>
        Strategies: minimize worst-case, minimize average, optimize for one preferred viewport, or use one ratio for every range (fewest assets). For fixed-height, full-width cover the worst-case optimum is exact: √(min × max) ÷ height. All other setups are searched numerically. Each row suggests an asset resolution at your DPR.
      </p>
    ),
    tips: ["Edit the ranges to match your design system's breakpoints.", "These are mathematical suggestions; check the subject with the safe zone and a focal point."],
    related: ["asset-planner", "cropping-chart"],
  },
  {
    id: "asset-planner",
    title: "Asset planner",
    group: "Analyze",
    summary: "Plans how many image variants you need, and at what ratio and resolution, to keep cropping under your tolerance across the range.",
    figure: <AssetPlanSketch />,
    figureCaption: "The range is split at breakpoints into the fewest assets that meet the tolerance.",
    details: <p>Set the maximum acceptable cropping, maximum number of variants, target DPR and formats. If the tolerance can&apos;t be met, it says so and shows the best achievable plan. The Picture code output uses this plan for art direction.</p>,
    tips: ["Start at a 35% tolerance with 3 variants, then tighten until the plan stops meeting it."],
    related: ["optimizer", "code"],
  },
  {
    id: "code",
    title: "Code",
    group: "Analyze",
    summary: "Production-ready markup for the current setup: HTML and CSS, Tailwind, React, the Next.js Image component, or an art-directed <picture>.",
    figure: <CodeSketch />,
    details: <p>The sizes attribute follows your width strategy, height follows your height mode, and object-position uses the applied value (including focal-point centering). Copy or download any format.</p>,
    tips: ["Use the Picture format with the asset planner to ship different crops per breakpoint."],
    related: ["asset-planner", "container-width"],
  },
  {
    id: "sharing",
    title: "Sharing & export",
    group: "Share",
    summary: "The full configuration lives in the URL, is saved in your browser, and can be exported as JSON. Exports render at true size, not at the on-screen zoom.",
    details: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Share links are readable (e.g. ?vw=430&amp;mode=fixed&amp;h=640&amp;ar=9:16) and versioned so old links keep working.</li>
        <li>Uploaded images are never put in links; the recipient has to upload their own copy.</li>
        <li>Export the component or crop overlay as PNG, a comparison strip, cropping data as CSV, recommendations as JSON, or code.</li>
      </ul>
    ),
    tips: ["Paste a share link in a design-review ticket so everyone sees the same breakpoint and crop."],
    related: ["code", "compare"],
  },
];

export const TOPIC_MAP = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, Topic>;
