"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMPAIGN_STAGES,
  CHAPTERS,
  DEFAULT_PROFILE,
  ELEMENT_SKINS,
  type CampaignStage,
  type ElementSkin,
  type MatchRecord,
  type V2Profile,
} from "./v2-data";

type Screen = "menu" | "playing" | "paused" | "ended";
type Mode = "solo" | "duel" | "campaign";
type MenuTab = "arena" | "campaign" | "arsenal" | "records";
type Difficulty = "zen" | "arcade" | "legend";
type ElementSide = "ice" | "fire";
type PowerUpKind = "overdrive" | "shield" | "titan";

const BASE_PATH = "/CR3-TIX-PONG";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PlayerStats = {
  matches: number;
  wins: number;
  losses: number;
  bestRally: number;
};

type MatchReward = {
  stars: number;
  shards: number;
  nextStage: number | null;
};

type Paddle = {
  x: number;
  y: number;
  previousY: number;
  targetY: number;
  width: number;
  height: number;
  baseHeight: number;
  boostTimer: number;
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  element: ElementSide;
  trail: Array<{ x: number; y: number; life: number; element: ElementSide }>;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type GameState = {
  left: Paddle;
  right: Paddle;
  ball: Ball;
  particles: Particle[];
  score: { ice: number; fire: number };
  rally: number;
  bestRally: number;
  shake: number;
  flash: number;
  serveDelay: number;
  servingTo: ElementSide;
  mode: Mode;
  difficulty: Difficulty;
  winScore: number;
  aiSpeed: number;
  aiReaction: number;
  launchSpeed: number;
  campaignStage: CampaignStage | null;
  palette: ElementSkin;
  energy: { ice: number; fire: number };
  pointers: Map<number, { side: ElementSide }>;
  powerUp: null | {
    x: number;
    y: number;
    radius: number;
    kind: PowerUpKind;
    life: number;
    angle: number;
  };
  nextPowerUp: number;
  shields: { ice: number; fire: number };
};

const WORLD_W = 1600;
const WORLD_H = 900;
const WIN_SCORE = 7;
const POWER_UPS: Array<{ kind: PowerUpKind; symbol: string; label: string; color: string }> = [
  { kind: "overdrive", symbol: "»", label: "SURCHARGE", color: "#be8cff" },
  { kind: "shield", symbol: "◇", label: "BOUCLIER", color: "#8ff8ff" },
  { kind: "titan", symbol: "↕", label: "TITAN", color: "#ffd36c" },
];

const DIFFICULTY: Record<Difficulty, { label: string; subtitle: string; ai: number }> = {
  zen: { label: "ZEN", subtitle: "Pour découvrir", ai: 620 },
  arcade: { label: "ARCADE", subtitle: "Équilibré", ai: 790 },
  legend: { label: "LÉGENDE", subtitle: "Sans pitié", ai: 990 },
};

const stars = Array.from({ length: 92 }, (_, index) => ({
  x: ((index * 977) % 1591) + 4,
  y: ((index * 613) % 887) + 6,
  r: 0.7 + ((index * 31) % 15) / 10,
  a: 0.13 + ((index * 17) % 40) / 100,
  blue: index % 3 !== 0,
}));

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3 ? normalized.split("").map((part) => part + part).join("") : normalized, 16);
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function freshGame(
  mode: Mode,
  difficulty: Difficulty,
  palette: ElementSkin,
  campaignStage: CampaignStage | null = null,
): GameState {
  const playerHeight = campaignStage?.playerHeight ?? 174;
  const enemyHeight = campaignStage?.enemyHeight ?? 174;
  return {
    left: {
      x: 68,
      y: WORLD_H / 2 - playerHeight / 2,
      previousY: WORLD_H / 2 - playerHeight / 2,
      targetY: WORLD_H / 2,
      width: 24,
      height: playerHeight,
      baseHeight: playerHeight,
      boostTimer: 0,
    },
    right: {
      x: WORLD_W - 92,
      y: WORLD_H / 2 - enemyHeight / 2,
      previousY: WORLD_H / 2 - enemyHeight / 2,
      targetY: WORLD_H / 2,
      width: 24,
      height: enemyHeight,
      baseHeight: enemyHeight,
      boostTimer: 0,
    },
    ball: {
      x: WORLD_W / 2,
      y: WORLD_H / 2,
      vx: 0,
      vy: 0,
      radius: 19,
      element: "ice",
      trail: [],
    },
    particles: [],
    score: { ice: 0, fire: 0 },
    rally: 0,
    bestRally: 0,
    shake: 0,
    flash: 0,
    serveDelay: 0.82,
    servingTo: Math.random() > 0.5 ? "ice" : "fire",
    mode,
    difficulty,
    winScore: campaignStage?.winScore ?? WIN_SCORE,
    aiSpeed: campaignStage?.aiSpeed ?? DIFFICULTY[difficulty].ai,
    aiReaction: campaignStage?.reaction ?? (difficulty === "zen" ? 52 : difficulty === "arcade" ? 24 : 8),
    launchSpeed: campaignStage?.ballSpeed ?? 655,
    campaignStage,
    palette,
    energy: { ice: 0, fire: 0 },
    pointers: new Map(),
    powerUp: null,
    nextPowerUp: (campaignStage?.modifier === "chaos" ? 3.8 : 6.5) + Math.random() * 3.5,
    shields: { ice: 0, fire: 0 },
  };
}

function launchBall(game: GameState) {
  const direction = game.servingTo === "fire" ? 1 : -1;
  const angle = (Math.random() * 0.72 - 0.36) * Math.PI;
  const speed = game.launchSpeed;
  game.ball.vx = Math.cos(angle) * speed * direction;
  game.ball.vy = Math.sin(angle) * speed;
  game.ball.element = direction > 0 ? "ice" : "fire";
  game.serveDelay = 0;
}

function spawnImpact(game: GameState, x: number, y: number, element: ElementSide, amount = 28) {
  const colors =
    element === "ice"
      ? [game.palette.ice, game.palette.iceLight, "#69aaff", "#ffffff"]
      : [game.palette.fire, game.palette.fireLight, "#ff9d2d", "#ffffff"];
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 510;
    const maxLife = 0.28 + Math.random() * 0.58;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: 2 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function renderArena(ctx: CanvasRenderingContext2D, game: GameState, time: number) {
  ctx.save();
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  ctx.translate(shakeX, shakeY);

  const background = ctx.createLinearGradient(0, 0, WORLD_W, WORLD_H);
  background.addColorStop(0, "#061c35");
  background.addColorStop(0.38, "#07111f");
  background.addColorStop(0.62, "#170d16");
  background.addColorStop(1, "#35100d");
  ctx.fillStyle = background;
  ctx.fillRect(-30, -30, WORLD_W + 60, WORLD_H + 60);

  const leftGlow = ctx.createRadialGradient(80, WORLD_H / 2, 20, 80, WORLD_H / 2, 700);
  leftGlow.addColorStop(0, "rgba(32, 213, 255, .24)");
  leftGlow.addColorStop(1, "rgba(32, 213, 255, 0)");
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, WORLD_W / 2 + 100, WORLD_H);
  const rightGlow = ctx.createRadialGradient(WORLD_W - 80, WORLD_H / 2, 20, WORLD_W - 80, WORLD_H / 2, 700);
  rightGlow.addColorStop(0, "rgba(255, 62, 32, .23)");
  rightGlow.addColorStop(1, "rgba(255, 62, 32, 0)");
  ctx.fillStyle = rightGlow;
  ctx.fillRect(WORLD_W / 2 - 100, 0, WORLD_W / 2 + 100, WORLD_H);

  stars.forEach((star, index) => {
    const pulse = 0.7 + Math.sin(time * 0.0014 + index) * 0.3;
    ctx.fillStyle = star.blue
      ? `rgba(115, 225, 255, ${star.a * pulse})`
      : `rgba(255, 126, 83, ${star.a * pulse})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(255,255,255,.028)";
  ctx.lineWidth = 1;
  for (let x = 140; x < WORLD_W; x += 132) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = 80; y < WORLD_H; y += 104) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }

  ctx.setLineDash([10, 26]);
  ctx.strokeStyle = "rgba(255,255,255,.14)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WORLD_W / 2, 54);
  ctx.lineTo(WORLD_W / 2, WORLD_H - 54);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(WORLD_W / 2, WORLD_H / 2, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(WORLD_W / 2, WORLD_H / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fill();

  if (game.shields.ice > 0 || game.shields.fire > 0) {
    const drawShield = (side: ElementSide) => {
      const x = side === "ice" ? 22 : WORLD_W - 22;
      const color = side === "ice" ? game.palette.ice : game.palette.fire;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35 + Math.sin(time * 0.008) * 0.12;
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x, WORLD_H * 0.23);
      ctx.quadraticCurveTo(side === "ice" ? 48 : WORLD_W - 48, WORLD_H / 2, x, WORLD_H * 0.77);
      ctx.stroke();
      ctx.restore();
    };
    if (game.shields.ice > 0) drawShield("ice");
    if (game.shields.fire > 0) drawShield("fire");
  }

  if (game.powerUp) {
    const power = game.powerUp;
    const data = POWER_UPS.find((entry) => entry.kind === power.kind) ?? POWER_UPS[0];
    const pulse = 1 + Math.sin(time * 0.009) * 0.1;
    ctx.save();
    ctx.translate(power.x, power.y);
    ctx.rotate(power.angle);
    ctx.strokeStyle = data.color;
    ctx.shadowColor = data.color;
    ctx.shadowBlur = 28;
    ctx.globalAlpha = clamp(power.life / 1.5, 0.28, 1);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, power.radius * 1.35 * pulse, 0, Math.PI * 1.38);
    ctx.stroke();
    ctx.rotate(-power.angle * 2.1);
    ctx.globalAlpha *= 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, power.radius * 1.7, 0.4, Math.PI * 1.45);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 40px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = data.color;
    ctx.shadowBlur = 22;
    ctx.fillText(data.symbol, power.x, power.y - 2);
    ctx.restore();
  }

  game.ball.trail.forEach((point, index) => {
    const alpha = point.life * (index / Math.max(1, game.ball.trail.length));
    const size = game.ball.radius * (0.3 + point.life * 0.75);
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 2.3);
    const rgb = hexRgb(point.element === "ice" ? game.palette.ice : game.palette.fire);
    glow.addColorStop(0, `rgba(${rgb},${alpha * 0.7})`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size * 2.3, 0, Math.PI * 2);
    ctx.fill();
  });

  game.particles.forEach((particle) => {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 13;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  const drawPaddle = (paddle: Paddle, element: ElementSide) => {
    const color = element === "ice" ? game.palette.ice : game.palette.fire;
    const light = element === "ice" ? game.palette.iceLight : game.palette.fireLight;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 42;
    roundedRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 15);
    const gradient = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.52, light);
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };
  drawPaddle(game.left, "ice");
  drawPaddle(game.right, "fire");

  const ballColor = game.ball.element === "ice" ? game.palette.ice : game.palette.fire;
  const ballLight = game.ball.element === "ice" ? game.palette.iceLight : game.palette.fireLight;
  const aura = ctx.createRadialGradient(
    game.ball.x,
    game.ball.y,
    1,
    game.ball.x,
    game.ball.y,
    game.ball.radius * 3.4,
  );
  aura.addColorStop(0, ballLight);
  aura.addColorStop(0.25, ballColor);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.radius * 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = ballColor;
  ctx.shadowBlur = 35;
  ctx.fillStyle = ballLight;
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `${ballColor}99`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.radius * 1.72 + Math.sin(time * 0.012) * 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 3;
  roundedRect(ctx, 5, 5, WORLD_W - 10, WORLD_H - 10, 30);
  ctx.stroke();

  if (game.serveDelay > 0) {
    ctx.fillStyle = "rgba(5,8,17,.42)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const count = Math.max(1, Math.ceil(game.serveDelay * 3));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 96px Arial";
    ctx.shadowColor = game.servingTo === "ice" ? game.palette.ice : game.palette.fire;
    ctx.shadowBlur = 35;
    ctx.fillStyle = "white";
    ctx.fillText(String(count), WORLD_W / 2, WORLD_H / 2);
    ctx.shadowBlur = 0;
  }

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.3})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  ctx.restore();
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef(new Set<string>());
  const screenRef = useRef<Screen>("menu");
  const audioRef = useRef<AudioContext | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [screen, setScreenState] = useState<Screen>("menu");
  const [mode, setMode] = useState<Mode>("solo");
  const [menuTab, setMenuTab] = useState<MenuTab>("arena");
  const [difficulty, setDifficulty] = useState<Difficulty>("arcade");
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState({ ice: 0, fire: 0 });
  const [rally, setRally] = useState(0);
  const [winner, setWinner] = useState<ElementSide | null>(null);
  const [abilityNotice, setAbilityNotice] = useState<{ side: ElementSide; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [stats, setStats] = useState<PlayerStats>({ matches: 0, wins: 0, losses: 0, bestRally: 0 });
  const [profile, setProfile] = useState<V2Profile>(DEFAULT_PROFILE);
  const [currentStage, setCurrentStage] = useState<CampaignStage | null>(null);
  const [matchReward, setMatchReward] = useState<MatchReward | null>(null);
  const [energy, setEnergy] = useState({ ice: 0, fire: 0 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("elemental-pong-stats");
      if (stored) setStats(JSON.parse(stored) as PlayerStats);
      const storedProfile = localStorage.getItem("elemental-pong-v2-profile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as Partial<V2Profile>;
        setProfile({
          ...DEFAULT_PROFILE,
          ...parsed,
          stars: parsed.stars ?? {},
          ownedSkins: parsed.ownedSkins?.length ? parsed.ownedSkins : ["origin"],
          records: parsed.records ?? [],
        });
      }
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => undefined);
      }
    } catch {
      // Local storage and service workers are optional enhancements.
    }
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const setScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreenState(next);
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen support varies by browser and device.
    }
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  const activeSkin = ELEMENT_SKINS.find((skin) => skin.id === profile.activeSkin) ?? ELEMENT_SKINS[0];

  const persistProfile = useCallback((update: (previous: V2Profile) => V2Profile) => {
    setProfile((previous) => {
      const next = update(previous);
      try {
        localStorage.setItem("elemental-pong-v2-profile", JSON.stringify(next));
      } catch {
        // Progress remains available for the current session when storage is unavailable.
      }
      return next;
    });
  }, []);

  const playSound = useCallback(
    (kind: "hit" | "wall" | "score" | "launch", element: ElementSide = "ice") => {
      if (!sound) return;
      try {
        const context = audioRef.current ?? new AudioContext();
        audioRef.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        const frequencies = {
          hit: element === "ice" ? 370 : 245,
          wall: 170,
          score: element === "ice" ? 610 : 420,
          launch: 290,
        };
        oscillator.type = kind === "score" ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequencies[kind], now);
        oscillator.frequency.exponentialRampToValueAtTime(frequencies[kind] * (kind === "score" ? 1.8 : 0.72), now + 0.13);
        gain.gain.setValueAtTime(kind === "score" ? 0.1 : 0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === "score" ? 0.35 : 0.12));
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + (kind === "score" ? 0.36 : 0.13));
      } catch {
        // Audio is an enhancement; browsers may block it before interaction.
      }
    },
    [sound],
  );

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  }, []);

  const beginMatch = useCallback((nextMode: Mode, stage: CampaignStage | null) => {
    gameRef.current = freshGame(nextMode, difficulty, activeSkin, stage);
    setMode(nextMode);
    setCurrentStage(stage);
    setScore({ ice: 0, fire: 0 });
    setRally(0);
    setEnergy({ ice: 0, fire: 0 });
    setWinner(null);
    setMatchReward(null);
    setAbilityNotice(null);
    setScreen("playing");
    playSound("launch");
  }, [activeSkin, difficulty, playSound, setScreen]);

  const startGame = useCallback(() => beginMatch(mode === "duel" ? "duel" : "solo", null), [beginMatch, mode]);

  const startCampaignStage = useCallback((stage: CampaignStage) => {
    if (stage.id > profile.unlockedStage) return;
    beginMatch("campaign", stage);
  }, [beginMatch, profile.unlockedStage]);

  const buyOrEquipSkin = useCallback((skin: ElementSkin) => {
    persistProfile((previous) => {
      if (previous.ownedSkins.includes(skin.id)) return { ...previous, activeSkin: skin.id };
      if (previous.shards < skin.price) return previous;
      return {
        ...previous,
        shards: previous.shards - skin.price,
        ownedSkins: [...previous.ownedSkins, skin.id],
        activeSkin: skin.id,
      };
    });
  }, [persistProfile]);

  const togglePause = useCallback(() => {
    if (screenRef.current === "playing") setScreen("paused");
    else if (screenRef.current === "paused") setScreen("playing");
  }, [setScreen]);

  const activateUltimate = useCallback((side: ElementSide) => {
    const game = gameRef.current;
    if (!game || screenRef.current !== "playing" || game.energy[side] < 100) return;
    game.energy[side] = 0;
    game.shields[side] = 1;
    const paddle = side === "ice" ? game.left : game.right;
    paddle.boostTimer = Math.max(paddle.boostTimer, 6.5);
    if (game.ball.element === side && game.serveDelay <= 0) {
      const speed = Math.min(1420, Math.hypot(game.ball.vx, game.ball.vy) * 1.16);
      const angle = Math.atan2(game.ball.vy, game.ball.vx);
      game.ball.vx = Math.cos(angle) * speed;
      game.ball.vy = Math.sin(angle) * speed;
    }
    game.flash = 0.72;
    game.shake = 19;
    spawnImpact(game, side === "ice" ? game.left.x + 30 : game.right.x - 5, paddle.y + paddle.height / 2, side, 90);
    setEnergy({ ...game.energy });
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setAbilityNotice({ side, text: side === "ice" ? "ZÉRO ABSOLU" : "ÉRUPTION SOLAIRE" });
    noticeTimerRef.current = window.setTimeout(() => setAbilityNotice(null), 1900);
    playSound("score", side);
    vibrate([35, 25, 65]);
  }, [playSound, vibrate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase());
      if (["arrowup", "arrowdown", "w", "s"].includes(event.key.toLowerCase())) event.preventDefault();
      if ((event.key === "Escape" || event.key.toLowerCase() === "p") && !event.repeat) togglePause();
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [togglePause]);

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let previous = performance.now();

    const announceAbility = (side: ElementSide, text: string) => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      setAbilityNotice({ side, text });
      noticeTimerRef.current = window.setTimeout(() => setAbilityNotice(null), 1650);
    };

    const scorePoint = (element: ElementSide) => {
      game.score[element] += 1;
      const concedingSide: ElementSide = element === "ice" ? "fire" : "ice";
      game.energy[concedingSide] = Math.min(100, game.energy[concedingSide] + 16);
      setEnergy({ ...game.energy });
      game.rally = 0;
      setRally(0);
      setScore({ ...game.score });
      game.shake = 22;
      game.flash = 1;
      game.ball.vx = 0;
      game.ball.vy = 0;
      game.ball.x = WORLD_W / 2;
      game.ball.y = WORLD_H / 2;
      game.ball.trail = [];
      game.ball.element = element;
      game.servingTo = element === "ice" ? "fire" : "ice";
      game.serveDelay = 1.05;
      spawnImpact(game, element === "ice" ? WORLD_W - 50 : 50, WORLD_H / 2, element, 70);
      playSound("score", element);
      vibrate([35, 35, 75]);
      if (game.score[element] >= game.winScore) {
        setWinner(element);
        const record: MatchRecord = {
          id: `${Date.now()}-${game.mode}`,
          date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          label: game.campaignStage
            ? `ARÈNE ${String(game.campaignStage.id).padStart(2, "0")} · ${game.campaignStage.name}`
            : game.mode === "duel"
              ? "DUEL LOCAL"
              : `SOLO · ${DIFFICULTY[game.difficulty].label}`,
          result: element === "ice" ? "victoire" : "défaite",
          ice: game.score.ice,
          fire: game.score.fire,
          rally: game.bestRally,
        };

        if (game.mode === "campaign" && game.campaignStage && element === "ice") {
          const stage = game.campaignStage;
          const starsEarned = game.score.fire === 0 ? 3 : game.score.fire <= 2 ? 2 : 1;
          const previousStars = profile.stars[String(stage.id)] ?? 0;
          const shardReward = previousStars > 0
            ? Math.ceil(stage.reward * 0.28) + starsEarned * 2
            : stage.reward + starsEarned * 8;
          const nextStage = stage.id < CAMPAIGN_STAGES.length ? stage.id + 1 : null;
          setMatchReward({ stars: starsEarned, shards: shardReward, nextStage });
          persistProfile((previous) => ({
            ...previous,
            unlockedStage: Math.max(previous.unlockedStage, nextStage ?? stage.id),
            stars: { ...previous.stars, [String(stage.id)]: Math.max(previous.stars[String(stage.id)] ?? 0, starsEarned) },
            shards: previous.shards + shardReward,
            records: [record, ...previous.records].slice(0, 8),
          }));
        } else {
          persistProfile((previous) => ({ ...previous, records: [record, ...previous.records].slice(0, 8) }));
        }

        setStats((previousStats) => {
          const nextStats = {
            matches: previousStats.matches + 1,
            wins: previousStats.wins + (game.mode !== "duel" && element === "ice" ? 1 : 0),
            losses: previousStats.losses + (game.mode !== "duel" && element === "fire" ? 1 : 0),
            bestRally: Math.max(previousStats.bestRally, game.bestRally),
          };
          try {
            localStorage.setItem("elemental-pong-stats", JSON.stringify(nextStats));
          } catch {
            // The game remains fully playable when storage is unavailable.
          }
          return nextStats;
        });
        setScreen("ended");
      }
    };

    const update = (dt: number) => {
      const keyboardSpeed = 850 * dt;
      const keys = keysRef.current;
      if (keys.has("w")) game.left.targetY -= keyboardSpeed;
      if (keys.has("s")) game.left.targetY += keyboardSpeed;
      if (game.mode === "duel") {
        if (keys.has("arrowup")) game.right.targetY -= keyboardSpeed;
        if (keys.has("arrowdown")) game.right.targetY += keyboardSpeed;
      } else {
        const bossRage = game.campaignStage?.modifier === "boss" && game.score.ice >= game.winScore - 2 ? 1.12 : 1;
        const aiSpeed = game.aiSpeed * bossRage * dt;
        const reaction = game.aiReaction / bossRage;
        const target = game.ball.vx > 0 ? game.ball.y : WORLD_H / 2;
        const center = game.right.y + game.right.height / 2;
        if (Math.abs(target - center) > reaction) game.right.targetY += clamp(target - center, -aiSpeed, aiSpeed);
      }

      for (const paddle of [game.left, game.right]) {
        paddle.boostTimer = Math.max(0, paddle.boostTimer - dt);
        const centerBeforeResize = paddle.y + paddle.height / 2;
        const desiredHeight = paddle.baseHeight * (paddle.boostTimer > 0 ? 1.38 : 1);
        paddle.height += (desiredHeight - paddle.height) * Math.min(1, dt * 8);
        paddle.y = centerBeforeResize - paddle.height / 2;
        paddle.targetY = clamp(paddle.targetY, paddle.height / 2 + 24, WORLD_H - paddle.height / 2 - 24);
        paddle.previousY = paddle.y;
        const targetTop = paddle.targetY - paddle.height / 2;
        paddle.y += (targetTop - paddle.y) * Math.min(1, dt * 15);
        paddle.y = clamp(paddle.y, 22, WORLD_H - paddle.height - 22);
      }

      if (!game.powerUp) {
        game.nextPowerUp -= dt;
        if (game.nextPowerUp <= 0) {
          const data = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
          game.powerUp = {
            x: WORLD_W * (0.33 + Math.random() * 0.34),
            y: WORLD_H * (0.2 + Math.random() * 0.6),
            radius: 29,
            kind: data.kind,
            life: 9,
            angle: Math.random() * Math.PI,
          };
        }
      } else {
        game.powerUp.life -= dt;
        game.powerUp.angle += dt * 1.7;
        if (game.powerUp.life <= 0) {
          game.powerUp = null;
          game.nextPowerUp = 5.5 + Math.random() * 4;
        }
      }

      if (game.serveDelay > 0) {
        game.serveDelay -= dt;
        if (game.serveDelay <= 0) {
          launchBall(game);
          playSound("launch", game.ball.element);
        }
      } else {
        const ball = game.ball;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.trail.push({ x: ball.x, y: ball.y, life: 1, element: ball.element });
        if (ball.trail.length > 32) ball.trail.shift();

        if (game.powerUp) {
          const distance = Math.hypot(ball.x - game.powerUp.x, ball.y - game.powerUp.y);
          if (distance < ball.radius + game.powerUp.radius) {
            const captured = game.powerUp;
            const side = ball.element;
            const powerData = POWER_UPS.find((entry) => entry.kind === captured.kind) ?? POWER_UPS[0];
            if (captured.kind === "overdrive") {
              const speed = Math.min(1390, Math.hypot(ball.vx, ball.vy) * 1.28);
              const angle = Math.atan2(ball.vy, ball.vx);
              ball.vx = Math.cos(angle) * speed;
              ball.vy = Math.sin(angle) * speed;
            } else if (captured.kind === "shield") {
              game.shields[side] = 1;
            } else {
              const paddle = side === "ice" ? game.left : game.right;
              paddle.boostTimer = 7.5;
            }
            spawnImpact(game, captured.x, captured.y, side, 64);
            game.shake = 13;
            game.flash = 0.42;
            game.powerUp = null;
            game.nextPowerUp = 7 + Math.random() * 4;
            announceAbility(side, powerData.label);
            playSound("score", side);
            vibrate([18, 22, 42]);
          }
        }

        if (ball.y - ball.radius <= 13 && ball.vy < 0) {
          ball.y = 13 + ball.radius;
          ball.vy *= -1;
          spawnImpact(game, ball.x, ball.y, ball.element, 12);
          playSound("wall", ball.element);
        }
        if (ball.y + ball.radius >= WORLD_H - 13 && ball.vy > 0) {
          ball.y = WORLD_H - 13 - ball.radius;
          ball.vy *= -1;
          spawnImpact(game, ball.x, ball.y, ball.element, 12);
          playSound("wall", ball.element);
        }

        const collide = (paddle: Paddle, side: ElementSide) => {
          const isLeft = side === "ice";
          const entering = isLeft ? ball.vx < 0 : ball.vx > 0;
          if (!entering) return;
          const insideY = ball.y + ball.radius > paddle.y && ball.y - ball.radius < paddle.y + paddle.height;
          const insideX = isLeft
            ? ball.x - ball.radius <= paddle.x + paddle.width && ball.x > paddle.x
            : ball.x + ball.radius >= paddle.x && ball.x < paddle.x + paddle.width;
          if (!insideX || !insideY) return;

          const offset = clamp((ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2), -1, 1);
          const paddleVelocity = (paddle.y - paddle.previousY) / Math.max(dt, 0.001);
          const currentSpeed = Math.min(1340, Math.hypot(ball.vx, ball.vy) * 1.045 + 12);
          const angle = offset * 0.92;
          ball.vx = Math.cos(angle) * currentSpeed * (isLeft ? 1 : -1);
          ball.vy = Math.sin(angle) * currentSpeed + paddleVelocity * 0.16;
          ball.x = isLeft ? paddle.x + paddle.width + ball.radius + 2 : paddle.x - ball.radius - 2;
          ball.element = side;
          game.rally += 1;
          game.bestRally = Math.max(game.bestRally, game.rally);
          game.energy[side] = Math.min(100, game.energy[side] + 11 + Math.min(5, Math.floor(game.rally / 4)));
          game.shake = Math.min(11, 3 + currentSpeed / 230);
          spawnImpact(game, ball.x, ball.y, side, 24 + Math.min(22, game.rally));
          setRally(game.rally);
          setEnergy({ ...game.energy });
          playSound("hit", side);
          vibrate(game.rally > 8 ? 26 : 12);
          if (side === "fire" && game.mode !== "duel" && game.energy.fire >= 100) activateUltimate("fire");
        };
        collide(game.left, "ice");
        collide(game.right, "fire");

        if (ball.x < 18 && ball.vx < 0 && game.shields.ice > 0) {
          game.shields.ice = 0;
          ball.x = 38;
          ball.vx = Math.abs(ball.vx) * 1.04;
          ball.element = "ice";
          spawnImpact(game, 24, ball.y, "ice", 72);
          game.shake = 18;
          announceAbility("ice", "SAUVETAGE");
          playSound("score", "ice");
          vibrate([30, 20, 55]);
        } else if (ball.x > WORLD_W - 18 && ball.vx > 0 && game.shields.fire > 0) {
          game.shields.fire = 0;
          ball.x = WORLD_W - 38;
          ball.vx = -Math.abs(ball.vx) * 1.04;
          ball.element = "fire";
          spawnImpact(game, WORLD_W - 24, ball.y, "fire", 72);
          game.shake = 18;
          announceAbility("fire", "SAUVETAGE");
          playSound("score", "fire");
          vibrate([30, 20, 55]);
        } else if (ball.x < -70) scorePoint("fire");
        else if (ball.x > WORLD_W + 70) scorePoint("ice");
      }

      game.ball.trail.forEach((point) => {
        point.life -= dt * 2.7;
      });
      game.ball.trail = game.ball.trail.filter((point) => point.life > 0);
      game.particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.1, dt);
        particle.vy *= Math.pow(0.1, dt);
        particle.life -= dt;
      });
      game.particles = game.particles.filter((particle) => particle.life > 0).slice(-280);
      game.shake = Math.max(0, game.shake - dt * 35);
      game.flash = Math.max(0, game.flash - dt * 2.8);
    };

    const loop = (now: number) => {
      if (screenRef.current !== "playing") return;
      const dt = Math.min(0.026, (now - previous) / 1000);
      previous = now;
      update(dt);
      renderArena(ctx, game, now);
      animationRef.current = requestAnimationFrame(loop);
    };
    renderArena(ctx, game, performance.now());
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [activateUltimate, persistProfile, playSound, profile.stars, screen, setScreen, vibrate]);

  useEffect(() => {
    if ((screen === "paused" || screen === "ended") && gameRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) renderArena(ctx, gameRef.current, performance.now());
    }
  }, [screen]);

  useEffect(() => {
    if (screen === "menu") return;
    const resetViewport = () => window.scrollTo(0, 0);
    resetViewport();
    const frame = window.requestAnimationFrame(resetViewport);
    window.visualViewport?.addEventListener("resize", resetViewport);
    window.addEventListener("orientationchange", resetViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener("resize", resetViewport);
      window.removeEventListener("orientationchange", resetViewport);
    };
  }, [screen]);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WORLD_W,
      y: ((event.clientY - rect.top) / rect.height) * WORLD_H,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    if (!game || screenRef.current !== "playing") return;
    const position = pointerPosition(event);
    const side: ElementSide = game.mode !== "duel" || position.x < WORLD_W / 2 ? "ice" : "fire";
    game.pointers.set(event.pointerId, { side });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (side === "ice") game.left.targetY = position.y;
    else game.right.targetY = position.y;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    const pointer = game?.pointers.get(event.pointerId);
    if (!game || !pointer) return;
    const position = pointerPosition(event);
    if (pointer.side === "ice") game.left.targetY = position.y;
    else game.right.targetY = position.y;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    gameRef.current?.pointers.delete(event.pointerId);
  };

  const returnToMenu = () => {
    setScreen("menu");
    setMenuTab(mode === "campaign" ? "campaign" : "arena");
  };

  const totalStars = Object.values(profile.stars).reduce((sum, value) => sum + value, 0);
  const completedStages = Object.keys(profile.stars).length;

  return (
    <main className={`app-shell ${screen !== "menu" ? "game-active" : ""}`}>
      <div className="ambient ambient-ice" />
      <div className="ambient ambient-fire" />
      <div className="grain" />

      {screen === "menu" ? (
        <section className="menu-panel" aria-labelledby="game-title">
          <div className="menu-topbar">
            <div className="brand-chip"><span className="brand-dot" /> CR3@TIX GAME LAB</div>
            <div className="menu-actions">
              <button className="utility-button" onClick={() => setShowGuide(true)} aria-label="Afficher les règles">?</button>
              <button className="utility-button" onClick={enterFullscreen} aria-label="Afficher en plein écran">⛶</button>
              {installPrompt && !isStandalone && <button className="install-button" onClick={installApp}>↓ INSTALLER</button>}
              {isStandalone && <span className="installed-chip">✓ INSTALLÉE</span>}
            </div>
          </div>
          <div className="title-wrap">
            <p className="eyebrow">LA GUERRE DES ÉLÉMENTS ÉVOLUE</p>
            <h1 id="game-title"><span className="ice-text">CR3@TIX</span><span className="fire-text">PONG</span></h1>
            <p className="lead">Traverse les 12 arènes, terrasse les gardiens et forge ton élément.</p>
          </div>

          <nav className="v2-nav" aria-label="Sections du jeu">
            <button className={menuTab === "arena" ? "active" : ""} onClick={() => { setMenuTab("arena"); if (mode === "campaign") setMode("solo"); }}><span>◈</span> ARÈNE</button>
            <button className={menuTab === "campaign" ? "active" : ""} onClick={() => setMenuTab("campaign")}><span>⌁</span> CAMPAGNE</button>
            <button className={menuTab === "arsenal" ? "active" : ""} onClick={() => setMenuTab("arsenal")}><span>✦</span> ARSENAL</button>
            <button className={menuTab === "records" ? "active" : ""} onClick={() => setMenuTab("records")}><span>▥</span> DOSSIER</button>
          </nav>

          {menuTab === "arena" && (
            <div className="tab-content arena-tab">
              <button className="campaign-banner" onClick={() => setMenuTab("campaign")}>
                <span className="campaign-orb">◆</span>
                <span><small>NOUVEAU MODE</small><strong>CAMPAGNE ASCENSION</strong><em>{completedStages}/12 ARÈNES · {totalStars}/36 ÉTOILES</em></span>
                <span className="campaign-arrow">→</span>
              </button>

              <div className="setup-card">
                <div className="setup-section">
                  <span className="section-label">COMBAT LIBRE</span>
                  <div className="mode-grid">
                    <button className={`choice-card ice-choice ${mode === "solo" ? "selected" : ""}`} onClick={() => setMode("solo")}>
                      <span className="choice-icon">❄</span><span><strong>SOLO</strong><small>Affronte l’intelligence du feu</small></span><span className="radio" />
                    </button>
                    <button className={`choice-card fire-choice ${mode === "duel" ? "selected" : ""}`} onClick={() => setMode("duel")}>
                      <span className="choice-icon">♨</span><span><strong>DUEL LOCAL</strong><small>Deux joueurs, un même écran</small></span><span className="radio" />
                    </button>
                  </div>
                </div>

                {mode !== "duel" && (
                  <div className="setup-section difficulty-section">
                    <span className="section-label">INTENSITÉ</span>
                    <div className="difficulty-grid">
                      {(Object.keys(DIFFICULTY) as Difficulty[]).map((level) => (
                        <button key={level} className={difficulty === level ? "active" : ""} onClick={() => setDifficulty(level)}>
                          <strong>{DIFFICULTY[level].label}</strong><small>{DIFFICULTY[level].subtitle}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button className="launch-button" onClick={startGame}>
                  <span>ENTRER DANS L’ARÈNE</span><span className="launch-arrow">→</span>
                </button>
              </div>
            </div>
          )}

          {menuTab === "campaign" && (
            <div className="tab-content campaign-panel">
              <div className="panel-heading">
                <div><span>MODE HISTOIRE</span><h2>LA ROUTE DE L’ASCENSION</h2><p>Remporte chaque duel pour ouvrir l’arène suivante. Les boss gardent les portes de chaque royaume.</p></div>
                <div className="currency-card"><strong>{profile.shards}</strong><small>FRAGMENTS</small></div>
              </div>
              <div className="campaign-progress"><span style={{ width: `${Math.min(100, (completedStages / CAMPAIGN_STAGES.length) * 100)}%` }} /><strong>{completedStages}/12</strong></div>
              {CHAPTERS.map((chapter) => (
                <section className="chapter" key={chapter.id}>
                  <header><span style={{ color: chapter.color }}>{chapter.label}</span><strong>{chapter.name}</strong></header>
                  <div className="stage-grid">
                    {CAMPAIGN_STAGES.filter((stage) => stage.chapter === chapter.id).map((stage) => {
                      const locked = stage.id > profile.unlockedStage;
                      const stageStars = profile.stars[String(stage.id)] ?? 0;
                      return (
                        <button key={stage.id} className={`stage-card ${stage.boss ? "boss" : ""} ${locked ? "locked" : ""} ${stageStars ? "cleared" : ""}`} onClick={() => startCampaignStage(stage)} disabled={locked}>
                          <span className="stage-number">{locked ? "▣" : String(stage.id).padStart(2, "0")}</span>
                          <span className="stage-copy"><small>{stage.boss ? `BOSS · ${stage.boss}` : stage.modifier.toUpperCase()}</small><strong>{stage.name}</strong><em>{stage.subtitle}</em></span>
                          <span className="stage-stars">{stageStars ? `${"★".repeat(stageStars)}${"☆".repeat(3 - stageStars)}` : locked ? "VERROUILLÉ" : `+${stage.reward} ◆`}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {menuTab === "arsenal" && (
            <div className="tab-content arsenal-panel">
              <div className="panel-heading">
                <div><span>PERSONNALISATION</span><h2>ARSENAL ÉLÉMENTAIRE</h2><p>Les fragments gagnés dans la campagne permettent de forger de nouvelles signatures visuelles.</p></div>
                <div className="currency-card"><strong>{profile.shards}</strong><small>FRAGMENTS</small></div>
              </div>
              <div className="skin-grid">
                {ELEMENT_SKINS.map((skin) => {
                  const owned = profile.ownedSkins.includes(skin.id);
                  const active = profile.activeSkin === skin.id;
                  const affordable = profile.shards >= skin.price;
                  return (
                    <article className={`skin-card ${active ? "active" : ""}`} key={skin.id}>
                      <div className="skin-preview" style={{ background: `linear-gradient(110deg, ${skin.ice}24, #070a16 48%, ${skin.fire}24)` }}>
                        <i style={{ background: skin.ice, boxShadow: `0 0 24px ${skin.ice}` }} /><b style={{ background: `linear-gradient(90deg, ${skin.ice}, ${skin.fire})` }} /><i style={{ background: skin.fire, boxShadow: `0 0 24px ${skin.fire}` }} />
                      </div>
                      <div className="skin-info"><span><strong>{skin.name}</strong><small>{skin.subtitle}</small></span>{active && <em>ÉQUIPÉ</em>}</div>
                      <button onClick={() => buyOrEquipSkin(skin)} disabled={active || (!owned && !affordable)}>
                        {active ? "SIGNATURE ACTIVE" : owned ? "ÉQUIPER" : affordable ? `DÉBLOQUER · ${skin.price} ◆` : `MANQUE ${skin.price - profile.shards} ◆`}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {menuTab === "records" && (
            <div className="tab-content records-panel">
              <div className="panel-heading"><div><span>ARCHIVES LOCALES</span><h2>DOSSIER DE COMBAT</h2><p>Toute ta progression est sauvegardée sur cet appareil, même hors connexion.</p></div></div>
              <div className="record-stats">
                <article><small>MATCHS</small><strong>{stats.matches}</strong></article>
                <article><small>VICTOIRES</small><strong>{stats.wins}</strong></article>
                <article><small>MEILLEUR ÉCHANGE</small><strong>{stats.bestRally}</strong></article>
                <article><small>ÉTOILES</small><strong>{totalStars}<i>/36</i></strong></article>
              </div>
              <div className="history-card">
                <header><span>DERNIERS COMBATS</span><small>RÉSULTAT · SCORE · ÉCHANGE</small></header>
                {profile.records.length === 0 ? (
                  <div className="empty-records"><span>◇</span><strong>AUCUN COMBAT ARCHIVÉ</strong><p>Entre dans l’arène pour inscrire ton premier résultat.</p></div>
                ) : profile.records.map((record) => (
                  <article key={record.id} className={record.result}>
                    <span className="result-dot" /><span className="record-name"><strong>{record.label}</strong><small>{record.date}</small></span>
                    <span className="record-result">{record.result.toUpperCase()}</span><strong className="record-score">{record.ice}—{record.fire}</strong><small className="record-rally">×{record.rally}</small>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="feature-row" aria-label="Fonctionnalités principales">
            <span>✦ 12 ARÈNES</span><i /><span>♛ 3 BOSS</span><i /><span>◉ TACTILE</span><i /><span>∞ HORS LIGNE</span>
          </div>
        </section>
      ) : (
        <section className="arena-screen" aria-label="Arène CR3@TIX PONG">
          <header className="game-header">
            <button className="icon-button" onClick={returnToMenu} aria-label="Quitter la partie">←</button>
            <div className="mini-brand"><span>CR3@TIX PONG</span></div>
            <div className="header-actions">
              <button className="icon-button" onClick={() => setSound((value) => !value)} aria-label={sound ? "Couper le son" : "Activer le son"}>{sound ? "♪" : "×"}</button>
              <button className="icon-button" onClick={enterFullscreen} aria-label="Afficher en plein écran">⛶</button>
              <button className="icon-button" onClick={togglePause} aria-label="Mettre en pause">Ⅱ</button>
            </div>
          </header>

          <div className="scoreboard">
            <div className="team-score ice-score"><span>GLACE</span><strong>{score.ice}</strong></div>
            <div className="match-status"><span>{mode === "campaign" && currentStage ? `ARÈNE ${String(currentStage.id).padStart(2, "0")} · ${currentStage.boss ?? currentStage.name}` : mode === "solo" ? `SOLO · ${DIFFICULTY[difficulty].label}` : "DUEL LOCAL"}</span><strong>PREMIER À {currentStage?.winScore ?? WIN_SCORE}</strong><small>{rally ? `ÉCHANGE × ${rally}` : currentStage?.boss ? "COMBAT DE BOSS" : "PRÊT AU COMBAT"}</small></div>
            <div className="team-score fire-score"><strong>{score.fire}</strong><span>FEU</span></div>
          </div>

          <div className="energy-hud">
            <button className={`ultimate-button ice ${energy.ice >= 100 ? "ready" : ""}`} onClick={() => activateUltimate("ice")} disabled={energy.ice < 100}>
              <span><i style={{ width: `${energy.ice}%` }} /></span><strong>ZÉRO ABSOLU</strong><b>{Math.round(energy.ice)}%</b>
            </button>
            {currentStage?.boss && <div className="boss-chip"><span>♛</span><strong>{currentStage.boss}</strong><small>GARDIEN</small></div>}
            <button className={`ultimate-button fire ${energy.fire >= 100 ? "ready" : ""}`} onClick={() => activateUltimate("fire")} disabled={mode !== "duel" || energy.fire < 100}>
              <b>{Math.round(energy.fire)}%</b><strong>ÉRUPTION SOLAIRE</strong><span><i style={{ width: `${energy.fire}%` }} /></span>
            </button>
          </div>

          <div className="canvas-frame">
            <canvas
              ref={canvasRef}
              width={WORLD_W}
              height={WORLD_H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label="Terrain de jeu. Faites glisser votre doigt verticalement pour déplacer la raquette."
            />
            <div className="side-label side-label-left">GLACE</div>
            <div className="side-label side-label-right">FEU</div>
            {abilityNotice && <div className={`ability-notice ${abilityNotice.side}`}>{abilityNotice.text}</div>}
            {screen === "paused" && (
              <div className="game-overlay">
                <div className="overlay-card"><span className="overlay-symbol">Ⅱ</span><p>COMBAT SUSPENDU</p><h2>PAUSE</h2><button onClick={togglePause}>REPRENDRE</button><button className="ghost-action" onClick={returnToMenu}>QUITTER L’ARÈNE</button></div>
              </div>
            )}
            {screen === "ended" && (
              <div className="game-overlay">
                {mode === "campaign" && currentStage ? (
                  <div className={`overlay-card winner-card campaign-result ${winner}`}>
                    <span className="overlay-symbol">{winner === "ice" ? "♛" : "✕"}</span>
                    <p>{winner === "ice" ? `ARÈNE ${String(currentStage.id).padStart(2, "0")} CONQUISE` : "L’ÉLÉMENT A CÉDÉ"}</p>
                    <h2>{winner === "ice" ? "VICTOIRE" : "DÉFAITE"}</h2>
                    {winner === "ice" && matchReward && <div className="reward-line"><span>{"★".repeat(matchReward.stars)}{"☆".repeat(3 - matchReward.stars)}</span><strong>+{matchReward.shards} ◆</strong></div>}
                    {winner === "ice" && matchReward?.nextStage && (
                      <button onClick={() => startCampaignStage(CAMPAIGN_STAGES[matchReward.nextStage! - 1])}>ARÈNE SUIVANTE</button>
                    )}
                    <button className={winner === "ice" && matchReward?.nextStage ? "ghost-action" : ""} onClick={() => startCampaignStage(currentStage)}>REJOUER L’ARÈNE</button>
                    <button className="ghost-action" onClick={returnToMenu}>CARTE DE CAMPAGNE</button>
                  </div>
                ) : (
                  <div className={`overlay-card winner-card ${winner}`}><span className="overlay-symbol">{winner === "ice" ? "❄" : "♨"}</span><p>VICTOIRE DE L’ÉLÉMENT</p><h2>{winner === "ice" ? "GLACE" : "FEU"}</h2><button onClick={startGame}>REVANCHE</button><button className="ghost-action" onClick={returnToMenu}>MENU PRINCIPAL</button></div>
                )}
              </div>
            )}
          </div>
          <p className="control-tip">{mode !== "duel" ? "GLISSE TON DOIGT POUR PILOTER LA GLACE" : "CHAQUE JOUEUR CONTRÔLE SON CÔTÉ"}<span>CLAVIER : W/S · ↑/↓ · P POUR PAUSE</span></p>
        </section>
      )}
      {showGuide && (
        <div className="global-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={() => setShowGuide(false)}>
          <div className="guide-card" onClick={(event) => event.stopPropagation()}>
            <button className="guide-close" onClick={() => setShowGuide(false)} aria-label="Fermer">×</button>
            <span className="guide-kicker">PROTOCOLE DE COMBAT</span>
            <h2 id="guide-title">COMMENT JOUER</h2>
            <div className="guide-list">
              <article><span>01</span><div><strong>PILOTE TA RAQUETTE</strong><p>Glisse verticalement sur l’arène. Sur ordinateur, utilise W et S.</p></div></article>
              <article><span>02</span><div><strong>DONNE DE L’EFFET</strong><p>Frappe avec le haut ou le bas de la raquette pour changer l’angle de la balle.</p></div></article>
              <article><span>03</span><div><strong>CAPTURE LES POUVOIRS</strong><p>Surcharge, bouclier et mode Titan apparaissent pendant les longs échanges.</p></div></article>
              <article><span>04</span><div><strong>LIBÈRE TON ULTIME</strong><p>Charge ta jauge à 100 %, puis déclenche Zéro Absolu pour obtenir Titan et un bouclier.</p></div></article>
              <article><span>05</span><div><strong>CONQUIERS LA CAMPAGNE</strong><p>Gagne jusqu’à trois étoiles par arène, terrasse les boss et débloque de nouvelles signatures.</p></div></article>
            </div>
            <button className="guide-action" onClick={() => setShowGuide(false)}>J’AI COMPRIS</button>
          </div>
        </div>
      )}
      {screen === "menu" && <footer><span>CR3@TIX</span><small>DE L’IMAGINATION À LA CONCEPTION</small></footer>}
    </main>
  );
}
