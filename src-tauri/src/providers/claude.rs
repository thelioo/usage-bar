//! Claude usage from a saved login's OAuth token.

use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::model::UsageWindow;

#[derive(Deserialize)]
struct Usage {
    five_hour: Option<Window>,
    seven_day: Option<Window>,
    seven_day_opus: Option<Window>,
    seven_day_sonnet: Option<Window>,
}

#[derive(Deserialize)]
struct Window {
    utilization: Option<f64>,
    resets_at: Option<DateTime<Utc>>,
}

/// Fetches the usage windows, or an error code (see `model::AccountUsage::error`).
pub async fn fetch(client: &reqwest::Client, token: &str) -> Result<Vec<UsageWindow>, String> {
    let resp = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .bearer_auth(token)
        .header("anthropic-beta", "oauth-2025-04-20")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if resp.status() == 401 {
        return Err("token_invalid".into());
    }
    if resp.status() == 429 {
        return Err(super::rate_limited(&resp));
    }
    if !resp.status().is_success() {
        return Err(format!("http_{}", resp.status().as_u16()));
    }
    let u: Usage = resp.json().await.map_err(|_| "bad_response".to_string())?;
    let windows = [
        ("session", u.five_hour),
        ("weekly", u.seven_day),
        ("weekly_opus", u.seven_day_opus),
        ("weekly_sonnet", u.seven_day_sonnet),
    ];
    Ok(windows
        .into_iter()
        .filter_map(|(kind, w)| {
            let w = w?;
            Some(UsageWindow {
                kind: kind.into(),
                window_seconds: None,
                used_percent: w.utilization?,
                resets_at: w.resets_at,
            })
        })
        .collect())
}
