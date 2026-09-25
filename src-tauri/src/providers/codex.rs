//! Codex usage from a saved ChatGPT login.

use chrono::{TimeZone, Utc};
use serde::Deserialize;

use crate::model::UsageWindow;

#[derive(Deserialize)]
struct Usage {
    rate_limit: Option<RateLimit>,
    credits: Option<Credits>,
}

#[derive(Deserialize)]
struct RateLimit {
    primary_window: Option<Window>,
    secondary_window: Option<Window>,
}

#[derive(Deserialize)]
struct Window {
    used_percent: f64,
    limit_window_seconds: Option<i64>,
    reset_at: Option<i64>,
}

#[derive(Deserialize)]
struct Credits {
    has_credits: Option<bool>,
    unlimited: Option<bool>,
    balance: Option<String>,
}

pub struct CodexUsage {
    pub windows: Vec<UsageWindow>,
    pub credits: Option<String>,
}

/// Fetches the usage windows, or an error code (see `model::AccountUsage::error`).
pub async fn fetch(client: &reqwest::Client, token: &str, account_id: Option<&str>) -> Result<CodexUsage, String> {
    let mut req = client
        .get("https://chatgpt.com/backend-api/wham/usage")
        .bearer_auth(token)
        .header("User-Agent", "codex-cli");
    if let Some(id) = account_id {
        req = req.header("ChatGPT-Account-Id", id);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    if resp.status() == 401 || resp.status() == 403 {
        return Err("token_invalid".into());
    }
    if resp.status() == 429 {
        return Err(super::rate_limited(&resp));
    }
    if !resp.status().is_success() {
        return Err(format!("http_{}", resp.status().as_u16()));
    }
    let usage: Usage = resp.json().await.map_err(|_| "bad_response".to_string())?;
    let windows = usage
        .rate_limit
        .map(|rl| {
            [rl.primary_window, rl.secondary_window]
                .into_iter()
                .flatten()
                .map(|w| UsageWindow {
                    kind: window_kind(w.limit_window_seconds).into(),
                    window_seconds: w.limit_window_seconds,
                    used_percent: w.used_percent,
                    resets_at: w.reset_at.and_then(|t| Utc.timestamp_opt(t, 0).single()),
                })
                .collect()
        })
        .unwrap_or_default();
    let credits = usage.credits.and_then(|c| {
        if c.unlimited == Some(true) {
            Some("unlimited".into())
        } else if c.has_credits == Some(true) {
            c.balance
        } else {
            None
        }
    });
    Ok(CodexUsage { windows, credits })
}

fn window_kind(seconds: Option<i64>) -> &'static str {
    match seconds {
        Some(18_000) => "session",
        Some(604_800) => "weekly",
        _ => "window",
    }
}
