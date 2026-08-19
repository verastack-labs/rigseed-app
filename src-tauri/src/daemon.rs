//! Credentials for the bundled qbittorrent-nox instance.
//!
//! The user never sees a login screen for the local daemon. On first launch we
//! generate our own WebUI credentials, write them into `qBittorrent.conf`, and
//! keep the password in the OS keychain.
//!
//! The password is generated, not chosen, and never shown. It exists so the
//! daemon's WebUI is not open to anything else on the machine, not as something
//! a person needs to know.

// Written and tested, but not reachable until the sidecar question in
// binaries/README.md is settled. Writing the config before there is a daemon to
// read it would be pretending, and one of these needs a correct PBKDF2 hash in
// qBittorrent's own format, which is work worth doing once rather than twice.
#![allow(dead_code)]

use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

use rand::Rng;

const SERVICE: &str = "rigseed";
const ACCOUNT: &str = "bundled-webui";
const USERNAME: &str = "rigseed";

#[derive(Debug, thiserror::Error)]
pub enum DaemonError {
    #[error("could not reach the OS keychain: {0}")]
    Keychain(#[from] keyring::Error),
    #[error("could not read or write the qBittorrent config: {0}")]
    Config(#[from] std::io::Error),
}

/// What the frontend needs to talk to the local daemon.
#[derive(Debug, Clone, serde::Serialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
    pub base_url: String,
}

impl fmt::Display for Credentials {
    /// Never print the password. This type ends up in log lines and error
    /// context, and a generated secret in a log file is still a leaked secret.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Credentials({} @ {})", self.username, self.base_url)
    }
}

/// 32 characters from an unambiguous alphabet.
///
/// No `0`/`O` or `1`/`l`, because this string can end up in a config file a
/// person has to read back when something has gone wrong.
fn generate_password() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char)
        .collect()
}

/// Fetches the stored password, generating and storing one on first launch.
pub fn ensure_password() -> Result<String, DaemonError> {
    let entry = keyring::Entry::new(SERVICE, ACCOUNT)?;

    match entry.get_password() {
        Ok(existing) => Ok(existing),
        Err(keyring::Error::NoEntry) => {
            let generated = generate_password();
            entry.set_password(&generated)?;
            Ok(generated)
        }
        Err(other) => Err(other.into()),
    }
}

/// Where qBittorrent keeps its config, per platform.
///
/// The path stays under `qBittorrent`, not `rigseed`. It describes the real
/// software underneath, and renaming it would break a user's ability to point
/// an existing install at the same data.
pub fn config_path(app_data: &Path) -> PathBuf {
    app_data.join("qBittorrent").join("qBittorrent.conf")
}

/// Writes the WebUI credentials into `qBittorrent.conf`.
///
/// The file is INI-shaped. Rather than parse it properly, existing keys are
/// replaced line by line and missing ones appended under `[Preferences]`, which
/// leaves any setting the user changed by hand untouched.
pub fn write_config(path: &Path, username: &str, password_hash: &str, port: u16) -> Result<(), DaemonError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let existing = fs::read_to_string(path).unwrap_or_default();
    let wanted: Vec<(&str, String)> = vec![
        ("WebUI\\Enabled", "true".into()),
        ("WebUI\\Port", port.to_string()),
        ("WebUI\\Username", username.to_string()),
        ("WebUI\\Password_PBKDF2", format!("\"{password_hash}\"")),
        ("WebUI\\LocalHostAuth", "true".into()),
        ("WebUI\\CSRFProtection", "true".into()),
    ];

    let mut lines: Vec<String> = existing.lines().map(str::to_string).collect();
    let mut unhandled: Vec<(&str, String)> = Vec::new();

    for (key, value) in wanted {
        let prefix = format!("{key}=");
        match lines.iter().position(|l| l.starts_with(&prefix)) {
            Some(at) => lines[at] = format!("{prefix}{value}"),
            None => unhandled.push((key, value)),
        }
    }

    if !unhandled.is_empty() {
        if !lines.iter().any(|l| l.trim() == "[Preferences]") {
            lines.push("[Preferences]".into());
        }
        let at = lines
            .iter()
            .position(|l| l.trim() == "[Preferences]")
            .expect("just ensured the section exists");
        for (key, value) in unhandled.into_iter().rev() {
            lines.insert(at + 1, format!("{key}={value}"));
        }
    }

    fs::write(path, lines.join("\n") + "\n")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_passwords_are_long_and_unambiguous() {
        let password = generate_password();
        assert_eq!(password.len(), 32);
        for banned in ['0', 'O', '1', 'l'] {
            assert!(!password.contains(banned), "{banned} is easy to misread");
        }
    }

    #[test]
    fn generated_passwords_differ() {
        assert_ne!(generate_password(), generate_password());
    }

    #[test]
    fn credentials_never_render_the_password() {
        let creds = Credentials {
            username: "rigseed".into(),
            password: "hunter2-should-not-appear".into(),
            base_url: "http://127.0.0.1:8080".into(),
        };
        let rendered = format!("{creds}");
        assert!(!rendered.contains("hunter2-should-not-appear"));
        assert!(rendered.contains("rigseed"));
    }

    #[test]
    fn writes_a_config_from_nothing() {
        let dir = std::env::temp_dir().join(format!("rigseed-test-{}", std::process::id()));
        let path = dir.join("qBittorrent.conf");
        let _ = fs::remove_dir_all(&dir);

        write_config(&path, "rigseed", "hash", 8080).unwrap();
        let written = fs::read_to_string(&path).unwrap();

        assert!(written.contains("[Preferences]"));
        assert!(written.contains("WebUI\\Port=8080"));
        assert!(written.contains("WebUI\\Username=rigseed"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn replaces_our_keys_and_leaves_the_rest_alone() {
        let dir = std::env::temp_dir().join(format!("rigseed-test-keep-{}", std::process::id()));
        let path = dir.join("qBittorrent.conf");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            &path,
            "[Preferences]\nWebUI\\Port=9999\nDownloads\\SavePath=/media/archive\n",
        )
        .unwrap();

        write_config(&path, "rigseed", "hash", 8080).unwrap();
        let written = fs::read_to_string(&path).unwrap();

        assert!(written.contains("WebUI\\Port=8080"), "our key is updated");
        assert!(!written.contains("9999"), "the old value is gone");
        assert!(
            written.contains("Downloads\\SavePath=/media/archive"),
            "a setting the user changed by hand survives"
        );
        let _ = fs::remove_dir_all(&dir);
    }
}
