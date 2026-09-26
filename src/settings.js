import { t, translateDom, setLanguage, setSystemLocale, LANGUAGES, resetsIn, resetText } from "./i18n.js";

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const REFRESH_OPTIONS = [1, 5, 15, 30];
const PROVIDERS = [["claude", "Claude"], ["codex", "Codex"]];
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const color = (p) => (p >= 90 ? "var(--bad)" : p >= 70 ? "var(--warn)" : "var(--accent)");

let settings;
let snapshot = { accounts: [] };

// ---------------------------------------------------------------------------------------------
// Navigation

function showPage(page) {
  document.querySelectorAll(".nav").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === `page-${page}`));
  try { localStorage.setItem("settings-page", page); } catch {}
  requestAnimationFrame(placeThumbs);
}
document.querySelectorAll(".nav").forEach((b) => b.addEventListener("click", () => showPage(b.dataset.page)));

// ---------------------------------------------------------------------------------------------
// Segmented controls with a sliding thumb

function placeThumbs() {
  document.querySelectorAll(".segmented").forEach((seg) => {
    const active = seg.querySelector("button.active");
    const thumb = seg.querySelector(".thumb");
    if (!active || !thumb || !seg.offsetParent) return;
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
  });
}

function markSelected() {
  document.querySelectorAll(".segmented, .picker").forEach((group) => {
    const value = String(settings[group.dataset.key]);
    group.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.value === value));
  });
  placeThumbs();
}

document.querySelectorAll(".segmented, .picker").forEach((group) => {
  group.addEventListener("click", (e) => {
    const value = e.target.closest("button")?.value;
    if (!value) return;
    const key = group.dataset.key;
    update({ [key]: key === "refresh_minutes" ? Number(value) : value });
  });
});

// ---------------------------------------------------------------------------------------------
// Accounts

const initial = (a) => (a.alias || a.email || "?").trim()[0].toUpperCase();
function hue(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
const peak = (a) => (a.windows.length ? Math.max(...a.windows.map((w) => w.used_percent)) : null);

function accountRow(p, a) {
  const key = `${p}:${a.id}`;
  const usage = peak(a);
  // The fullest window is the one that matters; show when it resets.
  const top = a.windows.reduce((m, w) => (w.used_percent > (m?.used_percent ?? -1) ? w : m), null);
  const meter = usage == null
    ? `<div class="meter none"><b>—</b></div>`
    : `<div class="meter"><b>${Math.round(usage)}%</b><div class="track"><i style="width:${Math.min(100, usage)}%;background:${color(usage)}"></i></div>
        ${top?.resets_at ? `<small>${esc(resetsIn(top.resets_at))}</small>` : ""}</div>`;
  const held = a.resets ?? [];
  const total = held.reduce((n, r) => n + r.count, 0);
  const resets = total > 0
    ? `<em class="chip resets ${held.some((r) => r.usable) ? "live" : ""}"
        title="${esc([t("resetsTitle"), ...held.map(resetText)].join("\n"))}">↺ ${total}</em>`
    : "";
  return `
    <div class="account" data-key="${p}:${esc(a.id)}">
      <div class="avatar" style="background:hsl(${hue(a.id)} 55% 48%)">${esc(initial(a))}</div>
      <div class="who">
        <input data-alias="${esc(key)}" value="${esc(settings.aliases[key] ?? "")}"
          placeholder="${esc(a.email ?? t("unknownAccount"))}" aria-label="${t("alias")}" title="${t("alias")}" />
        <small>
          ${a.active ? `<em class="chip live">${t("inUse")}</em>` : ""}
          ${a.plan ? `<em class="chip">${esc(a.plan)}</em>` : ""}
          ${resets}
          <span>${esc(settings.aliases[key] ? a.email ?? "" : a.org ?? "")}</span>
        </small>
      </div>
      ${meter}
      ${a.active ? "" : `<button class="btn use" data-use="${p}" data-id="${esc(a.id)}">${t("use")}</button>`}
      <button class="remove" data-remove="${p}" data-id="${esc(a.id)}" ${a.active ? "disabled" : ""} title="${t("remove")}">
        <svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>`;
}

/** Replaces only the account rows that changed (see main.js), so buttons don't flicker. */
function patch(container, html) {
  const next = document.createElement("div");
  next.innerHTML = html;
  const keys = (root) => [...root.querySelectorAll("[data-key]")].map((el) => el.dataset.key).join("|");
  const sameRows = container.querySelector("[data-key]") && keys(container) === keys(next);
  if (!sameRows) {
    if (container.innerHTML !== next.innerHTML) container.replaceChildren(...next.childNodes);
    return;
  }
  const fresh = new Map([...next.querySelectorAll("[data-key]")].map((el) => [el.dataset.key, el]));
  for (const row of container.querySelectorAll("[data-key]")) {
    const replacement = fresh.get(row.dataset.key);
    if (replacement && replacement.outerHTML !== row.outerHTML) row.replaceWith(replacement);
  }
  // Balancer controls live outside the rows; keep them in sync too.
  container.querySelectorAll(".balancer").forEach((el, i) => {
    const twin = next.querySelectorAll(".balancer")[i];
    if (twin && twin.outerHTML !== el.outerHTML) el.replaceWith(twin);
  });
}

function renderAccounts() {
  patch($("accounts"), PROVIDERS.filter(([p]) => settings.providers[p]).map(([p, name]) => {
    const list = snapshot.accounts.filter((a) => a.provider === p);
    const rule = settings.balancer[p];
    return `
      <div class="provider">
        <div class="provider-head">
          <span class="mark ${p}">C</span><h3>${name}</h3>
          <button class="btn" data-add="${p}"><svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>${t("addAccount")}</button>
        </div>
        <div class="group">
          ${list.length ? list.map((a) => accountRow(p, a)).join("") : `<div class="empty">${t("noAccounts")}</div>`}
        </div>
        <div class="group balancer">
          <div class="row">
            <label class="title" for="auto-${p}">${t("autoSwitch")}</label>
            <input type="checkbox" class="switch" id="auto-${p}" data-auto="${p}" ${rule.auto ? "checked" : ""} />
          </div>
          <div class="row ${rule.auto ? "" : "disabled"}">
            <label for="at-${p}">${t("switchAt")}</label>
            <div class="range">
              <input type="range" id="at-${p}" data-threshold="${p}" min="50" max="95" step="5" value="${rule.threshold}"
                style="--fill:${((rule.threshold - 50) / 45) * 100}%" />
              <output>${rule.threshold}%</output>
            </div>
          </div>
        </div>
      </div>`;
  }).join(""));
}

$("accounts").addEventListener("click", async (e) => {
  const add = e.target.closest("[data-add]");
  const remove = e.target.closest("[data-remove]");
  const use = e.target.closest("[data-use]");
  if (use) {
    const { use: provider, id } = use.dataset;
    const before = snapshot;
    // Mark the new account at once; the backend confirms (or reverts) it.
    snapshot = { ...snapshot, accounts: snapshot.accounts.map((a) => (a.provider === provider ? { ...a, active: a.id === id } : a)) };
    renderAccounts();
    try {
      snapshot = await invoke("switch_account", { provider, id });
    } catch (err) {
      snapshot = before;
      alert(String(err));
    }
    renderAccounts();
  } else if (add) {
    try {
      await invoke("add_account", { provider: add.dataset.add });
      $("add-hint").hidden = false;
    } catch (err) {
      alert(err === "CLI not found" ? t("cliMissing") : String(err));
    }
  } else if (remove && !remove.disabled) {
    snapshot = await invoke("remove_account", { provider: remove.dataset.remove, id: remove.dataset.id });
    renderAccounts();
  }
});
$("accounts").addEventListener("input", (e) => {
  const el = e.target;
  if (!el.dataset.threshold) return;
  el.style.setProperty("--fill", `${((el.value - 50) / 45) * 100}%`);
  el.nextElementSibling.textContent = `${el.value}%`;
});
$("accounts").addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.alias) {
    const aliases = { ...settings.aliases };
    const value = el.value.trim();
    if (value) aliases[el.dataset.alias] = value;
    else delete aliases[el.dataset.alias];
    update({ aliases });
  } else if (el.dataset.auto) {
    const p = el.dataset.auto;
    update({ balancer: { ...settings.balancer, [p]: { ...settings.balancer[p], auto: el.checked } } });
  } else if (el.dataset.threshold) {
    const p = el.dataset.threshold;
    update({ balancer: { ...settings.balancer, [p]: { ...settings.balancer[p], threshold: Number(el.value) } } });
  }
});
$("accounts").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.dataset.alias) e.target.blur();
});
listen("usage-updated", (e) => {
  snapshot = e.payload;
  // Don't rebuild the list under someone typing a nickname.
  if (settings && !document.activeElement?.dataset?.alias) renderAccounts();
});
listen("account-added", () => { $("add-hint").hidden = true; });

// ---------------------------------------------------------------------------------------------
// Everything else

const displayNumber = (name, i) => /(\d+)\s*$/.exec(name ?? "")?.[1] ?? String(i + 1);

async function render() {
  setLanguage(settings.language);
  translateDom();
  document.title = `Usage Bar · ${t("settings")}`;

  $("refresh").querySelectorAll("button").forEach((b) => b.remove());
  $("refresh").insertAdjacentHTML("beforeend",
    REFRESH_OPTIONS.map((n) => `<button value="${n}">${t("minutes", { n })}</button>`).join(""));

  document.querySelector(".island-only").classList.toggle("disabled", settings.mode !== "island");

  const monitors = await invoke("list_monitors");
  $("monitor").innerHTML = `<option value="">${t("monitorPrimary")}</option>` + monitors.map((m, i) => {
    const label = `${t("display", { n: displayNumber(m.name, i) })} · ${m.width}×${m.height}${m.primary ? ` (${t("primary")})` : ""}`;
    return `<option value="${esc(m.name)}">${esc(label)}</option>`;
  }).join("");
  $("monitor").value = settings.monitor ?? "";

  $("language").innerHTML = `<option value="auto">${t("langAuto")}</option>` +
    Object.entries(LANGUAGES).map(([code, name]) => `<option value="${code}">${name}</option>`).join("");
  $("language").value = settings.language;

  $("claude").checked = settings.providers.claude;
  $("codex").checked = settings.providers.codex;
  $("startup").checked = settings.launch_at_login;
  $("auto-update").checked = settings.auto_update;
  const version = await invoke("app_version");
  $("version").textContent = /^\d/.test(version) ? `v${version}` : version;
  $("version-label").textContent = t("versionN", { v: version });
  if (!$("check-updates").disabled) $("check-updates").textContent = latest ? t("installUpdate") : t("checkUpdates");
  markSelected();
  renderAccounts();
}

async function update(patch) {
  settings = { ...settings, ...patch };
  await render();
  await invoke("save_settings", { settings });
}

$("monitor").addEventListener("change", (e) => update({ monitor: e.target.value || null }));
$("language").addEventListener("change", (e) => update({ language: e.target.value }));
$("claude").addEventListener("change", (e) => update({ providers: { ...settings.providers, claude: e.target.checked } }));
$("codex").addEventListener("change", (e) => update({ providers: { ...settings.providers, codex: e.target.checked } }));
$("startup").addEventListener("change", (e) => update({ launch_at_login: e.target.checked }));
$("auto-update").addEventListener("change", (e) => update({ auto_update: e.target.checked }));

// Updates: checking shows the result inline; when one is available the button installs it.
let latest = null;
function showUpdateState(state) {
  const status = $("update-status");
  const button = $("check-updates");
  status.classList.toggle("available", state === "available");
  status.textContent = state === "checking" ? t("checking")
    : state === "available" ? t("updateAvailable", { v: latest })
    : state === "current" ? t("upToDate")
    : state === "installing" ? t("updating", { v: latest })
    : state ? String(state) : "";
  button.textContent = state === "available" ? t("installUpdate") : t("checkUpdates");
  button.disabled = state === "checking" || state === "installing";
}
$("check-updates").addEventListener("click", async () => {
  if (latest) {
    showUpdateState("installing");
    try { await invoke("install_update"); } catch (err) { showUpdateState(String(err)); }
    return;
  }
  showUpdateState("checking");
  try {
    const info = await invoke("check_for_updates");
    latest = info.latest;
    showUpdateState(latest ? "available" : "current");
  } catch (err) {
    showUpdateState(String(err));
  }
});

// Monitors may be plugged in while the window is hidden.
window.addEventListener("focus", () => settings && render());
window.addEventListener("resize", placeThumbs);
listen("settings-changed", (e) => { settings = e.payload; render(); });

try { setSystemLocale(await invoke("system_locale")); } catch {}
settings = await invoke("get_settings");
snapshot = await invoke("get_usage");
await render();
let page = "display";
try { page = localStorage.getItem("settings-page") || page; } catch {}
showPage(page);
