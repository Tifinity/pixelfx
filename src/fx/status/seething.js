// The shaded, outlined anger mark and the steam are
// adapted from Sprite Fusion's open-source heal (https://www.spritefusion.com/pixel-art-vfx/heal),
// MIT License, Copyright (c) 2026 Hugo Duprez.
// A rage that stays on the body: no floor under it, and no red eyes. Steam, the mark and the judder.
import { fit, hex, mix, luma, rand, clamp, TAU } from "../../core/index.js";
import { shape, colorAt, icon, bitmap } from "./_lib.js";

export const meta = {
  name: "Seething",
  desc: "Seething: the body judders on every heartbeat, steam jets off the head and shoulders, an anger mark throbs at the temple, stress lines flash out. No fire, no floor.",
  tags: ["status", "rage", "anger", "buff", "steam", "loop"],
  size: [80, 80],
  origin: [40, 70],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1a0208", "#4a0612", "#8a0c1c", "#c81828", "#ff3040", "#ff7a7a", "#ffc8c8", "#ffffff"],
    steam: "#f2e8ee",
    seed: 6,
  },
};

const SEETHE = { turn: 1, crouch: 4, fx: -13, fy: -19, bx: 13, by: -19, ffx: -8, fbx: 9 };
const THUD = { ...SEETHE, crouch: 6, fy: -23, by: -23 };
export const act = {
  onBody: true,
  poses: [[0, SEETHE], [0.05, THUD, "snap"], [0.17, SEETHE, "snap"], [0.29, { ...THUD, crouch: 5 }, "snap"], [0.4, SEETHE, "snap"], [1.2, SEETHE]],
};

const D = meta.duration, LUB = 0.05, DUB = 0.29, G = 760;
const pulse = (t, at, w = 0.06) => Math.exp(-((((((t - at) % D) + D + D / 2) % D - D / 2) / w) ** 2));
const beat = (t) => pulse(t, LUB) + 0.65 * pulse(t, DUB);
const since = (t, at) => (((t - at) % D) + D) % D;
const shaking = (t) => since(t, LUB - 0.02) < 0.13 || since(t, DUB - 0.02) < 0.09;
/** The stand-in is hidden while the body judders: the effect draws it, shaken. */
export const actorAlpha = (t) => (shaking(t) ? 0 : 1);

const MARK = [
  bitmap(["..#.#..", "..#.#..", "##...##", ".......", "##...##", "..#.#..", "..#.#.."]),
  bitmap(["...#.#...", "...#.#...", "..##.##..", "###...###", ".........", "###...###", "..##.##..", "...#.#...", "...#.#..."]),
];

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor;
  // heat ribbons coming off the body: no floor, they start at the shoulders
  for (let i = 0; i < 9; i++) {
    const born = (i / 9) * D, age = ((t - born) % D + D) % D, u = age / (D * 0.7);
    if (u > 1) continue;
    const x0 = a.x + rand(i, 3) * 20 - 6, y = a.y + 12 + rand(i, 7) * 20 - age * (14 + rand(i, 9) * 8), len = 5 + rand(i, 11) * 6, ph = rand(i, 13) * TAU;
    const k = Math.sin(Math.PI * u) * 0.5;
    for (let d = 0; d < len; d++) p.dot(x0 - len / 2 + d, y + Math.round(Math.sin(d * 0.9 + ph + age * 10) * 0.8), d % 3 ? C[2] : C[1], k * (1 - Math.abs(d / len - 0.5) * 1.4));
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), b = beat(t), steam = hex(o.steam);
  const shake = shaking(t), dx = shake ? (Math.floor(t * 60) % 2 ? 1 : -1) : 0, dy = shake && since(t, LUB - 0.02) < 0.06 ? -1 : 0;
  // the body: shaken while the beat lands, the face flushing red with it
  for (const [mx, my] of S.body) {
    const c = colorAt(a, mx, my), l = luma(c), skin = l > 0.55 && (c & 255) > ((c >>> 16) & 255) + 30;
    if (skin) p.px(a.x + mx + dx, a.y + my + dy, mix(c, C[4], 0.34 + 0.36 * b));
    else if (shake) p.px(a.x + mx + dx, a.y + my + dy, c);
  }
  // the anger mark throbbing at the temple: big on the lub, smaller on the dub
  const big = pulse(t, LUB + 0.02, 0.05) > 0.35 || pulse(t, DUB + 0.02, 0.04) > 0.6;
  const mx = a.x + a.w * 0.86 + dx, my = a.y + 3 + dy;
  icon(p, mx, my, 5, MARK[big ? 1 : 0], [C[0], C[3], C[4], C[5]]);
  p.px(mx - (big ? 3 : 2), my - (big ? 3 : 2), C[6]);
  p.glow(mx, my, 8, C[4], 0.25 + 0.4 * b);
  // steam jetting off the head in short bursts after each beat
  for (const [at, n, power] of [[LUB + 0.04, 14, 1], [DUB + 0.04, 8, 0.75]])
    for (const side of [-1, 1])
      for (let i = 0; i < n; i++) {
        const age = since(t, at + i * 0.016), life = 0.22 + 0.12 * rand(i, side, 3);
        if (age >= life) continue;
        const u = age / life, ang = -Math.PI / 2 + side * (0.5 + 0.2 * rand(i, side, 5)), sp = (90 + 40 * rand(i, side, 7)) * power;
        const x = side * a.w * 0.36 + Math.cos(ang) * (sp / 7) * (1 - Math.exp(-7 * age)), y = a.y + 3 + Math.sin(ang) * (sp / 7) * (1 - Math.exp(-7 * age)) - 8 * age;
        const rad = (0.55 + 1.7 * Math.sqrt(u)) * (0.8 + 0.4 * rand(i, side, 9)), k = Math.min(1, u * 12) * Math.pow(1 - u, 2);
        p.disc(x, y, rad, steam, 0.42 * k);
        p.disc(x - rad * 0.2, y - rad * 0.25, rad * 0.6, 0xffffffff, 0.34 * k);
        if (u < 0.3) p.dot(x, y, 0xffffffff, 1 - u / 0.3);
      }
  // jagged stress lines flashing out round the head on the beat
  for (const [at, n, len] of [[LUB, 8, 7], [DUB, 6, 5]]) {
    const age = since(t, at);
    if (age > 0.2) continue;
    const k = age / 0.2;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + ((i + 0.5) / n - 0.5) * 4.4, r0 = 15 + 6 * k, ca = Math.cos(ang), sa = Math.sin(ang), cx = 0, cy = a.y + 12;
      const pts = [];
      for (let j = 0; j <= 3; j++) {
        const r = r0 + (j / 3) * len, off = j % 2 ? 1.3 : -0.4;
        pts.push([cx + ca * r - sa * off, cy + sa * r + ca * off]);
      }
      p.polyline(pts, (u) => (u > 0.66 ? C[7] : u > 0.33 ? C[5] : C[4]), 1.2 - k);
      p.glowLine(pts[0][0], pts[0][1], pts[3][0], pts[3][1], 3, C[4], 0.3 * (1 - k));
    }
  }
  // the heartbeat's own light, on the chest and round the head (not on the floor)
  p.glow(0, a.y + 22, 20, C[4], 0.14 + 0.34 * b);
  p.glow(0, a.y + 10, 16, C[3], 0.1 + 0.22 * b);
}
