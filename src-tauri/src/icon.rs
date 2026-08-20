//! The window icon, recoloured to whatever accent the user picked.
//!
//! The icon compiled into the executable cannot change: it is a resource in
//! the binary, and it is what Explorer and the Start menu shortcut show. The
//! icon the *window* carries is a different thing, set at runtime, and that is
//! the one on the taskbar while the app is open. So the taskbar follows the
//! theme and the file icon does not, which is the same split every app with a
//! dynamic icon lives with.
//!
//! Rendered rather than shipped as a set of pre-baked files. Eight accents in
//! two modes is sixteen variants, and every future accent would be sixteen
//! more; substituting two colours into one SVG and rasterising it costs a few
//! milliseconds and keeps the art in a single place.

use resvg::tiny_skia;
use resvg::usvg;

/// The mark, with its two colours left as tokens.
///
/// Kept here rather than read from `icons/` at runtime because the packaged
/// app has no source tree to read from, and because this is the only variant
/// that needs to be recoloured: the generated PNG set stays as it is.
const TEMPLATE: &str = include_str!("../icons/rigseed-mark.template.svg");

/// Side of the rendered icon.
///
/// 256 is what Windows asks for when it wants a large window icon, and
/// downscaling from it is cheaper and better than rendering several sizes.
const SIZE: u32 = 256;

#[derive(Debug, thiserror::Error)]
pub enum IconError {
    #[error("the icon template could not be parsed: {0}")]
    Parse(#[from] usvg::Error),
    #[error("a {SIZE}x{SIZE} pixmap could not be allocated")]
    Allocate,
}

/// The field colours for one accent, dark and light.
///
/// These mirror `tokens/colors.css`, which is canonical. They are duplicated
/// rather than parsed out of it because the CSS is not shipped to the binary,
/// and a wrong colour here is a slightly-off icon rather than a broken app.
///
/// The pair is the accent and a darker extension of it, which is what gives
/// the field its depth. The light-mode accent is already the darker of the two
/// published values, so it doubles as the gradient's far end.
fn field(accent: &str, dark_mode: bool) -> (&'static str, &'static str) {
    let (top, bottom) = match accent {
        "amber" => ("#C2924A", "#70501C"),
        "sage" => ("#5E8C63", "#2C5233"),
        "terracotta" => ("#A85A42", "#5E2F20"),
        "mustard" => ("#A8873C", "#5A4514"),
        "slateteal" => ("#43807D", "#1F4A47"),
        "lavender" => ("#7367A5", "#3B3363"),
        "slate" => ("#5A626E", "#2E343D"),
        // dustblue, and anything unrecognised. An accent we do not know about
        // is a themed icon we cannot draw, not a reason to fail.
        _ => ("#5A8AAA", "#2B5069"),
    };

    if dark_mode {
        (top, bottom)
    } else {
        // Light mode gets the deeper end at the top, so the icon stays legible
        // against a pale taskbar rather than glowing on it.
        (bottom, top)
    }
}

/// The icon for one accent as a PNG.
///
/// Only used by `examples/render-icons.rs`, which writes every accent out so
/// they can be looked at together. Worth having: the whole point of theming
/// the icon is how the set looks side by side, and that is not a thing a unit
/// test can tell you.
pub fn render_png(accent: &str, dark_mode: bool) -> Result<Vec<u8>, IconError> {
    let pixmap = draw(accent, dark_mode)?;
    pixmap.encode_png().map_err(|_| IconError::Allocate)
}

/// The icon for one accent, as premultiplied RGBA at [`SIZE`] square.
pub fn render(accent: &str, dark_mode: bool) -> Result<(Vec<u8>, u32, u32), IconError> {
    Ok((draw(accent, dark_mode)?.take(), SIZE, SIZE))
}

/// Substitute the sky and rasterise.
fn draw(accent: &str, dark_mode: bool) -> Result<tiny_skia::Pixmap, IconError> {
    let (top, bottom) = field(accent, dark_mode);
    let svg = TEMPLATE
        .replace("SKY_TOP", top)
        .replace("SKY_BOTTOM", bottom);

    let tree = usvg::Tree::from_str(&svg, &usvg::Options::default())?;
    let mut pixmap = tiny_skia::Pixmap::new(SIZE, SIZE).ok_or(IconError::Allocate)?;

    let size = tree.size();
    let scale = SIZE as f32 / size.width().max(size.height());
    resvg::render(
        &tree,
        tiny_skia::Transform::from_scale(scale, scale),
        &mut pixmap.as_mut(),
    );

    Ok(pixmap)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_something_for_every_accent() {
        // The eight in tokens/colors.css. A typo in one of their keys would
        // silently give that accent the dustblue icon, which is the kind of
        // thing nobody notices until they are looking for it.
        for accent in [
            "dustblue",
            "amber",
            "sage",
            "terracotta",
            "mustard",
            "slateteal",
            "lavender",
            "slate",
        ] {
            let (rgba, w, h) = render(accent, true).expect(accent);
            assert_eq!((w, h), (SIZE, SIZE));
            assert_eq!(rgba.len(), (SIZE * SIZE * 4) as usize);
            assert!(rgba.iter().any(|&b| b != 0), "{accent} rendered blank");
        }
    }

    #[test]
    fn the_accents_actually_differ() {
        // The whole point. If the substitution silently failed, every accent
        // would render the same bytes and the feature would look implemented.
        let blue = render("dustblue", true).unwrap().0;
        let sage = render("sage", true).unwrap().0;
        assert_ne!(blue, sage);
    }

    #[test]
    fn mode_changes_the_icon_too() {
        assert_ne!(
            render("dustblue", true).unwrap().0,
            render("dustblue", false).unwrap().0
        );
    }

    #[test]
    fn an_unknown_accent_falls_back_rather_than_failing() {
        // A future accent added to the CSS and not here should still get an
        // icon. Wrong colour beats no icon.
        let unknown = render("chartreuse", true).unwrap().0;
        assert_eq!(unknown, render("dustblue", true).unwrap().0);
    }
}
