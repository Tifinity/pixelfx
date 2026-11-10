import { ramp, point, metaFor, flecks } from "./_weapon-hit.js";

export const meta = metaFor("Hammer body hit", "A broad, weighty spray of pale dust and blunt chips pushes out from the sternum, then drops quickly.",
  ["#211a19", "#4a3d3a", "#77605a", "#a88874", "#c9aa88", "#e6d0a4", "#fff0cb", "#ffffff"], 0.88, 13);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = ramp(o), [cx, cy] = point(o, 2, 2);
  flecks(p, cx, cy, t, C, o.seed, { n: 17, angle: -0.45, spread: 3.5, speed: 90, gravity: 220, life: 0.54, style: "chip", size: 2, glow: 0.04 });
  flecks(p, cx, cy + 1, t, C, o.seed + 53, { n: 12, angle: -0.3, spread: 3.4, speed: 60, gravity: 120, life: 0.43, style: "dust", size: 2.2, glow: 0, delay: 0.075 });
}
