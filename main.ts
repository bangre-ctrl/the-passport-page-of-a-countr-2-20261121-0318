// Passport spread of the Republic of Aldorra, drawn in code.
// Node 22 stdlib only. Writes /output/entry.png (1024x1024), deterministic.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

const PAPER: RGB = [245, 238, 215];
const PAPER2: RGB = [238, 229, 200];
const INK: RGB = [31, 42, 68];
const TEXT: RGB = [34, 32, 28];
const GREY: RGB = [107, 98, 82];
const BLUE: RGB = [30, 79, 163];
const RED: RGB = [163, 46, 46];
const MRZBG: RGB = [232, 223, 198];

function setPixel(x: number, y: number, c: RGB): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    }
  }
}

function rectOutline(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const n = Math.max(1, Math.ceil(steps));
  const half = Math.floor(t / 2);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (dx * i) / n;
    const y = y0 + (dy * i) / n;
    fillRect(x - half, y - half, t, t, c);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const xw = Math.floor(rx * Math.sqrt(t));
    fillRect(cx - xw, cy + y, xw * 2 + 1, 1, c);
  }
}

function circleOutline(cx: number, cy: number, r: number, t: number, c: RGB): void {
  const steps = Math.max(64, Math.floor(2 * Math.PI * r));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    for (let k = -Math.floor(t / 2); k <= Math.floor(t / 2); k++) {
      setPixel(cx + (r + k) * Math.cos(a), cy + (r + k) * Math.sin(a), c);
    }
  }
}

function fillPoly(pts: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const x = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
        xs.push(x);
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(xs[k], y, xs[k + 1] - xs[k], 1, c);
    }
  }
}

function star(cx: number, cy: number, r: number, c: RGB): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  fillPoly(pts, c);
}

// ---- 5x7 bitmap font ----
const FONT: Record<string, string[]> = {
  "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "J": ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "...#.", "..#..", ".#...", "#...."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
};

function glyph(ch: string): string[] {
  return FONT[ch] || FONT[" "];
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const g = glyph(ch);
    const w = Math.ceil(5 * scale);
    const h = Math.ceil(7 * scale);
    for (let py = 0; py < h; py++) {
      const gy = Math.min(6, Math.floor(py / scale));
      const row = g[gy];
      for (let px = 0; px < w; px++) {
        const gx = Math.min(4, Math.floor(px / scale));
        if (row[gx] === "#") setPixel(cx + px, y + py, c);
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - textWidth(s, scale) / 2, y, s, scale, c);
}

function drawCharRot(cx: number, cy: number, ch: string, scale: number, c: RGB, ang: number): void {
  const g = glyph(ch);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  for (let gy = 0; gy < 7; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      if (g[gy][gx] !== "#") continue;
      const lx = (gx - 2) * scale;
      const ly = (gy - 3) * scale;
      const rx = lx * cos - ly * sin;
      const ry = lx * sin + ly * cos;
      fillRect(cx + rx - scale / 2, cy + ry - scale / 2, scale, scale, c);
    }
  }
}

function drawTextRot(x: number, y: number, s: string, scale: number, c: RGB, ang: number): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  for (let i = 0; i < s.length; i++) {
    const ccx = x + dx * (i * 6 * scale + 2.5 * scale) + nx * 3.5 * scale;
    const ccy = y + dy * (i * 6 * scale + 2.5 * scale) + ny * 3.5 * scale;
    drawCharRot(ccx, ccy, s[i], scale, c, ang);
  }
}

function drawTextRotCentered(cx: number, cy: number, s: string, scale: number, c: RGB, ang: number): void {
  const w = textWidth(s, scale);
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const x0 = cx - dx * (w / 2) - nx * 3.5 * scale;
  const y0 = cy - dy * (w / 2) - ny * 3.5 * scale;
  drawTextRot(x0, y0, s, scale, c, ang);
}

function arcText(cx: number, cy: number, r: number, a0deg: number, a1deg: number, s: string, scale: number, c: RGB, top: boolean): void {
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = ((a0deg + (a1deg - a0deg) * t) * Math.PI) / 180;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const ang = top ? a + Math.PI / 2 : a - Math.PI / 2;
    drawCharRot(x, y, s[i], scale, c, ang);
  }
}

// ---- MRZ ----
function mrzCheck(s: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let v = 0;
    if (ch >= "0" && ch <= "9") v = ch.charCodeAt(0) - 48;
    else if (ch >= "A" && ch <= "Z") v = ch.charCodeAt(0) - 55;
    sum += v * weights[i % 3];
  }
  return String(sum % 10);
}

function buildMrz(): [string, string] {
  const line1 = "P<ALDVOSS<<MARA<ELEN" + "<".repeat(24);
  const doc = "A4829157<";
  const docC = mrzCheck(doc);
  const dob = "900614";
  const dobC = mrzCheck(dob);
  const exp = "340312";
  const expC = mrzCheck(exp);
  const opt = "<".repeat(15);
  const comp = mrzCheck(doc + docC + dob + dobC + exp + expC + opt);
  const line2 = doc + docC + "ALD" + dob + dobC + "F" + exp + expC + opt + comp;
  return [line1, line2];
}

// ---- emblem: circle, star, three lake waves ----
function drawEmblem(cx: number, cy: number): void {
  circleOutline(cx, cy, 24, 2, INK);
  circleOutline(cx, cy, 20, 1, INK);
  star(cx, cy - 8, 6, INK);
  for (let k = 0; k < 3; k++) {
    const yb = cy + 2 + k * 5;
    for (let x = cx - 15; x <= cx + 15; x++) {
      const y = yb + Math.round(2 * Math.sin(((x - (cx - 15)) / 30) * Math.PI * 2));
      setPixel(x, y, INK);
      setPixel(x, y + 1, INK);
    }
  }
}

// ---- portrait: stylised geometric face ----
function drawPortrait(x: number, y: number, w: number, h: number): void {
  const SKIN: RGB = [232, 185, 141];
  const SKIN2: RGB = [217, 163, 116];
  const HAIR: RGB = [74, 50, 38];
  const JACKET: RGB = [46, 58, 77];
  const DARK: RGB = [40, 32, 28];
  // background gradient
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    const c: RGB = [
      Math.round(205 + (179 - 205) * t),
      Math.round(217 + (194 - 217) * t),
      Math.round(224 + (208 - 224) * t),
    ];
    fillRect(x, y + yy, w, 1, c);
  }
  const cx = x + w / 2;
  // shoulders / jacket
  fillPoly(
    [
      [x + 32, y + h],
      [x + w - 32, y + h],
      [x + w - 52, y + h - 62],
      [x + 52, y + h - 62],
    ],
    JACKET
  );
  // shirt V
  fillPoly(
    [
      [cx - 13, y + h],
      [cx + 13, y + h],
      [cx, y + h - 42],
    ],
    [238, 238, 232]
  );
  // neck (overlaps chin and shoulders)
  fillRect(cx - 11, y + 118, 22, 44, SKIN2);
  // ears
  fillRect(cx - 46, y + 66, 7, 16, SKIN);
  fillRect(cx + 39, y + 66, 7, 16, SKIN);
  // hair back
  fillEllipse(cx, y + 42, 45, 37, HAIR);
  // face
  fillEllipse(cx, y + 78, 40, 48, SKIN);
  // hair cap with a wavy lower hairline
  fillPoly(
    [
      [cx - 42, y + 36],
      [cx + 42, y + 36],
      [cx + 40, y + 64],
      [cx + 22, y + 56],
      [cx, y + 62],
      [cx - 22, y + 56],
      [cx - 40, y + 64],
    ],
    HAIR
  );
  // side strands framing the face
  fillRect(cx - 44, y + 58, 7, 42, HAIR);
  fillRect(cx + 37, y + 58, 7, 42, HAIR);
  // eyebrows
  line(cx - 26, y + 66, cx - 12, y + 64, 2, DARK);
  line(cx + 12, y + 64, cx + 26, y + 66, 2, DARK);
  // eyes
  fillRect(cx - 25, y + 71, 12, 3, DARK);
  fillRect(cx + 13, y + 71, 12, 3, DARK);
  // nose
  line(cx, y + 78, cx, y + 92, 2, SKIN2);
  line(cx - 4, y + 92, cx + 4, y + 92, 2, SKIN2);
  // mouth
  line(cx - 9, y + 106, cx + 9, y + 106, 2, [138, 74, 60]);
}

// ---- left (data) page ----
function drawLeftPage(): void {
  const cx = 268;
  drawEmblem(cx, 68);
  drawTextCentered(cx, 106, "REPUBLIC OF ALDORRA", 3, INK);
  drawTextCentered(cx, 142, "PASSPORT", 4, INK);
  line(60, 182, 476, 182, 2, INK);
  line(60, 188, 476, 188, 1, INK);

  // portrait box
  rectOutline(64, 232, 174, 230, 3, INK);
  drawPortrait(67, 235, 168, 224);

  // holder fields, stacked label over value
  const fields: Array<[string, string]> = [
    ["SURNAME", "VOSS"],
    ["GIVEN NAMES", "MARA ELEN"],
    ["DATE OF BIRTH", "14 JUN 1990"],
    ["PLACE OF BIRTH", "LUMENFELD, ALDORRA"],
    ["SEX", "F"],
    ["NATIONALITY", "ALDORRAN"],
    ["DOCUMENT NO.", "A4829157"],
    ["DATE OF ISSUE", "12 MAR 2024"],
    ["DATE OF EXPIRY", "12 MAR 2034"],
    ["AUTHORITY", "MINISTRY OF THE INTERIOR"],
  ];
  let fy = 232;
  for (const f of fields) {
    drawText(258, fy, f[0], 1.5, GREY);
    const vscale = f[1].length > 20 ? 1.5 : 2;
    drawText(258, fy + 13, f[1], vscale, TEXT);
    fy += 40;
  }
  drawText(258, fy, "PASSPORT OFFICE, LUMENFELD", 1.5, GREY);

  // signature
  const sig: Array<[number, number]> = [
    [280, 700], [300, 688], [315, 700], [330, 684], [345, 698], [360, 690],
    [375, 700], [390, 686], [405, 698], [420, 690], [435, 698], [450, 692],
  ];
  for (let i = 0; i + 1 < sig.length; i++) {
    line(sig[i][0], sig[i][1], sig[i + 1][0], sig[i + 1][1], 2, TEXT);
  }
  line(258, 708, 476, 708, 1, GREY);
  drawText(258, 716, "SIGNATURE OF HOLDER", 1.5, GREY);

  // MRZ
  const mrz = buildMrz();
  fillRect(40, 752, 460, 86, MRZBG);
  rectOutline(40, 752, 460, 86, 1, INK);
  drawText(46, 766, mrz[0], 1.7, TEXT);
  drawText(46, 792, mrz[1], 1.7, TEXT);

  drawTextCentered(cx, 872, "THE HOLDER IS ENTITLED TO THE", 1.5, GREY);
  drawTextCentered(cx, 890, "PROTECTION OF THE REPUBLIC ABROAD", 1.5, GREY);
}

// ---- stamps ----
function drawCircularStamp(cx: number, cy: number, r: number, rotDeg: number, c: RGB, top: string, bottom: string, lines: string[]): void {
  const rot = (rotDeg * Math.PI) / 180;
  circleOutline(cx, cy, r, 3, c);
  circleOutline(cx, cy, r - 18, 2, c);
  arcText(cx, cy, r - 9, -140 + rotDeg, -40 + rotDeg, top, 2, c, true);
  arcText(cx, cy, r - 9, 130 + rotDeg, 50 + rotDeg, bottom, 2, c, false);
  star(cx - (r - 9) * Math.cos(0) * 0 + -(r - 9), cy, 6, c);
  star(cx + (r - 9), cy, 6, c);
  let ly = cy - 34;
  for (const s of lines) {
    drawTextRotCentered(cx, ly + 7, s, 2, c, rot);
    ly += 24;
  }
  void ly;
}

function drawVisaRect(cx: number, cy: number, w: number, h: number, rotDeg: number, c: RGB): void {
  const rot = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  function rotPt(px: number, py: number): [number, number] {
    return [cx + px * cos - py * sin, cy + px * sin + py * cos];
  }
  const hw = w / 2;
  const hh = h / 2;
  const corners: Array<[number, number]> = [
    rotPt(-hw, -hh),
    rotPt(hw, -hh),
    rotPt(hw, hh),
    rotPt(-hw, hh),
  ];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    line(a[0], a[1], b[0], b[1], 3, c);
  }
  const iw = hw - 9;
  const ih = hh - 9;
  const inner: Array<[number, number]> = [
    rotPt(-iw, -ih),
    rotPt(iw, -ih),
    rotPt(iw, ih),
    rotPt(-iw, ih),
  ];
  for (let i = 0; i < 4; i++) {
    const a = inner[i];
    const b = inner[(i + 1) % 4];
    line(a[0], a[1], b[0], b[1], 1, c);
  }
  drawTextRotCentered(cx, cy - 52, "VISA", 3, c, rot);
  drawTextRotCentered(cx, cy - 18, "BRENNA - SINGLE ENTRY", 2, c, rot);
  drawTextRotCentered(cx, cy + 8, "VALID 30 DAYS FROM 28 APR 2025", 2, c, rot);
  drawTextRotCentered(cx, cy + 34, "FEE PAID - 45 TALERS", 2, c, rot);
  drawTextRotCentered(cx, cy + 58, "No. 004821", 2, c, rot);
}

function drawRightPage(): void {
  const cx = 756;
  drawTextCentered(cx, 56, "VISAS", 3, INK);
  drawTextCentered(cx, 92, "PAGES 12-13", 1.5, GREY);
  line(560, 118, 952, 118, 2, INK);

  drawCircularStamp(655, 285, 100, -7, BLUE, "BRENNA", "ENTRY", ["14 MAY", "2025", "KESTREL GATE"]);
  drawCircularStamp(875, 320, 92, 6, RED, "OSTMAR", "EXIT", ["02 OCT", "2025", "RIVER GATE"]);

  drawVisaRect(756, 545, 400, 150, -4, BLUE);

  // telling detail box
  fillRect(556, 680, 400, 254, PAPER2);
  rectOutline(556, 680, 400, 254, 2, INK);
  drawText(576, 700, "CONDITION OF ISSUE", 2, INK);
  line(576, 726, 936, 726, 1, INK);
  const detail = [
    "THIS PASSPORT IS ALSO VALID",
    "AS A FISHING LICENCE IN THE",
    "TIDAL LAKES OF THE NORTH",
    "MARSHES.",
    "",
    "ART. 9 - LAKE CODE",
    "HOLDERS MUST CARRY A NET TAG.",
  ];
  let dy = 744;
  for (const s of detail) {
    if (s !== "") drawText(576, dy, s, 2, TEXT);
    dy += 26;
  }
}

// ---- PNG encode ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function main(): void {
  // paper + outer border + gutter
  fillRect(0, 0, W, H, PAPER);
  rectOutline(14, 14, W - 28, H - 28, 4, INK);
  rectOutline(22, 22, W - 44, H - 44, 1, INK);
  fillRect(504, 22, 16, H - 44, PAPER2);
  line(512, 22, 512, H - 22, 2, [120, 108, 84]);

  drawLeftPage();
  drawRightPage();

  const png = encodePng();
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync("/output/entry.png", png);
  const mrz = buildMrz();
  console.log("wrote /output/entry.png (" + png.length + " bytes)");
  console.log("MRZ line lengths: " + mrz[0].length + ", " + mrz[1].length);
}

main();
