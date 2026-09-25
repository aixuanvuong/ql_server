import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(lineSize * height);

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 4;

      // Base background: #090d16
      let r = 9;
      let g = 13;
      let b = 22;
      let a = 255;

      const normX = x / width;
      const normY = y / height;

      // Distance from center
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // 1. Globe latitude/longitude subtle grid lines (Internet representation)
      if (Math.abs(distFromCenter - 0.7) < 0.02 || Math.abs(distFromCenter - 0.45) < 0.015) {
        r = 14; g = 116; b = 144; // Cyan orbit ring
      }

      // 2. Computer Monitor Frame (normX: 0.20 to 0.80, normY: 0.18 to 0.62)
      const inMonitorFrame = (normX >= 0.20 && normX <= 0.80 && normY >= 0.18 && normY <= 0.62);
      const isMonitorBorder = inMonitorFrame && (
        normX < 0.23 || normX > 0.77 || normY < 0.21 || normY > 0.59
      );
      const inMonitorScreen = (normX >= 0.23 && normX <= 0.77 && normY >= 0.21 && normY <= 0.59);

      if (isMonitorBorder) {
        // Cyan-emerald glowing edge
        r = 6; g = 182; b = 212;
      } else if (inMonitorScreen) {
        // Deep screen black
        r = 3; g = 7; b = 18;

        // Waveform/pulse on screen (Server activity)
        const waveY = 0.40 + Math.sin(normX * 25) * 0.07 * (normX > 0.35 && normX < 0.65 ? 1.5 : 0.4);
        if (Math.abs(normY - waveY) < 0.018) {
          r = 16; g = 185; b = 129; // Emerald green activity line
        }

        // Terminal prompt mark
        if (normX >= 0.26 && normX <= 0.32 && Math.abs(normY - 0.28) < 0.015) {
          r = 56; g = 189; b = 248; // Cyan terminal
        }
      }

      // 3. Monitor Stand
      const inStand = (normX >= 0.45 && normX <= 0.55 && normY >= 0.62 && normY <= 0.73);
      if (inStand) {
        r = 30; g = 41; b = 59;
      }

      // Monitor Base Plate
      const inBasePlate = (normX >= 0.36 && normX <= 0.64 && normY >= 0.73 && normY <= 0.76);
      if (inBasePlate) {
        r = 6; g = 182; b = 212; // Cyan base
      }

      // 4. Internet Globe Hub at Bottom (Connecting Cable + Globe Hub)
      // Vertical optical data cable connecting down
      if (Math.abs(normX - 0.5) < 0.015 && normY >= 0.76 && normY <= 0.83) {
        r = 56; g = 189; b = 248;
      }

      // Globe circle (normX 0.42 to 0.58, normY 0.82 to 0.96)
      const gcx = 0.5;
      const gcy = 0.88;
      const gdist = Math.sqrt(Math.pow((normX - gcx) * 1.2, 2) + Math.pow(normY - gcy, 2));

      if (Math.abs(gdist - 0.08) < 0.016) {
        r = 16; g = 185; b = 129; // Emerald Globe edge
      } else if (gdist < 0.08) {
        // Globe interior with equator and meridian
        if (Math.abs(normY - gcy) < 0.012 || Math.abs(normX - gcx) < 0.012) {
          r = 56; g = 189; b = 248; // Bright cyan latitude/longitude
        } else {
          r = 8; g = 47; b = 73;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcVal = crc32(buf.subarray(4, 8 + len));
  buf.writeInt32BE(crcVal, 8 + len);
  return buf;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180));

console.log('Generated Computer-Internet PWA icons successfully!');
