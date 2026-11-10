// The flame tongue, smoke, ember and spark recipes are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, rand, clamp, WHITE, smooth } from "../../core/index.js";
import { flameTongue, smokePuff, ember, spark, floorLight, drift, noiseFor, hotFirst, looped, LAYERS } from "../fire/_lib.js";
import { shape } from "./_lib.js";
import { hotspots, edgeSpots } from "./_burn.js";

export const meta = {
  name: "Ignite",
  desc: "The moment a burn lands: the body snaps white, fire bursts off the shoulders and head, sparks and smoke fly, a ring of heat spreads, then it is gone and only the burn is left.",
  tags: ["status", "fire", "burn", "ignite", "debuff", "one-shot", "impact"],
  size: [88, 96],
  origin: [44, 86],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    char: ["#120c0a", "#2a1a14", "#4a2c1c"],
    smoke: "#4c465a",
    seed: 8,
  },
};

const J_ = { turn: 0.95, crouch: 4, lean: -5, x: -1 };
const R_ = { turn: 0.9, crouch: 1, lean: 3, x: 1 };
export const act = {
  onBody: true,
  poses: [[-0.02, { turn: 0.9, crouch: 2, lean: 1 }], [0.06, J_, "snap"], [0.3, R_, "out"], [0.6, { ...J_, crouch: 2, lean: -2 }], [0.9, { turn: 0.9, crouch: 2, lean: 1 }]],
  hits: [{ t: 0.06, stop: 0.05, shake: 0.12, amp: 1.5, target: false }],
};

const D = meta.duration, WIND = -5;
const cfg = { names: ["head", "shoulderL", "shoulderR"], h: 9 };
const edgeCfg = { rows: [0.16, 0.32, 0.5, 0.68], h: 7 };
/** The body is hidden for the one white frame of the burst. */
export const actorAlpha = (t) => (t < 0.05 ? 0 : 1);

// the burst's envelope: up fast, gone by 0.55
const env = (t) => (t < 0.05 ? 0 : Math.min(1, (t - 0.05) / 0.04) * Math.exp(-(t - 0.05) / 0.14));
const ring = (t) => clamp((t - 0.03) / 0.3);

export function drawBack(p, t, o) {
  if (t >= D - 1e-6) return;
  const H = hotFirst(fit(o.palette, 9)), a = o.actor, S = shape(a), N = noiseFor(0), e = env(t);
  const r = ring(t), k = 1 - r;
  if (k > 0) {
    // a ring of heat running out over the floor
    const rad = 10 + 26 * (1 - Math.pow(1 - r, 2));
    floorLight(p, 0, 0, rad, rad * 0.24, mix(H[4], H[5], 0.5), 0.5 * k);
    p.shade(-rad - 2, -3, rad + 2, 4, (x, y, out) => {
      const d = Math.hypot(x / rad, (y - 0.5) / (rad * 0.24));
      if (d > 0.82 && d < 1.05) (out.l = H[5]), (out.k = 0.5 * k * (1 - Math.abs(d - 0.93) / 0.12));
    });
  }
  // smoke thrown off by the burst
  const SMOKE = mix(hex(o.smoke), H[6], 0.2);
  for (let i = 0; i < 6; i++) {
    const b = 0.05 + i * 0.012, age = t - b;
    if (age < 0 || age > 0.72) continue;
    const sp = i % 2 ? [a.x - 6, a.y + 12] : [a.x + 6, a.y + 14];
    const [x, y] = drift(sp[0] + rand(i, 3) * 6 - 3, sp[1], rand(i, 7) * 10 - 5, -12 - rand(i, 9) * 8, age, WIND, -16, 1.2, 1);
    smokePuff(p, x, y, 1 - age / 0.72, 1.6 + rand(i, 11) * 1.2, SMOKE, false, 0.65);
  }
  for (let i = 0; i < 3; i++) {
    const by = a.y + 38 * (0.3 + i * 0.2), h = 10 * e * (0.8 + 0.3 * i);
    flameTongue(p, a.x - 4 + i * 4, by, h, 2.4, -0.8 + N(2.4, i) * 1.2, N, 30 + i, H, LAYERS, 0.6, 1.2);
  }
}

export function draw(p, t, o) {
  if (t >= D - 1e-6) return;
  const H = hotFirst(fit(o.palette, 9)), CH = fit(o.char, 3), a = o.actor, S = shape(a);
  const { list } = hotspots(a, o.seed, cfg), edge = edgeSpots(a, o.seed, edgeCfg), all = [...list, ...edge.list];
  const e = env(t), N = noiseFor(0);
  // the burst frame: the body's pixels go white, then burn orange while the fire grows out of it
  if (t < 0.05) for (const [mx, my] of S.body) p.px(a.x + mx, a.y + my, WHITE);
  else if (t < 0.4) {
    const k = 1 - clamp((t - 0.05) / 0.35);
    if (k > 0.55) for (const [mx, my] of S.body) p.px(a.x + mx, a.y + my, mix(WHITE, H[2], 1 - (k - 0.55) / 0.45));
    else for (const [mx, my] of S.body) p.blend(a.x + mx, a.y + my, H[3], 0.5 * k);
    p.light(0, -20, H[3], 0.7 * k);
  }
  // the fire that bursts off the body: fast out, then shrinking away
  for (const [i, sp] of all.entries()) {
    const n = (sp.n ?? i * 11) + 3, h = sp.h * e * (0.9 + 0.3 * Math.abs(N(4, n)));
    if (h < 0.6) continue;
    flameTongue(p, sp.x, sp.y, h, 1.2 + 1.1 * e, (sp.side ?? 0) * 0.9 + N(2.6, n) * (0.5 + e), N, n, H, LAYERS, 0.5, 1.1 + h * 0.05);
    p.glow(sp.x, sp.y - h * 0.4, 8 + 10 * e, H[4], 0.12 + 0.3 * e);
  }
  // sparks thrown out and falling, embers rising
  for (let i = 0; i < 20; i++) {
    const b = 0.05 + rand(i, 1) * 0.04, age = t - b;
    if (age < 0 || age > 0.5) continue;
    const sp = list[i % list.length], an = -Math.PI / 2 + (rand(i, 2) - 0.5) * 2.4, v = 45 + rand(i, 4) * 105;
    const [x, y, vx, vy] = drift(sp.x, sp.y - 2, Math.cos(an) * v, Math.sin(an) * v, age, 0, 320, 2.4, 2.4);
    if (y > 0.5) continue;
    spark(p, x, y, vx, vy, 1 - age / 0.5, [H[0], H[2], H[4]]);
  }
  looped(t, 0.9, 10, o.seed + 500, (r) => ({ sp: all[Math.floor(r.next() * all.length)], vx: r.range(-10, 10), vy: -r.range(20, 45), life: r.range(0.25, 0.45) }), (q, age) => {
    if (age < 0.05) return;
    const [x, y] = drift(q.sp.x, q.sp.y - 2, q.vx, q.vy, age - 0.05, WIND * 0.5, -24, 1.3, 1.3);
    ember(p, x, y, 1 - (age - 0.05) / q.life, 1, [H[1], H[3], H[5], H[7]], age * 3);
  });
  // the floor's own heat dies with the burst
  if (t > 0.1 && t < 0.9) floorLight(p, 0, 0, 20 * (1 - t), 4, mix(H[4], H[5], 0.4), 0.18 * (1 - t / 0.9));
}
