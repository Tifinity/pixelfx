import { ramp, point, metaFor, flecks } from "./_weapon-hit.js";

export const meta = metaFor("Dagger body hit", "A compact spray of tiny red flecks and bright droplets slips from the ribs, fast and close to the target.",
  ["#240810", "#570d1d", "#91152b", "#c52637", "#eb4150", "#ff7f79", "#ffbdb0", "#ffffff"], 0.57, 11);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = ramp(o), [cx, cy] = point(o, 3, 1);
  flecks(p, cx, cy, t, C, o.seed, { n: 8, angle: -0.28, spread: 1.6, speed: 82, gravity: 145, life: 0.29, style: "drop", size: 1.5, glow: 0.05 });
  flecks(p, cx, cy + 1, t, C, o.seed + 29, { n: 4, angle: 1.4, spread: 0.9, speed: 28, gravity: 190, life: 0.4, style: "drop", glow: 0, delay: 0.08 });
}
