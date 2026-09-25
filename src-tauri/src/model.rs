use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::accounts::Provider;

#[derive(Debug, Clone, Serialize)]
pub struct UsageWindow {
    /// "session", "weekly", "weekly_opus", "weekly_sonnet" or "window"; translated by the frontend.
    pub kind: String,
    pub window_seconds: Option<i64>,
    pub used_percent: f64,
    pub resets_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AccountUsage {
    /// Vault slot id; stable across token refreshes.
    pub id: String,
    pub provider: Provider,
    pub email: Option<String>,
    pub alias: Option<String>,
    pub plan: Option<String>,
    pub org: Option<String>,
    /// Whether this account is the one signed in to the CLI.
    pub active: bool,
    /// Where it is signed in, e.g. "Windows" or "WSL: Ubuntu".
    pub sources: Vec<String>,
    pub windows: Vec<UsageWindow>,
    /// A balance, or "unlimited".
    pub credits: Option<String>,
    /// An error code ("token_expired", "token_invalid", "bad_response", "http_<status>")
    /// or a raw network error message.
    pub error: Option<String>,
    /// The numbers are the last ones known (the saved token can't be used right now); windows
    /// whose reset time has passed are shown as empty.
    pub stale: bool,
    pub fetched_at: Option<DateTime<Utc>>,
}

impl AccountUsage {
    /// The highest usage across windows: what the balancer compares against its threshold.
    pub fn peak(&self) -> Option<f64> {
        self.windows.iter().map(|w| w.used_percent).reduce(f64::max)
    }
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct Snapshot {
    pub accounts: Vec<AccountUsage>,
    pub updated_at: Option<DateTime<Utc>>,
}
