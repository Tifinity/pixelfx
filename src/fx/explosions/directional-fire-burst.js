import { Rng, clamp, fit, mix, smooth, WHITE } from "../../core/index.js";

export const meta = {
  name: "Directional fire burst",
  desc: "A muzzle spark grows into a rolling, one-way flame jet with a cream-hot heart, then bursts into embers and dark red smoke.",
  tags: ["explosion", "fire", "blast", "muzzle", "directional", "smoke", "one-shot"],
  size: [224, 128],
  origin: [18, 82],
  duration: 1.1,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#180d13", "#39151b", "#682127", "#a63b2a", "#e97134", "#ffb35f", "#ffe1a1", "#fff2ce"],
    seed: 6,
  },
};

// The blast travels right and climbs slightly. Its origin is the muzzle, not the fireball's center.
const axis = (x) => -0.17 * x;
const fade = (t, a, b) => 1 - smooth(a, b, t);

function flameShape(p, tip, t, width, color, alpha, length = 1) {
  const end = tip * length, top = [], bottom = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, x = end * u;
    const body = Math.pow(Math.sin(Math.PI * u), 0.68);
    const roll = Math.sin(u * 20 - t * 23) * 0.17 + Math.sin(u * 37 + t * 14) * 0.08;
    const w = (1.5 + width * body * (1 + roll)) * (0.4 + 0.6 * clamp(tip / 70));
    const y = axis(x) + Math.sin(u * 8 - t * 14) * body * 1.8;
    top.push([x, y - w * (1.04 + 0.14 * Math.sin(u * 18 + t * 20))]);
    bottom.push([x, y + w * (0.84 + 0.15 * Math.sin(u * 23 - t * 16))]);
  }
  p.poly([...top, ...bottom.reverse()], color, alpha);
}

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const grow = smooth(0.015, 0.36, t);
  const tip = 3 + 126 * grow;
  const fire = fade(t, 0.4, 0.72);
  const hot = fade(t, 0.31, 0.58);
  const smoke = smooth(0.2, 0.43, t) * fade(t, 0.58, 1.06);
  const hx = tip - 3 + Math.max(0, t - 0.36) * 12;
  const hy = axis(hx) - 1;

  // A warm stain behind the blast gives the dark smoke a red-lit underside.
  if (t < 0.72) {
    p.glow(tip * 0.5, axis(tip * 0.5), 16 + 24 * grow, C[3], 0.25 * fire);
    p.glow(tip - 8, axis(tip), 14 + 17 * grow, C[4], 0.38 * hot);
  }

  // The leading ball is asymmetrical: a dark crown with a red, burning underside.
  if (smoke > 0) {
    const swell = smooth(0.2, 0.47, t), drift = Math.max(0, t - 0.36);
    for (let i = 0; i < 10; i++) {
      const a = R.range(-2.8, 2.45), d = R.range(4, 29), r = R.range(6, 14);
      const x = hx + Math.cos(a) * d * (0.55 + swell * 0.45) + drift * R.range(-8, 14);
      const y = hy + Math.sin(a) * d * (0.42 + swell * 0.62) - drift * R.range(6, 19);
      const size = r * (0.55 + swell * 0.65 + drift * 0.22);
      const corners = Array.from({ length: 8 }, (_, j) => {
        const a = j * Math.PI / 4, rr = size * R.range(0.72, 1.18);
        return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
      });
      p.poly(corners, i % 5 === 0 ? C[2] : i % 3 === 0 ? C[1] : C[0], smoke);
      if (i % 5 === 0 && t < 0.45) p.poly([
        [x - size * 0.7, y + 2], [x, y - size * 0.1], [x + size * 0.5, y + size * 0.2],
        [x + size * 0.3, y + size * 0.5], [x - size * 0.5, y + size * 0.6],
      ], C[3], smoke * fade(t, 0.18, 0.48));
    }
    p.glow(hx - 9, hy + 8, 30 + 12 * swell, C[3], 0.28 * smoke * fade(t, 0.2, 0.65));
  }

  // Four rolling layers widen behind the traveling tip; the pale heart survives only near the release.
  if (fire > 0 && grow > 0.005) {
    flameShape(p, tip, t, 21, C[2], fire);
    flameShape(p, tip + 2, t + 0.04, 16, C[4], fire);
    flameShape(p, tip + 3, t + 0.08, 10, C[5], hot);
    flameShape(p, tip + 4, t + 0.11, 5.3, C[7], hot * fade(t, 0.23, 0.5));
    for (let i = 0; i < 4; i++) {
      const u = 0.38 + i * 0.15, x = tip * u, y = axis(x);
      const r = (3 + 4 * grow) * (1 - i * 0.12);
      p.circle(x, y - (i % 2 ? 6 : 3), r, i % 2 ? C[4] : C[5], fire * (1 - i * 0.12));
    }
    p.circle(tip - 7, axis(tip) + 1, 2 + 6 * grow, C[4], fire);
    p.circle(tip - 4, axis(tip) - 2, 1 + 4 * grow, C[6], hot);
  }

  // The first frame punches out of the muzzle; the jet separates into sparks as the fire folds away.
  if (t < 0.16) {
    const f = fade(t, 0.07, 0.16);
    p.circle(2 + tip * 0.16, -1, 1.2 + 2.4 * grow, WHITE, f);
    p.glow(3, 0, 8 + 11 * grow, C[6], 0.65 * f);
  }
  for (let i = 0; i < 22; i++) {
    const x0 = R.range(8, 116), y0 = axis(x0) + R.range(-13, 13);
    const vx = R.range(75, 210), vy = R.range(-90, 75), life = R.range(0.18, 0.58);
    const start = 0.025 + x0 / 126 * 0.33 + R.range(-0.015, 0.04), age = t - start;
    if (age < 0 || age >= life) continue;
    const x = x0 + vx * age, y = y0 + vy * age + 65 * age * age;
    if (y > 42) continue;
    const a = 1 - age / life;
    p.line(x - Math.min(7, vx * 0.025) * a, y - vy * 0.018 * a, x, y,
      i % 5 === 0 ? C[6] : i % 2 === 0 ? C[5] : C[4], a);
    if (i % 4 === 0) p.glow(x, y, 5, C[4], 0.25 * a);
  }

  // A few embers survive the flash, then the entire one-shot clears.
  const embers = smooth(0.15, 0.3, t) * fade(t, 0.68, 1.05);
  if (embers > 0) {
    for (let i = 0; i < 8; i++) {
      const x = hx - 18 + R.range(-22, 20) + (t - 0.2) * R.range(8, 40);
      const y = hy + R.range(-10, 16) - (t - 0.2) * R.range(12, 37);
      p.dot(x, y, mix(C[3], C[5], R.next()), embers);
    }
  }
}
