pub mod claude;
pub mod codex;

use std::collections::HashMap;

use chrono::{DateTime, Utc};

use crate::accounts::{Active, Provider, Slot};
use crate::model::{AccountUsage, UsageWindow};
use crate::settings::Settings;

/// Last successful numbers per account, used when its saved token can't be used or the usage
/// API asks us to slow down.
#[derive(Clone, Default)]
pub struct Cached {
    windows: Vec<UsageWindow>,
    credits: Option<String>,
    at: Option<DateTime<Utc>>,
    /// Don't call the usage API for this account before this time (after a 429).
    blocked_until: Option<DateTime<Utc>>,
}

/// An account is never polled more often than this, however often the app refreshes.
const MIN_INTERVAL: i64 = 60;
/// Wait at least this long after a 429, even if the API asks for less.
const MIN_BACKOFF: i64 = 5 * 60;

/// Error code for a 429, carrying the server's Retry-After (seconds) when present.
pub fn rate_limited(resp: &reqwest::Response) -> String {
    let secs = resp
        .headers()
        .get(reqwest::header::RETRY_AFTER)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.trim().parse::<i64>().ok())
        .unwrap_or(0);
    format!("rate_limited:{secs}")
}

pub type Cache = HashMap<String, Cached>;

/// A window that has reset since it was measured is empty now.
fn predict(mut windows: Vec<UsageWindow>) -> Vec<UsageWindow> {
    let now = Utc::now();
    for w in &mut windows {
        if w.resets_at.is_some_and(|r| r <= now) {
            w.used_percent = 0.0;
            w.resets_at = None;
        }
    }
    windows
}

pub async fn fetch_all(
    client: &reqwest::Client,
    slots: &[Slot],
    active: &Active,
    cache: &mut Cache,
    settings: &Settings,
) -> Vec<AccountUsage> {
    let enabled = |p: Provider| match p {
        Provider::Claude => settings.providers.claude,
        Provider::Codex => settings.providers.codex,
    };
    let slots: Vec<&Slot> = slots.iter().filter(|s| enabled(s.provider)).collect();
    let now = Utc::now();
    // Skip accounts measured moments ago or backing off after a 429: reuse their numbers.
    let skip = |s: &Slot| {
        cache.get(&s.id).is_some_and(|c| {
            c.blocked_until.is_some_and(|t| t > now)
                || c.at.is_some_and(|t| (now - t).num_seconds() < MIN_INTERVAL)
        })
    };
    let results = futures::future::join_all(slots.iter().map(|s| {
        let skipped = skip(s);
        async move { if skipped { Err("cached".to_string()) } else { fetch_one(client, s).await } }
    }))
    .await;

    let mut out: Vec<AccountUsage> = slots
        .iter()
        .zip(results)
        .map(|(slot, result)| {
            let sources = active.get(&(slot.provider, slot.id.clone())).cloned().unwrap_or_default();
            let mut acc = AccountUsage {
                id: slot.id.clone(),
                provider: slot.provider,
                email: slot.email.clone(),
                alias: settings.aliases.get(&alias_key(slot.provider, &slot.id)).cloned(),
                plan: slot.plan.clone(),
                org: slot.org.clone(),
                active: !sources.is_empty(),
                sources,
                windows: vec![],
                credits: None,
                error: None,
                stale: false,
                fetched_at: None,
            };
            match result {
                Ok((windows, credits)) => {
                    cache.insert(
                        slot.id.clone(),
                        Cached { windows: windows.clone(), credits: credits.clone(), at: Some(now), blocked_until: None },
                    );
                    acc.windows = windows;
                    acc.credits = credits;
                    acc.fetched_at = Some(now);
                }
                // Recently measured: the cached numbers are current, not stale.
                Err(err) if err == "cached" && cache.get(&slot.id).is_some_and(|c| {
                    c.at.is_some_and(|t| (now - t).num_seconds() < MIN_INTERVAL)
                }) => {
                    let c = &cache[&slot.id];
                    acc.windows = c.windows.clone();
                    acc.credits = c.credits.clone();
                    acc.fetched_at = c.at;
                }
                Err(err) => {
                    if let Some(secs) = err.strip_prefix("rate_limited:").and_then(|s| s.parse::<i64>().ok()) {
                        let entry = cache.entry(slot.id.clone()).or_default();
                        entry.blocked_until = Some(now + chrono::Duration::seconds(secs.max(MIN_BACKOFF)));
                    }
                    let err = if err.starts_with("rate_limited") || err == "cached" { "rate_limited".to_string() } else { err };
                    match cache.get(&slot.id).filter(|c| c.at.is_some()) {
                    // An idle account's token lapses; its last numbers are still useful.
                        // Last numbers beat an error: idle accounts, lapsed tokens, rate limits.
                        Some(c) if !acc.active || err.starts_with("token") || err == "rate_limited" => {
                            acc.windows = predict(c.windows.clone());
                            acc.credits = c.credits.clone();
                            acc.fetched_at = c.at;
                            acc.stale = true;
                            if acc.active && err.starts_with("token") {
                                acc.error = Some(err);
                            }
                        }
                        _ => acc.error = Some(if acc.active || err != "token_expired" { err } else { "idle".into() }),
                    }
                }
            }
            acc
        })
        .collect();
    // A stable order: switching accounts must not reshuffle the list.
    out.sort_by_key(|a| (a.provider != Provider::Claude, a.email.clone(), a.id.clone()));
    out
}

pub fn alias_key(provider: Provider, id: &str) -> String {
    format!("{}:{id}", provider.name().to_lowercase())
}

async fn fetch_one(client: &reqwest::Client, slot: &Slot) -> Result<(Vec<UsageWindow>, Option<String>), String> {
    if slot.expired() {
        return Err("token_expired".into());
    }
    let (token, account) = slot.access().ok_or("bad_response")?;
    match slot.provider {
        Provider::Claude => claude::fetch(client, &token).await.map(|w| (w, None)),
        Provider::Codex => codex::fetch(client, &token, account.as_deref()).await.map(|u| (u.windows, u.credits)),
    }
}
