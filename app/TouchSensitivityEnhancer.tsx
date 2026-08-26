"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "cr3atix-pong-touch-sensitivity";
const DEFAULT_SENSITIVITY = 2.2;
const MIN_SENSITIVITY = 1;
const MAX_SENSITIVITY = 3;

type PointerStart = {
  clientY: number;
};

function clampSensitivity(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SENSITIVITY;
  return Math.max(MIN_SENSITIVITY, Math.min(MAX_SENSITIVITY, value));
}

export default function TouchSensitivityEnhancer() {
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);
  const [settingsHost, setSettingsHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(stored) && stored >= MIN_SENSITIVITY && stored <= MAX_SENSITIVITY) {
        setSensitivity(stored);
      }
    } catch {
      // Le réglage reste utilisable même si le stockage local est indisponible.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(sensitivity));
    } catch {
      // La session courante conserve quand même la valeur choisie.
    }
  }, [sensitivity]);

  useEffect(() => {
    const starts = new Map<number, PointerStart>();
    const syntheticEvents = new WeakSet<Event>();
    let activeCanvas: HTMLCanvasElement | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      starts.set(event.pointerId, { clientY: event.clientY });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (syntheticEvents.has(event)) return;
      const start = starts.get(event.pointerId);
      if (!start || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;

      const canvas = event.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const amplifiedY = start.clientY + (event.clientY - start.clientY) * sensitivity;
      const clientY = Math.max(rect.top, Math.min(rect.bottom, amplifiedY));

      event.preventDefault();
      event.stopImmediatePropagation();

      const amplifiedEvent = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        clientX: event.clientX,
        clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        pressure: event.pressure,
        tangentialPressure: event.tangentialPressure,
        tiltX: event.tiltX,
        tiltY: event.tiltY,
        twist: event.twist,
        width: event.width,
        height: event.height,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      });
      syntheticEvents.add(amplifiedEvent);
      canvas.dispatchEvent(amplifiedEvent);
    };

    const onPointerEnd = (event: PointerEvent) => {
      starts.delete(event.pointerId);
    };

    const detachCanvas = () => {
      if (!activeCanvas) return;
      activeCanvas.removeEventListener("pointerdown", onPointerDown);
      activeCanvas.removeEventListener("pointermove", onPointerMove);
      activeCanvas.removeEventListener("pointerup", onPointerEnd);
      activeCanvas.removeEventListener("pointercancel", onPointerEnd);
      activeCanvas = null;
      starts.clear();
    };

    const syncDom = () => {
      const canvas = document.querySelector<HTMLCanvasElement>(".canvas-frame canvas");
      if (canvas !== activeCanvas) {
        detachCanvas();
        if (canvas) {
          activeCanvas = canvas;
          canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
          canvas.addEventListener("pointermove", onPointerMove, { passive: false });
          canvas.addEventListener("pointerup", onPointerEnd, { passive: true });
          canvas.addEventListener("pointercancel", onPointerEnd, { passive: true });
        }
      }

      const actions = document.querySelector<HTMLElement>(".settings-panel .settings-actions");
      if (actions?.parentElement) {
        let host = actions.parentElement.querySelector<HTMLElement>("[data-touch-sensitivity-host]");
        if (!host) {
          host = document.createElement("div");
          host.dataset.touchSensitivityHost = "true";
          actions.parentElement.insertBefore(host, actions);
        }
        setSettingsHost((current) => (current === host ? current : host));
      } else {
        setSettingsHost((current) => (current?.isConnected ? current : null));
      }
    };

    syncDom();
    const observer = new MutationObserver(syncDom);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      detachCanvas();
    };
  }, [sensitivity]);

  const displayValue = useMemo(() => `${sensitivity.toFixed(1).replace(".", ",")}×`, [sensitivity]);

  if (!settingsHost) return null;

  return createPortal(
    <>
      <label className="range-setting">
        <span>
          <strong>SENSIBILITÉ TACTILE</strong>
          <small>{displayValue}</small>
        </span>
        <input
          type="range"
          min={MIN_SENSITIVITY}
          max={MAX_SENSITIVITY}
          step="0.1"
          value={sensitivity}
          onChange={(event) => setSensitivity(clampSensitivity(Number(event.target.value)))}
          aria-label="Sensibilité tactile"
        />
      </label>
      <p className="setting-help">
        Plus la valeur est élevée, moins ton doigt doit parcourir de distance pour déplacer entièrement la raquette. Réglage conseillé : 2,2×.
      </p>
    </>,
    settingsHost,
  );
}
