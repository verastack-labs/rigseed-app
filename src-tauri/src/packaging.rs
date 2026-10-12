//! How this copy of rigseed was installed, where that changes what it may do.
//!
//! One caller so far, and it is the whole reason this exists: the updater. A
//! Flatpak or a Snap is owned by the store that installed it. The app cannot
//! write to its own installation there, and even where it could, overwriting
//! a package behind the package manager's back leaves the two disagreeing
//! about what is installed. Those builds have to say so and send the person
//! to their software centre instead.
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
fn classify(flatpak_info: bool, snap: Option<&str>) -> Packaging {
    if flatpak_info {
        return Packaging::Flatpak;
    }
    // Set to the mount point of the snap. Present but empty is not a snap:
    // an empty environment variable is how a shell unsets one by accident.
    if snap.is_some_and(|s| !s.is_empty()) {
        return Packaging::Snap;
    }
    Packaging::Native
}

/// Looks for the marks on this machine.
#[cfg(target_os = "linux")]
fn detect() -> Packaging {
    classify(
        std::path::Path::new("/.flatpak-info").exists(),
        std::env::var("SNAP").ok().as_deref(),
    )
}

/// Neither format exists off Linux, so neither mark is looked for. Still
/// routed through `classify` rather than returning Native directly, so the
/// one function that decides this is the same one the tests cover on every
/// platform and does not fall out of the build as dead code on two of three.
#[cfg(not(target_os = "linux"))]
fn detect() -> Packaging {
    classify(false, None)
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
        assert_eq!(classify(true, None), Packaging::Flatpak);
    }

    #[test]
    fn a_snap_is_recognised_by_its_mount_point() {
        assert_eq!(classify(false, Some("/snap/rigseed/42")), Packaging::Snap);
    }

    #[test]
    fn an_ordinary_install_is_native() {
        assert_eq!(classify(false, None), Packaging::Native);
    }

    /// An empty SNAP is not a snap. A shell that exports the name without a
    /// value would otherwise switch updates off for somebody running the
    /// AppImage, and the symptom would be updates quietly never appearing.
    #[test]
    fn an_empty_snap_variable_is_not_a_snap() {
        assert_eq!(classify(false, Some("")), Packaging::Native);
    }

    /// Flatpak wins when both are somehow present, because the sandbox is the
    /// stronger claim: inside one, the installation really is read-only.
    #[test]
    fn flatpak_wins_over_snap() {
        assert_eq!(classify(true, Some("/snap/rigseed/42")), Packaging::Flatpak);
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
            serde_json::to_string(&Packaging::Native).unwrap(),
            "\"native\""
        );
    }
}
