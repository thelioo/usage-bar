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
    quit: "Quit",
    show: "Show usage", settings: "Settings", sDisplay: "Display", sMode: "Mode", modeIsland: "Island", modeTray: "Tray icon", sMonitor: "Monitor", monitorPrimary: "Primary monitor", display: "Display {n}", primary: "primary", sExpand: "Open island on", expandHover: "Hover", expandClick: "Click", sData: "Data", sRefresh: "Refresh every", minutes: "{n} min", sProviders: "Providers", sGeneral: "General", sLanguage: "Language", langAuto: "System default", sStartup: "Launch at login",
    modeTaskbar: "Taskbar", dragHint: "Tip: drag the island to the taskbar, a corner or an edge of any monitor.",
    sPosition: "Position", anchor_top: "Top (island)", anchor_top_left: "Top left corner", anchor_top_right: "Top right corner", anchor_left: "Left edge", anchor_right: "Right edge", anchor_bottom_left: "Bottom left corner", anchor_bottom_right: "Bottom right corner",
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
    quit: "Sair",
    show: "Mostrar uso", settings: "Configurações", sDisplay: "Exibição", sMode: "Modo", modeIsland: "Ilha", modeTray: "Ícone na bandeja", sMonitor: "Monitor", monitorPrimary: "Monitor principal", display: "Tela {n}", primary: "principal", sExpand: "Abrir a ilha ao", expandHover: "Passar o mouse", expandClick: "Clicar", sData: "Dados", sRefresh: "Atualizar a cada", minutes: "{n} min", sProviders: "Provedores", sGeneral: "Geral", sLanguage: "Idioma", langAuto: "Padrão do sistema", sStartup: "Iniciar com o Windows",
    modeTaskbar: "Barra de tarefas", dragHint: "Dica: arraste a ilha para a barra de tarefas, um canto ou uma lateral de qualquer monitor.",
    sPosition: "Posição", anchor_top: "Topo (ilha)", anchor_top_left: "Canto superior esquerdo", anchor_top_right: "Canto superior direito", anchor_left: "Lateral esquerda", anchor_right: "Lateral direita", anchor_bottom_left: "Canto inferior esquerdo", anchor_bottom_right: "Canto inferior direito",
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
    quit: "Salir",
    show: "Mostrar uso", settings: "Configuración", sDisplay: "Pantalla", sMode: "Modo", modeIsland: "Isla", modeTray: "Icono en la bandeja", sMonitor: "Monitor", monitorPrimary: "Monitor principal", display: "Pantalla {n}", primary: "principal", sExpand: "Abrir la isla al", expandHover: "Pasar el ratón", expandClick: "Hacer clic", sData: "Datos", sRefresh: "Actualizar cada", minutes: "{n} min", sProviders: "Proveedores", sGeneral: "General", sLanguage: "Idioma", langAuto: "Predeterminado del sistema", sStartup: "Iniciar con Windows",
    modeTaskbar: "Barra de tareas", dragHint: "Consejo: arrastra la isla a la barra de tareas, a una esquina o a un borde de cualquier monitor.",
    sPosition: "Posición", anchor_top: "Arriba (isla)", anchor_top_left: "Esquina superior izquierda", anchor_top_right: "Esquina superior derecha", anchor_left: "Borde izquierdo", anchor_right: "Borde derecho", anchor_bottom_left: "Esquina inferior izquierda", anchor_bottom_right: "Esquina inferior derecha",
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
    quit: "Quitter",
    show: "Afficher l’utilisation", settings: "Paramètres", sDisplay: "Affichage", sMode: "Mode", modeIsland: "Île", modeTray: "Icône de la barre d’état", sMonitor: "Écran", monitorPrimary: "Écran principal", display: "Écran {n}", primary: "principal", sExpand: "Ouvrir l’île au", expandHover: "Survol", expandClick: "Clic", sData: "Données", sRefresh: "Actualiser toutes les", minutes: "{n} min", sProviders: "Fournisseurs", sGeneral: "Général", sLanguage: "Langue", langAuto: "Langue du système", sStartup: "Lancer au démarrage",
    modeTaskbar: "Barre des tâches", dragHint: "Astuce : faites glisser l’île vers la barre des tâches, un coin ou un bord de n’importe quel écran.",
    sPosition: "Position", anchor_top: "En haut (île)", anchor_top_left: "Coin supérieur gauche", anchor_top_right: "Coin supérieur droit", anchor_left: "Bord gauche", anchor_right: "Bord droit", anchor_bottom_left: "Coin inférieur gauche", anchor_bottom_right: "Coin inférieur droit",
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
    quit: "Beenden",
    show: "Nutzung anzeigen", settings: "Einstellungen", sDisplay: "Anzeige", sMode: "Modus", modeIsland: "Insel", modeTray: "Tray-Symbol", sMonitor: "Bildschirm", monitorPrimary: "Hauptbildschirm", display: "Bildschirm {n}", primary: "Haupt", sExpand: "Insel öffnen bei", expandHover: "Überfahren", expandClick: "Klick", sData: "Daten", sRefresh: "Aktualisieren alle", minutes: "{n} Min.", sProviders: "Anbieter", sGeneral: "Allgemein", sLanguage: "Sprache", langAuto: "Systemstandard", sStartup: "Beim Anmelden starten",
    modeTaskbar: "Taskleiste", dragHint: "Tipp: Zieh die Insel auf die Taskleiste, in eine Ecke oder an einen Rand eines beliebigen Bildschirms.",
    sPosition: "Position", anchor_top: "Oben (Insel)", anchor_top_left: "Oben links", anchor_top_right: "Oben rechts", anchor_left: "Linker Rand", anchor_right: "Rechter Rand", anchor_bottom_left: "Unten links", anchor_bottom_right: "Unten rechts",
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
    quit: "Esci",
    show: "Mostra utilizzo", settings: "Impostazioni", sDisplay: "Visualizzazione", sMode: "Modalità", modeIsland: "Isola", modeTray: "Icona nell’area di notifica", sMonitor: "Monitor", monitorPrimary: "Monitor principale", display: "Schermo {n}", primary: "principale", sExpand: "Apri l’isola al", expandHover: "Passaggio del mouse", expandClick: "Clic", sData: "Dati", sRefresh: "Aggiorna ogni", minutes: "{n} min", sProviders: "Provider", sGeneral: "Generale", sLanguage: "Lingua", langAuto: "Predefinita di sistema", sStartup: "Avvia all’accesso",
    modeTaskbar: "Barra delle applicazioni", dragHint: "Suggerimento: trascina l’isola sulla barra delle applicazioni, in un angolo o su un bordo di qualsiasi monitor.",
    sPosition: "Posizione", anchor_top: "In alto (isola)", anchor_top_left: "Angolo in alto a sinistra", anchor_top_right: "Angolo in alto a destra", anchor_left: "Bordo sinistro", anchor_right: "Bordo destro", anchor_bottom_left: "Angolo in basso a sinistra", anchor_bottom_right: "Angolo in basso a destra",
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
    quit: "終了",
    show: "使用状況を表示", settings: "設定", sDisplay: "表示", sMode: "モード", modeIsland: "アイランド", modeTray: "トレイアイコン", sMonitor: "モニター", monitorPrimary: "メインモニター", display: "ディスプレイ {n}", primary: "メイン", sExpand: "アイランドを開く操作", expandHover: "ホバー", expandClick: "クリック", sData: "データ", sRefresh: "更新間隔", minutes: "{n} 分", sProviders: "プロバイダー", sGeneral: "一般", sLanguage: "言語", langAuto: "システムの既定", sStartup: "ログイン時に起動",
    modeTaskbar: "タスクバー", dragHint: "ヒント: アイランドはタスクバー、任意のモニターの角や端にドラッグできます。",
    sPosition: "位置", anchor_top: "上部（アイランド）", anchor_top_left: "左上", anchor_top_right: "右上", anchor_left: "左端", anchor_right: "右端", anchor_bottom_left: "左下", anchor_bottom_right: "右下",
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
    quit: "退出",
    show: "显示用量", settings: "设置", sDisplay: "显示", sMode: "模式", modeIsland: "灵动岛", modeTray: "托盘图标", sMonitor: "显示器", monitorPrimary: "主显示器", display: "显示器 {n}", primary: "主", sExpand: "打开灵动岛的方式", expandHover: "悬停", expandClick: "点击", sData: "数据", sRefresh: "刷新间隔", minutes: "{n} 分钟", sProviders: "服务商", sGeneral: "通用", sLanguage: "语言", langAuto: "跟随系统", sStartup: "登录时启动",
    modeTaskbar: "任务栏", dragHint: "提示：可以将灵动岛拖到任务栏，或任意显示器的角落和边缘。",
    sPosition: "位置", anchor_top: "顶部（灵动岛）", anchor_top_left: "左上角", anchor_top_right: "右上角", anchor_left: "左侧", anchor_right: "右侧", anchor_bottom_left: "左下角", anchor_bottom_right: "右下角",
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
    quit: "종료",
    show: "사용량 보기", settings: "설정", sDisplay: "표시", sMode: "모드", modeIsland: "아일랜드", modeTray: "트레이 아이콘", sMonitor: "모니터", monitorPrimary: "주 모니터", display: "디스플레이 {n}", primary: "주", sExpand: "아일랜드 열기", expandHover: "마우스 오버", expandClick: "클릭", sData: "데이터", sRefresh: "새로 고침 간격", minutes: "{n}분", sProviders: "제공자", sGeneral: "일반", sLanguage: "언어", langAuto: "시스템 기본값", sStartup: "로그인 시 실행",
    modeTaskbar: "작업 표시줄", dragHint: "팁: 아일랜드를 작업 표시줄이나 모니터의 모서리, 가장자리로 끌어 놓을 수 있습니다.",
    sPosition: "위치", anchor_top: "상단 (아일랜드)", anchor_top_left: "왼쪽 위", anchor_top_right: "오른쪽 위", anchor_left: "왼쪽 가장자리", anchor_right: "오른쪽 가장자리", anchor_bottom_left: "왼쪽 아래", anchor_bottom_right: "오른쪽 아래",
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
    quit: "Выход",
    show: "Показать использование", settings: "Настройки", sDisplay: "Отображение", sMode: "Режим", modeIsland: "Остров", modeTray: "Значок в трее", sMonitor: "Монитор", monitorPrimary: "Основной монитор", display: "Дисплей {n}", primary: "основной", sExpand: "Открывать остров по", expandHover: "Наведению", expandClick: "Клику", sData: "Данные", sRefresh: "Обновлять каждые", minutes: "{n} мин", sProviders: "Провайдеры", sGeneral: "Общие", sLanguage: "Язык", langAuto: "Как в системе", sStartup: "Запускать при входе",
    modeTaskbar: "Панель задач", dragHint: "Совет: перетащите остров на панель задач, в угол или к краю любого монитора.",
    sPosition: "Положение", anchor_top: "Сверху (остров)", anchor_top_left: "Левый верхний угол", anchor_top_right: "Правый верхний угол", anchor_left: "Левый край", anchor_right: "Правый край", anchor_bottom_left: "Левый нижний угол", anchor_bottom_right: "Правый нижний угол",
  },
};

function pickLocale() {
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (MESSAGES[base]) return { tag, lang: base };
  }
  return { tag: "en", lang: "en" };
}

export const LANGUAGES = {
  en: "English", pt: "Português", es: "Español", fr: "Français", de: "Deutsch",
  it: "Italiano", ja: "日本語", zh: "中文", ko: "한국어", ru: "Русский",
};

export let LOCALE = "en";
let LANG = "en";
let DAY, HOUR, MIN;

/** "auto" follows the system; otherwise one of LANGUAGES. */
export function setLanguage(pref = "auto") {
  ({ tag: LOCALE, lang: LANG } = MESSAGES[pref] ? { tag: pref, lang: pref } : pickLocale());
  document.documentElement.lang = LOCALE;
  const unit = (u) => new Intl.NumberFormat(LOCALE, { style: "unit", unit: u, unitDisplay: "narrow" });
  [DAY, HOUR, MIN] = [unit("day"), unit("hour"), unit("minute")];
}
setLanguage();

export function t(key, vars = {}) {
  const msg = MESSAGES[LANG][key] ?? MESSAGES.en[key] ?? key;
  return msg.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}


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
