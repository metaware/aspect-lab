# AspectLab

**Responsive Image Simulator.** See how an image scales, crops and positions inside a responsive container at any viewport width, aspect ratio, container height strategy and CSS `object-fit`, without writing CSS or opening devtools.

Everything runs in the browser. There is no backend, and uploaded images never leave the device.

## Getting started

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build (fully static, deployable to Vercel as-is) |
| `pnpm test` | Vitest unit tests for the geometry engine, optimizer, config and codegen |
| `pnpm test:e2e` | Playwright end-to-end tests (builds into `.next-e2e`, so it is safe to run alongside `pnpm dev`) |
| `pnpm typecheck` | `tsc --noEmit` (strict mode) |
| `node scripts/generate-samples.mjs` | Regenerates the sample illustrations in `public/samples` |

Optional: set `NEXT_PUBLIC_GITHUB_URL` to show a GitHub link in the header.

## What it does

- **Constant-scale component preview.** The container is rendered at its true CSS size and scaled by a fixed zoom, so the browser's own `object-fit`/`object-position` does the rendering. With a fixed height, the preview height stays the same at every viewport width. Auto-fit is an explicit mode and never silently replaces a manual zoom.
- **Cropping preview.** Shows the whole original image. Regions removed by the source-asset crop, regions cropped by the component (hatched), and the visible region (green) are drawn separately, with per-edge measurements, the focal point, and the safe zone.
- **Source sizing.** Native, *Crop to selected ratio* (the default) or *Resize with distortion*. Source-asset cropping and component cropping are separate operations and are reported separately.
- **Container sizing.** Width can be full, percentage, fixed, fluid with a max, or a grid column span. Height can be fixed, a container aspect ratio, automatic, `vh/svh/dvh/lvh` of a *simulated* viewport, fluid `clamp()`, or content-based. Optional min/max width and height constraints are supported, and the inspector shows both requested and resolved sizes.
- **Inspector.** Image, container, rendering, crop (CSS px and source px), empty space, quality warnings (upscaling, DPR shortfall, distortion, heavy cropping, focal point lost) and the safe zone.
- **Analysis.**
  - A cropping chart across a viewport range, with up to 6 ratios and 5 metrics, plus a table view.
  - A multi-viewport and multi-ratio comparison at one shared scale.
  - A breakpoint optimizer. For fixed-height, full-width cover it uses the closed form `√(min·max)/height`; for every other mode it searches numerically.
  - A responsive asset planner, which finds the fewest variants that meet a crop tolerance.
  - Code generation for HTML/CSS, Tailwind, React, `next/image` and art-directed `<picture>`.
- **Sharing.** A versioned, readable URL (`/?v=1&vw=430&mode=fixed&h=640&ar=9:16&fit=cover&x=50&y=50`), JSON import/export and localStorage persistence. Local uploads are never put in links.
- **Export.** Component PNG at the configured size × DPR, the original with its crop overlay, comparison strips, a CSV of the cropping analysis, recommendations JSON and implementation code. Remote images that block CORS are handled gracefully.

## Architecture

```
src/lib/geometry/        Pure TypeScript engine (no React)
  object-fit.ts          CSS object-fit + object-position
  cropping.ts            crop, coverage, empty space, source-pixel crop
  resolve-container.ts   width/height modes and constraints
  effective-source.ts    native / crop / distort source asset
  focal-point.ts         focal-point → object-position (clamped)
  safe-zone.ts           visible-rect intersection across a viewport range
  simulate.ts            the single pipeline every preview, row and chart point uses
src/lib/optimization/    aspect-ratio optimizer + asset planner
src/lib/configuration/   defaults, Zod schema (with repair + migration hook), URL serialization
src/lib/codegen/         implementation code generators
src/store/               Zustand store: user config only; derived values are computed
src/components/          layout · configuration · preview · inspector · analytics · export
```

Design tokens (light and dark) live in `src/app/globals.css`, and components use only semantic tokens. The chart palette is validated for color-vision deficiencies in both themes.

## Sample images

The sample library contains original illustrations generated in code by `scripts/generate-samples.mjs`. They are part of this project and can be redistributed with it. The calibration grid and technical test image are generated at runtime at any aspect ratio.
