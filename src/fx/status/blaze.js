// The flame tongue, flame puff, smoke, ember and spark recipes are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, rand, clamp, WHITE } from "../../core/index.js";
import { flameTongue, smokePuff, firePuff, ember, spark, floorLight, drift, noiseFor, hotFirst, flicker, looped, BIG_LAYERS, BACK_LAYERS } from "../fire/_lib.js";
import { shape } from "./_lib.js";
import { beat, hotspots, edgeSpots, charred, tintBody, hotRim } from "./_burn.js";

export const meta = {
  name: "Blaze",
  desc: "Burning hard: flames stand all over the body, shoulder to boot, in back-lit fire and rolling smoke; every 0.5 s it flares, the body flashes white, scorches and embers pour off.",
  tags: ["status", "fire", "burn", "heavy", "dot", "debuff", "loop", "showpiece"],
  size: [88, 96],
  origin: [44, 86],
  duration: 1.0,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    char: ["#0d0808", "#241310", "#3e2118"],
    smoke: "#4c465a",
    seed: 7,
  },
};

const P_ = { turn: 0.9, crouch: 2, lean: 1 };
const W_ = { turn: 0.85, crouch: 5, lean: -4, x: 1.5 };
const S_ = { turn: 1, crouch: 3, lean: 5, x: 0.5 };
export const act = {
  onBody: true,
  poses: [[0, P_], [0.3, { ...P_, lean: 2 }], [0.48, P_], [0.5, W_, "snap"], [0.68, S_, "out"], [0.94, { ...P_, lean: 1 }], [1.0, P_]],
};

const D = meta.duration, TICK = 0.5, WIND = -5;
const cfg = { names: ["head", "shoulderL", "shoulderR"], h: 10 };
const edgeCfg = { rows: [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.94], h: 8.5 };
export const actorAlpha = (t) => (beat(t, TICK).s < 0.034 ? 0 : 1);

// fire behind the body, so the silhouette stands inside it: [dx from centre, height of the root, height]
const BACK = [[-5, 0.3, 14], [3, 0.42, 16], [-2, 0.62, 12]];

export function drawBack(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), a = o.actor, S = { h: 38 }, { heat } = beat(t, TICK), N = noiseFor(D);
  floorLight(p, 0, 0, 28, 5.5, mix(H[4], H[5], 0.4), 0.18 + 0.2 * heat);
  for (const [i, [bx, q, bh]] of BACK.entries()) {
    const by = a.y + 38 * q, h = bh * (0.92 + 0.16 * N(3.1, 20 + i)) * (1 + 0.45 * heat);
    flameTongue(p, a.x + bx, by, h, 5 + 0.6 * heat, -1.2 + N(2.2, i + 30) * 1.5, N, 40 + i * 7, H, BACK_LAYERS, 0.8, 1.8);
  }
  const SMOKE = mix(hex(o.smoke), H[6], 0.22);
  looped(t, D, 6, o.seed + 300, (r) => ({ x: a.x + r.range(-8, 6), y: a.y + r.range(-6, 2), vx: r.range(-5, 3), vy: -r.range(11, 17), life: r.range(1.4, 2.1), s: r.range(2.6, 4) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, WIND, -18, 1.4, 1);
    smokePuff(p, x + N(t - age, 0.8, 60) * (1.5 + 1.6 * age), y, 1 - age / q.life, q.s, SMOKE, true, 0.55);
  });
}

export function draw(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), CH = fit(o.char, 3), a = o.actor, S = shape(a), { list } = hotspots(a, o.seed, cfg);
  const { s: ph, heat } = beat(t, TICK), tick = Math.floor(t / TICK) % 2, N = noiseFor(D), fl = flicker(N, 2);
  const edge = edgeSpots(a, o.seed, edgeCfg);
  // the tick: white for two frames, then burning orange, cooling back to a permanent scorch
  if (ph < 0.034) for (const [mx, my] of S.body) p.px(a.x + mx, a.y + my, WHITE);
  else if (ph < 0.24) {
    const k = 1 - (ph - 0.034) / 0.206;
    tintBody(p, a, S, H[4], 0.6 * k);
    tintBody(p, a, S, WHITE, 0.25 * k);
  } else tintBody(p, a, S, H[5], 0.14);
  // the char this tick leaves, opening and cooling
  for (const sc of charred(a, o.seed + 2, 2, 2)[tick]) {
    const grow = clamp(ph / 0.16), fade = 1 - clamp((ph - 0.3) / 0.2), r = sc.r * (0.4 + 0.6 * grow);
    if (fade <= 0) continue;
    for (const [mx, my] of S.body) {
      const x = a.x + mx + 0.5, y = a.y + my + 0.5, d = Math.hypot(x - sc.x, (y - sc.y) * 1.2) + rand(mx, my, 7) * 0.9;
      if (d > r) continue;
      if (d > r - 1) p.dot(x - 0.5, y - 0.5, rand(mx, my, Math.floor(t * 16)) < 0.5 ? H[3] : H[4], fade * 1.1);
      else p.dot(x - 0.5, y - 0.5, d < r * 0.45 ? CH[0] : CH[1], fade);
    }
    p.glow(sc.x, sc.y, 6, H[4], 0.3 * fade);
  }
  // flames on every spot, the cloth's edge glowing under them
  for (const [i, sp] of [...list, ...edge.list].entries()) {
    const h = sp.h * (0.86 + 0.22 * N(3.3, sp.n ?? i) + Math.max(0, N(2.6, (sp.n ?? i) + 70) - 0.55) * 1.3) * (1 + 0.5 * heat);
    const w = sp.side !== undefined && sp.name?.startsWith("edge") ? 1.1 + 0.2 * heat : 1.9 + 0.35 * heat;
    flameTongue(p, sp.x, sp.y, h, w, (sp.side ?? 0) * 0.9 - 0.45 + N(2.2, (sp.n ?? i) + 40) * 1.3, N, (sp.n ?? i) + 3, H, w > 1.6 ? BIG_LAYERS : undefined, 0.5, 1.1 + h * 0.04);
    p.glow(sp.x, sp.y - h * 0.35, 9 + 4 * heat, H[4], 0.1 + 0.16 * heat);
  }
  hotRim(p, a, S, edge.list, 4, H[4], (0.3 + 0.55 * heat) * fl, 3);
  // flame puffs torn off the tips, cooling into smoke; embers rising; sparks thrown wide
  looped(t, D, 14, o.seed + 200, (r, i) => {
    const sp = list[i % list.length], fire = r.range(0.14, 0.32), smokes = r.chance(0.5);
    return { sp, fire, smokes, ox: r.range(-1, 1), oy: r.range(2, 9), vx: r.range(-6, 6), vy: -r.range(14, 30), s: r.range(0.7, 1.4), f: r.next(), life: fire + (smokes ? 1.3 : 0) };
  }, (q, age) => {
    const [x, y, vx, vy] = drift(q.sp.x + q.ox, q.sp.y + q.oy, q.vx, q.vy, Math.min(age, q.fire), 0, -90, 5, 3.2);
    if (age < q.fire) return firePuff(p, x, y, 1 - age / q.fire, q.s, q.f, H, 0.16);
    if (age - q.fire > 0.9) return;
    const [sx, sy] = drift(x, y, vx * 0.5, vy * 0.5 - 4, age - q.fire, WIND, -14, 1.4, 1.2);
    smokePuff(p, sx, sy, 1 - (age - q.fire) / 0.9, q.s * 1.2, mix(hex(o.smoke), H[6], 0.25), false, 0.8);
  });
  looped(t, D, 16, o.seed + 500, (r) => ({ sp: list[Math.floor(r.next() * list.length)], vx: r.range(-14, 14), vy: -r.range(30, 62), s: r.chance(0.25) ? 2 : 1, life: r.range(0.6, 1.2) }), (q, age) => {
    const [x, y] = drift(q.sp.x, q.sp.y - 2, q.vx, q.vy, age, WIND * 0.6, -26, 1.2, 1.2);
    ember(p, x, y, 1 - age / q.life, q.s, [H[1], H[3], H[5], H[7]], age + 1);
  });
  looped(t, D, 6, o.seed + 700, (r) => {
    const sp = list[Math.floor(r.next() * list.length)];
    return { sp, vx: r.range(-55, 45), vy: -r.range(20, 85), life: r.range(0.35, 0.7) };
  }, (q, age) => {
    const [x, y, vx, vy] = drift(q.sp.x, q.sp.y - 2, q.vx, q.vy, age, 0, 300, 2, 2);
    spark(p, x, y, vx, vy, 1 - age / q.life, [H[0], H[2], H[4]]);
  });
  if (ph < 0.2) p.light(0, -20, H[2], 0.5 * (1 - ph / 0.2));
}
