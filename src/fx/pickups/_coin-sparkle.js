// Shared coin and palette for the five pickup sparkle studies.
import { fit, smooth } from "../../core/index.js";

export const colors = (o) => fit(o.palette, 8);
export const metaFor = (name, desc, duration = 0.9) => ({
  name, desc, tags: ["pickup", "coin", "gold", "sparkle", "reward", "one-shot"],
  size: [80, 76], origin: [40, 56], duration, loop: false, fps: 30, bg: "dark",
  options: { palette: ["#241204", "#5b3008", "#9b5b0d", "#ce8e17", "#f0b82d", "#ffda61", "#fff0af", "#ffffff"], seed: 4 },
});

export function coin(p, C, t, end = 0.18) {
  const k = 1 - smooth(end - 0.09, end, t), r = 6 * k, y = -17;
  if (r < 0.55) return;
  p.circle(0, y, r + 1, C[1]);
  p.circle(0, y, r, C[4]);
  p.ring(0, y, r - 0.8, 1.2, C[6]);
  if (r > 2.4) {
    p.line(0, y - r * 0.45, 0, y + r * 0.45, C[2]);
    p.px(-2, y - 2, C[7]);
  }
  p.glow(0, y, 12, C[4], 0.23 * k);
}
