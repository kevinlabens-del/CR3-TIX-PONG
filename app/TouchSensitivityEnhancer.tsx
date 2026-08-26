"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "cr3atix-pong-touch-sensitivity";
const DEFAULT_SENSITIVITY = 2.2;
const MIN_SENSITIVITY = 1;
const MAX_SENSITIVITY = 3;

type PointerStart = { clientY: number };
type PendingMove = {
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  button: number;
  buttons: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  width: number;
  height: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
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
      if (Number.isFinite(stored) && stored >= MIN_SENSITIVITY && stored <= MAX_SENSITIVITY) setSensitivity(stored);
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
    const pendingMoves = new Map<number, PendingMove>();
    const syntheticEvents = new WeakSet<Event>();
    let activeCanvas: HTMLCanvasElement | null = null;
    let moveFrame = 0;
    let domFrame = 0;

    const flushMoves = () => {
      moveFrame = 0;
      const canvas = activeCanvas;
      if (!canvas || pendingMoves.size === 0) return;
      const rect = canvas.getBoundingClientRect();
      for (const pending of pendingMoves.values()) {
        const start = starts.get(pending.pointerId);
        if (!start) continue;
        const amplifiedY = start.clientY + (pending.clientY - start.clientY) * sensitivity;
        const clientY = Math.max(rect.top, Math.min(rect.bottom, amplifiedY));
        const amplifiedEvent = new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          isPrimary: pending.isPrimary,
          clientX: pending.clientX,
          clientY,
          screenX: pending.screenX,
          screenY: pending.screenY,
          button: pending.button,
          buttons: pending.buttons,
          pressure: pending.pressure,
          tangentialPressure: pending.tangentialPressure,
          tiltX: pending.tiltX,
          tiltY: pending.tiltY,
          twist: pending.twist,
          width: pending.width,
          height: pending.height,
          ctrlKey: pending.ctrlKey,
          shiftKey: pending.shiftKey,
          altKey: pending.altKey,
          metaKey: pending.metaKey,
        });
        syntheticEvents.add(amplifiedEvent);
        canvas.dispatchEvent(amplifiedEvent);
      }
      pendingMoves.clear();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      starts.set(event.pointerId, { clientY: event.clientY });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (syntheticEvents.has(event)) return;
      if (!starts.has(event.pointerId) || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingMoves.set(event.pointerId, {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        clientX: event.clientX,
        clientY: event.clientY,
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
      if (!moveFrame) moveFrame = window.requestAnimationFrame(flushMoves);
    };

    const onPointerEnd = (event: PointerEvent) => {
      starts.delete(event.pointerId);
      pendingMoves.delete(event.pointerId);
    };

    const detachCanvas = () => {
      if (!activeCanvas) return;
      activeCanvas.removeEventListener("pointerdown", onPointerDown);
      activeCanvas.removeEventListener("pointermove", onPointerMove);
      activeCanvas.removeEventListener("pointerup", onPointerEnd);
      activeCanvas.removeEventListener("pointercancel", onPointerEnd);
      activeCanvas = null;
      starts.clear();
      pendingMoves.clear();
    };

    const syncDom = () => {
      domFrame = 0;
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

    const scheduleDomSync = () => {
      if (!domFrame) domFrame = window.requestAnimationFrame(syncDom);
    };

    syncDom();
    const observer = new MutationObserver(scheduleDomSync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (moveFrame) window.cancelAnimationFrame(moveFrame);
      if (domFrame) window.cancelAnimationFrame(domFrame);
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
