import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display rounding: keeps full precision internally, trims trailing zeros. */
export function fmt(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = value.toFixed(digits);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

export function fmtPx(value: number, digits = 1): string {
  return `${fmt(value, digits)}px`;
}

export function fmtPct(value: number, digits = 1): string {
  // Avoid "-0%" and "100%" for tiny float noise.
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return `${v.toFixed(digits)}%`;
}

export function fmtSize(w: number, h: number, digits = 1): string {
  return `${fmt(w, digits)} × ${fmt(h, digits)}`;
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, type = "text/plain") {
  downloadBlob(new Blob([text], { type }), filename);
}
