import { ramp, point, metaFor, flecks } from "./_weapon-hit.js";

export const meta = metaFor("Spear body hit", "A tight forward spray of icy metal sparks punches out from the chest, with only a few slower chips trailing behind.",
  ["#111f2a", "#243c54", "#39647f", "#5c93aa", "#8ac5d3", "#bce6e8", "#e3f9f5", "#ffffff"], 0.62, 5);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = ramp(o), [cx, cy] = point(o, 3, 0);
  flecks(p, cx, cy, t, C, o.seed, { n: 17, angle: -0.1, spread: 1.65, speed: 155, gravity: 95, life: 0.31, style: "chip", size: 1.2, glow: 0.1, delay: 0.05 });
  flecks(p, cx - 1, cy, t, C, o.seed + 17, { n: 6, angle: -0.4, spread: 1.7, speed: 75, gravity: 125, life: 0.38, style: "chip", glow: 0, delay: 0.06 });
}
