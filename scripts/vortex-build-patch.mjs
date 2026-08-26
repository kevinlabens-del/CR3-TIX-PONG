import fs from 'node:fs';

const dataPath = 'app/v3-data.ts';
let data = fs.readFileSync(dataPath, 'utf8');
data = data.replace(
  'reaction: 32, ballSpeed: 745, winScore: 5, playerHeight: 174, enemyHeight: 205, modifier: "boss", reward: 95, aiBehavior: "boss", boss: "VORTEX"',
  'reaction: 92, ballSpeed: 720, winScore: 5, playerHeight: 184, enemyHeight: 188, modifier: "boss", reward: 95, aiBehavior: "impulsive", boss: "VORTEX"'
);
fs.writeFileSync(dataPath, data);

const pongPath = 'app/PongV3.tsx';
let pong = fs.readFileSync(pongPath, 'utf8');
const oldBlock = `      } else if (boss.name === "VORTEX") {
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
        if (boss.phase === 2) for (const ball of game.balls) ball.spin += randomRange(game.rng, -190, 190);`;
const newBlock = `      } else if (boss.name === "VORTEX") {
        boss.telegraph = boss.phase === 1 ? "RIFT OUVERT" : "RIFT INSTABLE";
        game.portals = game.portals.filter((portal) => portal.owner !== "arena");
        game.portals.push({
          ax: WORLD_W * 0.36,
          ay: randomRange(game.rng, 205, 695),
          bx: WORLD_W * 0.64,
          by: randomRange(game.rng, 205, 695),
          radius: boss.phase === 1 ? 45 : 42,
          timer: boss.phase === 1 ? 4.6 : 4.0,
          owner: "arena",
        });
        if (boss.phase === 2) {
          for (const ball of game.balls) ball.spin += randomRange(game.rng, -72, 72);
          game.freeze.fire = Math.max(game.freeze.fire, 0.72);
        }`;
if (!pong.includes(oldBlock)) throw new Error('VORTEX boss block not found');
pong = pong.replace(oldBlock, newBlock);
pong = pong.replace(
  'boss.eventTimer = boss.name === "SOLARIS" ? Math.max(4.2, 7.5 - boss.phase * 0.9) : Math.max(4.6, 8 - boss.phase * 1.2);',
  'boss.eventTimer = boss.name === "SOLARIS" ? Math.max(4.2, 7.5 - boss.phase * 0.9) : boss.name === "VORTEX" ? (boss.phase === 1 ? 8.8 : 8.2) : Math.max(4.6, 8 - boss.phase * 1.2);'
);
fs.writeFileSync(pongPath, pong);
console.log('VORTEX build patch applied');
