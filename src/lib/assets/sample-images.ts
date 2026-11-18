import type { UnitPoint } from "@/types/simulator";

export interface SampleImage {
  id: string;
  name: string;
  composition: string;
  purpose: string;
  width: number;
  height: number;
  /** Suggested focal point of the main subject (original-image fractions). */
  focal: UnitPoint;
  src: string;
  thumb: string;
  /** Generated in-app instead of loaded from /public. */
  generated?: boolean;
}

function sample(
  id: string,
  name: string,
  composition: string,
  purpose: string,
  width: number,
  height: number,
  focal: UnitPoint,
): SampleImage {
  return { id, name, composition, purpose, width, height, focal, src: `/samples/${id}.webp`, thumb: `/samples/thumbs/${id}.webp` };
}

/**
 * Photographs supplied for the project (imported with scripts/import-photos.mjs)
 * plus original illustrations for skyline, wildlife and abstract
 * (scripts/generate-samples.mjs). Dimensions must match the files on disk.
 */
export const SAMPLE_IMAGES: SampleImage[] = [
  sample("landscape", "Mountain landscape", "Wide scenic view", "Landscape cropping", 1920, 1072, { x: 0.47, y: 0.3 }),
  sample("portrait", "Human portrait", "Tight face close-up, off-center", "Vertical positioning", 1000, 747, { x: 0.56, y: 0.45 }),
  sample("architecture", "Architecture", "Symmetrical building", "Center alignment", 2375, 1568, { x: 0.5, y: 0.45 }),
  sample("product", "Product photography", "Centered product", "Product visibility", 1932, 1932, { x: 0.5, y: 0.55 }),
  sample("skyline", "City skyline", "Horizontally distributed subjects", "Wide composition", 3000, 1200, { x: 0.5, y: 0.55 }),
  sample("group", "Group photograph", "Multiple people across frame", "Edge cropping", 2048, 1356, { x: 0.5, y: 0.6 }),
  sample("wildlife", "Wildlife", "Off-center subject", "Focal point positioning", 2400, 1600, { x: 0.72, y: 0.55 }),
  sample("interior", "Interior design", "Detailed room", "Composition preservation", 1920, 1200, { x: 0.6, y: 0.68 }),
  sample("abstract", "Abstract artwork", "Distributed visual elements", "General scaling", 2000, 2000, { x: 0.5, y: 0.5 }),
  {
    id: "calibration",
    name: "Calibration grid",
    composition: "Numbered grid and markers",
    purpose: "Precise technical analysis",
    width: 2400,
    height: 1600,
    focal: { x: 0.5, y: 0.5 },
    src: "",
    thumb: "",
    generated: true,
  },
];

export function getSample(id: string): SampleImage {
  return SAMPLE_IMAGES.find((s) => s.id === id) ?? SAMPLE_IMAGES[0];
}
