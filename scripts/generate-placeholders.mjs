#!/usr/bin/env node
/**
 * Generates branded SVG placeholder images for the BioTek site.
 * Re-run any time: node scripts/generate-placeholders.mjs
 * Replace these with real photos (keep the same filenames) before launch.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "public/images";
const GREEN = "#a3ff3c";
const DIM = "#131b16";
const MID = "#1c2620";
const BG = "#0a0d0b";
const TXT = "#5f6f64";

for (const dir of ["rig", "gallery"]) {
  mkdirSync(join(OUT, dir), { recursive: true });
}

const grain = (n) => {
  let s = "";
  let seed = n * 2654435761;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 90; i++) {
    const x = (rnd() * 800).toFixed(0);
    const y = (rnd() * 1000).toFixed(0);
    const l = (2 + rnd() * 9).toFixed(0);
    const w = (4 + rnd() * 26).toFixed(0);
    const o = (0.04 + rnd() * 0.1).toFixed(2);
    s += `<rect x='${x}' y='${y}' width='${w}' height='${l}' fill='${rnd() > 0.82 ? GREEN : "#ffffff"}' opacity='${o}'/>`;
  }
  return s;
};

const frame = (w, h) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' role='img' aria-label='Placeholder image'>` +
  `<defs><pattern id='g' width='40' height='40' patternUnits='userSpaceOnUse'>` +
  `<path d='M40 0H0V40' fill='none' stroke='${DIM}' stroke-width='1'/></pattern>` +
  `<radialGradient id='v' cx='50%' cy='42%' r='75%'>` +
  `<stop offset='0%' stop-color='${MID}'/><stop offset='100%' stop-color='${BG}'/></radialGradient></defs>` +
  `<rect width='${w}' height='${h}' fill='url(#v)'/>` +
  `<rect width='${w}' height='${h}' fill='url(#g)'/>`;

const label = (lines, cx, y, size) =>
  lines
    .map(
      (t, i) =>
        `<text x='${cx}' y='${y + i * (size + 8)}' text-anchor='middle' font-family='Arial Black, sans-serif' font-size='${size}' font-weight='900' fill='${i === 0 ? GREEN : TXT}' letter-spacing='2'>${t}</text>`
    )
    .join("");

const biohazard = (cx, cy, r, o = 0.5) => {
  const seg = (rot) =>
    `<g transform='rotate(${rot} ${cx} ${cy})'>
      <path d='M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * 0.866} ${cy - r * 0.5}' fill='none' stroke='${GREEN}' stroke-width='${r * 0.22}' opacity='${o}'/>
      <circle cx='${cx + r * 0.62}' cy='${cy - r * 0.36}' r='${r * 0.16}' fill='${GREEN}' opacity='${o}'/>
    </g>`;
  return (
    `<circle cx='${cx}' cy='${cy}' r='${r * 0.3}' fill='none' stroke='${GREEN}' stroke-width='${r * 0.14}' opacity='${o}'/>` +
    seg(0) +
    seg(120) +
    seg(240)
  );
};

// Rig photos (1200x800)
const rigImg = (n, line1, line2) => {
  let boxes = "";
  for (let k = 0; k < 6; k++) {
    const x = 140 + k * 92;
    const y = 160 + (k % 2) * 46;
    const h = 430 - (k % 2) * 46;
    boxes +=
      `<rect x='${x}' y='${y}' width='78' height='${h}' rx='6' fill='none' stroke='${GREEN}' stroke-width='3' opacity='${(0.25 + (k % 3) * 0.18).toFixed(2)}'/>` +
      `<circle cx='${x + 39}' cy='${(y + h * 0.62).toFixed(0)}' r='26' fill='none' stroke='${GREEN}' stroke-width='3' opacity='0.5'/>` +
      `<circle cx='${x + 39}' cy='${(y + h * 0.62).toFixed(0)}' r='9' fill='${GREEN}' opacity='0.4'/>`;
  }
  const s =
    frame(1200, 800) +
    grain(n + 10) +
    boxes +
    `<rect x='0' y='660' width='1200' height='140' fill='${BG}' opacity='0.85'/>` +
    label([line1, line2], 600, 712, 40) +
    `<text x='600' y='778' text-anchor='middle' font-family='monospace' font-size='20' fill='${TXT}' letter-spacing='4'>[ SWAP WITH PHOTO / 1200x800 ]</text>` +
    `</svg>`;
  writeFileSync(join(OUT, "rig", `rig-${n}.svg`), s);
};

rigImg(1, "THE RIG", "STACK ELEVATION");
rigImg(2, "POWER SECTION", "AMPS & GENNY");
rigImg(3, "FIELD SESSION", "EAST SUSSEX 2026");

// Gallery (1600x1000)
for (let p = 1; p <= 8; p++) {
  const s =
    frame(1600, 1000) +
    grain(p + 20) +
    biohazard(800, 430, 210, 0.4) +
    `<rect x='0' y='830' width='1600' height='170' fill='${BG}' opacity='0.85'/>` +
    label([`GALLERY ${p}`], 800, 900, 44) +
    `<text x='800' y='965' text-anchor='middle' font-family='monospace' font-size='20' fill='${TXT}' letter-spacing='4'>[ SWAP WITH PHOTO / 1600x1000 ]</text>` +
    `</svg>`;
  writeFileSync(join(OUT, "gallery", `photo-${p}.svg`), s);
}

// Open Graph fallback (1200x630). Replace public/images/og.png with a real export.
writeFileSync(
  join(OUT, "og.svg"),
  frame(1200, 630) +
    grain(99) +
    biohazard(600, 220, 130, 0.6) +
    label(["BIOTEK", "SOUND SYSTEM"], 600, 470, 92) +
    label(["FREE PARTY — EAST SUSSEX"], 600, 570, 30) +
    `</svg>`
);

console.log("Placeholders written to public/images");
