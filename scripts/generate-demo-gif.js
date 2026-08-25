'use strict';

const fs = require('node:fs');
const path = require('node:path');

const W = 320;
const H = 180;
const OUT = path.join(__dirname, '..', 'docs', 'assets', 'promptforge-demo.gif');

const palette = [
  [7, 11, 18],
  [12, 18, 32],
  [17, 24, 39],
  [38, 54, 80],
  [79, 140, 255],
  [125, 211, 252],
  [230, 237, 246],
  [151, 163, 182],
];

function rect(p, x, y, w, h, c) {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
      p[yy * W + xx] = c;
    }
  }
}

function frame(step) {
  const p = new Uint8Array(W * H).fill(0);
  rect(p, 18, 16, 284, 148, 1);
  rect(p, 18, 16, 284, 14, 2);
  rect(p, 26, 40, 48, 112, 2);
  for (let i = 0; i < 5; i++) rect(p, 32, 48 + i * 18, 34, 7, i === step % 5 ? 4 : 3);
  rect(p, 88, 45, 125, 34, 2);
  rect(p, 96, 54, 92, 4, 7);
  rect(p, 96, 64, 106, 4, 3);
  rect(p, 88, 91, 125, 56, 0);
  const generated = Math.min(6, step + 1);
  for (let i = 0; i < generated; i++) {
    rect(p, 96, 101 + i * 7, 96 - (i % 3) * 14, 3, i === generated - 1 ? 5 : 6);
  }
  rect(p, 225, 45, 58, 20, 2);
  rect(p, 233, 53, 34, 4, 7);
  rect(p, 225, 77, 58, 22, 2);
  rect(p, 233, 86, 42, 4, 5);
  rect(p, 225, 111, 58, 36, 2);
  rect(p, 233, 120, 40, 4, 6);
  rect(p, 233, 131, 32, 4, 3);
  rect(p, 96, 154, 38 + step * 11, 4, 4);
  return p;
}

function lzw(pixels) {
  const codes = [];
  for (let i = 0; i < pixels.length; i += 250) {
    codes.push(256);
    for (let j = i; j < Math.min(pixels.length, i + 250); j++) codes.push(pixels[j]);
  }
  codes.push(257);

  const bytes = [];
  let cur = 0;
  let bits = 0;
  for (const code of codes) {
    cur |= code << bits;
    bits += 9;
    while (bits >= 8) {
      bytes.push(cur & 255);
      cur >>= 8;
      bits -= 8;
    }
  }
  if (bits) bytes.push(cur & 255);

  const blocks = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return Buffer.from([8, ...blocks]);
}

function u16(n) {
  return [n & 255, (n >> 8) & 255];
}

const parts = [];
parts.push(Buffer.from('GIF89a', 'ascii'));
parts.push(Buffer.from([...u16(W), ...u16(H), 0xf7, 0, 0]));
const table = [];
for (let i = 0; i < 256; i++) table.push(...(palette[i] || palette[0]));
parts.push(Buffer.from(table));
parts.push(Buffer.from([0x21, 0xff, 11]), Buffer.from('NETSCAPE2.0', 'ascii'), Buffer.from([3, 1, 0, 0, 0]));

for (let i = 0; i < 12; i++) {
  parts.push(Buffer.from([0x21, 0xf9, 4, 0, 12, 0, 0, 0]));
  parts.push(Buffer.from([0x2c, 0, 0, 0, 0, ...u16(W), ...u16(H), 0]));
  parts.push(lzw(frame(i)));
}
parts.push(Buffer.from([0x3b]));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat(parts));
console.log(`Wrote ${OUT}`);
