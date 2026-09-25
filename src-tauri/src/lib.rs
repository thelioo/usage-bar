mod dock;
mod island;
mod model;
mod panel;
mod providers;
mod settings;
mod sources;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WindowEvent, Wry};
use tauri_plugin_autostart::ManagerExt;

use model::Snapshot;
use settings::{DisplayMode, Settings};

const SETTINGS_LABEL: &str = "settings";
const MENU_IDS: [&str; 4] = ["show", "refresh", "settings", "quit"];

pub struct AppState {
    snapshot: Mutex<Snapshot>,
    settings: Mutex<Settings>,
    hit: Mutex<island::Shape>,
    tray_items: Mutex<Vec<MenuItem<Wry>>>,
    /// Physical center of the tray icon from the last click.
    tray_anchor: Mutex<Option<(f64, f64)>>,
    panel_height: Mutex<f64>,
    panel_hidden_at: Mutex<Option<Instant>>,
    /// Content width of the taskbar widget, in CSS px.
    dock_width: Mutex<f64>,
    dragging: Mutex<bool>,
}

#[tauri::command]
fn get_usage(state: tauri::State<AppState>) -> Snapshot {
    state.snapshot.lock().unwrap().clone()
}

#[tauri::command]
async fn refresh(app: AppHandle) -> Snapshot {
    do_refresh(&app).await
}

#[tauri::command]
fn get_settings(state: tauri::State<AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
async fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    settings::save(&settings)?;
    let previous = std::mem::replace(&mut *app.state::<AppState>().settings.lock().unwrap(), settings.clone());
    apply_settings(&app);
    let providers_changed = previous.providers.claude != settings.providers.claude
        || previous.providers.codex != settings.providers.codex;
    if providers_changed {
        do_refresh(&app).await;
    }
    Ok(())
}

#[derive(Serialize)]
struct MonitorInfo {
    name: String,
    width: u32,
    height: u32,
    primary: bool,
}

#[tauri::command]
fn list_monitors(app: AppHandle) -> Vec<MonitorInfo> {
    let primary = app.primary_monitor().ok().flatten().and_then(|m| m.name().cloned());
    app.available_monitors()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|m| {
            let name = m.name()?.clone();
            Some(MonitorInfo {
                primary: primary.as_ref() == Some(&name),
                width: m.size().width,
                height: m.size().height,
                name,
            })
        })
        .collect()
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    show_settings(&app);
}

#[tauri::command]
fn set_panel_height(app: AppHandle, height: f64) {
    *app.state::<AppState>().panel_height.lock().unwrap() = height;
    panel::place(&app);
}

#[tauri::command]
fn start_drag(app: AppHandle, width: f64) {
    dock::start_drag(&app, width);
}

#[tauri::command]
fn set_dock_width(app: AppHandle, width: f64) {
    *app.state::<AppState>().dock_width.lock().unwrap() = width;
}

#[tauri::command]
fn dock_clicked(app: AppHandle) {
    if let Some(w) = app.get_webview_window(dock::LABEL) {
        if let (Ok(pos), Ok(size)) = (w.outer_position(), w.outer_size()) {
            *app.state::<AppState>().tray_anchor.lock().unwrap() = Some((
                pos.x as f64 + size.width as f64 / 2.0,
                pos.y as f64 + size.height as f64 / 2.0,
            ));
        }
    }
    panel::toggle(&app);
}

#[tauri::command]
fn taskbar_theme() -> &'static str {
    if dock::taskbar_is_light() { "light" } else { "dark" }
}

#[tauri::command]
fn set_hit_shape(state: tauri::State<AppState>, shape: island::Shape) {
    *state.hit.lock().unwrap() = shape;
}

/// Tray menu labels come from the frontend, which owns the translations.
#[tauri::command]
fn set_tray_labels(state: tauri::State<AppState>, labels: HashMap<String, String>) {
    for item in state.tray_items.lock().unwrap().iter() {
        if let Some(text) = labels.get(item.id().as_ref()) {
            let _ = item.set_text(text);
        }
    }
}

fn show_settings(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(SETTINGS_LABEL) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Shows the right window for the display mode, on the chosen monitor.
pub(crate) fn apply_settings(app: &AppHandle) {
    let settings = app.state::<AppState>().settings.lock().unwrap().clone();
    if let Some(main) = app.get_webview_window(island::LABEL) {
        if settings.mode == DisplayMode::Island {
            if let Some(m) = island::target_monitor(app, settings.monitor.as_deref()) {
                island::place(&main, &m, settings.anchor);
            }
            let _ = main.show();
            if let Some(p) = app.get_webview_window(panel::LABEL) {
                let _ = p.hide();
            }
        } else {
            let _ = main.hide();
        }
    }
    if settings.mode == DisplayMode::Taskbar {
        dock::show_docked(app);
    } else {
        dock::hide(app);
    }
    let autolaunch = app.autolaunch();
    if autolaunch.is_enabled().unwrap_or(false) != settings.launch_at_login {
        let _ = if settings.launch_at_login { autolaunch.enable() } else { autolaunch.disable() };
    }
    let _ = app.emit("settings-changed", &settings);
}

fn show_usage(app: &AppHandle) {
    let mode = app.state::<AppState>().settings.lock().unwrap().mode;
    match mode {
        DisplayMode::Tray => panel::toggle(app),
        DisplayMode::Taskbar => dock_clicked(app.clone()),
        DisplayMode::Island => {
            if let Some(w) = app.get_webview_window(island::LABEL) {
                let visible = w.is_visible().unwrap_or(false);
                let _ = if visible { w.hide() } else { w.show() };
            }
        }
    }
}

async fn do_refresh(app: &AppHandle) -> Snapshot {
    let enabled = app.state::<AppState>().settings.lock().unwrap().providers.clone();
    let found = tauri::async_runtime::spawn_blocking(sources::discover)
        .await
        .unwrap_or_default();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .expect("http client");
    let snapshot = Snapshot {
        accounts: providers::fetch_all(&client, &found, &enabled).await,
        updated_at: Some(chrono::Utc::now()),
    };
    *app.state::<AppState>().snapshot.lock().unwrap() = snapshot.clone();
    let _ = app.emit("usage-updated", &snapshot);
    snapshot
}

/// Refreshes on the interval from settings, re-reading it so changes apply without a restart.
async fn refresh_loop(app: AppHandle) {
    loop {
        do_refresh(&app).await;
        let started = Instant::now();
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let minutes = app.state::<AppState>().settings.lock().unwrap().refresh_minutes.max(1);
            if started.elapsed() >= Duration::from_secs(minutes as u64 * 60) {
                break;
            }
        }
    }
}

pub fn run() {
    // Managed before the builder runs: config windows load (and call commands) before `setup`.
    let state = AppState {
        snapshot: Mutex::default(),
        settings: Mutex::new(settings::load()),
        hit: Mutex::default(),
        tray_items: Mutex::default(),
        tray_anchor: Mutex::default(),
        panel_height: Mutex::new(320.0),
        panel_hidden_at: Mutex::default(),
        dock_width: Mutex::new(160.0),
        dragging: Mutex::default(),
    };
    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            get_usage,
            refresh,
            get_settings,
            save_settings,
            list_monitors,
            open_settings,
            set_panel_height,
            set_hit_shape,
            set_tray_labels,
            start_drag,
            set_dock_width,
            dock_clicked,
            taskbar_theme
        ])
        .setup(|app| {
            let handle = app.handle();

            let defaults = ["Show usage", "Refresh", "Settings…", "Quit"];
            let items = MENU_IDS
                .iter()
                .zip(defaults)
                .map(|(id, text)| MenuItem::with_id(app, *id, text, true, None::<&str>))
                .collect::<Result<Vec<_>, _>>()?;
            let refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> =
                items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<Wry>).collect();
            let menu = Menu::with_items(app, &refs)?;
            *app.state::<AppState>().tray_items.lock().unwrap() = items;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Usage Bar")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_usage(app),
                    "refresh" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move { do_refresh(&app).await });
                    }
                    "settings" => show_settings(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let pos = rect.position.to_physical::<f64>(1.0);
                        let size = rect.size.to_physical::<f64>(1.0);
                        *app.state::<AppState>().tray_anchor.lock().unwrap() =
                            Some((pos.x + size.width / 2.0, pos.y + size.height / 2.0));
                        show_usage(app);
                    }
                })
                .build(app)?;

            for label in [island::LABEL, dock::LABEL, dock::OVERLAY] {
                if let Some(win) = app.get_webview_window(label) {
                    #[cfg(windows)]
                    island::exclude_from_peek(&win);
                }
            }
            if let Some(win) = app.get_webview_window(panel::LABEL) {
                let handle = handle.clone();
                win.on_window_event(move |e| {
                    if let WindowEvent::Focused(false) = e {
                        panel::on_blur(&handle);
                    }
                });
            }
            if let Some(win) = app.get_webview_window(SETTINGS_LABEL) {
                let w = win.clone();
                win.on_window_event(move |e| {
                    if let WindowEvent::CloseRequested { api, .. } = e {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                });
            }

            apply_settings(handle);

            let h = handle.clone();
            std::thread::spawn(move || island::track_hover(h));
            let h = handle.clone();
            std::thread::spawn(move || dock::keep_docked(h));
            tauri::async_runtime::spawn(refresh_loop(handle.clone()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running usage-bar");
}
