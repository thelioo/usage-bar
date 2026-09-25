//! Discovers home directories where CLI credentials may live:
//! the Windows user profile and the default user's home in each WSL distro.

use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone)]
pub struct Source {
    pub label: String,
    pub home: PathBuf,
    /// Explicit config dirs (only honored for the native source, from env vars).
    pub claude_dir: Option<PathBuf>,
    pub codex_dir: Option<PathBuf>,
    /// The WSL distro this source lives in, if any.
    pub distro: Option<String>,
    /// The home directory as seen from inside the source (e.g. /home/me in WSL).
    pub native_home: String,
}

impl Source {
    pub fn claude_dir(&self) -> PathBuf {
        self.claude_dir.clone().unwrap_or_else(|| self.home.join(".claude"))
    }
    pub fn codex_dir(&self) -> PathBuf {
        self.codex_dir.clone().unwrap_or_else(|| self.home.join(".codex"))
    }
    /// Claude Code keeps account details in `.claude.json`: in the home directory by default,
    /// inside the config dir when CLAUDE_CONFIG_DIR is set.
    pub fn claude_json(&self) -> PathBuf {
        match &self.claude_dir {
            Some(dir) => dir.join(".claude.json"),
            None => self.home.join(".claude.json"),
        }
    }
}

pub fn discover() -> Vec<Source> {
    let mut out = Vec::new();
    if let Some(home) = dirs::home_dir() {
        out.push(Source {
            label: if cfg!(windows) { "Windows".into() } else { "Local".into() },
            claude_dir: std::env::var_os("CLAUDE_CONFIG_DIR").map(PathBuf::from),
            codex_dir: std::env::var_os("CODEX_HOME").map(PathBuf::from),
            distro: None,
            native_home: home.to_string_lossy().into_owned(),
            home,
        });
    }
    #[cfg(windows)]
    out.extend(wsl_sources());
    out
}

pub fn command(program: &str) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

#[cfg_attr(not(windows), allow(dead_code))]
fn wsl_sources() -> Vec<Source> {
    let Ok(out) = command("wsl.exe").args(["--list", "--quiet"]).output() else {
        return vec![];
    };
    if !out.status.success() {
        return vec![];
    }
    decode_wsl_output(&out.stdout)
        .lines()
        .map(|l| l.trim().trim_matches('\0'))
        .filter(|d| !d.is_empty() && !d.starts_with("docker-desktop"))
        .filter_map(|distro| {
            let home = wsl_home(distro)?;
            let unc = [r"\\wsl.localhost\", r"\\wsl$\"]
                .iter()
                .map(|p| PathBuf::from(format!("{p}{distro}{}", home.replace('/', "\\"))))
                .find(|p| p.exists())?;
            Some(Source {
                label: format!("WSL: {distro}"),
                home: unc,
                claude_dir: None,
                codex_dir: None,
                distro: Some(distro.to_string()),
                native_home: home,
            })
        })
        .collect()
}

fn wsl_home(distro: &str) -> Option<String> {
    let out = command("wsl.exe")
        .args(["-d", distro, "-e", "sh", "-c", "printf %s \"$HOME\""])
        .output()
        .ok()?;
    let home = String::from_utf8_lossy(&out.stdout).trim().to_string();
    (out.status.success() && home.starts_with('/')).then_some(home)
}

/// `wsl.exe --list` writes UTF-16LE; fall back to UTF-8 if WSL_UTF8 is set.
fn decode_wsl_output(bytes: &[u8]) -> String {
    if bytes.len() >= 2 && bytes[1] == 0 {
        let units: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        String::from_utf16_lossy(&units).trim_start_matches('\u{feff}').to_string()
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    }
}
