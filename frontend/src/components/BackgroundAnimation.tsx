import React, { useEffect, useRef } from 'react';
import './BackgroundAnimation.css';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ph: number;
}

interface Packet {
  a: Node;
  b: Node;
  t: number;
  sp: number;
}

interface ECGTrack {
  y: number;
  off: number;
  spd: number;
  amp: number;
}

export const BackgroundAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const GREEN = '47,107,79';
    const MINT = '46,163,106';

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let packets: Packet[] = [];
    let ecgs: ECGTrack[] = [];
    let animId: number = 0;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      if (!cv || !ctx) return;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = Math.max(18, Math.min(70, Math.round((W * H) / 24000)));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 1.6 + Math.random() * 1.8,
        ph: Math.random() * 6.28,
      }));

      ecgs = [
        { y: H * 0.62, off: 0, spd: 210, amp: 34 },
        { y: H * 0.84, off: W * 0.5, spd: 150, amp: 22 },
      ];
    }

    // Single heartbeat cycle: returns y offset (-1..1) for phase p in 0..1
    function beat(p: number): number {
      if (p < 0.1) return 0;
      if (p < 0.16) return -0.18 * Math.sin(((p - 0.1) / 0.06) * Math.PI); // P wave
      if (p < 0.3) return 0;
      if (p < 0.33) return 0.22 * ((p - 0.3) / 0.03); // Q
      if (p < 0.38) return 0.22 - 1.22 * ((p - 0.33) / 0.05); // R spike
      if (p < 0.43) return -1 + 1.45 * ((p - 0.38) / 0.05); // S
      if (p < 0.47) return 0.45 - 0.45 * ((p - 0.43) / 0.04);
      if (p < 0.6) return 0;
      if (p < 0.74) return -0.3 * Math.sin(((p - 0.6) / 0.14) * Math.PI); // T wave
      return 0;
    }

    function drawECG(e: ECGTrack, t: number) {
      if (!ctx) return;
      const period = 260;
      const trail = 420;
      const head = ((t * e.spd + e.off) % (W + trail + 200)) - 100;
      const step = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let x = head - trail; x <= head; x += step) {
        if (x < -10 || x > W + 10) continue;
        const a = (x - (head - trail)) / trail; // 0 tail -> 1 head
        const p = (((x % period) + period) % period) / period;
        const y = e.y + beat(p) * e.amp;
        const p2 = ((((x + step) % period) + period) % period) / period;
        const y2 = e.y + beat(p2) * e.amp;
        ctx.strokeStyle = `rgba(${GREEN},${a * a * 0.5})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step, y2);
        ctx.stroke();
      }

      const p = (((head % period) + period) % period) / period;
      const hy = e.y + beat(p) * e.amp;
      const g = ctx.createRadialGradient(head, hy, 0, head, hy, 16);
      g.addColorStop(0, `rgba(${MINT},0.55)`);
      g.addColorStop(1, `rgba(${MINT},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head, hy, 16, 0, 6.28);
      ctx.fill();
      ctx.fillStyle = `rgba(${GREEN},0.9)`;
      ctx.beginPath();
      ctx.arc(head, hy, 2.6, 0, 6.28);
      ctx.fill();
    }

    function frame(now: number) {
      if (!ctx) return;
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      const LINK = 150;

      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = W + 20;
          if (n.x > W + 20) n.x = -20;
          if (n.y < -20) n.y = H + 20;
          if (n.y > H + 20) n.y = -20;
        }
      }

      // Inter-node links
      const links: [Node, Node][] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            links.push([a, b]);
            ctx.strokeStyle = `rgba(${GREEN},${(1 - d / LINK) * 0.26})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        const s = 1 + 0.25 * Math.sin(t * 1.4 + n.ph);
        ctx.fillStyle = `rgba(${GREEN},0.5)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * s, 0, 6.28);
        ctx.fill();
      }

      // Sync packets travelling along links
      if (!reduce && links.length && packets.length < 9 && Math.random() < 0.035) {
        const l = links[(Math.random() * links.length) | 0];
        packets.push({ a: l[0], b: l[1], t: 0, sp: 0.012 + Math.random() * 0.01 });
      }

      packets = packets.filter((p) => p.t < 1);
      for (const p of packets) {
        p.t += p.sp;
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
        g.addColorStop(0, `rgba(${MINT},0.7)`);
        g.addColorStop(1, `rgba(${MINT},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = `rgba(${MINT},1)`;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, 6.28);
        ctx.fill();
      }

      for (const e of ecgs) {
        drawECG(e, reduce ? 1.6 : t);
      }

      if (!reduce) {
        animId = requestAnimationFrame(frame);
      }
    }

    size();
    if (reduce) {
      frame(0);
    } else {
      animId = requestAnimationFrame(frame);
    }

    const handleResize = () => {
      size();
      if (reduce) frame(0);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else if (!reduce) {
        animId = requestAnimationFrame(frame);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="upchar-bg" aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="grid" />
      <canvas ref={canvasRef} />
    </div>
  );
};

