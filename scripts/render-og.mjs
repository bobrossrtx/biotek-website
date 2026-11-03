/**
 * Renders public/images/og.svg to public/images/og.png (1200x630).
 * Social platforms don't reliably render SVG share images, so the site
 * references og.png. Requires the optional `sharp` dependency.
 * Run: node scripts/render-og.mjs  (or npm run build:og)
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("public/images/og.svg");
await sharp(svg, { density: 96 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile("public/images/og.png");

console.log("public/images/og.png written (1200x630)");
