// Translations follow the system language (WebView2 reports the Windows display language).
// Missing languages and keys fall back to English.
const MESSAGES = {
  en: {
    title: "Plan usage", loading: "Loading…", noAccounts: "No accounts",
    noCredentials: "No Claude Code or Codex credentials found on Windows or WSL.",
    searching: "Looking for accounts…", refresh: "Refresh",
    session: "Session (5h)", weekly: "Weekly", weekly_opus: "Weekly · Opus", weekly_sonnet: "Weekly · Sonnet", limit: "Limit",
    resetsIn: "Resets in {t}", resetsNow: "Resets now", credits: "Credits: {v}", unlimited: "Unlimited",
    token_expired: "Token expired — open {provider} to renew it",
    token_invalid: "Invalid token — open {provider} to sign in again",
    bad_response: "Unexpected response", http: "HTTP error {code}",
    toggle: "Show/hide island", quit: "Quit",
  },
  pt: {
    title: "Uso dos planos", loading: "Carregando…", noAccounts: "Nenhuma conta",
    noCredentials: "Nenhuma credencial do Claude Code ou Codex no Windows ou WSL.",
    searching: "Procurando contas…", refresh: "Atualizar",
    session: "Sessão (5h)", weekly: "Semana", weekly_opus: "Semana · Opus", weekly_sonnet: "Semana · Sonnet", limit: "Limite",
    resetsIn: "Reinicia em {t}", resetsNow: "Reinicia agora", credits: "Créditos: {v}", unlimited: "Ilimitado",
    token_expired: "Token expirado — abra o {provider} para renovar",
    token_invalid: "Token inválido — abra o {provider} para entrar de novo",
    bad_response: "Resposta inesperada", http: "Erro HTTP {code}",
    toggle: "Mostrar/ocultar ilha", quit: "Sair",
  },
  es: {
    title: "Uso de los planes", loading: "Cargando…", noAccounts: "Sin cuentas",
    noCredentials: "No se encontraron credenciales de Claude Code o Codex en Windows ni WSL.",
    searching: "Buscando cuentas…", refresh: "Actualizar",
    session: "Sesión (5 h)", weekly: "Semana", weekly_opus: "Semana · Opus", weekly_sonnet: "Semana · Sonnet", limit: "Límite",
    resetsIn: "Se reinicia en {t}", resetsNow: "Se reinicia ahora", credits: "Créditos: {v}", unlimited: "Ilimitado",
    token_expired: "Token caducado: abre {provider} para renovarlo",
    token_invalid: "Token no válido: abre {provider} para volver a iniciar sesión",
    bad_response: "Respuesta inesperada", http: "Error HTTP {code}",
    toggle: "Mostrar/ocultar isla", quit: "Salir",
  },
  fr: {
    title: "Utilisation des forfaits", loading: "Chargement…", noAccounts: "Aucun compte",
    noCredentials: "Aucun identifiant Claude Code ou Codex trouvé sur Windows ou WSL.",
    searching: "Recherche des comptes…", refresh: "Actualiser",
    session: "Session (5 h)", weekly: "Semaine", weekly_opus: "Semaine · Opus", weekly_sonnet: "Semaine · Sonnet", limit: "Limite",
    resetsIn: "Réinitialisation dans {t}", resetsNow: "Réinitialisation imminente", credits: "Crédits : {v}", unlimited: "Illimité",
    token_expired: "Jeton expiré — ouvrez {provider} pour le renouveler",
    token_invalid: "Jeton invalide — ouvrez {provider} pour vous reconnecter",
    bad_response: "Réponse inattendue", http: "Erreur HTTP {code}",
    toggle: "Afficher/masquer l’île", quit: "Quitter",
  },
  de: {
    title: "Plan-Nutzung", loading: "Wird geladen…", noAccounts: "Keine Konten",
    noCredentials: "Keine Claude-Code- oder Codex-Anmeldedaten unter Windows oder WSL gefunden.",
    searching: "Konten werden gesucht…", refresh: "Aktualisieren",
    session: "Sitzung (5 Std.)", weekly: "Woche", weekly_opus: "Woche · Opus", weekly_sonnet: "Woche · Sonnet", limit: "Limit",
    resetsIn: "Zurückgesetzt in {t}", resetsNow: "Wird jetzt zurückgesetzt", credits: "Guthaben: {v}", unlimited: "Unbegrenzt",
    token_expired: "Token abgelaufen – öffne {provider}, um es zu erneuern",
    token_invalid: "Token ungültig – öffne {provider}, um dich neu anzumelden",
    bad_response: "Unerwartete Antwort", http: "HTTP-Fehler {code}",
    toggle: "Insel ein-/ausblenden", quit: "Beenden",
  },
  it: {
    title: "Utilizzo dei piani", loading: "Caricamento…", noAccounts: "Nessun account",
    noCredentials: "Nessuna credenziale di Claude Code o Codex trovata su Windows o WSL.",
    searching: "Ricerca account…", refresh: "Aggiorna",
    session: "Sessione (5 h)", weekly: "Settimana", weekly_opus: "Settimana · Opus", weekly_sonnet: "Settimana · Sonnet", limit: "Limite",
    resetsIn: "Si azzera tra {t}", resetsNow: "Si azzera ora", credits: "Crediti: {v}", unlimited: "Illimitati",
    token_expired: "Token scaduto: apri {provider} per rinnovarlo",
    token_invalid: "Token non valido: apri {provider} per accedere di nuovo",
    bad_response: "Risposta inattesa", http: "Errore HTTP {code}",
    toggle: "Mostra/nascondi isola", quit: "Esci",
  },
  ja: {
    title: "プランの使用状況", loading: "読み込み中…", noAccounts: "アカウントなし",
    noCredentials: "Windows または WSL に Claude Code / Codex の認証情報が見つかりません。",
    searching: "アカウントを検索中…", refresh: "更新",
    session: "セッション（5時間）", weekly: "週間", weekly_opus: "週間 · Opus", weekly_sonnet: "週間 · Sonnet", limit: "上限",
    resetsIn: "{t}後にリセット", resetsNow: "まもなくリセット", credits: "クレジット: {v}", unlimited: "無制限",
    token_expired: "トークンの期限切れ — {provider} を開いて更新してください",
    token_invalid: "トークンが無効です — {provider} を開いて再ログインしてください",
    bad_response: "予期しない応答", http: "HTTP エラー {code}",
    toggle: "アイランドを表示/非表示", quit: "終了",
  },
  zh: {
    title: "套餐用量", loading: "加载中…", noAccounts: "没有账户",
    noCredentials: "在 Windows 或 WSL 中未找到 Claude Code 或 Codex 凭据。",
    searching: "正在查找账户…", refresh: "刷新",
    session: "会话（5 小时）", weekly: "每周", weekly_opus: "每周 · Opus", weekly_sonnet: "每周 · Sonnet", limit: "限额",
    resetsIn: "{t}后重置", resetsNow: "即将重置", credits: "额度：{v}", unlimited: "无限",
    token_expired: "令牌已过期 — 请打开 {provider} 续期",
    token_invalid: "令牌无效 — 请打开 {provider} 重新登录",
    bad_response: "意外的响应", http: "HTTP 错误 {code}",
    toggle: "显示/隐藏灵动岛", quit: "退出",
  },
  ko: {
    title: "요금제 사용량", loading: "불러오는 중…", noAccounts: "계정 없음",
    noCredentials: "Windows 또는 WSL에서 Claude Code 또는 Codex 자격 증명을 찾을 수 없습니다.",
    searching: "계정을 찾는 중…", refresh: "새로 고침",
    session: "세션 (5시간)", weekly: "주간", weekly_opus: "주간 · Opus", weekly_sonnet: "주간 · Sonnet", limit: "한도",
    resetsIn: "{t} 후 초기화", resetsNow: "곧 초기화", credits: "크레딧: {v}", unlimited: "무제한",
    token_expired: "토큰 만료 — {provider}을(를) 열어 갱신하세요",
    token_invalid: "토큰이 유효하지 않음 — {provider}을(를) 열어 다시 로그인하세요",
    bad_response: "예상치 못한 응답", http: "HTTP 오류 {code}",
    toggle: "아일랜드 표시/숨기기", quit: "종료",
  },
  ru: {
    title: "Использование тарифов", loading: "Загрузка…", noAccounts: "Нет аккаунтов",
    noCredentials: "Учётные данные Claude Code или Codex не найдены ни в Windows, ни в WSL.",
    searching: "Поиск аккаунтов…", refresh: "Обновить",
    session: "Сессия (5 ч)", weekly: "Неделя", weekly_opus: "Неделя · Opus", weekly_sonnet: "Неделя · Sonnet", limit: "Лимит",
    resetsIn: "Сброс через {t}", resetsNow: "Сброс сейчас", credits: "Кредиты: {v}", unlimited: "Без ограничений",
    token_expired: "Токен истёк — откройте {provider}, чтобы обновить его",
    token_invalid: "Недействительный токен — откройте {provider}, чтобы войти снова",
    bad_response: "Неожиданный ответ", http: "Ошибка HTTP {code}",
    toggle: "Показать/скрыть остров", quit: "Выход",
  },
};

function pickLocale() {
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (MESSAGES[base]) return { tag, lang: base };
  }
  return { tag: "en", lang: "en" };
}

export const { tag: LOCALE, lang: LANG } = pickLocale();
document.documentElement.lang = LOCALE;

export function t(key, vars = {}) {
  const msg = MESSAGES[LANG][key] ?? MESSAGES.en[key] ?? key;
  return msg.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

const unit = (u) => new Intl.NumberFormat(LOCALE, { style: "unit", unit: u, unitDisplay: "narrow" });
const DAY = unit("day"), HOUR = unit("hour"), MIN = unit("minute");

/** Compact duration such as "3d 4h" or "4h 47min", formatted for the locale. */
export function duration(totalMinutes) {
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  if (d) return [DAY.format(d), h && HOUR.format(h)].filter(Boolean).join(" ");
  if (h) return [HOUR.format(h), m && MIN.format(m)].filter(Boolean).join(" ");
  return MIN.format(Math.max(1, m));
}

export function resetsIn(iso) {
  const mins = Math.round((new Date(iso) - Date.now()) / 60000);
  return mins <= 0 ? t("resetsNow") : t("resetsIn", { t: duration(mins) });
}

export function windowLabel(w) {
  if (w.kind !== "window") return t(w.kind);
  return w.window_seconds ? `${t("limit")} · ${duration(Math.round(w.window_seconds / 60))}` : t("limit");
}

const CLI_NAME = { Claude: "Claude Code", Codex: "Codex" };

export function errorText(provider, code) {
  const vars = { provider: CLI_NAME[provider] ?? provider };
  if (code === "token_expired" || code === "token_invalid" || code === "bad_response") return t(code, vars);
  const http = /^http_(\d+)$/.exec(code);
  return http ? t("http", { code: http[1] }) : code;
}

export const creditsText = (v) => t("credits", { v: v === "unlimited" ? t("unlimited") : v });

export function time(iso) {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

/** Fills static markup: elements with data-i18n get text, data-i18n-title get a tooltip. */
export function translateDom(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-title]").forEach((el) => (el.title = t(el.dataset.i18nTitle)));
}
