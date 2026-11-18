// Converts source photographs into sample assets:
//   node scripts/import-photos.mjs <id>=<path> [<id>=<path> ...]
// Writes public/samples/<id>.webp (max 2400px long edge) and a 480px thumbnail,
// then prints the final dimensions for src/lib/assets/sample-images.ts.
import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const out = path.resolve("public/samples");
await mkdir(path.join(out, "thumbs"), { recursive: true });

for (const arg of process.argv.slice(2)) {
  const [id, src] = arg.split("=");
  const full = await sharp(src)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(out, `${id}.webp`));
  await sharp(src)
    .rotate()
    .resize({ width: 480, height: 480, fit: "inside" })
    .webp({ quality: 70 })
    .toFile(path.join(out, "thumbs", `${id}.webp`));
  console.log(`${id}: ${full.width}x${full.height} ${Math.round(full.size / 1024)}KB`);
}
