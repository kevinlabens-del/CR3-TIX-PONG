"use client";

/* eslint-disable react-hooks/immutability -- Le moteur Canvas utilise un état impératif isolé des rendus React. */
/* eslint-disable react-hooks/set-state-in-effect -- La sauvegarde locale et l'état PWA sont hydratés après le montage client. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderArena, spawnImpact, type RenderOptions } from "./arena-renderer";
import {
  FIXED_STEP,
  MAX_BALL_SPEED,
  MAX_BALLS,
  MAX_FRAME_DELTA,
  WORLD_H,
  WORLD_W,
  addXp,
  achievementValue,
  comboForRally,
  dailyChallengeForDate,
  evaluateStageObjectives,
  localDateKey,
  parseImportedProfile,
  pickWeightedPowerUp,
  randomRange,
  reflectedTargetY,
  resolvedQuality,
  seededRandom,
  stableBallVelocity,
  sweptPaddleCollision,
  unlockAchievements,
  visualBudget,
} from "./game-core";
import {
  DEFAULT_DUEL_CONFIG,
  freshGame,
  launchServe,
  makeBall,
  type Ball,
  type Barrier,
  type DuelConfig,
  type GameState,
  type Paddle,
} from "./game-state";
import {
  ACHIEVEMENTS,
  ARSENAL_CATEGORIES,
  CAMPAIGN_STAGES,
  CHAPTERS,
  COSMETICS,
  DEFAULT_PROFILE,
  DIFFICULTIES,
  ELEMENT_SKINS,
  LEGACY_PROFILE_KEY,
  LEGACY_STATS_KEY,
  MODE_LABELS,
  POWER_UPS,
  PROFILE_KEY,
  migrateV2Profile,
  normalizeProfile,
  xpForLevel,
  type ArsenalCategory,
  type CampaignStage,
  type Difficulty,
  type ElementSide,
  type GameMode,
  type GameSettings,
  type MatchRecord,
  type PowerUpKind,
  type Quality,
  type V3Profile,
} from "./v3-data";

type Screen = "menu" | "playing" | "paused" | "ended";
type MenuTab = "arena" | "campaign" | "modes" | "arsenal" | "achievements" | "records" | "settings";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type MatchResult = {
  won: boolean;
  score: { ice: number; fire: number };
  stars: number;
  objectives: string[];
  shards: number;
  xp: number;
  duration: number;
  bestRally: number;
  newRecord: boolean;
  nextStage: number | null;
  advice: string;
};

type Notice = { side: ElementSide | "neutral"; text: string; detail?: string };

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const WIN_SCORE = 7;
const BOSS_RUSH_STAGES = [CAMPAIGN_STAGES[3], CAMPAIGN_STAGES[7], CAMPAIGN_STAGES[11]];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function opposite(side: ElementSide): ElementSide {
  return side === "ice" ? "fire" : "ice";
}

function formatTime(totalSeconds: number, precise = false) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${precise ? `.${tenths}` : ""}`;
}

function rarityLabel(value: string) {
  return value === "epique" ? "ÉPIQUE" : value === "legendaire" ? "LÉGENDAIRE" : value.toUpperCase();
}

function matchAdvice(game: GameState, won: boolean) {
  if (won) return game.metrics.perfectHits.ice >= 3 ? "Précision parfaite : garde ce rythme." : "Victoire maîtrisée. Vise encore plus le centre.";
  if (game.bestRally < 8) return "Reste au centre entre deux frappes pour couvrir les angles.";
  if (game.metrics.smashes.ice === 0) return "Accélère ta raquette au moment du contact pour déclencher un Smash.";
  return "Observe le départ de balle avant de corriger ta position.";
}

export default function PongV3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef(new Set<string>());
  const screenRef = useRef<Screen>("menu");
  const profileRef = useRef<V3Profile>(DEFAULT_PROFILE);
  const renderOptionsRef = useRef<RenderOptions>({ screenShake: true, flashes: true, reduceEffects: false, ballStyle: "core", trailStyle: "ion", impactStyle: "spark", arenaStyle: "ascension" });
  const audioRef = useRef<AudioContext | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const uiSecondRef = useRef(-1);
  const tutorialStepRef = useRef(-1);
  const pendingImportRef = useRef<V3Profile | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [screen, setScreenState] = useState<Screen>("menu");
  const [menuTab, setMenuTab] = useState<MenuTab>("arena");
  const [arenaMode, setArenaMode] = useState<"solo" | "duel">("solo");
  const [mode, setMode] = useState<GameMode>("solo");
  const [difficulty, setDifficulty] = useState<Difficulty>("arcade");
  const [duelConfig, setDuelConfig] = useState<DuelConfig>(DEFAULT_DUEL_CONFIG);
  const [profile, setProfile] = useState<V3Profile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [currentStage, setCurrentStage] = useState<CampaignStage | null>(null);
  const [score, setScore] = useState({ ice: 0, fire: 0 });
  const [sets, setSets] = useState({ ice: 0, fire: 0 });
  const [rally, setRally] = useState(0);
  const [combo, setCombo] = useState(1);
  const [energy, setEnergy] = useState({ ice: 0, fire: 0 });
  const [lives, setLives] = useState(0);
  const [bossPhase, setBossPhase] = useState(0);
  const [bossRushIndexDisplay, setBossRushIndexDisplay] = useState(0);
  const [ultimatesEnabledDisplay, setUltimatesEnabledDisplay] = useState(true);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const [abilityNotice, setAbilityNotice] = useState<Notice | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [achievementToast, setAchievementToast] = useState<string[]>([]);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTutorialOffer, setShowTutorialOffer] = useState(false);
  const [tutorialStep, setTutorialStepState] = useState(-1);
  const [arsenalCategory, setArsenalCategory] = useState<ArsenalCategory>("paddles");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importError, setImportError] = useState("");

  const setScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreenState(next);
  }, []);

  const setTutorialStep = useCallback((next: number) => {
    tutorialStepRef.current = next;
    setTutorialStepState(next);
  }, []);

  const persistProfile = useCallback((update: (previous: V3Profile) => V3Profile) => {
    setProfile((previous) => {
      const next = normalizeProfile(update(previous));
      profileRef.current = next;
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        // La session reste jouable quand le stockage local est indisponible.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      let nextProfile: V3Profile;
      const storedV3 = localStorage.getItem(PROFILE_KEY);
      if (storedV3) {
        nextProfile = normalizeProfile(JSON.parse(storedV3) as Partial<V3Profile>);
      } else {
        const storedV2 = localStorage.getItem(LEGACY_PROFILE_KEY);
        const storedStats = localStorage.getItem(LEGACY_STATS_KEY);
        nextProfile = migrateV2Profile(storedV2 ? JSON.parse(storedV2) : null, storedStats ? JSON.parse(storedStats) : null);
      }
      const today = localDateKey();
      const daily = dailyChallengeForDate(today);
      if (nextProfile.daily.date !== today || nextProfile.daily.id !== daily.id) {
        nextProfile = { ...nextProfile, daily: { date: today, id: daily.id, progress: 0, completed: false, rewarded: false } };
      }
      nextProfile = normalizeProfile(nextProfile);
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      setShowTutorialOffer(nextProfile.settings.tutorialEnabled && !nextProfile.tutorialCompleted);
    } catch {
      profileRef.current = DEFAULT_PROFILE;
      setProfile(DEFAULT_PROFILE);
    }
    setLoaded(true);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH || ""}/` }).then((registration) => registration.update()).catch(() => undefined);
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

  useEffect(() => {
    profileRef.current = profile;
    renderOptionsRef.current = {
      screenShake: profile.settings.screenShake,
      flashes: profile.settings.flashes,
      reduceEffects: profile.settings.reduceEffects,
      ballStyle: profile.equippedCosmetics.balls,
      trailStyle: profile.equippedCosmetics.trails,
      impactStyle: profile.equippedCosmetics.impacts,
      arenaStyle: profile.equippedCosmetics.arenas,
    };
  }, [profile]);

  const dailyChallenge = useMemo(() => dailyChallengeForDate(profile.daily.date || "1970-01-01"), [profile.daily.date]);
  const totalStars = Object.values(profile.stars).reduce((sum, value) => sum + value, 0);
  const completedStages = CAMPAIGN_STAGES.filter((stage) => (profile.completedObjectives[String(stage.id)] ?? []).includes(stage.objectives[0].id)).length;

  const announce = useCallback((side: ElementSide | "neutral", text: string, detail?: string, duration = 1550) => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setAbilityNotice({ side, text, detail });
    noticeTimerRef.current = window.setTimeout(() => setAbilityNotice(null), duration);
  }, []);

  const playSound = useCallback((kind: "hit" | "wall" | "score" | "launch" | "perfect" | "smash" | "power" | "ultimate" | "victory" | "defeat" | "boss", element: ElementSide = "ice") => {
    const volume = profileRef.current.settings.effects / 100;
    if (volume <= 0) return;
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const now = context.currentTime;
      const frequencies: Record<typeof kind, number> = {
        hit: element === "ice" ? 390 : 255,
        wall: 165,
        score: element === "ice" ? 650 : 430,
        launch: 285,
        perfect: element === "ice" ? 820 : 610,
        smash: element === "ice" ? 195 : 145,
        power: 520,
        ultimate: element === "ice" ? 125 : 92,
        victory: 740,
        defeat: 130,
        boss: 78,
      };
      const duration = kind === "ultimate" ? 0.72 : kind === "victory" || kind === "defeat" ? 0.55 : kind === "score" || kind === "boss" ? 0.36 : 0.16;
      oscillator.type = kind === "smash" || kind === "boss" ? "sawtooth" : kind === "score" || kind === "perfect" || kind === "victory" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequencies[kind], now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequencies[kind] * (kind === "perfect" || kind === "victory" ? 1.85 : kind === "ultimate" ? 2.4 : 0.68)), now + duration);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(kind === "smash" ? 900 : 2600, now);
      gain.gain.setValueAtTime(Math.max(0.001, volume * (kind === "ultimate" ? 0.13 : kind === "smash" ? 0.1 : 0.065)), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(filter).connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // Web Audio peut être bloqué avant la première interaction.
    }
  }, []);

  const playMusicPulse = useCallback((game: GameState) => {
    const volume = profileRef.current.settings.music / 100;
    if (volume <= 0 || screenRef.current !== "playing") return;
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const tension = Math.min(1, game.rally / 25 + (game.boss ? game.boss.phase / game.boss.maxPhase * 0.35 : 0));
      const root = game.boss?.name === "SOLARIS" ? 82 : game.boss ? 73 : 98;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(root * (1 + tension * 0.5), now);
      oscillator.frequency.linearRampToValueAtTime(root * (1.5 + tension * 0.45), now + 0.52);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume * 0.018, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.64);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.66);
    } catch {
      // La musique dynamique reste une amélioration facultative.
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!profileRef.current.settings.vibrations) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      announce("neutral", "PLEIN ÉCRAN INDISPONIBLE");
    }
  }, [announce]);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  const beginMatch = useCallback((nextMode: GameMode, stage: CampaignStage | null = null, bossRushIndex = 0) => {
    const currentProfile = profileRef.current;
    const palette = ELEMENT_SKINS.find((skin) => skin.id === currentProfile.activeSkin) ?? ELEMENT_SKINS[0];
    const mediaReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quality = resolvedQuality(currentProfile.settings.quality, window.devicePixelRatio, navigator.hardwareConcurrency || 4, mediaReduced);
    const actualStage = nextMode === "bossRush" ? BOSS_RUSH_STAGES[bossRushIndex] : stage;
    const game = freshGame(nextMode, difficulty, palette, actualStage, duelConfig, quality);
    game.bossRushIndex = bossRushIndex;
    if (nextMode === "tutorial") {
      game.energy.ice = 55;
      game.powersEnabled = true;
      game.ultimatesEnabled = true;
    }
    gameRef.current = game;
    setMode(nextMode);
    setCurrentStage(actualStage);
    setScore({ ice: 0, fire: 0 });
    setSets({ ice: 0, fire: 0 });
    setRally(0);
    setCombo(1);
    setEnergy({ ...game.energy });
    setLives(game.lives);
    setBossPhase(game.boss?.phase ?? 0);
    setBossRushIndexDisplay(game.bossRushIndex);
    setUltimatesEnabledDisplay(game.ultimatesEnabled);
    setElapsedDisplay(0);
    setMatchResult(null);
    setAbilityNotice(null);
    setAchievementToast([]);
    setTutorialStep(nextMode === "tutorial" ? 0 : -1);
    setShowTutorialOffer(false);
    setScreen("playing");
    playSound(nextMode === "bossRush" || actualStage?.boss ? "boss" : "launch");
    try {
      const orientation = window.screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
      void orientation.lock?.("landscape").catch(() => undefined);
    } catch {
      // Le verrouillage paysage dépend du navigateur et du mode plein écran.
    }
  }, [difficulty, duelConfig, playSound, setScreen, setTutorialStep]);

  const startArena = useCallback(() => beginMatch(arenaMode, null), [arenaMode, beginMatch]);

  const startCampaignStage = useCallback((stage: CampaignStage) => {
    if (stage.id > profileRef.current.unlockedStage) return;
    beginMatch("campaign", stage);
  }, [beginMatch]);

  const togglePause = useCallback(() => {
    if (screenRef.current === "playing") setScreen("paused");
    else if (screenRef.current === "paused") setScreen("playing");
  }, [setScreen]);

  const activateUltimate = useCallback((side: ElementSide) => {
    const game = gameRef.current;
    if (!game || screenRef.current !== "playing" || !game.ultimatesEnabled || game.energy[side] < 100) return;
    game.energy[side] = 0;
    game.metrics.ultimates[side] += 1;
    game.ultimateVisual = { side, timer: 2.2 };
    const paddle = side === "ice" ? game.left : game.right;
    paddle.boostTimer = Math.max(paddle.boostTimer, side === "ice" ? 7.2 : 4.8);
    game.shields[side] = 1;
    if (side === "ice") {
      game.slowMotion = Math.max(game.slowMotion, 2.35);
      game.freeze.fire = Math.max(game.freeze.fire, 1.5);
      for (const ball of game.balls) {
        if (ball.element !== "ice") continue;
        ball.radius = Math.max(ball.radius, 22);
        ball.berserkTimer = Math.max(ball.berserkTimer, 3.6);
        const velocity = stableBallVelocity(ball.vx * 1.12, ball.vy * 1.12, ball.vx >= 0 ? 1 : -1);
        ball.vx = velocity.vx;
        ball.vy = velocity.vy;
      }
    } else {
      for (const ball of game.balls) {
        if (ball.element !== "fire") continue;
        const velocity = stableBallVelocity(ball.vx * 1.28, ball.vy * 1.28, ball.vx >= 0 ? 1 : -1);
        ball.vx = velocity.vx;
        ball.vy = velocity.vy;
        ball.berserkTimer = Math.max(ball.berserkTimer, 4.5);
      }
    }
    game.flash = side === "ice" ? 0.82 : 1;
    game.shake = side === "ice" ? 18 : 28;
    spawnImpact(game, side === "ice" ? game.left.x + 30 : game.right.x - 5, paddle.y + paddle.height / 2, side, 110, renderOptionsRef.current.impactStyle);
    setEnergy({ ...game.energy });
    announce(side, side === "ice" ? "ZÉRO ABSOLU" : "ÉRUPTION SOLAIRE", side === "ice" ? "LE TEMPS SE FIGE" : "LE PLASMA SE DÉCHAÎNE", 2200);
    playSound("ultimate", side);
    vibrate(side === "ice" ? [35, 25, 75, 25, 110] : [55, 20, 80, 20, 130]);
    if (game.mode === "tutorial" && tutorialStepRef.current === 4) setTutorialStep(5);
  }, [announce, playSound, setTutorialStep, vibrate]);

  const applyPowerUp = useCallback((game: GameState, ball: Ball, kind: PowerUpKind, side: ElementSide) => {
    const definition = POWER_UPS.find((entry) => entry.kind === kind) ?? POWER_UPS[0];
    const enemy = opposite(side);
    game.metrics.powerUps[kind] = (game.metrics.powerUps[kind] ?? 0) + 1;
    game.recentPowerUps.push(kind);
    if (game.recentPowerUps.length > 5) game.recentPowerUps.shift();
    if (kind === "overdrive") {
      const velocity = stableBallVelocity(ball.vx * 1.28, ball.vy * 1.28, ball.vx >= 0 ? 1 : -1);
      ball.vx = velocity.vx;
      ball.vy = velocity.vy;
    } else if (kind === "shield") {
      game.shields[side] = 1;
    } else if (kind === "titan") {
      (side === "ice" ? game.left : game.right).boostTimer = definition.duration;
    } else if (kind === "freeze") {
      game.freeze[enemy] = Math.max(game.freeze[enemy], definition.duration);
    } else if (kind === "portal") {
      game.portals.push({
        ax: WORLD_W * 0.38,
        ay: randomRange(game.rng, WORLD_H * 0.22, WORLD_H * 0.78),
        bx: WORLD_W * 0.62,
        by: randomRange(game.rng, WORLD_H * 0.22, WORLD_H * 0.78),
        radius: 48,
        timer: definition.duration,
        owner: side,
      });
      game.portals = game.portals.slice(-2);
    } else if (kind === "phantom") {
      ball.phantomTimer = Math.max(ball.phantomTimer, definition.duration);
    } else if (kind === "magnet") {
      game.magnet[side] = Math.max(game.magnet[side], definition.duration);
    } else if (kind === "reverse") {
      game.reverse[enemy] = Math.max(game.reverse[enemy], definition.duration);
    } else if (kind === "clone") {
      game.clone[side] = Math.max(game.clone[side], definition.duration);
    } else if (kind === "timeWarp") {
      game.timeWarp[side] = Math.max(game.timeWarp[side], definition.duration);
      game.slowMotion = Math.max(game.slowMotion, definition.duration);
    } else if (kind === "berserk") {
      ball.berserkTimer = Math.max(ball.berserkTimer, definition.duration);
      ball.radius = Math.max(11, ball.baseRadius * 0.68);
      const velocity = stableBallVelocity(ball.vx * 1.32, ball.vy * 1.32, ball.vx >= 0 ? 1 : -1);
      ball.vx = velocity.vx;
      ball.vy = velocity.vy;
    } else if (kind === "blackHole") {
      game.blackHole = { x: randomRange(game.rng, WORLD_W * 0.38, WORLD_W * 0.62), y: randomRange(game.rng, WORLD_H * 0.26, WORLD_H * 0.74), timer: definition.duration, owner: side };
    } else if (kind === "multiball") {
      const sourceBalls = [...game.balls];
      for (let index = 0; game.balls.length < MAX_BALLS && index < sourceBalls.length + 2; index += 1) {
        const source = sourceBalls[index % sourceBalls.length] ?? ball;
        const speed = Math.min(MAX_BALL_SPEED * 0.9, Math.hypot(source.vx, source.vy) * 0.94);
        const direction = source.vx >= 0 ? 1 : -1;
        const extra = makeBall(game, direction, speed, source.element, index % 2 ? 0.26 : -0.26);
        extra.x = source.x;
        extra.y = clamp(source.y + (index % 2 ? 34 : -34), 50, WORLD_H - 50);
        extra.previousX = extra.x;
        extra.previousY = extra.y;
        game.balls.push(extra);
      }
    }
    spawnImpact(game, ball.x, ball.y, side, definition.rarity === "legendaire" ? 92 : definition.rarity === "epique" ? 72 : 56, renderOptionsRef.current.impactStyle);
    game.shake = definition.rarity === "legendaire" ? 18 : 11;
    game.flash = definition.rarity === "legendaire" ? 0.55 : 0.3;
    announce(side, definition.label, rarityLabel(definition.rarity));
    playSound("power", side);
    vibrate(definition.rarity === "legendaire" ? [24, 18, 48, 18, 70] : [18, 20, 38]);
    if (game.mode === "tutorial" && tutorialStepRef.current === 3) {
      game.energy.ice = 100;
      setEnergy({ ...game.energy });
      setTutorialStep(4);
    }
  }, [announce, playSound, setTutorialStep, vibrate]);

  const finalizeMatch = useCallback((game: GameState, winningSide: ElementSide) => {
    if (game.ended) return;
    game.ended = true;
    const won = winningSide === "ice";
    const duration = game.mode === "bossRush" ? game.bossRushElapsed : game.elapsed;
    const previous = profileRef.current;

    if (game.mode === "tutorial") {
      const next = normalizeProfile({ ...previous, tutorialCompleted: true });
      profileRef.current = next;
      setProfile(next);
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* facultatif */ }
      setMatchResult({ won: true, score: { ...game.score }, stars: 0, objectives: [], shards: 0, xp: 0, duration: game.elapsed, bestRally: game.bestRally, newRecord: false, nextStage: null, advice: "Protocole assimilé. L’arène est à toi." });
      setScreen("ended");
      playSound("victory", "ice");
      return;
    }

    const record: MatchRecord = {
      id: `${Date.now()}-${game.mode}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      label: game.campaignStage
        ? `${game.campaignStage.boss ? `BOSS ${game.campaignStage.boss}` : `ARÈNE ${String(game.campaignStage.id).padStart(2, "0")}`} · ${game.campaignStage.name}`
        : MODE_LABELS[game.mode],
      mode: game.mode,
      result: won ? "victoire" : "défaite",
      ice: game.score.ice,
      fire: game.score.fire,
      rally: game.bestRally,
      duration,
      difficulty: game.difficulty,
      perfectHits: game.metrics.perfectHits.ice,
      smashes: game.metrics.smashes.ice,
    };

    const mergedPowerUps = { ...previous.stats.powerUps };
    for (const [kind, value] of Object.entries(game.metrics.powerUps)) mergedPowerUps[kind] = (mergedPowerUps[kind] ?? 0) + value;
    const bossesDefeated = [...previous.stats.bossesDefeated];
    if (won && game.boss?.name && !bossesDefeated.includes(game.boss.name)) bossesDefeated.push(game.boss.name);
    let newRecord = game.bestRally > previous.stats.bestRally;
    const survivalBest = game.mode === "survival" ? Math.max(previous.stats.survivalBest, duration) : previous.stats.survivalBest;
    if (game.mode === "survival" && survivalBest > previous.stats.survivalBest) newRecord = true;
    const completedBossRush = game.mode === "bossRush" && won && game.bossRushIndex === 2;
    const bossRushBest = completedBossRush && (previous.stats.bossRushBest === 0 || duration < previous.stats.bossRushBest) ? duration : previous.stats.bossRushBest;
    if (completedBossRush && bossRushBest !== previous.stats.bossRushBest) newRecord = true;

    const nextStats = {
      ...previous.stats,
      matches: previous.stats.matches + 1,
      wins: previous.stats.wins + (won ? 1 : 0),
      losses: previous.stats.losses + (won ? 0 : 1),
      totalSeconds: previous.stats.totalSeconds + duration,
      totalRallyHits: previous.stats.totalRallyHits + game.bestRally,
      bestRally: Math.max(previous.stats.bestRally, game.bestRally),
      perfectHits: previous.stats.perfectHits + game.metrics.perfectHits.ice,
      smashes: previous.stats.smashes + game.metrics.smashes.ice,
      ultimates: previous.stats.ultimates + game.metrics.ultimates.ice,
      powerUps: mergedPowerUps,
      maxBallSpeed: Math.max(previous.stats.maxBallSpeed, game.metrics.maxBallSpeed),
      bossesDefeated,
      survivalBest,
      survivalRally: game.mode === "survival" ? Math.max(previous.stats.survivalRally, game.bestRally) : previous.stats.survivalRally,
      bossRushBest,
    };

    let objectives: string[] = [];
    let starsEarned = 0;
    let shardReward = won ? 10 : 3;
    let nextStage: number | null = null;
    const stars = { ...previous.stars };
    const completedObjectives = { ...previous.completedObjectives };
    let unlockedStage = previous.unlockedStage;
    if (game.mode === "campaign" && game.campaignStage) {
      const metrics = {
        won,
        conceded: game.score.fire,
        bestRally: game.bestRally,
        perfectHits: game.metrics.perfectHits.ice,
        smashes: game.metrics.smashes.ice,
        bestCombo: game.metrics.bestCombo,
        duration: game.elapsed,
        ultimates: game.metrics.ultimates.ice,
      };
      objectives = evaluateStageObjectives(game.campaignStage, metrics);
      const oldObjectives = previous.completedObjectives[String(game.campaignStage.id)] ?? [];
      const mergedObjectives = Array.from(new Set([...oldObjectives, ...objectives]));
      completedObjectives[String(game.campaignStage.id)] = mergedObjectives;
      const previousStars = previous.stars[String(game.campaignStage.id)] ?? 0;
      starsEarned = mergedObjectives.length;
      stars[String(game.campaignStage.id)] = Math.max(previousStars, starsEarned);
      const newStars = Math.max(0, starsEarned - previousStars);
      shardReward = (won && previousStars === 0 ? game.campaignStage.reward : Math.ceil(game.campaignStage.reward * 0.24)) + newStars * 12;
      if (won) {
        nextStage = game.campaignStage.id < 12 ? game.campaignStage.id + 1 : null;
        unlockedStage = Math.max(unlockedStage, nextStage ?? game.campaignStage.id);
      }
    } else if (game.mode === "survival") {
      shardReward = Math.max(5, Math.floor(duration / 12) * 3);
    } else if (game.mode === "bossRush") {
      shardReward = won ? 130 : 18 + game.bossRushIndex * 16;
    } else if (game.mode === "hardcore" || game.mode === "chaos") {
      shardReward = won ? 24 : 6;
    } else if (game.mode === "duel") {
      shardReward = 5;
    }

    const daily = dailyChallengeForDate(previous.daily.date || localDateKey());
    const dailyIncrement = daily.stat === "wins" ? (won ? 1 : 0)
      : daily.stat === "rally" ? game.bestRally
        : daily.stat === "perfect" ? game.metrics.perfectHits.ice
          : daily.stat === "smash" ? game.metrics.smashes.ice
            : daily.stat === "powerUps" ? Object.values(game.metrics.powerUps).reduce((sum, value) => sum + value, 0)
              : 1;
    const dailyProgress = daily.stat === "rally" ? Math.max(previous.daily.progress, dailyIncrement) : previous.daily.progress + dailyIncrement;
    const dailyCompleted = previous.daily.completed || dailyProgress >= daily.target;
    const dailyReward = dailyCompleted && !previous.daily.rewarded ? daily.reward : 0;
    shardReward += dailyReward;

    const xpReward = Math.round(24 + duration * 0.35 + game.bestRally * 1.25 + game.metrics.perfectHits.ice * 5 + (won ? 55 : 12) + (game.boss ? 70 : 0));
    const xpState = addXp(previous, xpReward);
    const preliminary = normalizeProfile({
      ...previous,
      ...xpState,
      unlockedStage,
      stars,
      completedObjectives,
      shards: previous.shards + shardReward,
      records: [record, ...previous.records].slice(0, 30),
      stats: { ...nextStats, shardsEarned: previous.stats.shardsEarned + shardReward },
      daily: { date: daily.date, id: daily.id, progress: Math.min(daily.target, dailyProgress), completed: dailyCompleted, rewarded: previous.daily.rewarded || dailyCompleted },
      winStreak: won ? previous.winStreak + 1 : 0,
    });
    const unlocked = unlockAchievements(preliminary, Date.now(), won && game.score.fire === 0);
    const next = normalizeProfile({
      ...preliminary,
      achievements: unlocked.achievements,
      shards: preliminary.shards + unlocked.reward,
      stats: { ...preliminary.stats, shardsEarned: preliminary.stats.shardsEarned + unlocked.reward },
    });
    profileRef.current = next;
    setProfile(next);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* facultatif */ }
    if (unlocked.unlocked.length) setAchievementToast(unlocked.unlocked.map((entry) => entry.name));

    setMatchResult({
      won,
      score: { ...game.score },
      stars: starsEarned,
      objectives,
      shards: shardReward + unlocked.reward,
      xp: xpReward,
      duration,
      bestRally: game.bestRally,
      newRecord,
      nextStage,
      advice: matchAdvice(game, won),
    });
    setScreen("ended");
    playSound(won ? "victory" : "defeat", winningSide);
    vibrate(won ? [45, 35, 70, 35, 110] : [90, 45, 120]);
  }, [playSound, setScreen, vibrate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.add(key);
      if (screenRef.current !== "menu" && ["arrowup", "arrowdown", "w", "s", " "].includes(key)) event.preventDefault();
      if ((key === "escape" || key === "p") && !event.repeat) togglePause();
      if (key === " " && !event.repeat) activateUltimate("ice");
      if (key === "enter" && !event.repeat && gameRef.current?.mode === "duel") activateUltimate("fire");
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const onVisibility = () => {
      if (document.hidden && screenRef.current === "playing") setScreen("paused");
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activateUltimate, setScreen, togglePause]);

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

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let previousFrame = performance.now();
    let accumulator = 0;

    const syncHud = () => {
      setScore({ ...game.score });
      setSets({ ...game.sets });
      setRally(game.rally);
      setCombo(game.combo);
      setEnergy({ ...game.energy });
      setLives(game.lives);
      setBossPhase(game.boss?.phase ?? 0);
    };

    const resetPoint = (servingTo: ElementSide) => {
      game.balls = [];
      game.servingTo = servingTo;
      game.serveDelay = 0.92;
      game.rally = 0;
      game.combo = 1;
      game.precisionStreak = 0;
      game.powerUp = null;
      game.nextPowerUp = game.mode === "chaos" || game.campaignStage?.modifier === "chaos" ? 3.2 + seededRandom(game.rng) * 2.4 : 6 + seededRandom(game.rng) * 3;
      setRally(0);
      setCombo(1);
    };

    const continueBossRush = () => {
      const nextIndex = game.bossRushIndex + 1;
      const preservedTime = game.bossRushElapsed;
      const defeatedBoss = game.boss?.name;
      if (defeatedBoss && !profileRef.current.stats.bossesDefeated.includes(defeatedBoss)) {
        persistProfile((previous) => ({
          ...previous,
          stats: { ...previous.stats, bossesDefeated: Array.from(new Set([...previous.stats.bossesDefeated, defeatedBoss])) },
        }));
      }
      const nextGame = freshGame("bossRush", game.difficulty, game.palette, BOSS_RUSH_STAGES[nextIndex], game.duelConfig, game.quality);
      nextGame.bossRushIndex = nextIndex;
      nextGame.bossRushElapsed = preservedTime;
      Object.assign(game, nextGame);
      gameRef.current = game;
      setCurrentStage(game.campaignStage);
      setBossRushIndexDisplay(nextIndex);
      setUltimatesEnabledDisplay(game.ultimatesEnabled);
      setScore({ ...game.score });
      setEnergy({ ...game.energy });
      setRally(0);
      setCombo(1);
      setBossPhase(1);
      announce("neutral", `BOSS ${nextIndex + 1}/3`, game.boss?.name ?? "GARDIEN", 2200);
      playSound("boss", nextIndex === 1 ? "ice" : "fire");
    };

    const scorePoint = (element: ElementSide) => {
      if (game.ended) return;
      game.score[element] += 1;
      const concedingSide = opposite(element);
      game.energy[concedingSide] = Math.min(100, game.energy[concedingSide] + 16);
      game.shake = 22;
      game.flash = 1;
      spawnImpact(game, element === "ice" ? WORLD_W - 45 : 45, WORLD_H / 2, element, 72, renderOptionsRef.current.impactStyle);
      playSound("score", element);
      vibrate([35, 35, 75]);

      if (game.mode === "survival") {
        if (element === "fire") {
          game.lives -= 1;
          setLives(game.lives);
          if (game.lives <= 0) {
            syncHud();
            finalizeMatch(game, "fire");
            return;
          }
          announce("ice", `VIE PERDUE · ${game.lives} RESTANTE${game.lives > 1 ? "S" : ""}`);
        } else {
          game.launchSpeed = Math.min(1180, game.launchSpeed + 34);
          game.aiSpeed = Math.min(1120, game.aiSpeed + 22);
          announce("ice", "PRESSION +1", `VITESSE ${Math.round(game.launchSpeed)}`);
        }
        resetPoint(element === "ice" ? "fire" : "ice");
        syncHud();
        return;
      }

      if (game.score[element] < game.winScore) {
        resetPoint(element === "ice" ? "fire" : "ice");
        syncHud();
        return;
      }

      if (game.mode === "duel" && game.duelConfig.bestOf > 1) {
        game.sets[element] += 1;
        const requiredSets = Math.ceil(game.duelConfig.bestOf / 2);
        if (game.sets[element] < requiredSets) {
          game.score = { ice: 0, fire: 0 };
          game.roundTransition = 1.65;
          resetPoint(opposite(element));
          syncHud();
          announce(element, `MANCHE ${game.sets[element]}`, `PREMIER À ${requiredSets} MANCHES`);
          return;
        }
      }

      if (game.mode === "bossRush" && element === "ice" && game.bossRushIndex < BOSS_RUSH_STAGES.length - 1) {
        continueBossRush();
        return;
      }

      syncHud();
      finalizeMatch(game, element);
    };

    const createBarrier = (barrier: Barrier) => {
      game.barriers = game.barriers.filter((entry) => entry.kind !== barrier.kind);
      game.barriers.push(barrier);
    };

    const triggerChaosEvent = () => {
      const roll = Math.floor(seededRandom(game.rng) * 6);
      game.chaosActive = 4.5;
      if (roll === 0) {
        game.chaosLabel = "VÉLOCITÉ INSTABLE";
        for (const ball of game.balls) {
          const velocity = stableBallVelocity(ball.vx * 1.17, ball.vy * 1.17, ball.vx >= 0 ? 1 : -1);
          ball.vx = velocity.vx;
          ball.vy = velocity.vy;
        }
      } else if (roll === 1) {
        game.chaosLabel = "MICRO-NOYAU";
        for (const ball of game.balls) {
          ball.radius = Math.max(12, ball.baseRadius * 0.7);
          ball.berserkTimer = 4.5;
        }
      } else if (roll === 2) {
        game.chaosLabel = "PORTAILS CROISÉS";
        game.portals.push({ ax: WORLD_W * 0.36, ay: randomRange(game.rng, 180, 720), bx: WORLD_W * 0.64, by: randomRange(game.rng, 180, 720), radius: 50, timer: 7, owner: "arena" });
      } else if (roll === 3 && game.balls[0]) {
        game.chaosLabel = "MULTIBALL";
        applyPowerUp(game, game.balls[0], "multiball", game.balls[0].element);
      } else if (roll === 4) {
        game.chaosLabel = "PLUIE DE POUVOIRS";
        game.nextPowerUp = 0.05;
      } else {
        game.chaosLabel = "TRAJECTOIRE FANTÔME";
        for (const ball of game.balls) ball.phantomTimer = 4.5;
      }
      announce("neutral", "ÉVÉNEMENT CHAOS", game.chaosLabel);
    };

    const triggerBossEvent = () => {
      if (!game.boss) return;
      const boss = game.boss;
      if (boss.name === "KRYON") {
        if (boss.phase === 1 || seededRandom(game.rng) > 0.46) {
          boss.telegraph = "MUR DE GLACE";
          createBarrier({ x: WORLD_W * 0.76, y: randomRange(game.rng, 135, 315), width: 20, height: 430, hp: boss.phase + 1, maxHp: boss.phase + 1, timer: 8, element: "fire", kind: "iceWall" });
        } else {
          boss.telegraph = "GEL POLAIRE";
          game.freeze.ice = Math.max(game.freeze.ice, 2.25);
          game.slowMotion = Math.max(game.slowMotion, 1.1);
        }
      } else if (boss.name === "VORTEX") {
        boss.telegraph = boss.phase === 1 ? "RIFT OUVERT" : "DOUBLE RIFT";
        const pairs = boss.phase === 1 ? 1 : 2;
        for (let index = 0; index < pairs; index += 1) {
          game.portals.push({
            ax: WORLD_W * (0.31 + index * 0.11),
            ay: randomRange(game.rng, 150, 750),
            bx: WORLD_W * (0.69 - index * 0.11),
            by: randomRange(game.rng, 150, 750),
            radius: 48,
            timer: 7.5,
            owner: "arena",
          });
        }
        game.portals = game.portals.slice(-4);
        if (boss.phase === 2) for (const ball of game.balls) ball.spin += randomRange(game.rng, -190, 190);
      } else {
        if (boss.phase === 1) {
          boss.telegraph = "BOUCLIER SOLAIRE";
          createBarrier({ x: WORLD_W * 0.78, y: WORLD_H * 0.22, width: 22, height: WORLD_H * 0.56, hp: 3, maxHp: 3, timer: 8, element: "fire", kind: "solarShield" });
        } else if (boss.phase === 2) {
          boss.telegraph = "VAGUE SOLAIRE";
          boss.waveTimer = 1.15;
        } else {
          boss.telegraph = "SUPERNOVA";
          boss.waveTimer = 0.9;
          if (game.balls[0] && game.balls.length < MAX_BALLS) applyPowerUp(game, game.balls[0], "multiball", "fire");
        }
      }
      boss.telegraphTimer = 1.4;
      boss.eventTimer = boss.name === "SOLARIS" ? Math.max(4.2, 7.5 - boss.phase * 0.9) : Math.max(4.6, 8 - boss.phase * 1.2);
      announce("fire", boss.name, boss.telegraph, 1800);
      playSound("boss", "fire");
    };

    const updateBoss = (dt: number) => {
      const boss = game.boss;
      if (!boss) return;
      const ratio = game.score.ice / Math.max(1, game.winScore);
      const nextPhase = boss.name === "SOLARIS" ? (ratio >= 0.66 ? 3 : ratio >= 0.32 ? 2 : 1) : ratio >= 0.48 ? 2 : 1;
      if (nextPhase !== boss.phase) {
        boss.phase = nextPhase;
        setBossPhase(nextPhase);
        announce("fire", `${boss.name} · PHASE ${nextPhase}`, nextPhase === boss.maxPhase ? "PUISSANCE MAXIMALE" : "MUTATION DÉTECTÉE", 2200);
        game.flash = 0.75;
        game.shake = 24;
      }
      boss.eventTimer -= dt;
      boss.telegraphTimer = Math.max(0, boss.telegraphTimer - dt);
      if (boss.eventTimer <= 0) triggerBossEvent();
      if (boss.waveTimer > 0) {
        const before = boss.waveTimer;
        boss.waveTimer -= dt;
        if (before > 0 && boss.waveTimer <= 0) {
          for (const ball of game.balls) {
            const velocity = stableBallVelocity(ball.vx * (boss.phase === 3 ? 1.25 : 1.16), ball.vy * (boss.phase === 3 ? 1.25 : 1.16), ball.vx >= 0 ? 1 : -1);
            ball.vx = velocity.vx;
            ball.vy = velocity.vy;
            ball.element = "fire";
          }
          game.flash = 1;
          game.shake = 30;
          spawnImpact(game, WORLD_W * 0.82, WORLD_H / 2, "fire", 130, renderOptionsRef.current.impactStyle);
          playSound("ultimate", "fire");
          vibrate([55, 20, 95]);
        }
      }
    };

    const updateTimers = (dt: number) => {
      for (const timers of [game.freeze, game.reverse, game.magnet, game.clone, game.timeWarp]) {
        timers.ice = Math.max(0, timers.ice - dt);
        timers.fire = Math.max(0, timers.fire - dt);
      }
      game.slowMotion = Math.max(0, game.slowMotion - dt);
      game.pressureActive = Math.max(0, game.pressureActive - dt);
      game.chaosActive = Math.max(0, game.chaosActive - dt);
      game.roundTransition = Math.max(0, game.roundTransition - dt);
      if (game.ultimateVisual) {
        game.ultimateVisual.timer -= dt;
        if (game.ultimateVisual.timer <= 0) game.ultimateVisual = null;
      }
      for (let index = game.portals.length - 1; index >= 0; index -= 1) {
        game.portals[index].timer -= dt;
        if (game.portals[index].timer <= 0) game.portals.splice(index, 1);
      }
      if (game.blackHole) {
        game.blackHole.timer -= dt;
        if (game.blackHole.timer <= 0) game.blackHole = null;
      }
      for (let index = game.barriers.length - 1; index >= 0; index -= 1) {
        game.barriers[index].timer -= dt;
        if (game.barriers[index].timer <= 0 || game.barriers[index].hp <= 0) game.barriers.splice(index, 1);
      }
    };

    const updatePaddles = (dt: number) => {
      const keyboardSpeed = 940 * dt;
      const keys = keysRef.current;
      const leftReverse = game.reverse.ice > 0 ? -1 : 1;
      if (keys.has("w")) game.left.targetY -= keyboardSpeed * leftReverse;
      if (keys.has("s")) game.left.targetY += keyboardSpeed * leftReverse;
      if (game.mode === "duel") {
        const rightReverse = game.reverse.fire > 0 ? -1 : 1;
        if (keys.has("arrowup")) game.right.targetY -= keyboardSpeed * rightReverse;
        if (keys.has("arrowdown")) game.right.targetY += keyboardSpeed * rightReverse;
      } else {
        const candidates = game.balls.filter((ball) => ball.vx > 0);
        const ball = candidates.sort((a, b) => (WORLD_W - a.x) / Math.max(1, a.vx) - (WORLD_W - b.x) / Math.max(1, b.vx))[0] ?? game.balls[0];
        game.aiErrorTimer -= dt;
        if (game.aiErrorTimer <= 0) {
          const errorScale = game.aiBehavior === "defensive" ? 1.25 : game.aiBehavior === "aggressive" ? 0.62 : game.aiBehavior === "boss" ? 0.46 : 0.9;
          game.aiError = randomRange(game.rng, -game.aiReaction, game.aiReaction) * errorScale;
          game.aiErrorTimer = game.aiBehavior === "impulsive" ? randomRange(game.rng, 0.08, 0.22) : randomRange(game.rng, 0.15, 0.34);
        }
        let target = WORLD_H / 2;
        if (ball) {
          const travel = ball.vx > 0 ? (game.right.x - ball.x) / Math.max(1, ball.vx) : 0;
          target = ball.vx > 0 ? reflectedTargetY(ball.y, ball.vy, travel, 34 + ball.radius, WORLD_H - 34 - ball.radius) : WORLD_H / 2;
          if (game.aiBehavior === "aggressive") target += ball.vy * 0.025;
          if (game.aiBehavior === "defensive" && ball.vx < 0) target = WORLD_H / 2;
          if (game.aiBehavior === "impulsive") target += Math.sin(game.elapsed * 5.2) * 46;
          target += game.aiError;
          if (game.reverse.fire > 0) target = WORLD_H - target;
        }
        const bossRage = game.boss ? 1 + (game.boss.phase - 1) * 0.09 : 1;
        const freezeScale = game.freeze.fire > 0 ? 0.43 : 1;
        const maxMove = game.aiSpeed * bossRage * freezeScale * dt;
        const center = game.right.y + game.right.height / 2;
        game.right.targetY += clamp(target - center, -maxMove, maxMove);
      }

      if (game.campaignStage?.modifier === "pressure") {
        game.pressureTimer -= dt;
        if (game.pressureTimer <= 0) {
          game.pressureActive = 4.2;
          game.pressureTimer = 11.5;
          announce("fire", "PRESSION", "DÉFENSE GLACE RÉDUITE");
        }
      }

      for (const [index, paddle] of [game.left, game.right].entries()) {
        const side: ElementSide = index === 0 ? "ice" : "fire";
        paddle.boostTimer = Math.max(0, paddle.boostTimer - dt);
        const centerBeforeResize = paddle.y + paddle.height / 2;
        const pressureScale = side === "ice" && game.pressureActive > 0 ? 0.62 : 1;
        const desiredHeight = paddle.baseHeight * (paddle.boostTimer > 0 ? 1.38 : 1) * pressureScale;
        paddle.height += (desiredHeight - paddle.height) * Math.min(1, dt * 8);
        paddle.y = centerBeforeResize - paddle.height / 2;
        paddle.targetY = clamp(paddle.targetY, paddle.height / 2 + 24, WORLD_H - paddle.height / 2 - 24);
        const before = paddle.y;
        paddle.previousY = before;
        const freezeScale = game.freeze[side] > 0 ? 0.36 : 1;
        const targetTop = paddle.targetY - paddle.height / 2;
        paddle.y += (targetTop - paddle.y) * Math.min(1, dt * 16 * freezeScale);
        paddle.y = clamp(paddle.y, 22, WORLD_H - paddle.height - 22);
        paddle.velocity = (paddle.y - before) / Math.max(dt, 0.001);
      }

      if (game.mode === "tutorial" && tutorialStepRef.current === 0 && Math.abs(game.left.velocity) > 45) {
        setTutorialStep(1);
        announce("ice", "MOUVEMENT VALIDÉ", "RENVOIE LA BALLE");
      }
    };

    const spawnPowerUpIfNeeded = (dt: number) => {
      if (!game.powersEnabled || game.roundTransition > 0) return;
      if (!game.powerUp) {
        game.nextPowerUp -= dt;
        if (game.mode === "tutorial" && tutorialStepRef.current === 3) game.nextPowerUp = Math.min(game.nextPowerUp, 0.15);
        if (game.nextPowerUp <= 0 && (game.rally >= 2 || game.mode === "chaos" || game.mode === "tutorial")) {
          const allowed = game.mode === "tutorial" ? new Set<string>(["shield", "titan", "overdrive"]) : undefined;
          const data = pickWeightedPowerUp(POWER_UPS, game.rng, game.recentPowerUps, allowed);
          game.powerUp = {
            x: game.mode === "tutorial" ? WORLD_W * 0.62 : randomRange(game.rng, WORLD_W * 0.33, WORLD_W * 0.67),
            y: game.mode === "tutorial" && game.balls[0] ? game.balls[0].y : randomRange(game.rng, WORLD_H * 0.2, WORLD_H * 0.8),
            radius: 29,
            kind: data.kind,
            rarity: data.rarity,
            life: game.mode === "tutorial" ? 14 : 9,
            angle: randomRange(game.rng, 0, Math.PI),
          };
        }
      } else {
        game.powerUp.life -= dt;
        game.powerUp.angle += dt * 1.7;
        if (game.powerUp.life <= 0) {
          game.powerUp = null;
          game.nextPowerUp = 5.5 + seededRandom(game.rng) * 4;
        }
      }
    };

    const collideBarrier = (ball: Ball, dt: number) => {
      if (ball.collisionCooldown > 0) return false;
      for (const barrier of game.barriers) {
        const movingRight = ball.vx > 0;
        const contactX = movingRight ? barrier.x - ball.radius : barrier.x + barrier.width + ball.radius;
        const nextX = ball.x + ball.vx * dt;
        const crosses = movingRight ? ball.x <= contactX && nextX >= contactX : ball.x >= contactX && nextX <= contactX;
        if (!crosses) continue;
        const time = (contactX - ball.x) / ball.vx;
        const y = ball.y + ball.vy * time;
        if (y + ball.radius < barrier.y || y - ball.radius > barrier.y + barrier.height) continue;
        ball.x = contactX;
        ball.y = y;
        ball.vx *= -1.035;
        ball.element = movingRight ? "ice" : "fire";
        ball.collisionCooldown = 0.06;
        barrier.hp -= 1;
        spawnImpact(game, ball.x, ball.y, ball.element, 45, renderOptionsRef.current.impactStyle);
        game.shake = 12;
        playSound("smash", ball.element);
        if (barrier.hp <= 0) announce(ball.element, "DÉFENSE BRISÉE", barrier.kind === "fortress" ? "FORTERESSE DÉTRUITE" : "BOUCLIER DÉTRUIT");
        return true;
      }
      return false;
    };

    const paddleHitCandidates = (ball: Ball, dt: number) => {
      const candidates: Array<{ hit: NonNullable<ReturnType<typeof sweptPaddleCollision>>; paddle: Paddle; side: ElementSide; clone: boolean }> = [];
      const add = (paddle: Paddle, side: ElementSide, clone = false) => {
        const rect = clone
          ? {
              x: paddle.x + (side === "ice" ? 70 : -55),
              y: clamp(paddle.y + paddle.height / 2 - paddle.height * 0.24 + Math.sin(paddle.y * 0.015) * 25, 22, WORLD_H - paddle.height * 0.48 - 22),
              width: paddle.width * 0.72,
              height: paddle.height * 0.48,
            }
          : paddle;
        const hit = sweptPaddleCollision(ball, rect, side, dt);
        if (hit) candidates.push({ hit, paddle, side, clone });
      };
      add(game.left, "ice");
      add(game.right, "fire");
      if (game.clone.ice > 0) add(game.left, "ice", true);
      if (game.clone.fire > 0) add(game.right, "fire", true);
      return candidates.sort((a, b) => a.hit.time - b.hit.time)[0] ?? null;
    };

    const handlePaddleHit = (ball: Ball, candidate: ReturnType<typeof paddleHitCandidates>, dt: number) => {
      if (!candidate) return false;
      const { hit, paddle, side, clone } = candidate;
      const isLeft = side === "ice";
      const effectiveHeight = clone ? paddle.height * 0.48 : paddle.height;
      const effectiveY = clone
        ? clamp(paddle.y + paddle.height / 2 - effectiveHeight / 2 + Math.sin(paddle.y * 0.015) * 25, 22, WORLD_H - effectiveHeight - 22)
        : paddle.y;
      const offset = clamp((hit.y - (effectiveY + effectiveHeight / 2)) / (effectiveHeight / 2), -1, 1);
      const perfect = Math.abs(offset) <= 0.125 && !clone;
      const smash = Math.abs(paddle.velocity) >= 690 && !clone;
      let speed = Math.hypot(ball.vx, ball.vy) * (1.043 + (perfect ? 0.075 : 0) + (smash ? 0.115 : 0)) + 10;
      if (game.campaignStage?.modifier === "velocity" || game.mode === "survival") speed *= 1 + Math.min(0.035, game.rally * 0.0011);
      if (game.mode === "hardcore") speed *= 1.025;
      speed = Math.min(MAX_BALL_SPEED, speed);
      const angle = offset * 0.86;
      let vx = Math.cos(angle) * speed * (isLeft ? 1 : -1);
      let vy = Math.sin(angle) * speed + paddle.velocity * (smash ? 0.25 : 0.18);
      const stable = stableBallVelocity(vx, vy, isLeft ? 1 : -1);
      vx = stable.vx;
      vy = stable.vy;
      ball.x = hit.x;
      ball.y = hit.y;
      ball.vx = vx;
      ball.vy = vy;
      ball.spin = clamp(ball.spin * 0.4 + paddle.velocity * 0.055, -260, 260);
      ball.element = side;
      ball.collisionCooldown = 0.038;
      const remaining = Math.max(0, dt - hit.time);
      ball.x += ball.vx * remaining;
      ball.y += ball.vy * remaining;
      game.rally += 1;
      game.bestRally = Math.max(game.bestRally, game.rally);
      if (perfect) {
        game.precisionStreak += 1;
        game.metrics.perfectHits[side] += 1;
      } else {
        game.precisionStreak = Math.max(0, game.precisionStreak - 1);
      }
      if (smash) game.metrics.smashes[side] += 1;
      game.combo = comboForRally(game.rally, game.precisionStreak);
      game.metrics.bestCombo = Math.max(game.metrics.bestCombo, game.combo);
      game.energy[side] = Math.min(100, game.energy[side] + (perfect ? 18 : smash ? 16 : 10 + Math.min(5, Math.floor(game.rally / 5))) * (1 + (game.combo - 1) * 0.08));
      game.shake = Math.min(18, (perfect || smash ? 8 : 3) + speed / 240);
      spawnImpact(game, ball.x, ball.y, side, (perfect ? 46 : 24) + (smash ? 25 : 0) + Math.min(20, game.rally), renderOptionsRef.current.impactStyle);
      setRally(game.rally);
      setCombo(game.combo);
      setEnergy({ ...game.energy });
      if (perfect) {
        announce(side, "PERFECT HIT", `COMBO ×${game.combo}`);
        playSound("perfect", side);
        vibrate([18, 14, 30]);
      } else if (smash) {
        announce(side, "SMASH", `VITESSE ${Math.round(speed)}`);
        playSound("smash", side);
        vibrate(35);
      } else {
        playSound("hit", side);
        vibrate(game.rally > 12 ? 24 : 11);
      }
      if (game.mode === "tutorial") {
        if (tutorialStepRef.current === 1 && side === "ice") {
          setTutorialStep(2);
          announce("ice", "FRAPPE VALIDÉE", "VISE LE CENTRE DE LA RAQUETTE");
        } else if (tutorialStepRef.current === 2 && perfect && side === "ice") {
          setTutorialStep(3);
          game.nextPowerUp = 0.12;
          announce("ice", "PERFECT HIT VALIDÉ", "CAPTURE LE POWER-UP");
        }
      }
      if (side === "fire" && game.mode !== "duel" && game.ultimatesEnabled && game.energy.fire >= 100) activateUltimate("fire");
      return true;
    };

    const teleportBall = (ball: Ball) => {
      if (ball.portalCooldown > 0) return;
      for (const portal of game.portals) {
        const distanceA = Math.hypot(ball.x - portal.ax, ball.y - portal.ay);
        const distanceB = Math.hypot(ball.x - portal.bx, ball.y - portal.by);
        if (distanceA < portal.radius + ball.radius) {
          ball.x = portal.bx + Math.sign(ball.vx || 1) * (portal.radius + ball.radius + 4);
          ball.y = portal.by;
          ball.vy += randomRange(game.rng, -85, 85);
          ball.portalCooldown = 0.42;
          spawnImpact(game, portal.bx, portal.by, ball.element, 40, "ring");
          playSound("power", ball.element);
          return;
        }
        if (distanceB < portal.radius + ball.radius) {
          ball.x = portal.ax + Math.sign(ball.vx || 1) * (portal.radius + ball.radius + 4);
          ball.y = portal.ay;
          ball.vy += randomRange(game.rng, -85, 85);
          ball.portalCooldown = 0.42;
          spawnImpact(game, portal.ax, portal.ay, ball.element, 40, "ring");
          playSound("power", ball.element);
          return;
        }
      }
    };

    const updateBall = (ball: Ball, dt: number) => {
      ball.previousX = ball.x;
      ball.previousY = ball.y;
      ball.portalCooldown = Math.max(0, ball.portalCooldown - dt);
      ball.collisionCooldown = Math.max(0, ball.collisionCooldown - dt);
      ball.phantomTimer = Math.max(0, ball.phantomTimer - dt);
      const beforeBerserk = ball.berserkTimer;
      ball.berserkTimer = Math.max(0, ball.berserkTimer - dt);
      if (beforeBerserk > 0 && ball.berserkTimer <= 0) ball.radius = ball.baseRadius;

      if (game.blackHole) {
        const dx = game.blackHole.x - ball.x;
        const dy = game.blackHole.y - ball.y;
        const distanceSq = Math.max(4200, dx * dx + dy * dy);
        const force = 820000 / distanceSq;
        ball.vx += dx * force * dt;
        ball.vy += dy * force * dt;
      }
      const magnetOwner: ElementSide | null = game.magnet.ice > 0 ? "ice" : game.magnet.fire > 0 ? "fire" : null;
      if (magnetOwner) {
        const paddle = magnetOwner === "ice" ? game.left : game.right;
        const dx = paddle.x - ball.x;
        if ((magnetOwner === "ice" && ball.vx < 0) || (magnetOwner === "fire" && ball.vx > 0)) {
          const targetY = paddle.y + paddle.height / 2;
          ball.vy += clamp(targetY - ball.y, -220, 220) * dt * 0.9;
          ball.vx += Math.sign(dx) * 35 * dt;
        }
      }
      ball.vy += ball.spin * dt;
      ball.spin *= Math.pow(0.35, dt);
      const stableBefore = stableBallVelocity(ball.vx, ball.vy, ball.vx >= 0 ? 1 : -1);
      ball.vx = stableBefore.vx;
      ball.vy = stableBefore.vy;
      game.metrics.maxBallSpeed = Math.max(game.metrics.maxBallSpeed, stableBefore.speed);

      const barrierHit = collideBarrier(ball, dt);
      if (!barrierHit && ball.collisionCooldown <= 0) {
        const candidate = paddleHitCandidates(ball, dt);
        if (!handlePaddleHit(ball, candidate, dt)) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
        }
      } else if (!barrierHit) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
      }

      if (ball.y - ball.radius <= 13 && ball.vy < 0) {
        ball.y = 13 + ball.radius;
        ball.vy = Math.abs(ball.vy);
        ball.spin *= -0.6;
        spawnImpact(game, ball.x, ball.y, ball.element, 12, renderOptionsRef.current.impactStyle);
        playSound("wall", ball.element);
      } else if (ball.y + ball.radius >= WORLD_H - 13 && ball.vy > 0) {
        ball.y = WORLD_H - 13 - ball.radius;
        ball.vy = -Math.abs(ball.vy);
        ball.spin *= -0.6;
        spawnImpact(game, ball.x, ball.y, ball.element, 12, renderOptionsRef.current.impactStyle);
        playSound("wall", ball.element);
      }

      teleportBall(ball);
      const trailLimit = visualBudget(game.quality, profileRef.current.settings.reduceEffects).trail;
      ball.trail.push({ x: ball.x, y: ball.y, life: 1, element: ball.element });
      if (ball.trail.length > trailLimit) ball.trail.shift();
    };

    const update = (dt: number) => {
      if (game.ended) return;
      game.elapsed += dt;
      if (game.mode === "bossRush") game.bossRushElapsed += dt;
      if (game.mode === "survival") {
        game.launchSpeed = Math.min(1260, game.launchSpeed + dt * 6.8);
        game.aiSpeed = Math.min(1140, game.aiSpeed + dt * 2.5);
      }
      updateTimers(dt);
      updatePaddles(dt);
      updateBoss(dt);

      const chaosEnabled = game.mode === "chaos" || game.campaignStage?.modifier === "chaos" || (game.mode === "duel" && game.duelConfig.chaos);
      if (chaosEnabled) {
        game.chaosTimer -= dt;
        if (game.chaosTimer <= 0) {
          triggerChaosEvent();
          game.chaosTimer = randomRange(game.rng, 7.5, 11.5);
        }
      }

      spawnPowerUpIfNeeded(dt);
      if (game.roundTransition > 0) return;
      if (game.serveDelay > 0) {
        game.serveDelay -= dt;
        if (game.serveDelay <= 0) {
          launchServe(game);
          playSound("launch", game.balls[0]?.element ?? "ice");
        }
      } else {
        const timeScale = game.slowMotion > 0 ? (game.timeWarp.ice > 0 || game.timeWarp.fire > 0 ? 0.58 : 0.74) : 1;
        const physicsDt = dt * timeScale;
        for (const ball of game.balls) updateBall(ball, physicsDt);

        if (game.powerUp) {
          for (const ball of game.balls) {
            const distance = Math.hypot(ball.x - game.powerUp.x, ball.y - game.powerUp.y);
            if (distance < ball.radius + game.powerUp.radius) {
              const pickup = game.powerUp;
              game.powerUp = null;
              game.nextPowerUp = game.mode === "chaos" ? randomRange(game.rng, 2.8, 4.8) : randomRange(game.rng, 6.5, 10.2);
              applyPowerUp(game, ball, pickup.kind, ball.element);
              break;
            }
          }
        }

        let scorer: ElementSide | null = null;
        for (let index = game.balls.length - 1; index >= 0; index -= 1) {
          const ball = game.balls[index];
          if (ball.x < 18 && ball.vx < 0 && game.shields.ice > 0) {
            game.shields.ice = 0;
            ball.x = 38;
            ball.vx = Math.abs(ball.vx) * 1.04;
            ball.element = "ice";
            spawnImpact(game, 24, ball.y, "ice", 72, renderOptionsRef.current.impactStyle);
            game.shake = 18;
            announce("ice", "SAUVETAGE", "BOUCLIER CONSOMMÉ");
            playSound("power", "ice");
            vibrate([30, 20, 55]);
          } else if (ball.x > WORLD_W - 18 && ball.vx > 0 && game.shields.fire > 0) {
            game.shields.fire = 0;
            ball.x = WORLD_W - 38;
            ball.vx = -Math.abs(ball.vx) * 1.04;
            ball.element = "fire";
            spawnImpact(game, WORLD_W - 24, ball.y, "fire", 72, renderOptionsRef.current.impactStyle);
            game.shake = 18;
            announce("fire", "SAUVETAGE", "BOUCLIER CONSOMMÉ");
            playSound("power", "fire");
            vibrate([30, 20, 55]);
          } else if (ball.x < -70) {
            scorer ??= "fire";
            game.balls.splice(index, 1);
          } else if (ball.x > WORLD_W + 70) {
            scorer ??= "ice";
            game.balls.splice(index, 1);
          }
        }
        if (scorer && game.balls.length === 0) {
          scorePoint(scorer);
          return;
        }
      }

      const budget = visualBudget(game.quality, profileRef.current.settings.reduceEffects);
      for (const ball of game.balls) {
        for (let index = ball.trail.length - 1; index >= 0; index -= 1) {
          ball.trail[index].life -= dt * 2.8;
          if (ball.trail[index].life <= 0) ball.trail.splice(index, 1);
        }
      }
      for (let index = game.particles.length - 1; index >= 0; index -= 1) {
        const particle = game.particles[index];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.1, dt);
        particle.vy *= Math.pow(0.1, dt);
        particle.life -= dt;
        if (particle.life <= 0) game.particles.splice(index, 1);
      }
      if (game.particles.length > budget.particles) game.particles.splice(0, game.particles.length - budget.particles);
      game.shake = Math.max(0, game.shake - dt * 35);
      game.flash = Math.max(0, game.flash - dt * 2.8);
      game.musicTimer -= dt;
      if (game.musicTimer <= 0) {
        playMusicPulse(game);
        game.musicTimer = game.boss ? Math.max(0.58, 1.08 - game.boss.phase * 0.1) : Math.max(0.72, 1.35 - game.rally * 0.012);
      }
      const wholeSecond = Math.floor(game.mode === "bossRush" ? game.bossRushElapsed : game.elapsed);
      if (wholeSecond !== uiSecondRef.current) {
        uiSecondRef.current = wholeSecond;
        setElapsedDisplay(game.mode === "bossRush" ? game.bossRushElapsed : game.elapsed);
      }
      if (game.mode === "tutorial" && game.elapsed >= 55 && tutorialStepRef.current < 5) {
        setTutorialStep(5);
        game.energy.ice = 100;
        setEnergy({ ...game.energy });
        announce("ice", "ULTIMATE PRÊT", "DÉCLENCHE ZÉRO ABSOLU");
      }
    };

    const loop = (now: number) => {
      if (screenRef.current !== "playing") return;
      const frameDelta = Math.min(MAX_FRAME_DELTA, Math.max(0, (now - previousFrame) / 1000));
      previousFrame = now;
      accumulator = Math.min(accumulator + frameDelta, FIXED_STEP * 10);
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < 10) {
        update(FIXED_STEP);
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      renderArena(ctx, game, now, renderOptionsRef.current);
      animationRef.current = requestAnimationFrame(loop);
    };

    renderArena(ctx, game, performance.now(), renderOptionsRef.current);
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [activateUltimate, announce, applyPowerUp, finalizeMatch, persistProfile, playMusicPulse, playSound, screen, setTutorialStep, vibrate]);

  useEffect(() => {
    if ((screen === "paused" || screen === "ended") && gameRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d", { alpha: false });
      if (ctx) renderArena(ctx, gameRef.current, performance.now(), renderOptionsRef.current);
    }
  }, [screen]);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WORLD_W,
      y: ((event.clientY - rect.top) / rect.height) * WORLD_H,
    };
  };

  const applyPointerTarget = (side: ElementSide, y: number) => {
    const game = gameRef.current;
    if (!game) return;
    const reversed = game.reverse[side] > 0;
    const target = reversed ? WORLD_H - y : y;
    if (side === "ice") game.left.targetY = target;
    else game.right.targetY = target;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    if (!game || screenRef.current !== "playing") return;
    const position = pointerPosition(event);
    const side: ElementSide = game.mode !== "duel" || position.x < WORLD_W / 2 ? "ice" : "fire";
    game.pointers.set(event.pointerId, { side });
    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointerTarget(side, position.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    const pointer = game?.pointers.get(event.pointerId);
    if (!game || !pointer) return;
    const position = pointerPosition(event);
    applyPointerTarget(pointer.side, position.y);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    gameRef.current?.pointers.delete(event.pointerId);
  };

  const returnToMenu = useCallback(() => {
    setScreen("menu");
    setMenuTab(mode === "campaign" ? "campaign" : mode === "solo" || mode === "duel" ? "arena" : "modes");
    setTutorialStep(-1);
    setAbilityNotice(null);
    try {
      const orientation = window.screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientation.unlock?.();
    } catch {
      // Facultatif.
    }
  }, [mode, setScreen, setTutorialStep]);

  const replayMatch = useCallback(() => {
    if (mode === "bossRush") beginMatch("bossRush", BOSS_RUSH_STAGES[0], 0);
    else beginMatch(mode, currentStage);
  }, [beginMatch, currentStage, mode]);

  const finishTutorial = useCallback(() => {
    persistProfile((previous) => ({ ...previous, tutorialCompleted: true }));
    setShowTutorialOffer(false);
    setScreen("menu");
    setMenuTab("arena");
    setTutorialStep(-1);
    announce("neutral", "TUTORIEL TERMINÉ", "PROTOCOLE ASSIMILÉ");
  }, [announce, persistProfile, setScreen, setTutorialStep]);

  const buyOrEquipCosmetic = useCallback((itemId: string) => {
    const item = COSMETICS.find((entry) => entry.id === itemId);
    if (!item) return;
    persistProfile((previous) => {
      const owned = previous.ownedCosmetics[item.category].includes(item.id);
      const levelUnlocked = !item.unlockLevel || previous.level >= item.unlockLevel;
      const achievementUnlocked = !item.achievement || Boolean(previous.achievements[item.achievement]);
      if (!owned && (!levelUnlocked || !achievementUnlocked || previous.shards < item.price)) return previous;
      const ownedCosmetics = { ...previous.ownedCosmetics, [item.category]: owned ? previous.ownedCosmetics[item.category] : [...previous.ownedCosmetics[item.category], item.id] };
      const equippedCosmetics = { ...previous.equippedCosmetics, [item.category]: item.id };
      const next: V3Profile = {
        ...previous,
        shards: owned ? previous.shards : previous.shards - item.price,
        ownedCosmetics,
        equippedCosmetics,
      };
      if (item.category === "paddles") {
        next.activeSkin = item.id;
        next.ownedSkins = owned ? previous.ownedSkins : Array.from(new Set([...previous.ownedSkins, item.id]));
      }
      return next;
    });
  }, [persistProfile]);

  const updateSettings = useCallback(<K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    persistProfile((previous) => ({ ...previous, settings: { ...previous.settings, [key]: value } }));
  }, [persistProfile]);

  const exportProgress = useCallback(() => {
    const payload = JSON.stringify(profileRef.current, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `CR3ATIX-PONG-V3-${localDateKey()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    announce("neutral", "PROGRESSION EXPORTÉE", "FICHIER JSON CRÉÉ");
  }, [announce]);

  const onImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = parseImportedProfile(await file.text());
      pendingImportRef.current = normalizeProfile(parsed);
      setImportError("");
      setShowImportConfirm(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Sauvegarde invalide.");
    }
  }, []);

  const confirmImport = useCallback(() => {
    const next = pendingImportRef.current;
    if (!next) return;
    profileRef.current = next;
    setProfile(next);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* facultatif */ }
    pendingImportRef.current = null;
    setShowImportConfirm(false);
    announce("neutral", "PROGRESSION IMPORTÉE", `NIVEAU ${next.level}`);
  }, [announce]);

  const confirmReset = useCallback(() => {
    const today = dailyChallengeForDate(localDateKey());
    const next = normalizeProfile({ ...DEFAULT_PROFILE, daily: { date: today.date, id: today.id, progress: 0, completed: false, rewarded: false }, settings: profileRef.current.settings });
    profileRef.current = next;
    setProfile(next);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* facultatif */ }
    setShowResetConfirm(false);
    announce("neutral", "PROGRESSION RÉINITIALISÉE");
  }, [announce]);

  const updatePseudo = useCallback((value: string) => {
    const safe = value.trim().replace(/[^\p{L}\p{N}_\- ]/gu, "").slice(0, 16) || "PILOTE";
    persistProfile((previous) => ({ ...previous, pseudo: safe }));
  }, [persistProfile]);

  if (!loaded) {
    return (
      <main className="app-shell loading-shell">
        <div className="boot-core"><span>CR3@TIX</span><strong>PONG V3</strong><i /></div>
      </main>
    );
  }

  const favoritePowerEntry = Object.entries(profile.stats.powerUps).sort((a, b) => b[1] - a[1])[0];
  const favoritePower = favoritePowerEntry?.[1] ? POWER_UPS.find((entry) => entry.kind === favoritePowerEntry[0])?.label ?? "—" : "—";
  const winRatio = profile.stats.matches ? Math.round((profile.stats.wins / profile.stats.matches) * 100) : 0;
  const averageRally = profile.stats.matches ? (profile.stats.totalRallyHits / profile.stats.matches).toFixed(1) : "0";
  const maxSets = mode === "duel" ? Math.ceil(duelConfig.bestOf / 2) : 0;
  const tutorialCopy = [
    { title: "DÉPLACE TA RAQUETTE", text: "Glisse verticalement sur le côté Glace." },
    { title: "RENVOIE LA BALLE", text: "Place ta raquette sur sa trajectoire." },
    { title: "RÉALISE UN PERFECT HIT", text: "Frappe exactement avec le centre." },
    { title: "CAPTURE LE POWER-UP", text: "Fais passer la balle dans le noyau lumineux." },
    { title: "LIBÈRE TON ULTIMATE", text: "Ta jauge est pleine : active Zéro Absolu." },
    { title: "PROTOCOLE TERMINÉ", text: "Tu maîtrises mouvement, précision, pouvoirs et Ultimate." },
  ][Math.max(0, tutorialStep)] ?? { title: "TUTORIEL", text: "" };

  return (
    <main className={`app-shell ${screen !== "menu" ? "game-active" : ""}`}>
      <div className="ambient ambient-ice" />
      <div className="ambient ambient-fire" />
      <div className="grain" />

      {screen === "menu" ? (
        <section className="menu-panel" aria-labelledby="game-title">
          <div className="menu-topbar">
            <div className="brand-chip"><span className="brand-dot" /> CR3@TIX GAME LAB <b>V3.0.0</b></div>
            <div className="menu-actions">
              <button className="utility-button" onClick={() => setShowGuide(true)} aria-label="Afficher les règles">?</button>
              <button className="utility-button" onClick={enterFullscreen} aria-label="Afficher en plein écran">⛶</button>
              {installPrompt && !isStandalone && <button className="install-button" onClick={installApp}>↓ INSTALLER</button>}
              {isStandalone && <span className="installed-chip">✓ INSTALLÉ</span>}
            </div>
          </div>

          <div className="title-wrap">
            <p className="eyebrow">COMBAT ARCADE ÉLÉMENTAIRE</p>
            <h1 id="game-title"><span className="ice-text">CR3@TIX</span><span className="fire-text">PONG</span></h1>
            <span className="v3-mark">VERSION 3.0.0 · GLACE CONTRE FEU</span>
            <p className="lead">Maîtrise la précision, déchaîne ton Ultimate et terrasse les gardiens des douze arènes.</p>
          </div>

          <div className="profile-strip">
            <span className="profile-avatar">{profile.avatar}</span>
            <span><small>{profile.title}</small><strong>{profile.pseudo}</strong></span>
            <span className="profile-level"><small>NIVEAU</small><strong>{profile.level}</strong></span>
            <span className="profile-xp"><i style={{ width: `${Math.min(100, (profile.xp / xpForLevel(profile.level)) * 100)}%` }} /><small>{profile.xp}/{xpForLevel(profile.level)} XP</small></span>
            <span className="profile-shards"><strong>{profile.shards}</strong><small>◆</small></span>
          </div>

          <nav className="v3-nav" aria-label="Sections du jeu">
            {([
              ["arena", "◈", "ARÈNE"],
              ["campaign", "⌁", "CAMPAGNE"],
              ["modes", "▰", "MODES"],
              ["arsenal", "✦", "ARSENAL"],
              ["achievements", "♛", "SUCCÈS"],
              ["records", "▥", "DOSSIER"],
              ["settings", "⚙", "RÉGLAGES"],
            ] as Array<[MenuTab, string, string]>).map(([tab, icon, label]) => (
              <button key={tab} className={menuTab === tab ? "active" : ""} onClick={() => setMenuTab(tab)}><span>{icon}</span>{label}</button>
            ))}
          </nav>

          {menuTab === "arena" && (
            <div className="tab-content arena-tab">
              <button className={`daily-banner ${profile.daily.completed ? "complete" : ""}`} onClick={() => setMenuTab("records")}>
                <span className="daily-icon">☷</span>
                <span><small>DÉFI DU JOUR · {dailyChallenge.date.split("-").reverse().join("/")}</small><strong>{dailyChallenge.title}</strong><em>{dailyChallenge.description}</em></span>
                <span className="daily-progress"><b>{profile.daily.progress}/{dailyChallenge.target}</b><i><u style={{ width: `${Math.min(100, (profile.daily.progress / dailyChallenge.target) * 100)}%` }} /></i><small>+{dailyChallenge.reward} ◆</small></span>
              </button>

              <div className="setup-card">
                <div className="setup-section">
                  <span className="section-label">COMBAT LIBRE</span>
                  <div className="mode-grid">
                    <button className={`choice-card ice-choice ${arenaMode === "solo" ? "selected" : ""}`} onClick={() => setArenaMode("solo")}>
                      <span className="choice-icon">❄</span><span><strong>SOLO</strong><small>Affronte une IA honnête et adaptative</small></span><span className="radio" />
                    </button>
                    <button className={`choice-card fire-choice ${arenaMode === "duel" ? "selected" : ""}`} onClick={() => setArenaMode("duel")}>
                      <span className="choice-icon">♨</span><span><strong>DUEL LOCAL</strong><small>Deux joueurs et vrai multi-touch</small></span><span className="radio" />
                    </button>
                  </div>
                </div>

                {arenaMode === "solo" ? (
                  <div className="setup-section difficulty-section">
                    <span className="section-label">INTENSITÉ ET COMPORTEMENT IA</span>
                    <div className="difficulty-grid">
                      {(Object.keys(DIFFICULTIES) as Difficulty[]).map((level) => (
                        <button key={level} className={difficulty === level ? "active" : ""} onClick={() => setDifficulty(level)}>
                          <strong>{DIFFICULTIES[level].label}</strong><small>{DIFFICULTIES[level].subtitle}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="setup-section duel-settings">
                    <span className="section-label">PROTOCOLE DU DUEL</span>
                    <div className="duel-option-grid">
                      <label><span>SCORE</span><select value={duelConfig.scoreTarget} onChange={(event) => setDuelConfig((previous) => ({ ...previous, scoreTarget: Number(event.target.value) as DuelConfig["scoreTarget"] }))}><option value="3">3 POINTS</option><option value="5">5 POINTS</option><option value="7">7 POINTS</option><option value="10">10 POINTS</option></select></label>
                      <label><span>SÉRIE</span><select value={duelConfig.bestOf} onChange={(event) => setDuelConfig((previous) => ({ ...previous, bestOf: Number(event.target.value) as DuelConfig["bestOf"] }))}><option value="1">1 MANCHE</option><option value="3">BEST OF 3</option><option value="5">BEST OF 5</option></select></label>
                      <label><span>ARÈNE</span><select value={duelConfig.arena} onChange={(event) => setDuelConfig((previous) => ({ ...previous, arena: event.target.value as DuelConfig["arena"] }))}><option value="ascension">ASCENSION</option><option value="boreal">ROYAUME BORÉAL</option><option value="rift">FAILLE THERMIQUE</option><option value="solar">EMPIRE DU BRASIER</option><option value="random">ALÉATOIRE</option></select></label>
                      <label><span>HANDICAP</span><select value={duelConfig.handicap} onChange={(event) => setDuelConfig((previous) => ({ ...previous, handicap: event.target.value as DuelConfig["handicap"] }))}><option value="none">AUCUN</option><option value="ice">AVANTAGE GLACE</option><option value="fire">AVANTAGE FEU</option></select></label>
                    </div>
                    <div className="toggle-row compact">
                      <button className={duelConfig.powers ? "active" : ""} onClick={() => setDuelConfig((previous) => ({ ...previous, powers: !previous.powers }))}>POUVOIRS {duelConfig.powers ? "ON" : "OFF"}</button>
                      <button className={duelConfig.ultimates ? "active" : ""} onClick={() => setDuelConfig((previous) => ({ ...previous, ultimates: !previous.ultimates }))}>ULTIMATES {duelConfig.ultimates ? "ON" : "OFF"}</button>
                      <button className={duelConfig.chaos ? "active" : ""} onClick={() => setDuelConfig((previous) => ({ ...previous, chaos: !previous.chaos }))}>CHAOS {duelConfig.chaos ? "ON" : "OFF"}</button>
                    </div>
                  </div>
                )}

                <button className="launch-button" onClick={startArena}><span>ENTRER DANS L’ARÈNE</span><span className="launch-arrow">→</span></button>
                <button className="tutorial-link" onClick={() => beginMatch("tutorial")}>APPRENDRE À JOUER · 45–60 S</button>
              </div>
            </div>
          )}

          {menuTab === "campaign" && (
            <div className="tab-content campaign-panel">
              <div className="panel-heading">
                <div><span>MODE HISTOIRE</span><h2>LA ROUTE DE L’ASCENSION</h2><p>Une étoile par objectif. Les mécaniques, les arènes et les trois gardiens évoluent réellement.</p></div>
                <div className="currency-card"><strong>{totalStars}<i>/36</i></strong><small>ÉTOILES</small></div>
              </div>
              <div className="campaign-progress"><span style={{ width: `${Math.min(100, (completedStages / CAMPAIGN_STAGES.length) * 100)}%` }} /><strong>{completedStages}/12 CONQUISES</strong></div>
              {CHAPTERS.map((chapter) => (
                <section className={`chapter chapter-${chapter.id}`} key={chapter.id}>
                  <header><span style={{ color: chapter.color }}>{chapter.label}</span><strong>{chapter.name}</strong><em>{chapter.description}</em></header>
                  <div className="stage-grid">
                    {CAMPAIGN_STAGES.filter((stage) => stage.chapter === chapter.id).map((stage) => {
                      const locked = stage.id > profile.unlockedStage;
                      const stageStars = profile.stars[String(stage.id)] ?? 0;
                      const completed = profile.completedObjectives[String(stage.id)] ?? [];
                      return (
                        <button key={stage.id} className={`stage-card ${stage.boss ? "boss" : ""} ${locked ? "locked" : ""} ${completed.includes(stage.objectives[0].id) ? "cleared" : ""}`} onClick={() => startCampaignStage(stage)} disabled={locked}>
                          <span className="stage-number">{locked ? "▣" : String(stage.id).padStart(2, "0")}</span>
                          <span className="stage-copy"><small>{stage.boss ? `BOSS · ${stage.boss}` : stage.modifier.toUpperCase()}</small><strong>{stage.name}</strong><em>{stage.subtitle}</em></span>
                          <span className="stage-stars">{"★".repeat(stageStars)}{"☆".repeat(3 - stageStars)}</span>
                          <span className="stage-objectives">
                            {stage.objectives.map((entry) => <i key={entry.id} className={completed.includes(entry.id) ? "done" : ""}>{completed.includes(entry.id) ? "✓" : "○"} {entry.label}</i>)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {menuTab === "modes" && (
            <div className="tab-content modes-panel">
              <div className="panel-heading"><div><span>EXPÉRIENCES V3</span><h2>MODES DE COMBAT</h2><p>Quatre règles distinctes, quatre classements locaux et aucune microtransaction.</p></div></div>
              <div className="special-mode-grid">
                <article className="special-mode survival-mode"><span className="mode-symbol">◷</span><div><small>ENDURANCE</small><h3>SURVIVAL</h3><p>Trois vies, vitesse croissante, meilleur temps et meilleur rally.</p><em>RECORD · {formatTime(profile.stats.survivalBest)}</em></div><button onClick={() => beginMatch("survival")}>SURVIVRE</button></article>
                <article className="special-mode chaos-mode"><span className="mode-symbol">◎</span><div><small>INSTABILITÉ</small><h3>CHAOS</h3><p>Power-ups fréquents, portails, tailles variables et Multiball.</p><em>ÉVÉNEMENTS LISIBLES</em></div><button onClick={() => beginMatch("chaos")}>OUVRIR LE RIFT</button></article>
                <article className="special-mode bossrush-mode"><span className="mode-symbol">♛</span><div><small>TRIPLE MENACE</small><h3>BOSS RUSH</h3><p>KRYON, VORTEX puis SOLARIS sans quitter l’arène.</p><em>RECORD · {profile.stats.bossRushBest ? formatTime(profile.stats.bossRushBest, true) : "—"}</em></div><button onClick={() => beginMatch("bossRush", BOSS_RUSH_STAGES[0], 0)}>AFFRONTER LES BOSS</button></article>
                <article className="special-mode hardcore-mode"><span className="mode-symbol">▲</span><div><small>HAUTE VITESSE</small><h3>HARDCORE</h3><p>Premier à 3, balle rapide, petite raquette et IA agressive.</p><em>AUCUNE ERREUR GRATUITE</em></div><button onClick={() => beginMatch("hardcore")}>ACCEPTER LE RISQUE</button></article>
              </div>
            </div>
          )}

          {menuTab === "arsenal" && (
            <div className="tab-content arsenal-panel">
              <div className="panel-heading">
                <div><span>PERSONNALISATION LOCALE</span><h2>ARSENAL V3</h2><p>Débloque des effets visuels avec ta progression, tes succès et tes fragments.</p></div>
                <div className="currency-card"><strong>{profile.shards}</strong><small>FRAGMENTS</small></div>
              </div>
              <div className="arsenal-tabs">
                {ARSENAL_CATEGORIES.map((category) => <button key={category.id} className={arsenalCategory === category.id ? "active" : ""} onClick={() => setArsenalCategory(category.id)}>{category.label}</button>)}
              </div>
              <div className="cosmetic-grid">
                {COSMETICS.filter((item) => item.category === arsenalCategory).map((item) => {
                  const owned = profile.ownedCosmetics[item.category].includes(item.id);
                  const equipped = profile.equippedCosmetics[item.category] === item.id;
                  const levelLocked = Boolean(item.unlockLevel && profile.level < item.unlockLevel);
                  const achievementLocked = Boolean(item.achievement && !profile.achievements[item.achievement]);
                  const canBuy = !levelLocked && !achievementLocked && profile.shards >= item.price;
                  return (
                    <article key={item.id} className={`cosmetic-card ${equipped ? "equipped" : ""}`}>
                      <div className="cosmetic-preview" style={{ "--cosmetic": item.color, "--cosmetic-accent": item.accent } as React.CSSProperties}><i /><b /><i /></div>
                      <div className="cosmetic-copy"><span><strong>{item.name}</strong><small>{item.subtitle}</small></span>{equipped && <em>ÉQUIPÉ</em>}</div>
                      {levelLocked && <p>REQUIS · NIVEAU {item.unlockLevel}</p>}
                      {achievementLocked && <p>REQUIS · SUCCÈS {ACHIEVEMENTS.find((entry) => entry.id === item.achievement)?.name}</p>}
                      <button onClick={() => buyOrEquipCosmetic(item.id)} disabled={equipped || (!owned && !canBuy)}>{equipped ? "ACTIF" : owned ? "ÉQUIPER" : canBuy ? `DÉBLOQUER · ${item.price} ◆` : levelLocked || achievementLocked ? "VERROUILLÉ" : `MANQUE ${item.price - profile.shards} ◆`}</button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {menuTab === "achievements" && (
            <div className="tab-content achievements-panel">
              <div className="panel-heading">
                <div><span>40 OBJECTIFS LOCAUX</span><h2>SUCCÈS</h2><p>Chaque accomplissement est sauvegardé sur ton appareil et récompensé en fragments.</p></div>
                <div className="currency-card"><strong>{Object.keys(profile.achievements).length}<i>/{ACHIEVEMENTS.length}</i></strong><small>DÉBLOQUÉS</small></div>
              </div>
              <div className="achievement-progress"><span style={{ width: `${(Object.keys(profile.achievements).length / ACHIEVEMENTS.length) * 100}%` }} /></div>
              <div className="achievement-grid">
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked = Boolean(profile.achievements[achievement.id]);
                  const progress = achievementValue(achievement, profile);
                  return (
                    <article key={achievement.id} className={unlocked ? "unlocked" : ""}>
                      <span className="achievement-icon">{unlocked ? achievement.icon : "◇"}</span>
                      <div><small>{unlocked ? "DÉBLOQUÉ" : `${Math.min(achievement.target, Math.round(progress))}/${achievement.target}`}</small><strong>{achievement.name}</strong><p>{achievement.description}</p></div>
                      <em>+{achievement.reward} ◆</em>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {menuTab === "records" && (
            <div className="tab-content records-panel">
              <div className="panel-heading"><div><span>PROFIL ET ARCHIVES LOCALES</span><h2>DOSSIER DE COMBAT</h2><p>Progression V3, statistiques étendues, défi quotidien et historique complet.</p></div></div>
              <section className="profile-card-v3">
                <div className="profile-identity">
                  <span className="big-avatar">{profile.avatar}</span>
                  <label><small>PSEUDO LOCAL</small><input defaultValue={profile.pseudo} maxLength={16} onBlur={(event) => updatePseudo(event.target.value)} /></label>
                  <span className="profile-rank"><small>{profile.title}</small><strong>NIVEAU {profile.level}</strong><i><u style={{ width: `${Math.min(100, (profile.xp / xpForLevel(profile.level)) * 100)}%` }} /></i><em>{profile.xp}/{xpForLevel(profile.level)} XP</em></span>
                </div>
                <div className="avatar-picker" aria-label="Choisir un avatar élémentaire">
                  {["❄", "🔥", "◈", "⚡", "◎", "♛"].map((avatar) => <button key={avatar} className={profile.avatar === avatar ? "active" : ""} onClick={() => persistProfile((previous) => ({ ...previous, avatar }))}>{avatar}</button>)}
                </div>
              </section>

              <section className={`daily-detail ${profile.daily.completed ? "complete" : ""}`}>
                <span>☷</span><div><small>DÉFI QUOTIDIEN</small><strong>{dailyChallenge.title}</strong><p>{dailyChallenge.description}</p></div><div><strong>{profile.daily.progress}/{dailyChallenge.target}</strong><small>{profile.daily.completed ? "RÉCOMPENSE OBTENUE" : `+${dailyChallenge.reward} FRAGMENTS`}</small></div>
              </section>

              <div className="record-stats extended">
                <article><small>MATCHS</small><strong>{profile.stats.matches}</strong></article>
                <article><small>VICTOIRES</small><strong>{profile.stats.wins}</strong></article>
                <article><small>RATIO</small><strong>{winRatio}<i>%</i></strong></article>
                <article><small>TEMPS TOTAL</small><strong>{formatTime(profile.stats.totalSeconds)}</strong></article>
                <article><small>MEILLEUR RALLY</small><strong>{profile.stats.bestRally}</strong></article>
                <article><small>RALLY MOYEN</small><strong>{averageRally}</strong></article>
                <article><small>PERFECT HITS</small><strong>{profile.stats.perfectHits}</strong></article>
                <article><small>SMASHS</small><strong>{profile.stats.smashes}</strong></article>
                <article><small>ULTIMATES</small><strong>{profile.stats.ultimates}</strong></article>
                <article><small>VITESSE MAX</small><strong>{Math.round(profile.stats.maxBallSpeed)}</strong></article>
                <article><small>BOSS BATTUS</small><strong>{profile.stats.bossesDefeated.length}<i>/3</i></strong></article>
                <article><small>FRAGMENTS GAGNÉS</small><strong>{profile.stats.shardsEarned}</strong></article>
                <article><small>POWER-UP FAVORI</small><strong className="small-stat">{favoritePower}</strong></article>
                <article><small>SURVIVAL</small><strong>{formatTime(profile.stats.survivalBest)}</strong></article>
                <article><small>BOSS RUSH</small><strong>{profile.stats.bossRushBest ? formatTime(profile.stats.bossRushBest, true) : "—"}</strong></article>
                <article><small>ÉTOILES</small><strong>{totalStars}<i>/36</i></strong></article>
              </div>

              <div className="backup-actions">
                <button onClick={exportProgress}>⇩ EXPORTER MA PROGRESSION</button>
                <button onClick={() => importInputRef.current?.click()}>⇧ IMPORTER MA PROGRESSION</button>
                <input ref={importInputRef} type="file" accept="application/json,.json" onChange={onImportFile} hidden />
              </div>

              <div className="history-card">
                <header><span>30 DERNIERS COMBATS</span><small>MODE · DURÉE · DIFFICULTÉ · SCORE · RALLY</small></header>
                {profile.records.length === 0 ? (
                  <div className="empty-records"><span>◇</span><strong>AUCUN COMBAT ARCHIVÉ</strong><p>Entre dans l’arène pour inscrire ton premier résultat.</p></div>
                ) : profile.records.map((record) => (
                  <article key={record.id} className={record.result}>
                    <span className="result-dot" />
                    <span className="record-name"><strong>{record.label}</strong><small>{record.date} · {formatTime(record.duration)} · {record.difficulty.toUpperCase()}</small></span>
                    <span className="record-result">{record.result.toUpperCase()}</span>
                    <strong className="record-score">{record.ice}—{record.fire}</strong>
                    <small className="record-rally">×{record.rally}</small>
                  </article>
                ))}
              </div>
            </div>
          )}

          {menuTab === "settings" && (
            <div className="tab-content settings-panel">
              <div className="panel-heading"><div><span>CONFORT ET PERFORMANCE</span><h2>RÉGLAGES</h2><p>Chaque option est locale, instantanée et adaptée au smartphone.</p></div></div>
              <div className="settings-grid">
                <section>
                  <h3>AUDIO</h3>
                  <label className="range-setting"><span><strong>MUSIQUE</strong><small>{profile.settings.music}%</small></span><input type="range" min="0" max="100" step="1" value={profile.settings.music} onChange={(event) => updateSettings("music", Number(event.target.value))} /></label>
                  <label className="range-setting"><span><strong>EFFETS</strong><small>{profile.settings.effects}%</small></span><input type="range" min="0" max="100" step="1" value={profile.settings.effects} onChange={(event) => updateSettings("effects", Number(event.target.value))} /></label>
                  <button className={`setting-toggle ${profile.settings.vibrations ? "active" : ""}`} onClick={() => updateSettings("vibrations", !profile.settings.vibrations)}><span><strong>VIBRATIONS</strong><small>Impacts, Smashs, Ultimates et scores</small></span><i>{profile.settings.vibrations ? "ON" : "OFF"}</i></button>
                </section>
                <section>
                  <h3>QUALITÉ VISUELLE</h3>
                  <div className="quality-grid">
                    {(["auto", "performance", "high", "ultra"] as Quality[]).map((quality) => <button key={quality} className={profile.settings.quality === quality ? "active" : ""} onClick={() => updateSettings("quality", quality)}>{quality === "high" ? "ÉLEVÉE" : quality.toUpperCase()}</button>)}
                  </div>
                  <p className="setting-help">PERFORMANCE réduit les particules, les flous et les traînées. ULTRA active le budget visuel maximal.</p>
                  <button className={`setting-toggle ${profile.settings.screenShake ? "active" : ""}`} onClick={() => updateSettings("screenShake", !profile.settings.screenShake)}><span><strong>SCREEN SHAKE</strong><small>Secousses lors des impacts puissants</small></span><i>{profile.settings.screenShake ? "ON" : "OFF"}</i></button>
                  <button className={`setting-toggle ${profile.settings.flashes ? "active" : ""}`} onClick={() => updateSettings("flashes", !profile.settings.flashes)}><span><strong>FLASHS</strong><small>Éclairs de score et d’Ultimate</small></span><i>{profile.settings.flashes ? "ON" : "OFF"}</i></button>
                  <button className={`setting-toggle ${profile.settings.reduceEffects ? "active" : ""}`} onClick={() => updateSettings("reduceEffects", !profile.settings.reduceEffects)}><span><strong>RÉDUCTION DES EFFETS</strong><small>Confort visuel et économie d’énergie</small></span><i>{profile.settings.reduceEffects ? "ON" : "OFF"}</i></button>
                </section>
                <section>
                  <h3>JEU ET INSTALLATION</h3>
                  <button className={`setting-toggle ${profile.settings.tutorialEnabled ? "active" : ""}`} onClick={() => updateSettings("tutorialEnabled", !profile.settings.tutorialEnabled)}><span><strong>TUTORIEL AU PREMIER LANCEMENT</strong><small>Proposition de protocole guidé</small></span><i>{profile.settings.tutorialEnabled ? "ON" : "OFF"}</i></button>
                  <div className="settings-actions">
                    <button onClick={() => beginMatch("tutorial")}>▶ REJOUER LE TUTORIEL</button>
                    <button onClick={enterFullscreen}>⛶ BASCULER PLEIN ÉCRAN</button>
                    {installPrompt && !isStandalone && <button onClick={installApp}>↓ INSTALLER LE JEU</button>}
                    <button className="danger" onClick={() => setShowResetConfirm(true)}>RÉINITIALISER LA PROGRESSION</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          <div className="feature-row" aria-label="Fonctionnalités principales">
            <span>✦ 12 ARÈNES</span><i /><span>♛ 3 BOSS MULTI-PHASES</span><i /><span>◉ 13 POWER-UPS</span><i /><span>∞ HORS LIGNE</span>
          </div>
        </section>
      ) : (
        <section className="arena-screen" aria-label="Arène CR3@TIX PONG V3">
          <header className="game-header">
            <button className="icon-button" onClick={returnToMenu} aria-label="Quitter la partie">←</button>
            <div className="mini-brand"><span>CR3@TIX PONG</span><b>V3</b></div>
            <div className="header-actions">
              <button className="icon-button" onClick={enterFullscreen} aria-label="Afficher en plein écran">⛶</button>
              <button className="icon-button" onClick={togglePause} aria-label="Mettre en pause">Ⅱ</button>
            </div>
          </header>

          <div className="scoreboard">
            <div className="team-score ice-score"><span>GLACE</span><strong>{score.ice}</strong>{mode === "duel" && duelConfig.bestOf > 1 && <small>{sets.ice}/{maxSets}</small>}</div>
            <div className="match-status">
              <span>{mode === "campaign" && currentStage ? `ARÈNE ${String(currentStage.id).padStart(2, "0")} · ${currentStage.boss ?? currentStage.name}` : mode === "bossRush" ? `BOSS RUSH ${Math.min(3, bossRushIndexDisplay + 1)}/3 · ${currentStage?.boss}` : `${MODE_LABELS[mode]}${mode === "solo" ? ` · ${DIFFICULTIES[difficulty].label}` : ""}`}</span>
              <strong>{mode === "survival" ? `${"◆".repeat(lives)}${"◇".repeat(Math.max(0, 3 - lives))} · ${formatTime(elapsedDisplay)}` : mode === "bossRush" ? formatTime(elapsedDisplay, true) : `PREMIER À ${currentStage?.winScore ?? (mode === "duel" ? duelConfig.scoreTarget : mode === "hardcore" ? 3 : WIN_SCORE)}`}</strong>
              <small>{rally ? `RALLY ${rally} · COMBO ×${combo}` : currentStage?.boss ? `PHASE ${bossPhase}/${currentStage.boss === "SOLARIS" ? 3 : 2}` : "PRÊT AU COMBAT"}</small>
            </div>
            <div className="team-score fire-score">{mode === "duel" && duelConfig.bestOf > 1 && <small>{sets.fire}/{maxSets}</small>}<strong>{score.fire}</strong><span>FEU</span></div>
          </div>

          <div className="energy-hud">
            <button className={`ultimate-button ice ${energy.ice >= 100 ? "ready" : ""}`} onClick={() => activateUltimate("ice")} disabled={!ultimatesEnabledDisplay || energy.ice < 100}>
              <span><i style={{ width: `${energy.ice}%` }} /></span><strong>ZÉRO ABSOLU</strong><b>{Math.round(energy.ice)}%</b>
            </button>
            {currentStage?.boss ? <div className={`boss-chip phase-${bossPhase}`}><span>♛</span><strong>{currentStage.boss}</strong><small>PHASE {bossPhase}</small></div> : <div className={`combo-chip combo-${combo}`}><span>×{combo}</span><small>COMBO</small></div>}
            <button className={`ultimate-button fire ${energy.fire >= 100 ? "ready" : ""}`} onClick={() => activateUltimate("fire")} disabled={mode !== "duel" || !ultimatesEnabledDisplay || energy.fire < 100}>
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
            {abilityNotice && <div className={`ability-notice ${abilityNotice.side}`}><strong>{abilityNotice.text}</strong>{abilityNotice.detail && <small>{abilityNotice.detail}</small>}</div>}
            {combo > 1 && screen === "playing" && <div className={`combo-float combo-${combo}`}>COMBO ×{combo}</div>}

            {mode === "tutorial" && screen === "playing" && tutorialStep >= 0 && (
              <div className={`tutorial-overlay step-${tutorialStep}`}>
                <span>{String(Math.min(6, tutorialStep + 1)).padStart(2, "0")}/06</span>
                <div><strong>{tutorialCopy.title}</strong><p>{tutorialCopy.text}</p></div>
                {tutorialStep === 4 && <button onClick={() => activateUltimate("ice")}>DÉCLENCHER</button>}
                {tutorialStep >= 5 && <button onClick={finishTutorial}>TERMINER</button>}
                <button className="tutorial-skip" onClick={finishTutorial}>{tutorialStep >= 5 ? "✓" : "PASSER"}</button>
              </div>
            )}

            {screen === "paused" && (
              <div className="game-overlay"><div className="overlay-card"><span className="overlay-symbol">Ⅱ</span><p>COMBAT SUSPENDU</p><h2>PAUSE</h2><button onClick={togglePause}>REPRENDRE</button><button className="ghost-action" onClick={returnToMenu}>QUITTER L’ARÈNE</button></div></div>
            )}

            {screen === "ended" && matchResult && (
              <div className="game-overlay">
                <div className={`overlay-card result-card ${matchResult.won ? "ice" : "fire"}`}>
                  {matchResult.newRecord && <span className="new-record">NOUVEAU RECORD</span>}
                  <span className="overlay-symbol">{matchResult.won ? "♛" : "✕"}</span>
                  <p>{matchResult.won ? "COMBAT REMPORTÉ" : "L’ÉLÉMENT A CÉDÉ"}</p>
                  <h2>{matchResult.won ? "VICTOIRE" : "DÉFAITE"}</h2>
                  <div className="result-summary"><span><small>SCORE</small><strong>{matchResult.score.ice}—{matchResult.score.fire}</strong></span><span><small>RALLY</small><strong>{matchResult.bestRally}</strong></span><span><small>TEMPS</small><strong>{formatTime(matchResult.duration, true)}</strong></span></div>
                  {mode === "campaign" && currentStage && (
                    <div className="mission-results">
                      {currentStage.objectives.map((objective) => <span key={objective.id} className={(profile.completedObjectives[String(currentStage.id)] ?? []).includes(objective.id) ? "done" : ""}><i>{(profile.completedObjectives[String(currentStage.id)] ?? []).includes(objective.id) ? "✓" : "○"}</i>{objective.label}</span>)}
                    </div>
                  )}
                  <div className="reward-line"><span>{mode === "campaign" ? `${"★".repeat(matchResult.stars)}${"☆".repeat(3 - matchResult.stars)}` : `+${matchResult.xp} XP`}</span><strong>+{matchResult.shards} ◆</strong></div>
                  <p className="result-advice">{matchResult.advice}</p>
                  {matchResult.won && mode === "campaign" && matchResult.nextStage && <button onClick={() => startCampaignStage(CAMPAIGN_STAGES[matchResult.nextStage! - 1])}>ARÈNE SUIVANTE</button>}
                  <button className={matchResult.won && mode === "campaign" && matchResult.nextStage ? "ghost-action" : ""} onClick={replayMatch}>REJOUER</button>
                  <button className="ghost-action" onClick={returnToMenu}>MENU</button>
                </div>
              </div>
            )}

            {achievementToast.length > 0 && screen === "ended" && <div className="achievement-toast"><span>♛ SUCCÈS DÉBLOQUÉ{achievementToast.length > 1 ? "S" : ""}</span><strong>{achievementToast.slice(0, 2).join(" · ")}</strong></div>}
          </div>
          <p className="control-tip">{mode !== "duel" ? "GLISSE TON DOIGT POUR PILOTER LA GLACE" : "CHAQUE JOUEUR CONTRÔLE SON CÔTÉ"}<span>W/S · ↑/↓ · ESPACE ULTIMATE · P PAUSE</span></p>
        </section>
      )}

      {showTutorialOffer && screen === "menu" && (
        <div className="global-modal tutorial-offer" role="dialog" aria-modal="true" aria-labelledby="tutorial-offer-title">
          <div className="guide-card offer-card">
            <span className="guide-kicker">PREMIER LANCEMENT</span>
            <h2 id="tutorial-offer-title">APPRENDRE À JOUER ?</h2>
            <p>Un protocole interactif de moins d’une minute pour apprendre le mouvement, Perfect Hit, power-up et Ultimate.</p>
            <button className="guide-action" onClick={() => beginMatch("tutorial")}>LANCER LE TUTORIEL · 45–60 S</button>
            <button className="modal-secondary" onClick={() => setShowTutorialOffer(false)}>IGNORER POUR CETTE FOIS</button>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="global-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={() => setShowGuide(false)}>
          <div className="guide-card" onClick={(event) => event.stopPropagation()}>
            <button className="guide-close" onClick={() => setShowGuide(false)} aria-label="Fermer">×</button>
            <span className="guide-kicker">PROTOCOLE DE COMBAT V3</span>
            <h2 id="guide-title">COMMENT JOUER</h2>
            <div className="guide-list">
              <article><span>01</span><div><strong>PILOTE TA RAQUETTE</strong><p>Glisse verticalement. Sur ordinateur : W/S pour la Glace, ↑/↓ pour le Feu.</p></div></article>
              <article><span>02</span><div><strong>PERFECT HIT ET SMASH</strong><p>Centre parfait pour le bonus de précision. Mouvement rapide au contact pour une frappe lourde.</p></div></article>
              <article><span>03</span><div><strong>SPIN ET COURBE</strong><p>La vitesse verticale de ta raquette transmet un effet progressif à la balle.</p></div></article>
              <article><span>04</span><div><strong>COMBO ET POWER-UPS</strong><p>Enchaîne rally et précision pour monter jusqu’à ×5. Treize pouvoirs existent en quatre raretés.</p></div></article>
              <article><span>05</span><div><strong>ULTIMATES</strong><p>Charge 100 %, puis libère Zéro Absolu ou Éruption Solaire. Sur clavier : Espace pour la Glace, Entrée pour le Feu.</p></div></article>
              <article><span>06</span><div><strong>CAMPAGNE ET MISSIONS</strong><p>Chaque arène possède trois objectifs indépendants. Une mission réussie vaut une étoile.</p></div></article>
            </div>
            <button className="guide-action" onClick={() => setShowGuide(false)}>J’AI COMPRIS</button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="global-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="confirm-card"><span>⚠</span><h2 id="reset-title">RÉINITIALISER ?</h2><p>Étoiles, fragments, niveau, succès, arsenal, statistiques et historique V3 seront remis à zéro. Cette action nécessite ta confirmation.</p><button className="danger-confirm" onClick={confirmReset}>OUI, TOUT RÉINITIALISER</button><button onClick={() => setShowResetConfirm(false)}>ANNULER</button></div>
        </div>
      )}

      {showImportConfirm && (
        <div className="global-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
          <div className="confirm-card"><span>⇧</span><h2 id="import-title">IMPORTER LA SAUVEGARDE ?</h2><p>La progression V3 actuelle sera remplacée par le fichier sélectionné. Les anciennes données V2 restent conservées séparément.</p><button className="import-confirm" onClick={confirmImport}>IMPORTER</button><button onClick={() => { pendingImportRef.current = null; setShowImportConfirm(false); }}>ANNULER</button></div>
        </div>
      )}

      {importError && <div className="error-toast" role="alert"><strong>IMPORT IMPOSSIBLE</strong><span>{importError}</span><button onClick={() => setImportError("")}>×</button></div>}

      {screen === "menu" && <footer><span>CR3@TIX</span><small>DE L’IMAGINATION À LA CONCEPTION</small><b>V3.0.0</b></footer>}
    </main>
  );
}
