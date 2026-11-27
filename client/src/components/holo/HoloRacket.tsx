import * as React from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineSegments,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShapeGeometry,
  Shape,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  MeshBasicMaterial,
} from "three";
import { cn } from "@/lib/utils";

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

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){
    vec4 wp = modelMatrix * vec4(position,1.0);
    vY = wp.y;
    vN = normalize(normalMatrix * normal);
    vec4 mv = viewMatrix * wp;
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */ `
  uniform float uTime; uniform float uLight; uniform float uPulse;
  varying vec3 vN; varying vec3 vV; varying float vY;
  vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
  void main(){
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
    vec3 iri = hue(fract(f*0.6 + vY*0.18 + uTime*0.05));
    vec3 base = mix(vec3(0.84,0.94,0.29), vec3(0.2,0.85,1.0), 0.35 + 0.3*sin(uTime*0.4 + vY));
    vec3 col = mix(base, iri, 0.45) * (0.55 + f*1.4);
    float scan = 0.82 + 0.18*sin(vY*90.0 - uTime*3.0);
    col *= scan; col += uPulse*0.35;
    float a = (0.38 + f*0.62) * (uLight > 0.5 ? 0.95 : 0.85);
    if (uLight > 0.5) {
      // Day mode: deeper, saturated iridescence so it reads on a light page.
      vec3 deep = hue(fract(f*0.8 + vY*0.22 + uTime*0.06)) * 0.75;
      col = mix(vec3(0.02,0.42,0.48), deep, 0.55 + 0.35*f) * scan + uPulse*0.25;
    }
    gl_FragColor = vec4(col, a);
  }`;
const LINE_VERT = /* glsl */ `
  varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const LINE_FRAG = /* glsl */ `
  uniform float uTime; uniform float uLight; varying float vY;
  void main(){ vec3 c = mix(vec3(0.84,0.94,0.29), vec3(0.4,0.9,1.0), 0.5+0.5*sin(vY*3.0+uTime));
    if (uLight > 0.5) c = mix(vec3(0.0,0.4,0.45), vec3(0.35,0.2,0.75), 0.5+0.5*sin(vY*3.0+uTime)); gl_FragColor = vec4(c, uLight > 0.5 ? 0.85 : 0.7); }`;

function headDims(headSize: number) {
  // 100 sq in ≈ rx .52, ry .68 (scene units). Scale by sqrt of area.
  const k = Math.sqrt((headSize || 100) / 100);
  return { rx: 0.52 * k, ry: 0.68 * k };
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

/**
 * A holographic racket you can spin, with live spec labels. Drag to rotate,
 * tap the strings to pluck them. Pure three.js, no extra libraries.
 */
export default function HoloRacket({ specs, className, compact }: { specs: HoloSpecs; className?: string; compact?: boolean }) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const labelRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const lineRef = React.useRef<SVGSVGElement>(null);
  const [ok, setOk] = React.useState(true);
  const [hint, setHint] = React.useState(true);
  const [active, setActive] = React.useState<string | null>(null);
  const [narrow] = React.useState(() => typeof window !== "undefined" && window.innerWidth < 640);

  const headSize = specs.headSize ?? 100;
  const pat = parsePattern(specs.pattern);
  const { rx, ry } = headDims(headSize);
  const cy = 0.55; // head centre y

  const labels: Label[] = React.useMemo(() => {
    const t = specs.tension;
    const tension = t?.mains ? (t.crosses && String(t.crosses) !== String(t.mains) ? `${t.mains}/${t.crosses} lbs` : `${t.mains} lbs`) : null;
    const out: Label[] = [
      { id: "head", title: "Head size", value: `${headSize} sq in`, anchor: new Vector3(rx * 0.72, cy + ry * 0.7, 0) },
      { id: "pattern", title: "String pattern", value: `${pat.mains}×${pat.crosses}`, anchor: new Vector3(-rx * 0.35, cy + ry * 0.25, 0) },
    ];
    if (tension) out.push({ id: "tension", title: "Tension", value: tension, anchor: new Vector3(rx * 0.25, cy - ry * 0.25, 0) });
    if (specs.stringName) out.push({ id: "string", title: "String", value: specs.stringName, anchor: new Vector3(-rx * 0.2, cy - ry * 0.55, 0) });
    if (specs.beam) out.push({ id: "beam", title: "Beam", value: specs.beam, anchor: new Vector3(-rx, cy, 0) });
    if (specs.balance) out.push({ id: "balance", title: "Balance", value: specs.balance, anchor: new Vector3(0, -0.45, 0) });
    if (specs.weight) out.push({ id: "weight", title: "Weight", value: `${specs.weight} g`, anchor: new Vector3(0, -1.2, 0) });
    if (specs.stiffness) out.push({ id: "ra", title: "Stiffness", value: `${specs.stiffness} RA`, anchor: new Vector3(rx * 0.5, cy - ry * 0.85, 0) });
    return compact || narrow ? out.slice(0, 4) : out;
  }, [specs, headSize, pat.mains, pat.crosses, rx, ry, compact, narrow]);

  React.useEffect(() => {
    if (!webglOK()) {
      setOk(false);
      return;
    }
    const el = wrap.current!;
    const canvas = canvasRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLight = () => document.documentElement.dataset.theme !== "dark";

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 6.2);

    const uniforms = { uTime: { value: 0 }, uLight: { value: isLight() ? 1 : 0 }, uPulse: { value: 0 } };
    const mat = new ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: isLight() ? NormalBlending : AdditiveBlending,
    });
    const lineMat = new ShaderMaterial({ uniforms, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false });

    const racket = new Group();
    scene.add(racket);

    // Frame: head ellipse + throat arms + shaft + handle.
    const headPts: Vector3[] = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      headPts.push(new Vector3(Math.sin(a) * rx, cy + Math.cos(a) * ry, 0));
    }
    const head = new Mesh(new TubeGeometry(new CatmullRomCurve3(headPts, true), 160, 0.045, 12, true), mat);
    racket.add(head);
    for (const s of [-1, 1]) {
      const arm = new CatmullRomCurve3([
        new Vector3(s * rx * 0.62, cy - ry * 0.78, 0),
        new Vector3(s * rx * 0.33, cy - ry - 0.12, 0),
        new Vector3(s * 0.07, cy - ry - 0.45, 0),
      ]);
      racket.add(new Mesh(new TubeGeometry(arm, 40, 0.036, 10, false), mat));
    }
    const shaftTop = cy - ry - 0.45;
    const handle = new Mesh(new CylinderGeometry(0.075, 0.08, 1.05, 8, 1), mat);
    handle.position.y = shaftTop - 0.52;
    racket.add(handle);
    const butt = new Mesh(new CylinderGeometry(0.095, 0.095, 0.06, 8), mat);
    butt.position.y = shaftTop - 1.07;
    racket.add(butt);

    // Strings: segmented lines so they can ripple when plucked.
    const SEG = 18;
    const segs: number[] = [];
    const inside = (x: number) => ry * Math.sqrt(Math.max(0, 1 - (x / (rx * 0.94)) ** 2)) * 0.94;
    for (let i = 0; i < pat.mains; i++) {
      const x = -rx * 0.9 + (i / (pat.mains - 1)) * rx * 1.8;
      const h = inside(x);
      for (let k = 0; k < SEG; k++) segs.push(x, cy - h + (2 * h * k) / SEG, 0, x, cy - h + (2 * h * (k + 1)) / SEG, 0);
    }
    for (let j = 0; j < pat.crosses; j++) {
      const y = -ry * 0.9 + (j / (pat.crosses - 1)) * ry * 1.8;
      const w = rx * 0.94 * Math.sqrt(Math.max(0, 1 - (y / (ry * 0.94)) ** 2));
      for (let k = 0; k < SEG; k++) segs.push(-w + (2 * w * k) / SEG, cy + y, 0, -w + (2 * w * (k + 1)) / SEG, cy + y, 0);
    }
    const base = new Float32Array(segs);
    const strGeo = new BufferGeometry();
    strGeo.setAttribute("position", new BufferAttribute(base.slice(), 3));
    const strings = new LineSegments(strGeo, lineMat);
    racket.add(strings);

    // Invisible string bed for tap detection.
    const shape = new Shape();
    shape.absellipse(0, cy, rx, ry, 0, Math.PI * 2, false, 0);
    const bed = new Mesh(new ShapeGeometry(shape, 48), new MeshBasicMaterial({ visible: false, side: DoubleSide }));
    racket.add(bed);

    // Sparkle dust.
    const dustN = 60;
    const dust = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      dust[i * 3] = (Math.random() - 0.5) * 3;
      dust[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
      dust[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    racket.position.y = 0.3;

    // Interaction state.
    let yaw = -0.5, pitch = 0.12, vYaw = reduce ? 0 : 0.004, vPitch = 0;
    let dragging = false, moved = 0, lx = 0, ly = 0, idle = 0;
    let pluck: { p: Vector3; t: number } | null = null;
    const ray = new Raycaster();
    const ndc = new Vector2();

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const down = (e: PointerEvent) => {
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      setHint(false);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vYaw = dx * 0.006; vPitch = dy * 0.004;
      yaw += vYaw; pitch = Math.max(-0.7, Math.min(0.7, pitch + vPitch));
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
          pluck = { p: racket.worldToLocal(hit.point.clone()), t: 0 };
          uniforms.uPulse.value = 1;
          navigator.vibrate?.(12);
        }
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", () => (dragging = false));

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const themeObs = new MutationObserver(() => {
      uniforms.uLight.value = isLight() ? 1 : 0;
      mat.blending = isLight() ? NormalBlending : AdditiveBlending;
      mat.needsUpdate = true;
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const v = new Vector3();
    const pos = strGeo.getAttribute("position") as BufferAttribute;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      uniforms.uTime.value += dt;
      uniforms.uPulse.value *= 0.92;

      if (!dragging) {
        idle += dt;
        yaw += vYaw;
        vYaw *= 0.95;
        vPitch *= 0.9;
        if (!reduce && Math.abs(vYaw) < 0.003 && idle > 1.2) yaw += 0.0035; // gentle idle spin
        if (!reduce) pitch += (0.12 + Math.sin(uniforms.uTime.value * 0.6) * 0.05 - pitch) * 0.02;
      }
      racket.rotation.set(pitch, yaw, Math.sin(uniforms.uTime.value * 0.5) * (reduce ? 0 : 0.04));
      racket.position.y = 0.3 + (reduce ? 0 : Math.sin(uniforms.uTime.value * 1.1) * 0.06);

      if (pluck) {
        pluck.t += dt;
        const amp = 0.06 * Math.exp(-pluck.t * 3.5);
        for (let i = 0; i < base.length; i += 3) {
          const d = Math.hypot(base[i] - pluck.p.x, base[i + 1] - pluck.p.y);
          pos.array[i + 2] = amp * Math.sin(pluck.t * 38 - d * 14) * Math.exp(-d * 2.2);
        }
        pos.needsUpdate = true;
        if (pluck.t > 1.6) {
          (pos.array as Float32Array).set(base);
          pos.needsUpdate = true;
          pluck = null;
        }
      }

      renderer.render(scene, camera);

      // Labels: project anchors, stack per side, draw leader lines.
      racket.updateMatrixWorld();
      const W = el.clientWidth, H = el.clientHeight;
      const pts = labels.map((l) => {
        v.copy(l.anchor).applyMatrix4(racket.matrixWorld).project(camera);
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
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
      });
      mat.dispose();
      lineMat.dispose();
      renderer.dispose();
    };
  }, [labels, rx, ry, pat.mains, pat.crosses]);

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
      <div aria-hidden className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(var(--ball)/0.35),rgb(56_189_248/0.12),transparent)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-[4%] left-1/2 h-4 w-1/3 -translate-x-1/2 rounded-full bg-ink/20 blur-lg" />
      <canvas ref={canvasRef} className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" aria-label="3D racket. Drag to spin, tap the strings." role="img" />
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

void Color;
