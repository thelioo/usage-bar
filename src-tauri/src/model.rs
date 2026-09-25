use chrono::{DateTime, Utc};
use serde::Serialize;

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
    pub provider: String,
    /// Where the credentials were found, e.g. "Windows" or "WSL: Ubuntu".
    pub sources: Vec<String>,
    pub email: Option<String>,
    pub plan: Option<String>,
    pub windows: Vec<UsageWindow>,
    /// A balance, or "unlimited".
    pub credits: Option<String>,
    /// An error code ("token_expired", "token_invalid", "bad_response", "http_<status>")
    /// or a raw network error message.
    pub error: Option<String>,
}

impl AccountUsage {
    pub fn new(provider: &str, source: &str) -> Self {
        Self {
            provider: provider.into(),
            sources: vec![source.into()],
            email: None,
            plan: None,
            windows: vec![],
            credits: None,
            error: None,
        }
    }

    pub fn failed(provider: &str, source: &str, error: impl Into<String>) -> Self {
        let mut a = Self::new(provider, source);
        a.error = Some(error.into());
        a
    }
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct Snapshot {
    pub accounts: Vec<AccountUsage>,
    pub updated_at: Option<DateTime<Utc>>,
}
