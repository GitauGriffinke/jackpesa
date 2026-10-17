"use client";
import { useEffect, useRef } from "react";

export default function LandingCrash() {
  const multRef = useRef<HTMLSpanElement>(null);
  const rocketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mult = 1.0;
    let crashed = false;
    let crashAt = 1.5 + Math.random() * 8; // crash between 1.5× and 9.5×
    let raf: number;
    let lastTime = performance.now();

    function tick(now: number) {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!crashed) {
        mult = Math.max(1.0, mult + delta * mult * 0.3);

        if (multRef.current) {
          multRef.current.textContent = mult.toFixed(2) + "×";
          multRef.current.className =
            mult >= 3
              ? "text-5xl font-bold tabular-nums text-win transition-colors"
              : "text-5xl font-bold tabular-nums text-accent transition-colors";
        }

        // Move rocket up as multiplier rises
        if (rocketRef.current) {
          const rise = Math.min((mult - 1) * 6, 60);
          rocketRef.current.style.transform = `translateY(-${rise}px) rotate(-10deg)`;
        }

        if (mult >= crashAt) {
          crashed = true;
          if (multRef.current) {
            multRef.current.textContent = "CRASHED @ " + mult.toFixed(2) + "×";
            multRef.current.className = "text-2xl font-bold tabular-nums text-danger";
          }
          if (rocketRef.current) {
            rocketRef.current.style.transform = "translateY(0) rotate(45deg)";
            rocketRef.current.style.filter = "grayscale(1) opacity(0.4)";
          }
          // Restart after 2.5s
          setTimeout(() => {
            mult = 1.0;
            crashed = false;
            crashAt = 1.5 + Math.random() * 8;
            lastTime = performance.now();
            if (rocketRef.current) {
              rocketRef.current.style.transform = "translateY(0) rotate(0deg)";
              rocketRef.current.style.filter = "";
            }
            raf = requestAnimationFrame(tick);
          }, 2500);
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-10 px-6">
      <div
        ref={rocketRef}
        className="text-6xl transition-transform duration-300 ease-out"
        style={{ willChange: "transform" }}
      >
        🚀
      </div>
      <span
        ref={multRef}
        className="mt-4 text-5xl font-bold tabular-nums text-accent"
      >
        1.00×
      </span>
      <p className="mt-2 text-xs text-text-muted">Live crash preview</p>
    </div>
  );
}
