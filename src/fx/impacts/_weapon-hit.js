// Shared placement and seeded flying debris for weapon hits over a target's torso.
import { fit, rand } from "../../core/index.js";

export const ramp = (o) => fit(o.palette, 8);
export const point = (o, dx = 0, dy = 0) => [o.actor.chest[0] + dx, o.actor.chest[1] + dy];

export function metaFor(name, desc, palette, duration, seed) {
  return {
    name, desc,
    tags: ["impact", "hit", "weapon", "combat", "actor", "directional", "one-shot"],
    size: [100, 92], origin: [50, 76], duration, loop: false, fps: 30, bg: "ground", actor: 2,
    options: { palette, seed },
  };
}

/** Seeded flecks that start at contact and travel with gravity; angle 0 sprays right. */
export function flecks(p, x, y, t, C, seed, {
  n = 9, angle = 0, spread = 1.5, speed = 90, gravity = 130, life = 0.42,
  style = "streak", size = 1, glow = 0.18, delay = 0.055,
} = {}) {
  for (let i = 0; i < n; i++) {
    const born = i === 0 ? 0 : rand(i, seed, 1) * delay, age = t - born;
    const L = life * (0.65 + 0.6 * rand(i, seed, 2));
    if (age < 0 || age >= L) continue;
    const a = angle + (rand(i, seed, 3) - 0.5) * spread;
    const v = speed * (0.65 + 0.7 * rand(i, seed, 4));
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    const xx = x + vx * age, yy = y + vy * age + 0.5 * gravity * age * age;
    // Stay inside the compact frame; the last flecks leave before they touch its edge.
    if (xx < -42 || xx > 42 || yy < -69 || yy > 7) continue;
    const k = 1 - age / L, c = i % 4 === 0 ? C[7] : i % 2 ? C[5] : C[6];
    if (style === "chip") p.rect(xx, yy, size, size, i % 3 ? C[4] : C[6], k);
    else if (style === "dust") p.disc(xx, yy, size * (0.7 + age / L), C[3], 0.32 * k);
    else if (style === "drop") {
      p.dot(xx, yy, i % 3 ? C[4] : C[6], k);
      if (size > 1.3) p.dot(xx + 1, yy, C[3], k);
    } else p.line(xx - vx * 0.018 * k, yy - (vy + gravity * age) * 0.018 * k, xx, yy, c, k);
    if (glow > 0 && i % 3 === 0) p.glow(xx, yy, 3 + size, C[4], glow * k);
  }
}
