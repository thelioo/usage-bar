//! User preferences, persisted as JSON in the app config directory.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Must match `identifier` in tauri.conf.json.
const IDENTIFIER: &str = "dev.thelio.usagebar";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DisplayMode {
    /// Dynamic Island hanging from the top edge of one monitor.
    Island,
    /// A widget laid over the taskbar, next to the notification area.
    Taskbar,
    /// Tray icon only; clicking it opens a panel above the taskbar.
    Tray,
}

/// Where the island sits on its monitor.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Anchor {
    /// Hanging from the top edge, like a notch.
    Top,
    Left,
    Right,
    /// Sitting on the bottom of the work area, just above the taskbar.
    Bottom,
}

impl Anchor {
    pub const ALL: [Anchor; 4] = [Anchor::Top, Anchor::Left, Anchor::Right, Anchor::Bottom];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExpandOn {
    Hover,
    Click,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Providers {
    pub claude: bool,
    pub codex: bool,
}

impl Default for Providers {
    fn default() -> Self {
        Self { claude: true, codex: true }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub mode: DisplayMode,
    /// Monitor name as reported by the OS; `None` follows the primary monitor.
    pub monitor: Option<String>,
    #[serde(deserialize_with = "lenient_anchor")]
    pub anchor: Anchor,
    pub expand_on: ExpandOn,
    pub refresh_minutes: u32,
    pub providers: Providers,
    /// "auto" follows the system language.
    pub language: String,
    pub launch_at_login: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            mode: DisplayMode::Island,
            monitor: None,
            anchor: Anchor::Top,
            expand_on: ExpandOn::Hover,
            refresh_minutes: 5,
            providers: Providers::default(),
            language: "auto".into(),
            launch_at_login: false,
        }
    }
}

/// Same place as Tauri's app config dir, but usable before the app is built,
/// so settings are ready before any window can ask for them.
/// Anchors that no longer exist (older versions had corners) fall back to the top.
fn lenient_anchor<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Anchor, D::Error> {
    let value = serde_json::Value::deserialize(d)?;
    Ok(serde_json::from_value(value).unwrap_or(Anchor::Top))
}

fn path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join(IDENTIFIER).join("settings.json"))
}

pub fn load() -> Settings {
    path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(settings: &Settings) -> Result<(), String> {
    let p = path().ok_or("no config dir")?;
    if let Some(dir) = p.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(p, json).map_err(|e| e.to_string())
}
