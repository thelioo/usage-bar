import { t, translateDom, setLanguage, LANGUAGES } from "./i18n.js";

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const REFRESH_OPTIONS = [1, 5, 15, 30];
const ANCHORS = ["top", "left", "right"];
const $ = (id) => document.getElementById(id);

let settings;

const displayNumber = (name, i) => /(\d+)\s*$/.exec(name ?? "")?.[1] ?? String(i + 1);

async function render() {
  setLanguage(settings.language);
  translateDom();
  document.title = `Usage Bar · ${t("settings")}`;

  document.querySelectorAll(".segmented").forEach((seg) => {
    seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.value === settings[seg.dataset.key]));
  });
  document.querySelectorAll(".island-only").forEach((row) => row.classList.toggle("disabled", settings.mode !== "island"));

  const monitors = await invoke("list_monitors");
  $("monitor").innerHTML = `<option value="">${t("monitorPrimary")}</option>` + monitors.map((m, i) => {
    const label = `${t("display", { n: displayNumber(m.name, i) })} · ${m.width}×${m.height}${m.primary ? ` (${t("primary")})` : ""}`;
    return `<option value="${m.name}">${label}</option>`;
  }).join("");
  $("monitor").value = settings.monitor ?? "";

  $("anchor").innerHTML = ANCHORS.map((a) => `<option value="${a}">${t(`anchor_${a}`)}</option>`).join("");
  $("anchor").value = settings.anchor;

  $("refresh").innerHTML = REFRESH_OPTIONS.map((n) => `<option value="${n}">${t("minutes", { n })}</option>`).join("");
  $("refresh").value = String(settings.refresh_minutes);

  $("language").innerHTML = `<option value="auto">${t("langAuto")}</option>` +
    Object.entries(LANGUAGES).map(([code, name]) => `<option value="${code}">${name}</option>`).join("");
  $("language").value = settings.language;

  $("claude").checked = settings.providers.claude;
  $("codex").checked = settings.providers.codex;
  $("startup").checked = settings.launch_at_login;
}

async function update(patch) {
  settings = { ...settings, ...patch };
  await render();
  await invoke("save_settings", { settings });
}

document.querySelectorAll(".segmented").forEach((seg) => {
  seg.addEventListener("click", (e) => {
    const value = e.target.closest("button")?.value;
    if (value) update({ [seg.dataset.key]: value });
  });
});
$("anchor").addEventListener("change", (e) => update({ anchor: e.target.value }));
$("monitor").addEventListener("change", (e) => update({ monitor: e.target.value || null }));
$("refresh").addEventListener("change", (e) => update({ refresh_minutes: Number(e.target.value) }));
$("language").addEventListener("change", (e) => update({ language: e.target.value }));
$("claude").addEventListener("change", (e) => update({ providers: { ...settings.providers, claude: e.target.checked } }));
$("codex").addEventListener("change", (e) => update({ providers: { ...settings.providers, codex: e.target.checked } }));
$("startup").addEventListener("change", (e) => update({ launch_at_login: e.target.checked }));

// Monitors may be plugged in while the window is hidden.
window.addEventListener("focus", () => settings && render());
listen("settings-changed", (e) => { settings = e.payload; render(); });

settings = await invoke("get_settings");
render();
