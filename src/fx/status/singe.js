// The flame tongue, smoke and ember recipes are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, rand, clamp } from "../../core/index.js";
import { flameTongue, smokePuff, ember, floorLight, drift, noiseFor, hotFirst, flicker, looped, LAYERS } from "../fire/_lib.js";
import { shape, tnoise } from "./_lib.js";
import { beat, hotspots, edgeSpots, charred, tintBody, hotRim } from "./_burn.js";

export const meta = {
  name: "Singe",
  desc: "A light burn: a flame on the shoulder and a few licking along the sleeve, thin smoke, an ember now and then; every 0.8 s they flare, the cloth glows and a char spot opens.",
  tags: ["status", "fire", "burn", "dot", "debuff", "light", "loop"],
  size: [72, 80],
  origin: [36, 70],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    char: ["#120c0a", "#2a1a14", "#4a2c1c"],
    smoke: "#5b5566",
    seed: 4,
  },
};

const P_ = { turn: 0.9, crouch: 2, lean: 1 };
const F_ = { turn: 0.9, crouch: 3.5, lean: 3, x: 0.5 };
export const act = {
  onBody: true,
  poses: [[0, P_], [0.4, { ...P_, lean: 2.5 }], [0.78, P_], [0.8, F_, "snap"], [1.05, { ...P_, lean: 2 }], [1.2, P_], [1.58, { ...P_, lean: 2.5 }], [1.6, P_, "snap"]],
};

const D = meta.duration, TICK = 0.8, WIND = -3;
const cfg = { names: ["shoulderR"], h: 4.6 };
const edgeCfg = { rows: [0.3, 0.46], h: 3.6 };

export function drawBack(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), a = o.actor, { heat } = beat(t, TICK), N = noiseFor(D);
  floorLight(p, 0, 0, 20, 4, mix(H[4], H[5], 0.4), 0.08 + 0.1 * heat);
  const SMOKE = mix(hex(o.smoke), H[6], 0.2), spot = hotspots(a, o.seed, cfg).list[0];
  looped(t, D, 4, o.seed + 300, (r) => ({ x: spot.x + r.range(-2, 2), y: spot.y - 2, vx: r.range(-2, 2), vy: -r.range(9, 14), life: r.range(1.1, 1.7), s: r.range(1.1, 1.8) }), (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, WIND, -14, 1.4, 1);
    smokePuff(p, x + N(t - age, 0.8, 60) * (0.6 + age), y, 1 - age / q.life, q.s, SMOKE, false, 0.75);
  });
}

export function draw(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), CH = fit(o.char, 3), a = o.actor, S = shape(a);
  const { list } = hotspots(a, o.seed, cfg), edge = edgeSpots(a, o.seed, edgeCfg);
  const { s: ph, heat } = beat(t, TICK), tick = Math.floor(t / TICK) % 2, N = noiseFor(D), fl = flicker(N, 2), tno = (f, s) => tnoise(t, D, f, s);
  // a small char spot opens on the beat and cools to a dull brown
  const [sc] = charred(a, o.seed + 1, 2, 1)[tick];
  if (ph < 0.9) {
    const grow = clamp(ph / 0.1), fade = 1 - clamp((ph - 0.25) / 0.5), r = sc.r * (0.45 + 0.55 * grow);
    for (const [mx, my] of S.body) {
      const x = a.x + mx + 0.5, y = a.y + my + 0.5, d = Math.hypot(x - sc.x, (y - sc.y) * 1.2) + rand(mx, my, 7) * 0.9;
      if (d > r || fade <= 0) continue;
      if (d > r - 1) p.dot(x - 0.5, y - 0.5, rand(mx, my, Math.floor(t * 12)) < 0.5 ? H[4] : H[3], fade);
      else p.dot(x - 0.5, y - 0.5, d < r * 0.5 ? CH[0] : CH[1], fade * 0.9);
    }
    p.glow(sc.x, sc.y, 5, H[4], 0.2 * fade);
  }
  // the cloth under the fire glows on the beat, then cools
  if (ph < 0.26) {
    const k = 1 - ph / 0.26;
    for (const sp of list) for (const [mx, my] of S.body) if (Math.hypot(a.x + mx + 0.5 - sp.x, a.y + my + 0.5 - sp.y) < 4.5) p.blend(a.x + mx, a.y + my, H[4], 0.28 * k);
  }
  const all = [...list, ...edge.list];
  for (const [i, sp] of all.entries()) {
    const h = sp.h * (0.88 + 0.22 * N(3.3, sp.n ?? i) + Math.max(0, N(2.6, (sp.n ?? i) + 70) - 0.55) * 1.1) * (1 + 0.8 * heat);
    const w = 1.05 + 0.12 * heat;
    flameTongue(p, sp.x, sp.y, h, w, (sp.side ?? 0) * 0.5 - 0.3 + tno(3, (sp.n ?? i) + 9) * 0.7, N, (sp.n ?? i) + 3, H, LAYERS, 0.45, 0.9 + h * 0.03);
    p.glow(sp.x, sp.y - h * 0.35, 6 + 3 * heat, H[4], 0.1 + 0.16 * heat);
  }
  hotRim(p, a, S, all, 4, H[4], (0.22 + 0.45 * heat) * fl, 5);
  // a couple of embers drifting up, slow and sparse
  looped(t, D, 5, o.seed + 500, (r) => ({ sp: all[Math.floor(r.next() * all.length)], vx: r.range(-6, 6), vy: -r.range(14, 26), life: r.range(0.8, 1.3), s: r.chance(0.2) ? 2 : 1 }), (q, age) => {
    const [x, y] = drift(q.sp.x, q.sp.y - 1, q.vx, q.vy, age, WIND, -20, 1.3, 1.3);
    ember(p, x, y, 1 - age / q.life, q.s, [H[1], H[3], H[5], H[7]], age + 1);
  });
  // the beat throws one spark off the shoulder flame
  if (ph < 0.32) {
    const sp = list[0], an = -Math.PI / 2 + (rand(tick, 3) - 0.5) * 1.6, v = 45 + 35 * rand(3, tick);
    const x = sp.x + Math.cos(an) * 60 * ph, y = sp.y - 3 + Math.sin(an) * 60 * ph + 70 * ph * ph;
    p.px(x, y, ph < 0.1 ? H[1] : H[3]);
    p.light(x, y, H[3], 0.3 * (1 - ph / 0.32));
  }
}
