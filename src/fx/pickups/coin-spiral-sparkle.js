import { smooth, rand, WHITE } from "../../core/index.js";
import { glint } from "./_lib.js";
import { colors, coin, metaFor } from "./_coin-sparkle.js";

export const meta = metaFor("Coin spiral sparkle", "Two gold spirals curl into a coin, meet in a white glint, then unwind as rising motes.", 1.05);

export function draw(p, t, o) {
  if (t >= meta.duration) return;
  const C = colors(o), y = -17;
  coin(p, C, t, 0.3);
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 16; i++) {
      const lag = i / 16 * 0.16, age = t - lag;
      if (age < 0 || age > 0.62) continue;
      const inward = smooth(0, 0.3, age), outward = smooth(0.31, 0.62, age);
      const r = 24 * (1 - inward) + 16 * outward;
      const a = arm * Math.PI + age * 9 + i * 0.22;
      const x = Math.cos(a) * r, yy = y + Math.sin(a) * r * 0.65 - outward * 9;
      const k = (1 - smooth(0.4, 0.62, age)) * (0.45 + 0.55 * Math.sin(Math.PI * i / 16));
      p.dot(x, yy, i % 3 ? C[6] : C[7], k);
      if (i % 5 === 0) p.glow(x, yy, 4, C[4], 0.16 * k);
    }
    const tip = Math.min(0.3, t);
    if (tip > 0.02 && tip < 0.28) {
      const r = 24 * (1 - smooth(0, 0.3, tip)), a = arm * Math.PI + tip * 9;
      glint(p, Math.cos(a) * r, y + Math.sin(a) * r * 0.65, 1.4, C[7], 0.3);
    }
  }
  const u = t - 0.29;
  if (u >= 0 && u < 0.23) {
    const k = 1 - u / 0.23;
    glint(p, 0, y, 8 * Math.sin(Math.PI * k), WHITE, 0.65 * k);
    p.glow(0, y, 20, C[5], 0.52 * k);
  }
  for (let i = 0; i < 6; i++) {
    const age = t - 0.36 - i * 0.045;
    if (age < 0 || age > 0.42) continue;
    const x = (rand(i, o.seed) - 0.5) * 18 + Math.sin(age * 9 + i) * 3;
    const yy = y - age * (27 + i * 4);
    glint(p, x, yy, 1 + 2 * Math.sin(Math.PI * age / 0.42), C[6], 0.27 * (1 - age / 0.42));
  }
}
