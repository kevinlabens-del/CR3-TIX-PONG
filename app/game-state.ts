import {
  DIFFICULTIES,
  POWER_UPS,
  type AiBehavior,
  type CampaignStage,
  type Difficulty,
  type ElementSide,
  type ElementSkin,
  type GameMode,
  type PowerUpKind,
  type Quality,
  type Rarity,
} from "./v3-data";
import { WORLD_H, WORLD_W, hashString, randomRange, seededRandom, type SeedState } from "./game-core";

export type Paddle = {
  x: number;
  y: number;
  previousY: number;
  targetY: number;
  width: number;
  height: number;
  baseHeight: number;
  boostTimer: number;
  velocity: number;
};

export type TrailPoint = { x: number; y: number; life: number; element: ElementSide };

export type Ball = {
  id: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  element: ElementSide;
  trail: TrailPoint[];
  spin: number;
  phantomTimer: number;
  berserkTimer: number;
  portalCooldown: number;
  collisionCooldown: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "circle" | "crystal" | "ring";
};

export type PowerPickup = {
  x: number;
  y: number;
  radius: number;
  kind: PowerUpKind;
  rarity: Rarity;
  life: number;
  angle: number;
};

export type PortalPair = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  radius: number;
  timer: number;
  owner: ElementSide | "arena";
};

export type Barrier = {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  timer: number;
  element: ElementSide;
  kind: "fortress" | "iceWall" | "solarShield";
};

export type BossState = {
  name: "KRYON" | "VORTEX" | "SOLARIS";
  phase: number;
  maxPhase: number;
  eventTimer: number;
  telegraphTimer: number;
  telegraph: string;
  waveTimer: number;
};

export type DuelConfig = {
  scoreTarget: 3 | 5 | 7 | 10;
  bestOf: 1 | 3 | 5;
  powers: boolean;
  ultimates: boolean;
  arena: "ascension" | "boreal" | "rift" | "solar" | "random";
  chaos: boolean;
  handicap: "none" | "ice" | "fire";
};

export type GameMetrics = {
  perfectHits: { ice: number; fire: number };
  smashes: { ice: number; fire: number };
  ultimates: { ice: number; fire: number };
  powerUps: Record<string, number>;
  bestCombo: number;
  maxBallSpeed: number;
};

export type GameState = {
  left: Paddle;
  right: Paddle;
  balls: Ball[];
  nextBallId: number;
  particles: Particle[];
  score: { ice: number; fire: number };
  sets: { ice: number; fire: number };
  rally: number;
  bestRally: number;
  combo: number;
  precisionStreak: number;
  shake: number;
  flash: number;
  slowMotion: number;
  serveDelay: number;
  servingTo: ElementSide;
  roundTransition: number;
  mode: GameMode;
  difficulty: Difficulty;
  winScore: number;
  aiSpeed: number;
  aiReaction: number;
  aiBehavior: AiBehavior;
  aiError: number;
  aiErrorTimer: number;
  launchSpeed: number;
  campaignStage: CampaignStage | null;
  palette: ElementSkin;
  arenaTheme: DuelConfig["arena"];
  energy: { ice: number; fire: number };
  pointers: Map<number, { side: ElementSide }>;
  powerUp: PowerPickup | null;
  nextPowerUp: number;
  recentPowerUps: string[];
  shields: { ice: number; fire: number };
  freeze: { ice: number; fire: number };
  reverse: { ice: number; fire: number };
  magnet: { ice: number; fire: number };
  clone: { ice: number; fire: number };
  timeWarp: { ice: number; fire: number };
  portals: PortalPair[];
  blackHole: null | { x: number; y: number; timer: number; owner: ElementSide };
  barriers: Barrier[];
  pressureTimer: number;
  pressureActive: number;
  chaosTimer: number;
  chaosActive: number;
  chaosLabel: string;
  boss: BossState | null;
  ultimateVisual: null | { side: ElementSide; timer: number };
  elapsed: number;
  musicTimer: number;
  lives: number;
  bossRushIndex: number;
  bossRushElapsed: number;
  duelConfig: DuelConfig;
  powersEnabled: boolean;
  ultimatesEnabled: boolean;
  rng: SeedState;
  metrics: GameMetrics;
  quality: Exclude<Quality, "auto">;
  ended: boolean;
};

export const DEFAULT_DUEL_CONFIG: DuelConfig = {
  scoreTarget: 5,
  bestOf: 3,
  powers: true,
  ultimates: true,
  arena: "ascension",
  chaos: false,
  handicap: "none",
};

type TouchPaddleMeta = {
  physicsVelocity: number;
  touchVelocity: number;
  touchActive: boolean;
  lastTouchUpdate: number;
};

type TouchOwner = {
  pointerId: number;
  offsetY: number;
  lastCenter: number;
  lastTime: number;
};

const paddleTouchMeta = new WeakMap<Paddle, TouchPaddleMeta>();
let activeGame: GameState | null = null;
const touchOwners: Record<ElementSide, TouchOwner | null> = { ice: null, fire: null };

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function makePaddle(x: number, height: number): Paddle {
  const paddle = {
    x,
    y: WORLD_H / 2 - height / 2,
    previousY: WORLD_H / 2 - height / 2,
    targetY: WORLD_H / 2,
    width: 24,
    height,
    baseHeight: height,
    boostTimer: 0,
  } as Paddle;
  const meta: TouchPaddleMeta = { physicsVelocity: 0, touchVelocity: 0, touchActive: false, lastTouchUpdate: 0 };
  paddleTouchMeta.set(paddle, meta);
  Object.defineProperty(paddle, "velocity", {
    configurable: true,
    enumerable: true,
    get() {
      if (meta.touchActive && nowMs() - meta.lastTouchUpdate <= 90) return meta.touchVelocity;
      return meta.physicsVelocity;
    },
    set(value: number) {
      meta.physicsVelocity = Number.isFinite(value) ? value : 0;
    },
  });
  return paddle;
}

function markTouchVelocity(paddle: Paddle, velocity: number, active: boolean) {
  const meta = paddleTouchMeta.get(paddle);
  if (!meta) return;
  meta.touchActive = active;
  meta.touchVelocity = Math.max(-2200, Math.min(2200, Number.isFinite(velocity) ? velocity : 0));
  meta.lastTouchUpdate = nowMs();
}

function paddleForSide(game: GameState, side: ElementSide) {
  return side === "ice" ? game.left : game.right;
}

function rawWorldY(canvas: HTMLCanvasElement, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  if (rect.height <= 0) return WORLD_H / 2;
  return ((clientY - rect.top) / rect.height) * WORLD_H;
}

function clampPaddleCenter(paddle: Paddle, center: number) {
  return Math.max(paddle.height / 2 + 24, Math.min(WORLD_H - paddle.height / 2 - 24, center));
}

function releaseTouchOwner(pointerId: number) {
  for (const side of ["ice", "fire"] as ElementSide[]) {
    const owner = touchOwners[side];
    if (!owner || owner.pointerId !== pointerId) continue;
    const game = activeGame;
    if (game) markTouchVelocity(paddleForSide(game, side), 0, false);
    touchOwners[side] = null;
  }
}

function installTouchPrecisionController() {
  if (typeof window === "undefined" || typeof HTMLCanvasElement === "undefined") return;
  const marker = "__CR3ATIX_PONG_TOUCH_V3__";
  const globalWindow = window as unknown as Window & Record<string, unknown>;
  if (globalWindow[marker]) return;
  globalWindow[marker] = true;

  window.addEventListener("pointerdown", (event) => {
    const game = activeGame;
    const canvas = event.target instanceof HTMLCanvasElement ? event.target : null;
    if (!game || !canvas || !canvas.closest(".canvas-frame")) return;
    const pointer = game.pointers.get(event.pointerId);
    if (!pointer) return;
    const side = pointer.side;
    const existing = touchOwners[side];
    if (existing && existing.pointerId !== event.pointerId) {
      game.pointers.delete(event.pointerId);
      try {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Certains navigateurs libèrent déjà automatiquement la capture.
      }
      return;
    }
    const paddle = paddleForSide(game, side);
    const currentCenter = paddle.y + paddle.height / 2;
    const controlCenter = game.reverse[side] > 0 ? WORLD_H - currentCenter : currentCenter;
    const y = rawWorldY(canvas, event.clientY);
    touchOwners[side] = {
      pointerId: event.pointerId,
      offsetY: y - controlCenter,
      lastCenter: currentCenter,
      lastTime: event.timeStamp,
    };
    paddle.targetY = currentCenter;
    markTouchVelocity(paddle, 0, true);
  });

  window.addEventListener("pointermove", (event) => {
    const game = activeGame;
    const canvas = event.target instanceof HTMLCanvasElement ? event.target : null;
    if (!game || !canvas || !canvas.closest(".canvas-frame")) return;
    const side: ElementSide | null = touchOwners.ice?.pointerId === event.pointerId ? "ice" : touchOwners.fire?.pointerId === event.pointerId ? "fire" : null;
    if (!side) return;
    const owner = touchOwners[side];
    if (!owner) return;
    const paddle = paddleForSide(game, side);
    const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
    const usableSamples = samples.length ? samples : [event];

    for (const sample of usableSamples) {
      const controlY = rawWorldY(canvas, sample.clientY) - owner.offsetY;
      const desiredCenter = clampPaddleCenter(paddle, game.reverse[side] > 0 ? WORLD_H - controlY : controlY);
      const dt = Math.max(0.004, Math.min(0.08, (sample.timeStamp - owner.lastTime) / 1000 || 0.016));
      const instantVelocity = (desiredCenter - owner.lastCenter) / dt;
      const previousVelocity = paddleTouchMeta.get(paddle)?.touchVelocity ?? 0;
      const filteredVelocity = previousVelocity * 0.34 + instantVelocity * 0.66;
      paddle.targetY = desiredCenter;

      // Hors effet de gel volontaire, la raquette suit exactement le doigt.
      if (game.freeze[side] <= 0) {
        const nextTop = Math.max(22, Math.min(WORLD_H - paddle.height - 22, desiredCenter - paddle.height / 2));
        paddle.previousY = paddle.y;
        paddle.y = nextTop;
      }

      markTouchVelocity(paddle, filteredVelocity, true);
      owner.lastCenter = desiredCenter;
      owner.lastTime = sample.timeStamp;
    }
  });

  const release = (event: PointerEvent) => releaseTouchOwner(event.pointerId);
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("lostpointercapture", release);
  window.addEventListener("blur", () => {
    if (touchOwners.ice) releaseTouchOwner(touchOwners.ice.pointerId);
    if (touchOwners.fire) releaseTouchOwner(touchOwners.fire.pointerId);
  });
}

installTouchPrecisionController();

export function makeBall(game: Pick<GameState, "nextBallId" | "rng">, direction: -1 | 1, speed: number, element: ElementSide, angleOffset = 0): Ball {
  const angle = randomRange(game.rng, -0.34, 0.34) * Math.PI + angleOffset;
  const ball: Ball = {
    id: game.nextBallId,
    x: WORLD_W / 2,
    y: WORLD_H / 2 + randomRange(game.rng, -60, 60),
    previousX: WORLD_W / 2,
    previousY: WORLD_H / 2,
    vx: Math.cos(angle) * speed * direction,
    vy: Math.sin(angle) * speed,
    radius: 19,
    baseRadius: 19,
    element,
    trail: [],
    spin: 0,
    phantomTimer: 0,
    berserkTimer: 0,
    portalCooldown: 0,
    collisionCooldown: 0,
  };
  game.nextBallId += 1;
  return ball;
}

export function freshGame(
  mode: GameMode,
  difficulty: Difficulty,
  palette: ElementSkin,
  stage: CampaignStage | null,
  duelConfig: DuelConfig = DEFAULT_DUEL_CONFIG,
  quality: Exclude<Quality, "auto"> = "high",
  seed = hashString(`${Date.now()}-${mode}-${stage?.id ?? 0}`),
): GameState {
  const rng: SeedState = { value: seed };
  const modePlayerHeight = mode === "hardcore" ? 150 : mode === "tutorial" ? 210 : 174;
  const modeEnemyHeight = mode === "hardcore" ? 190 : mode === "tutorial" ? 200 : 174;
  let playerHeight = stage?.playerHeight ?? modePlayerHeight;
  let enemyHeight = stage?.enemyHeight ?? modeEnemyHeight;
  if (mode === "duel" && duelConfig.handicap === "ice") playerHeight *= 1.22;
  if (mode === "duel" && duelConfig.handicap === "fire") enemyHeight *= 1.22;
  const defaultDifficulty = DIFFICULTIES[difficulty];
  const launchSpeed = stage?.ballSpeed ?? (mode === "hardcore" ? 900 : mode === "survival" ? 700 : mode === "tutorial" ? 520 : 650);
  const winScore = mode === "duel" ? duelConfig.scoreTarget : mode === "hardcore" ? 3 : stage?.winScore ?? 7;
  const servingTo: ElementSide = seededRandom(rng) > 0.5 ? "ice" : "fire";
  const isChaos = mode === "chaos" || (mode === "duel" && duelConfig.chaos) || stage?.modifier === "chaos";
  const game: GameState = {
    left: makePaddle(68, playerHeight),
    right: makePaddle(WORLD_W - 92, enemyHeight),
    balls: [],
    nextBallId: 1,
    particles: [],
    score: { ice: 0, fire: 0 },
    sets: { ice: 0, fire: 0 },
    rally: 0,
    bestRally: 0,
    combo: 1,
    precisionStreak: 0,
    shake: 0,
    flash: 0,
    slowMotion: 0,
    serveDelay: 0.82,
    servingTo,
    roundTransition: 0,
    mode,
    difficulty,
    winScore,
    aiSpeed: stage?.aiSpeed ?? (mode === "hardcore" ? 1030 : defaultDifficulty.ai),
    aiReaction: stage?.reaction ?? (mode === "hardcore" ? 11 : defaultDifficulty.error),
    aiBehavior: stage?.aiBehavior ?? (mode === "hardcore" ? "aggressive" : defaultDifficulty.behavior),
    aiError: 0,
    aiErrorTimer: 0,
    launchSpeed,
    campaignStage: stage,
    palette,
    arenaTheme: duelConfig.arena,
    energy: { ice: 0, fire: 0 },
    pointers: new Map(),
    powerUp: null,
    nextPowerUp: isChaos ? 3.2 + seededRandom(rng) * 2.2 : mode === "hardcore" ? 10 : 6 + seededRandom(rng) * 3.2,
    recentPowerUps: [],
    shields: { ice: 0, fire: 0 },
    freeze: { ice: 0, fire: 0 },
    reverse: { ice: 0, fire: 0 },
    magnet: { ice: 0, fire: 0 },
    clone: { ice: 0, fire: 0 },
    timeWarp: { ice: 0, fire: 0 },
    portals: [],
    blackHole: null,
    barriers: [],
    pressureTimer: stage?.modifier === "pressure" ? 7 : 999,
    pressureActive: 0,
    chaosTimer: isChaos ? 7 : 999,
    chaosActive: 0,
    chaosLabel: "",
    boss: stage?.boss ? { name: stage.boss, phase: 1, maxPhase: stage.boss === "SOLARIS" ? 3 : 2, eventTimer: stage.boss === "KRYON" ? 6.5 : 5.5, telegraphTimer: 0, telegraph: "", waveTimer: 0 } : null,
    ultimateVisual: null,
    elapsed: 0,
    musicTimer: 0.3,
    lives: mode === "survival" ? 3 : 0,
    bossRushIndex: 0,
    bossRushElapsed: 0,
    duelConfig,
    powersEnabled: mode === "duel" ? duelConfig.powers : true,
    ultimatesEnabled: mode === "duel" ? duelConfig.ultimates : true,
    rng,
    metrics: { perfectHits: { ice: 0, fire: 0 }, smashes: { ice: 0, fire: 0 }, ultimates: { ice: 0, fire: 0 }, powerUps: Object.fromEntries(POWER_UPS.map((entry) => [entry.kind, 0])), bestCombo: 1, maxBallSpeed: launchSpeed },
    quality,
    ended: false,
  };

  // Pendant le Boss Rush, PongV3 fusionne le nouvel état dans l'objet de partie existant.
  // On conserve donc la référence active précédente jusqu'à cette fusion pour que le tactile reste branché.
  if (activeGame && activeGame.mode === "bossRush" && !activeGame.ended && mode === "bossRush") {
    // La référence courante reste valide et recevra Object.assign(game, nextGame).
  } else {
    activeGame = game;
    if (touchOwners.ice) releaseTouchOwner(touchOwners.ice.pointerId);
    if (touchOwners.fire) releaseTouchOwner(touchOwners.fire.pointerId);
  }

  if (stage?.modifier === "fortress") game.barriers.push({ x: WORLD_W * 0.73, y: WORLD_H * 0.25, width: 18, height: WORLD_H * 0.5, hp: 4, maxHp: 4, timer: 999, element: "fire", kind: "fortress" });
  return game;
}

export function launchServe(game: GameState) {
  const direction: -1 | 1 = game.servingTo === "fire" ? 1 : -1;
  game.balls = [makeBall(game, direction, game.launchSpeed, direction > 0 ? "ice" : "fire")];
  game.serveDelay = 0;
}
