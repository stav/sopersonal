/**
 * Generate PWA icon PNGs for SoPersonal app.
 *
 * Uses only Node.js built-ins (zlib, fs) to produce valid PNG files.
 * Draws an indigo (#6366F1) rounded-square background with white "SP" text.
 */

import { writeFileSync, mkdirSync } from "fs";
import { deflateSync } from "zlib";

// -- PNG helpers --------------------------------------------------------------

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function buildPNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowLen = width * 4;
  const raw = Buffer.alloc(height * (1 + rowLen));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + rowLen)] = 0; // filter: None
    rgba.copy(raw, y * (1 + rowLen) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const compressed = deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// -- Drawing helpers ----------------------------------------------------------

function setPixel(buf, w, x, y, r, g, b, a) {
  const i = (y * w + x) * 4;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
}

function blendPixel(buf, w, x, y, r, g, b, a) {
  if (a === 0) return;
  const i = (y * w + x) * 4;
  if (a === 255) { buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255; return; }
  const srcA = a / 255, dstA = buf[i+3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  buf[i]   = Math.round((r * srcA + buf[i]   * dstA * (1-srcA)) / outA);
  buf[i+1] = Math.round((g * srcA + buf[i+1] * dstA * (1-srcA)) / outA);
  buf[i+2] = Math.round((b * srcA + buf[i+2] * dstA * (1-srcA)) / outA);
  buf[i+3] = Math.round(outA * 255);
}

function fillRoundedRect(buf, w, h, rx, ry, rw, rh, rad, r, g, b) {
  for (let y = ry; y < ry + rh && y < h; y++) {
    for (let x = rx; x < rx + rw && x < w; x++) {
      let inside = true;
      let dist = 0;
      const inLeft = x < rx + rad;
      const inRight = x > rx + rw - rad - 1;
      const inTop = y < ry + rad;
      const inBottom = y > ry + rh - rad - 1;
      if ((inLeft || inRight) && (inTop || inBottom)) {
        const cx = inLeft ? rx + rad : rx + rw - rad - 1;
        const cy = inTop  ? ry + rad : ry + rh - rad - 1;
        const dx = x - cx, dy = y - cy;
        dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > rad) inside = false;
      }
      if (inside) {
        setPixel(buf, w, x, y, r, g, b, 255);
      } else if (dist <= rad + 1) {
        const alpha = Math.max(0, Math.min(255, Math.round((rad + 1 - dist) * 255)));
        blendPixel(buf, w, x, y, r, g, b, alpha);
      }
    }
  }
}

// -- Bitmap font for "SP" -----------------------------------------------------

const GLYPHS = {
  S: [
    "  ##### ",
    " ##   ##",
    " ##     ",
    " ##     ",
    "  ##### ",
    "      ##",
    "      ##",
    " ##   ##",
    "  ##### ",
  ],
  P: [
    " ###### ",
    " ##   ##",
    " ##   ##",
    " ##   ##",
    " ###### ",
    " ##     ",
    " ##     ",
    " ##     ",
    " ##     ",
  ],
};

function drawGlyph(buf, w, h, glyph, startX, startY, scale, r, g, b) {
  const rows = GLYPHS[glyph];
  if (!rows) return;
  for (let gy = 0; gy < rows.length; gy++) {
    for (let gx = 0; gx < rows[gy].length; gx++) {
      if (rows[gy][gx] === "#") {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = startX + gx * scale + sx;
            const py = startY + gy * scale + sy;
            if (px >= 0 && px < w && py >= 0 && py < h)
              setPixel(buf, w, px, py, 255, 255, 255, 255);
          }
        }
      }
    }
  }
}

// -- Generate icon at a given size --------------------------------------------

function generateIcon(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  // Indigo background rounded rectangle
  const cornerRadius = Math.round(size * 0.18);
  fillRoundedRect(buf, size, size, 0, 0, size, size, cornerRadius, 0x63, 0x66, 0xf1);

  // Draw "SP" in white, centred
  const glyphW = 8;
  const glyphH = 9;
  const gap = 2;
  const totalGlyphW = glyphW * 2 + gap;

  const scale = Math.max(1, Math.floor(size / (totalGlyphW + 6)));
  const textW = totalGlyphW * scale;
  const textH = glyphH * scale;

  const startX = Math.round((size - textW) / 2);
  const startY = Math.round((size - textH) / 2);

  drawGlyph(buf, size, size, "S", startX, startY, scale);
  drawGlyph(buf, size, size, "P", startX + (glyphW + gap) * scale, startY, scale);

  return buildPNG(size, size, buf);
}

// -- Main ---------------------------------------------------------------------

const outDir = "/home/stav/Work/stav/SoPersonal/public/icons";
mkdirSync(outDir, { recursive: true });

const icon192 = generateIcon(192);
writeFileSync(outDir + "/icon-192.png", icon192);
console.log("wrote " + outDir + "/icon-192.png  (" + icon192.length + " bytes)");

const icon512 = generateIcon(512);
writeFileSync(outDir + "/icon-512.png", icon512);
console.log("wrote " + outDir + "/icon-512.png  (" + icon512.length + " bytes)");
