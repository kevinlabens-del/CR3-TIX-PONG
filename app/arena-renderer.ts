import { WORLD_H, WORLD_W, visualBudget } from "./game-core";
import type { Ball, GameState, Paddle, Particle } from "./game-state";
import { POWER_UPS, type ElementSide } from "./v3-data";

export type RenderOptions = {
  screenShake: boolean;
  flashes: boolean;
  reduceEffects: boolean;
  ballStyle: string;
  trailStyle: string;
  impactStyle: string;
  arenaStyle: string;
};

const stars = Array.from({ length: 104 }, (_, index) => ({
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

export function spawnImpact(
  game: GameState,
  x: number,
  y: number,
  element: ElementSide,
  amount = 28,
  style = "spark",
) {
  const budget = visualBudget(game.quality, false);
  const scaledAmount = Math.max(4, Math.round(amount * budget.impactScale));
  const colors = element === "ice"
    ? [game.palette.ice, game.palette.iceLight, "#69aaff", "#ffffff"]
    : [game.palette.fire, game.palette.fireLight, "#ff9d2d", "#ffffff"];
  const shape: Particle["shape"] = style === "crystal" ? "crystal" : style === "plasma" ? "ring" : "circle";
  for (let index = 0; index < scaledAmount; index += 1) {
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
      shape,
    });
  }
}

function chapterForGame(game: GameState) {
  if (game.arenaTheme === "boreal") return 1;
  if (game.arenaTheme === "rift") return 2;
  if (game.arenaTheme === "solar") return 3;
  if (game.arenaTheme === "random") return (game.rng.value % 3) + 1;
  if (game.campaignStage) return game.campaignStage.chapter;
  if (game.mode === "bossRush" && game.boss?.name === "KRYON") return 1;
  if (game.mode === "bossRush" && game.boss?.name === "VORTEX") return 2;
  if (game.mode === "bossRush" && game.boss?.name === "SOLARIS") return 3;
  return 0;
}

function renderEnvironment(ctx: CanvasRenderingContext2D, game: GameState, time: number, options: RenderOptions) {
  const chapter = chapterForGame(game);
  const deepSpace = options.arenaStyle === "deep-space";
  const neonGrid = options.arenaStyle === "neon-grid";
  const colors = chapter === 1
    ? ["#031b36", "#071525", "#07131d", "#0b2840"]
    : chapter === 2
      ? ["#111038", "#0c0b20", "#1d0d2b", "#29134b"]
      : chapter === 3
        ? ["#1e0b13", "#16090e", "#310d0b", "#4b1608"]
        : ["#061c35", "#07111f", "#170d16", "#35100d"];
  const background = ctx.createLinearGradient(0, 0, WORLD_W, WORLD_H);
  background.addColorStop(0, deepSpace ? "#020716" : colors[0]);
  background.addColorStop(0.38, colors[1]);
  background.addColorStop(0.62, colors[2]);
  background.addColorStop(1, deepSpace ? "#160821" : colors[3]);
  ctx.fillStyle = background;
  ctx.fillRect(-35, -35, WORLD_W + 70, WORLD_H + 70);

  const leftGlow = ctx.createRadialGradient(80, WORLD_H / 2, 20, 80, WORLD_H / 2, 700);
  leftGlow.addColorStop(0, `rgba(${hexRgb(game.palette.ice)},.24)`);
  leftGlow.addColorStop(1, `rgba(${hexRgb(game.palette.ice)},0)`);
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, WORLD_W / 2 + 100, WORLD_H);
  const rightGlow = ctx.createRadialGradient(WORLD_W - 80, WORLD_H / 2, 20, WORLD_W - 80, WORLD_H / 2, 700);
  rightGlow.addColorStop(0, `rgba(${hexRgb(game.palette.fire)},.23)`);
  rightGlow.addColorStop(1, `rgba(${hexRgb(game.palette.fire)},0)`);
  ctx.fillStyle = rightGlow;
  ctx.fillRect(WORLD_W / 2 - 100, 0, WORLD_W / 2 + 100, WORLD_H);

  stars.forEach((star, index) => {
    const pulse = 0.7 + Math.sin(time * 0.0014 + index) * 0.3;
    const alphaBoost = deepSpace ? 1.7 : 1;
    ctx.fillStyle = star.blue
      ? `rgba(115,225,255,${Math.min(1, star.a * pulse * alphaBoost)})`
      : `rgba(255,126,83,${Math.min(1, star.a * pulse * alphaBoost)})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r * (deepSpace ? 1.3 : 1), 0, Math.PI * 2);
    ctx.fill();
  });

  if (chapter === 1) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#8df4ff";
    for (let index = 0; index < 14; index += 1) {
      const x = 55 + ((index * 137) % 1490);
      const height = 55 + ((index * 51) % 135);
      ctx.beginPath();
      ctx.moveTo(x - 17, WORLD_H);
      ctx.lineTo(x, WORLD_H - height - Math.sin(time * 0.001 + index) * 5);
      ctx.lineTo(x + 20, WORLD_H);
      ctx.fill();
    }
    const mist = ctx.createLinearGradient(0, WORLD_H * 0.55, 0, WORLD_H);
    mist.addColorStop(0, "rgba(130,242,255,0)");
    mist.addColorStop(1, "rgba(130,242,255,.11)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, WORLD_H * 0.45, WORLD_W, WORLD_H * 0.55);
    ctx.restore();
  } else if (chapter === 2) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#9c6cff";
    ctx.lineWidth = 4;
    for (let index = 0; index < 6; index += 1) {
      const x = 170 + index * 260;
      const y = 120 + ((index * 193) % 620);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 28, y + 34);
      ctx.lineTo(x - 9, y + 82);
      ctx.lineTo(x + 19, y + 121);
      ctx.stroke();
    }
    ctx.restore();
  } else if (chapter === 3) {
    ctx.save();
    const heat = 0.06 + Math.sin(time * 0.006) * 0.02;
    ctx.globalAlpha = heat;
    ctx.fillStyle = "#ff6a24";
    for (let index = 0; index < 23; index += 1) {
      const x = (index * 149 + time * (0.01 + (index % 3) * 0.004)) % WORLD_W;
      const y = WORLD_H - ((index * 83 + time * (0.018 + (index % 4) * 0.005)) % WORLD_H);
      ctx.beginPath();
      ctx.arc(x, y, 2 + (index % 4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.strokeStyle = neonGrid ? "rgba(41,239,255,.11)" : "rgba(255,255,255,.028)";
  ctx.lineWidth = neonGrid ? 2 : 1;
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
}

function renderPortals(ctx: CanvasRenderingContext2D, game: GameState, time: number) {
  for (const portal of game.portals) {
    const draw = (x: number, y: number, reverse = false) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((reverse ? -1 : 1) * time * 0.0015);
      const color = portal.owner === "ice" ? game.palette.ice : portal.owner === "fire" ? game.palette.fire : "#a875ff";
      ctx.shadowColor = color;
      ctx.shadowBlur = 32;
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.strokeStyle = ring === 1 ? "rgba(255,255,255,.7)" : color;
        ctx.globalAlpha = 0.35 + ring * 0.2;
        ctx.lineWidth = 3 + ring;
        ctx.beginPath();
        ctx.ellipse(0, 0, portal.radius + ring * 8, portal.radius * 0.63 + ring * 5, ring * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };
    draw(portal.ax, portal.ay);
    draw(portal.bx, portal.by, true);
  }
}

function renderBarrier(ctx: CanvasRenderingContext2D, game: GameState, time: number) {
  for (const barrier of game.barriers) {
    const color = barrier.kind === "iceWall" ? "#8df4ff" : barrier.kind === "solarShield" ? "#ffb038" : game.palette.fire;
    const alpha = 0.35 + (barrier.hp / barrier.maxHp) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    const gradient = ctx.createLinearGradient(barrier.x, barrier.y, barrier.x + barrier.width, barrier.y + barrier.height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, "rgba(255,255,255,.85)");
    gradient.addColorStop(1, color);
    roundedRect(ctx, barrier.x, barrier.y, barrier.width, barrier.height, 11);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,.65)";
    ctx.stroke();
    for (let crack = 0; crack < barrier.maxHp - barrier.hp; crack += 1) {
      ctx.strokeStyle = "rgba(5,8,17,.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const startY = barrier.y + ((crack + 1) / barrier.maxHp) * barrier.height;
      ctx.moveTo(barrier.x, startY);
      ctx.lineTo(barrier.x + barrier.width / 2, startY + Math.sin(time * 0.004 + crack) * 18);
      ctx.lineTo(barrier.x + barrier.width, startY - 13);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function renderPaddle(ctx: CanvasRenderingContext2D, game: GameState, paddle: Paddle, element: ElementSide, clone = false) {
  const color = element === "ice" ? game.palette.ice : game.palette.fire;
  const light = element === "ice" ? game.palette.iceLight : game.palette.fireLight;
  ctx.save();
  ctx.globalAlpha = clone ? 0.66 : 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = clone ? 24 : 42;
  const width = clone ? paddle.width * 0.72 : paddle.width;
  const height = clone ? paddle.height * 0.48 : paddle.height;
  const x = clone ? paddle.x + (element === "ice" ? 70 : -55) : paddle.x;
  const y = clone ? clamp(paddle.y + paddle.height / 2 - height / 2 + Math.sin(paddle.y * 0.015) * 25, 22, WORLD_H - height - 22) : paddle.y;
  roundedRect(ctx, x, y, width, height, 15);
  const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
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
}

function renderBall(ctx: CanvasRenderingContext2D, game: GameState, ball: Ball, time: number, options: RenderOptions) {
  const ballColor = ball.element === "ice" ? game.palette.ice : game.palette.fire;
  const ballLight = ball.element === "ice" ? game.palette.iceLight : game.palette.fireLight;
  const phantomAlpha = ball.phantomTimer > 0 ? 0.34 + Math.sin(time * 0.012) * 0.08 : 1;
  ctx.save();
  ctx.globalAlpha = phantomAlpha;
  const aura = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.radius * 3.5);
  if (options.ballStyle === "singularity") {
    aura.addColorStop(0, "#05030a");
    aura.addColorStop(0.38, "#8e63ff");
    aura.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    aura.addColorStop(0, ballLight);
    aura.addColorStop(0.25, ballColor);
    aura.addColorStop(1, "rgba(0,0,0,0)");
  }
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = options.ballStyle === "prism" ? "#c87cff" : ballColor;
  ctx.shadowBlur = 35;
  ctx.fillStyle = options.ballStyle === "singularity" ? "#08050e" : ballLight;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = options.ballStyle === "prism" ? "#ff82ba" : `${ballColor}bb`;
  ctx.lineWidth = options.ballStyle === "prism" ? 6 : 4;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * 1.72 + Math.sin(time * 0.012 + ball.id) * 4, 0, Math.PI * 2);
  ctx.stroke();
  if (ball.berserkTimer > 0) {
    ctx.strokeStyle = "rgba(255,75,35,.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 2.35, time * 0.01, time * 0.01 + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderArena(ctx: CanvasRenderingContext2D, game: GameState, time: number, options: RenderOptions) {
  const budget = visualBudget(game.quality, options.reduceEffects);
  ctx.save();
  const shakeAmount = options.screenShake ? game.shake : 0;
  ctx.translate(shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount : 0, shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount : 0);
  renderEnvironment(ctx, game, time, options);

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

  if (game.blackHole) {
    const pulse = 1 + Math.sin(time * 0.009) * 0.11;
    const hole = game.blackHole;
    const gravity = ctx.createRadialGradient(hole.x, hole.y, 2, hole.x, hole.y, 105 * pulse);
    gravity.addColorStop(0, "rgba(0,0,0,1)");
    gravity.addColorStop(0.28, "rgba(81,35,151,.9)");
    gravity.addColorStop(0.65, "rgba(151,91,255,.22)");
    gravity.addColorStop(1, "rgba(151,91,255,0)");
    ctx.fillStyle = gravity;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, 105 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  renderPortals(ctx, game, time);
  renderBarrier(ctx, game, time);

  const drawShield = (side: ElementSide) => {
    const x = side === "ice" ? 22 : WORLD_W - 22;
    const color = side === "ice" ? game.palette.ice : game.palette.fire;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35 + Math.sin(time * 0.008) * 0.12;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24 * budget.blur;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, WORLD_H * 0.23);
    ctx.quadraticCurveTo(side === "ice" ? 48 : WORLD_W - 48, WORLD_H / 2, x, WORLD_H * 0.77);
    ctx.stroke();
    ctx.restore();
  };
  if (game.shields.ice > 0) drawShield("ice");
  if (game.shields.fire > 0) drawShield("fire");

  if (game.powerUp) {
    const power = game.powerUp;
    const data = POWER_UPS.find((entry) => entry.kind === power.kind) ?? POWER_UPS[0];
    const rings = power.rarity === "legendaire" ? 4 : power.rarity === "epique" ? 3 : power.rarity === "rare" ? 2 : 1;
    const pulse = 1 + Math.sin(time * 0.009) * 0.1;
    ctx.save();
    ctx.translate(power.x, power.y);
    ctx.rotate(power.angle);
    ctx.strokeStyle = data.color;
    ctx.shadowColor = data.color;
    ctx.shadowBlur = 28 * budget.blur;
    ctx.globalAlpha = clamp(power.life / 1.5, 0.28, 1);
    for (let ring = 0; ring < rings; ring += 1) {
      ctx.lineWidth = 3 + ring;
      ctx.beginPath();
      ctx.arc(0, 0, power.radius * (1.25 + ring * 0.25) * pulse, ring * 0.32, Math.PI * (1.55 + ring * 0.08));
      ctx.stroke();
      ctx.rotate(-power.angle * 0.32);
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 40px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = data.color;
    ctx.shadowBlur = 22 * budget.blur;
    ctx.fillText(data.symbol, power.x, power.y - 2);
    ctx.restore();
  }

  for (const ball of game.balls) {
    ball.trail.forEach((point, index) => {
      const alpha = point.life * (index / Math.max(1, ball.trail.length));
      const size = ball.radius * (0.3 + point.life * 0.75);
      const rgb = hexRgb(point.element === "ice" ? game.palette.ice : game.palette.fire);
      const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * (options.trailStyle === "comet" ? 3.1 : 2.3));
      glow.addColorStop(0, options.trailStyle === "rift" ? `rgba(171,111,255,${alpha * 0.75})` : `rgba(${rgb},${alpha * 0.7})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * (options.trailStyle === "comet" ? 3.1 : 2.3), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  game.particles.slice(-budget.particles).forEach((particle) => {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 13 * budget.blur;
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    ctx.translate(particle.x, particle.y);
    if (particle.shape === "crystal") {
      ctx.rotate(Math.atan2(particle.vy, particle.vx));
      ctx.beginPath();
      ctx.moveTo(particle.size * alpha * 1.7, 0);
      ctx.lineTo(0, particle.size * alpha * 0.65);
      ctx.lineTo(-particle.size * alpha, 0);
      ctx.lineTo(0, -particle.size * alpha * 0.65);
      ctx.closePath();
      ctx.fill();
    } else if (particle.shape === "ring") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * alpha * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  renderPaddle(ctx, game, game.left, "ice");
  renderPaddle(ctx, game, game.right, "fire");
  if (game.clone.ice > 0) renderPaddle(ctx, game, game.left, "ice", true);
  if (game.clone.fire > 0) renderPaddle(ctx, game, game.right, "fire", true);
  for (const ball of game.balls) renderBall(ctx, game, ball, time, options);

  if (game.boss?.telegraphTimer && game.boss.telegraph) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "900 34px Arial";
    ctx.letterSpacing = "8px";
    ctx.fillStyle = game.boss.name === "KRYON" ? "#a8f5ff" : game.boss.name === "VORTEX" ? "#bd8fff" : "#ffb14f";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 28;
    ctx.fillText(game.boss.telegraph, WORLD_W / 2, 122);
    ctx.restore();
  }

  if (game.ultimateVisual) {
    const progress = clamp(game.ultimateVisual.timer / 2.2, 0, 1);
    const ice = game.ultimateVisual.side === "ice";
    const gradient = ctx.createRadialGradient(ice ? 0 : WORLD_W, WORLD_H / 2, 20, ice ? 0 : WORLD_W, WORLD_H / 2, WORLD_W * 0.82);
    gradient.addColorStop(0, ice ? `rgba(155,246,255,${0.32 * progress})` : `rgba(255,89,35,${0.36 * progress})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.save();
    ctx.globalAlpha = 0.18 * progress;
    ctx.strokeStyle = ice ? "#d5fbff" : "#ffb64f";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(ice ? 100 : WORLD_W - 100, WORLD_H / 2, (1 - progress) * WORLD_W * 0.7 + 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 3;
  roundedRect(ctx, 5, 5, WORLD_W - 10, WORLD_H - 10, 30);
  ctx.stroke();

  if (game.serveDelay > 0 && game.roundTransition <= 0) {
    ctx.fillStyle = "rgba(5,8,17,.42)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const count = Math.max(1, Math.ceil(game.serveDelay * 3));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 96px Arial";
    ctx.shadowColor = game.servingTo === "ice" ? game.palette.ice : game.palette.fire;
    ctx.shadowBlur = 35 * budget.blur;
    ctx.fillStyle = "white";
    ctx.fillText(String(count), WORLD_W / 2, WORLD_H / 2);
    ctx.shadowBlur = 0;
  }

  if (game.roundTransition > 0) {
    ctx.fillStyle = "rgba(4,7,15,.58)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.textAlign = "center";
    ctx.font = "900 58px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`MANCHE ${game.sets.ice + game.sets.fire + 1}`, WORLD_W / 2, WORLD_H / 2);
  }

  if (options.flashes && game.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.3})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  ctx.restore();
}

