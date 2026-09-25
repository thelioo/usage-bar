//! Claude Code: reads the OAuth token from `~/.claude/.credentials.json`.

use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::model::{AccountUsage, UsageWindow};
use crate::sources::Source;

const PROVIDER: &str = "Claude";
const BETA: &str = "oauth-2025-04-20";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Credentials {
    claude_ai_oauth: Option<OAuth>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OAuth {
    access_token: String,
    expires_at: Option<i64>,
    subscription_type: Option<String>,
}

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

#[derive(Deserialize)]
struct Profile {
    account: Option<ProfileAccount>,
}

#[derive(Deserialize)]
struct ProfileAccount {
    email: Option<String>,
}

pub async fn fetch(client: &reqwest::Client, source: &Source) -> Option<AccountUsage> {
    let path = source.claude_dir().join(".credentials.json");
    let text = std::fs::read_to_string(&path).ok()?;
    let oauth = match serde_json::from_str::<Credentials>(&text) {
        Ok(Credentials { claude_ai_oauth: Some(o) }) => o,
        _ => return None,
    };

    let mut acc = AccountUsage::new(PROVIDER, &source.label);
    acc.plan = oauth.subscription_type.clone();

    if oauth.expires_at.is_some_and(|ms| ms < Utc::now().timestamp_millis()) {
        acc.error = Some("token_expired".into());
        return Some(acc);
    }

    let get = |url: &'static str| {
        client
            .get(url)
            .bearer_auth(&oauth.access_token)
            .header("anthropic-beta", BETA)
            .send()
    };

    let (usage, profile) = futures::join!(
        get("https://api.anthropic.com/api/oauth/usage"),
        get("https://api.anthropic.com/api/oauth/profile"),
    );

    if let Ok(resp) = profile {
        if let Ok(p) = resp.json::<Profile>().await {
            acc.email = p.account.and_then(|a| a.email);
        }
    }

    let usage = match usage {
        Ok(r) if r.status() == 401 => {
            acc.error = Some("token_invalid".into());
            return Some(acc);
        }
        Ok(r) if !r.status().is_success() => {
            acc.error = Some(format!("http_{}", r.status().as_u16()));
            return Some(acc);
        }
        Ok(r) => r.json::<Usage>().await,
        Err(e) => {
            acc.error = Some(e.to_string());
            return Some(acc);
        }
    };

    match usage {
        Ok(u) => {
            let windows = [
                ("session", u.five_hour),
                ("weekly", u.seven_day),
                ("weekly_opus", u.seven_day_opus),
                ("weekly_sonnet", u.seven_day_sonnet),
            ];
            acc.windows = windows
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
                .collect();
        }
        Err(_) => acc.error = Some("bad_response".into()),
    }
    Some(acc)
}
