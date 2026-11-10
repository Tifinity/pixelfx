// Shared by the burn debuffs (files starting with _ are helpers, not effects): where a fire holds on a body,
// the char it leaves behind, and the rhythm of a damage tick. The flame tongue, flame puff, smoke and ember
// recipes are adapted from Sprite Fusion's open-source fire (https://www.spritefusion.com/pixel-art-vfx/fire),
// MIT License, Copyright (c) 2026 Hugo Duprez.

import { Rng, mix, rand, luma } from "../../core/index.js";
import { shape, colorAt, travel } from "./_lib.js";

/** Seconds since the last beat of a rhythm that repeats every P seconds, and how hot that beat still is (0..1). */
export function beat(t, P) {
  const s = (((t % P) + P) % P);
  return { s, heat: Math.exp(-s / 0.09) };
}

const SPOTS = new WeakMap();

/**
 * The spots a fire holds on the character, by name, adapted to whatever silhouette it is given:
 * head, shoulderL/R (top of each shoulder), backL (left flank), armR (right forearm), hipL/R, legL/R.
 * `list` is [{ name, x, y, side, h, tongues: [{ dx, h, n }] }] in effect space, standing on the edge of
 * the body, each anchor a cluster of 1 to 3 tongues. Cached per mask+config.
 */
export function hotspots(a, seed, { names = ["head", "shoulderR", "shoulderL"], h = 4, jitter = 0.5 } = {}) {
  let m = SPOTS.get(a.mask);
  if (!m) SPOTS.set(a.mask, (m = new Map()));
  const key = `${seed}:${h}:${jitter}:${names.join(",")}`;
  if (m.has(key)) return m.get(key);

  const S = shape(a), H = S.h, W = S.w, R = new Rng(seed * 13 + 5);
  const band = (list, y0, y1) => list.filter(([, y]) => y >= H * y0 && y <= H * y1);
  const sideBand = (dir, y0, y1) => band(S.side.filter(([, , d]) => d === dir), y0, y1);
  const pick = (list, cmp) => list.reduce((b, p) => (b === null || cmp(p, b) < 0 ? p : b), null);
  const top = (list) => pick(list, (p, b) => p[1] - b[1] || p[0] - b[0]);
  const left = (list) => pick(list, (p, b) => p[0] - b[0]);
  const right = (list) => pick(list, (p, b) => b[0] - p[0]);
  const anchors = {
    head: () => top(S.up),
    shoulderL: () => top(band(S.up.filter(([x]) => x < W * 0.5), 0.2, 0.42)) ?? top(band(S.up, 0.25, 0.45)),
    shoulderR: () => top(band(S.up.filter(([x]) => x > W * 0.5), 0.2, 0.42)) ?? top(band(S.up, 0.25, 0.45)),
    backL: () => top(sideBand(-1, 0.3, 0.46)),
    armR: () => top(sideBand(1, 0.44, 0.6)),
    hipL: () => top(sideBand(-1, 0.62, 0.8)),
    hipR: () => top(sideBand(1, 0.62, 0.8)),
    legL: () => left(band(S.up, 0.84, 0.98)),
    legR: () => right(band(S.up, 0.84, 0.98)),
  };

  const list = [];
  for (const name of names) {
    const p = (anchors[name] ?? anchors.shoulderR)();
    if (!p) continue;
    const [mx, my] = p, side = mx < W / 2 ? -1 : 1, n = R.chance(0.45) ? 1 : R.chance(0.6) ? 2 : 3;
    list.push({
      name,
      x: a.x + mx + 0.5 + R.range(-jitter, jitter),
      y: a.y + my + 1.2,
      side,
      h: h * R.range(0.78, 1.3),
      tongues: Array.from({ length: n }, (_, j) => ({ dx: (j - (n - 1) / 2) * 1.6 + R.range(-0.3, 0.3), h: R.range(0.6, 1.25), n: seed * 31 + list.length * 19 + j * 5 })),
    });
  }
  const out = { list };
  m.set(key, out);
  return out;
}

const PATCHES = new WeakMap();

/** Char patches on the clothes: `per` per tick, on mid-tone body pixels, so the burning spreads where it shows. */
export function charred(a, seed, ticks = 2, per = 2) {
  let m = PATCHES.get(a.mask);
  if (!m) PATCHES.set(a.mask, (m = new Map()));
  const key = `${seed}:${ticks}:${per}`;
  if (m.has(key)) return m.get(key);
  const S = shape(a), H = S.h, R = new Rng(seed * 7 + 3);
  const lum = (x, y) => luma(colorAt(a, x, y));
  const out = Array.from({ length: ticks }, () =>
    Array.from({ length: per }, () => {
      let cand = S.body.filter(([x, y]) => y > H * 0.36 && y < H * 0.92 && lum(x, y) > 0.28 && lum(x, y) < 0.64);
      if (!cand.length) cand = S.body.filter(([, y]) => y > H * 0.4);
      const [x, y] = cand[Math.floor(R.next() * cand.length)];
      return { x: a.x + x + 0.5, y: a.y + y + 0.5, r: R.range(3.1, 4.6) };
    }),
  );
  m.set(key, out);
  return out;
}

/** The warm pool a fire throws on the floor, with a slow flicker. */
export function warmFloor(p, F, k, w = 26, h = 4.5) {
  if (k <= 0.005) return;
  p.shade(-w, -3, w, 7, (x, y, out) => {
    const d = Math.hypot(x / w, (y - 0.5) / h);
    if (d >= 1) return;
    out.l = mix(F[3], F[4], 0.5);
    out.k = k * (1 - d) * (1 - d);
  });
}

/** Tint every pixel of the character's silhouette (a translucent wash, not a dither). */
export function tintBody(p, a, S, col, k) {
  if (k <= 0.01) return;
  for (const [mx, my] of S.body) p.blend(a.x + mx, a.y + my, col, k);
}

/**
 * The cloth's edge glowing where the fire sits: the character's outline pixels within r of a spot, drawn
 * dithered in `col` at k (so the flame looks attached to the body, not floating over it).
 */
export function hotRim(p, a, S, spots, r, col, k, seed = 0) {
  if (k <= 0.01) return;
  for (const [mx, my] of S.outline) {
    const x = a.x + mx + 0.5, y = a.y + my + 0.5;
    let best = r;
    for (const sp of spots) best = Math.min(best, Math.hypot(x - sp.x, y - sp.y));
    if (best >= r) continue;
    const f = 1 - best / r;
    if (rand(mx, my, seed) > 0.25 + 0.75 * f) continue;
    p.dot(x - 0.5, y - 0.5, col, k * (0.35 + 0.65 * f));
  }
}

/** A ring of hot sparks thrown off a spot at age s (0..life) of a tick. */
export function tickSparks(p, list, s, F, R, per = 4, life = 0.3) {
  if (s >= life) return;
  const u = s / life;
  for (const sp of list)
    for (let j = 0; j < per; j++) {
      const an = -Math.PI / 2 + R.range(-1, 1) * 1.3, v = 40 + 70 * R.next(), x = sp.x + Math.cos(an) * travel(v, 0, 3, s), y = sp.y - 2 + Math.sin(an) * travel(v, 0, 3, s) + 70 * s * s;
      p.px(x, y, u < 0.35 ? F[1] : F[3]);
      p.light(x, y, F[3], 0.45 * (1 - u));
    }
}

/** Noise-driven flicker weight: 0.75 to 1.25, about f wiggles a second, looping over D. */
export const flicker = (tnoise, t, D, f, seed) => 0.75 + 0.5 * Math.abs(tnoise(t, D, f, seed));

const EDGE = new WeakMap();

/**
 * Fire licking along the silhouette's two edges: for each row in `rows` (positions in the body's height, 0 top
 * to 1 feet) a spot on the left and on the right rim, so the flames hug the body instead of floating beside it.
 * `h` scales the tongues; jitter keeps the rows from lining up.
 */
export function edgeSpots(a, seed, { rows = [0.2, 0.4, 0.6, 0.8], h = 5, every = 1 } = {}) {
  let m = EDGE.get(a.mask);
  if (!m) EDGE.set(a.mask, (m = new Map()));
  const key = `${seed}:${rows.join(",")}:${h}:${every}`;
  if (m.has(key)) return m.get(key);
  const S = shape(a), H = S.h, R = new Rng(seed * 11 + 9), list = [];
  for (const [i, q] of rows.entries()) {
    const my = Math.max(0, Math.min(H - 1, Math.round(H * q + R.range(-1, 1))));
    const [l, r] = S.rows[my];
    if (l < 0) continue;
    for (const [side, mx] of [[-1, l], [1, r]]) {
      if (i % every !== 0 && side < 0) continue;
      const n = R.chance(0.5) ? 1 : 2;
      list.push({
        name: `edge${i}${side}`,
        x: a.x + mx + (side < 0 ? 0 : 1),
        y: a.y + my + 1,
        side,
        h: h * R.range(0.7, 1.25) * (1 - Math.abs(q - 0.45) * 0.5),
        tongues: Array.from({ length: n }, (_, j) => ({ dx: (j - (n - 1) / 2) * 1.4, h: R.range(0.7, 1.2), n: seed * 23 + i * 13 + j * 7 })),
      });
    }
  }
  const out = { list };
  m.set(key, out);
  return out;
}
