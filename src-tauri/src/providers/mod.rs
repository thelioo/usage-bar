pub mod claude;
pub mod codex;

use crate::model::AccountUsage;
use crate::settings::Providers;
use crate::sources::Source;

pub async fn fetch_all(client: &reqwest::Client, sources: &[Source], enabled: &Providers) -> Vec<AccountUsage> {
    let claude_sources = if enabled.claude { sources } else { &[] };
    let codex_sources = if enabled.codex { sources } else { &[] };
    let claude = futures::future::join_all(claude_sources.iter().map(|s| claude::fetch(client, s)));
    let codex = futures::future::join_all(codex_sources.iter().map(|s| codex::fetch(client, s)));
    let (claude, codex) = futures::join!(claude, codex);
    dedupe(claude.into_iter().chain(codex).flatten().collect())
}

/// The same account may be logged in on Windows and in WSL; show it once.
fn dedupe(accounts: Vec<AccountUsage>) -> Vec<AccountUsage> {
    let mut out: Vec<AccountUsage> = Vec::new();
    for acc in accounts {
        let existing = acc.email.as_ref().and_then(|email| {
            out.iter_mut()
                .find(|o| o.provider == acc.provider && o.email.as_ref() == Some(email))
        });
        match existing {
            Some(o) => {
                o.sources.extend(acc.sources);
                if o.error.is_some() && acc.error.is_none() {
                    let sources = std::mem::take(&mut o.sources);
                    *o = AccountUsage { sources, ..acc };
                }
            }
            None => out.push(acc),
        }
    }
    out
}
