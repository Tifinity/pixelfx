// The flame tongue, smoke, ember and spark recipes are
// adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, rand, clamp, Rng } from "../../core/index.js";
import { flameTongue, smokePuff, ember, floorLight, drift, noiseFor, hotFirst, flicker, looped, LAYERS } from "../fire/_lib.js";
import { shape } from "./_lib.js";
import { beat, hotspots, edgeSpots, charred, tintBody, hotRim } from "./_burn.js";

export const meta = {
  name: "Smolder",
  desc: "Burning out: no flame left, just a dull red glow crawling over the charred body, thick slow smoke, ash flaking off and embers dying on the outlines; every 1.2 s it breathes hotter.",
  tags: ["status", "fire", "burn", "smoke", "ash", "dot", "debuff", "loop"],
  size: [76, 84],
  origin: [38, 74],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#3d1410", "#6e1c14", "#9c2a18", "#c8481c", "#e8701f", "#f89a2c", "#ffc04a", "#ffe08a", "#fff4c0"],
    char: ["#100a09", "#231512", "#3a211b"],
    smoke: "#57515f",
    seed: 5,
  },
};

const P_ = { turn: 0.9, crouch: 3, lean: 1 };
const S_ = { turn: 0.95, crouch: 5, lean: 4, x: 0.5 };
export const act = {
  onBody: true,
  poses: [[0, P_], [0.5, { ...P_, lean: 2, crouch: 4 }], [1.0, P_], [1.2, S_, "snap"], [1.6, { ...P_, lean: 2 }], [1.9, P_], [2.2, { ...P_, lean: 2, crouch: 4 }], [2.4, P_]],
};

const D = meta.duration, TICK = 1.2, WIND = -3;
const cfg = { names: ["shoulderL", "shoulderR"], h: 2.6 };
const edgeCfg = { rows: [0.2, 0.34, 0.5, 0.66, 0.8], h: 2.2 };

// ember cracks: paths that wander down through the charred body, drawn as glowing dithered pixels
const CRACKS = new WeakMap();
function cracks(a, seed) {
  let m = CRACKS.get(a.mask);
  if (!m) CRACKS.set(a.mask, (m = new Map()));
  if (m.has(seed)) return m.get(seed);
  const S = shape(a), H = S.h, W = S.w, R = new Rng(seed * 5 + 2), out = [];
  for (let k = 0; k < 3; k++) {
    let x = R.range(W * 0.2, W * 0.8), y = H * R.range(0.18, 0.36);
    const path = [];
    for (let i = 0; i < 15 && S.on(Math.round(x), Math.round(y)); i++) {
      path.push([Math.round(x), Math.round(y)]);
      x += R.range(-1.6, 1.6);
      y += R.range(0.6, 2.2);
    }
    if (path.length > 4) out.push(path);
  }
  m.set(seed, out);
  return out;
}

export function drawBack(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), a = o.actor, { heat } = beat(t, TICK), N = noiseFor(D);
  floorLight(p, 0, 0, 22, 4.5, mix(H[4], H[6], 0.4), 0.06 + 0.08 * heat);
  const SMOKE = mix(hex(o.smoke), H[6], 0.16), edge = edgeSpots(a, o.seed, edgeCfg).list;
  // thick, slow smoke rolling off the chest and shoulders
  looped(t, D, 8, o.seed + 300, (r) => {
    const sp = edge[Math.floor(r.next() * edge.length)];
    return { x: sp.x + r.range(-4, 4), y: sp.y - r.range(0, 8), vx: r.range(-5, 3), vy: -r.range(8, 14), life: r.range(1.6, 2.5), s: r.range(1.6, 2.8) };
  }, (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, WIND, -12, 1.3, 1.1);
    smokePuff(p, x + N(t - age, 0.7, 60) * (1.2 + 2.2 * age), y, 1 - age / q.life, q.s, SMOKE, false, 0.55);
  });
}

export function draw(p, t, o) {
  const H = hotFirst(fit(o.palette, 9)), CH = fit(o.char, 3), a = o.actor, S = shape(a);
  const { list } = hotspots(a, o.seed, cfg), edge = edgeSpots(a, o.seed, edgeCfg);
  const { s: ph, heat } = beat(t, TICK), tick = Math.floor(t / TICK) % 2, N = noiseFor(D), fl = flicker(N, 2);
  // the body is charred all through, breathing a little hotter on the beat
  const breathe = 0.1 + 0.12 * heat + 0.02 * N(0.9, 4);
  tintBody(p, a, S, CH[1], 0.22);
  if (ph < 0.5) tintBody(p, a, S, H[5], 0.22 * (1 - ph / 0.5));
  // the char from the last beat, cooling and fading but never quite gone
  for (const sc of charred(a, o.seed + 3, 2, 2)[tick]) {
    const fade = 1 - clamp((ph - 0.4) / 0.6), r = sc.r * (0.55 + 0.45 * Math.min(1, ph / 0.2));
    if (fade <= 0) continue;
    for (const [mx, my] of S.body) {
      const x = a.x + mx + 0.5, y = a.y + my + 0.5, d = Math.hypot(x - sc.x, (y - sc.y) * 1.2) + rand(mx, my, 7) * 0.9;
      if (d > r) continue;
      if (d > r - 1) p.dot(x - 0.5, y - 0.5, rand(mx, my, Math.floor(t * 8)) < 0.4 ? H[4] : H[5], fade * 0.9);
      else p.dot(x - 0.5, y - 0.5, CH[0], fade * 0.85);
    }
  }
  // ember cracks through the char, breathing with the beat
  const pulse = 0.45 + 0.35 * Math.sin((t / D) * Math.PI * 2) + 0.2 * fl;
  for (const [k, path] of cracks(a, o.seed).entries())
    for (const [mx, my] of path) {
      const x = a.x + mx + 0.5, y = a.y + my + 0.5, j = rand(mx, my, k);
      if (j > 0.45 + 0.3 * pulse) p.dot(x - 0.5, y - 0.5, H[4], 0.55 + 0.4 * pulse);
      else if (j > 0.25) p.dot(x - 0.5, y - 0.5, H[5], 0.3 + 0.4 * pulse);
      if (j > 0.86) p.glow(x, y, 3, H[4], 0.12 * pulse);
    }
  // the dull glow lives on the outlines: a dithered rim that breathes, ember-hot in places
  const rimK = (breathe + 0.08 * fl) * (0.9 + 0.3 * Math.sin((t / D) * Math.PI * 2));
  hotRim(p, a, S, edge.list, 6, H[4], rimK * 1.6, 9);
  hotRim(p, a, S, list, 6, H[4], rimK * 1.2, 11);
  // two flames barely hanging on: tiny tongues that gutter on the beat
  for (const [i, sp] of list.entries()) {
    const h = sp.h * (0.7 + 0.45 * Math.abs(N(3.1, sp.n + i))) * (1 + 1.2 * heat);
    flameTongue(p, sp.x, sp.y, h, 0.9, -0.3 + N(2.4, sp.n + 5) * 0.6, N, sp.n, H, LAYERS, 0.35, 0.6);
    p.glow(sp.x, sp.y - 2, 5 + 3 * heat, H[5], 0.1 + 0.16 * heat);
  }
  // embers crawling up the outline and dying
  looped(t, D, 10, o.seed + 500, (r) => {
    const sp = edge.list[Math.floor(r.next() * edge.list.length)];
    return { x: sp.x, y: sp.y - r.range(0, 6), vx: r.range(-3, 3), vy: -r.range(4, 12), life: r.range(0.7, 1.4), s: 1 };
  }, (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, WIND * 0.5, -16, 1.6, 1.6);
    ember(p, x, y, 1 - age / q.life, q.s, [H[3], H[5], H[6], H[7]], age + 1);
  });
  // ash flaking off and settling
  looped(t, D, 7, o.seed + 700, (r) => {
    const sp = edge.list[Math.floor(r.next() * edge.list.length)];
    return { x: sp.x + r.range(-3, 3), y: sp.y - r.range(4, 16), vx: r.range(-6, 4), vy: -r.range(0, 5), life: r.range(1.1, 1.9), w: r.range(0, 1) };
  }, (q, age) => {
    const [x, y] = drift(q.x, q.y, q.vx, q.vy, age, WIND, 26, 0.6, 0.15);
    const k = 1 - age / q.life;
    if (Math.sin(age * 9 + q.w * 20) > -0.3) p.dot(x, y, k > 0.5 ? mix(H[7], H[8], 0.4) : H[7], 0.7 * k);
  });
  // the beat shakes a few sparks out of the rim
  if (ph < 0.4)
    for (let j = 0; j < 3; j++) {
      const sp = edge.list[(tick * 3 + j) % edge.list.length], an = -Math.PI / 2 + (rand(tick, j, 5) - 0.5) * 2, v = 30 + 40 * rand(j, tick, 3);
      const x = sp.x + Math.cos(an) * v * ph, y = sp.y - 2 + Math.sin(an) * v * ph + 60 * ph * ph;
      p.px(x, y, ph < 0.12 ? H[2] : H[4]);
      p.light(x, y, H[4], 0.3 * (1 - ph / 0.4));
    }
}
