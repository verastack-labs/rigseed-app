//! How this copy of rigseed was installed, where that changes what it may do.
//!
//! One caller so far, and it is the whole reason this exists: the updater. A
//! Flatpak, a Snap or an MSIX is owned by the store that installed it. The app
//! cannot write to its own installation there, and even where it could,
//! overwriting a package behind the package manager's back leaves the two
//! disagreeing about what is installed. Those builds have to say so and send
//! the person to their software centre instead.
//!
//! The Microsoft Store is the newest of the three and the only one that also
//! applies on Windows, where the NSIS installer must keep updating itself.
//! The two are told apart by package identity rather than by install path.
//!
//! Everything else updates itself, and that deliberately includes the
//! AppImage: `release.yml` offers the AppImage to the updater as the only
//! Linux format it can apply, precisely because nothing else owns it. The
//! .deb and .rpm are owned by apt and dnf, but they are also never offered to
//! the updater, so a copy installed from one simply never finds an update to
//! apply. That is the existing behaviour and this does not change it.

/// Where this build came from, as far as it can tell at runtime.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Packaging {
    /// Installed by Flatpak. Updates come from the remote it was installed
    /// from, which on a published build is Flathub.
    Flatpak,
    /// Installed by snapd, which refreshes on its own schedule.
    Snap,
    /// Installed from the Microsoft Store as an MSIX. The Store delivers
    /// updates for a packaged app, and the install lives under
    /// `C:\Program Files\WindowsApps`, which is read-only to the app itself.
    ///
    /// Renamed rather than left to `rename_all`, which would produce
    /// `microsoftstore`. The hyphen is what the frontend's union type spells.
    #[serde(rename = "microsoft-store")]
    MicrosoftStore,
    /// Everything else: the AppImage, the .deb, the .rpm, the NSIS installer
    /// and the .dmg. None of these are managed by a store.
    Native,
}

/// Detected from the two marks a sandbox leaves, kept separate from the
/// looking-up so it can be tested without a sandbox to run in.
///
/// `/.flatpak-info` rather than the `FLATPAK_ID` environment variable: the
/// file is written into every Flatpak sandbox by the runtime, while the
/// variable is set for the application's own process and is not inherited
/// reliably by everything that might ask this question later.
fn classify(flatpak_info: bool, snap: Option<&str>, package_identity: bool) -> Packaging {
    if flatpak_info {
        return Packaging::Flatpak;
    }
    // Set to the mount point of the snap. Present but empty is not a snap:
    // an empty environment variable is how a shell unsets one by accident.
    if snap.is_some_and(|s| !s.is_empty()) {
        return Packaging::Snap;
    }
    // Windows only, and the three marks cannot co-occur on one machine, so
    // the order between this and the two above is arbitrary rather than a
    // precedence decision.
    if package_identity {
        return Packaging::MicrosoftStore;
    }
    Packaging::Native
}

/// Whether this process is running inside an MSIX package.
///
/// Asked of Windows rather than inferred from the executable's path. A path
/// test against `\WindowsApps\` would be right today, and the spike that
/// proved this route measured exactly that location, but it is a guess about
/// an implementation detail that Microsoft has never promised to keep. This
/// API is the question itself: `GetCurrentPackageFamilyName` answers
/// `APPMODEL_ERROR_NO_PACKAGE` for a process with no package identity, and
/// anything else means there is one.
///
/// Called with a zero length and no buffer, so it never writes the name it
/// would otherwise return. The error distinguishing the two cases arrives
/// before any buffer is needed: a packaged process reports
/// `ERROR_INSUFFICIENT_BUFFER` instead.
#[cfg(target_os = "windows")]
fn has_package_identity() -> bool {
    use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFamilyName;

    /// Not re-exported by windows-sys under a name worth importing, and it is
    /// the one constant this hinges on, so it is spelled out with its source.
    /// Defined in appmodel.h as 15700.
    const APPMODEL_ERROR_NO_PACKAGE: u32 = 15700;

    let mut length: u32 = 0;
    let result = unsafe { GetCurrentPackageFamilyName(&mut length, std::ptr::null_mut()) };
    result != APPMODEL_ERROR_NO_PACKAGE
}

/// Looks for the marks on this machine.
#[cfg(target_os = "linux")]
fn detect() -> Packaging {
    classify(
        std::path::Path::new("/.flatpak-info").exists(),
        std::env::var("SNAP").ok().as_deref(),
        false,
    )
}

/// Windows has no Flatpak and no Snap, so only package identity is asked for.
#[cfg(target_os = "windows")]
fn detect() -> Packaging {
    classify(false, None, has_package_identity())
}

/// macOS has none of the three. Still routed through `classify` rather than
/// returning Native directly, so the one function that decides this is the
/// same one the tests cover on every platform and does not fall out of the
/// build as dead code.
#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn detect() -> Packaging {
    classify(false, None, false)
}

/// Whether a store owns this installation, and which one.
#[tauri::command]
pub fn packaging() -> Packaging {
    let found = detect();
    log::info!("packaging detected as {found:?}");
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_flatpak_is_recognised_by_its_info_file() {
        assert_eq!(classify(true, None, false), Packaging::Flatpak);
    }

    #[test]
    fn a_snap_is_recognised_by_its_mount_point() {
        assert_eq!(
            classify(false, Some("/snap/rigseed/42"), false),
            Packaging::Snap
        );
    }

    #[test]
    fn an_ordinary_install_is_native() {
        assert_eq!(classify(false, None, false), Packaging::Native);
    }

    /// Package identity is the only mark an MSIX leaves, and it is what the
    /// spike measured: the daemon really did spawn from WindowsApps, so the
    /// install is read-only and the Store owns updates for it.
    #[test]
    fn a_packaged_windows_build_is_the_microsoft_store() {
        assert_eq!(classify(false, None, true), Packaging::MicrosoftStore);
    }

    /// The NSIS installer produces a process with no package identity, which
    /// is the whole point: that copy keeps its own updater.
    #[test]
    fn an_nsis_install_has_no_package_identity_and_updates_itself() {
        assert_eq!(classify(false, None, false), Packaging::Native);
    }

    /// An empty SNAP is not a snap. A shell that exports the name without a
    /// value would otherwise switch updates off for somebody running the
    /// AppImage, and the symptom would be updates quietly never appearing.
    #[test]
    fn an_empty_snap_variable_is_not_a_snap() {
        assert_eq!(classify(false, Some(""), false), Packaging::Native);
    }

    /// Flatpak wins when both are somehow present, because the sandbox is the
    /// stronger claim: inside one, the installation really is read-only.
    #[test]
    fn flatpak_wins_over_snap() {
        assert_eq!(
            classify(true, Some("/snap/rigseed/42"), false),
            Packaging::Flatpak
        );
    }

    /// Serialised lowercase, because the frontend compares against these
    /// strings and a rename here would silently stop matching there.
    #[test]
    fn it_serialises_as_the_names_the_frontend_expects() {
        assert_eq!(
            serde_json::to_string(&Packaging::Flatpak).unwrap(),
            "\"flatpak\""
        );
        assert_eq!(serde_json::to_string(&Packaging::Snap).unwrap(), "\"snap\"");
        assert_eq!(
            serde_json::to_string(&Packaging::MicrosoftStore).unwrap(),
            "\"microsoft-store\""
        );
        assert_eq!(
            serde_json::to_string(&Packaging::Native).unwrap(),
            "\"native\""
        );
    }
}
