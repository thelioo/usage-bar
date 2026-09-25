//! The Dynamic Island window: a fixed transparent canvas glued to the top edge of one
//! monitor, with pixel-exact hit testing so clicks outside the island pass through.

use std::time::Duration;

use tauri::{AppHandle, Emitter, LogicalSize, Manager, Monitor, PhysicalPosition, WebviewWindow};

use crate::settings::Anchor;
use crate::AppState;

pub const LABEL: &str = "main";
const WINDOW_W: f64 = 600.0;
const WINDOW_H: f64 = 700.0;
const HOVER_POLL: Duration = Duration::from_millis(16);

/// A concave fillet joining the island to a screen edge: the square at (x, y) of side
/// `size`, filled outside the circle of radius `size` centered at (cx, cy).
#[derive(Default, Clone, Copy, serde::Deserialize)]
pub struct Ear {
    x: f64,
    y: f64,
    size: f64,
    cx: f64,
    cy: f64,
}

/// A rounded rectangle; radii are top-left, top-right, bottom-right, bottom-left.
#[derive(Default, Clone, Copy, serde::Deserialize)]
pub struct RRect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    radii: [f64; 4],
}

impl RRect {
    fn contains(&self, px: f64, py: f64) -> bool {
        let (l, r, t, b) = (self.x, self.x + self.w, self.y, self.y + self.h);
        if px < l || px > r || py < t || py > b {
            return false;
        }
        let left = px < l + self.w / 2.0;
        let top = py < t + self.h / 2.0;
        let corner = match (top, left) {
            (true, true) => 0,
            (true, false) => 1,
            (false, false) => 2,
            (false, true) => 3,
        };
        let rad = self.radii[corner].min(self.w / 2.0).min(self.h / 2.0);
        let cx = if left { l + rad } else { r - rad };
        let cy = if top { t + rad } else { b - rad };
        let in_corner = (if left { px < cx } else { px > cx }) && (if top { py < cy } else { py > cy });
        !in_corner || (px - cx).hypot(py - cy) <= rad
    }
}

/// Live island geometry in CSS pixels relative to the window, reported by the frontend
/// every frame while it animates: the union of its arms and its concave ears/fillets.
#[derive(Default, Clone, serde::Deserialize)]
pub struct Shape {
    rects: Vec<RRect>,
    ears: Vec<Ear>,
}

impl Shape {
    pub fn contains(&self, px: f64, py: f64) -> bool {
        self.rects.iter().any(|r| r.contains(px, py))
            || self.ears.iter().any(|e| {
                px >= e.x && px <= e.x + e.size && py >= e.y && py <= e.y + e.size
                    && (px - e.cx).hypot(py - e.cy) >= e.size
            })
    }
}

/// The monitor chosen in settings, falling back to the primary one.
pub fn target_monitor(app: &AppHandle, name: Option<&str>) -> Option<Monitor> {
    let monitors = app.available_monitors().unwrap_or_default();
    name.and_then(|n| monitors.iter().find(|m| m.name().map(String::as_str) == Some(n)).cloned())
        .or_else(|| app.primary_monitor().ok().flatten())
        .or_else(|| monitors.into_iter().next())
}

/// Places the canvas so the island sits flush against the screen edges of `anchor`.
/// The canvas never extends past those edges (it would spill onto a neighboring monitor);
/// the shadow gets its room on the free sides.
pub fn place(window: &WebviewWindow, monitor: &Monitor, anchor: Anchor) {
    let s = monitor.scale_factor();
    let (w, h) = (WINDOW_W * s, WINDOW_H * s);
    let mon = (monitor.position().x as f64, monitor.position().y as f64, monitor.size().width as f64);
    let wa = monitor.work_area();
    let (ax, ay) = (wa.position.x as f64, wa.position.y as f64);
    let (ar, ab) = (ax + wa.size.width as f64, ay + wa.size.height as f64);
    let middle = ay + (ab - ay) / 2.0 - h / 2.0;
    let center = ax + (ar - ax) / 2.0 - w / 2.0;
    let (x, y) = match anchor {
        Anchor::Top => (mon.0 + (mon.2 - w) / 2.0, mon.1),
        Anchor::Left => (ax, middle),
        Anchor::Right => (ar - w, middle),
        Anchor::Bottom => (center, ab - h),
    };
    let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
    // Size after moving so it is computed with the target monitor's scale factor.
    let _ = window.set_size(LogicalSize::new(WINDOW_W, WINDOW_H));
}

/// Keeps the island visible while Aero Peek previews a window from the taskbar.
#[cfg(windows)]
pub fn exclude_from_peek(window: &WebviewWindow) {
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
pub fn track_hover(app: AppHandle) {
    let mut hovered = false;
    let _ = app.get_webview_window(LABEL).map(|w| w.set_ignore_cursor_events(true));
    loop {
        std::thread::sleep(HOVER_POLL);
        let Some(win) = app.get_webview_window(LABEL) else { continue };
        if !win.is_visible().unwrap_or(false) {
            continue;
        }
        let (Ok(cursor), Ok(pos), Ok(scale)) =
            (app.cursor_position(), win.outer_position(), win.scale_factor())
        else {
            continue;
        };
        let shape = app.state::<AppState>().hit.lock().unwrap().clone();
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

