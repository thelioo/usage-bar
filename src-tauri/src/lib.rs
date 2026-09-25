mod model;
mod providers;
mod sources;

use std::sync::Mutex;
use std::time::Duration;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, WebviewWindow, Wry};

use model::Snapshot;

const REFRESH_EVERY: Duration = Duration::from_secs(5 * 60);
const WINDOW_W: f64 = 440.0;
const WINDOW_H: f64 = 600.0;
const HOVER_POLL: Duration = Duration::from_millis(16);

/// Live island geometry in CSS pixels relative to the window, reported by the frontend
/// every frame while it animates. The island hangs from the top edge (y = 0).
#[derive(Default, Clone, Copy, serde::Deserialize)]
struct Shape {
    x: f64,
    w: f64,
    h: f64,
    /// Radius of the two bottom corners.
    radius: f64,
    /// Size of the concave "ears" that join the island to the screen edge.
    ear: f64,
}

impl Shape {
    /// Exact hit test against the drawn shape: rounded bottom corners and concave ears.
    fn contains(&self, px: f64, py: f64) -> bool {
        let (left, right) = (self.x, self.x + self.w);
        if py < 0.0 || py > self.h {
            return false;
        }
        if px >= left && px <= right {
            let r = self.radius.min(self.w / 2.0).min(self.h);
            let cy = self.h - r;
            if py <= cy {
                return true;
            }
            let cx = if px < left + r {
                left + r
            } else if px > right - r {
                right - r
            } else {
                return true;
            };
            return (px - cx).hypot(py - cy) <= r;
        }
        // Ears: black outside a circle centered at the ear's bottom outer corner.
        let e = self.ear;
        if py > e {
            return false;
        }
        let cx = if px >= left - e && px < left {
            left - e
        } else if px > right && px <= right + e {
            right + e
        } else {
            return false;
        };
        (px - cx).hypot(py - e) >= e
    }
}

#[derive(Default)]
struct AppState {
    snapshot: Mutex<Snapshot>,
    hit: Mutex<Shape>,
    tray_items: Mutex<Option<(MenuItem<Wry>, MenuItem<Wry>, MenuItem<Wry>)>>,
}

#[tauri::command]
fn get_usage(state: tauri::State<AppState>) -> Snapshot {
    state.snapshot.lock().unwrap().clone()
}

#[tauri::command]
async fn refresh(app: AppHandle) -> Snapshot {
    do_refresh(&app).await
}

/// Tray menu labels come from the frontend, which owns the translations.
#[tauri::command]
fn set_tray_labels(state: tauri::State<AppState>, toggle: String, refresh: String, quit: String) {
    if let Some(items) = state.tray_items.lock().unwrap().as_ref() {
        let _ = items.0.set_text(toggle);
        let _ = items.1.set_text(refresh);
        let _ = items.2.set_text(quit);
    }
}

#[tauri::command]
fn set_hit_shape(state: tauri::State<AppState>, shape: Shape) {
    *state.hit.lock().unwrap() = shape;
}

/// The window is a fixed transparent canvas glued to the top edge of the monitor.
fn place_window(window: &WebviewWindow) {
    let _ = window.set_size(LogicalSize::new(WINDOW_W, WINDOW_H));
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten());
    if let Some(m) = monitor {
        let scale = m.scale_factor();
        let x = m.position().x as f64 + (m.size().width as f64 - WINDOW_W * scale) / 2.0;
        let y = m.position().y as f64;
        let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
    }
}

/// Keeps the island visible while Aero Peek previews a window from the taskbar.
#[cfg(windows)]
fn exclude_from_peek(window: &WebviewWindow) {
    use windows_sys::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_EXCLUDED_FROM_PEEK};
    let Ok(hwnd) = window.hwnd() else { return };
    let value: i32 = 1;
    unsafe {
        DwmSetWindowAttribute(
            hwnd.0 as _,
            DWMWA_EXCLUDED_FROM_PEEK as u32,
            &value as *const i32 as *const _,
            std::mem::size_of::<i32>() as u32,
        );
    }
}

/// Transparent pixels would still swallow clicks, so the window ignores the mouse
/// unless the cursor is over the island; hover changes are forwarded to the frontend.
fn track_hover(app: AppHandle) {
    let mut hovered = false;
    let _ = app.get_webview_window("main").map(|w| w.set_ignore_cursor_events(true));
    loop {
        std::thread::sleep(HOVER_POLL);
        let Some(win) = app.get_webview_window("main") else { continue };
        if !win.is_visible().unwrap_or(false) {
            continue;
        }
        let (Ok(cursor), Ok(pos), Ok(scale)) =
            (app.cursor_position(), win.outer_position(), win.scale_factor())
        else {
            continue;
        };
        let shape = *app.state::<AppState>().hit.lock().unwrap();
        let x = (cursor.x - pos.x as f64) / scale;
        let y = (cursor.y - pos.y as f64) / scale;
        let inside = shape.contains(x, y);
        if inside != hovered {
            hovered = inside;
            let _ = win.set_ignore_cursor_events(!inside);
            let _ = app.emit("island-hover", inside);
        }
    }
}

async fn do_refresh(app: &AppHandle) -> Snapshot {
    let found = tauri::async_runtime::spawn_blocking(sources::discover)
        .await
        .unwrap_or_default();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .expect("http client");
    let snapshot = Snapshot {
        accounts: providers::fetch_all(&client, &found).await,
        updated_at: Some(chrono::Utc::now()),
    };
    *app.state::<AppState>().snapshot.lock().unwrap() = snapshot.clone();
    let _ = app.emit("usage-updated", &snapshot);
    snapshot
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![get_usage, refresh, set_hit_shape, set_tray_labels])
        .setup(|app| {
            let toggle = MenuItem::with_id(app, "toggle", "Show/hide island", true, None::<&str>)?;
            let refresh_item = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &refresh_item, &quit_item])?;
            *app.state::<AppState>().tray_items.lock().unwrap() =
                Some((toggle.clone(), refresh_item.clone(), quit_item.clone()));

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Usage Bar")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                            }
                        }
                    }
                    "refresh" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move { do_refresh(&app).await });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            if let Some(win) = app.get_webview_window("main") {
                place_window(&win);
                #[cfg(windows)]
                exclude_from_peek(&win);
                let _ = win.show();
            }
            let handle = app.handle().clone();
            std::thread::spawn(move || track_hover(handle));

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    do_refresh(&handle).await;
                    tokio::time::sleep(REFRESH_EVERY).await;
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running usage-bar");
}
