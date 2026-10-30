import React, { useEffect, useRef } from 'react';

interface Ring {
  R: number;
  tilt: number;
  roll: number;
  spin: number;
  arc: number;
  w: number;
  ph: number;
  a: number;
}

interface Dot {
  x: number;
  y: number;
  r: number;
  ox: number;
  oy: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
  f: number;
  t: number;
  q: number;
}

interface Ripple {
  x: number;
  y: number;
  t: number;
}

export const InteractiveOrb: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const el: HTMLDivElement = containerRef.current;
    const cv: HTMLCanvasElement = canvasRef.current;
    const ctx: CanvasRenderingContext2D = cv.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TAU = Math.PI * 2;
    const N = 150;

    // Strict light mode background tone: warm alabaster (#faf9f6)
    const BG: [number, number, number] = [250, 249, 246];

    const RINGS: Ring[] = [
      { R: 290, tilt: 80, roll: -1.5, spin: 0.14, arc: TAU, w: 2.8, ph: 0, a: 0 },
      { R: 222, tilt: 75, roll: 7, spin: -0.26, arc: 5.2, w: 2.5, ph: 1.2, a: 1.2 },
      { R: 178, tilt: 71, roll: -14, spin: 0.32, arc: TAU, w: 1.7, ph: 2.4, a: 2.4 },
      { R: 132, tilt: 66, roll: 20, spin: 0.46, arc: 4.3, w: 1.5, ph: 0.6, a: 0.6 },
    ];

    const DOTS: Dot[] = [
      { x: 123, y: 110, r: 10, ox: 0, oy: 0 },
      { x: 684, y: 77, r: 8, ox: 0, oy: 0 },
      { x: 194, y: 331, r: 12, ox: 0, oy: 0 },
      { x: 737, y: 296, r: 6, ox: 0, oy: 0 },
    ];

    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    const cur = { x: 0, y: 0, on: 0, ton: 0 };
    const ripples: Ripple[] = [];

    let T = reduce ? 3 : 0;
    let en = 0;
    let kk = 1;
    let last = 0;
    let raf = 0;
    let dpr = 1;
    let W = 0;
    let H = 0;
    let s = 1;
    let e = 1;

    const ease = (v: number) => 1 - Math.pow(1 - v, 3);
    const cl = (v: number) => Math.max(-1, Math.min(1, v));
    const circle = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    };

    function size() {
      if (!el || !cv) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round((r.width * 416) / 853 * dpr);
      if (!raf) draw();
    }

    function build(r: Ring): Point[] {
      const pts: Point[] = [];
      const phi = (r.tilt * Math.PI) / 180 + Math.sin(T * 0.35 + r.ph) * 0.07 + m.y * 0.3;
      const rho = (r.roll * Math.PI) / 180 + Math.sin(T * 0.22 + r.ph * 1.7) * 0.05 + m.x * 0.06;
      const psi = Math.sin(T * 0.25 + r.ph) * 0.1 + m.x * 0.55;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const cr = Math.cos(rho);
      const sr = Math.sin(rho);
      const cq = Math.cos(psi);
      const sq = Math.sin(psi);
      const R = r.R * (0.9 + 0.1 * e);
      const cx = W / 2;
      const cy = 238 * s;

      for (let k = 0; k <= N; k++) {
        const f = k / N;
        const t = r.a + r.arc * f;
        const x = R * Math.cos(t);
        const y = R * Math.sin(t);
        const y1 = y * cp;
        const z1 = y * sp;
        const x2 = x * cr - y1 * sr;
        const y2 = x * sr + y1 * cr;
        const x3 = x2 * cq + z1 * sq;
        const z3 = -x2 * sq + z1 * cq;
        const q = 1 / (1 - z3 / 1500);
        pts.push({ x: cx + x3 * q * s, y: cy + y2 * q * s, z: z3 / R, f, t, q });
      }
      return pts;
    }

    function drawRing(r: Ring, pts: Point[], front: boolean) {
      const open = r.arc < TAU - 0.01;
      ctx.lineCap = 'round';
      for (let k = 0; k < N; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const z = (a.z + b.z) / 2;
        if ((z >= 0) !== front) continue;

        const tp = open ? Math.pow(Math.max(Math.sin((Math.PI * (a.f + b.f)) / 2), 0), 0.5) : 1;
        const lum = Math.max(
          140,
          Math.min(248, 200 - 18 * z + 30 * Math.sin(a.t * 2 + T * 0.9) + en * 12)
        );

        const rCol = Math.round(BG[0] + (lum - BG[0]) * tp);
        const gCol = Math.round(BG[1] + (lum - BG[1]) * tp);
        const bCol = Math.round(BG[2] + (lum + 1 - BG[2]) * tp);

        ctx.strokeStyle = `rgb(${rCol},${gCol},${bCol})`;
        ctx.lineWidth = Math.max(r.w * s * (0.5 + 0.5 * tp) * (1 + 0.35 * z) * a.q, 1.1 * dpr);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    function draw() {
      W = cv.width;
      H = cv.height;
      if (!W || !H) return;

      s = W / 853;
      e = reduce ? 1 : ease(Math.min(1, T / 1.6));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = e;

      const bob = Math.sin(T * 0.9) * 7 * s;
      const cx = W / 2 + m.x * 16 * s;
      const cy = 210 * s + bob * 0.5 + m.y * 10 * s;
      let g: CanvasGradient;

      // 1. Floor shadow in light mode
      ctx.save();
      ctx.translate(W / 2 + m.x * 10 * s, 346 * s);
      ctx.scale(1 + 0.06 * (-bob / (7 * s || 1)), 0.17);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 175 * s);
      g.addColorStop(0, 'rgba(110,145,128,0.24)');
      g.addColorStop(1, 'rgba(110,145,128,0)');
      ctx.fillStyle = g;
      circle(0, 0, 175 * s);
      ctx.restore();

      // 2. Cursor aura spotlight in light mode
      if (cur.on > 0.01) {
        g = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, 170 * s);
        g.addColorStop(0, `rgba(150,215,180,${0.32 * cur.on})`);
        g.addColorStop(1, 'rgba(150,215,180,0)');
        ctx.fillStyle = g;
        circle(cur.x, cur.y, 170 * s);
      }

      // 3. Floating glass beads (drift + repel from cursor)
      ctx.save();
      ctx.shadowColor = 'rgba(40,60,50,0.16)';
      ctx.shadowBlur = 8 * s;
      ctx.shadowOffsetY = 3 * s;
      ctx.fillStyle = '#ffffff';
      DOTS.forEach((d, i) => {
        const bx = d.x * s + Math.sin(T * 0.5 + i * 1.7) * 6 * s;
        const by = d.y * s + Math.cos(T * 0.4 + i * 2.1) * 8 * s;
        let tx = 0;
        let ty = 0;
        if (cur.on > 0.01) {
          const vx = bx - cur.x;
          const vy = by - cur.y;
          const dist = Math.hypot(vx, vy) || 1;
          const R = 190 * s;
          if (dist < R) {
            const p = (1 - dist / R) * 80 * s * cur.on;
            tx = (vx / dist) * p;
            ty = (vy / dist) * p;
          }
        }
        d.ox += (tx - d.ox) * kk;
        d.oy += (ty - d.oy) * kk;
        circle(
          bx + d.ox + m.x * (i + 1) * 5 * s,
          by + d.oy + m.y * (i + 1) * 4 * s,
          d.r * s
        );
      });
      ctx.restore();

      // 4. Glow + Back Segment of Orbital Rings
      const rr = 82 * s * (1 + 0.02 * Math.sin(T * 1.1) + en * 0.03);
      g = ctx.createRadialGradient(cx, cy, rr * 0.6, cx, cy, rr * 2);
      g.addColorStop(0, `rgba(190,232,210,${0.3 + en * 0.2})`);
      g.addColorStop(1, 'rgba(190,232,210,0)');
      ctx.fillStyle = g;
      circle(cx, cy, rr * 2);

      const data = RINGS.map((r) => ({ r, pts: build(r) }));
      data.forEach((d) => drawRing(d.r, d.pts, false));

      // 5. Light Mode Outer Glass Sphere
      const hx = cx - rr * 0.3 + m.x * rr * 0.25;
      const hy = cy - rr * 0.35 + m.y * rr * 0.2;
      g = ctx.createRadialGradient(hx, hy, rr * 0.05, cx, cy, rr);
      g.addColorStop(0, 'rgba(240,252,246,0.95)');
      g.addColorStop(0.45, 'rgba(204,238,221,0.62)');
      g.addColorStop(0.85, 'rgba(176,222,198,0.40)');
      g.addColorStop(1, 'rgba(176,222,198,0.10)');
      ctx.fillStyle = g;
      circle(cx, cy, rr);

      g = ctx.createRadialGradient(
        hx - rr * 0.08,
        hy - rr * 0.1,
        0,
        hx - rr * 0.08,
        hy - rr * 0.1,
        rr * 0.5
      );
      g.addColorStop(0, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      circle(hx - rr * 0.08, hy - rr * 0.1, rr * 0.5);

      // 6. Biological Core Ball (emerald depth)
      const cr = 31 * s;
      const bx = cx - 6 * s + m.x * 14 * s;
      const by = cy + bob * 0.6 + m.y * 9 * s;
      ctx.save();
      ctx.shadowColor = 'rgba(40,70,55,0.28)';
      ctx.shadowBlur = 14 * s;
      ctx.shadowOffsetY = 6 * s;
      g = ctx.createRadialGradient(bx - cr * 0.35, by - cr * 0.4, cr * 0.05, bx, by, cr);
      g.addColorStop(0, '#e2ece6');
      g.addColorStop(0.35, '#9fb3a8');
      g.addColorStop(0.75, '#62766b');
      g.addColorStop(1, '#42524a');
      ctx.fillStyle = g;
      circle(bx, by, cr);
      ctx.restore();

      // 7. Front Segment of Rings
      data.forEach((d) => drawRing(d.r, d.pts, true));

      // 8. Click ripples
      ctx.lineWidth = 2 * dpr;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = (T - ripples[i].t) / 1.1;
        if (p >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(110,185,148,${0.5 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(ripples[i].x, ripples[i].y, (20 + 220 * ease(p)) * s, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      T += dt;
      kk = 1 - Math.exp(-dt * 6);
      const k = 1 - Math.exp(-dt * 5);
      m.x += (m.tx - m.x) * k;
      m.y += (m.ty - m.y) * k;
      cur.on += (cur.ton - cur.on) * kk;
      en *= Math.exp(-dt * 1.4);
      RINGS.forEach((r) => (r.a += r.spin * dt * (1 + en * 2.5)));
      draw();
    }

    const start = () => {
      if (!raf && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    function track(ev: PointerEvent) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const parentHero = el.closest('section') || el;
      const hr = parentHero.getBoundingClientRect();
      const inside = ev.clientY >= hr.top - 40 && ev.clientY <= hr.bottom + 60;

      m.tx = inside
        ? cl((ev.clientX - (r.left + r.width / 2)) / (Math.max(window.innerWidth, 600) * 0.45))
        : 0;
      m.ty = inside ? cl((ev.clientY - (r.top + r.height / 2)) / (r.height * 1.1)) : 0;
      cur.x = (ev.clientX - r.left) * dpr;
      cur.y = (ev.clientY - r.top) * dpr;
      cur.ton = inside ? 1 : 0;
      en = Math.min(1.5, en + Math.hypot(ev.movementX || 0, ev.movementY || 0) / 70);
    }

    const onPointerDown = (ev: PointerEvent) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      ripples.push({ x: (ev.clientX - r.left) * dpr, y: (ev.clientY - r.top) * dpr, t: T });
      en = Math.min(2, en + 0.9);
    };

    const onPointerLeave = () => {
      m.tx = 0;
      m.ty = 0;
      cur.ton = 0;
    };

    window.addEventListener('pointermove', track, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('pointerdown', onPointerDown as any);

    const resizeObserver = new ResizeObserver(size);
    resizeObserver.observe(el);

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) start();
      else stop();
    });
    intersectionObserver.observe(el);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    size();
    start();

    return () => {
      stop();
      window.removeEventListener('pointermove', track);
      document.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('pointerdown', onPointerDown as any);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive glass orb with orbiting rings that follows your cursor"
      className={`relative w-full max-w-[853px] mx-auto select-none touch-pan-y cursor-crosshair overflow-hidden ${className}`}
      style={{ aspectRatio: '853 / 416' }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default InteractiveOrb;
