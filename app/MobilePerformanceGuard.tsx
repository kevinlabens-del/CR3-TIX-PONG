"use client";

import { useEffect } from "react";

export default function MobilePerformanceGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let last = performance.now();
    let average = 16.7;
    let lowFrames = 0;
    let recoveryFrames = 0;

    const loop = (now: number) => {
      const delta = Math.min(80, Math.max(1, now - last));
      last = now;
      average = average * 0.92 + delta * 0.08;
      const fps = 1000 / average;

      if (fps < 50) {
        lowFrames += 1;
        recoveryFrames = 0;
      } else if (fps > 56) {
        recoveryFrames += 1;
        lowFrames = Math.max(0, lowFrames - 1);
      }

      if (lowFrames >= 45) root.dataset.pongPerf = "low";
      if (recoveryFrames >= 180) {
        delete root.dataset.pongPerf;
        lowFrames = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      delete root.dataset.pongPerf;
    };
  }, []);

  return (
    <style>{`
      /* Decorative page effects are hidden during gameplay because the Canvas
         already renders the full arena. This removes two costly GPU layers. */
      .game-active > .ambient,
      .game-active > .grain {
        display: none !important;
      }

      /* Emergency fallback used only after a sustained FPS drop. Gameplay,
         collisions and core visuals remain untouched. */
      html[data-pong-perf="low"] .game-active .ability-notice,
      html[data-pong-perf="low"] .game-active .combo-float,
      html[data-pong-perf="low"] .game-active .boss-chip,
      html[data-pong-perf="low"] .game-active .ultimate-button {
        box-shadow: none !important;
        filter: none !important;
      }

      html[data-pong-perf="low"] .game-active .canvas-frame {
        box-shadow: none !important;
      }
    `}</style>
  );
}
