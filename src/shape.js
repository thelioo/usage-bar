// Island geometry. The island is drawn from pieces: a rounded body ("arm") plus concave
// fillets ("ears") where it meets a screen edge. Each anchor adapts the shape:
//   top    – a notch hanging from the top edge
//   bottom – the same notch, sitting on the bottom of the work area
//   sides  – a vertical bar against the left/right edge
// Expanding grows the shape into the card. Layouts are written once for the top and right
// anchors; bottom and left are mirror images.

const T = 32; // bar thickness when collapsed
const CARD_W = 380;
const LOOK = {
  compact: { radius: 12, ear: 8 },
  expanded: { radius: 30, ear: 14 },
};

const KIND = {
  top: ["top", false, false],
  left: ["side", true, false],
  right: ["side", false, false],
  bottom: ["top", false, true],
};

/**
 * Canonical layout in window px for the top and right anchors.
 * `gw` is the horizontal content width, `gl` the vertical content length, `dh` the card height.
 */
function canonical(kind, { expanded, gw, gl, dh }, W, H) {
  const look = expanded ? LOOK.expanded : LOOK.compact;
  const e = look.ear;
  if (kind === "top") {
    const w = expanded ? CARD_W : Math.max(160, gw);
    const h = expanded ? dh : T;
    const r = look.radius;
    const x = (W - w) / 2;
    return {
      arms: [{ x, y: 0, w, h, radii: [0, 0, r, r] }],
      ears: [{ x: x - e, y: 0, s: e, c: "bl" }, { x: x + w, y: 0, s: e, c: "br" }],
      h: { x, y: 0, w, h: T },
      v: null,
      origin: [W / 2, 0],
      card: ["center", "top"],
    };
  }
  // Side: a vertical bar against the right edge.
  const w = expanded ? CARD_W : T;
  const h = expanded ? dh : Math.max(120, gl);
  const r = look.radius;
  const y = (H - h) / 2;
  return {
    arms: [{ x: W - w, y, w, h, radii: [r, 0, 0, r] }],
    ears: [{ x: W - e, y: y - e, s: e, c: "tl" }, { x: W - e, y: y + h, s: e, c: "bl" }],
    h: null,
    v: { x: W - T, y, w: T, h },
    origin: [W, H / 2],
    card: ["right", "center"],
  };
}

const flipCorner = (c, mx, my) =>
  (my ? (c[0] === "t" ? "b" : "t") : c[0]) + (mx ? (c[1] === "l" ? "r" : "l") : c[1]);

function mirror(layout, mx, my, W, H) {
  const rect = (r) => r && {
    ...r,
    x: mx ? W - r.x - r.w : r.x,
    y: my ? H - r.y - r.h : r.y,
  };
  const radii = ([tl, tr, br, bl]) => {
    let out = [tl, tr, br, bl];
    if (mx) out = [out[1], out[0], out[3], out[2]];
    if (my) out = [out[3], out[2], out[1], out[0]];
    return out;
  };
  const side = { left: "right", right: "left", top: "bottom", bottom: "top", center: "center" };
  return {
    arms: layout.arms.map((a) => ({ ...rect(a), radii: radii(a.radii) })),
    ears: layout.ears.map((e) => ({
      ...e,
      x: mx ? W - e.x - e.s : e.x,
      y: my ? H - e.y - e.s : e.y,
      c: flipCorner(e.c, mx, my),
    })),
    h: rect(layout.h),
    v: rect(layout.v),
    origin: [mx ? W - layout.origin[0] : layout.origin[0], my ? H - layout.origin[1] : layout.origin[1]],
    card: [mx ? side[layout.card[0]] : layout.card[0], my ? side[layout.card[1]] : layout.card[1]],
  };
}

export function layoutFor(anchor, state, W, H) {
  const [kind, mx, my] = KIND[anchor] ?? KIND.top;
  return mirror(canonical(kind, state, W, H), mx, my, W, H);
}

export const kindOf = (anchor) => (KIND[anchor] ?? KIND.top)[0];

const GRADIENT_AT = { tl: "0 0", tr: "100% 0", bl: "0 100%", br: "100% 100%" };

const lerp = (a, b, p) => a + (b - a) * p;

/**
 * The shape part-way between two layouts of the same anchor. `p` may overshoot [0, 1]
 * (spring), so sizes are clamped to stay valid.
 */
export function mix(from, to, p) {
  const pos = (v) => Math.max(0, v);
  return {
    ...to,
    arms: to.arms.map((b, i) => {
      const a = from.arms[i];
      return {
        x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p),
        w: pos(lerp(a.w, b.w, p)), h: pos(lerp(a.h, b.h, p)),
        radii: b.radii.map((r, k) => pos(lerp(a.radii[k], r, p))),
      };
    }),
    ears: to.ears.map((b, i) => {
      const a = from.ears[i];
      return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), s: pos(lerp(a.s, b.s, p)), c: b.c };
    }),
  };
}

/** Applies a layout to the piece elements (called every frame while the spring moves). */
export function applyLayout(layout, { arms, ears, island }) {
  arms.forEach((el, i) => {
    const a = layout.arms[i];
    el.style.display = a ? "" : "none";
    if (!a) return;
    Object.assign(el.style, {
      left: `${a.x}px`, top: `${a.y}px`, width: `${a.w}px`, height: `${a.h}px`,
      borderRadius: a.radii.map((r) => `${r}px`).join(" "),
    });
  });
  ears.forEach((el, i) => {
    const e = layout.ears[i];
    el.style.display = e ? "" : "none";
    if (!e) return;
    Object.assign(el.style, { left: `${e.x}px`, top: `${e.y}px` });
    el.style.setProperty("--s", `${e.s}px`);
    if (el.dataset.c !== e.c) {
      el.dataset.c = e.c;
      el.style.background =
        `radial-gradient(circle at ${GRADIENT_AT[e.c]}, transparent calc(var(--s) - 0.5px), var(--island) var(--s))`;
    }
  });
  // The content box is the union's bounding box.
  const box = bounds(layout);
  Object.assign(island.style, {
    left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`,
  });
  return box;
}

/**
 * The hit-test shape for a layout, computed from the target geometry (no DOM reads, so it
 * never forces a layout mid-animation).
 */
export function hitShape(layout) {
  return {
    rects: layout.arms.map(({ x, y, w, h, radii }) => ({ x, y, w, h, radii })),
    ears: layout.ears
      .filter((e) => e.s > 0.5)
      .map((e) => ({
        x: e.x, y: e.y, size: e.s,
        cx: e.c[1] === "l" ? e.x : e.x + e.s,
        cy: e.c[0] === "t" ? e.y : e.y + e.s,
      })),
  };
}

/** Bounding box of a layout's arms. */
export function bounds(layout) {
  const xs = layout.arms.flatMap((a) => [a.x, a.x + a.w]);
  const ys = layout.arms.flatMap((a) => [a.y, a.y + a.h]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
