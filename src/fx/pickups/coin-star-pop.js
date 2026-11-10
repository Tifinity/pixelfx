import { TAU, ease, rand, WHITE } from "../../core/index.js";
import { glint } from "./_lib.js";
import { colors, coin, metaFor } from "./_coin-sparkle.js";

export const meta = metaFor("Coin star pop", "A coin snaps into a white star, two gold rings and eight small glints thrown radially outward.", 0.82);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = colors(o), u = t - 0.16, y = -17;
  coin(p, C, t, 0.17);
  if (u < 0) return;
  if (u < 0.15) {
    const k = 1 - u / 0.15;
    glint(p, 0, y, 3 + 7 * k, C[6], 0.7 * k);
    p.glow(0, y, 23, C[5], 0.7 * k);
  }
  for (const [delay, max, shade] of [[0, 21, 6], [0.05, 14, 4]]) {
    const a = (u - delay) / 0.37;
    if (a >= 0 && a < 1) {
      p.ring(0, y, 3 + max * ease.outCubic(a), 1, C[shade], 1 - a);
      p.glowRing(0, y, 3 + max * ease.outCubic(a), 4, C[4], 0.22 * (1 - a));
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + rand(i, o.seed) * 0.18, life = 0.43 + rand(i, o.seed, 2) * 0.18;
    const age = u - rand(i, o.seed, 3) * 0.15;
    if (age < 0 || age >= life) continue;
    const k = 1 - age / life, d = 5 + (15 + rand(i, o.seed, 4) * 9) * ease.outCubic(age / life);
    glint(p, Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - age * 3,
      1 + 2 * Math.sin(Math.PI * age / life), i % 4 ? C[6] : WHITE, 0.35 * k);
  }
}
