// Generates public/favicon.ico (16x16 + 32x32, PNG-in-ICO) using only Node built-ins.
import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'

// ── Theme colours ───────────────────────────────────────────────────────────
const BG     = [13,  15,  20,  255]   // #0d0f14
const CHIP   = [26,  30,  43,  255]   // #1a1e2b
const BORDER = [42,  48,  80,  255]   // #2a3050
const GREEN  = [74,  240, 160, 255]   // #4af0a0
const PIN    = [120, 136, 168, 255]   // #7888a8

// ── 3×5 pixel font  ─────────────────────────────────────────────────────────
const GLYPHS = {
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
}

// ── PNG helpers ─────────────────────────────────────────────────────────────
function crc32(buf) {
  if (!crc32.t) {
    crc32.t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      crc32.t[i] = c
    }
  }
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = crc32.t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii')
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length)
  const cc = Buffer.allocUnsafe(4); cc.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([lb, tb, data, cc])
}

function makePNG(W, H, drawFn) {
  const px = new Uint8Array(W * H * 4)
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return
    const i = (y * W + x) * 4
    px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a
  }
  drawFn(set)

  // raw scanline data (filter byte 0 = None per row)
  const raw = Buffer.allocUnsafe(H * (1 + W * 4))
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0
    for (let x = 0; x < W; x++) {
      const s = (y * W + x) * 4, d = y * (1 + W * 4) + 1 + x * 4
      raw[d] = px[s]; raw[d+1] = px[s+1]; raw[d+2] = px[s+2]; raw[d+3] = px[s+3]
    }
  }

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Draw function (works at any size, scales "85" to fit) ───────────────────
function draw(set, W, H) {
  // background
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      set(x, y, ...BG)

  if (W === 32) {
    // ─── 32x32 Nice Microchip Design ───
    
    // 1. Draw Pins (metallic vertical lines from y=4 to 7 and y=24 to 27)
    const pinX = [5, 8, 11, 14, 17, 20, 23, 26, 29]
    for (const x of pinX) {
      for (let y = 4; y <= 7; y++) set(x, y, ...PIN)
      for (let y = 24; y <= 27; y++) set(x, y, ...PIN)
    }

    // 2. Draw Chip Body (x from 2 to 29, y from 8 to 23)
    for (let y = 8; y <= 23; y++) {
      for (let x = 2; x <= 29; x++) {
        // Exclude notch area: x <= 4 and y is 14 to 17
        if (x <= 4 && y >= 14 && y <= 17) {
          // Inside notch (BG)
          if (x === 4 && (y === 15 || y === 16)) {
            // curve peak
            continue
          }
          if (x < 4) {
            continue
          }
        }
        set(x, y, ...CHIP)
      }
    }

    // 3. Draw Chip Border (1px)
    // Horizontal borders
    for (let x = 2; x <= 29; x++) {
      set(x, 8, ...BORDER)
      set(x, 23, ...BORDER)
    }
    // Vertical borders
    for (let y = 8; y <= 23; y++) {
      if (y < 14 || y > 17) {
        set(2, y, ...BORDER)
      }
      set(29, y, ...BORDER)
    }
    // Notch border curving inwards:
    set(2, 13, ...BORDER)
    set(3, 13, ...BORDER)
    set(4, 14, ...BORDER)
    set(5, 15, ...BORDER)
    set(5, 16, ...BORDER)
    set(4, 17, ...BORDER)
    set(3, 18, ...BORDER)
    set(2, 18, ...BORDER)

    // 4. Pin 1 Dot
    set(5, 11, ...GREEN)

    // 5. Draw "8085" (height 8, y from 12 to 20)
    const drawLineH = (x1, x2, y) => { for (let x = x1; x <= x2; x++) set(x, y, ...GREEN) }
    const drawLineV = (x, y1, y2) => { for (let y = y1; y <= y2; y++) set(x, y, ...GREEN) }

    // '8' (x: 4..7, y: 12..20)
    drawLineH(4, 7, 12)
    drawLineH(4, 7, 16)
    drawLineH(4, 7, 20)
    drawLineV(4, 12, 20)
    drawLineV(7, 12, 20)

    // '0' (x: 11..14, y: 12..20)
    drawLineH(11, 14, 12)
    drawLineH(11, 14, 20)
    drawLineV(11, 12, 20)
    drawLineV(14, 12, 20)

    // '8' (x: 18..21, y: 12..20)
    drawLineH(18, 21, 12)
    drawLineH(18, 21, 16)
    drawLineH(18, 21, 20)
    drawLineV(18, 12, 20)
    drawLineV(21, 12, 20)

    // '5' (x: 25..28, y: 12..20)
    drawLineH(25, 28, 12)
    drawLineV(25, 12, 16)
    drawLineH(25, 28, 16)
    drawLineV(28, 16, 20)
    drawLineH(25, 28, 20)

  } else {
    // ─── 16x16 Nice Microchip Design (fallback/default for smaller sizes) ───

    // 1. Draw Pins (at x = 2, 4, 6, 8, 10, 12, 14)
    const pinX = [2, 4, 6, 8, 10, 12, 14]
    for (const x of pinX) {
      for (let y = 1; y <= 3; y++) set(x, y, ...PIN)
      for (let y = 12; y <= 14; y++) set(x, y, ...PIN)
    }

    // 2. Draw Chip Body (x from 1 to 14, y from 4 to 11)
    for (let y = 4; y <= 11; y++) {
      for (let x = 1; x <= 14; x++) {
        // Notch on left edge: at x = 1, y = 7..8
        if (x === 1 && (y === 7 || y === 8)) {
          continue
        }
        set(x, y, ...CHIP)
      }
    }

    // 3. Draw Chip Border (1px)
    for (let x = 1; x <= 14; x++) {
      set(x, 4, ...BORDER)
      set(x, 11, ...BORDER)
    }
    for (let y = 4; y <= 11; y++) {
      if (y !== 7 && y !== 8) {
        set(1, y, ...BORDER)
      }
      set(14, y, ...BORDER)
    }
    // Notch border curving inwards:
    set(2, 7, ...BORDER)
    set(2, 8, ...BORDER)

    // 4. Pin 1 Dot
    set(2, 6, ...GREEN)

    // 5. Draw "85" (height 5, y from 5 to 9)
    const drawLineH = (x1, x2, y) => { for (let x = x1; x <= x2; x++) set(x, y, ...GREEN) }
    const drawLineV = (x, y1, y2) => { for (let y = y1; y <= y2; y++) set(x, y, ...GREEN) }

    // '8' (x: 3..5, y: 5..9)
    drawLineH(3, 5, 5)
    drawLineH(3, 5, 7)
    drawLineH(3, 5, 9)
    drawLineV(3, 5, 9)
    drawLineV(5, 5, 9)

    // '5' (x: 9..11, y: 5..9)
    drawLineH(9, 11, 5)
    drawLineV(9, 5, 7)
    drawLineH(9, 11, 7)
    drawLineV(11, 7, 9)
    drawLineH(9, 11, 9)
  }
}

const png32 = makePNG(32, 32, (s) => draw(s, 32, 32))
const png16 = makePNG(16, 16, (s) => draw(s, 16, 16))

// ── ICO container ───────────────────────────────────────────────────────────
const HDR_SIZE   = 6
const ENTRY_SIZE = 16
const NUM        = 2
const dataOffset = HDR_SIZE + NUM * ENTRY_SIZE   // 38

const hdr = Buffer.allocUnsafe(6)
hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(NUM, 4)

function dirEntry(sz, png, off) {
  const e = Buffer.allocUnsafe(16)
  e[0] = sz; e[1] = sz; e[2] = 0; e[3] = 0
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6)
  e.writeUInt32LE(png.length, 8); e.writeUInt32LE(off, 12)
  return e
}

const ico = Buffer.concat([
  hdr,
  dirEntry(32, png32, dataOffset),
  dirEntry(16, png16, dataOffset + png32.length),
  png32,
  png16,
])

writeFileSync('public/favicon.ico', ico)
console.log(`favicon.ico  ${ico.length} bytes  (32x32 + 16x16 PNG-in-ICO)`)
