// The plus sign's lit and shaded bevel is
// adapted from Sprite Fusion's open-source heal (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, Lights, P, Rng, fit, sparkle, flare, band, clamp, smooth, seg, ease, rand, TAU, WHITE } from "../../core/index.js";
import { GOLD, oval, FAR, NEAR } from "./_lib.js";

export const meta = {
  name: "Aegis ring",
  desc: "Gold light sinks into the floor and a ring rolls out; the ground turns to a standing circle of light, shafts and gold crests stand up round it, then it breaks into glitter.",
  tags: ["holy", "shield", "aegis", "ward", "aoe", "ring", "ground", "one-shot"],
  size: [256, 136],
  origin: [128, 104],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: GOLD, reach: 104, seed: 9 },
};

const SY = 0.2, SEED = 0.32, ROLL = 0.95, RISE = 0.55, HOLD = 2.0, BREAK = 2.4, D = meta.duration;

// a shield crest: the shape every ward in this style wears
const CREST = [".###.", "#####", "#####", "#####", ".###.", "..#.."];
const BOSS = new Set(["2,2", "2,3", "3,2", "3,3"]);

export function create(o) {
  const C = fit(o.palette, 8), REACH = o.reach, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const lights = new Lights();
  const front = (tt) => (tt < SEED ? 0 : REACH * ease.outCubic(seg(tt, SEED, SEED + ROLL)));
  const passed = (d) => SEED + ROLL * (1 - Math.cbrt(1 - Math.min(0.999, d / REACH)));
  /** How much of the ward stands: up fast, holds, gone by the break. */
  const ward = (tt) => ease.outCubic(seg(tt, SEED + 0.1, RISE)) * (tt < HOLD ? 1 : 1 - ease.inCubic(seg(tt, HOLD, BREAK)));
  const fade = (tt) => (tt < SEED + 0.1 ? 0 : tt < HOLD ? 1 : 1 - seg(tt, HOLD, BREAK));

  // gold crests rise where the ward catches a unit
  const sites = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * TAU + R.range(-0.3, 0.3), d = REACH * R.range(0.38, 0.8);
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, t0: SEED + 0.5 + R.range(0, 0.5), life: R.range(1.1, 1.45), rise: R.range(9, 15), sway: R.range(0, TAU), s: 2, back: Math.sin(a) < -0.1, popped: false };
  });
  const riders = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * TAU + R.range(-0.2, 0.2), w: R.range(0.5, 1) * (i % 2 ? 1 : -1) }));
  // two rings of standing light: a tall outer palisade and shorter posts inside it
  const shafts = [
    ...Array.from({ length: 11 }, (_, i) => ({ a: (i / 11) * TAU + R.range(-0.08, 0.08), r: 0.94, h: R.range(0.7, 1.15), ph: R.range(0, TAU), t0: SEED + 0.1 + R.range(0, 0.18) })),
    ...Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * TAU + R.range(-0.15, 0.15), r: 0.56, h: R.range(0.3, 0.55), ph: R.range(0, TAU), t0: SEED + 0.24 + R.range(0, 0.2) })),
  ];
  let t = 0, released = false, broke = false;

  function wash(p) {
    // the gilded floor: lit where the ring has passed, and it stays lit while the ward holds
    const fr = front(t);
    if (fr < 2 || t > BREAK + 0.1) return;
    p.shade(-fr - 1, -fr * SY - 2, fr + 1, fr * SY + 2, (x, y, out) => {
      const d = Math.hypot(x, y / SY);
      if (d > fr) return;
      const age = t - passed(d), hold = 1 - smooth(HOLD, BREAK + 0.1, t);
      const k = (0.35 + 0.65 * Math.exp(-age / 0.55)) * smooth(fr, fr - 5, d) * hold;
      if (k < 0.05) return;
      out.l = C[4];
      out.k = 0.34 * k;
    });
  }

  function floorLight2(p) {
    // the blessed floor: a soft gold wash and rays turning slowly from the middle
    const k0 = fade(t);
    const fr = front(t);
    if (k0 <= 0.02 || fr < 4) return;
    const r = Math.min(fr, REACH * 0.94);
    for (let y = -Math.ceil(r * SY); y <= Math.ceil(r * SY); y++)
      for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
        const q = Math.hypot(x / r, y / (r * SY));
        if (q >= 1) continue;
        const k = smooth(fr, fr - 6, Math.hypot(x, y / SY)) * k0;
        if (k <= 0.02) continue;
        p.blend(x, y, C[5], 0.09 * k * (1 - q * 0.8));
      }
  }

  function circle(p, near) {
    // the ward's boundary: one bright ring of gold on the floor, with ticks pointing in
    const spin = t * 0.1, keep = near ? NEAR : FAR, k = fade(t) * smooth(front(t) / REACH, 0.84, 0.94);
    if (k <= 0.02) return;
    const r = REACH * 0.94;
    band(p, 0, 0, r, SY, 3, k, [C[2], C[3], C[4], C[5], C[6], WHITE], keep, false);
    oval(p, 0, 0, r, r * SY, (g) => (Math.sin(g) > 0.4 ? WHITE : C[6]), 0.9 * k, keep);
    for (let i = 0; i < 12; i++) {
      const g = (i / 12) * TAU + spin;
      if ((Math.sin(g) >= 0) !== near) continue;
      const ca = Math.cos(g), sa = Math.sin(g);
      p.line(ca * r, sa * r * SY, ca * (r - 6), sa * (r - 6) * SY, i % 3 ? C[5] : WHITE, k * 0.85);
    }
  }

  function ring(p, back) {
    if (t < SEED) return;
    const u = seg(t, SEED, SEED + ROLL + 0.25), fr = front(t), k = u < 0.7 ? 1 : (1 - u) / 0.3;
    if (k <= 0) return;
    const keep = back ? FAR : NEAR;
    band(p, 0, 0, fr, SY, Math.max(2, 7 * (1 - u * 0.7)), k, C.slice(2), keep, t < SEED + 0.08);
    oval(p, 0, 0, fr + 1, (fr + 1) * SY, (g) => (Math.sin(g) > 0.3 ? WHITE : C[6]), k * (back ? 0.7 : 1), keep);
    for (let j = 0, n = Math.ceil(fr * 0.9); j < n; j++) {
      const g = (j / n) * TAU, near = Math.sin(g) >= 0;
      if (near === back || rand(j, Math.floor(t * 20)) > 0.45) continue;
      const x = Math.cos(g) * fr, y = Math.sin(g) * fr * SY, h = (1 + rand(j, 7) * 4) * k * (near ? 1 : 0.6);
      for (let i = 1; i <= h; i++) p.dot(x, y - i, i > h - 1 ? WHITE : C[6], k * (1.2 - i / (h + 1)));
    }
    for (const r of riders) {
      const g = r.a + r.w * (t - SEED) * 2.2, near = Math.sin(g) >= 0;
      if (near === back) continue;
      const x = Math.cos(g) * fr, y = Math.sin(g) * fr * SY;
      if (near) sparkle(p, x, y - 1, 2 + (Math.sin(t * 9 + r.a * 5) > 0.3 ? 1 : 0), WHITE, C[6], 0.35 * k);
      else p.dot(x, y, C[6], k);
    }
    if (!back) for (let i = 0; i < 8; i++) {
      const g = (i / 8) * TAU;
      p.glow(Math.cos(g) * fr, Math.sin(g) * fr * SY - 2, 16, C[4], 0.22 * k);
    }
  }

  function pillars(p, back) {
    const w = ward(t), k0 = fade(t);
    if (w <= 0.02 || k0 <= 0.02) return;
    for (const s of shafts) {
      const near = Math.sin(s.a) >= 0;
      if (near === back) continue;
      const grow = ease.outCubic(seg(t, s.t0, s.t0 + 0.4));
      if (grow <= 0.01) continue;
      const r = REACH * s.r, x = Math.cos(s.a) * r, y = Math.sin(s.a) * r * SY;
      const h = (16 + 40 * s.h) * grow * w * (0.9 + 0.12 * Math.sin(t * 5 + s.ph));
      const k = k0 * (near ? 1 : 0.6) * (0.6 + 0.4 * Math.sin(t * 4 + s.ph));
      // the shaft: a solid bar of light, white-hot in its core, warm at its edges, flaring at the foot
      const dir = Math.sin(s.a + 1) < 0 ? -1 : 1;
      for (let i = 0; i <= h; i++) {
        const u = i / h, fadeTop = 1 - Math.pow(u, 2.2);
        p.px(x, y - i, i < 3 ? C[6] : C[5]);
        p.dot(x + dir, y - i, C[4], k * 0.55 * fadeTop);
        if (u < 0.25) p.dot(x - dir, y - i, C[4], k * 0.4 * fadeTop);
      }
      // a foot of light where it leaves the floor, and a bright tip
      p.dot(x, y - h, WHITE, k);
      p.line(x - 1, y - 1.5, x + 1, y - 1.5, WHITE, 0.8 * k);
      sparkle(p, x, y - h, 1.2 + 0.4 * Math.sin(t * 9 + s.ph), WHITE, C[6], 0.35 * k);
      p.glow(x, y, 11, C[4], 0.45 * k);
      if (near) p.glow(x, y - h * 0.45, 6, C[5], 0.2 * k);
    }
  }

  function crests(p, back) {
    for (const s of sites) {
      const a = t - s.t0;
      if (a < 0 || a > s.life || s.back !== back) continue;
      const u = a / s.life, h = s.rise * ease.outCubic(Math.min(1, u * 1.8)) + Math.sin(a * 3 + s.sway) * 1.2, x = Math.round(s.x + Math.sin(a * 2.2 + s.sway) * 1.5), y = Math.round(s.z * SY - 5 - h - 6 * u * u);
      const pop = ease.outBack(clamp(a / 0.14), 2.2), k = a < s.life - 0.2 ? 1 : 1 - (a - (s.life - 0.2)) / 0.2;
      const sc = Math.max(1, s.s - (back ? 1 : 0)), n = C.length;
      const solid = (px, py, c, a) => p.dot(px, py, c, a);
      for (let j = -1; j <= CREST.length; j++)
        for (let i = -1; i <= 5; i++) {
          const inAt = (jj, ii) => jj >= 0 && jj < CREST.length && ii >= 0 && ii < CREST[jj].length && CREST[jj][ii] === "#";
          const c0 = inAt(j, i);
          if (!c0) {
            // a dark rim just outside the shape, so a gold crest reads on gold light
            if (!inAt(j - 1, i) && !inAt(j + 1, i) && !inAt(j, i - 1) && !inAt(j, i + 1)) continue;
            for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) solid(x + (i - 2) * sc + sx, y + (j - 2) * sc + sy, C[0], 0.85 * k);
            continue;
          }
          const top = !inAt(j - 1, i), left = !inAt(j, i - 1);
          const c = BOSS.has(`${j},${i}`) ? WHITE : top || left ? C[n - 3] : j < 3 ? C[n - 4] : C[3];
          for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) solid(x + (i - 2) * sc + sx, y + (j - 2) * sc + sy, c, k);
        }
      if (a < 0.06) sparkle(p, x, y, 3, WHITE, C[6], 0.55);
      // a thread of light tying the crest to the floor while it rises
      if (u < 0.5) for (let j = 2; j < h * (1 - u * 2); j += 1.5) p.dot(s.x, s.z * SY - 2 - h + j + 5, C[5], (1 - j / h) * (1 - u * 2) * 0.75);
      p.glow(x, y, 5 + sc * 2, C[4], (back ? 0.12 : 0.18) * k);
    }
  }

  return {
    update(dt) {
      t += dt;
      if (t < SEED - 0.04 && R.chance(0.7)) {
        const a = R.range(0, TAU), D0 = R.range(24, 48), x = Math.cos(a) * D0, y = Math.sin(a) * D0 * SY - R.range(1, 8);
        const T = R.range(0.16, 0.24), l = Math.hypot(x, y + 3) || 1, v = (l * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, x, y, (-x / l) * v, ((-3 - y) / l) * v, T, R.chance(0.5) ? C[6] : C[5]);
      }
      if (!released && t >= SEED) {
        released = true;
        lights.add(0, -16, 82, C[5], 0.9, 0.55);
        lights.add(0, -6, 30, WHITE, 0.85, 0.12);
        for (let i = 0; i < 12; i++) ps.spawn(P.MOTE, R.range(-2, 2), -R.range(2, 10), R.range(-30, 30), -R.range(80, 170), R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1));
        for (let i = 0; i < 18; i++) {
          const a = R.range(Math.PI * 1.02, Math.PI * 1.98), sp = R.range(50, 130);
          ps.spawn(P.STAR, 0, -3, Math.cos(a) * sp, -Math.abs(Math.sin(a)) * sp, R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 2));
        }
      }
      // light spits off the feet of the shafts as they stand up
      if (t > SEED + 0.1 && t < RISE + 0.15 && R.chance(0.5)) {
        const s = shafts[Math.floor(R.next() * 10)], g = t - s.t0;
        if (g > 0) {
          const x = Math.cos(s.a) * REACH * s.r, y = Math.sin(s.a) * REACH * s.r * SY;
          ps.spawn(P.SPARK, x, Math.min(0, y), R.range(-12, 12), -R.range(30, 70), R.range(0.25, 0.5), C[5], R.range(0.6, 1), 0, Math.sin(s.a) < 0 ? 4 : 0);
        }
      }
      if (t > HOLD && t < BREAK && R.chance(0.4)) {
        const g = R.range(0, TAU), x = Math.cos(g) * REACH * 0.9, y = Math.sin(g) * REACH * 0.9 * SY - R.range(0, 16);
        ps.spawn(P.MOTE, x, y, R.range(-14, 14), -R.range(10, 40), R.range(0.4, 0.7), C[6], 1);
      }
      if (t > SEED && t < BREAK && R.chance(0.3)) {
        const a = R.range(0, TAU), d = REACH * 0.9 * Math.sqrt(R.next());
        ps.spawn(P.EMBER, Math.cos(a) * d, Math.min(0, Math.sin(a) * d * SY - 1), R.range(-4, 4), -R.range(12, 34), R.range(0.5, 0.9), C[5], 1, 0, Math.sin(a) < 0 ? 4 : 0);
      }
      for (const s of sites)
        if (!s.popped && t >= s.t0) {
          s.popped = true;
          for (let i = 0; i < 3; i++) ps.spawn(P.STAR, s.x + R.range(-3, 3), s.z * SY - 1, R.range(-10, 10), -R.range(15, 40), R.range(0.3, 0.55), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2), 0, s.back ? 4 : 0);
        }
      if (!broke && t >= BREAK) {
        broke = true;
        lights.add(0, -20, 76, C[5], 0.7, 0.4);
        for (let i = 0; i < 30; i++) {
          const g = R.range(0, TAU), d = REACH * R.range(0.3, 0.95), sp = R.range(10, 45);
          ps.spawn(P.STAR, Math.cos(g) * d, Math.sin(g) * d * SY - R.range(2, 34), Math.cos(g) * sp, -Math.abs(Math.sin(g) * sp) - 12, R.range(0.35, 0.65), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.6));
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      if (t >= D) return;
      wash(p);
      floorLight2(p);
      circle(p, false);
      ring(p, true);
      pillars(p, true);
      crests(p, true);
      ps.draw(p, "back");
    },
    draw(p) {
      if (t >= D) return;
      circle(p, true);
      ring(p, false);
      pillars(p, false);
      crests(p, false);
      // the seed: a point of gold on the floor, then a flare as it lets go
      if (t < SEED) {
        const k = t / SEED;
        sparkle(p, 0, -3, 2 + 4 * k * k, WHITE, C[6], 0.3 + 0.4 * k);
        p.glow(0, -3, 10 + 18 * k, C[4], 0.5 * k);
      } else if (t < SEED + 0.22) flare(p, 0, -3, 26 * Math.pow(1 - (t - SEED) / 0.22, 1.5), 1 - (t - SEED) / 0.22, C.slice(3));
      // a jet of light out of the floor as the ward snaps up
      const g = seg(t, SEED, SEED + 0.6);
      if (g > 0 && g < 1) {
        const top = -4 - 52 * ease.outCubic(Math.min(1, g * 2.2)) - 12 * g, bot = Math.max(-26, -2 - 58 * ease.inQuad(seg(g, 0.35, 1))), w = 1 + 2.6 * (1 - g);
        if (bot - top > 2) {
          p.beam(0, bot, 0, top, w * 2, (u, v) => (v < 0.45 ? WHITE : u > 0.8 ? C[5] : C[6]));
          p.glowLine(0, bot, 0, top, 13, C[5], 0.55 * (1 - g));
          sparkle(p, 0, top, 4 * (1 - g) + 1, WHITE, C[6], 0.5 * (1 - g));
        }
      }
      // the heart of the ward: a sun that brightens while it holds
      const hk = ward(t) * fade(t);
      if (hk > 0.02) {
        sparkle(p, 0, -5, 3 + 2 * Math.sin(t * 6), WHITE, C[6], 0.5 * hk);
        p.glow(0, -5, 22, C[4], 0.22 * hk);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
