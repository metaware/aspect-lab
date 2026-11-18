import type { Simulation } from "@/lib/geometry/simulate";
import { loadImage } from "@/hooks/use-effective-asset";

export class ExportBlockedError extends Error {
  constructor() {
    super("This remote image does not allow pixel access (CORS), so it can't be exported. Use a sample or upload a copy.");
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png");
    } catch {
      reject(new ExportBlockedError());
    }
  });
}

/** Draws the component (container + image) at true CSS size × scale, independent of zoom. */
function drawComponent(ctx: CanvasRenderingContext2D, img: HTMLImageElement, sim: Simulation, background: string, x = 0, y = 0) {
  const m = sim.metrics;
  const r = sim.effective.sourceRect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, m.containerWidth, m.containerHeight);
  ctx.clip();
  ctx.fillStyle = background;
  ctx.fillRect(x, y, m.containerWidth, m.containerHeight);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, r.x, r.y, r.width, r.height, x + m.offsetX, y + m.offsetY, m.renderedWidth, m.renderedHeight);
  ctx.restore();
}

export async function renderComponentPng(
  sim: Simulation,
  src: string,
  background: string,
  scale = 1,
  crossOrigin = false,
): Promise<Blob> {
  const img = await loadImage(src, crossOrigin);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sim.metrics.containerWidth * scale);
  canvas.height = Math.round(sim.metrics.containerHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  drawComponent(ctx, img, sim, background);
  return toBlob(canvas);
}

/** Original image with the source-crop, component-crop and visible-region overlay. */
export async function renderCropOverlayPng(sim: Simulation, src: string, crossOrigin = false): Promise<Blob> {
  const img = await loadImage(src, crossOrigin);
  const { width: W, height: H } = sim.original;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W);
  canvas.height = Math.round(H);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);

  const s = sim.effective.sourceRect;
  const v = sim.metrics.visibleSourceRect;
  const kx = s.width / sim.effective.width;
  const ky = s.height / sim.effective.height;
  const vis = { x: s.x + v.x * kx, y: s.y + v.y * ky, w: v.width * kx, h: v.height * ky };

  ctx.save();
  ctx.fillStyle = "rgba(10,10,14,0.82)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(s.x, s.y, s.width, s.height);
  ctx.fill("evenodd");
  ctx.fillStyle = "rgba(20,20,26,0.62)";
  ctx.beginPath();
  ctx.rect(s.x, s.y, s.width, s.height);
  ctx.rect(vis.x, vis.y, vis.w, vis.h);
  ctx.fill("evenodd");
  // Hatching over the component-cropped region.
  ctx.beginPath();
  ctx.rect(s.x, s.y, s.width, s.height);
  ctx.rect(vis.x, vis.y, vis.w, vis.h);
  ctx.clip("evenodd");
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(1, W / 800);
  const step = Math.max(8, W / 120);
  for (let d = -H; d < W; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, H);
    ctx.lineTo(d + H, 0);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = Math.max(2, W / 500);
  ctx.strokeRect(vis.x, vis.y, vis.w, vis.h);
  return toBlob(canvas);
}

/** Side-by-side strip of several component renders with labels, at true size × scale. */
export async function renderComparisonPng(
  items: Array<{ sim: Simulation; label: string }>,
  src: string,
  background: string,
  scale = 0.5,
  crossOrigin = false,
): Promise<Blob> {
  const img = await loadImage(src, crossOrigin);
  const gap = 48;
  const labelH = 40;
  const width = items.reduce((sum, i) => sum + i.sim.metrics.containerWidth, 0) + gap * (items.length + 1);
  const height = Math.max(...items.map((i) => i.sim.metrics.containerHeight)) + labelH + gap * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, width, height);
  let x = gap;
  ctx.font = `500 ${22}px ui-monospace, monospace`;
  for (const { sim, label } of items) {
    ctx.fillStyle = "#3f3f46";
    ctx.fillText(label, x, gap + 22);
    drawComponent(ctx, img, sim, background, x, gap + labelH);
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, gap + labelH, sim.metrics.containerWidth, sim.metrics.containerHeight);
    x += sim.metrics.containerWidth + gap;
  }
  return toBlob(canvas);
}
