//! Writes the icon in every accent, so the set can be looked at together.
//!
//! The unit tests can tell you the accents render and that they differ. They
//! cannot tell you whether eight of them sit well beside each other, or
//! whether one of them disappears against a taskbar, and those are the only
//! questions worth asking about a themed icon.
//!
//!     cargo run --example render-icons -- <output directory>
//!
//! Uses the same `icon::render_png` the running app uses, so what comes out
//! here is what the window will actually wear.

use std::fs;
use std::path::PathBuf;

use rigseed_lib::icon;

/// The eight in `tokens/colors.css`.
const ACCENTS: [&str; 8] = [
    "dustblue",
    "amber",
    "sage",
    "terracotta",
    "mustard",
    "slateteal",
    "lavender",
    "slate",
];

fn main() {
    let out: PathBuf = std::env::args()
        .nth(1)
        .unwrap_or_else(|| ".".into())
        .into();

    if let Err(error) = fs::create_dir_all(&out) {
        eprintln!("could not create {}: {error}", out.display());
        std::process::exit(1);
    }

    let mut written = 0;
    for accent in ACCENTS {
        for (mode, dark) in [("dark", true), ("light", false)] {
            let png = match icon::render_png(accent, dark) {
                Ok(png) => png,
                Err(error) => {
                    eprintln!("{accent} {mode}: {error}");
                    std::process::exit(1);
                }
            };

            let path = out.join(format!("{accent}-{mode}.png"));
            if let Err(error) = fs::write(&path, &png) {
                eprintln!("could not write {}: {error}", path.display());
                std::process::exit(1);
            }
            written += 1;
        }
    }

    println!("wrote {written} icons to {}", out.display());
}
