// Generate PWA icons from the two source SVGs into public/icons/.
// Run via: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public", "icons");

await mkdir(outDir, { recursive: true });

const base = await readFile(resolve(here, "icon-source.svg"));
const maskable = await readFile(resolve(here, "icon-source-maskable.svg"));

async function png(buf, size, name) {
  const out = resolve(outDir, name);
  await sharp(buf, { density: 384 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${name} (${size}×${size})`);
}

await png(base, 192, "pwa-192.png");
await png(base, 512, "pwa-512.png");
await png(maskable, 192, "pwa-maskable-192.png");
await png(maskable, 512, "pwa-maskable-512.png");
await png(base, 180, "apple-touch-icon.png");
await png(base, 32, "favicon-32.png");

// Also keep the source SVG next to the PNGs so the manifest can point to it
await writeFile(resolve(outDir, "icon.svg"), base);
console.log("wrote icon.svg");
