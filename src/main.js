import { t, resetsIn, windowLabel, errorText, creditsText, time, translateDom } from "./i18n.js";

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const COMPACT_H = 32;
const EXPANDED_W = 380;
const MAX_H = 580;
const EXPAND_DELAY = 60;
const COLLAPSE_DELAY = 220;

const $island = document.getElementById("island");
const $compact = document.getElementById("compact");
const $details = document.getElementById("details");
const $accounts = document.getElementById("accounts");
const $updated = document.getElementById("updated");
const $refresh = document.getElementById("refresh");

let expanded = false;
let hoverTimer;

/**
 * SwiftUI-style spring (response, dampingFraction) sampled into a CSS linear() easing.
 * Opening overshoots slightly; closing is critically damped, like the macOS notch apps.
 */
function spring(response, damping, samples = 60) {
  const omega = (2 * Math.PI) / response;
  const duration = Math.min(1.2, 7 / (damping * omega));
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration;
    let x;
    if (damping >= 1) {
      x = 1 - (1 + omega * t) * Math.exp(-omega * t);
    } else {
      const wd = omega * Math.sqrt(1 - damping * damping);
      x = 1 - Math.exp(-damping * omega * t) * (Math.cos(wd * t) + ((damping * omega) / wd) * Math.sin(wd * t));
    }
    pts.push(i === samples ? "1" : x.toFixed(4));
  }
  return { easing: `linear(${pts.join(", ")})`, duration: `${duration.toFixed(3)}s` };
}

if (CSS.supports("transition-timing-function", "linear(0, 1)")) {
  const root = document.documentElement.style;
  for (const [name, s] of Object.entries({
    open: spring(0.42, 0.78),
    close: spring(0.36, 1),
    content: spring(0.5, 0.85),
  })) {
    root.setProperty(`--${name}`, s.easing);
    root.setProperty(`--${name}-dur`, s.duration);
  }
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const color = (p) => (p >= 90 ? "var(--bad)" : p >= 70 ? "var(--warn)" : "var(--ok)");

function ring(p) {
  const r = 6;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, p) / 100) * c;
  return `<svg class="ring" viewBox="0 0 15 15"><circle class="bg" cx="7.5" cy="7.5" r="${r}"/>
    <circle class="fg" cx="7.5" cy="7.5" r="${r}" stroke="${color(p)}" stroke-dasharray="${len} ${c}"/></svg>`;
}

/** The window closest to its limit is what matters at a glance. */
const peak = (a) => a.windows.reduce((m, w) => (w.used_percent > (m?.used_percent ?? -1) ? w : m), null);

function renderCompact(snap) {
  if (!snap.updated_at) {
    $compact.innerHTML = `<span class="dim">${t("loading")}</span>`;
  } else if (!snap.accounts.length) {
    $compact.innerHTML = `<span class="dim">${t("noAccounts")}</span>`;
  } else {
    $compact.innerHTML = snap.accounts.map((a) => {
      const w = peak(a);
      const value = w
        ? `${ring(w.used_percent)}${Math.round(w.used_percent)}%`
        : `<span style="color:var(--warn)">!</span>`;
      return `<span class="chip"><span class="name">${esc(a.provider)}</span>${value}</span>`;
    }).join("");
  }
}

function renderDetails(snap) {
  $updated.textContent = snap.updated_at
    ? time(snap.updated_at)
    : "";
  if (!snap.accounts.length) {
    $accounts.innerHTML = `<p class="empty">${snap.updated_at
      ? t("noCredentials")
      : t("searching")}</p>`;
    return;
  }
  $accounts.innerHTML = snap.accounts.map((a, i) => `
    <section style="transition-delay:${0.12 + i * 0.05}s">
      <div class="acc-head">
        <span class="name">${esc(a.provider)}</span>
        ${a.plan ? `<span class="plan">${esc(a.plan)}</span>` : ""}
      </div>
      <div class="acc-meta">${esc([a.email, a.sources.join(" + ")].filter(Boolean).join(" · "))}</div>
      ${a.error ? `<div class="error">${esc(errorText(a.provider, a.error))}</div>` : ""}
      ${a.windows.map((w) => `
        <div class="win">
          <div class="row"><span>${esc(windowLabel(w))}</span><b>${Math.round(w.used_percent)}%</b></div>
          <div class="bar"><div style="width:${Math.min(100, w.used_percent)}%;background:${color(w.used_percent)};transition-delay:${0.15 + i * 0.05}s"></div></div>
          ${w.resets_at ? `<div class="reset">${esc(resetsIn(w.resets_at))}</div>` : ""}
        </div>`).join("")}
      ${a.credits ? `<div class="reset" style="margin-top:6px">${esc(creditsText(a.credits))}</div>` : ""}
    </section>`).join("");
}

const compactWidth = () => Math.max(160, Math.ceil($compact.scrollWidth));
const expandedHeight = () => Math.min(MAX_H, Math.ceil($details.scrollHeight));

let lastShape = "";
let trackUntil = 0;

/** Sends the island's live (mid-animation) geometry so the backend hit-tests the exact drawn shape. */
function reportShape() {
  const rect = $island.getBoundingClientRect();
  const style = getComputedStyle($island);
  const shape = {
    x: rect.left,
    w: rect.width,
    h: rect.height,
    radius: parseFloat(style.getPropertyValue("--radius")) || 0,
    ear: parseFloat(style.getPropertyValue("--ear")) || 0,
  };
  const key = JSON.stringify(shape);
  if (key !== lastShape) {
    lastShape = key;
    invoke("set_hit_shape", { shape });
  }
}

/** Follows the shape every frame until the springs settle. */
function trackShape() {
  const running = trackUntil > performance.now();
  trackUntil = performance.now() + 1400;
  if (running) return;
  const tick = () => {
    reportShape();
    if (performance.now() < trackUntil) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Sizes the island; the CSS springs animate it. */
function layout() {
  const w = expanded ? EXPANDED_W : compactWidth();
  const h = expanded ? expandedHeight() : COMPACT_H;
  $island.style.width = `${w}px`;
  $island.style.height = `${h}px`;
  trackShape();
}

function setExpanded(value) {
  if (expanded === value) return;
  expanded = value;
  $island.classList.toggle("expanded", value);
  if (!value) $details.scrollTop = 0;
  layout();
}

function render(snap) {
  renderCompact(snap);
  renderDetails(snap);
  layout();
}

listen("island-hover", ({ payload: inside }) => {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => setExpanded(inside), inside ? EXPAND_DELAY : COLLAPSE_DELAY);
});

$refresh.addEventListener("click", async () => {
  $refresh.classList.add("spin");
  try { render(await invoke("refresh")); } finally { $refresh.classList.remove("spin"); }
});

translateDom();
invoke("set_tray_labels", { toggle: t("toggle"), refresh: t("refresh"), quit: t("quit") });

listen("usage-updated", (e) => render(e.payload));
invoke("get_usage").then(render);
setInterval(() => invoke("get_usage").then(render), 60_000);
