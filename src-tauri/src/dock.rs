//! Taskbar mode: a widget laid over the Windows taskbar, just left of the notification
//! area, so it looks built in. Also handles dragging between the island and the taskbar.

use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewWindow};

use crate::settings::{Anchor, DisplayMode};
use crate::AppState;

pub const LABEL: &str = "dock";
const PILL_H: f64 = 32.0;
/// Room around the dragged pill for its tilt, stretch and shadow, in CSS px.
const DRAG_PAD: f64 = 100.0;
const GAP: i32 = 4;
/// How far from a slot (CSS px) the pill still snaps to it.
const SNAP: f64 = 160.0;
/// Fraction of the distance to a nearby slot the pill is pulled.
const MAGNET: f64 = 0.35;
/// Per-tick easing of the magnet offset (ticks are ~8 ms).
const MAGNET_EASE: f64 = 0.12;
pub const OVERLAY: &str = "overlay";

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl Rect {
    fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.left as f64 && x < self.right as f64 && y >= self.top as f64 && y < self.bottom as f64
    }
}

#[cfg(windows)]
mod win {
    use super::Rect;
    use windows_sys::Win32::Foundation::{HWND, RECT};
    use windows_sys::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        FindWindowExW, FindWindowW, GetWindowRect, IsWindowVisible, SetWindowPos, HWND_TOPMOST,
        SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    };

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    fn rect_of(hwnd: HWND) -> Option<Rect> {
        if hwnd.is_null() {
            return None;
        }
        let mut r = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        (unsafe { GetWindowRect(hwnd, &mut r) } != 0).then_some(Rect {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
        })
    }

    /// (taskbar, notification area) of the primary taskbar, if it is showing.
    pub fn taskbar() -> Option<(Rect, Rect)> {
        unsafe {
            let bar = FindWindowW(wide("Shell_TrayWnd").as_ptr(), std::ptr::null());
            if bar.is_null() || IsWindowVisible(bar) == 0 {
                return None;
            }
            let tray = FindWindowExW(bar, std::ptr::null_mut(), wide("TrayNotifyWnd").as_ptr(), std::ptr::null());
            Some((rect_of(bar)?, rect_of(tray)?))
        }
    }

    pub fn mouse_down() -> bool {
        unsafe { (GetAsyncKeyState(VK_LBUTTON as i32) as u16 & 0x8000) != 0 }
    }

    /// The taskbar is topmost too; whoever asserted it last wins.
    pub fn raise(hwnd: HWND) {
        unsafe {
            SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        }
    }

    pub fn taskbar_is_light() -> bool {
        let key = wide(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
        let value = wide("SystemUsesLightTheme");
        let mut data: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;
        let ok = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                key.as_ptr(),
                value.as_ptr(),
                RRF_RT_REG_DWORD,
                std::ptr::null_mut(),
                &mut data as *mut u32 as *mut _,
                &mut size,
            )
        };
        ok == 0 && data == 1
    }
}

#[cfg(not(windows))]
mod win {
    use super::Rect;
    pub fn taskbar() -> Option<(Rect, Rect)> {
        None
    }
    pub fn mouse_down() -> bool {
        false
    }
    pub fn taskbar_is_light() -> bool {
        false
    }
}

pub fn taskbar_is_light() -> bool {
    win::taskbar_is_light()
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(LABEL)
}

/// Docks the widget over the taskbar, left of the notification area.
fn place_docked(app: &AppHandle, win: &WebviewWindow) -> bool {
    let Some((bar, tray)) = win::taskbar() else { return false };
    let scale = win.scale_factor().unwrap_or(1.0);
    let width = (*app.state::<AppState>().dock_width.lock().unwrap() * scale).ceil() as i32;
    let height = bar.bottom - bar.top;
    let pos = PhysicalPosition::new(tray.left - width - GAP, bar.top);
    let size = PhysicalSize::new(width as u32, height as u32);
    if win.outer_position().ok() != Some(pos) {
        let _ = win.set_position(pos);
    }
    if win.outer_size().ok() != Some(size) {
        let _ = win.set_size(size);
    }
    #[cfg(windows)]
    if let Ok(hwnd) = win.hwnd() {
        win::raise(hwnd.0 as _);
    }
    true
}

/// Keeps the docked widget glued to the taskbar (it moves, resizes, and fights for z-order).
pub fn keep_docked(app: AppHandle) {
    loop {
        std::thread::sleep(Duration::from_millis(100));
        let state = app.state::<AppState>();
        let docked = state.settings.lock().unwrap().mode == DisplayMode::Taskbar;
        if !docked || *state.dragging.lock().unwrap() {
            continue;
        }
        let Some(win) = window(&app) else { continue };
        if place_docked(&app, &win) {
            if !win.is_visible().unwrap_or(false) {
                let _ = win.show();
            }
        } else if win.is_visible().unwrap_or(false) {
            // Taskbar hidden (auto-hide or a fullscreen app).
            let _ = win.hide();
        }
    }
}

pub fn show_docked(app: &AppHandle) {
    if let Some(win) = window(app) {
        let _ = app.emit_to(LABEL, "dock-floating", false);
        if place_docked(app, &win) {
            let _ = win.show();
        }
    }
}

pub fn hide(app: &AppHandle) {
    if let Some(win) = window(app) {
        let _ = win.hide();
    }
}

/// A place the dragged pill can land.
#[derive(Clone, Copy, PartialEq)]
enum Target {
    Taskbar,
    Anchor(Anchor),
}

impl Target {
    fn id(&self) -> String {
        match self {
            Target::Taskbar => "taskbar".into(),
            Target::Anchor(a) => serde_json::to_value(a).ok().and_then(|v| v.as_str().map(String::from)).unwrap_or_default(),
        }
    }
}

/// A drop slot, in CSS px relative to the overlay (the monitor's top-left corner).
#[derive(Clone, serde::Serialize)]
struct Slot {
    id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// Every drop slot on `monitor`, in physical px.
fn slots(monitor: &Monitor, pill_w: f64) -> Vec<(Target, (f64, f64, f64, f64))> {
    let s = monitor.scale_factor();
    // Slot sizes follow the island's shape there: a bar across the top, a vertical bar on
    // the sides, an L in the corners.
    let t = PILL_H * s;
    let (w, h) = (pill_w * s, t);
    let (side_w, side_h) = (t, (pill_w * 0.8).max(120.0) * s);
    let (corner_w, corner_h) = ((pill_w * 0.6).max(96.0) * s + t, t + 80.0 * s);
    let (mx, my, mw) = (monitor.position().x as f64, monitor.position().y as f64, monitor.size().width as f64);
    let wa = monitor.work_area();
    let (ax, ay) = (wa.position.x as f64, wa.position.y as f64);
    let (ar, ab) = (ax + wa.size.width as f64, ay + wa.size.height as f64);
    let mid = ay + (ab - ay - side_h) / 2.0;
    let mut out: Vec<(Target, (f64, f64, f64, f64))> = Anchor::ALL
        .iter()
        .map(|&a| {
            let rect = match a {
                Anchor::Top => (mx + (mw - w) / 2.0, my, w, h),
                Anchor::Left => (ax, mid, side_w, side_h),
                Anchor::Right => (ar - side_w, mid, side_w, side_h),
                Anchor::TopLeft => (ax, ay, corner_w, corner_h),
                Anchor::TopRight => (ar - corner_w, ay, corner_w, corner_h),
                Anchor::BottomLeft => (ax, ab - corner_h, corner_w, corner_h),
                Anchor::BottomRight => (ar - corner_w, ab - corner_h, corner_w, corner_h),
            };
            (Target::Anchor(a), rect)
        })
        .collect();
    if let Some((bar, tray)) = win::taskbar() {
        let (cx, cy) = ((bar.left + bar.right) as f64 / 2.0, (bar.top + bar.bottom) as f64 / 2.0);
        let inside = cx >= mx && cx < mx + mw && cy >= my && cy < my + monitor.size().height as f64;
        if inside {
            let bh = (bar.bottom - bar.top) as f64;
            out.push((Target::Taskbar, (tray.left as f64 - w - GAP as f64, bar.top as f64, w, bh)));
        }
    }
    out
}

/// The slot the cursor snaps to: inside the taskbar, or the nearest slot within reach.
fn nearest(monitor: &Monitor, slots: &[(Target, (f64, f64, f64, f64))], x: f64, y: f64) -> Option<Target> {
    if let Some((bar, _)) = win::taskbar() {
        if bar.contains(x, y) && slots.iter().any(|(t, _)| *t == Target::Taskbar) {
            return Some(Target::Taskbar);
        }
    }
    let reach = SNAP * monitor.scale_factor();
    slots
        .iter()
        .map(|(t, (sx, sy, sw, sh))| {
            let dx = (sx - x).max(0.0).max(x - (sx + sw));
            let dy = (sy - y).max(0.0).max(y - (sy + sh));
            (*t, dx.hypot(dy))
        })
        .filter(|(_, d)| *d <= reach)
        .min_by(|a, b| a.1.total_cmp(&b.1))
        .map(|(t, _)| t)
}

/// Shows the drop-slot overlay on `monitor` and tells it where the slots are.
fn show_overlay(app: &AppHandle, monitor: &Monitor, slots: &[(Target, (f64, f64, f64, f64))]) {
    let Some(overlay) = app.get_webview_window(OVERLAY) else { return };
    let s = monitor.scale_factor();
    let (mx, my) = (monitor.position().x as f64, monitor.position().y as f64);
    let _ = overlay.set_position(*monitor.position());
    let _ = overlay.set_size(*monitor.size());
    let payload: Vec<Slot> = slots
        .iter()
        .map(|(t, (x, y, w, h))| Slot {
            id: t.id(),
            x: (x - mx) / s,
            y: (y - my) / s,
            w: w / s,
            h: h / s,
        })
        .collect();
    let _ = app.emit_to(OVERLAY, "overlay-slots", payload);
    let _ = overlay.set_ignore_cursor_events(true);
    let _ = overlay.show();
}

fn hide_overlay(app: &AppHandle) {
    let _ = app.emit_to(OVERLAY, "overlay-slots", Vec::<Slot>::new());
    if let Some(o) = app.get_webview_window(OVERLAY) {
        let _ = o.hide();
    }
}

/// Turns the island or the docked widget into a pill that follows the cursor until release.
pub fn start_drag(app: &AppHandle, width: f64) {
    let state = app.state::<AppState>();
    {
        let mut dragging = state.dragging.lock().unwrap();
        if *dragging {
            return;
        }
        *dragging = true;
    }
    if let Some(main) = app.get_webview_window(crate::island::LABEL) {
        let _ = main.hide();
    }
    let Some(win) = window(app) else { return };
    let _ = app.emit_to(LABEL, "dock-floating", true);
    let app = app.clone();
    std::thread::spawn(move || {
        let mut target: Option<Target> = None;
        let mut first = true;
        let mut last: Option<(f64, f64, std::time::Instant)> = None;
        let mut current_monitor: Option<String> = None;
        let mut current_slots = Vec::new();
        // Magnet offset from the cursor, eased over time so it never jumps.
        let mut pull = (0.0_f64, 0.0_f64);
        loop {
            let Ok(cursor) = app.cursor_position() else { break };
            let Some(monitor) = app.monitor_from_point(cursor.x, cursor.y).ok().flatten() else {
                std::thread::sleep(Duration::from_millis(8));
                continue;
            };
            let scale = monitor.scale_factor();

            // The overlay follows the cursor to whichever monitor it is on.
            if monitor.name() != current_monitor.as_ref() {
                current_monitor = monitor.name().cloned();
                current_slots = slots(&monitor, width);
                show_overlay(&app, &monitor, &current_slots);
                target = None;
            }

            let t = nearest(&monitor, &current_slots, cursor.x, cursor.y);

            // Magnetism: the pull toward the nearest slot grows smoothly as the pill closes in
            // (zero at the edge of reach), and the offset eases toward it frame by frame.
            let mut goal = (0.0, 0.0);
            if let Some((_, (sx, sy, sw, sh))) = t.and_then(|t| current_slots.iter().find(|(s, _)| *s == t)) {
                let dx = (sx - cursor.x).max(0.0).max(cursor.x - (sx + sw));
                let dy = (sy - cursor.y).max(0.0).max(cursor.y - (sy + sh));
                let near = (1.0 - dx.hypot(dy) / (SNAP * scale)).clamp(0.0, 1.0);
                let strength = MAGNET * near * near * (3.0 - 2.0 * near);
                goal = (
                    (sx + sw / 2.0 - cursor.x) * strength,
                    (sy + sh / 2.0 - cursor.y) * strength,
                );
            }
            pull.0 += (goal.0 - pull.0) * MAGNET_EASE;
            pull.1 += (goal.1 - pull.1) * MAGNET_EASE;
            let (px, py) = (cursor.x + pull.0, cursor.y + pull.1);
            let (w, h) = ((width + DRAG_PAD * 2.0) * scale, (PILL_H + DRAG_PAD * 2.0) * scale);
            let _ = win.set_size(PhysicalSize::new(w.ceil() as u32, h.ceil() as u32));
            let _ = win.set_position(PhysicalPosition::new(
                (px - w / 2.0).round() as i32,
                (py - h / 2.0).round() as i32,
            ));
            if first {
                let _ = win.show();
                first = false;
            }
            #[cfg(windows)]
            if let Ok(hwnd) = win.hwnd() {
                win::raise(hwnd.0 as _);
            }

            // Cursor velocity in CSS px/s drives the pill's tilt, stretch and motion blur.
            let now = std::time::Instant::now();
            if let Some((lx, ly, lt)) = last {
                let dt = now.duration_since(lt).as_secs_f64().max(0.001);
                let v = ((cursor.x - lx) / dt / scale, (cursor.y - ly) / dt / scale);
                let _ = app.emit_to(LABEL, "dock-velocity", v);
            }
            last = Some((cursor.x, cursor.y, now));

            if t != target {
                target = t;
                let id = t.map(|t| t.id());
                let _ = app.emit_to(OVERLAY, "overlay-active", &id);
                let _ = app.emit_to(LABEL, "dock-zone", if id.is_some() { "snap" } else { "none" });
            }
            if !win::mouse_down() {
                finish_drag(&app, target, current_monitor.clone());
                break;
            }
            std::thread::sleep(Duration::from_millis(8));
        }
        hide_overlay(&app);
        *app.state::<AppState>().dragging.lock().unwrap() = false;
    });
}

fn finish_drag(app: &AppHandle, target: Option<Target>, monitor: Option<String>) {
    let state = app.state::<AppState>();
    {
        let mut settings = state.settings.lock().unwrap();
        match target {
            Some(Target::Taskbar) => settings.mode = DisplayMode::Taskbar,
            Some(Target::Anchor(a)) => {
                settings.mode = DisplayMode::Island;
                settings.anchor = a;
                settings.monitor = monitor;
            }
            None => {}
        }
        let _ = crate::settings::save(&settings);
    }
    let _ = app.emit_to(LABEL, "dock-zone", "none");
    hide_overlay(app);
    *state.dragging.lock().unwrap() = false;
    crate::apply_settings(app);
    // Whichever window receives the pill plays its landing animation.
    let _ = app.emit("drop-enter", ());
}
