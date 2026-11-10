// The flame tongue, smoke, ember and spark recipes are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, rand, clamp, WHITE } from "../../core/index.js";
import { flameTongue, smokePuff, ember, floorLight, drift, noiseFor, hotFirst, flicker, looped } from "../fire/_lib.js";
import { shape } from "./_lib.js";
import { beat, hotspots, edgeSpots, tintBody, hotRim } from "./_burn.js";

export const meta = {
  name: "Hellfire",
  desc: "A cursed burn: violet fire with a hollow black heart licks off the whole body, black smoke rises, embers sink and die; every 0.6 s it flares and the body flashes white-violet.",
  tags: ["status", "fire", "burn", "curse", "dark", "debuff", "loop"],
  size: [88, 96],
  origin: [44, 86],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#12031f", "#2a0a3f", "#48125e", "#6b1a80", "#9424a0", "#c03ab8", "#e86ad8", "#ffb0f0", "#ffffff"],
    char: ["#0c0614", "#1e1030", "#38204a"],
    smoke: "#2a1030",
    seed: 6,
  },
};

const P_ = { turn: 0.9, crouch: 2, lean: 1 };
const W_ = { turn: 0.8, crouch: 4, lean: -3, x: 1 };
const S_ = { turn: 1, crouch: 3, lean: 4, x: 0.5 };
export const act = {
  onBody: true,
  poses: [[0, P_], [0.36, { ...P_, lean: 2, turn: 0.82 }], [0.58, P_], [0.6, W_, "snap"], [0.78, S_, "out"], [1.0, { ...P_, lean: 1.5 }], [1.2, P_]],
};

const D = meta.duration, TICK = 0.6, WIND = -4;
const cfg = { names: ["head", "shoulderL", "shoulderR"], h: 9 };
const edgeCfg = { rows: [0.14, 0.28, 0.42, 0.56, 0.7, 0.84], h: 7.5 };
// a hollow heart: the tongue is bright at its rim and goes black in the middle
const HOLLOW = [[1, 1, 2], [0.8, 0.9, 4], [0.56, 0.7, 6], [0.28, 0.4, 8]];
const BACK = [[-5, 0.3, 14], [4, 0.44, 16], [-2, 0.64, 12]];

export function drawBack(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), a = o.actor, { heat } = beat(t, TICK), N = noiseFor(D);
  floorLight(p, 0, 0, 28, 5.5, mix(H[3], H[4], 0.5), 0.16 + 0.2 * heat);
  for (const [i, [bx, q, bh]] of BACK.entries()) {
    const by = a.y + 38 * q, h = bh * (0.92 + 0.16 * N(3.1, 20 + i)) * (1 + 0.45 * heat);
    flameTongue(p, a.x + bx, by, h, 3.2 + 0.5 * heat, -1 + N(2.2, i + 30) * 1.4, N, 40 + i * 7, H, [[1, 1, 4], [0.76, 0.88, 6], [0.5, 0.66, 8]], 0.7, 1.7);
  }
  // black smoke, heavier and slower than a normal fire
  const SMOKE = mix(hex(o.smoke), H[5], 0.15);
  looped(t, D, 8, o.seed + 300, (r) => ({ x: a.x + r.range(-8, 4), y: a.y + r.range(-6, 2), vx: r.range(-4, 2), vy: -r.range(9, 15), life: r.range(1.4, 2.2), s: r.range(1.8, 3) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, WIND, -14, 1.2, 1);
    smokePuff(p, x + N(t - age, 0.8, 60) * (1 + 1.5 * age), y, 1 - age / q.life, q.s, SMOKE, false, 0.6);
  });
}

export function draw(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), CH = fit(o.char, 3), a = o.actor, S = shape(a);
  const { list } = hotspots(a, o.seed, cfg), edge = edgeSpots(a, o.seed, edgeCfg);
  const all = [...list, ...edge.list], { s: ph, heat } = beat(t, TICK), N = noiseFor(D), fl = flicker(N, 2);
  // the flare: white-violet for two frames, then a violet burn that cools back to a cold tint
  if (ph < 0.034) for (const [mx, my] of S.body) p.px(a.x + mx, a.y + my, WHITE);
  else if (ph < 0.26) {
    const k = 1 - (ph - 0.034) / 0.226;
    tintBody(p, a, S, H[4], 0.55 * k);
    tintBody(p, a, S, WHITE, 0.22 * k);
  } else tintBody(p, a, S, H[3], 0.18);
  // the flames: hollow, bright-edged, taller than a normal fire
  for (const [i, sp] of all.entries()) {
    const n = sp.n ?? i * 13 + 5;
    const h = sp.h * (0.85 + 0.24 * N(3.2, n) + Math.max(0, N(2.5, n + 70) - 0.55) * 1.4) * (1 + 0.55 * heat);
    flameTongue(p, sp.x, sp.y, h, 1.2 + 0.25 * heat, (sp.side ?? 0) * 0.8 - 0.5 + N(2.2, n + 40) * 1.4, N, n, H, HOLLOW, 0.5, 1.2 + h * 0.05);
    p.glow(sp.x, sp.y - h * 0.3, 9 + 5 * heat, H[4], 0.1 + 0.18 * heat);
  }
  hotRim(p, a, S, all, 4, H[3], (0.25 + 0.5 * heat) * fl, 7);
  // embers that drift up and sink, and cold motes falling off the body
  looped(t, D, 12, o.seed + 500, (r) => ({ sp: all[Math.floor(r.next() * all.length)], vx: r.range(-8, 8), vy: -r.range(18, 40), life: r.range(0.7, 1.3), s: r.chance(0.3) ? 2 : 1 }), (q, age) => {
    const [x, y] = drift(q.sp.x, q.sp.y - 2, q.vx, q.vy, age, WIND * 0.6, -26, 1.3, 1.3);
    ember(p, x, y, 1 - age / q.life, q.s, [H[2], H[4], H[6], H[8]], age + 1);
  });
  looped(t, D, 7, o.seed + 700, (r) => ({ sp: all[Math.floor(r.next() * all.length)], vx: r.range(-5, 5), vy: r.range(-4, 6), life: r.range(0.9, 1.6) }), (q, age) => {
    const [x, y] = drift(q.sp.x, q.sp.y - 4, q.vx, q.vy, age, 0, 30, 0.5, 0.2);
    if (y > 1.5) return;
    const k = 1 - age / q.life;
    if (Math.sin(age * 10 + q.vx) > -0.4) p.dot(x, y, k > 0.5 ? H[7] : H[6], 0.75 * k);
  });
  if (ph < 0.22) p.light(0, -20, H[2], 0.45 * (1 - ph / 0.22));
}
