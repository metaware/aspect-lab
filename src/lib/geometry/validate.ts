export function isValidDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function assertDimension(value: number, label: string): void {
  if (!isValidDimension(value)) {
    throw new RangeError(`${label} must be a finite number greater than zero (received ${value})`);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
