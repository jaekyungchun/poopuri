/* ============================================================
   poopuri — icon generator
   Rasterizes one SVG into the PNG sizes a phone home-screen wants.
   Run once (already run for you):  node genIcons.mjs
   ============================================================ */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Cute gradient + a little music note. No fonts, so it renders the
// same everywhere.
const SVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8fc7"/>
      <stop offset="0.55" stop-color="#c06cf0"/>
      <stop offset="1" stop-color="#7b5cff"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g fill="#fff">
    <!-- eighth-note: two heads + a joined beam -->
    <circle cx="196" cy="330" r="46"/>
    <circle cx="330" cy="300" r="46"/>
    <rect x="228" y="150" width="26" height="196" rx="13"/>
    <rect x="362" y="120" width="26" height="196" rx="13"/>
    <path d="M228 150 L388 120 L388 168 L228 198 Z"/>
  </g>
</svg>`;

const sizes = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 180, name: "apple-touch-icon.png" }, // iOS home screen
];

for (const { size, name } of sizes) {
  const png = new Resvg(SVG, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(resolve(process.cwd(), name), png);
  console.log(`  wrote ${name} (${size}px)`);
}
// A crisp SVG favicon too.
writeFileSync(resolve(process.cwd(), "favicon.svg"), SVG);
console.log("  wrote favicon.svg");
