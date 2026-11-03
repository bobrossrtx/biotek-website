/**
 * Recolours the white BioTek logo to acid green using its alpha channel as
 * a per-pixel mask, writing public/images/biotek-logo-green.png (hero).
 * Also renders the green favicon to src/app/icon.png.
 * Re-run whenever you swap the logo file: npm run build:logo
 */
import sharp from "sharp";

const ACID = { r: 163, g: 255, b: 60 };

async function tintToGreenBuffer(inputPath, size, fit = "fill") {
  const { data, info } = await sharp(inputPath)
    .resize(size, size, { fit })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += info.channels) {
    out[i] = ACID.r;
    out[i + 1] = ACID.g;
    out[i + 2] = ACID.b;
    out[i + 3] = data[i + 3];
  }
  return { data: out, width: info.width, height: info.height };
}

// Hero logo: green tint at full source resolution
const hero = await tintToGreenBuffer("public/images/biotek-logo.png", 1254);
await sharp(hero.data, {
  raw: { width: hero.width, height: hero.height, channels: 4 },
})
  .png()
  .toFile("public/images/biotek-logo-green.png");

// Favicon: green mark centred on the site background colour
const mark = await tintToGreenBuffer("public/images/biotek-logo.png", 56, "contain");
const markPng = await sharp(mark.data, {
  raw: { width: mark.width, height: mark.height, channels: 4 },
})
  .png()
  .toBuffer();

await sharp({
  create: { width: 64, height: 64, channels: 4, background: { r: 6, g: 8, b: 7, alpha: 1 } },
})
  .composite([{ input: markPng, blend: "over" }])
  .png()
  .toFile("src/app/icon.png");

console.log("biotek-logo-green.png + icon.png written (acid green)");
