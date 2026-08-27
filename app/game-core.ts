import {
  ACHIEVEMENTS,
  DAILY_TEMPLATES,
  type Achievement,
  type CampaignStage,
  type DailyChallenge,
  type DetailedStats,
  type ElementSide,
  type PowerUpDefinition,
  type Quality,
  type StageObjective,
  type V3Profile,
  xpForLevel,
  titleForLevel,
} from "./v3-data";

export const WORLD_W = 1600;
export const WORLD_H = 900;
export const MAX_BALLS = 3;
export const FIXED_STEP = 1 / 120;
export const MAX_FRAME_DELTA = 0.05;
export const MAX_BALL_SPEED = 1780;
export const MIN_HORIZONTAL_RATIO = 0.34;

export type SeedState = { value: number };

export type SweepBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type SweepPaddle = {
  x: number;
  y: number;
  previousY?: number;
  width: number;
  height: number;
};

export type MatchMetrics = {
  won: boolean;
  conceded: number;
  bestRally: number;
  perfectHits: number;
  smashes: number;
  bestCombo: number;
  duration: number;
  ultimates: number;
};

export function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

export function seededRandom(state: SeedState) {
  let value = state.value >>> 0 || 0x9e3779b9;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = value >>> 0;
  return state.value / 4294967296;
}

export function randomRange(state: SeedState, min: number, max: number) {
  return min + (max - min) * seededRandom(state);
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dailyChallengeForDate(dateKey: string): DailyChallenge {
  const seed = hashString(`CR3ATIX-PONG-V3-${dateKey}`);
  const template = DAILY_TEMPLATES[seed % DAILY_TEMPLATES.length];
  return { ...template, date: dateKey, id: `daily-${dateKey}-${seed % DAILY_TEMPLATES.length}` };
}

export function pickWeightedPowerUp(
  definitions: PowerUpDefinition[],
  state: SeedState,
  recentKinds: string[] = [],
  allowed?: Set<string>,
) {
  const pool = definitions.filter((definition) => (!allowed || allowed.has(definition.kind)) && !recentKinds.slice(-2).includes(definition.kind));
  const fallback = definitions.filter((definition) => !allowed || allowed.has(definition.kind));
  const candidates = pool.length ? pool : fallback.length ? fallback : definitions;
  const total = candidates.reduce((sum, definition) => sum + Math.max(0, definition.weight), 0);
  let roll = seededRandom(state) * total;
  for (const definition of candidates) {
    roll -= Math.max(0, definition.weight);
    if (roll <= 0) return definition;
  }
  return candidates[candidates.length - 1];
}

export function reflectedTargetY(y: number, vy: number, travelSeconds: number, minY: number, maxY: number) {
  const span = Math.max(1, maxY - minY);
  const fullTravel = Math.max(0, travelSeconds);
  const predictionHorizon = Math.min(fullTravel, 0.1);
  const projected = y + vy * predictionHorizon - minY;
  const period = span * 2;
  const wrapped = ((projected % period) + period) % period;
  const reflected = minY + (wrapped <= span ? wrapped : period - wrapped);
  const confidence = fullTravel <= 0.16 ? 0.58 : fullTravel <= 0.42 ? 0.34 : 0.16;
  const centerBias = Math.min(1, fullTravel / 0.9) * 0.12;
  const observed = y + (reflected - y) * confidence;
  const center = (minY + maxY) / 2;
  return Math.max(minY, Math.min(maxY, observed + (center - observed) * centerBias));
}

export function sweptPaddleCollision(
  ball: SweepBall,
  paddle: SweepPaddle,
  side: ElementSide,
  dt: number,
) {
  const isLeft = side === "ice";
  if ((isLeft && ball.vx >= 0) || (!isLeft && ball.vx <= 0)) return null;
  const contactX = isLeft ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
  const nextX = ball.x + ball.vx * dt;
  const crosses = isLeft ? ball.x >= contactX && nextX <= contactX : ball.x <= contactX && nextX >= contactX;
  if (!crosses) return null;
  const time = (contactX - ball.x) / ball.vx;
  if (!Number.isFinite(time) || time < -1e-6 || time > dt + 1e-6) return null;
  const safeTime = Math.max(0, time);
  const contactY = ball.y + ball.vy * safeTime;

  // La raquette est mise à jour avant la balle. Sur un mouvement tactile rapide,
  // tester uniquement sa position finale peut faire rater un contact de bord alors
  // que la raquette se trouvait bien sous la balle au moment exact de l'impact.
  // On reconstruit donc sa position verticale au temps de collision.
  const startY = Number.isFinite(paddle.previousY) ? paddle.previousY as number : paddle.y;
  const alpha = dt > 0 ? Math.max(0, Math.min(1, safeTime / dt)) : 1;
  const paddleYAtContact = startY + (paddle.y - startY) * alpha;
  if (contactY + ball.radius < paddleYAtContact || contactY - ball.radius > paddleYAtContact + paddle.height) return null;

  return { time: safeTime, x: contactX, y: contactY };
}

export function stableBallVelocity(vx: number, vy: number, preferredDirection: -1 | 1, maxSpeed = MAX_BALL_SPEED) {
  const rawVx = Number.isFinite(vx) ? vx : preferredDirection * 600;
  const rawVy = Number.isFinite(vy) ? vy : 0;
  let speed = Math.hypot(rawVx, rawVy);
  if (!Number.isFinite(speed) || speed < 1) speed = 600;
  speed = Math.min(maxSpeed, speed);
  const rawSpeed = Math.hypot(rawVx, rawVy) || 1;
  const direction = rawVx === 0 ? preferredDirection : Math.sign(rawVx) as -1 | 1;
  let nextVx: number;
  let nextVy: number;
  if (Math.abs(rawVx) / rawSpeed < MIN_HORIZONTAL_RATIO) {
    nextVx = speed * MIN_HORIZONTAL_RATIO * preferredDirection;
    nextVy = Math.sign(rawVy || 1) * speed * Math.sqrt(1 - MIN_HORIZONTAL_RATIO ** 2);
  } else {
    nextVx = (rawVx / rawSpeed) * speed;
    nextVy = (rawVy / rawSpeed) * speed;
    if (Math.sign(nextVx) !== direction) nextVx *= -1;
  }
  return { vx: nextVx, vy: nextVy, speed };
}

export function comboForRally(rally: number, precisionHits: number) {
  if (rally >= 28 && precisionHits >= 4) return 5;
  if (rally >= 18 && precisionHits >= 3) return 4;
  if (rally >= 10 && precisionHits >= 2) return 3;
  if (rally >= 5 && precisionHits >= 1) return 2;
  return 1;
}

export function objectiveCompleted(objective: StageObjective, metrics: MatchMetrics) {
  switch (objective.kind) {
    case "win": return metrics.won;
    case "rally": return metrics.bestRally >= objective.target;
    case "perfect": return metrics.perfectHits >= objective.target;
    case "noUltimate": return metrics.won && metrics.ultimates === 0;
    case "maxConceded": return metrics.won && metrics.conceded <= objective.target;
    case "time": return metrics.won && metrics.duration <= objective.target;
    case "smash": return metrics.smashes >= objective.target;
    case "combo": return metrics.bestCombo >= objective.target;
    default: return false;
  }
}

export function evaluateStageObjectives(stage: CampaignStage, metrics: MatchMetrics) {
  return stage.objectives.filter((entry) => objectiveCompleted(entry, metrics)).map((entry) => entry.id);
}

export function resolvedQuality(quality: Quality, pixelRatio = 1, hardwareConcurrency = 4, reducedMotion = false): Exclude<Quality, "auto"> {
  if (quality !== "auto") return quality;
  // Sur smartphone, les écrans à forte densité rendent les flous Canvas nettement plus coûteux.
  // On privilégie donc PERFORMANCE automatiquement sans toucher à la physique du jeu.
  if (reducedMotion || hardwareConcurrency <= 6 || pixelRatio > 2.15) return "performance";
  if (hardwareConcurrency >= 12 && pixelRatio <= 1.75) return "ultra";
  return "high";
}

export function visualBudget(quality: Exclude<Quality, "auto">, reduceEffects = false) {
  // Budgets visuels volontairement conservateurs : seuls les effets transitoires sont
  // réduits. La physique, les collisions, les vitesses, l'IA et le gameplay restent identiques.
  const base = quality === "performance"
    ? { particles: 72, impactScale: 0.30, trail: 8, blur: 0.22 }
    : quality === "high"
      ? { particles: 140, impactScale: 0.55, trail: 13, blur: 0.48 }
      : { particles: 240, impactScale: 0.82, trail: 20, blur: 0.78 };
  if (!reduceEffects) return base;
  return {
    particles: Math.max(32, Math.round(base.particles * 0.5)),
    impactScale: base.impactScale * 0.5,
    trail: Math.max(5, Math.round(base.trail * 0.55)),
    blur: base.blur * 0.45,
  };
}

export function addXp(profile: V3Profile, amount: number) {
  let level = profile.level;
  let xp = profile.xp + Math.max(0, Math.round(amount));
  while (level < 100 && xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
  }
  if (level >= 100) xp = Math.min(xp, xpForLevel(100));
  return { level, xp, title: titleForLevel(level), leveledUp: level > profile.level };
}

export function totalPowerUps(stats: DetailedStats) {
  return Object.values(stats.powerUps).reduce((sum, value) => sum + value, 0);
}

export function achievementValue(achievement: Achievement, profile: V3Profile, perfectWin = false) {
  if (achievement.id === "power-10") return totalPowerUps(profile.stats);
  switch (achievement.stat) {
    case "campaignStars": return Object.values(profile.stars).reduce((sum, value) => sum + value, 0);
    case "campaignComplete": return (profile.completedObjectives["12"] ?? []).includes("s12-win") ? 1 : 0;
    case "bossCount": return profile.stats.bossesDefeated.length;
    case "level": return profile.level;
    case "winStreak": return profile.winStreak;
    case "perfectWin": return perfectWin ? 1 : 0;
    case "daily": return profile.daily.completed ? 1 : 0;
    default: {
      const value = profile.stats[achievement.stat as keyof DetailedStats];
      return typeof value === "number" ? value : 0;
    }
  }
}

export function unlockAchievements(profile: V3Profile, now = Date.now(), perfectWin = false) {
  const unlocked: Achievement[] = [];
  const achievements = { ...profile.achievements };
  let reward = 0;
  for (const achievement of ACHIEVEMENTS) {
    if (achievements[achievement.id]) continue;
    if (achievementValue(achievement, profile, perfectWin) >= achievement.target) {
      achievements[achievement.id] = now;
      reward += achievement.reward;
      unlocked.push(achievement);
    }
  }
  return { achievements, reward, unlocked };
}

export function parseImportedProfile(text: string) {
  const parsed = JSON.parse(text) as Partial<V3Profile> & { profileVersion?: number };
  if (!parsed || typeof parsed !== "object" || parsed.profileVersion !== 3) throw new Error("Ce fichier n’est pas une sauvegarde CR3@TIX PONG V3 valide.");
  return parsed;
}
