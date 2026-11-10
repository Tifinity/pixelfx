import { ramp, point, metaFor, flecks } from "./_weapon-hit.js";

export const meta = metaFor("Axe body hit", "Heavy orange chips and hot flecks burst away from a close axe hit, rising briefly before dropping under their weight.",
  ["#260d0e", "#5b1716", "#92291d", "#ce4825", "#f1792c", "#ffb75b", "#ffe4a0", "#ffffff"], 0.78, 8);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = ramp(o), [cx, cy] = point(o, 1, -1);
  flecks(p, cx, cy, t, C, o.seed, { n: 15, angle: -0.2, spread: 2.5, speed: 112, gravity: 190, life: 0.52, style: "chip", size: 2, glow: 0.1 });
  flecks(p, cx, cy, t, C, o.seed + 37, { n: 12, angle: -0.72, spread: 2.3, speed: 150, gravity: 175, life: 0.4 });
}
