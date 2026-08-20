pub mod daemon;
pub mod http;
pub mod icon;

use std::sync::Mutex;

use tauri::{LogicalPosition, LogicalSize, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

/// The port the bundled instance listens on.
///
/// Fixed rather than negotiated. A remote instance is a saved connection with
/// its own address; this is only the local one, and a stable port means a user
/// can point a browser at it when they need to debug something.
/// The port rigseed asks for first.
///
/// Not 8080. That is qBittorrent's own default, so a user who has enabled the
/// WebUI on their existing install collides with us immediately, and it is one
/// of the most contended ports on any developer's machine besides.
///
/// Deliberately below 49152 as well. Windows allocates ephemeral ports for
/// outbound connections from 49152 upwards, so a fixed listener up there can
/// lose a race with the machine's own outbound traffic.
///
/// Only a preference. `pick_port` moves on if it is taken, which is the part
/// that actually matters: no fixed number is safe on a machine we do not own.
const PREFERRED_PORT: u16 = 43880;

/// A port nothing is listening on, preferring `PREFERRED_PORT`.
///
/// Asked of the OS rather than assumed. There is a window between letting the
/// listener go and the daemon binding, which is unavoidable when the port has
/// to be passed as an argument, but it is milliseconds against the certainty
/// of a fixed port already being in use.
fn pick_port() -> u16 {
    use std::net::TcpListener;

    if TcpListener::bind(("127.0.0.1", PREFERRED_PORT)).is_ok() {
        return PREFERRED_PORT;
    }

    match TcpListener::bind(("127.0.0.1", 0)).and_then(|l| l.local_addr()) {
        Ok(addr) => {
            log::info!("{PREFERRED_PORT} was taken, using {}", addr.port());
            addr.port()
        }
        // Nothing is bindable, which is a broken machine rather than a busy
        // one. Let the daemon report it rather than inventing a number.
        Err(error) => {
            log::error!("could not find a free port: {error}");
            PREFERRED_PORT
        }
    }
}

/// The size the screens were drawn at, and the smallest the layout holds at.
///
/// The design canvas is 1440x900, but that is a drawing size, not a promise
/// that every display can show it. Opening at the documented minimum and
/// letting the user grow the window is the safer default: a window larger than
/// the screen puts its own controls out of reach.
const PREFERRED: (f64, f64) = (1100.0, 700.0);

/// Keeps the window inside the usable part of the screen.
///
/// `work_area` excludes the taskbar or dock, which is the difference between a
/// window that fits and one whose footer sits underneath the taskbar.
///
/// On a display too small for the preferred size, the minimum constraint is
/// relaxed rather than enforced. A minimum that exceeds the screen is worse
/// than a cramped layout, because it cannot be dragged back into view.
fn fit_within_screen(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };

    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let available_w = area.size.width as f64 / scale;
    let available_h = area.size.height as f64 / scale;

    // Leave a margin so the window does not sit flush against the screen edge.
    let width = PREFERRED.0.min(available_w - 40.0).max(640.0);
    let height = PREFERRED.1.min(available_h - 40.0).max(480.0);

    if width < PREFERRED.0 || height < PREFERRED.1 {
        log::info!(
            "screen work area is {available_w:.0}x{available_h:.0}, opening at {width:.0}x{height:.0}"
        );
        let _ = window.set_min_size(Some(LogicalSize::new(width, height)));
    }

    let _ = window.set_size(LogicalSize::new(width, height));

    // Centre on the work area, not on the monitor.
    //
    // The built-in centre() uses full monitor bounds, which ignores wherever
    // the taskbar or dock actually sits. The work area carries both an origin
    // and a size, and the origin is the part that matters: a taskbar docked to
    // the top gives a work area starting at y=40, and centring against a bare
    // height would push the window down by half the taskbar.
    //
    // The outer size is what has to fit, since set_size sets the inner size and
    // the title bar and borders sit outside it.
    let outer = window
        .outer_size()
        .map(|s| (s.width as f64 / scale, s.height as f64 / scale))
        .unwrap_or((width, height));

    let x = area.position.x as f64 / scale + (available_w - outer.0).max(0.0) / 2.0;
    let y = area.position.y as f64 / scale + (available_h - outer.1).max(0.0) / 2.0;
    let _ = window.set_position(LogicalPosition::new(x.max(0.0), y.max(0.0)));
}

/// The port the daemon was actually given.
///
/// Chosen at startup rather than fixed, so it has to be remembered: the
/// frontend asks for the connection separately and has no other way to know.
#[derive(Default)]
struct WebUiPort(std::sync::Mutex<u16>);

/// The WebUI account rigseed creates for itself.
///
/// Written into the daemon's config and handed to the frontend, so the two
/// have to be the same string or the login fails against a healthy daemon.
const DAEMON_USER: &str = "rigseed";

/// The sidecar handle, so the daemon can be stopped when the window closes.
#[derive(Default)]
struct Daemon(Mutex<Option<CommandChild>>);

/// What the frontend needs to reach the local daemon.
///
/// camelCase over the boundary, because that is what the TypeScript side
/// reads. Without the rename serde sent `base_url`, the frontend read
/// `baseUrl`, got `undefined`, and every request threw building its URL before
/// it left the app. Nothing reported it: the failure surfaced as "could not
/// reach the daemon", which is exactly what an absent daemon looks like, so a
/// running one was blamed for being missing.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Connection {
    base_url: String,
    username: String,
    password: String,
}

impl std::fmt::Debug for Connection {
    /// Never print the password.
    ///
    /// Hand-written rather than derived, because this type ends up in log
    /// lines and error context, and a generated secret in a log file is still
    /// a leaked secret.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Connection({} @ {})", self.username, self.base_url)
    }
}

/// Hands the frontend its credentials for the bundled instance.
///
/// The password crosses this boundary once, into the API client, and is never
/// rendered. It is not put in the store plugin: the keychain is the store.
#[tauri::command]
fn bundled_connection(port: tauri::State<'_, WebUiPort>) -> Result<Connection, String> {
    let password = daemon::ensure_password().map_err(|e| e.to_string())?;
    let port = port.0.lock().map(|p| *p).unwrap_or(PREFERRED_PORT);
    // The port is chosen at startup, so this is the only place that says which
    // one the frontend was actually told to use. Worth a line: a mismatch here
    // looks exactly like a daemon that will not accept the password.
    log::info!("handing the frontend http://127.0.0.1:{port} as {DAEMON_USER}");
    Ok(Connection {
        base_url: format!("http://127.0.0.1:{port}"),
        username: DAEMON_USER.into(),
        password,
    })
}

/// Records how the frontend's attempt to reach the daemon went.
///
/// A packaged desktop app has no console anybody can open, so a connection
/// that quietly falls back to sample data leaves no trace at all. The frontend
/// knows exactly why it failed and this is the only way that reason reaches
/// the log file beside the daemon's own.
#[tauri::command]
fn report_connection(status: String, detail: String) {
    if status == "connected" {
        log::info!("frontend connected: {detail}");
    } else {
        log::warn!("frontend could not connect ({status}): {detail}");
    }
}

/// Repaints the window icon in the accent the user picked.
///
/// The taskbar icon while the app is open is the window's, not the
/// executable's, and unlike the executable's it can be replaced at runtime.
/// The one compiled into the binary stays as it is, which is why Explorer and
/// the Start menu shortcut keep the default: that icon is a resource, not a
/// setting.
///
/// A failure here is cosmetic. The app keeps whatever icon it already had
/// rather than refusing to run over a colour.
#[tauri::command]
fn set_window_icon(window: tauri::WebviewWindow, accent: String, dark: bool) -> Result<(), String> {
    let (rgba, width, height) = icon::render(&accent, dark).map_err(|e| e.to_string())?;
    window
        .set_icon(tauri::image::Image::new_owned(rgba, width, height))
        .map_err(|e| e.to_string())?;
    log::info!(
        "window icon repainted for {accent} ({})",
        if dark { "dark" } else { "light" }
    );
    Ok(())
}

/// Whether the sidecar is running.
#[tauri::command]
fn daemon_running(state: tauri::State<'_, Daemon>) -> bool {
    state.0.lock().map(|g| g.is_some()).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opening_a_file_is_actually_permitted() {
        // Another contract nothing checks. `opener:default` grants open_url
        // and reveal_item_in_dir but *not* open_path, so double-clicking a
        // file in the detail pane was refused by the capability layer and the
        // frontend's catch block ate the refusal. Nothing failed loudly, the
        // feature simply did not exist.
        //
        // open_path is also scoped: the plugin requires at least one allow
        // entry whose glob covers the path, and an empty scope denies
        // everything. `**` because a save path is whatever the user chose,
        // on whatever drive, and there is no narrower answer available at
        // build time.
        let raw = include_str!("../capabilities/default.json");
        let capability: serde_json::Value = serde_json::from_str(raw).unwrap();
        let permissions = capability["permissions"].as_array().unwrap();

        let open_path = permissions
            .iter()
            .find(|p| p["identifier"] == "opener:allow-open-path")
            .expect("opener:allow-open-path is missing, so open_path is refused");

        let paths: Vec<&str> = open_path["allow"]
            .as_array()
            .expect("open_path needs a scope, an empty one denies every path")
            .iter()
            .filter_map(|entry| entry["path"].as_str())
            .collect();

        assert!(
            paths.contains(&"**"),
            "the scope has to reach any save path, got {paths:?}"
        );
    }

    #[test]
    fn the_frontend_gets_the_names_it_reads() {
        // The one contract in this app that no compiler checks. TypeScript's
        // DaemonTarget asks for baseUrl; serde's default would send base_url;
        // and the frontend reading undefined fails in a way that looks exactly
        // like the daemon not being there.
        let json = serde_json::to_string(&Connection {
            base_url: "http://127.0.0.1:43880".into(),
            username: "rigseed".into(),
            password: "secret".into(),
        })
        .unwrap();

        assert!(json.contains("baseUrl"), "got {json}");
        assert!(!json.contains("base_url"), "got {json}");
    }

    #[test]
    fn a_connection_never_prints_its_password() {
        let rendered = format!(
            "{:?}",
            Connection {
                base_url: "http://127.0.0.1:43880".into(),
                username: "rigseed".into(),
                password: "hunter2-should-not-appear".into(),
            }
        );
        assert!(!rendered.contains("hunter2-should-not-appear"));
        assert!(rendered.contains("rigseed"));
    }

    #[test]
    fn the_preferred_port_avoids_the_ephemeral_range() {
        // Windows allocates outbound ephemeral ports from 49152, so a fixed
        // listener above that can lose a race with the machine's own traffic.
        assert!(PREFERRED_PORT < 49152);
        // And it is not qBittorrent's own default, which is the collision the
        // move was for.
        assert_ne!(PREFERRED_PORT, 8080);
    }

    #[test]
    fn a_chosen_port_is_actually_free() {
        use std::net::TcpListener;
        let port = pick_port();
        // Bindable at the moment it is handed back. The window between here
        // and the daemon binding is what the frontend's probe covers.
        assert!(TcpListener::bind(("127.0.0.1", port)).is_ok(), "port {port} was not free");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        // The daemon is reached through this rather than through the webview's
        // own fetch. qBittorrent's CSRF protection compares the request origin
        // against its own host, and a webview sends http://tauri.localhost,
        // which it rejects with a 401. A request from Rust carries no Origin
        // and no Referer at all, which the daemon accepts.
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(Daemon::default())
        .manage(http::Http::default())
        .manage(WebUiPort::default())
        .invoke_handler(tauri::generate_handler![
            bundled_connection,
            daemon_running,
            report_connection,
            set_window_icon,
            http::api_get,
            http::api_post,
            http::api_post_form
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                fit_within_screen(&window);
            }

            // The config has to exist and hold our credentials before the
            // daemon reads it. Without this the daemon generates its own WebUI
            // password, `bundled_connection` hands the frontend ours, and every
            // request 403s against a daemon that is running perfectly.
            let profile = match app.path().app_data_dir() {
                Ok(dir) => dir,
                Err(error) => {
                    log::error!("no app data directory: {error}");
                    return Ok(());
                }
            };

            // A daemon from a previous launch may still be running. It holds
            // the profile lock, so a second one started now would exit
            // immediately and the app would sit next to a working daemon
            // reporting that it cannot find one. Adopt it instead.
            let config = daemon::config_path(&profile);
            let adopted = daemon::configured_port(&config).filter(|p| daemon::something_listening(*p));

            let port = adopted.unwrap_or_else(pick_port);
            if let Ok(mut slot) = app.state::<WebUiPort>().0.lock() {
                *slot = port;
            }

            if let Some(port) = adopted {
                log::info!("adopting the daemon already running on port {port}");
                return Ok(());
            }

            match daemon::ensure_password() {
                Ok(password) => {
                    let hash = daemon::hash_password(&password);
                    if let Err(error) =
                        daemon::write_config(&config, DAEMON_USER, &hash, port)
                    {
                        log::error!("could not write {}: {error}", config.display());
                    } else {
                        log::info!("daemon config at {}", config.display());
                    }
                }
                Err(error) => log::error!("could not prepare credentials: {error}"),
            }

            // Its own profile, so the bundled instance never touches settings
            // or torrents belonging to a qBittorrent the user already runs.
            match app.shell().sidecar("qbittorrent-nox") {
                Ok(command) => match command
                    .args([
                        format!("--profile={}", profile.display()),
                        format!("--webui-port={port}"),
                    ])
                    .spawn()
                {
                    Ok((_rx, child)) => {
                        log::info!("qbittorrent-nox started on port {port}");
                        if let Ok(mut slot) = app.state::<Daemon>().0.lock() {
                            *slot = Some(child);
                        }
                    }
                    Err(error) => log::warn!("could not start qbittorrent-nox: {error}"),
                },
                // The app still opens without the sidecar. The frontend falls
                // back to the mock transport, which is what makes the UI
                // reviewable before the binary is vendored.
                Err(error) => log::warn!("no qbittorrent-nox sidecar available: {error}"),
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // The daemon is ours, so it goes down with the window rather
                // than being left running headless after the UI closes.
                if let Ok(mut slot) = window.state::<Daemon>().0.lock() {
                    if let Some(child) = slot.take() {
                        let _ = child.kill();
                        log::info!("qbittorrent-nox stopped");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running rigseed");
}
