//! Automatic account switching: when the signed-in account of a provider reaches the
//! configured share of any usage window, move to the account with the most headroom.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::accounts::Provider;
use crate::model::AccountUsage;
use crate::settings::Settings;

/// Minimum time between automatic switches of the same provider.
const COOLDOWN: Duration = Duration::from_secs(5 * 60);
/// A candidate must be this far below the threshold, so it doesn't bounce straight back.
const HYSTERESIS: f64 = 10.0;

/// The account to switch to for each provider that needs it.
pub fn decide(
    accounts: &[AccountUsage],
    settings: &Settings,
    last_switch: &HashMap<Provider, Instant>,
) -> Vec<(Provider, String)> {
    let mut out = Vec::new();
    for provider in Provider::ALL {
        let rule = settings.balancer.rule(provider);
        if !rule.auto || last_switch.get(&provider).is_some_and(|t| t.elapsed() < COOLDOWN) {
            continue;
        }
        let of_provider: Vec<&AccountUsage> = accounts.iter().filter(|a| a.provider == provider).collect();
        let Some(current) = of_provider.iter().find(|a| a.active) else { continue };
        let threshold = rule.threshold as f64;
        if current.peak().unwrap_or(0.0) < threshold {
            continue;
        }
        // Known headroom first (least used); accounts never measured come last.
        let best = of_provider
            .iter()
            .filter(|a| !a.active)
            .filter(|a| a.peak().is_none_or(|p| p < threshold - HYSTERESIS))
            .min_by(|a, b| {
                let key = |x: &AccountUsage| x.peak().unwrap_or(f64::MAX);
                key(a).total_cmp(&key(b))
            });
        if let Some(target) = best {
            out.push((provider, target.id.clone()));
        }
    }
    out
}
