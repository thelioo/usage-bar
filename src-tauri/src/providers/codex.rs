//! Codex CLI: reads ChatGPT tokens from `~/.codex/auth.json`.

use chrono::{TimeZone, Utc};
use serde::Deserialize;

use crate::model::{AccountUsage, UsageWindow};
use crate::sources::Source;

const PROVIDER: &str = "Codex";

#[derive(Deserialize)]
struct Auth {
    tokens: Option<Tokens>,
}

#[derive(Deserialize)]
struct Tokens {
    access_token: String,
    account_id: Option<String>,
}

#[derive(Deserialize)]
struct Usage {
    email: Option<String>,
    plan_type: Option<String>,
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

pub async fn fetch(client: &reqwest::Client, source: &Source) -> Option<AccountUsage> {
    let text = std::fs::read_to_string(source.codex_dir().join("auth.json")).ok()?;
    let tokens = serde_json::from_str::<Auth>(&text).ok()?.tokens?;

    let mut acc = AccountUsage::new(PROVIDER, &source.label);
    let mut req = client
        .get("https://chatgpt.com/backend-api/wham/usage")
        .bearer_auth(&tokens.access_token)
        .header("User-Agent", "codex-cli");
    if let Some(id) = &tokens.account_id {
        req = req.header("ChatGPT-Account-Id", id);
    }

    let resp = match req.send().await {
        Ok(r) => r,
        Err(e) => return Some(AccountUsage::failed(PROVIDER, &source.label, e.to_string())),
    };
    if resp.status() == 401 || resp.status() == 403 {
        acc.error = Some("token_invalid".into());
        return Some(acc);
    }
    if !resp.status().is_success() {
        acc.error = Some(format!("http_{}", resp.status().as_u16()));
        return Some(acc);
    }

    let usage = match resp.json::<Usage>().await {
        Ok(u) => u,
        Err(_) => {
            acc.error = Some("bad_response".into());
            return Some(acc);
        }
    };

    acc.email = usage.email;
    acc.plan = usage.plan_type;
    if let Some(rl) = usage.rate_limit {
        acc.windows = [rl.primary_window, rl.secondary_window]
            .into_iter()
            .flatten()
            .map(|w| UsageWindow {
                kind: window_kind(w.limit_window_seconds).into(),
                window_seconds: w.limit_window_seconds,
                used_percent: w.used_percent,
                resets_at: w.reset_at.and_then(|t| Utc.timestamp_opt(t, 0).single()),
            })
            .collect();
    }
    if let Some(c) = usage.credits {
        if c.unlimited == Some(true) {
            acc.credits = Some("unlimited".into());
        } else if c.has_credits == Some(true) {
            acc.credits = c.balance;
        }
    }
    Some(acc)
}

fn window_kind(seconds: Option<i64>) -> &'static str {
    match seconds {
        Some(18_000) => "session",
        Some(604_800) => "weekly",
        _ => "window",
    }
}
