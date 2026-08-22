"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallSettingsButton() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInstalled(detectStandalone());

    const locateTarget = () => {
      const settingsPanel = document.querySelector(".settings-panel");
      const actions = settingsPanel?.querySelector<HTMLElement>(".settings-actions") ?? null;
      setTarget((current) => current === actions ? current : actions);
    };

    locateTarget();
    const observer = new MutationObserver(locateTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };
    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(detectStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    media.addEventListener?.("change", onDisplayMode);

    return () => {
      observer.disconnect();
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  const requestInstall = async () => {
    if (installed) return;
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") setInstallPrompt(null);
        return;
      } catch {
        // Le navigateur peut invalider un ancien prompt ; l'aide manuelle reste disponible.
      }
    }
    setShowHelp(true);
  };

  if (!target) return showHelp ? createPortal(<InstallHelp onClose={() => setShowHelp(false)} />, document.body) : null;

  return (
    <>
      {createPortal(
        <button
          type="button"
          onClick={requestInstall}
          disabled={installed}
          aria-label={installed ? "CR3@TIX PONG est installé" : "Installer CR3@TIX PONG"}
          style={installed ? installedStyle : installStyle}
        >
          {installed ? "✓ APPLICATION INSTALLÉE" : "↓ INSTALLER CR3@TIX PONG"}
        </button>,
        target,
      )}
      {showHelp && createPortal(<InstallHelp onClose={() => setShowHelp(false)} />, document.body)}
    </>
  );
}

function InstallHelp({ onClose }: { onClose: () => void }) {
  const ios = isIOS();
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="install-help-title" onClick={onClose}>
      <div style={cardStyle} onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fermer" style={closeStyle}>×</button>
        <span style={kickerStyle}>INSTALLATION</span>
        <h2 id="install-help-title" style={titleStyle}>AJOUTER CR3@TIX PONG</h2>
        {ios ? (
          <div style={stepsStyle}>
            <p><strong>1.</strong> Ouvre le bouton <strong>Partager</strong> de Safari.</p>
            <p><strong>2.</strong> Choisis <strong>Sur l’écran d’accueil</strong>.</p>
            <p><strong>3.</strong> Appuie sur <strong>Ajouter</strong>.</p>
          </div>
        ) : (
          <div style={stepsStyle}>
            <p>Ton navigateur ne propose pas encore la fenêtre automatique.</p>
            <p>Ouvre son <strong>menu ⋮</strong>, puis choisis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p>
          </div>
        )}
        <button type="button" onClick={onClose} style={confirmStyle}>J’AI COMPRIS</button>
      </div>
    </div>
  );
}

const installStyle: React.CSSProperties = {
  border: "1px solid rgba(61,231,255,.42)",
  color: "#d9fbff",
  background: "linear-gradient(110deg, rgba(61,231,255,.11), rgba(142,104,255,.12))",
  boxShadow: "0 0 22px rgba(61,231,255,.08)",
};

const installedStyle: React.CSSProperties = {
  border: "1px solid rgba(80,224,169,.26)",
  color: "#78e4b6",
  background: "rgba(57,211,153,.06)",
  cursor: "default",
  opacity: .85,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20,
  background: "rgba(2,4,11,.82)", backdropFilter: "blur(14px)",
};
const cardStyle: React.CSSProperties = {
  position: "relative", width: "min(460px, 100%)", padding: "27px 22px 22px", borderRadius: 23,
  border: "1px solid rgba(255,255,255,.13)", background: "linear-gradient(145deg, #10172b, #070a16)",
  boxShadow: "0 30px 100px rgba(0,0,0,.58)", color: "#eef5ff",
};
const closeStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 10,
  border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#b9c5d8", fontSize: 20,
};
const kickerStyle: React.CSSProperties = { color: "#8b6eff", fontSize: 8, fontWeight: 900, letterSpacing: ".24em" };
const titleStyle: React.CSSProperties = { margin: "7px 0 18px", fontSize: 25 };
const stepsStyle: React.CSSProperties = { color: "#8d99af", fontSize: 13, lineHeight: 1.6 };
const confirmStyle: React.CSSProperties = {
  width: "100%", marginTop: 12, padding: 13, border: 0, borderRadius: 11,
  color: "#07101c", background: "linear-gradient(100deg, #78efff, #fff2dc, #ff754d)",
  fontSize: 9, fontWeight: 950, letterSpacing: ".14em",
};
