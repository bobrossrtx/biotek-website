"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient hero background: a subtle scanline/grain drift only.
 * (The pulsing bass-bin rings were removed — this keeps the texture
 * without the floating circles.) Pauses for prefers-reduced-motion
 * and when the tab is hidden.
 */
export default function BioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = true;
    let t = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // slow-drifting scanlines
      ctx.strokeStyle = "rgba(163, 255, 60, 0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const y = ((t * 18 * (i + 1) + i * 160) % h + h) % h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // faint vignette pulse — barely-there breathing of the bottom glow
      const glow = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.7);
      glow.addColorStop(0, `rgba(163, 255, 60, ${(0.02 + Math.sin(t * 0.5) * 0.01).toFixed(3)})`);
      glow.addColorStop(1, "rgba(163, 255, 60, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    };

    const loop = () => {
      if (!running) return;
      t += 0.016;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      running = !document.hidden && !reduced;
      if (running) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      draw(); // single static frame
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="bio-canvas" />;
}
