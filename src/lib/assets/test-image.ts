/**
 * Technical calibration image generated natively at any size. Includes a
 * numbered grid, centerlines, distinct corner markers, percentage coordinate
 * labels, a central focal point, concentric safe-zone rectangles and labelled,
 * color-coded edges so exact crops are easy to read.
 */
export function createTestImageSvg(width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  const min = Math.min(w, h);
  const cols = Math.max(4, Math.min(16, Math.round(w / (min / 6))));
  const rows = Math.max(4, Math.min(16, Math.round(h / (min / 6))));
  const cw = w / cols;
  const ch = h / rows;
  const font = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const band = Math.max(10, min * 0.018);
  const labelSize = Math.max(12, min * 0.022);
  const cellSize = Math.max(14, Math.min(cw, ch) * 0.2);
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="#f5f5f4"/>`,
  );

  // Checker cells with numbers.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = r * cols + c + 1;
      const shade = (r + c) % 2 === 0 ? "#ecebea" : "#f7f7f6";
      out.push(`<rect x="${c * cw}" y="${r * ch}" width="${cw}" height="${ch}" fill="${shade}"/>`);
      out.push(
        `<text x="${c * cw + cw * 0.08}" y="${r * ch + ch * 0.08 + cellSize}" font-family="${font}" font-size="${cellSize}" fill="#a8a29e">${n}</text>`,
      );
    }
  }
  for (let c = 1; c < cols; c++) out.push(`<line x1="${c * cw}" y1="0" x2="${c * cw}" y2="${h}" stroke="#d6d3d1" stroke-width="${Math.max(1, min / 900)}"/>`);
  for (let r = 1; r < rows; r++) out.push(`<line x1="0" y1="${r * ch}" x2="${w}" y2="${r * ch}" stroke="#d6d3d1" stroke-width="${Math.max(1, min / 900)}"/>`);

  // Concentric safe-zone rectangles.
  const zones: Array<[number, string]> = [
    [0.9, "#6366f1"],
    [0.75, "#10b981"],
    [0.5, "#f59e0b"],
  ];
  for (const [f, color] of zones) {
    const zw = w * f;
    const zh = h * f;
    out.push(
      `<rect x="${(w - zw) / 2}" y="${(h - zh) / 2}" width="${zw}" height="${zh}" fill="none" stroke="${color}" stroke-width="${Math.max(2, min / 400)}" stroke-dasharray="${min / 60} ${min / 90}"/>`,
      `<text x="${(w - zw) / 2 + labelSize * 0.4}" y="${(h - zh) / 2 + labelSize * 1.2}" font-family="${font}" font-size="${labelSize * 0.8}" fill="${color}" font-weight="600">${Math.round(f * 100)}%</text>`,
    );
  }

  // Centerlines.
  const cl = Math.max(2, min / 500);
  out.push(
    `<line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}" stroke="#ef4444" stroke-width="${cl}" stroke-opacity="0.7"/>`,
    `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#ef4444" stroke-width="${cl}" stroke-opacity="0.7"/>`,
  );

  // Edge bands, color coded.
  const edges = [
    { x: 0, y: 0, w, h: band, color: "#2563eb", label: "TOP", lx: w / 2, ly: band + labelSize * 1.3, anchor: "middle" },
    { x: 0, y: h - band, w, h: band, color: "#16a34a", label: "BOTTOM", lx: w / 2, ly: h - band - labelSize * 0.5, anchor: "middle" },
    { x: 0, y: 0, w: band, h, color: "#d97706", label: "LEFT", lx: band + labelSize * 0.5, ly: h / 2 - labelSize * 0.6, anchor: "start" },
    { x: w - band, y: 0, w: band, h, color: "#db2777", label: "RIGHT", lx: w - band - labelSize * 0.5, ly: h / 2 - labelSize * 0.6, anchor: "end" },
  ];
  for (const e of edges) {
    out.push(
      `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${e.color}"/>`,
      `<text x="${e.lx}" y="${e.ly}" text-anchor="${e.anchor}" font-family="${font}" font-size="${labelSize * 1.1}" font-weight="700" fill="${e.color}">${e.label}</text>`,
    );
  }

  // Percentage coordinate labels along the top and left edges.
  for (let i = 1; i < 10; i++) {
    const x = (w * i) / 10;
    const y = (h * i) / 10;
    out.push(
      `<line x1="${x}" y1="${band}" x2="${x}" y2="${band + labelSize * 0.6}" stroke="#57534e" stroke-width="${cl}"/>`,
      `<text x="${x}" y="${band + labelSize * 2.6}" text-anchor="middle" font-family="${font}" font-size="${labelSize * 0.75}" fill="#57534e">${i * 10}%</text>`,
      `<line x1="${band}" y1="${y}" x2="${band + labelSize * 0.6}" y2="${y}" stroke="#57534e" stroke-width="${cl}"/>`,
      `<text x="${band + labelSize * 0.9}" y="${y + labelSize * 0.28}" font-family="${font}" font-size="${labelSize * 0.75}" fill="#57534e">${i * 10}%</text>`,
    );
  }

  // Distinct corner markers: square, circle, triangle, diamond.
  const m = min * 0.07;
  const pad = band + m * 0.35;
  out.push(
    `<rect x="${pad}" y="${pad}" width="${m}" height="${m}" fill="#2563eb"/>`,
    `<text x="${pad + m / 2}" y="${pad + m / 2 + labelSize * 0.35}" text-anchor="middle" font-family="${font}" font-size="${labelSize}" font-weight="700" fill="#fff">TL</text>`,
    `<circle cx="${w - pad - m / 2}" cy="${pad + m / 2}" r="${m / 2}" fill="#db2777"/>`,
    `<text x="${w - pad - m / 2}" y="${pad + m / 2 + labelSize * 0.35}" text-anchor="middle" font-family="${font}" font-size="${labelSize}" font-weight="700" fill="#fff">TR</text>`,
    `<path d="M${pad} ${h - pad} L${pad + m} ${h - pad} L${pad + m / 2} ${h - pad - m} Z" fill="#d97706"/>`,
    `<text x="${pad + m / 2}" y="${h - pad - m * 0.22}" text-anchor="middle" font-family="${font}" font-size="${labelSize * 0.85}" font-weight="700" fill="#fff">BL</text>`,
    `<path d="M${w - pad - m / 2} ${h - pad - m} L${w - pad} ${h - pad - m / 2} L${w - pad - m / 2} ${h - pad} L${w - pad - m} ${h - pad - m / 2} Z" fill="#16a34a"/>`,
    `<text x="${w - pad - m / 2}" y="${h - pad - m / 2 + labelSize * 0.35}" text-anchor="middle" font-family="${font}" font-size="${labelSize * 0.85}" font-weight="700" fill="#fff">BR</text>`,
  );

  // Central focal point.
  const fr = min * 0.045;
  out.push(
    `<circle cx="${w / 2}" cy="${h / 2}" r="${fr}" fill="none" stroke="#111827" stroke-width="${cl * 1.5}"/>`,
    `<circle cx="${w / 2}" cy="${h / 2}" r="${fr * 0.35}" fill="#ef4444"/>`,
    `<text x="${w / 2 + fr * 1.3}" y="${h / 2 - fr * 1.1}" font-family="${font}" font-size="${labelSize * 0.85}" fill="#111827">50%, 50%</text>`,
    `<text x="${w / 2}" y="${h / 2 + fr * 2.4}" text-anchor="middle" font-family="${font}" font-size="${labelSize * 0.85}" fill="#57534e">${w} × ${h}</text>`,
  );

  out.push("</svg>");
  return out.join("");
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const cache = new Map<string, string>();

export function testImageDataUrl(width: number, height: number): string {
  const key = `${Math.round(width)}x${Math.round(height)}`;
  let url = cache.get(key);
  if (!url) {
    url = svgToDataUrl(createTestImageSvg(width, height));
    if (cache.size > 24) cache.delete(cache.keys().next().value!);
    cache.set(key, url);
  }
  return url;
}
