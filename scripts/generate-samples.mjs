#!/usr/bin/env node
/**
 * Generates AspectLab's sample images.
 *
 * Every image is an original flat-vector illustration built as an SVG string
 * in code (no external assets), then rasterised with sharp to:
 *   public/samples/<id>.webp          (exact dimensions, q≈82)
 *   public/samples/thumbs/<id>.webp   (480px long side, q≈70)
 *
 * Output is deterministic (seeded PRNG).
 * Run: node scripts/generate-samples.mjs [id ...]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "samples");
const THUMBS = path.join(OUT, "thumbs");

/* ------------------------------------------------------------------ utils */

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (n) => Math.round(n * 10) / 10;

const stopsXml = (stops) =>
  stops
    .map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}"${op !== 1 ? ` stop-opacity="${op}"` : ""}/>`)
    .join("");
/** Linear gradient. stops: [[offset, color, opacity?], ...] */
const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml(stops)}</linearGradient>`;
const rg = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stopsXml(stops)}</radialGradient>`;
const blur = (id, sd) =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

/** Catmull-Rom spline through points -> cubic bezier path (open). */
function spline(pts, tension = 1) {
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/** Rolling ridge silhouette filled down to `bottom`. */
function ridge(W, bottom, base, amp, rnd, { step = 120, f1 = 1.3, f2 = 3.1, ph = 0, jitter = 0.35 } = {}) {
  const pts = [];
  for (let x = -step; x <= W + step; x += step) {
    const t = x / W;
    const y =
      base +
      amp * (Math.sin(t * Math.PI * 2 * f1 + ph) * 0.6 + Math.sin(t * Math.PI * 2 * f2 + ph * 2.3) * 0.4) +
      amp * jitter * (rnd() - 0.5) * 2;
    pts.push([x, y]);
  }
  return `${spline(pts)} L${W + step} ${bottom} L${-step} ${bottom} Z`;
}

const svg = (W, H, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;

/** A layered pine tree, base at (x,y). Optional c2 = shaded right half. */
function pine(x, y, h, c, c2) {
  const w = h * 0.32;
  const t = (yy, ww) => `M${r1(x)} ${r1(yy)} L${r1(x + ww)} ${r1(yy + h * 0.42)} L${r1(x - ww)} ${r1(yy + h * 0.42)}Z`;
  const shade = c2
    ? `<path d="M${r1(x)} ${r1(y - h)} L${r1(x + w * 0.6)} ${r1(y - h * 0.58)} L${r1(x + w * 0.4)} ${r1(y - h * 0.58)} L${r1(x + w * 0.82)} ${r1(y - h * 0.3)} L${r1(x + w * 0.6)} ${r1(y - h * 0.3)} L${r1(x + w)} ${r1(y - h * 0.06)} L${r1(x)} ${r1(y - h * 0.06)}Z" fill="${c2}"/>`
    : "";
  return `<path d="${t(y - h, w * 0.6)} ${t(y - h * 0.72, w * 0.82)} ${t(y - h * 0.48, w)}" fill="${c}"/>${shade}<rect x="${r1(x - h * 0.025)}" y="${r1(y - h * 0.08)}" width="${r1(h * 0.05)}" height="${r1(h * 0.1)}" fill="${c}"/>`;
}

/* ------------------------------------------------------------ 1 landscape */
function landscape() {
  const W = 2400, H = 1600, rnd = prng(11);
  const defs =
    lg("sky", [[0, "#9fb8c0"], [0.42, "#cfd8d0"], [0.68, "#f0dcc2"], [1, "#f3d7b8"]]) +
    rg("sun", [[0, "#fff6e4", 0.95], [0.25, "#fbe9cc", 0.55], [1, "#f6dcb8", 0]]) +
    lg("river", [[0, "#f3e6cf"], [0.45, "#c9d6cf"], [1, "#8fb0b0"]]) +
    lg("mist", [[0, "#f4e6d2", 0], [0.5, "#f4e6d2", 0.55], [1, "#f4e6d2", 0]]) +
    lg("peakL", [[0, "#93aaa8"], [1, "#7b9693"]]) +
    lg("peakR", [[0, "#6f8a89"], [1, "#5e7a79"]]) +
    blur("soft", 18);

  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  parts.push(`<circle cx="640" cy="430" r="420" fill="url(#sun)"/><circle cx="640" cy="430" r="92" fill="#fdf3e1"/>`);
  for (const [cx, cy, w] of [[300, 260, 380], [1150, 200, 520], [1900, 300, 420], [900, 520, 300]]) {
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${w * 0.07}" fill="#fbf4ea" opacity="0.5" filter="url(#soft)"/>`);
  }
  // distant range
  parts.push(`<path d="${ridge(W, H, 760, 70, rnd, { f1: 2.2, f2: 5.1, ph: 0.8 })}" fill="#bccac6" opacity="0.85"/>`);
  // side peaks
  parts.push(`<path d="M80 1010 L260 760 L360 690 L470 600 L520 560 L590 620 L680 680 L800 780 L960 1010Z" fill="#a8bbb8"/>`);
  parts.push(`<path d="M520 560 L590 620 L680 680 L800 780 L960 1010 L620 1010 L640 760 L560 650Z" fill="#94aaa7"/>`);
  parts.push(`<path d="M470 600 L520 560 L590 620 L560 640 L530 610 L505 650 L485 615Z" fill="#eef0ea"/>`);
  parts.push(`<path d="M1820 1010 L1950 760 L2060 640 L2140 520 L2230 610 L2330 690 L2460 820 L2460 1010Z" fill="#a3b7b4"/>`);
  parts.push(`<path d="M2140 520 L2230 610 L2330 690 L2460 820 L2460 1010 L2150 1010 L2180 760 L2160 640Z" fill="#8fa5a2"/>`);
  parts.push(`<path d="M2060 640 L2140 520 L2230 610 L2200 625 L2170 590 L2140 640 L2110 600Z" fill="#eef0ea"/>`);
  // main peak — apex (1488, 330); mass centred ~ (1488, 560)
  parts.push(`<path d="M980 1010 L1120 790 L1210 700 L1290 610 L1360 520 L1425 420 L1488 330 L1552 405 L1610 470 L1690 545 L1780 630 L1880 720 L1990 820 L2100 1010Z" fill="url(#peakL)"/>`);
  parts.push(`<path d="M1488 330 L1552 405 L1610 470 L1690 545 L1780 630 L1880 720 L1990 820 L2100 1010 L1560 1010 L1590 800 L1530 690 L1555 580 L1505 470Z" fill="url(#peakR)"/>`);
  // snow cap
  parts.push(`<path d="M1360 520 L1425 420 L1488 330 L1552 405 L1610 470 L1585 500 L1560 478 L1532 535 L1508 495 L1484 565 L1458 515 L1430 552 L1404 520 L1382 548Z" fill="#f6f3ec"/>`);
  parts.push(`<path d="M1488 330 L1552 405 L1610 470 L1585 500 L1560 478 L1532 535 L1508 495 L1505 470Z" fill="#d5dfe0"/>`);
  parts.push(`<rect x="0" y="820" width="${W}" height="180" fill="url(#mist)"/>`);
  // middle ridges + tree line
  parts.push(`<path d="${ridge(W, H, 960, 45, rnd, { f1: 1.6, f2: 4.2, ph: 2 })}" fill="#9db29f"/>`);
  parts.push(`<path d="${ridge(W, H, 1030, 40, rnd, { f1: 1.1, f2: 3.6, ph: 4 })}" fill="#7f9b88"/>`);
  let trees = "";
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W;
    const y = 1040 + Math.sin((x / W) * Math.PI * 2 * 1.1 + 4) * 24 + rnd() * 30;
    trees += pine(x, y, 50 + rnd() * 40, "#5f7f6e");
  }
  parts.push(trees);
  parts.push(`<path d="${ridge(W, H, 1110, 18, rnd, { f1: 0.7, f2: 2.1, ph: 1 })}" fill="#6d8c78"/>`);
  // river
  parts.push(`<path d="M1150 1085 C1110 1140 1300 1190 1230 1260 C1150 1340 760 1420 600 1600 L1320 1600 C1380 1470 1560 1380 1440 1270 C1360 1200 1200 1150 1185 1085Z" fill="url(#river)"/>`);
  parts.push(`<path d="M1170 1140 C1200 1160 1230 1180 1220 1200 M1000 1380 C1050 1360 1150 1330 1230 1300 M900 1480 C980 1450 1080 1420 1160 1400 M1100 1540 C1150 1510 1230 1480 1300 1460" stroke="#fbf3e4" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.7"/>`);
  // foreground banks
  parts.push(`<path d="M0 1180 C220 1150 430 1200 620 1300 C760 1380 820 1480 760 1600 L0 1600Z" fill="#4f7166"/>`);
  parts.push(`<path d="M2400 1150 C2150 1140 1900 1200 1700 1290 C1560 1360 1440 1470 1440 1600 L2400 1600Z" fill="#46675e"/>`);
  parts.push(`<path d="M0 1330 C180 1300 360 1360 470 1460 C520 1510 530 1560 520 1600 L0 1600Z" fill="#3c5c54"/>`);
  parts.push(`<path d="M2400 1300 C2200 1290 2000 1360 1850 1460 C1780 1510 1760 1560 1760 1600 L2400 1600Z" fill="#355650"/>`);
  let fg = "";
  for (const [x, y, h] of [[90, 1250, 260], [190, 1300, 200], [300, 1280, 160], [2120, 1230, 240], [2240, 1270, 300], [2010, 1290, 170], [2340, 1350, 180]]) {
    fg += pine(x, y, h, "#2f4d47", "#284440");
  }
  parts.push(fg);
  parts.push(`<path d="M980 360 q14 -12 28 0 q14 -12 28 0 M1060 320 q10 -9 20 0 q10 -9 20 0 M1020 410 q8 -7 16 0 q8 -7 16 0" stroke="#5c6b6b" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  return { W, H, svg: svg(W, H, defs, parts.join("")) };
}

/* ------------------------------------------------------------- 2 portrait */
function portrait() {
  const W = 1600, H = 2400;
  const defs =
    lg("bg", [[0, "#ece0d2"], [1, "#d9c3ad"]]) +
    lg("arch", [[0, "#b5c1ab"], [1, "#94a690"]]) +
    lg("sweater", [[0, "#56767a"], [1, "#3f5d62"]], 0, 0, 1, 1) +
    lg("skin", [[0, "#ecb497"], [1, "#d99878"]], 0, 0, 1, 1) +
    lg("hair", [[0, "#4a3530"], [1, "#2e2220"]]) +
    `<clipPath id="sw"><path d="M150 2400 C150 1720 210 1400 470 1270 C560 1225 620 1190 660 1172 C720 1155 880 1155 940 1172 C980 1190 1040 1225 1130 1270 C1390 1400 1450 1720 1450 2400Z"/></clipPath><clipPath id="head"><ellipse cx="800" cy="720" rx="215" ry="272"/></clipPath>` +
    blur("soft", 30) + blur("soft2", 10);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  p.push(`<path d="M260 2400 L260 820 A540 540 0 0 1 1340 820 L1340 2400Z" fill="url(#arch)"/>`);
  const leaf = (x, y, s, rot, c) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C60 -40 140 -40 200 0 C140 40 60 40 0 0Z" fill="${c}"/><path d="M0 0 L190 0" stroke="#e9dccb" stroke-width="3" opacity="0.5"/></g>`;
  p.push(leaf(120, 1500, 1.6, -40, "#7d9580") + leaf(150, 1640, 1.3, -10, "#6b8570") + leaf(110, 1780, 1.5, 20, "#87a08a"));
  p.push(leaf(1480, 1450, 1.6, -140, "#7d9580") + leaf(1450, 1600, 1.3, -170, "#6b8570") + leaf(1490, 1740, 1.5, 160, "#87a08a"));
  p.push(`<circle cx="1180" cy="430" r="60" fill="#e9c9a3" opacity="0.8"/>`);
  // hair (back)
  p.push(`<path d="M478 760 C450 420 620 300 800 300 C980 300 1150 420 1122 760 C1112 900 1150 1010 1100 1090 C1000 1130 600 1130 500 1090 C450 1010 488 900 478 760Z" fill="url(#hair)"/>`);
  // neck + shadow
  p.push(`<path d="M715 900 L885 900 L895 1190 L705 1190Z" fill="#d1906f"/>`);
  p.push(`<path d="M715 960 C760 1010 840 1010 885 960 L885 1040 C840 1070 760 1070 715 1040Z" fill="#b97a5d" opacity="0.7"/>`);
  // shoulders / sweater
  p.push(`<ellipse cx="800" cy="2330" rx="620" ry="80" fill="#000" opacity="0.10" filter="url(#soft)"/>`);
  p.push(`<path d="M150 2400 C150 1720 210 1400 470 1270 C560 1225 620 1190 660 1172 C720 1155 880 1155 940 1172 C980 1190 1040 1225 1130 1270 C1390 1400 1450 1720 1450 2400Z" fill="url(#sweater)"/>`);
  p.push(`<path d="M640 1170 C690 1260 910 1260 960 1170 C930 1160 900 1155 880 1160 C850 1200 750 1200 720 1160 C700 1155 670 1160 640 1170Z" fill="#8aa7a5"/>`);
  let knit = "";
  for (let y = 1360; y < 2400; y += 46) knit += `M100 ${y} Q800 ${y + 30} 1500 ${y} `;
  p.push(`<g clip-path="url(#sw)"><path d="${knit}" stroke="#36535a" stroke-width="4" fill="none" opacity="0.3"/></g>`);
  p.push(`<path d="M420 1500 C450 1800 440 2100 420 2400 M1180 1500 C1150 1800 1160 2100 1180 2400" stroke="#35505a" stroke-width="10" fill="none" opacity="0.4"/>`);
  // ears + earrings
  p.push(`<ellipse cx="588" cy="745" rx="34" ry="58" fill="#d99a7a"/><ellipse cx="1012" cy="745" rx="34" ry="58" fill="#d99a7a"/>`);
  p.push(`<circle cx="586" cy="830" r="20" fill="none" stroke="#d4a64e" stroke-width="7"/><circle cx="1014" cy="830" r="20" fill="none" stroke="#d4a64e" stroke-width="7"/>`);
  // head
  p.push(`<ellipse cx="800" cy="720" rx="215" ry="272" fill="url(#skin)"/>`);
  p.push(`<g clip-path="url(#head)"><ellipse cx="1010" cy="760" rx="120" ry="320" fill="#c9805f" opacity="0.35" filter="url(#soft)"/></g>`);
  // brows, closed eyes + lashes, nose, blush, lips
  p.push(`<path d="M672 668 Q718 645 762 664 M838 664 Q882 645 928 668" stroke="#3a2a26" stroke-width="11" fill="none" stroke-linecap="round"/>`);
  p.push(`<path d="M680 735 Q720 768 760 735 M840 735 Q880 768 920 735" stroke="#2f2320" stroke-width="9" fill="none" stroke-linecap="round"/>`);
  p.push(`<path d="M690 760 l-10 14 M712 768 l-4 15 M910 760 l10 14 M888 768 l4 15" stroke="#2f2320" stroke-width="5" stroke-linecap="round"/>`);
  p.push(`<path d="M812 760 Q790 830 808 842 Q820 848 834 838" stroke="#b4735a" stroke-width="8" fill="none" stroke-linecap="round"/>`);
  p.push(`<circle cx="682" cy="836" r="44" fill="#ea8f7c" opacity="0.35" filter="url(#soft2)"/><circle cx="918" cy="836" r="44" fill="#ea8f7c" opacity="0.35" filter="url(#soft2)"/>`);
  p.push(`<path d="M745 900 Q775 882 800 892 Q825 882 855 900 Q825 935 800 935 Q775 935 745 900Z" fill="#b25f58"/><path d="M748 900 Q800 912 852 900" stroke="#8d4642" stroke-width="4" fill="none"/>`);
  // hair (front, side-swept fringe)
  p.push(`<path d="M578 720 C548 470 680 380 830 392 C980 405 1060 520 1030 720 C1010 600 960 540 880 520 C820 560 700 600 640 560 C610 610 590 660 578 720Z" fill="url(#hair)"/>`);
  p.push(`<path d="M680 440 C760 410 880 420 960 480" stroke="#6b4c43" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6"/>`);
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* --------------------------------------------------------- 3 architecture */
function architecture() {
  const W = 1800, H = 2400, cx = 900;
  const defs =
    lg("sky", [[0, "#aec4cf"], [0.6, "#dfe2dc"], [1, "#f2e6d4"]]) +
    lg("col", [[0, "#d9cdb9"], [0.35, "#fbf6ec"], [0.7, "#efe5d6"], [1, "#cbbda7"]], 0, 0, 1, 0) +
    lg("plaza", [[0, "#d8c8b1"], [1, "#c4b196"]]) +
    lg("door", [[0, "#4b6a6c"], [1, "#2f4a4e"]]) +
    lg("shade", [[0, "#000", 0.18], [1, "#000", 0]]) +
    blur("soft", 16);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  for (const [x, y, w] of [[380, 260, 300], [1420, 260, 300], [900, 160, 220]]) {
    p.push(`<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.09}" fill="#fbf6ee" opacity="0.6" filter="url(#soft)"/>`);
  }
  p.push(`<rect y="1900" width="${W}" height="500" fill="url(#plaza)"/>`);
  let pav = "";
  for (let i = -8; i <= 8; i++) pav += `M${cx + i * 60} 1900 L${cx + i * 260} 2400 `;
  for (const y of [1960, 2040, 2140, 2260]) pav += `M0 ${y} L${W} ${y} `;
  p.push(`<path d="${pav}" stroke="#b6a286" stroke-width="3" opacity="0.6"/>`);

  const g = [];
  const sym = (fn) => { g.push(fn(1)); g.push(fn(-1)); };
  // wings
  sym((s) => {
    const x0 = s === 1 ? cx + 600 : cx - 790;
    return `<rect x="${x0}" y="1160" width="190" height="640" fill="#e8dccb"/><rect x="${x0 - 10}" y="1130" width="210" height="40" fill="#f3eadc"/>` +
      `<rect x="${x0 + 50}" y="1290" width="90" height="190" rx="45" fill="#5b7475"/><rect x="${x0 + 50}" y="1560" width="90" height="170" fill="#5b7475"/>` +
      `<rect x="${x0 + 40}" y="1480" width="110" height="14" fill="#f3eadc"/><rect x="${x0 + 40}" y="1730" width="110" height="14" fill="#f3eadc"/>`;
  });
  g.push(`<rect x="${cx - 590}" y="980" width="1180" height="820" fill="#e3d6c3"/>`);
  g.push(`<rect x="${cx - 590}" y="980" width="1180" height="120" fill="url(#shade)"/>`);
  // windows between columns
  sym((s) => {
    let out = "";
    for (const mid of [230, 410]) {
      const wx = cx + s * mid - 40;
      out += `<rect x="${wx - 8}" y="1088" width="96" height="246" fill="#f1e8da"/><rect x="${wx}" y="1100" width="80" height="222" fill="#5b7475"/>` +
        `<path d="M${wx + 40} 1100 V1322 M${wx} 1190 H${wx + 80}" stroke="#e9dfcf" stroke-width="6"/>` +
        `<rect x="${wx - 8}" y="1430" width="96" height="296" fill="#f1e8da"/><rect x="${wx}" y="1442" width="80" height="272" fill="#5b7475"/>` +
        `<path d="M${wx + 40} 1442 V1714 M${wx} 1530 H${wx + 80} M${wx} 1620 H${wx + 80}" stroke="#e9dfcf" stroke-width="6"/>` +
        `<path d="M${wx - 14} 1088 L${wx + 40} 1056 L${wx + 94} 1088Z" fill="#f3eadc"/>`;
    }
    return out;
  });
  // central arched door
  g.push(`<path d="M${cx - 150} 1800 V1400 A150 150 0 0 1 ${cx + 150} 1400 V1800Z" fill="#f3eadc"/>`);
  g.push(`<path d="M${cx - 120} 1800 V1400 A120 120 0 0 1 ${cx + 120} 1400 V1800Z" fill="url(#door)"/>`);
  g.push(`<path d="M${cx - 120} 1400 A120 120 0 0 1 ${cx + 120} 1400Z" fill="#8fa9a6"/>`);
  let fan = "";
  for (let a = 0; a <= 180; a += 30) {
    const rad = (a * Math.PI) / 180;
    fan += `M${cx} 1400 L${r1(cx - Math.cos(rad) * 120)} ${r1(1400 - Math.sin(rad) * 120)} `;
  }
  g.push(`<path d="${fan} M${cx - 120} 1400 H${cx + 120} M${cx} 1410 V1800" stroke="#e9dfcf" stroke-width="5"/>`);
  g.push(`<rect x="${cx - 100}" y="1450" width="85" height="140" rx="6" fill="none" stroke="#557577" stroke-width="5"/><rect x="${cx + 15}" y="1450" width="85" height="140" rx="6" fill="none" stroke="#557577" stroke-width="5"/>`);
  g.push(`<rect x="${cx - 100}" y="1620" width="85" height="150" rx="6" fill="none" stroke="#557577" stroke-width="5"/><rect x="${cx + 15}" y="1620" width="85" height="150" rx="6" fill="none" stroke="#557577" stroke-width="5"/>`);
  g.push(`<circle cx="${cx - 26}" cy="1610" r="9" fill="#d6b56a"/><circle cx="${cx + 26}" cy="1610" r="9" fill="#d6b56a"/>`);
  g.push(`<path d="M${cx - 18} 1258 h36 l-6 34 h-24Z" fill="#e3d6c3"/>`);
  // columns
  for (const dx of [-500, -320, -140, 140, 320, 500]) {
    const x = cx + dx;
    let flutes = "";
    for (const f of [-21, -7, 7, 21]) flutes += `M${x + f} 1040 V1740 `;
    g.push(`<rect x="${x - 38}" y="1020" width="76" height="740" fill="url(#col)"/>` +
      `<path d="${flutes}" stroke="#c9bba5" stroke-width="3" opacity="0.7"/>` +
      `<rect x="${x - 62}" y="1000" width="124" height="22" fill="#f6eee2"/><path d="M${x - 56} 1022 Q${x} 1052 ${x + 56} 1022Z" fill="#e6dac8"/>` +
      `<circle cx="${x - 50}" cy="1018" r="14" fill="#efe5d5"/><circle cx="${x + 50}" cy="1018" r="14" fill="#efe5d5"/>` +
      `<rect x="${x - 56}" y="1750" width="112" height="22" fill="#efe5d5"/><rect x="${x - 62}" y="1770" width="124" height="22" fill="#e5d8c5"/>`);
  }
  // entablature + dentils
  g.push(`<rect x="${cx - 640}" y="890" width="1280" height="112" fill="#efe5d6"/>`);
  g.push(`<rect x="${cx - 640}" y="890" width="1280" height="24" fill="#f8f1e6"/><rect x="${cx - 640}" y="980" width="1280" height="22" fill="#ddd0bc"/>`);
  let dent = "";
  for (let x = cx - 630; x < cx + 630; x += 40) dent += `<rect x="${x}" y="944" width="22" height="22" fill="#ddd0bc"/>`;
  g.push(dent);
  // pediment
  g.push(`<path d="M${cx - 680} 892 L${cx} 520 L${cx + 680} 892Z" fill="#f6efe3"/>`);
  g.push(`<path d="M${cx - 590} 866 L${cx} 556 L${cx + 590} 866Z" fill="#e2d5c2"/>`);
  g.push(`<circle cx="${cx}" cy="760" r="62" fill="#f3eadc"/><circle cx="${cx}" cy="760" r="46" fill="#5b7475"/><path d="M${cx - 46} 760 H${cx + 46} M${cx} 714 V806" stroke="#e9dfcf" stroke-width="5"/>`);
  g.push(`<path d="M${cx - 30} 520 L${cx} 470 L${cx + 30} 520Z" fill="#efe5d6"/>`);
  g.push(`<path d="M${cx - 680} 892 l0 -50 l30 0 l0 40Z M${cx + 680} 892 l0 -50 l-30 0 l0 40Z" fill="#efe5d6"/>`);
  // stylobate + steps
  g.push(`<rect x="${cx - 660}" y="1790" width="1320" height="30" fill="#ece2d3"/>`);
  for (let i = 0; i < 4; i++) {
    const w = 1340 + i * 90, y = 1820 + i * 34;
    g.push(`<rect x="${cx - w / 2}" y="${y}" width="${w}" height="34" fill="${i % 2 ? "#e6dac9" : "#eee5d7"}"/><rect x="${cx - w / 2}" y="${y + 28}" width="${w}" height="6" fill="#cdbfa9"/>`);
  }
  // planters
  sym((s) => {
    const x = cx + s * 780;
    return `<path d="M${x - 50} 1880 L${x + 50} 1880 L${x + 38} 1960 L${x - 38} 1960Z" fill="#c9b79e"/>` +
      `<circle cx="${x}" cy="1800" r="86" fill="#6f8c75"/><circle cx="${x - 26}" cy="1780" r="40" fill="#809d85"/>`;
  });
  p.push(`<g transform="translate(0 -40)">${g.join("")}</g>`);
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* -------------------------------------------------------------- 4 product */
function product() {
  const W = 2000, H = 2000, cx = 1000;
  const defs =
    lg("bg", [[0, "#d6c3b0"], [0.62, "#e8dacb"], [0.7, "#efe5d8"], [1, "#e0d0be"]]) +
    rg("spot", [[0, "#fbf4ea", 0.85], [1, "#fbf4ea", 0]]) +
    lg("glass", [[0, "#8a4a26"], [0.18, "#c47a45"], [0.32, "#e0a06a"], [0.55, "#b8693a"], [1, "#6e3a1e"]], 0, 0, 1, 0) +
    lg("cap", [[0, "#1f1d1b"], [0.3, "#4a4643"], [0.55, "#2a2826"], [1, "#151413"]], 0, 0, 1, 0) +
    lg("bulb", [[0, "#2a2725"], [0.35, "#5b5653"], [1, "#1b1918"]], 0, 0, 1, 0) +
    lg("label", [[0, "#efe7da"], [0.5, "#f8f2e8"], [1, "#e2d8c8"]], 0, 0, 1, 0) +
    lg("disc", [[0, "#cdb7a0"], [1, "#bfa68c"]], 0, 0, 1, 0) +
    lg("stone", [[0, "#9aa59a"], [1, "#6f7c71"]], 0, 0, 1, 1) +
    blur("sh", 14) + blur("sh2", 40);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  p.push(`<ellipse cx="${cx}" cy="950" rx="900" ry="800" fill="url(#spot)"/>`);
  p.push(`<circle cx="${cx}" cy="980" r="540" fill="#d9c4ae" opacity="0.55"/>`);
  // plinth disc
  p.push(`<ellipse cx="${cx}" cy="1500" rx="430" ry="70" fill="#000" opacity="0.12" filter="url(#sh2)"/>`);
  p.push(`<path d="M${cx - 400} 1440 V1500 A400 62 0 0 0 ${cx + 400} 1500 V1440Z" fill="url(#disc)"/>`);
  p.push(`<ellipse cx="${cx}" cy="1440" rx="400" ry="62" fill="#e3d2bf"/>`);
  // bottle shadows
  p.push(`<path d="M${cx - 150} 1452 L${cx + 160} 1452 L${cx + 360} 1405 L${cx + 120} 1405Z" fill="#7a5a40" opacity="0.25" filter="url(#sh)"/>`);
  p.push(`<ellipse cx="${cx}" cy="1452" rx="200" ry="22" fill="#4a3324" opacity="0.4" filter="url(#sh)"/>`);
  // bottle body (amber glass)
  p.push(`<path d="M${cx - 180} 1010 Q${cx - 180} 925 ${cx - 95} 915 L${cx + 95} 915 Q${cx + 180} 925 ${cx + 180} 1010 L${cx + 180} 1410 Q${cx + 180} 1455 ${cx + 135} 1455 L${cx - 135} 1455 Q${cx - 180} 1455 ${cx - 180} 1410Z" fill="url(#glass)"/>`);
  p.push(`<path d="M${cx - 135} 1000 Q${cx - 135} 960 ${cx - 100} 950 L${cx - 100} 1400 Q${cx - 135} 1400 ${cx - 135} 1380Z" fill="#fff" opacity="0.28"/>`);
  p.push(`<rect x="${cx + 120}" y="980" width="16" height="420" rx="8" fill="#fff" opacity="0.15"/>`);
  // label
  p.push(`<rect x="${cx - 150}" y="1110" width="300" height="230" fill="url(#label)"/>`);
  p.push(`<circle cx="${cx}" cy="1170" r="26" fill="none" stroke="#8a4a26" stroke-width="5"/><circle cx="${cx}" cy="1170" r="8" fill="#8a4a26"/>`);
  p.push(`<rect x="${cx - 90}" y="1220" width="180" height="14" rx="4" fill="#3a2f28"/><rect x="${cx - 60}" y="1250" width="120" height="8" rx="4" fill="#9a8a7a"/><rect x="${cx - 75}" y="1270" width="150" height="8" rx="4" fill="#9a8a7a"/><rect x="${cx - 40}" y="1306" width="80" height="8" rx="4" fill="#c09a74"/>`);
  // neck, collar, dropper bulb
  p.push(`<rect x="${cx - 60}" y="880" width="120" height="40" fill="#7a4222"/>`);
  p.push(`<rect x="${cx - 85}" y="810" width="170" height="78" rx="10" fill="url(#cap)"/>`);
  p.push(`<path d="M${cx - 85} 830 H${cx + 85} M${cx - 85} 850 H${cx + 85} M${cx - 85} 870 H${cx + 85}" stroke="#000" stroke-width="3" opacity="0.25"/>`);
  p.push(`<path d="M${cx - 48} 812 V790 C${cx - 52} 760 ${cx - 52} 740 ${cx} 740 C${cx + 52} 740 ${cx + 52} 760 ${cx + 48} 790 V812Z" fill="url(#bulb)"/>`);
  // props: stone sphere + sprig
  p.push(`<ellipse cx="1500" cy="1600" rx="110" ry="18" fill="#3a2c22" opacity="0.3" filter="url(#sh)"/><circle cx="1490" cy="1520" r="85" fill="url(#stone)"/><circle cx="1460" cy="1490" r="22" fill="#fff" opacity="0.18"/>`);
  let sprig = `<path d="M470 1620 C480 1450 520 1300 600 1180" stroke="#6c7d63" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  for (const [x, y, a] of [[485, 1520, -60], [500, 1440, -120], [520, 1380, -50], [548, 1300, -130], [570, 1250, -45], [600, 1180, -90]]) {
    sprig += `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 C25 -22 70 -22 100 0 C70 22 25 22 0 0Z" fill="#8a9c7e"/></g>`;
  }
  p.push(`<ellipse cx="480" cy="1625" rx="80" ry="12" fill="#3a2c22" opacity="0.2" filter="url(#sh)"/>` + sprig);
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* -------------------------------------------------------------- 5 skyline */
function skyline() {
  const W = 3000, H = 1200, HZ = 960, rnd = prng(5);
  const defs =
    lg("sky", [[0, "#262a4a"], [0.35, "#4c4468"], [0.62, "#9a6b7c"], [0.8, "#e0a083"], [0.88, "#f2c08f"]]) +
    lg("water", [[0, "#3b3150"], [1, "#16142a"]]) +
    rg("glow", [[0, "#f7c690", 0.6], [1, "#f7c690", 0]]) +
    blur("soft", 6);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  p.push(`<ellipse cx="1500" cy="${HZ}" rx="1600" ry="260" fill="url(#glow)"/>`);
  let stars = "";
  for (let i = 0; i < 140; i++) {
    stars += `<circle cx="${r1(rnd() * W)}" cy="${r1(rnd() * 420)}" r="${r1(1 + rnd() * 2.2)}" opacity="${r1(0.3 + rnd() * 0.6)}"/>`;
  }
  p.push(`<g fill="#fdf3e6">${stars}</g>`);
  p.push(`<circle cx="2250" cy="200" r="46" fill="#fbecd4"/><circle cx="2272" cy="186" r="44" fill="#2f3052"/>`);

  const layer = (minH, maxH, wMin, wMax, special = []) => {
    const out = [];
    let x = -20;
    while (x < W + 20) {
      const sp = special.find((s) => x >= s.x - wMax && x < s.x + s.w);
      if (sp) { out.push(sp); x = sp.x + sp.w + 4; continue; }
      const w = wMin + rnd() * (wMax - wMin);
      out.push({ x, w, top: HZ - (minH + rnd() * (maxH - minH)), kind: rnd() < 0.25 ? "step" : rnd() < 0.3 ? "roof" : "flat" });
      x += w + 2 + rnd() * 10;
    }
    return out;
  };
  const shape = (b) => {
    const { x, w, top } = b;
    let d = `M${r1(x)} ${HZ} V${r1(top)} H${r1(x + w)} V${HZ}Z`;
    if (b.kind === "step") d += ` M${r1(x + w * 0.2)} ${r1(top)} V${r1(top - 40)} H${r1(x + w * 0.8)} V${r1(top)}Z`;
    if (b.kind === "roof") d += ` M${r1(x)} ${r1(top)} L${r1(x + w / 2)} ${r1(top - w * 0.35)} L${r1(x + w)} ${r1(top)}Z`;
    if (b.kind === "spire") d += ` M${r1(x + w * 0.15)} ${r1(top)} V${r1(top - 60)} H${r1(x + w * 0.85)} V${r1(top)}Z M${r1(x + w * 0.3)} ${r1(top - 60)} V${r1(top - 120)} H${r1(x + w * 0.7)} V${r1(top - 60)}Z M${r1(x + w / 2 - 6)} ${r1(top - 120)} L${r1(x + w / 2)} ${r1(top - 260)} L${r1(x + w / 2 + 6)} ${r1(top - 120)}Z`;
    if (b.kind === "antenna") d += ` M${r1(x + w * 0.1)} ${r1(top)} V${r1(top - 50)} H${r1(x + w * 0.9)} V${r1(top)}Z M${r1(x + w / 2 - 4)} ${r1(top - 50)} V${r1(top - 190)} H${r1(x + w / 2 + 4)} V${r1(top - 50)}Z`;
    if (b.kind === "crown") d += ` M${r1(x)} ${r1(top)} L${r1(x + w / 2)} ${r1(top - 110)} L${r1(x + w)} ${r1(top)}Z M${r1(x + w / 2 - 3)} ${r1(top - 110)} V${r1(top - 200)} H${r1(x + w / 2 + 3)} V${r1(top - 110)}Z`;
    return d;
  };
  const back = layer(220, 470, 90, 200);
  p.push(`<path d="${back.map(shape).join(" ")}" fill="#6d5878" opacity="0.75"/>`);
  const mid = layer(160, 380, 70, 170, [
    { x: 600, w: 120, top: HZ - 520, kind: "roof" },
    { x: 2240, w: 130, top: HZ - 500, kind: "step" },
  ]);
  p.push(`<path d="${mid.map(shape).join(" ")}" fill="#4a3f62"/>`);
  const front = layer(110, 300, 80, 180, [
    { x: 110, w: 170, top: 300, kind: "spire" },
    { x: 1420, w: 160, top: 360, kind: "crown" },
    { x: 2710, w: 170, top: 280, kind: "antenna" },
  ]);
  let wins = "";
  for (const b of front) {
    const cols = Math.max(2, Math.floor((b.w - 24) / 24));
    const gx = (b.w - cols * 24) / 2 + 7;
    for (let y = b.top + 28; y < HZ - 30; y += 34) {
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.32) wins += `<rect x="${r1(b.x + gx + c * 24)}" y="${r1(y)}" width="10" height="16" opacity="${r1(0.55 + rnd() * 0.45)}"/>`;
      }
    }
  }
  const city = `<path d="${front.map(shape).join(" ")}" fill="#2a2440"/><g fill="#f6d59a">${wins}</g>`;
  p.push(city);
  p.push(`<circle cx="195" cy="40" r="7" fill="#ff8a6b"/><circle cx="2795" cy="90" r="7" fill="#ff8a6b"/><circle cx="1500" cy="160" r="6" fill="#ff8a6b"/>`);
  // water + reflection
  p.push(`<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#water)"/>`);
  p.push(`<g transform="translate(0 ${2 * HZ}) scale(1 -1)" opacity="0.28" filter="url(#soft)">${city}</g>`);
  let shimmer = "";
  for (let i = 0; i < 90; i++) {
    const y = HZ + 10 + rnd() * (H - HZ - 20), x = rnd() * W, w = 30 + rnd() * 160;
    shimmer += `M${r1(x)} ${r1(y)} h${r1(w)} `;
  }
  p.push(`<path d="${shimmer}" stroke="#f4c99a" stroke-width="3" opacity="0.35" stroke-linecap="round"/>`);
  p.push(`<rect y="${HZ}" width="${W}" height="4" fill="#f2c08f" opacity="0.5"/>`);
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* ---------------------------------------------------------------- 6 group */
function group() {
  const W = 2400, H = 1350, rnd = prng(66);
  const defs = lg("bg", [[0, "#d9e0da"], [0.6, "#efe6d8"], [1, "#e9dccb"]]) + blur("soft", 24);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  p.push(`<circle cx="1950" cy="230" r="120" fill="#f6e3c4" opacity="0.9"/>`);
  p.push(`<path d="${ridge(W, H, 760, 50, rnd, { f1: 1.2, f2: 2.7, ph: 1 })}" fill="#b9c8b8"/>`);
  p.push(`<path d="${ridge(W, H, 860, 40, rnd, { f1: 0.8, f2: 2.2, ph: 3 })}" fill="#9fb4a0"/>`);
  for (const [x, s] of [[120, 1], [420, 0.8], [1180, 0.9], [1650, 1.1], [2280, 0.85]]) {
    p.push(`<rect x="${x - 8 * s}" y="${820 - 120 * s}" width="${16 * s}" height="${140 * s}" fill="#7f8f78"/><ellipse cx="${x}" cy="${820 - 200 * s}" rx="${90 * s}" ry="${120 * s}" fill="#8fa58e"/>`);
  }
  p.push(`<rect y="980" width="${W}" height="370" fill="#a9b994"/>`);

  const people = [
    { x: 204, hy: 470, skin: "#e9b897", hair: "#5a3b2c", top: "#c97b5c", pants: "#3f4a52", style: "long" },
    { x: 600, hy: 400, skin: "#a8704e", hair: "#231c1a", top: "#4f6f73", pants: "#5b4a42", style: "short" },
    { x: 996, hy: 455, skin: "#f1cdb2", hair: "#c9974f", top: "#d9b25a", pants: "#2f3a40", style: "bun" },
    { x: 1404, hy: 395, skin: "#7a4a32", hair: "#1e1816", top: "#2f4858", pants: "#6b5d52", style: "curly" },
    { x: 1800, hy: 445, skin: "#d9a07e", hair: "#3b2a24", top: "#8ea58b", pants: "#44505a", style: "bob" },
    { x: 2196, hy: 420, skin: "#c28562", hair: "#6b6560", top: "#b56f78", pants: "#3a3533", style: "short" },
  ];
  const dark = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0");
    return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
  };
  p.push(`<ellipse cx="1200" cy="1330" rx="1250" ry="60" fill="#000" opacity="0.08" filter="url(#soft)"/>`);
  const drawPerson = ({ x, hy, skin, hair, top, pants, style }) => {
    const sy = hy + 170;
    let s = "";
    if (style === "long") s += `<path d="M${x - 100} ${hy} C${x - 110} ${hy - 120} ${x + 110} ${hy - 120} ${x + 100} ${hy} L${x + 110} ${hy + 200} L${x - 110} ${hy + 200}Z" fill="${hair}"/>`;
    if (style === "bob") s += `<path d="M${x - 100} ${hy + 10} C${x - 110} ${hy - 120} ${x + 110} ${hy - 120} ${x + 100} ${hy + 10} L${x + 104} ${hy + 90} L${x - 104} ${hy + 90}Z" fill="${hair}"/>`;
    if (style === "bun") s += `<circle cx="${x}" cy="${hy - 112}" r="46" fill="${hair}"/>`;
    if (style === "curly") {
      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        s += `<circle cx="${r1(x + Math.cos(rad) * 82)}" cy="${r1(hy - 20 + Math.sin(rad) * 88)}" r="40" fill="${hair}"/>`;
      }
    }
    s += `<rect x="${x - 30}" y="${hy + 60}" width="60" height="${sy - hy - 40}" fill="${dark(skin, 0.88)}"/>`;
    const tw = 122;
    s += `<rect x="${x - tw}" y="${sy + 440}" width="${tw * 2}" height="${H - sy - 440}" fill="${pants}"/><path d="M${x} ${sy + 500} V${H}" stroke="${dark(pants, 0.8)}" stroke-width="5"/>`;
    s += `<path d="M${x - tw} ${sy + 470} L${x - tw} ${sy + 100} C${x - tw} ${sy + 20} ${x - 100} ${sy} ${x - 55} ${sy - 6} L${x + 55} ${sy - 6} C${x + 100} ${sy} ${x + tw} ${sy + 20} ${x + tw} ${sy + 100} L${x + tw} ${sy + 470}Z" fill="${top}"/>`;
    for (const d of [-1, 1]) {
      const o = x + d * tw, f = x + d * (tw + 56);
      s += `<path d="M${o} ${sy + 10} C${x + d * (tw + 30)} ${sy + 14} ${f} ${sy + 50} ${f} ${sy + 120} L${f} ${sy + 450} A28 28 0 0 ${d === 1 ? 1 : 0} ${o} ${sy + 450}Z" fill="${dark(top, 0.88)}"/>`;
      s += `<circle cx="${x + d * (tw + 28)}" cy="${sy + 486}" r="27" fill="${skin}"/>`;
    }
    s += `<path d="M${x - 50} ${sy - 4} Q${x} ${sy + 40} ${x + 50} ${sy - 4}" fill="${dark(skin, 0.88)}"/>`;
    s += `<ellipse cx="${x}" cy="${hy}" rx="82" ry="98" fill="${skin}"/>`;
    s += `<ellipse cx="${x - 82}" cy="${hy + 10}" rx="14" ry="22" fill="${dark(skin, 0.92)}"/><ellipse cx="${x + 82}" cy="${hy + 10}" rx="14" ry="22" fill="${dark(skin, 0.92)}"/>`;
    s += `<circle cx="${x - 30}" cy="${hy + 6}" r="7" fill="#2a201d"/><circle cx="${x + 30}" cy="${hy + 6}" r="7" fill="#2a201d"/>`;
    s += `<path d="M${x - 24} ${hy + 46} Q${x} ${hy + 64} ${x + 24} ${hy + 46}" stroke="#7a3f36" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="${x - 48}" cy="${hy + 34}" r="14" fill="#e58f7c" opacity="0.35"/><circle cx="${x + 48}" cy="${hy + 34}" r="14" fill="#e58f7c" opacity="0.35"/>`;
    if (style === "short") s += `<path d="M${x - 86} ${hy - 4} C${x - 100} ${hy - 150} ${x + 100} ${hy - 152} ${x + 86} ${hy - 4} C${x + 60} ${hy - 50} ${x - 20} ${hy - 70} ${x - 86} ${hy - 4}Z" fill="${hair}"/>`;
    if (style === "long" || style === "bob") s += `<path d="M${x - 92} ${hy + 20} C${x - 104} ${hy - 160} ${x + 104} ${hy - 162} ${x + 92} ${hy + 20} C${x + 70} ${hy - 40} ${x + 10} ${hy - 50} ${x - 10} ${hy - 70} C${x - 40} ${hy - 30} ${x - 80} ${hy - 20} ${x - 92} ${hy + 20}Z" fill="${hair}"/>`;
    if (style === "bun") s += `<path d="M${x - 84} ${hy - 10} C${x - 96} ${hy - 150} ${x + 96} ${hy - 150} ${x + 84} ${hy - 10} C${x + 40} ${hy - 60} ${x - 40} ${hy - 60} ${x - 84} ${hy - 10}Z" fill="${hair}"/>`;
    if (style === "curly") s += `<path d="M${x - 80} ${hy - 20} C${x - 96} ${hy - 150} ${x + 96} ${hy - 150} ${x + 80} ${hy - 20} C${x + 40} ${hy - 50} ${x - 40} ${hy - 50} ${x - 80} ${hy - 20}Z" fill="${hair}"/>`;
    return s;
  };
  for (const i of [1, 3, 5, 0, 2, 4]) p.push(drawPerson(people[i]));
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* ------------------------------------------------------------- 7 wildlife */
function wildlife() {
  const W = 2400, H = 1600, rnd = prng(77);
  const defs =
    lg("sky", [[0, "#cfd9cf"], [0.5, "#f1e3c8"], [1, "#f4dcb9"]]) +
    lg("meadow", [[0, "#c2bf8c"], [1, "#8f9a68"]]) +
    lg("fur", [[0, "#d9824a"], [1, "#b65a2e"]], 0, 0, 1, 1) +
    lg("tail", [[0, "#c96a36"], [1, "#a85028"]], 0, 0, 1, 0) +
    rg("sun", [[0, "#fff4de", 0.9], [1, "#fff4de", 0]]) +
    blur("soft", 14);
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  p.push(`<circle cx="1500" cy="520" r="500" fill="url(#sun)"/><circle cx="1500" cy="520" r="70" fill="#fdf0d8"/>`);
  const forest = (base, hMin, hMax, n, c, c2) => {
    let s = `<rect y="${base - 10}" width="${W}" height="${H - base + 10}" fill="${c}"/>`;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W + rnd() * (W / n);
      s += pine(x, base + rnd() * 20, hMin + rnd() * (hMax - hMin), c, c2);
    }
    return s;
  };
  p.push(forest(800, 180, 320, 34, "#a9bcae"));
  p.push(forest(860, 200, 360, 30, "#8aa395"));
  p.push(`<rect y="760" width="${W}" height="140" fill="#f3e6cd" opacity="0.35" filter="url(#soft)"/>`);
  p.push(forest(920, 240, 420, 22, "#6c8b7a", "#5f7d6d"));
  p.push(pine(110, 1180, 1100, "#3f5f55", "#365249") + pine(330, 1120, 820, "#4a6b5f", "#41604f"));
  // meadow
  p.push(`<path d="M0 960 C500 920 1100 980 1600 950 C2000 930 2250 960 2400 950 L2400 1600 L0 1600Z" fill="url(#meadow)"/>`);
  p.push(`<path d="M0 1250 C600 1200 1300 1290 2400 1230 L2400 1600 L0 1600Z" fill="#7f8c5d" opacity="0.6"/>`);
  let fl = "", tufts = "";
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = 980 + Math.pow(rnd(), 0.8) * 620;
    const s = 0.5 + ((y - 980) / 620) * 1.4;
    if (rnd() < 0.55) {
      const c = ["#f3ead8", "#e9c46a", "#d98b7a", "#c9a3c1"][Math.floor(rnd() * 4)];
      fl += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(4 * s)}" fill="${c}"/>`;
    } else {
      tufts += `M${r1(x)} ${r1(y)} l${r1(-8 * s)} ${r1(-26 * s)} M${r1(x)} ${r1(y)} l${r1(2 * s)} ${r1(-34 * s)} M${r1(x)} ${r1(y)} l${r1(10 * s)} ${r1(-24 * s)} `;
    }
  }
  p.push(`<path d="${tufts}" stroke="#6e7d4f" stroke-width="4" stroke-linecap="round"/>`);
  p.push(fl);
  // sitting fox facing left; local bbox ≈ x[-165,270] y[-236,210] → centred on (1728, 880)
  const fox = `
    <ellipse cx="40" cy="212" rx="230" ry="22" fill="#4e5a36" opacity="0.35" filter="url(#soft)"/>
    <path d="M60 170 C170 190 270 150 270 70 C270 20 230 0 210 10 C240 60 200 130 120 140 C90 145 70 150 60 170Z" fill="url(#tail)"/>
    <path d="M270 70 C270 20 230 0 210 10 C232 40 236 70 226 92 C248 92 266 84 270 70Z" fill="#f4ede1"/>
    <path d="M-40 -70 C-120 -30 -130 110 -90 205 L95 205 C140 120 100 -20 20 -80Z" fill="url(#fur)"/>
    <path d="M60 205 C120 200 140 130 100 80 C90 140 70 180 30 205Z" fill="#a24f28" opacity="0.6"/>
    <path d="M-62 -40 C-104 20 -92 120 -50 190 C-30 110 -16 30 -10 -50Z" fill="#f4ede1"/>
    <path d="M-86 150 h34 v58 h-34Z M-36 150 h34 v58 h-34Z" fill="#3e2a22"/>
    <path d="M-94 208 h44 M-44 208 h44" stroke="#3e2a22" stroke-width="10" stroke-linecap="round"/>
    <path d="M-165 -112 L-70 -158 L-52 -236 L-12 -170 L32 -232 L44 -140 C46 -92 4 -66 -40 -70 C-90 -76 -130 -92 -165 -112Z" fill="url(#fur)"/>
    <path d="M-56 -220 L-22 -172 L-62 -166Z M30 -216 L36 -158 L6 -172Z" fill="#3e2a22"/>
    <path d="M-165 -112 C-130 -98 -90 -86 -40 -82 C-20 -80 0 -76 10 -70 C-20 -60 -50 -62 -80 -72 C-110 -80 -140 -94 -165 -112Z" fill="#f4ede1"/>
    <ellipse cx="-164" cy="-112" rx="14" ry="11" fill="#2a1d18"/>
    <path d="M-86 -134 Q-70 -146 -54 -136 Q-70 -128 -86 -134Z" fill="#2a1d18"/>`;
  p.push(`<g transform="translate(1680 893)">${fox}</g>`);
  let fg = "";
  for (let i = 0; i < 70; i++) {
    const x = 1470 + rnd() * 500, y = 1098 + rnd() * 20;
    fg += `M${r1(x)} ${r1(y)} q${r1(-6 + rnd() * 12)} -20 ${r1(-10 + rnd() * 20)} ${r1(-28 - rnd() * 18)} `;
  }
  p.push(`<path d="${fg}" stroke="#7b8a55" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* ------------------------------------------------------------- 8 interior */
function interior() {
  const W = 2400, H = 1800, rnd = prng(88);
  const defs =
    lg("wall", [[0, "#e7dccd"], [1, "#ddcfbd"]]) +
    lg("floor", [[0, "#b98f68"], [1, "#a27a55"]]) +
    lg("outside", [[0, "#b7cfd6"], [0.7, "#e9e3d2"], [1, "#d8dcc4"]]) +
    lg("sofa", [[0, "#5f8582"], [1, "#4b6d6a"]]) +
    lg("seat", [[0, "#6b918d"], [1, "#557975"]]) +
    rg("lamp", [[0, "#fff1cf", 0.75], [1, "#fff1cf", 0]]) +
    blur("soft", 16);
  const p = [];
  p.push(`<rect width="${W}" height="1360" fill="url(#wall)"/>`);
  p.push(`<rect y="1360" width="${W}" height="440" fill="url(#floor)"/>`);
  let planks = "";
  for (let y = 1400; y < H; y += 56) planks += `M0 ${y} H${W} `;
  for (let i = 0; i < 40; i++) { const y = 1360 + Math.floor(rnd() * 8) * 56; const x = rnd() * W; planks += `M${r1(x)} ${y} v56 `; }
  p.push(`<path d="${planks}" stroke="#8f6a48" stroke-width="3" opacity="0.5"/>`);
  p.push(`<rect y="1330" width="${W}" height="32" fill="#f1e9dd"/>`);
  // window (left)
  p.push(`<rect x="110" y="250" width="440" height="830" fill="#f4ede2"/>`);
  p.push(`<rect x="135" y="275" width="390" height="780" fill="url(#outside)"/>`);
  p.push(`<path d="M135 820 C230 760 350 800 525 740 V1055 H135Z" fill="#a9bea2"/><path d="M135 930 C260 880 380 920 525 880 V1055 H135Z" fill="#8ea88a"/>`);
  p.push(`<circle cx="430" cy="420" r="40" fill="#fbf2df"/><ellipse cx="250" cy="760" rx="70" ry="100" fill="#7f9c7f"/><rect x="244" y="800" width="12" height="90" fill="#6f7f62"/>`);
  p.push(`<path d="M330 275 V1055 M135 640 H525" stroke="#f4ede2" stroke-width="16"/>`);
  p.push(`<rect x="90" y="1070" width="480" height="26" fill="#efe6d8"/>`);
  // curtains
  p.push(`<path d="M60 200 H170 C160 500 190 800 150 1340 H60Z" fill="#d6a88f"/><path d="M490 200 H600 V1340 H510 C470 800 500 500 490 200Z" fill="#d6a88f"/>`);
  p.push(`<path d="M95 220 C90 600 110 1000 100 1330 M560 220 C565 600 545 1000 555 1330" stroke="#c08f76" stroke-width="10" fill="none"/>`);
  p.push(`<rect x="40" y="186" width="580" height="16" rx="8" fill="#6d5a4b"/>`);
  p.push(`<path d="M135 1362 L525 1362 L760 1800 L120 1800Z" fill="#fff4dd" opacity="0.18"/>`);
  // artwork above sofa
  p.push(`<rect x="880" y="380" width="400" height="320" fill="#f6efe3" stroke="#3d3a36" stroke-width="12"/>`);
  p.push(`<rect x="910" y="410" width="340" height="260" fill="#efe1cd"/><circle cx="1030" cy="520" r="80" fill="#d9825f"/><path d="M910 670 C990 580 1080 620 1250 560 V670Z" fill="#6f8f88"/><rect x="1130" y="440" width="80" height="120" fill="#e3b35b"/>`);
  p.push(`<rect x="730" y="460" width="110" height="150" fill="#f6efe3" stroke="#3d3a36" stroke-width="8"/><path d="M748 590 C770 520 800 560 822 500" stroke="#2f4858" stroke-width="8" fill="none"/>`);
  p.push(`<rect x="1320" y="440" width="120" height="120" fill="#f6efe3" stroke="#3d3a36" stroke-width="8"/><circle cx="1380" cy="500" r="34" fill="#a7bba9"/>`);
  // floor lamp
  p.push(`<ellipse cx="600" cy="720" rx="260" ry="260" fill="url(#lamp)"/>`);
  p.push(`<rect x="594" y="760" width="12" height="560" fill="#3d3a36"/><ellipse cx="600" cy="1324" rx="70" ry="14" fill="#3d3a36"/>`);
  p.push(`<path d="M530 650 L670 650 L700 770 L500 770Z" fill="#efdcbc"/><path d="M500 770 L700 770" stroke="#d9c39e" stroke-width="6"/>`);
  // rug
  p.push(`<path d="M480 1420 L1720 1420 L1880 1740 L320 1740Z" fill="#c9a78f"/>`);
  p.push(`<path d="M530 1450 L1670 1450 L1810 1710 L390 1710Z" fill="none" stroke="#efe1cf" stroke-width="10"/>`);
  p.push(`<path d="M720 1580 L1080 1490 L1440 1580 L1080 1670Z" fill="#b48a74"/><path d="M890 1580 L1080 1535 L1270 1580 L1080 1625Z" fill="#e3b35b" opacity="0.6"/>`);
  // sofa (centred on x=1080, y≈1080)
  p.push(`<ellipse cx="1080" cy="1320" rx="520" ry="34" fill="#3a2e24" opacity="0.35" filter="url(#soft)"/>`);
  p.push(`<rect x="680" y="860" width="800" height="270" rx="50" fill="url(#sofa)"/>`);
  p.push(`<path d="M1080 880 V1100" stroke="#45625f" stroke-width="6" opacity="0.6"/>`);
  p.push(`<rect x="700" y="1090" width="760" height="140" rx="30" fill="url(#seat)"/><path d="M1080 1095 V1225" stroke="#45625f" stroke-width="6" opacity="0.6"/>`);
  p.push(`<rect x="620" y="980" width="140" height="270" rx="50" fill="#557a77"/><rect x="1400" y="980" width="140" height="270" rx="50" fill="#557a77"/>`);
  p.push(`<rect x="660" y="1230" width="840" height="40" rx="12" fill="#45625f"/>`);
  p.push(`<path d="M690 1270 l-10 50 h22 l6 -50Z M1470 1270 l10 50 h-22 l-6 -50Z" fill="#3d2f24"/>`);
  p.push(`<path d="M780 960 Q840 940 900 960 Q910 1030 900 1100 Q840 1085 780 1100 Q770 1030 780 960Z" fill="#e3b35b"/>`);
  p.push(`<path d="M1260 950 Q1330 930 1390 955 Q1400 1030 1388 1100 Q1330 1085 1265 1100 Q1252 1030 1260 950Z" fill="#d9a59a"/>`);
  p.push(`<path d="M1175 980 Q1225 970 1265 985 Q1272 1040 1262 1095 Q1225 1088 1180 1095 Q1170 1040 1175 980Z" fill="#f1e9dd"/>`);
  p.push(`<path d="M1300 1090 L1460 1080 L1470 1250 L1340 1260Z" fill="#cf8a6e"/><path d="M1320 1110 L1460 1100 M1325 1140 L1465 1130 M1330 1170 L1466 1160" stroke="#e8b8a0" stroke-width="5"/>`);
  // coffee table
  p.push(`<ellipse cx="1080" cy="1500" rx="300" ry="34" fill="#3a2e24" opacity="0.3" filter="url(#soft)"/>`);
  p.push(`<path d="M860 1420 L870 1500 M1300 1420 L1290 1500 M960 1420 L955 1490 M1200 1420 L1205 1490" stroke="#4a3a2c" stroke-width="12"/>`);
  p.push(`<ellipse cx="1080" cy="1412" rx="290" ry="44" fill="#8a6446"/><ellipse cx="1080" cy="1404" rx="290" ry="44" fill="#a57b56"/>`);
  p.push(`<rect x="960" y="1372" width="150" height="24" rx="3" fill="#2f4858"/><rect x="972" y="1352" width="130" height="22" rx="3" fill="#e3b35b"/>`);
  p.push(`<path d="M1170 1340 h50 v50 q-25 10 -50 0Z" fill="#f1e9dd"/><path d="M1220 1350 q20 0 18 18 q-2 14 -18 14" stroke="#f1e9dd" stroke-width="7" fill="none"/>`);
  // plant
  p.push(`<ellipse cx="1680" cy="1350" rx="110" ry="16" fill="#3a2e24" opacity="0.35" filter="url(#soft)"/>`);
  let leaves = "";
  for (const [dx, y, a] of [[-80, 1120, -150], [-40, 1000, -120], [0, 900, -95], [40, 980, -70], [90, 1080, -35], [-20, 1080, -105], [60, 1150, -20], [-100, 1180, -175]]) {
    leaves += `<path d="M1680 1220 Q${1680 + dx * 0.5} ${(1220 + y) / 2} ${1680 + dx} ${y}" stroke="#4f6b50" stroke-width="6" fill="none"/>`;
    leaves += `<g transform="translate(${1680 + dx} ${y}) rotate(${a})"><path d="M0 0 C40 -60 140 -60 180 0 C140 60 40 60 0 0Z" fill="${rnd() < 0.5 ? "#5f8462" : "#6f9672"}"/><path d="M10 0 H170" stroke="#4a6a4d" stroke-width="4"/></g>`;
  }
  p.push(leaves);
  p.push(`<path d="M1600 1200 H1760 L1740 1350 H1620Z" fill="#d9c7b0"/><rect x="1590" y="1190" width="180" height="22" rx="6" fill="#e6d6c0"/>`);
  // shelves
  p.push(`<rect x="1860" y="300" width="440" height="1040" fill="#d2c0a8"/><rect x="1880" y="320" width="400" height="1000" fill="#c6b297"/>`);
  for (const y of [520, 740, 960, 1180]) p.push(`<rect x="1870" y="${y}" width="420" height="20" fill="#8f6f52"/>`);
  const bookColors = ["#2f4858", "#d9825f", "#e3b35b", "#6f8f88", "#b56f78", "#f1e9dd", "#4b6d6a", "#a27a55"];
  let books = "";
  for (const bot of [520, 740, 960, 1180, 1320]) {
    let x = 1895;
    const end = bot === 960 ? 2120 : 2270, maxH = bot === 1320 ? 120 : 185;
    while (x < end) {
      const w = 22 + rnd() * 26, h = maxH * (0.62 + rnd() * 0.38);
      books += `<rect x="${r1(x)}" y="${r1(bot - h)}" width="${r1(w)}" height="${r1(h)}" fill="${bookColors[Math.floor(rnd() * 8)]}"/>`;
      x += w + 3;
    }
  }
  p.push(books);
  p.push(`<path d="M2170 960 C2140 930 2150 880 2190 870 V840 H2220 V870 C2260 880 2270 930 2240 960Z" fill="#7d9b8a"/><path d="M2205 840 C2190 780 2160 760 2140 760 M2205 840 C2215 780 2250 770 2270 760" stroke="#6b7f5c" stroke-width="5" fill="none"/>`);
  return { W, H, svg: svg(W, H, defs, p.join("")) };
}

/* ------------------------------------------------------------- 9 abstract */
function abstract() {
  const W = 2000, H = 2000, rnd = prng(9);
  const C = ["#d97a5b", "#e3b35b", "#7d9b8a", "#2f4858", "#e8b8a8", "#a3b9c9"];
  const pick = (ex) => { let c; do { c = C[Math.floor(rnd() * C.length)]; } while (c === ex); return c; };
  const p = [`<rect width="${W}" height="${H}" fill="#efe6d8"/>`];
  const S = 500;
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const x = gx * S, y = gy * S, bg = pick(), fg = pick(bg);
      const id = `c${gx}${gy}`;
      let s = `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${S}" height="${S}"/></clipPath><g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${(gx + gy) % 2 ? bg : "#efe6d8"}"/>`;
      const kind = Math.floor(rnd() * 7);
      const corner = Math.floor(rnd() * 4), ccx = x + (corner % 2) * S, ccy = y + Math.floor(corner / 2) * S;
      if (kind === 0) s += `<circle cx="${x + S / 2}" cy="${y + S / 2}" r="${S * 0.36}" fill="${fg}"/>`;
      if (kind === 1) s += `<circle cx="${ccx}" cy="${ccy}" r="${S}" fill="${fg}"/><circle cx="${ccx}" cy="${ccy}" r="${S * 0.5}" fill="${pick(fg)}"/>`;
      if (kind === 2) s += `<path d="M${x} ${y + S} A${S / 2} ${S / 2} 0 0 1 ${x + S} ${y + S}Z" fill="${fg}"/><circle cx="${x + S / 2}" cy="${y + S * 0.28}" r="${S * 0.12}" fill="${pick(fg)}"/>`;
      if (kind === 3) { for (let i = 0; i < 6; i++) s += `<rect x="${x}" y="${y + i * (S / 6)}" width="${S}" height="${S / 12}" fill="${fg}"/>`; }
      if (kind === 4) { for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) s += `<circle cx="${x + 50 + i * 100}" cy="${y + 50 + j * 100}" r="18" fill="${fg}"/>`; }
      if (kind === 5) { for (let r = 80; r <= 480; r += 80) s += `<circle cx="${ccx}" cy="${ccy}" r="${r}" fill="none" stroke="${fg}" stroke-width="34"/>`; }
      if (kind === 6) s += `<path d="M${x} ${y} L${x + S} ${y + S} L${x} ${y + S}Z" fill="${fg}"/><circle cx="${x + S * 0.7}" cy="${y + S * 0.3}" r="${S * 0.14}" fill="${pick(fg)}"/>`;
      p.push(s + "</g>");
    }
  }
  // organic blobs
  const blob = (cx, cy, r, c, op) => {
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const rr = r * (0.75 + rnd() * 0.45); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    const loop = [pts[7], ...pts, pts[0], pts[1]];
    // spline from pts[0] around to pts[0], using wrap-around neighbours
    let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 1; i <= 8; i++) {
      const p0 = loop[i - 1], p1 = loop[i], p2 = loop[i + 1], p3 = loop[i + 2];
      d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return `<path d="${d}Z" fill="${c}" opacity="${op}"/>`;
  };
  p.push(blob(420, 1540, 260, "#2f4858", 1), blob(1600, 430, 240, "#d97a5b", 1), blob(1580, 1600, 180, "#7d9b8a", 1), blob(420, 420, 170, "#e3b35b", 1));
  p.push(`<path d="${spline([[-40, 1180], [400, 900], [800, 1300], [1200, 700], [1600, 1100], [2040, 820]])}" stroke="#1f2f3a" stroke-width="14" fill="none" stroke-linecap="round"/>`);
  // central medallion
  p.push(`<circle cx="1000" cy="1000" r="300" fill="#f1e9dc"/><circle cx="1000" cy="1000" r="250" fill="#2f4858"/><circle cx="1000" cy="1000" r="170" fill="none" stroke="#e3b35b" stroke-width="28"/><path d="M1000 830 A170 170 0 0 1 1000 1170Z" fill="#d97a5b"/><circle cx="1000" cy="1000" r="40" fill="#f1e9dc"/>`);
  return { W, H, svg: svg(W, H, "", p.join("")) };
}

/* ----------------------------------------------------------------- main */
const SAMPLES = { landscape, portrait, architecture, product, skyline, group, wildlife, interior, abstract };

await mkdir(THUMBS, { recursive: true });
const only = process.argv.slice(2);
// These samples are photographs (see scripts/import-photos.mjs); never overwrite them.
const PHOTOS = new Set(["landscape", "portrait", "architecture", "product", "group", "interior"]);
for (const [id, build] of Object.entries(SAMPLES)) {
  if (PHOTOS.has(id)) continue;
  if (only.length && !only.includes(id)) continue;
  const { W, H, svg: s } = build();
  const full = path.join(OUT, `${id}.webp`);
  const thumb = path.join(THUMBS, `${id}.webp`);
  await sharp(Buffer.from(s)).resize(W, H).webp({ quality: 82, effort: 6 }).toFile(full);
  const tw = W >= H ? 480 : Math.round((W / H) * 480);
  const th = W >= H ? Math.round((H / W) * 480) : 480;
  await sharp(full).resize(tw, th).webp({ quality: 70, effort: 6 }).toFile(thumb);
  const meta = await sharp(full).metadata();
  console.log(`${id.padEnd(13)} ${meta.width}x${meta.height}`);
}
