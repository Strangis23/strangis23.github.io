#!/usr/bin/env node
/**
 * Fallback icon generator (no ImageMagick). Writes build/icon.png and a minimal icon.ico.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(__dirname, '..', 'build');
const pngPath = path.join(buildDir, 'icon.png');
const icoPath = path.join(buildDir, 'icon.ico');

const W = 256;
const H = 256;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crc]);
}

function sample(x, y) {
  const nx = x / W;
  const ny = y / H;
  const bg = [11, 18, 36, 255];
  if (nx < 0.08 || nx > 0.92 || ny < 0.08 || ny > 0.92) return bg;
  const blocks = [
    { x0: 0.22, x1: 0.35, y0: 0.38, y1: 0.78, c: [34, 211, 238, 255] },
    { x0: 0.4, x1: 0.53, y0: 0.28, y1: 0.78, c: [34, 211, 238, 230] },
    { x0: 0.58, x1: 0.71, y0: 0.44, y1: 0.78, c: [34, 211, 238, 200] },
    { x0: 0.16, x1: 0.84, y0: 0.8, y1: 0.9, c: [30, 41, 59, 255] },
  ];
  for (const b of blocks) {
    if (nx >= b.x0 && nx <= b.x1 && ny >= b.y0 && ny <= b.y1) return b.c;
  }
  const dx = nx - 0.5;
  const dy = ny - 0.18;
  if (dx * dx + dy * dy < 0.012) return [251, 191, 36, 255];
  return bg;
}

function writePng(file, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = sample(x, y);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

/** Minimal single-size ICO (256x256 PNG embedded). */
function writeIco(file, pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 0;
  entry[1] = 0;
  entry[2] = 0;
  entry[3] = 0;
  entry[4] = 256 % 256;
  entry[5] = 256 / 256;
  entry[6] = 0;
  entry[7] = 0;
  entry[8] = 0;
  entry[9] = 0;
  entry[10] = 32;
  entry[11] = 0;
  const offset = 6 + 16;
  entry.writeUInt32LE(offset, 12);
  fs.writeFileSync(file, Buffer.concat([header, entry, pngBuf]));
}

fs.mkdirSync(buildDir, { recursive: true });
const pngBuf = (() => {
  writePng(pngPath, W, H);
  return fs.readFileSync(pngPath);
})();
writeIco(icoPath, pngBuf);
console.log('Wrote', pngPath, 'and', icoPath);
