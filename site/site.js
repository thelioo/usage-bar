// A working Usage Bar inside the page. The frames run the app's real UI (src/ via
// design/demo/island.html and settings.html); this file plays the part of the Rust backend:
// it answers the same commands, keeps settings and demo accounts, hit-tests the island's
// exact shape to open it on hover, and moves the frames around the mock screen.

const W = 640, H = 420, BAR = 34, WORK_H = H - BAR;
const hours = (h) => new Date(Date.now() + h * 3.6e6).toISOString();

const state = {
  settings: {
    mode: "island", anchor: "top", monitor: null, expand_on: "hover", compact_style: "names",
    refresh_minutes: 5, providers: { claude: true, codex: true }, language: "auto",
    launch_at_login: false, auto_update: true, aliases: { "claude:work": "Work", "claude:personal": "Personal" },
    balancer: { claude: { auto: false, threshold: 90 }, codex: { auto: false, threshold: 90 } },
  },
  accounts: [
    { id: "work", provider: "claude", email: "you@acme.com", plan: "max", org: "Acme", active: true,
      windows: [{ kind: "session", used_percent: 64, resets_at: hours(2.4) }, { kind: "weekly", used_percent: 38, resets_at: hours(70) }], resets: [] },
    { id: "personal", provider: "claude", email: "you@gmail.com", plan: "pro", org: null, active: false,
      windows: [{ kind: "session", used_percent: 12, resets_at: hours(4.1) }, { kind: "weekly", used_percent: 21, resets_at: hours(96) }], resets: [] },
    { id: "codex", provider: "codex", email: "you@example.com", plan: "pro", org: null, active: true,
      windows: [{ kind: "session", used_percent: 41, resets_at: hours(3) }, { kind: "weekly", used_percent: 76, resets_at: hours(44) }],
      resets: [{ kind: "full", title: "Full reset", count: 1, usable: false, expires_at: hours(24 * 26), next_available_at: null }] },
  ],
  shape: null,
  panelHeight: 320,
  dockWidth: 150,
};

const $ = (id) => document.getElementById(id);

/** Runs `fn` with the frame's document once it has loaded (right away if it already has). */
function whenLoaded(frame, fn) {
  const doc = frame.contentDocument;
  if (doc && doc.readyState === "complete" && doc.location.href !== "about:blank") fn(doc);
  frame.addEventListener("load", () => fn(frame.contentDocument));
}
const stage = $("stage"), screen = $("screen");
const frames = { main: $("island"), dock: $("dock"), panel: $("panel"), settings: $("settings-frame") };
const listeners = {};

function snapshot() {
  const alias = (a) => state.settings.aliases[`${a.provider}:${a.id}`] ?? null;
  return {
    accounts: state.accounts
      .filter((a) => state.settings.providers[a.provider])
      .map((a) => ({ ...a, alias: alias(a), sources: a.active ? ["Windows", "WSL: Ubuntu"] : [], credits: null, error: null, stale: false, fetched_at: new Date().toISOString() })),
    updated_at: new Date().toISOString(),
  };
}

function emit(name, payload, only) {
  for (const [label, fns] of Object.entries(listeners)) {
    if (only && only !== label) continue;
    fns[name]?.({ payload });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------------
// Commands (the same names the app's frontend invokes)

async function invoke(label, cmd, args = {}) {
  const s = state.settings;
  switch (cmd) {
    case "get_settings": return structuredClone(s);
    case "get_usage": case "refresh": return snapshot();
    case "system_locale": return navigator.language;
    case "app_version": return "web demo";
    case "list_monitors": return [{ name: "\\\\.\\DISPLAY1", width: 1920, height: 1080, primary: true }];
    case "taskbar_theme": return "light";
    case "save_settings":
      state.settings = structuredClone(args.settings);
      layout();
      emit("settings-changed", structuredClone(state.settings));
      emit("usage-updated", snapshot());
      return null;
    case "set_hit_shape": state.shape = args.shape; return null;
    // A hidden widget measures ~0; keep the last real width.
    case "set_dock_width": if (args.width > 40) state.dockWidth = args.width + 4; layout(); return null;
    case "set_panel_height": state.panelHeight = args.height; layout(); return null;
    case "open_settings": openSettings(); return null;
    case "dock_clicked": togglePanel(); return null;
    case "start_drag": startDrag(label, args.width); return null;
    case "switch_account": {
      const target = state.accounts.find((a) => a.provider === args.provider && a.id === args.id);
      await sleep(450);
      for (const a of state.accounts) if (a.provider === args.provider) a.active = a === target;
      const snap = snapshot();
      emit("usage-updated", snap);
      emit("account-switched", { provider: args.provider, from: null, to: s.aliases[`${args.provider}:${args.id}`] ?? target.email, auto: false });
      return snap;
    }
    case "remove_account": {
      const a = state.accounts.find((x) => x.provider === args.provider && x.id === args.id);
      if (a?.active) throw "active";
      state.accounts = state.accounts.filter((x) => x !== a);
      const snap = snapshot();
      emit("usage-updated", snap);
      return snap;
    }
    case "add_account": throw "Adding accounts needs the app on your PC — download it to try this.";
    case "check_for_updates": return { current: "web demo", latest: null };
    default: return null;
  }
}

window.usageBarBackend = {
  connect(win, label) {
    listeners[label] = {};
    return {
      core: { invoke: (cmd, args) => invoke(label, cmd, args) },
      event: { listen: async (name, fn) => { listeners[label][name] = fn; return () => {}; } },
      window: { getCurrentWindow: () => ({ label }) },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Hit testing, as in the app: the island only reacts over its drawn shape.

function containsRect(r, px, py) {
  const [l, t, rr, b] = [r.x, r.y, r.x + r.w, r.y + r.h];
  if (px < l || px > rr || py < t || py > b) return false;
  const left = px < l + r.w / 2, top = py < t + r.h / 2;
  const rad = Math.min(r.radii[top ? (left ? 0 : 1) : (left ? 3 : 2)], r.w / 2, r.h / 2);
  const cx = left ? l + rad : rr - rad, cy = top ? t + rad : b - rad;
  const inCorner = (left ? px < cx : px > cx) && (top ? py < cy : py > cy);
  return !inCorner || Math.hypot(px - cx, py - cy) <= rad;
}
function contains(shape, x, y) {
  if (!shape) return false;
  return shape.rects.some((r) => containsRect(r, x, y)) ||
    shape.ears.some((e) => x >= e.x && x <= e.x + e.size && y >= e.y && y <= e.y + e.size && Math.hypot(x - e.cx, y - e.cy) >= e.size);
}

let hovered = false;
function setHover(inside) {
  if (drag || inside === hovered) return;
  hovered = inside;
  stage.classList.add("touched");
  // Outside the shape, clicks fall through to the page (like on the desktop).
  frames.main.style.pointerEvents = inside ? "auto" : "none";
  emit("island-hover", inside, "main");
}
// The frame ignores the pointer unless it's over the island, so track it from the page.
stage.addEventListener("pointermove", (e) => {
  const r = frames.main.getBoundingClientRect();
  const scale = r.width / frames.main.offsetWidth;
  setHover(contains(state.shape, (e.clientX - r.left) / scale, (e.clientY - r.top) / scale));
});
stage.addEventListener("pointerleave", () => setHover(false));
// Once over the island the frame takes the pointer, so keep tracking it from inside.
whenLoaded(frames.main, (doc) => {
  doc.addEventListener("pointermove", (e) => setHover(contains(state.shape, e.clientX, e.clientY)));
  doc.documentElement.addEventListener("pointerleave", () => setHover(false));
});

// ---------------------------------------------------------------------------------------------
// Where each frame sits on the mock screen, per display mode and anchor.

function layout() {
  const { mode, anchor } = state.settings;
  const main = frames.main.style, dock = frames.dock.style, panel = frames.panel.style;
  main.display = mode === "island" ? "" : "none";
  const pos = { top: [(W - 600) / 2, 0], left: [0, (WORK_H - 700) / 2], right: [W - 600, (WORK_H - 700) / 2] }[anchor] ?? [(W - 600) / 2, 0];
  main.left = `${pos[0]}px`;
  main.top = `${pos[1]}px`;

  if (!drag) {
    dock.display = mode === "taskbar" ? "" : "none";
    Object.assign(dock, { width: `${state.dockWidth}px`, height: `${BAR}px`, left: `${W - 70 - state.dockWidth}px`, top: `${WORK_H}px` });
  }
  $("tray-icon").style.display = mode === "tray" ? "" : "none";

  const h = Math.min(state.panelHeight, WORK_H - 16);
  panel.height = `${h}px`;
  panel.top = `${WORK_H - h - 8}px`;
  if (mode === "island") closePanel();
}

function togglePanel() {
  frames.panel.classList.contains("open") ? closePanel() : frames.panel.classList.add("open");
}
function closePanel() {
  frames.panel.classList.remove("open");
}
$("tray-icon").addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
screen.addEventListener("click", (e) => { if (e.target === screen) closePanel(); });

// ---------------------------------------------------------------------------------------------
// Dragging, as in the app: the taskbar widget turns into a pill that follows the pointer, drop
// slots appear, the nearest pulls the pill in, and releasing moves the island there.

const PILL_H = 32, PAD = 100, SNAP = 90, MAGNET = 0.35;
const T = 32;
let drag = null;

function slots() {
  const side = 150;
  return [
    { id: "top", x: (W - drag.width) / 2, y: 0, w: drag.width, h: T },
    { id: "left", x: 0, y: (WORK_H - side) / 2, w: T, h: side },
    { id: "right", x: W - T, y: (WORK_H - side) / 2, w: T, h: side },
    { id: "taskbar", x: W - 70 - state.dockWidth, y: WORK_H, w: state.dockWidth, h: BAR },
  ];
}
function outline(id, w, h) {
  if (id === "taskbar") return [`M8 0H${w - 8}A8 8 0 0 1 ${w} 8V${h - 8}A8 8 0 0 1 ${w - 8} ${h}H8A8 8 0 0 1 0 ${h - 8}V8A8 8 0 0 1 8 0Z`, ""];
  if (id === "top") return [`M0 0H${w}V${h - 14}A14 14 0 0 1 ${w - 14} ${h}H14A14 14 0 0 1 0 ${h - 14}Z`, ""];
  return [`M${w} 0V${h}H14A14 14 0 0 1 0 ${h - 14}V14A14 14 0 0 1 14 0Z`, id === "left" ? "scale(-1,1)" : ""];
}

function startDrag(from, width) {
  if (drag) return;
  closePanel();
  drag = { from, width, list: [], target: null, pull: [0, 0], last: null };
  drag.list = slots();
  const layer = $("slots");
  layer.innerHTML = drag.list.map((s, i) => {
    const [d, flip] = outline(s.id, s.w, s.h);
    return `<svg data-id="${s.id}" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" style="left:${s.x}px;top:${s.y}px;transition-delay:${i * 25}ms,${i * 25}ms,0s">
      <g transform-origin="${s.w / 2} ${s.h / 2}" transform="${flip}"><path d="${d}"/></g></svg>`;
  }).join("");
  requestAnimationFrame(() => layer.classList.add("on"));
  stage.classList.add("dragging");
  // Hidden with opacity, not visibility: the pointer stays captured by the frame where the
  // drag began, and an invisible frame would swallow the rest of the drag (and the release).
  if (from === "main") frames.main.style.opacity = "0";
  Object.assign(frames.dock.style, { display: "", width: `${width + PAD * 2}px`, height: `${PILL_H + PAD * 2}px` });
  emit("dock-floating", true, "dock");
}

function moveDrag(x, y) {
  if (!drag) return;
  // Nearest slot within reach pulls the pill in, growing smoothly as it gets closer.
  let best = null, bestD = SNAP;
  for (const s of drag.list) {
    const d = Math.hypot(Math.max(0, s.x - x, x - (s.x + s.w)), Math.max(0, s.y - y, y - (s.y + s.h)));
    if (d <= bestD) { bestD = d; best = s; }
  }
  let goal = [0, 0];
  if (best) {
    const near = 1 - bestD / SNAP, k = MAGNET * near * near * (3 - 2 * near);
    goal = [(best.x + best.w / 2 - x) * k, (best.y + best.h / 2 - y) * k];
  }
  drag.pull = [drag.pull[0] + (goal[0] - drag.pull[0]) * 0.25, drag.pull[1] + (goal[1] - drag.pull[1]) * 0.25];
  const id = best?.id ?? null;
  if (id !== drag.target) {
    drag.target = id;
    $("slots").querySelectorAll("svg").forEach((el) => el.classList.toggle("active", el.dataset.id === id));
    emit("dock-zone", id ? "snap" : "none", "dock");
  }
  const now = performance.now();
  if (drag.last) {
    const dt = Math.max(1, now - drag.last.t) / 1000;
    emit("dock-velocity", [(x - drag.last.x) / dt, (y - drag.last.y) / dt], "dock");
  }
  drag.last = { x, y, t: now };
  const px = x + drag.pull[0], py = y + drag.pull[1];
  Object.assign(frames.dock.style, { left: `${px - drag.width / 2 - PAD}px`, top: `${py - PILL_H / 2 - PAD}px` });
}

function endDrag() {
  if (!drag) return;
  const { target, from } = drag;
  drag = null;
  $("slots").classList.remove("on");
  stage.classList.remove("dragging");
  emit("dock-zone", "none", "dock");
  emit("dock-floating", false, "dock");
  frames.main.style.opacity = "";
  const s = state.settings;
  if (target === "taskbar") s.mode = "taskbar";
  else if (target) Object.assign(s, { mode: "island", anchor: target });
  else if (from === "main") s.mode = "island";
  layout();
  emit("settings-changed", structuredClone(s));
  emit("drop-enter", null);
}

// Pointer positions in mock-screen px, whichever document the pointer is over (while the button
// is held, events keep going to the frame where the drag started).
function toScreen(clientX, clientY, frame) {
  const sr = screen.getBoundingClientRect(), scale = sr.width / W;
  if (!frame) return [(clientX - sr.left) / scale, (clientY - sr.top) / scale];
  const fr = frame.getBoundingClientRect(), fs = fr.width / frame.offsetWidth;
  return [(fr.left + clientX * fs - sr.left) / scale, (fr.top + clientY * fs - sr.top) / scale];
}
function onDragMove(e, frame) {
  if (!drag) return;
  if (e.buttons === 0) return endDrag(); // the release happened somewhere we didn't hear
  moveDrag(...toScreen(e.clientX, e.clientY, frame));
}
addEventListener("pointermove", (e) => onDragMove(e));
addEventListener("pointerup", endDrag);
addEventListener("mouseup", endDrag);
for (const frame of [frames.main, frames.dock, frames.panel]) {
  whenLoaded(frame, (doc) => {
    doc.addEventListener("pointermove", (e) => onDragMove(e, frame));
    doc.addEventListener("pointerup", endDrag);
    doc.addEventListener("mouseup", endDrag);
  });
}

// ---------------------------------------------------------------------------------------------
// Settings window, as a modal over the page.

const modal = $("settings-modal");
function openSettings() {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  fitSettings();
}
function closeSettings() {
  modal.hidden = true;
  document.body.style.overflow = "";
}
function fitSettings() {
  const s = Math.min(1, (innerWidth - 32) / 820, (innerHeight - 96) / 600);
  modal.style.setProperty("--s", s);
}
$("settings-close").addEventListener("click", closeSettings);
modal.addEventListener("click", (e) => { if (e.target === modal) closeSettings(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeSettings(); });
$("open-settings-link").addEventListener("click", (e) => { e.preventDefault(); openSettings(); });

// ---------------------------------------------------------------------------------------------
// Fit the mock screen to the column.

function fit() {
  stage.style.setProperty("--s", Math.min(1, stage.clientWidth / W));
  fitSettings();
}
fit();
addEventListener("resize", fit);
layout();
