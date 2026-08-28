import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/PongV3.tsx", import.meta.url), "utf8");
const state = readFileSync(new URL("../app/game-state.ts", import.meta.url), "utf8");
const data = readFileSync(new URL("../app/v3-data.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

test("les treize power-ups possèdent une branche de gameplay", () => {
  for (const kind of ["overdrive", "shield", "titan", "multiball", "freeze", "portal", "phantom", "magnet", "reverse", "clone", "timeWarp", "berserk", "blackHole"]) {
    assert.match(page, new RegExp(`kind === ["']${kind}["']`), `branche manquante pour ${kind}`);
  }
});

test("les quatre modes V3 et le Duel configurable sont lançables", () => {
  for (const mode of ["survival", "chaos", "bossRush", "hardcore"]) assert.match(page, new RegExp(`beginMatch\\(["']${mode}["']`));
  for (const option of ["scoreTarget", "bestOf", "powers", "ultimates", "arena", "chaos", "handicap"]) assert.match(page, new RegExp(`duelConfig\\.${option}`));
});

test("les trois boss ont des mécaniques dédiées et des phases", () => {
  for (const boss of ["KRYON", "VORTEX", "SOLARIS"]) {
    assert.match(page, new RegExp(`boss\\.name === ["']${boss}["']`));
    assert.match(data, new RegExp(`boss: ["']${boss}["']`));
  }
  assert.match(page, /PHASE/);
  assert.match(page, /MUR DE GLACE/);
  assert.match(page, /RIFT INSTABLE/);
  assert.match(page, /SUPERNOVA/);
});

test("tous les modificateurs d’arène sont présents", () => {
  for (const modifier of ["standard", "velocity", "pressure", "fortress", "chaos", "boss"]) assert.match(data, new RegExp(`modifier: ["']${modifier}["']`));
  assert.match(page, /modifier === "velocity"/);
  assert.match(page, /modifier === "pressure"/);
  assert.match(page, /kind !== barrier\.kind/);
  assert.match(page, /triggerChaosEvent/);
});

test("le combat mobile bloque gestes parasites et respecte les zones sûres", () => {
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(page, /onPointerCancel/);
  assert.match(page, /setPointerCapture/);
});

test("le contrôleur tactile V3 suit précisément le doigt et protège le Duel", () => {
  assert.match(state, /installTouchPrecisionController/);
  assert.match(state, /getCoalescedEvents/);
  assert.match(state, /lostpointercapture/);
  assert.match(state, /touchOwners/);
  assert.match(state, /game\.pointers\.delete\(event\.pointerId\)/);
  assert.match(state, /paddle\.y = nextTop/);
  assert.match(state, /game\.reverse\[side\]/);
  assert.match(state, /game\.freeze\[side\] <= 0/);
  assert.match(state, /touchVelocity/);
  assert.match(state, /rememberPaddleSweepStart/);
  assert.match(page, /consumePaddleSweepStart/);
});

test("la physique utilise un pas fixe et une collision continue", () => {
  assert.match(page, /while \(accumulator >= FIXED_STEP/);
  assert.match(page, /sweptPaddleCollision/);
  assert.match(page, /stableBallVelocity/);
  assert.match(page, /MAX_BALLS/);
});

test("la sauvegarde V3 migre sans supprimer les clés V2", () => {
  assert.match(data, /profileVersion:\s*3/);
  assert.match(page, /migrateV2Profile/);
  assert.match(page, /LEGACY_PROFILE_KEY/);
  assert.doesNotMatch(page, /removeItem\(LEGACY_PROFILE_KEY/);
  assert.match(page, /EXPORTER MA PROGRESSION/);
  assert.match(page, /IMPORTER MA PROGRESSION/);
});

test("le manifest et le service worker sont compatibles racine et sous-chemin", () => {
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.name, "CR3@TIX PONG V3");
  const escapedVersion = String(packageJson.version).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(serviceWorker, new RegExp(`v${escapedVersion}`));
  assert.match(serviceWorker, /self\.registration\.scope/);
  assert.match(serviceWorker, /key\.startsWith\(CACHE_PREFIX\)/);
  assert.match(nextConfig, /\/CR3-TIX-PONG/);
  assert.match(nextConfig, /output:\s*"export"/);
});

test("le jeu reste autonome et sans backend obligatoire", () => {
  assert.doesNotMatch(page, /fetch\(/);
  assert.doesNotMatch(page, /supabase/i);
  assert.doesNotMatch(page, /stripe|payment|crypto|nft/i);
});
