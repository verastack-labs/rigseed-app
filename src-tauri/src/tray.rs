//! The system tray, and what closing the window actually means.
//!
//! rigseed used to kill the daemon on `WindowEvent::Destroyed`, with the
//! reasoning that our daemon should not be left running headless after the UI
//! closes. That is a real problem and it was the wrong horn of the dilemma:
//! closing the window stopped every transfer, seeding included, which for a
//! torrent client is the one thing closing a window must not do. Every client
//! people already use, and plenty of non-clients, answer it the same way: do
//! not destroy the window, hide it.
//!
//! So nothing here decides on its own. The close is always prevented and the
//! decision handed to the frontend, which is where the preference lives and
//! where a dialog can be drawn. The frontend answers with `hide_to_tray` or
//! `quit_app`.
//!
//! That hands the frontend a veto over closing the window, which is only safe
//! because the tray's own Quit does not go through it. If the webview is
//! wedged, the menu still works.

use std::panic::{catch_unwind, AssertUnwindSafe};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WebviewWindow,
};
use tauri_plugin_notification::NotificationExt;

/// The event the frontend listens for, emitted instead of closing.
pub const CLOSE_REQUESTED: &str = "rigseed://close-requested";

/// Whether this machine actually gave us a tray icon.
///
/// Managed state rather than a flag passed around, because the one place that
/// needs it is a command invoked from the frontend long after startup.
///
/// It is false more often than you would expect. The Flatpak runtime ships no
/// Ayatana library at all, and on a plain GNOME desktop the icon is invisible
/// without a shell extension even when the library is there. Hiding a window
/// into a tray nobody can see is how an app looks like it has crashed.
pub struct TrayPresent(pub bool);

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window("main")
}

/// Brings the window back, from the tray or from a second launch.
///
/// `unminimize` before `show`, because a window hidden while minimised comes
/// back minimised and looks like the click did nothing.
pub fn reveal<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = main_window(app) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Builds the tray icon and its menu.
/// Builds the tray, reporting whether one now exists.
///
/// Never fails the startup it is called from. Two things can go wrong and only
/// one of them used to be survivable: `build` returns an error, which the
/// caller already handled, or the process dies outright. On Linux the tray is
/// drawn by libayatana-appindicator, loaded at the moment the icon is built,
/// and `libappindicator-sys` panics when that library is absent. A panic is
/// not an `Err`, so the caller's error handling never ran and rigseed exited
/// 101 before showing a window. That is exactly what happened in the Flatpak,
/// where the GNOME runtime ships no Ayatana library.
///
/// So the build is caught rather than trusted. Losing the tray is a real
/// downgrade and it is survivable; losing the app is not.
///
/// This relies on panics unwinding, which is Cargo's default and which no
/// profile in this workspace overrides. Setting `panic = "abort"` for a
/// smaller binary would turn the catch back into the crash it exists to
/// prevent, without anything failing to compile.
pub fn install<R: Runtime>(app: &AppHandle<R>) -> bool {
    match catch_unwind(AssertUnwindSafe(|| build(app))) {
        Ok(Ok(())) => true,
        Ok(Err(error)) => {
            log::warn!("no system tray: {error}");
            false
        }
        // The panic's own message is already on stderr by the time this runs,
        // which is where the missing library gets named.
        Err(_) => {
            log::warn!(
                "no system tray: building it panicked, which on Linux means \
                 libayatana-appindicator could not be loaded"
            );
            false
        }
    }
}

fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show rigseed", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit rigseed", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .menu(&menu)
        // The menu is for the right button. Left clicking a tray icon is
        // expected to show the window, and a menu appearing there instead is
        // an extra click on the thing people do most.
        .show_menu_on_left_click(false)
        .tooltip("rigseed")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => reveal(app),
            // Not `hide` and not the frontend's business. This is the escape
            // hatch that makes preventing the close safe, so it must not
            // depend on the webview being able to answer.
            "quit" => {
                crate::stop_daemon(app);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                reveal(tray.app_handle());
            }
        });

    // The window icon, so the tray matches the taskbar rather than being a
    // second piece of art to keep in step with it.
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;
    Ok(())
}

/// Hides the window, leaving the daemon running.
///
/// The hiding is the point and it happens either way: closing the window must
/// never stop a transfer, seeding included, which is the whole reason the
/// close is prevented in the first place.
///
/// What changes without a tray is whether anyone can tell. There is then no
/// icon to click, so the app has apparently vanished while still running, and
/// the natural next move is to launch rigseed again. That works, because the
/// single instance guard reveals this window instead of starting a second
/// copy, but nobody would guess it. So we say it.
#[tauri::command]
pub fn hide_to_tray<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = main_window(&app) {
        let _ = window.hide();
    }

    if app.state::<TrayPresent>().0 {
        return;
    }

    // Best effort. A notification that cannot be shown is not a reason to
    // refuse to hide a window, and on a machine with no notification daemon
    // this is the only part of the operation that can fail.
    if let Err(error) = app
        .notification()
        .builder()
        .title("rigseed is still running")
        .body("Your transfers are still going. Open rigseed again to bring the window back.")
        .show()
    {
        log::warn!("could not say that rigseed is still running: {error}");
    }
}

/// Stops the daemon and exits for real.
#[tauri::command]
pub fn quit_app<R: Runtime>(app: AppHandle<R>) {
    crate::stop_daemon(&app);
    app.exit(0);
}
