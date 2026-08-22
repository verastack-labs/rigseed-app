//! Which Python the daemon's search engine can actually run.
//!
//! qBittorrent drives every search plugin through `nova3/nova2.py`, which it
//! runs with `python3` taken from `PATH`. On Windows that default is a trap,
//! and it was found the hard way: plugin installs were rejected with
//!
//! ```text
//! python3: can't open file '...\qBittorrent\data\nova3\nova2.py':
//! [Errno 2] No such file or directory
//! ```
//!
//! for a file that was demonstrably on disk. `python3` on a stock Windows
//! resolves to the Microsoft Store App Execution Alias in
//! `%LOCALAPPDATA%\Microsoft\WindowsApps`, which runs Python inside an
//! AppContainer. That sandbox hands the process a virtualised view of
//! `AppData\Roaming`, so the daemon's own profile directory is invisible to
//! it. Measured either way on the same machine: the alias read a script from
//! `Documents` and could not read the identical script from `AppData\Roaming`,
//! while a python.org install at `C:\Python313` read both.
//!
//! That combination is not exotic. Typing `python` on a machine that has none
//! opens the Store, so the Store build is the most common way a Windows
//! machine ends up with Python at all, and rigseed keeps the daemon profile
//! under `AppData\Roaming` like every other Tauri app.
//!
//! So rigseed stops trusting `PATH` and asks the only question that settles
//! it: run each candidate against the real `nova2.py` and see which one works.
//! A version check would not do. The alias answers `--version` perfectly well;
//! it fails only when it has to open a file.

use std::path::{Path, PathBuf};
use std::process::Command;

/// What a probe found.
#[derive(Default, serde::Serialize)]
pub struct PythonReport {
    /// An interpreter that ran `nova2.py`, if any did. Absolute where it was
    /// resolved to one, so it can be written straight into
    /// `python_executable_path`.
    pub interpreter: Option<String>,
    /// True when the daemon's own default already works and nothing needs
    /// setting. The common case everywhere except Windows.
    pub default_works: bool,
    /// True when `nova2.py` is not on disk at all, which is a different
    /// problem with a different answer: the profile has not been through a
    /// daemon startup yet.
    pub runtime_missing: bool,
    /// One line per candidate, in the order tried. Carried so a screen or a
    /// log can say what was ruled out rather than only that nothing worked.
    pub tried: Vec<String>,
}

/// The script qBittorrent runs, inside a profile directory.
fn nova2(profile: &Path) -> PathBuf {
    profile
        .join("qBittorrent")
        .join("data")
        .join("nova3")
        .join("nova2.py")
}

/// Runs a command without flashing a console window on Windows.
fn quietly(program: &str, args: &[&str]) -> std::io::Result<std::process::Output> {
    let mut command = Command::new(program);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW. Without it every probe pops a console window in
        // front of the app, which on a cold start is several in a row.
        command.creation_flags(0x0800_0000);
    }
    command.output()
}

/// Asks the Windows launcher where a real Python lives.
///
/// `py` is installed by python.org and is not an alias, so what it reports is
/// a genuine interpreter. It is asked before `PATH` rather than after: on the
/// machine this was found on, `PATH` produced the sandboxed alias and `py -3`
/// produced the install that works.
#[cfg(windows)]
fn launcher_python() -> Option<String> {
    let out = quietly("py", &["-3", "-c", "import sys; print(sys.executable)"]).ok()?;
    if !out.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
    (!path.is_empty()).then_some(path)
}

#[cfg(not(windows))]
fn launcher_python() -> Option<String> {
    None
}

/// Every interpreter worth trying, best first.
fn candidates() -> Vec<String> {
    let mut all: Vec<String> = Vec::new();
    all.extend(launcher_python());
    all.push("python3".into());
    all.push("python".into());
    all.dedup();
    all
}

/// Whether this interpreter can run the daemon's search runtime.
///
/// `--capabilities` rather than `--version`, because the whole point is
/// whether the process can open the file. With no plugins installed it prints
/// an empty `<capabilities />` and exits, so this is cheap and has no side
/// effect on the profile.
fn works(interpreter: &str, script: &Path) -> Result<(), String> {
    let script = script.to_string_lossy().to_string();
    match quietly(interpreter, &[&script, "--capabilities"]) {
        Ok(out) if out.status.success() => Ok(()),
        Ok(out) => {
            let why = String::from_utf8_lossy(&out.stderr);
            let why = why.trim();
            Err(if why.is_empty() {
                format!("exited with {}", out.status)
            } else {
                // One line. Python's traceback is several and the useful part
                // is the last of them.
                why.lines().last().unwrap_or(why).to_string()
            })
        }
        Err(error) => Err(error.to_string()),
    }
}

/// Finds an interpreter that can run the search engine in this profile.
pub fn probe(profile: &Path) -> PythonReport {
    let script = nova2(profile);
    if !script.exists() {
        return PythonReport {
            runtime_missing: true,
            tried: vec![format!("{} is not on disk", script.display())],
            ..PythonReport::default()
        };
    }

    let mut report = PythonReport::default();
    for candidate in candidates() {
        match works(&candidate, &script) {
            Ok(()) => {
                report.tried.push(format!("{candidate}: works"));
                // A bare name is what the daemon would have found on its own,
                // so one of those working means there is nothing to set. An
                // absolute path means it took the launcher to find it.
                report.default_works = candidate == "python3" || candidate == "python";
                report.interpreter = Some(candidate);
                return report;
            }
            Err(why) => report.tried.push(format!("{candidate}: {why}")),
        }
    }
    report
}

/// Which Python can run this daemon's search plugins, and whether the daemon
/// would have found it unaided.
///
/// Only ever asked about the bundled daemon. A remote qBittorrent runs on a
/// machine whose interpreters rigseed cannot see and whose configuration is
/// not ours to change.
#[tauri::command]
pub async fn search_python(app: tauri::AppHandle) -> Result<PythonReport, String> {
    use tauri::Manager;
    let profile = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data directory: {e}"))?;
    Ok(
        tauri::async_runtime::spawn_blocking(move || probe(&profile))
            .await
            .map_err(|e| e.to_string())?,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn looks_for_nova2_where_qbittorrent_keeps_it() {
        // The layout is qBittorrent's, not ours, and it is the reason the
        // script sits under AppData at all. Getting it wrong would report
        // `runtime_missing` on a perfectly good profile and give up.
        let path = nova2(Path::new("/profile"));
        assert!(
            path.ends_with("qBittorrent/data/nova3/nova2.py")
                || path.ends_with(r"qBittorrent\data\nova3\nova2.py")
        );
    }

    #[test]
    fn says_the_runtime_is_missing_rather_than_blaming_python() {
        // A profile the daemon has never started in has no nova3 at all.
        // Reporting that as "no working interpreter" would send somebody to
        // reinstall Python over a problem Python has nothing to do with.
        let report = probe(Path::new("/no/such/profile"));
        assert!(report.runtime_missing);
        assert!(report.interpreter.is_none());
        assert!(!report.default_works);
    }

    #[test]
    fn tries_the_launcher_before_the_path() {
        // The whole point. PATH is what produced the sandboxed alias on the
        // machine this was found on, so a probe that trusts it first finds the
        // broken interpreter, confirms it is broken, and only then looks for a
        // working one. Cheap to get backwards and invisible when you do.
        let all = candidates();
        let path_first = all.iter().position(|c| c == "python3");
        assert!(path_first.is_some(), "PATH is still a candidate");
        if cfg!(windows) && all.len() > 2 {
            assert_eq!(path_first, Some(1), "the launcher result comes first");
        }
    }

    #[test]
    fn does_not_offer_the_same_interpreter_twice() {
        let all = candidates();
        let mut unique = all.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(all.len(), unique.len());
    }

    /// Runs the real probe against a real profile.
    ///
    /// Ignored by default: it depends on which interpreters this machine has,
    /// which is the one thing a test cannot assume. Kept because it is the
    /// only way to see the actual verdict on a machine that is misbehaving.
    ///
    /// `RIGSEED_PROFILE=... cargo test --lib real_profile -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn real_profile() {
        let Ok(profile) = std::env::var("RIGSEED_PROFILE") else {
            panic!("set RIGSEED_PROFILE to a daemon profile directory");
        };
        let report = probe(Path::new(&profile));
        println!("interpreter:     {:?}", report.interpreter);
        println!("default_works:   {}", report.default_works);
        println!("runtime_missing: {}", report.runtime_missing);
        for line in &report.tried {
            println!("tried:           {line}");
        }
    }
}
