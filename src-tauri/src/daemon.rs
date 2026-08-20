//! Credentials for the bundled qbittorrent-nox instance.
//!
//! The user never sees a login screen for the local daemon. On first launch we
//! generate our own WebUI credentials, write them into `qBittorrent.conf`, and
//! keep the password in the OS keychain.
//!
//! The password is generated, not chosen, and never shown. It exists so the
//! daemon's WebUI is not open to anything else on the machine, not as something
//! a person needs to know.

use std::fs;
use std::path::{Path, PathBuf};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use hmac::Hmac;
use rand::Rng;
use sha2::Sha512;

const SERVICE: &str = "rigseed";
const ACCOUNT: &str = "bundled-webui";

#[derive(Debug, thiserror::Error)]
pub enum DaemonError {
    #[error("could not reach the OS keychain: {0}")]
    Keychain(#[from] keyring::Error),
    #[error("could not read or write the qBittorrent config: {0}")]
    Config(#[from] std::io::Error),
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

/// Hashes a password the way qBittorrent stores it.
///
/// PBKDF2-HMAC-SHA512, 100000 iterations, a 16-byte salt and a 64-byte key,
/// written as `base64(salt):base64(key)`. The caller wraps the result in
/// `@ByteArray(...)`, which is Qt's own encoding for a settings value that is
/// bytes rather than text.
///
/// These numbers are not ours to choose. They are what qBittorrent's own
/// `Utils::Password::generate` uses, and a config it cannot verify is a daemon
/// nobody can log into.
pub fn hash_password(password: &str) -> String {
    const ITERATIONS: u32 = 100_000;

    let salt: [u8; 16] = rand::thread_rng().gen();
    let mut key = [0u8; 64];
    pbkdf2::pbkdf2::<Hmac<Sha512>>(password.as_bytes(), &salt, ITERATIONS, &mut key)
        .expect("HMAC-SHA512 accepts a key of any length");

    format!("{}:{}", BASE64.encode(salt), BASE64.encode(key))
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

/// The WebUI port recorded in an existing config, if there is one.
///
/// Read rather than remembered, because the daemon that is running may have
/// been started by a previous launch of rigseed that never got to shut it
/// down. Its config is the only thing that knows which port it took.
pub fn configured_port(path: &Path) -> Option<u16> {
    let text = fs::read_to_string(path).ok()?;
    text.lines()
        .find_map(|line| line.strip_prefix("WebUI\\Port="))
        .and_then(|value| value.trim().parse().ok())
}

/// Whether something is accepting connections there.
///
/// A daemon left behind by a crash, or by a parent process killed without
/// running its shutdown, keeps the profile locked and the port bound. A second
/// qbittorrent-nox on the same profile simply exits, so the choice is to adopt
/// the one that is running or to leave the app permanently unable to start.
///
/// Only a TCP check. Whether it is really qBittorrent is settled by the
/// frontend's own probe before any credential is sent, which is where that
/// question already belongs.
pub fn something_listening(port: u16) -> bool {
    use std::net::{Ipv4Addr, SocketAddr, TcpStream};
    use std::time::Duration;

    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok()
}

/// Where qBittorrent keeps its config inside a profile directory.
///
/// The daemon is started with `--profile=<app_data>`, which is what keeps the
/// bundled instance's settings and torrents out of any qBittorrent the user
/// already has. Under a profile the layout is fixed:
///
/// ```text
/// <app_data>/qBittorrent/config/qBittorrent.ini    (Windows)
/// <app_data>/qBittorrent/config/qBittorrent.conf   (everywhere else)
/// ```
///
/// The directory stays named `qBittorrent`, not `rigseed`. It describes the
/// software that reads it, and renaming it would break a user's ability to
/// point an existing install at the same data.
///
/// The Windows layout is confirmed against a running 5.0 daemon. The Unix
/// extension follows qBittorrent's own Profile code and has not been run.
pub fn config_path(app_data: &Path) -> PathBuf {
    let name = if cfg!(windows) {
        "qBittorrent.ini"
    } else {
        "qBittorrent.conf"
    };
    app_data.join("qBittorrent").join("config").join(name)
}

/// Writes the WebUI credentials into `qBittorrent.conf`.
///
/// The file is INI-shaped. Rather than parse it properly, existing keys are
/// replaced line by line and missing ones appended under `[Preferences]`, which
/// leaves any setting the user changed by hand untouched.
pub fn write_config(
    path: &Path,
    username: &str,
    password_hash: &str,
    port: u16,
) -> Result<(), DaemonError> {
    // Loopback only, which is two fixes rather than one.
    //
    // A qBittorrent WebUI binds to every interface by default. Nothing but
    // rigseed talks to this one, so being on the LAN is pure exposure, and on
    // Windows it is also what raises the firewall prompt about private and
    // public networks the moment the app first runs.
    //
    // It also turns a taken port from a silent hijack into a real failure.
    // Windows lets a wildcard bind sit alongside a specific one, so with
    // something already on 127.0.0.1:8080 the daemon bound 0.0.0.0:8080,
    // logged "Now listening", and every request went to the other process.
    // rigseed would have posted its generated password to whatever that was.
    const LOOPBACK: &str = "127.0.0.1";

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Section, key, value. The section matters: qBittorrent reads this through
    // QSettings, where `Preferences/WebUI/Enabled` lands as `WebUI\Enabled`
    // inside `[Preferences]`. Putting the legal notice there too would make it
    // `Preferences/LegalNotice/Accepted`, which nothing reads.
    let wanted: Vec<(&str, String, String)> = vec![
        // qBittorrent shows a legal notice on first run and waits for an
        // answer. Headless there is nobody to answer it, and rigseed carries
        // the same notice in its own first-run flow, so accepting it here
        // records a decision the user already made rather than skipping one.
        ("LegalNotice", "Accepted".into(), "true".into()),
        ("Preferences", webui("Enabled"), "true".into()),
        ("Preferences", webui("Address"), LOOPBACK.into()),
        ("Preferences", webui("Port"), port.to_string()),
        ("Preferences", webui("Username"), username.to_string()),
        (
            "Preferences",
            webui("Password_PBKDF2"),
            format!("\"@ByteArray({password_hash})\""),
        ),
        // Localhost still authenticates. The daemon listens on 127.0.0.1, but
        // so does everything else on the machine, and an unauthenticated WebUI
        // is reachable by any of it.
        ("Preferences", webui("LocalHostAuth"), "true".into()),
        ("Preferences", webui("CSRFProtection"), "true".into()),
    ];

    let existing = fs::read_to_string(path).unwrap_or_default();
    let mut lines: Vec<String> = existing.lines().map(str::to_string).collect();

    for (section, key, value) in wanted {
        let line = format!("{key}={value}");
        match lines.iter().position(|l| l.starts_with(&format!("{key}="))) {
            // Replaced in place, so whatever the user changed by hand around it
            // survives. This file is theirs as much as ours.
            Some(at) => lines[at] = line,
            None => {
                let header = format!("[{section}]");
                let at = match lines.iter().position(|l| l.trim() == header) {
                    Some(at) => at,
                    None => {
                        lines.push(header);
                        lines.len() - 1
                    }
                };
                lines.insert(at + 1, line);
            }
        }
    }

    fs::write(path, lines.join("\n") + "\n")?;
    Ok(())
}

/// A `Preferences/WebUI/...` key in the shape QSettings writes it.
fn webui(key: &str) -> String {
    format!("WebUI\\{key}")
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

    #[test]
    fn hashes_in_qbittorrents_own_format() {
        // base64(16-byte salt) : base64(64-byte key). qBittorrent parses this
        // by splitting on the colon and decoding both halves, so the shape is
        // not ours to vary: a hash it cannot parse is a daemon nobody can log
        // into, and the failure looks like a wrong password.
        let hash = hash_password("hunter2");
        let (salt, key) = hash.split_once(':').expect("salt and key, colon separated");

        assert_eq!(BASE64.decode(salt).unwrap().len(), 16);
        assert_eq!(BASE64.decode(key).unwrap().len(), 64);
    }

    #[test]
    fn hashes_differ_for_the_same_password() {
        // The salt is per call. Two identical hashes would mean it is not.
        assert_ne!(hash_password("hunter2"), hash_password("hunter2"));
    }

    #[test]
    fn puts_the_legal_notice_in_its_own_section() {
        // Under [Preferences] it would read as Preferences/LegalNotice/Accepted,
        // which nothing looks at, and the daemon would sit waiting for an answer
        // from a console nobody is watching.
        let dir = std::env::temp_dir().join(format!("rigseed-test-notice-{}", std::process::id()));
        let path = dir.join("qBittorrent.conf");
        let _ = fs::remove_dir_all(&dir);

        write_config(&path, "rigseed", "hash", 8080).unwrap();
        let written = fs::read_to_string(&path).unwrap();

        let notice = written.find("[LegalNotice]").expect("its own section");
        let accepted = written.find("Accepted=true").expect("accepted");
        let prefs = written.find("[Preferences]").expect("preferences");
        assert!(accepted > notice, "Accepted sits under [LegalNotice]");
        assert!(accepted < prefs || prefs > notice);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn wraps_the_hash_the_way_qt_stores_bytes() {
        let dir = std::env::temp_dir().join(format!("rigseed-test-bytes-{}", std::process::id()));
        let path = dir.join("qBittorrent.conf");
        let _ = fs::remove_dir_all(&dir);

        write_config(&path, "rigseed", "SALT:KEY", 8080).unwrap();
        let written = fs::read_to_string(&path).unwrap();

        assert!(
            written.contains("Password_PBKDF2=\"@ByteArray(SALT:KEY)\""),
            "got: {written}"
        );
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn config_path_sits_inside_the_profile() {
        // qBittorrent reads <profile>/qBittorrent/config/ when given --profile.
        // Anywhere else and it silently uses its defaults, which means its own
        // generated password rather than ours.
        let path = config_path(Path::new("/app-data"));
        let text = path.to_string_lossy().replace('\\', "/");
        assert!(text.ends_with("/qBittorrent/config/qBittorrent.ini")
            || text.ends_with("/qBittorrent/config/qBittorrent.conf"), "got {text}");
    }

    #[test]
    fn binds_the_webui_to_loopback_only() {
        // Not a preference. A qBittorrent WebUI binds to every interface by
        // default, and nothing but rigseed talks to this one, so being on the
        // LAN is exposure with no upside. On Windows it is also what raises
        // the firewall prompt about private and public networks.
        //
        // It is what makes a taken port fail honestly, too. Windows lets a
        // wildcard bind sit alongside a specific one, so bound to 0.0.0.0 the
        // daemon reported "Now listening" while another process served every
        // request, and rigseed would have posted its password to whatever that
        // was.
        let dir = std::env::temp_dir().join(format!("rigseed-test-bind-{}", std::process::id()));
        let path = dir.join("qBittorrent.conf");
        let _ = fs::remove_dir_all(&dir);

        write_config(&path, "rigseed", "hash", 43880).unwrap();
        let written = fs::read_to_string(&path).unwrap();

        assert!(
            written.contains("WebUI\\Address=127.0.0.1"),
            "the WebUI must not be offered to the network: {written}"
        );
        let _ = fs::remove_dir_all(&dir);
    }
}
