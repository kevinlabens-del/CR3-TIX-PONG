import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_BALL_SPEED,
  achievementValue,
  addXp,
  comboForRally,
  dailyChallengeForDate,
  evaluateStageObjectives,
  hashString,
  pickWeightedPowerUp,
  reflectedTargetY,
  seededRandom,
  stableBallVelocity,
  sweptPaddleCollision,
  visualBudget,
} from "../app/game-core";
import { freshGame, makeBall } from "../app/game-state";
import {
  ACHIEVEMENTS,
  CAMPAIGN_STAGES,
  DEFAULT_PROFILE,
  ELEMENT_SKINS,
  POWER_UPS,
  migrateV2Profile,
  normalizeProfile,
} from "../app/v3-data";

test("le contenu V3 annoncé est complet", () => {
  assert.equal(CAMPAIGN_STAGES.length, 12);
  assert.equal(POWER_UPS.length, 13);
  assert.equal(ACHIEVEMENTS.length, 40);
  assert.ok(CAMPAIGN_STAGES.every((stage) => stage.objectives.length === 3));
  assert.deepEqual(CAMPAIGN_STAGES.filter((stage) => stage.boss).map((stage) => stage.boss), ["KRYON", "VORTEX", "SOLARIS"]);
});

test("le défi quotidien est déterministe pour toute la journée", () => {
  const first = dailyChallengeForDate("2026-08-22");
  const second = dailyChallengeForDate("2026-08-22");
  assert.deepEqual(first, second);
  assert.notEqual(first.id, dailyChallengeForDate("2026-08-23").id);
});

test("le générateur déterministe reproduit exactement une séquence", () => {
  const left = { value: hashString("same-seed") };
  const right = { value: hashString("same-seed") };
  for (let index = 0; index < 100; index += 1) assert.equal(seededRandom(left), seededRandom(right));
});

test("la sélection pondérée ne répète pas les deux derniers pouvoirs", () => {
  const state = { value: 123456 };
  for (let index = 0; index < 80; index += 1) {
    const result = pickWeightedPowerUp(POWER_UPS, state, ["shield", "titan"]);
    assert.notEqual(result.kind, "shield");
    assert.notEqual(result.kind, "titan");
  }
});

test("la collision continue intercepte une balle à vitesse maximale", () => {
  const ball = { x: 170, y: 450, vx: -MAX_BALL_SPEED, vy: 120, radius: 19 };
  const paddle = { x: 68, y: 360, width: 24, height: 180 };
  const hit = sweptPaddleCollision(ball, paddle, "ice", 1 / 12);
  assert.ok(hit);
  assert.ok(hit.time >= 0 && hit.time <= 1 / 12);
  assert.ok(hit.y >= paddle.y - ball.radius && hit.y <= paddle.y + paddle.height + ball.radius);
});

test("la collision continue rejette une balle hors de la raquette", () => {
  const hit = sweptPaddleCollision({ x: 170, y: 40, vx: -1700, vy: 0, radius: 19 }, { x: 68, y: 350, width: 24, height: 180 }, "ice", 1 / 12);
  assert.equal(hit, null);
});

test("10 000 trajectoires rapides restent mathématiquement stables", () => {
  const state = { value: 987654321 };
  for (let index = 0; index < 10_000; index += 1) {
    const rawVx = (seededRandom(state) - 0.5) * 5000;
    const rawVy = (seededRandom(state) - 0.5) * 5000;
    const direction = rawVx >= 0 ? 1 : -1;
    const stable = stableBallVelocity(rawVx, rawVy, direction);
    assert.ok(Number.isFinite(stable.vx) && Number.isFinite(stable.vy));
    assert.ok(Math.hypot(stable.vx, stable.vy) <= MAX_BALL_SPEED + 1e-7);
    assert.ok(Math.abs(stable.vx) >= Math.hypot(stable.vx, stable.vy) * 0.339);
  }
});

test("les rebonds prédits restent dans l’arène", () => {
  for (let index = 0; index < 5000; index += 1) {
    const y = reflectedTargetY(450, index % 2 ? 1700 : -1700, index / 37, 34, 866);
    assert.ok(y >= 34 && y <= 866);
  }
});

test("le combo dépend bien du rally et de la précision", () => {
  assert.equal(comboForRally(4, 4), 1);
  assert.equal(comboForRally(5, 1), 2);
  assert.equal(comboForRally(10, 2), 3);
  assert.equal(comboForRally(18, 3), 4);
  assert.equal(comboForRally(28, 4), 5);
});

test("les missions donnent une étoile par objectif", () => {
  const stage = CAMPAIGN_STAGES[0];
  const completed = evaluateStageObjectives(stage, { won: true, conceded: 1, bestRally: 12, perfectHits: 2, smashes: 0, bestCombo: 2, duration: 70, ultimates: 0 });
  assert.equal(completed.length, 3);
  assert.deepEqual(completed, stage.objectives.map((objective) => objective.id));
});

test("la migration V2 conserve étoiles, fragments, skins et historique", () => {
  const migrated = migrateV2Profile({
    unlockedStage: 7,
    stars: { "1": 3, "2": 2 },
    shards: 321,
    ownedSkins: ["origin", "nebula"],
    activeSkin: "nebula",
    records: [{ id: "old", date: "20/08", label: "SOLO", result: "victoire", ice: 7, fire: 3, rally: 22 }],
  }, { matches: 8, wins: 5, losses: 3, bestRally: 18 });
  assert.equal(migrated.profileVersion, 3);
  assert.equal(migrated.unlockedStage, 7);
  assert.equal(migrated.shards, 321);
  assert.equal(migrated.activeSkin, "nebula");
  assert.ok(migrated.ownedCosmetics.paddles.includes("nebula"));
  assert.equal(migrated.records[0].rally, 22);
  assert.equal(migrated.stats.bestRally, 22);
});

test("la normalisation répare un profil partiel sans perdre ses données", () => {
  const repaired = normalizeProfile({ ...DEFAULT_PROFILE, pseudo: "KEV", shards: 88, settings: { ...DEFAULT_PROFILE.settings, effects: 13 } });
  assert.equal(repaired.pseudo, "KEV");
  assert.equal(repaired.shards, 88);
  assert.equal(repaired.settings.effects, 13);
  assert.equal(repaired.profileVersion, 3);
});

test("la progression XP est plafonnée au niveau 100", () => {
  const result = addXp({ ...DEFAULT_PROFILE, level: 99, xp: 0 }, 1_000_000);
  assert.equal(result.level, 100);
});

test("les budgets visuels respectent PERFORMANCE < ÉLEVÉE < ULTRA", () => {
  const performance = visualBudget("performance");
  const high = visualBudget("high");
  const ultra = visualBudget("ultra");
  assert.ok(performance.particles < high.particles && high.particles < ultra.particles);
  assert.ok(visualBudget("ultra", true).particles < ultra.particles);
});

test("le moteur crée trois balles distinctes sans état partagé", () => {
  const game = freshGame("chaos", "arcade", ELEMENT_SKINS[0], null);
  const first = makeBall(game, 1, 900, "ice", -0.2);
  const second = makeBall(game, 1, 900, "ice", 0);
  const third = makeBall(game, 1, 900, "ice", 0.2);
  assert.equal(new Set([first.id, second.id, third.id]).size, 3);
  first.trail.push({ x: 1, y: 1, life: 1, element: "ice" });
  assert.equal(second.trail.length, 0);
});

test("les succès utilisent les statistiques et les étoiles locales", () => {
  const profile = normalizeProfile({ ...DEFAULT_PROFILE, stars: { "1": 3, "2": 3 }, stats: { ...DEFAULT_PROFILE.stats, wins: 5 } });
  assert.equal(achievementValue(ACHIEVEMENTS.find((entry) => entry.id === "wins-5")!, profile), 5);
  assert.equal(achievementValue(ACHIEVEMENTS.find((entry) => entry.id === "stars-6")!, profile), 6);
});
