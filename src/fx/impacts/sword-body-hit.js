import { ramp, point, metaFor, flecks } from "./_weapon-hit.js";

export const meta = metaFor("Sword body hit", "Thin silver shavings fan diagonally away from the target's torso, with a few white glints following the blade's direction.",
  ["#171f37", "#30456b", "#4978a0", "#79aecd", "#a9d4e5", "#d6ecf2", "#f1f9f8", "#ffffff"], 0.62, 4);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = ramp(o), [cx, cy] = point(o);
  flecks(p, cx, cy, t, C, o.seed, { n: 16, angle: -0.62, spread: 2.1, speed: 138, gravity: 145, life: 0.42 });
  flecks(p, cx - 2, cy + 1, t, C, o.seed + 41, { n: 7, angle: 2.18, spread: 1.3, speed: 66, gravity: 165, life: 0.33, style: "chip", glow: 0.06, delay: 0.035 });
}
