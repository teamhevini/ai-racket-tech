import * as React from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import swooshUrl from "@/assets/Hevini_08_Signature.png";
import { cn } from "@/lib/utils";

/**
 * The Hevini Solution One, built to its tech pack (Verinno artwork 2026-04-28):
 * PS97 frame, 97 sq in, 27 in, 16x19, matte white, black grommets and grip,
 * HEVINI on the left outside, SOLUTION ONE (PMS 355C) on the right outside,
 * spec strip on the right inside, the Hevini mark on the throat and butt cap.
 *
 * Everything is modelled in centimetres with the butt at y = 0.
 * Drag to spin, tap the strings to pluck them; labels follow the frame.
 */

export interface HoloSpecs {
  headSize?: number | null; // sq in
  pattern?: string | null; // "16x19"
  beam?: string | null;
  balance?: string | null;
  weight?: number | null;
  stiffness?: number | null;
  tension?: { mains?: string | number | null; crosses?: string | number | null } | null;
  stringName?: string | null;
}

type Label = { id: string; title: string; value: string; anchor: Vector3 };

// ─── Tech pack dimensions (cm) ──────────────────────────────────────────────
const LENGTH = 68.6; // 27 in
const BEAM_DEPTH = 2.15; // PS97 box beam, ~21.5 mm
const BEAM_WIDTH = 1.18; // in-plane hoop width
const BEAM_RADIUS = 0.46; // soft corners, not boxy
const GRIP_TOP = 17.4;
const BUTT = 0.62;
const PMS_355C = "#009639";
const PAINT = "#f3f3f0";

function headDims(headSize: number) {
  // PS97 centreline semi-axes; scale with the square root of the head area.
  const k = Math.sqrt((headSize || 97) / 97);
  const rx = 13.15 * k;
  const ry = 17.35 * k;
  return { rx, ry, cy: LENGTH - BEAM_WIDTH / 2 - ry };
}

function parsePattern(p?: string | null) {
  const m = String(p ?? "").match(/(\d+)\s*[x×]\s*(\d+)/i);
  return m ? { mains: +m[1], crosses: +m[2] } : { mains: 16, crosses: 19 };
}

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ─── Geometry helpers ───────────────────────────────────────────────────────

type P2 = { n: number; z: number; nn: number; nz: number; t: number };

/**
 * Rounded-rectangle beam profile, sampled evenly by arc length. Starts at the
 * back centre and runs back → outer face → front → inner face, so the outer
 * face centre sits at t = .25, front .5, inner .75 (decals never cross the seam).
 */
function roundedRect(hw: number, hd: number, r: number, samples: number): { pts: P2[]; perimeter: number } {
  const segs: Array<(u: number) => { n: number; z: number; nn: number; nz: number }> = [];
  const lens: number[] = [];
  const line = (a: [number, number], b: [number, number], nrm: [number, number]) => {
    segs.push((u) => ({ n: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, nn: nrm[0], nz: nrm[1] }));
    lens.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
  };
  const arc = (c: [number, number], a0: number, a1: number) => {
    segs.push((u) => {
      const a = a0 + (a1 - a0) * u;
      return { n: c[0] + Math.cos(a) * r, z: c[1] + Math.sin(a) * r, nn: Math.cos(a), nz: Math.sin(a) };
    });
    lens.push(Math.abs(a1 - a0) * r);
  };
  const a = hw - r, b = hd - r;
  line([0, -hd], [a, -hd], [0, -1]);
  arc([a, -b], -Math.PI / 2, 0);
  line([hw, -b], [hw, b], [1, 0]);
  arc([a, b], 0, Math.PI / 2);
  line([a, hd], [-a, hd], [0, 1]);
  arc([-a, b], Math.PI / 2, Math.PI);
  line([-hw, b], [-hw, -b], [-1, 0]);
  arc([-a, -b], Math.PI, Math.PI * 1.5);
  line([-a, -hd], [0, -hd], [0, -1]);
  const total = lens.reduce((x, y) => x + y, 0);
  const pts: P2[] = [];
  for (let i = 0; i <= samples; i++) {
    let d = (i / samples) * total;
    let k = 0;
    while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
    const p = segs[k](lens[k] ? Math.min(1, d / lens[k]) : 0);
    pts.push({ ...p, t: i / samples });
  }
  return { pts, perimeter: total };
}

/** Rounded octagon (grip / butt) profile, same conventions. */
function octagon(hw: number, hd: number, cut: number, samples: number): { pts: P2[]; perimeter: number } {
  // Polygon corners, starting at back centre, going towards +n (outer) first.
  const c: Array<[number, number]> = [
    [0, -hd],
    [hw - cut, -hd],
    [hw, -hd + cut],
    [hw, hd - cut],
    [hw - cut, hd],
    [-hw + cut, hd],
    [-hw, hd - cut],
    [-hw, -hd + cut],
    [-hw + cut, -hd],
    [0, -hd],
  ];
  const lens = c.slice(1).map((p, i) => Math.hypot(p[0] - c[i][0], p[1] - c[i][1]));
  const total = lens.reduce((x, y) => x + y, 0);
  const pts: P2[] = [];
  for (let i = 0; i <= samples; i++) {
    let d = (i / samples) * total;
    let k = 0;
    while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
    const u = lens[k] ? Math.min(1, d / lens[k]) : 0;
    const p0 = c[k], p1 = c[k + 1];
    const n = p0[0] + (p1[0] - p0[0]) * u, z = p0[1] + (p1[1] - p0[1]) * u;
    // Smooth normals (radial blend) keep the facets soft like a real handle.
    const l = Math.hypot(n / hw, z / hd) || 1;
    pts.push({ n, z, nn: n / hw / l, nz: z / hd / l, t: i / samples });
  }
  return { pts, perimeter: total };
}

/**
 * Sweep a profile along a curve lying in the XY plane. `outward(p)` gives the
 * in-plane direction the profile's +n should face. UV: u = arc length (cm),
 * v = profile position 0..1.
 */
function sweep(
  curve: CatmullRomCurve3,
  profileAt: (f: number) => P2[],
  rings: number,
  outward: (p: Vector3) => Vector2,
): { geo: BufferGeometry; length: number } {
  const length = curve.getLength();
  const first = profileAt(0);
  const K = first.length;
  const pos = new Float32Array((rings + 1) * K * 3);
  const nor = new Float32Array((rings + 1) * K * 3);
  const uv = new Float32Array((rings + 1) * K * 2);
  const P = new Vector3();
  const T = new Vector3();
  for (let i = 0; i <= rings; i++) {
    const f = i / rings;
    curve.getPointAt(f, P);
    curve.getTangentAt(f, T);
    let nx = T.y, ny = -T.x;
    const o = outward(P);
    if (nx * o.x + ny * o.y < 0) {
      nx = -nx;
      ny = -ny;
    }
    const prof = i === 0 ? first : profileAt(f);
    for (let k = 0; k < K; k++) {
      const p = prof[k];
      const j = i * K + k;
      pos[j * 3] = P.x + nx * p.n;
      pos[j * 3 + 1] = P.y + ny * p.n;
      pos[j * 3 + 2] = p.z;
      nor[j * 3] = nx * p.nn;
      nor[j * 3 + 1] = ny * p.nn;
      nor[j * 3 + 2] = p.nz;
      uv[j * 2] = f * length;
      uv[j * 2 + 1] = p.t;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings; i++) {
    for (let k = 0; k < K - 1; k++) {
      const a = i * K + k, b = (i + 1) * K + k;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("normal", new BufferAttribute(nor, 3));
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return { geo, length };
}

/** Normalise sweep UVs (cm) into 0..1 for a texture `lengthCm` long. */
function normaliseU(geo: BufferGeometry, lengthCm: number) {
  const uv = geo.getAttribute("uv") as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) / lengthCm);
  uv.needsUpdate = true;
}

// ─── Artwork (canvas textures) ──────────────────────────────────────────────

/** The HEVINI wordmark from the tech pack, drawn with geometric strokes. Height 1 unit. */
function drawWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color: string) {
  const w = h * 0.2; // stroke weight
  ctx.fillStyle = color;
  const R = (rx: number, ry: number, rw: number, rh: number) => ctx.fillRect(x + rx * h, y + ry * h, rw * h, rh * h);
  let cx = 0;
  const gap = 0.32;
  const sw = w / h;
  // H
  R(cx, 0, sw, 1); R(cx + 0.78 - sw, 0, sw, 1); R(cx, 0.5 - sw / 2, 0.78, sw);
  cx += 0.78 + gap;
  // E with a floating square for the middle bar
  R(cx, 0, sw, 1); R(cx, 0, 0.7, sw); R(cx, 1 - sw, 0.7, sw); R(cx + 0.33, 0.5 - sw / 2, sw * 1.05, sw);
  cx += 0.7 + gap;
  // V (two strokes meeting at the base)
  ctx.beginPath();
  ctx.moveTo(x + cx * h, y);
  ctx.lineTo(x + (cx + sw * 1.15) * h, y);
  ctx.lineTo(x + (cx + 0.42) * h, y + (1 - sw * 1.6) * h);
  ctx.lineTo(x + (cx + 0.84 - sw * 1.15) * h, y);
  ctx.lineTo(x + (cx + 0.84) * h, y);
  ctx.lineTo(x + (cx + 0.42 + sw * 0.5) * h, y + h);
  ctx.lineTo(x + (cx + 0.42 - sw * 0.5) * h, y + h);
  ctx.closePath();
  ctx.fill();
  cx += 0.84 + gap;
  // I
  R(cx, 0, sw, 1);
  cx += sw + gap;
  // N
  R(cx, 0, sw, 1); R(cx + 0.78 - sw, 0, sw, 1);
  ctx.beginPath();
  ctx.moveTo(x + cx * h, y);
  ctx.lineTo(x + (cx + sw * 1.3) * h, y);
  ctx.lineTo(x + (cx + 0.78) * h, y + h);
  ctx.lineTo(x + (cx + 0.78 - sw * 1.3) * h, y + h);
  ctx.closePath();
  ctx.fill();
  cx += 0.78 + gap;
  // I
  R(cx, 0, sw, 1);
  cx += sw;
  return cx * h; // drawn width
}

const wordmarkWidth = (h: number) => (0.78 + 0.32 + 0.7 + 0.32 + 0.84 + 0.32 + 0.2 + 0.32 + 0.78 + 0.32 + 0.2) * h;

/** The Hevini mark: a ring with the swoosh inside. */
function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ink: string, swoosh: HTMLImageElement | null) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = r * 0.11;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  if (swoosh?.complete && swoosh.naturalWidth) {
    // Tint the swoosh to the ink colour through an offscreen canvas.
    const s = r * 1.9;
    const off = document.createElement("canvas");
    off.width = off.height = 256;
    const o = off.getContext("2d")!;
    o.drawImage(swoosh, 0, 0, 256, 256);
    o.globalCompositeOperation = "source-in";
    o.fillStyle = ink;
    o.fillRect(0, 0, 256, 256);
    ctx.drawImage(off, cx - s / 2, cy - s / 2, s, s);
  } else {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.62, r * 0.28, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

interface FrameLayout {
  length: number;
  perimeter: number;
  armLen: number; // left arm runs s ∈ [0, armLen], right arm s ∈ [length - armLen, length]
  hoopStart: number;
  hoopEnd: number;
}

/** Paint, bumper, grommet holes and the three side decals, laid out in centimetres. */
function frameTexture(L: FrameLayout, swoosh: HTMLImageElement | null) {
  const pxU = Math.min(30, 4096 / L.length);
  const W = Math.ceil(L.length * pxU);
  const H = 512;
  const pxV = H / L.perimeter;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // Work in cm: x = along the frame, y = around the beam (0 = back centre).
  ctx.setTransform(pxU, 0, 0, pxV, 0, 0);
  const P = L.perimeter;
  const outer = P * 0.25, front = P * 0.5, inner = P * 0.75;
  const faceH = BEAM_DEPTH - BEAM_RADIUS * 2 + 0.5; // usable height of a side face

  // Black bumper guard over the top of the head (both sides + the crown).
  const mid = (L.hoopStart + L.hoopEnd) / 2;
  const bumperHalf = 15;
  ctx.fillStyle = "#1b1b1b";
  ctx.fillRect(mid - bumperHalf, outer - faceH * 0.75, bumperHalf * 2, faceH * 1.5);
  // Black grommet strip along the outer face, with the string holes.
  ctx.fillStyle = "#242424";
  ctx.fillRect(L.hoopStart + 1, outer - 0.17, mid - bumperHalf - L.hoopStart - 1, 0.34);
  ctx.fillRect(mid + bumperHalf, outer - 0.17, L.hoopEnd - 1 - (mid + bumperHalf), 0.34);
  for (let s = L.hoopStart + 1.2; s < L.hoopEnd - 1.2; s += 1.42) {
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.ellipse(s, outer, 0.2, 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Matching holes on the inner face where the strings enter.
    ctx.fillStyle = "#8a8a86";
    ctx.beginPath();
    ctx.ellipse(s, inner, 0.11, 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Decals read head → grip (top to bottom) on every side, as on the tech pack.
  // The beam runs left arm (upwards) → hoop → right arm (downwards), so left-side artwork is turned 180°.

  // Left outside: HEVINI, filling the beam depth.
  const hevH = 1.5;
  const hevW = wordmarkWidth(hevH);
  ctx.save();
  ctx.translate(L.armLen * 0.55, outer);
  ctx.scale(-1, -1);
  drawWordmark(ctx, -hevW / 2, -hevH / 2, hevH, "#111111");
  ctx.restore();

  // Right outside: SOLUTION in PMS 355C, ONE drawn in outline (lighter), as on the artwork.
  ctx.save();
  ctx.translate(L.length - L.armLen * 0.55, outer);
  ctx.font = "700 0.82px 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
  ctx.textBaseline = "middle";
  const spacing = 0.12;
  const word = (t: string) => [...t].reduce((a, ch) => a + ctx.measureText(ch).width + spacing, 0) - spacing;
  const total = word("SOLUTION") + 0.55 + word("ONE");
  let x = -total / 2;
  ctx.fillStyle = PMS_355C;
  for (const ch of "SOLUTION") {
    ctx.fillText(ch, x, 0.04);
    x += ctx.measureText(ch).width + spacing;
  }
  x += 0.55 - spacing;
  ctx.strokeStyle = PMS_355C;
  ctx.lineWidth = 0.07;
  for (const ch of "ONE") {
    ctx.strokeText(ch, x, 0.04);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.restore();

  // Right inside: the spec strip (7.6 x 1 cm), two lines, then MADE IN CHINA.
  ctx.save();
  ctx.translate(L.length - L.armLen * 0.5, inner);
  ctx.fillStyle = "#2a2a2a";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "500 0.3px 'Helvetica Neue', Arial, sans-serif";
  const cols = [["97 SQ IN", "625.8 CM²"], ["10.6 OZ", "300 G"], ["6 PTS HL", "32.5 CM"], ["50-60 LB", "23-27 KG"], ["16x19", ""]];
  let cx = -3.8;
  for (const [a, b] of cols) {
    ctx.fillText(a, cx, -0.24);
    if (b) ctx.fillText(b, cx, 0.24);
    cx += 1.45;
  }
  ctx.font = "500 0.14px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("MADE IN CHINA", cx + 0.1, 0);
  ctx.restore();

  // Front view: HEVINI also runs up the front of the left throat arm.
  const frontH = 0.78;
  ctx.save();
  ctx.translate(L.armLen * 0.5, front);
  ctx.scale(-1, -1);
  drawWordmark(ctx, -wordmarkWidth(frontH) / 2, -frontH / 2, frontH, "#111111");
  ctx.restore();
  void swoosh;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 8;
  tex.minFilter = LinearMipmapLinearFilter;
  return tex;
}

/** Black grip with the diagonal overgrip wrap (period ~2.6 cm). */
function gripTexture(lengthCm: number, perimeter: number) {
  const W = 1024, H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(W / lengthCm, 0, 0, H / perimeter, 0, 0);
  const period = 2.6;
  const slope = 0.55; // wrap angle
  for (let s = -perimeter * 2; s < lengthCm + perimeter * 2; s += period) {
    // Overlap edge: a dark seam with a slightly lighter ridge beside it.
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(s + perimeter * slope, perimeter);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(s + 0.16, 0);
    ctx.lineTo(s + 0.16 + perimeter * slope, perimeter);
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 8;
  return tex;
}

function markTexture(swoosh: HTMLImageElement | null, opts: { bg?: string; ink: string; octagon?: boolean }) {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  if (opts.octagon) {
    // Butt cap: white octagon with a black rim, mark in the middle (tech pack inset).
    const r = S * 0.47;
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, S, S);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      ctx.lineTo(S / 2 + Math.cos(a) * r * 0.86, S / 2 + Math.sin(a) * r * 0.86);
    }
    ctx.closePath();
    ctx.fillStyle = opts.bg ?? "#f3f3f0";
    ctx.fill();
  }
  drawMark(ctx, S / 2, S / 2, S * (opts.octagon ? 0.3 : 0.46), opts.ink, swoosh);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HoloRacket({ specs, className, compact }: { specs: HoloSpecs; className?: string; compact?: boolean }) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const labelRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const lineRef = React.useRef<SVGSVGElement>(null);
  const [ok, setOk] = React.useState(true);
  const [hint, setHint] = React.useState(true);
  const [active, setActive] = React.useState<string | null>(null);
  const [narrow] = React.useState(() => typeof window !== "undefined" && window.innerWidth < 640);

  const headSize = specs.headSize ?? 97;
  const pat = parsePattern(specs.pattern);
  const { rx, ry, cy } = headDims(headSize);

  const labels: Label[] = React.useMemo(() => {
    const t = specs.tension;
    const tension = t?.mains ? (t.crosses && String(t.crosses) !== String(t.mains) ? `${t.mains}/${t.crosses} lbs` : `${t.mains} lbs`) : null;
    const out: Label[] = [
      { id: "head", title: "Head size", value: `${headSize} sq in`, anchor: new Vector3(rx * 0.71, cy + ry * 0.71, 0) },
      { id: "pattern", title: "String pattern", value: `${pat.mains}×${pat.crosses}`, anchor: new Vector3(-rx * 0.35, cy + ry * 0.3, 0) },
    ];
    if (tension) out.push({ id: "tension", title: "Tension", value: tension, anchor: new Vector3(rx * 0.3, cy - ry * 0.2, 0) });
    if (specs.stringName) out.push({ id: "string", title: "String", value: specs.stringName, anchor: new Vector3(-rx * 0.25, cy - ry * 0.55, 0) });
    if (specs.beam) out.push({ id: "beam", title: "Beam", value: specs.beam, anchor: new Vector3(-rx, cy, 0) });
    if (specs.balance) out.push({ id: "balance", title: "Balance", value: specs.balance, anchor: new Vector3(0, 32.5, 0) });
    if (specs.weight) out.push({ id: "weight", title: "Weight", value: `${specs.weight} g`, anchor: new Vector3(0, 9, 1.5) });
    if (specs.stiffness) out.push({ id: "ra", title: "Stiffness", value: `${specs.stiffness} RA`, anchor: new Vector3(rx * 0.55, cy - ry * 0.85, 0) });
    return compact || narrow ? out.slice(0, 4) : out;
  }, [specs, headSize, pat.mains, pat.crosses, rx, ry, cy, compact, narrow]);

  React.useEffect(() => {
    if (!webglOK()) {
      setOk(false);
      return;
    }
    const el = wrap.current!;
    const canvas = canvasRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLight = () => document.documentElement.dataset.theme !== "dark";

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLight() ? 1.0 : 1.08;
    renderer.outputColorSpace = SRGBColorSpace;

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.75;
    const key = new DirectionalLight(0xffffff, 2.1);
    key.position.set(-70, 110, 90);
    scene.add(key);
    const rim = new DirectionalLight(0xdfe8ff, 1.1);
    rim.position.set(90, 10, -60);
    scene.add(rim);
    scene.add(new AmbientLight(0xffffff, 0.08));

    const camera = new PerspectiveCamera(26, 1, 10, 600);
    camera.position.set(0, 0, 168);

    // Pivot at the racket's middle; geometry is built with the butt at y = 0.
    const racket = new Group();
    const body = new Group();
    body.position.y = -LENGTH / 2;
    racket.add(body);
    scene.add(racket);
    const disposables: Array<{ dispose: () => void }> = [envTex, pmrem];

    // ── Frame: left arm → hoop over the top → right arm, one continuous beam.
    const hoop = (deg: number) => {
      const a = (deg * Math.PI) / 180;
      return new Vector3(Math.sin(a) * rx, cy + Math.cos(a) * ry, 0);
    };
    const JOIN = 146; // where the throat arms leave the hoop
    const armPts = (side: -1 | 1) => {
      const top = hoop(side * JOIN);
      const bottom = new Vector3(side * 0.85, GRIP_TOP + 0.4, 0);
      const pts: Vector3[] = [];
      for (const f of [0, 0.18, 0.42, 0.68, 0.88]) {
        // Gently concave arms, as on the tech pack front view.
        const bow = Math.sin(f * Math.PI) * 0.35 * -side;
        pts.push(new Vector3(bottom.x + (top.x - bottom.x) * f + bow, bottom.y + (top.y - bottom.y) * f, 0));
      }
      return pts;
    };
    const framePts: Vector3[] = [...armPts(-1)];
    for (let d = -JOIN; d <= JOIN; d += 4) framePts.push(hoop(d));
    framePts.push(...armPts(1).reverse());
    const frameCurve = new CatmullRomCurve3(framePts, false, "centripetal");
    const beam = roundedRect(BEAM_WIDTH / 2, BEAM_DEPTH / 2, BEAM_RADIUS, 36);
    const outwardFrame = (p: Vector3) => new Vector2(p.x, p.y - 30).normalize();
    const frame = sweep(frameCurve, () => beam.pts, 420, outwardFrame);
    // Where the hoop starts/ends along the beam, for the artwork layout.
    const armLen = new CatmullRomCurve3(armPts(-1).concat([hoop(-JOIN + 4)]), false, "centripetal").getLength() - 1.2;
    const layout: FrameLayout = {
      length: frame.length,
      perimeter: beam.perimeter,
      armLen,
      hoopStart: armLen,
      hoopEnd: frame.length - armLen,
    };
    normaliseU(frame.geo, frame.length);
    const paint = new MeshPhysicalMaterial({
      color: PAINT,
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
      sheen: 0.15,
      sheenRoughness: 0.8,
    });
    const frameMesh = new Mesh(frame.geo, paint);
    body.add(frameMesh);

    // Throat bridge: the lower arc of the head, closing the string bed.
    const bridgeCurve = new CatmullRomCurve3(
      [153, 164, 175, 185, 196, 207].map((d) => hoop(d)),
      false,
      "centripetal",
    );
    const bridgeBeam = roundedRect(BEAM_WIDTH / 2, BEAM_DEPTH / 2 - 0.08, BEAM_RADIUS, 28);
    const bridge = sweep(bridgeCurve, () => bridgeBeam.pts, 60, (p) => new Vector2(p.x * 0.02, p.y - cy).normalize());
    const bridgeMat = new MeshPhysicalMaterial({ color: PAINT, roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.55 });
    body.add(new Mesh(bridge.geo, bridgeMat));

    // Shaft collar: the white neck where the arms meet the handle.
    const collarTop = GRIP_TOP + 3.4;
    const collarCurve = new CatmullRomCurve3([new Vector3(0, GRIP_TOP - 0.2, 0), new Vector3(0, collarTop, 0)]);
    const collar = sweep(
      collarCurve,
      (f) => {
        const e = f * f * (3 - 2 * f);
        return roundedRect(1.6 - 0.42 * e, 1.48 - 0.36 * e, 0.62 - 0.1 * e, 32).pts;
      },
      24,
      () => new Vector2(1, 0),
    );
    body.add(new Mesh(collar.geo, bridgeMat));

    // Throat web: the arms close into a solid, rounded V above the collar (tech pack front view).
    // Its edges run along the arms' inner faces (overlapping slightly), so it merges with no seam.
    const armInner: Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const p = frameCurve.getPointAt((i / 120) * (armLen / frame.length) * 1.2);
      if (p.y <= 25.6) armInner.push(p);
    }
    const yBottom = collarTop - 0.8;
    const yTop = 25.2; // where the web meets the arms
    const yVertex = 22.4; // bottom of the throat opening
    const innerX = (y: number) => {
      // Arm centreline |x| at height y (left arm sampled; symmetric), minus most of the beam width.
      let best = armInner[0];
      for (const p of armInner) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
      return Math.abs(best.x) - BEAM_WIDTH / 2 + 0.22;
    };
    const web = new Shape();
    web.moveTo(-innerX(yBottom) - 0.3, yBottom);
    web.lineTo(innerX(yBottom) + 0.3, yBottom);
    for (let y = yBottom + 0.4; y <= yTop; y += 0.4) web.lineTo(innerX(y), y);
    web.quadraticCurveTo(innerX(yTop) * 0.35, yVertex + 0.15, 0, yVertex);
    web.quadraticCurveTo(-innerX(yTop) * 0.35, yVertex + 0.15, -innerX(yTop), yTop);
    for (let y = yTop - 0.4; y >= yBottom + 0.4; y -= 0.4) web.lineTo(-innerX(y), y);
    web.closePath();
    const bev = 0.42;
    const webGeo = new ExtrudeGeometry(web, { depth: BEAM_DEPTH - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: 0.05, bevelSegments: 4, curveSegments: 20 });
    webGeo.translate(0, 0, -(BEAM_DEPTH - bev * 2) / 2);
    body.add(new Mesh(webGeo, bridgeMat));

    // Grip with the diagonal overgrip.
    const gripCurve = new CatmullRomCurve3([new Vector3(0, BUTT, 0), new Vector3(0, GRIP_TOP, 0)]);
    const gripProf = octagon(1.62, 1.5, 0.52, 48);
    const grip = sweep(gripCurve, () => gripProf.pts, 40, () => new Vector2(1, 0));
    normaliseU(grip.geo, grip.length);
    const gripTex = gripTexture(grip.length, gripProf.perimeter);
    const gripMat = new MeshStandardMaterial({ color: "#ffffff", map: gripTex, bumpMap: gripTex, bumpScale: 1.2, roughness: 0.86 });
    body.add(new Mesh(grip.geo, gripMat));
    // Finishing tape at the top of the grip.
    const tapeCurve = new CatmullRomCurve3([new Vector3(0, GRIP_TOP - 1.1, 0), new Vector3(0, GRIP_TOP + 0.05, 0)]);
    const tape = sweep(tapeCurve, () => octagon(1.66, 1.54, 0.54, 48).pts, 4, () => new Vector2(1, 0));
    const tapeMat = new MeshStandardMaterial({ color: "#101010", roughness: 0.35 });
    body.add(new Mesh(tape.geo, tapeMat));

    // Octagonal butt cap with the mark on its end.
    const capMat = new MeshStandardMaterial({ color: "#141414", roughness: 0.55 });
    const cap = new Mesh(new CylinderGeometry(1.9, 1.84, BUTT, 8, 1), capMat);
    cap.rotation.y = Math.PI / 8;
    cap.position.y = BUTT / 2;
    body.add(cap);

    // Strings: 16x19 (or the player's pattern), woven over/under.
    const rxIn = rx - BEAM_WIDTH / 2 + 0.05;
    const ryIn = ry - BEAM_WIDTH / 2 + 0.05;
    const R = 0.072; // 1.30 mm gauge (drawn a hair thick so it reads at hero size)
    const weave = 0.075;
    const mainsX = Array.from({ length: pat.mains }, (_, i) => -rxIn * 0.87 + (i / (pat.mains - 1)) * rxIn * 1.74);
    const crossY = Array.from({ length: pat.crosses }, (_, j) => cy - ryIn * 0.89 + (j / (pat.crosses - 1)) * ryIn * 1.8);
    const halfH = (x: number) => ryIn * Math.sqrt(Math.max(0, 1 - (x / rxIn) ** 2));
    const halfW = (y: number) => rxIn * Math.sqrt(Math.max(0, 1 - ((y - cy) / ryIn) ** 2));
    const stringGeos: BufferGeometry[] = [];
    mainsX.forEach((x, i) => {
      const h = halfH(x) + 0.3;
      const pts = [new Vector3(x, cy - h, 0)];
      crossY.forEach((y, j) => {
        if (Math.abs(y - cy) < h - 0.4) pts.push(new Vector3(x, y, (i + j) % 2 ? weave : -weave));
      });
      pts.push(new Vector3(x, cy + h, 0));
      stringGeos.push(new TubeGeometry(new CatmullRomCurve3(pts), pts.length * 3, R, 5, false));
    });
    crossY.forEach((y, j) => {
      const w = halfW(y) + 0.3;
      const pts = [new Vector3(-w, y, 0)];
      mainsX.forEach((x, i) => {
        if (Math.abs(x) < w - 0.4) pts.push(new Vector3(x, y, (i + j) % 2 ? -weave : weave));
      });
      pts.push(new Vector3(w, y, 0));
      stringGeos.push(new TubeGeometry(new CatmullRomCurve3(pts), pts.length * 3, R, 5, false));
    });
    const stringGeo = mergeGeometries(stringGeos)!;
    stringGeos.forEach((g) => g.dispose());
    const pluckU = { uP: { value: new Vector2(0, cy) }, uT: { value: 0 }, uA: { value: 0 } };
    const stringMat = new MeshStandardMaterial({ color: "#d9d6cb", roughness: 0.32, metalness: 0 });
    stringMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, pluckU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform vec2 uP; uniform float uT; uniform float uA;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float dd = distance(position.xy, uP);
           transformed.z += uA * exp(-uT * 3.2) * sin(uT * 42.0 - dd * 1.1) * exp(-dd * 0.11);`,
        );
    };
    body.add(new Mesh(stringGeo, stringMat));

    // Invisible string bed for tap detection.
    const bedShape = new Shape();
    bedShape.absellipse(0, cy, rxIn, ryIn, 0, Math.PI * 2, false, 0);
    const bed = new Mesh(new ShapeGeometry(bedShape, 48), new MeshBasicMaterial({ visible: false, side: DoubleSide }));
    body.add(bed);

    // Artwork: frame decals, throat mark, butt cap. Repainted once the logo image loads.
    let frameTex = frameTexture(layout, null);
    paint.map = frameTex;
    const throatMat = new MeshStandardMaterial({ transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
    const buttMat = new MeshStandardMaterial({ roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });
    const throatMark = new Mesh(new CircleGeometry(0.62, 40), throatMat);
    throatMark.position.set(0, GRIP_TOP + 1.55, 1.48 - 0.36 * 0.42 + 0.02);
    body.add(throatMark);
    const buttMark = new Mesh(new CircleGeometry(1.72, 8), buttMat);
    buttMark.rotation.set(Math.PI / 2, 0, Math.PI / 8);
    buttMark.position.y = -0.005;
    body.add(buttMark);
    const paintMarks = (img: HTMLImageElement | null) => {
      throatMat.map?.dispose();
      buttMat.map?.dispose();
      throatMat.map = markTexture(img, { ink: "#111111" });
      buttMat.map = markTexture(img, { ink: "#111111", octagon: true });
      throatMat.needsUpdate = buttMat.needsUpdate = true;
    };
    paintMarks(null);
    const swoosh = new Image();
    swoosh.decoding = "async";
    swoosh.onload = () => {
      frameTex.dispose();
      frameTex = frameTexture(layout, swoosh);
      paint.map = frameTex;
      paint.needsUpdate = true;
      paintMarks(swoosh);
    };
    swoosh.src = swooshUrl;

    disposables.push(paint, bridgeMat, gripMat, gripTex, tapeMat, capMat, stringMat, throatMat, buttMat, { dispose: () => frameTex.dispose() });

    // ── Interaction
    // ?racketView=front|left|right|back|top pins a tech-pack angle (used to check the model against the artwork).
    const VIEWS: Record<string, [number, number]> = { front: [0, 0], left: [Math.PI / 2, 0], right: [-Math.PI / 2, 0], back: [Math.PI, 0], top: [0, Math.PI / 2] };
    const pinned = VIEWS[new URLSearchParams(window.location.search).get("racketView") ?? ""];
    let yaw = pinned ? pinned[0] : -0.42, pitch = pinned ? pinned[1] : 0.1, vYaw = reduce || pinned ? 0 : 0.004, vPitch = 0;
    let dragging = false, moved = 0, lx = 0, ly = 0, idle = 0, time = 0;
    let plucking = false;
    const ray = new Raycaster();
    const ndc = new Vector2();

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Fit the whole racket (68.6 cm tall, ~28 cm wide) with a little air.
      const fitH = (LENGTH * 1.12) / 2 / Math.tan((camera.fov * Math.PI) / 360);
      const fitW = (34 / camera.aspect) / Math.tan((camera.fov * Math.PI) / 360);
      camera.position.z = Math.max(fitH, fitW);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const down = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      setHint(false);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      vYaw = dx * 0.007;
      vPitch = dy * 0.004;
      yaw += vYaw;
      pitch = Math.max(-0.6, Math.min(0.6, pitch + vPitch));
      idle = 0;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (moved < 6) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObject(bed)[0];
        if (hit) {
          const p = body.worldToLocal(hit.point.clone());
          pluckU.uP.value.set(p.x, p.y);
          pluckU.uT.value = 0;
          pluckU.uA.value = 0.55;
          plucking = true;
          navigator.vibrate?.(12);
        }
      }
    };
    const cancel = () => (dragging = false);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const themeObs = new MutationObserver(() => {
      renderer.toneMappingExposure = isLight() ? 1.0 : 1.08;
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const v = new Vector3();
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      if (pinned && !dragging && moved === 0) {
        racket.rotation.set(pitch, yaw, 0);
      } else if (!dragging) {
        idle += dt;
        yaw += vYaw;
        vYaw *= 0.95;
        vPitch *= 0.9;
        if (!reduce && Math.abs(vYaw) < 0.003 && idle > 1.2) yaw += 0.003; // slow showroom turn
        if (!reduce) pitch += (0.1 + Math.sin(time * 0.6) * 0.04 - pitch) * 0.02;
      }
      if (!pinned || moved > 0) {
        racket.rotation.set(pitch, yaw, Math.sin(time * 0.5) * (reduce ? 0 : 0.03));
        racket.position.y = reduce ? 0 : Math.sin(time * 1.1) * 0.9;
      }

      if (plucking) {
        pluckU.uT.value += dt;
        if (pluckU.uT.value > 1.8) {
          pluckU.uA.value = 0;
          plucking = false;
        }
      }

      renderer.render(scene, camera);

      // Labels: project anchors, stack per side, draw leader lines.
      body.updateMatrixWorld();
      const W = el.clientWidth, H = el.clientHeight;
      const pts = labels.map((l) => {
        v.copy(l.anchor).applyMatrix4(body.matrixWorld).project(camera);
        return { l, x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
      });
      const sides: Record<"L" | "R", typeof pts> = { L: [], R: [] };
      for (const p of pts) (p.x < W / 2 ? sides.L : sides.R).push(p);
      const svg = lineRef.current;
      let d = "";
      for (const side of ["L", "R"] as const) {
        const list = sides[side].sort((a, b) => a.y - b.y);
        let prev = -Infinity;
        for (const p of list) {
          const ly2 = Math.max(prev + 46, Math.min(H - 30, Math.max(24, p.y)));
          prev = ly2;
          const node = labelRefs.current[p.l.id];
          const lx2 = side === "L" ? 8 : W - 8;
          if (node) {
            node.style.transform = `translate(${side === "L" ? lx2 : lx2 - node.offsetWidth}px, ${ly2 - 18}px)`;
            node.style.opacity = "1";
          }
          const ex = side === "L" ? lx2 + (node?.offsetWidth ?? 100) : lx2 - (node?.offsetWidth ?? 100);
          d += `M${ex},${ly2} L${(ex + p.x) / 2},${ly2} L${p.x},${p.y} `;
        }
      }
      if (svg) {
        const path = svg.firstElementChild as SVGPathElement | null;
        path?.setAttribute("d", d);
        const dots = svg.querySelectorAll("circle");
        pts.forEach((p, i) => {
          dots[i]?.setAttribute("cx", String(p.x));
          dots[i]?.setAttribute("cy", String(p.y));
        });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObs.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      swoosh.onload = null;
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
      });
      throatMat.map?.dispose();
      buttMat.map?.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [labels, rx, ry, cy, pat.mains, pat.crosses]);

  if (!ok) {
    return (
      <div className={cn("grid place-items-center rounded-3xl bg-surface-2/50 p-6 text-center", className)}>
        <dl className="grid grid-cols-2 gap-3 text-left">
          {labels.map((l) => (
            <div key={l.id}>
              <dt className="text-xs text-muted">{l.title}</dt>
              <dd className="font-mono font-semibold">{l.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div ref={wrap} className={cn("relative select-none", className)}>
      {/* Soft studio backdrop and a contact shadow, so the white frame reads on light and dark pages. */}
      <div aria-hidden className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgb(var(--ink)/0.07),transparent)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-[3%] left-1/2 h-5 w-1/4 -translate-x-1/2 rounded-full bg-black/25 blur-xl" />
      <canvas ref={canvasRef} className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" aria-label="3D Hevini Solution One racket. Drag to spin, tap the strings." role="img" />
      <svg ref={lineRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path fill="none" stroke="rgb(var(--ink) / 0.35)" strokeWidth={1} strokeDasharray="3 3" />
        {labels.map((l) => (
          <circle key={l.id} r={active === l.id ? 5 : 3} fill="rgb(var(--brand))" />
        ))}
      </svg>
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(n) => (labelRefs.current[l.id] = n)}
          onPointerEnter={() => setActive(l.id)}
          onPointerLeave={() => setActive(null)}
          className="absolute left-0 top-0 max-w-[9.5rem] rounded-xl border border-line/70 bg-surface/80 px-2.5 py-1.5 opacity-0 shadow-card backdrop-blur-md transition-opacity duration-500"
        >
          <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted">{l.title}</p>
          <p className="truncate font-mono text-xs font-semibold text-ink">{l.value}</p>
        </div>
      ))}
      {hint && (
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/80 px-3 py-1 text-[0.6875rem] font-medium text-bg">
          Drag to spin · tap the strings
        </p>
      )}
      <ul className="sr-only">
        {labels.map((l) => (
          <li key={l.id}>
            {l.title}: {l.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

