// Fire puffs cooling into smoke and sparks use the particle recipe adapted from Sprite Fusion's
// open-source explosion (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License,
// Copyright (c) 2026 Hugo Duprez.
import { Particles, P, Rng, fit, smooth, WHITE } from "../../core/index.js";
import { drawPs, fireRamp } from "./_lib.js";

export const meta = {
  name: "Fire lance burst",
  desc: "A pinprick at the muzzle grows into a one-way, rolling lance of fire; the tip blossoms, throws sparks and cools into dark smoke.",
  tags: ["explosion", "fire", "blast", "muzzle", "directional", "smoke", "one-shot"],
  size: [220, 144],
  origin: [16, 98],
  duration: 1.35,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#1a0d12", "#46191b", "#7d2223", "#bd4124", "#f1782e", "#ffb451", "#ffe1a0", "#fff3d4"],
    seed: 7,
  },
};

const SPARK = 0.045, ADVANCE = 0.39, BURST = 0.43;
const axis = (x) => -x * 0.18;
const fade = (t, a, b) => 1 - smooth(a, b, t);

function tongue(p, x0, x1, t, w, col, a = 1) {
  if (x1 - x0 < 3 || a <= 0) return;
  const up = [], down = [], length = x1 - x0;
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, x = x0 + length * u;
    const profile = Math.pow(Math.sin(Math.PI * u), 0.52);
    const flicker = Math.sin(u * 18 + t * 24) * 0.18 + Math.sin(u * 37 - t * 16) * 0.09;
    const wave = Math.sin(u * 10 - t * 12) * profile * 2;
    const r = Math.max(0.8, w * profile * (1 + flicker));
    up.push([x, axis(x) + wave - r * (1.1 + 0.2 * Math.sin(u * 22 - t * 17))]);
    down.push([x, axis(x) + wave + r * (0.75 + 0.18 * Math.sin(u * 16 + t * 20))]);
  }
  p.poly([...up, ...down.reverse()], col, a);
}

function lick(p, x, y, rise, lean, col, a) {
  p.poly([
    [x - 8, y + 2], [x - 5, y - rise * 0.3], [x + lean * 0.45, y - rise],
    [x + lean * 0.3 + 2, y - rise * 0.55], [x + 4, y - rise * 0.3], [x + 8, y + 2],
  ], col, a);
}

export function create(o) {
  const C = fit(o.palette, 8), FR = fireRamp(C), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 1000, sparks: [C[7], C[6], C[5], C[3]] });
  let t = 0, next = SPARK, burst = false;

  // One source of truth for the traveling fire front: emitters and the painted tongue meet here.
  const head = (time) => 4 + 126 * smooth(SPARK, ADVANCE, time);

  return {
    update(dt) {
      t += dt;
      while (next < Math.min(t, BURST) && next < ADVANCE) {
        const x = head(next), y = axis(x), q = smooth(SPARK, ADVANCE, next);
        for (let i = 0; i < 2; i++) ps.spawn(P.FIRE, x - R.range(0, 7), y + R.range(-3, 3),
          R.range(-12, 65), R.range(-55, 22), R.range(0.26, 0.43), 0, R.range(2.5, 4.5) + q * 2);
        if (R.chance(0.65)) ps.spawn(P.SPARK, x, y, R.range(135, 260), R.range(-90, 70), R.range(0.14, 0.33));
        next += 1 / 65;
      }
      if (!burst && t >= BURST) {
        burst = true;
        for (let i = 0; i < 15; i++) {
          const a = R.range(-0.8, 0.75), v = R.range(90, 240);
          ps.spawn(P.FIRE, 128 + R.range(-5, 5), axis(128) + R.range(-5, 5),
            Math.cos(a) * v, Math.sin(a) * v - 35, R.range(0.25, 0.47), 0,
            R.range(3.5, 7));
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(-1.25, 1.1), v = R.range(150, 310);
          ps.spawn(P.SPARK, 129, axis(129), Math.cos(a) * v, Math.sin(a) * v,
            R.range(0.16, 0.36));
        }
        for (let i = 0; i < 18; i++) ps.spawn(P.VAPOUR, 128 + R.range(-13, 15), axis(128) + R.range(-10, 11),
          R.range(-15, 40), -R.range(12, 48), R.range(0.62, 0.91), i % 5 ? C[1] : C[2], R.range(8, 14),
          R.range(0, 0.11));
      }
      ps.update(dt);
    },
    draw(p) {
      if (t >= meta.duration) return;
      p.fade = fade(t, 0.96, 1.34);
      // The first held drawing is a small ember, then the front advances one readable step at a time.
      if (t < SPARK) {
        p.circle(0, 0, 1.7, C[7]);
        p.glow(0, 0, 10, C[5], 0.45);
      }
      // Cooling puffs sit behind the painted flame; sparks and warm smoke remain visible outside it.
      drawPs(p, ps, "back", FR);
      drawPs(p, ps, "front", FR);
      const tip = head(t), extend = smooth(SPARK, ADVANCE, t), fire = fade(t, 0.47, 0.79);
      if (t >= SPARK && fire > 0) {
        const tail = Math.max(0, (t - BURST) * 270), w = 3 + 12 * extend;
        tongue(p, tail, tip + 3, t, w + 4, C[2], fire);
        tongue(p, tail + 2, tip + 2, t + 0.035, w, C[4], fire);
        tongue(p, tail + 3, tip + 3, t + 0.075, w * 0.64, C[5], fire * fade(t, 0.4, 0.67));
        tongue(p, Math.max(tail + 5, tip - 38 - 12 * extend), tip + 3, t + 0.1,
          w * 0.33, C[7], fire * fade(t, 0.29, 0.56));
        // Irregular side flames travel with the front instead of sitting on fixed points of a beam.
        for (let i = 0; i < 5; i++) {
          const u = 0.21 + i * 0.16, x = tail + (tip - tail) * u;
          const wave = 0.5 + 0.5 * Math.sin(t * (24 + i * 3) - i * 1.7);
          const rise = (4 + 8 * wave) * extend;
          lick(p, x, axis(x) - w * (0.72 + 0.1 * wave), rise, -2 - 5 * wave,
            i % 2 ? C[3] : C[4], fire * (0.65 + 0.3 * wave));
          if (i % 2 === 0) lick(p, x + 3, axis(x) + w * 0.6, -rise * 0.55,
            3 + 4 * wave, C[3], fire * 0.6);
        }
        // Bright, unequal lobes around the advancing edge read as flame, not a straight beam.
        for (let i = 0; i < 3; i++) {
          const x = tip - 4 - i * (7 + extend * 2), y = axis(x) + (i - 1) * 3;
          const r = 1.5 + (4 - i * 0.5) * extend;
          p.circle(x, y, r, i === 0 ? C[6] : C[5], fire * fade(t, 0.48, 0.7));
        }
        p.glow(tip - 5, axis(tip), 13 + 20 * extend, C[4], 0.38 * fire);
        p.glow(tip - 3, axis(tip), 8 + 8 * extend, C[6], 0.27 * fire);
      }
      // Contact is a short hero frame; the lingering particles have their own falling, cooling motion.
      if (t >= BURST && t < BURST + 0.075) {
        const k = fade(t, BURST, BURST + 0.075);
        p.circle(129, axis(129), 5 + 7 * k, k > 0.4 ? WHITE : C[6], k);
        p.glow(129, axis(129), 30, C[4], 0.45 * k);
      }
    },
  };
}
