import { useEffect, useRef } from "react";

interface Trichome {
  x: number;
  y: number;
  r: number; // head radius
  stalk: number; // stalk length (down from head)
  vx: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
  swayAmp: number;
  opacity: number;
  mature: number; // 0..1, mix between milky and amber
}

/**
 * Soft animated background of cannabis trichomes drifting upward with a
 * gentle horizontal sway. Canvas 2D, DPR-aware, pauses on tab blur, and
 * degrades to a static sparse scatter when prefers-reduced-motion is on.
 */
export function TrichomeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const maybeCanvas = canvasRef.current;
    if (!maybeCanvas) return;
    const canvas: HTMLCanvasElement = maybeCanvas;
    const maybeCtx = canvas.getContext("2d", { alpha: true });
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let trichomes: Trichome[] = [];

    const palette = {
      milkyFill: [245, 240, 220],
      amberFill: [220, 165, 85],
      stalk: [160, 165, 155],
    };

    function populate() {
      // Density tuned so laptops get ~55 and phones ~30
      const area = W * H;
      const count = reduced ? 20 : Math.min(90, Math.max(20, Math.round(area / 24000)));
      trichomes = Array.from({ length: count }, () => randomTrichome(true));
    }

    function randomTrichome(initial: boolean): Trichome {
      const r = 2 + Math.random() * 5;
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 10 + Math.random() * 60,
        r,
        stalk: 10 + Math.random() * 18,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -(0.06 + Math.random() * 0.14) * (r > 4 ? 0.7 : 1.1),
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.0008 + Math.random() * 0.0014,
        swayAmp: 0.15 + Math.random() * 0.35,
        opacity: 0.08 + Math.random() * 0.22,
        mature: Math.random() ** 2, // skew toward milky
      };
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      populate();
    }

    function drawOne(t: Trichome) {
      const [r1, g1, b1] = palette.milkyFill;
      const [r2, g2, b2] = palette.amberFill;
      const r = Math.round(r1 + (r2 - r1) * t.mature);
      const g = Math.round(g1 + (g2 - g1) * t.mature);
      const b = Math.round(b1 + (b2 - b1) * t.mature);

      // Stalk goes DOWN from head (trichomes attach to leaf, head on top)
      ctx.strokeStyle = `rgba(${palette.stalk[0]}, ${palette.stalk[1]}, ${palette.stalk[2]}, ${t.opacity * 0.35})`;
      ctx.lineWidth = Math.max(0.6, t.r * 0.18);
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.sin(t.phase * 0.5) * 1.2, t.y + t.stalk);
      ctx.stroke();

      // Outer glow
      const outerR = t.r * 4.5;
      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, outerR);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${t.opacity * 0.85})`);
      grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${t.opacity * 0.25})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(t.x, t.y, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Bright head core
      ctx.fillStyle = `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, ${Math.min(1, t.opacity * 1.4)})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Tiny specular highlight
      ctx.fillStyle = `rgba(255, 250, 230, ${t.opacity * 0.9})`;
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.18, t.y - t.r * 0.18, t.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    let raf = 0;
    let last = performance.now();
    let visible = !document.hidden;

    function frame(now: number) {
      const dt = Math.min(60, now - last);
      last = now;

      ctx.clearRect(0, 0, W, H);

      for (const t of trichomes) {
        if (!reduced) {
          t.phase += t.phaseSpeed * dt;
          t.x += (t.vx + Math.sin(t.phase) * t.swayAmp * 0.015) * dt;
          t.y += t.vy * dt;

          // Wrap: off the top? respawn at bottom
          if (t.y + t.stalk < -20) {
            Object.assign(t, randomTrichome(false));
          }
          if (t.x < -30) t.x = W + 10;
          else if (t.x > W + 30) t.x = -10;
        }
        drawOne(t);
      }

      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      visible = !document.hidden;
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      // One static paint
      ctx.clearRect(0, 0, W, H);
      for (const t of trichomes) drawOne(t);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      {/* Vignette so content stays readable near the edges */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70vmax 55vmax at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.9) 100%)",
          zIndex: 0,
        }}
      />
    </>
  );
}
