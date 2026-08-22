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

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WebviewWindow,
};

/// The event the frontend listens for, emitted instead of closing.
pub const CLOSE_REQUESTED: &str = "rigseed://close-requested";

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
pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
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

/// Hides the window, leaving the daemon and the tray icon running.
#[tauri::command]
pub fn hide_to_tray<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = main_window(&app) {
        let _ = window.hide();
    }
}

/// Stops the daemon and exits for real.
#[tauri::command]
pub fn quit_app<R: Runtime>(app: AppHandle<R>) {
    crate::stop_daemon(&app);
    app.exit(0);
}
