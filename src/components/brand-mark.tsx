/**
 * The rigseed brand mark.
 *
 * Lives here rather than beside the icon set because it is a component, and a
 * module that exports both a component and data cannot be hot reloaded.
 */

/**
 * A seedling: stem and two leaves.
 *
 * The same plant as the app icon, drawn for a 20px slot rather than for a
 * taskbar. The icon needs a field of its own because it sits on a wallpaper
 * nobody chose for us; here the rail is already the app's own surface, so the
 * tile would be a box around a logo that does not need one.
 *
 * The icon's ground is gone with the tile, and had to be. A line between soil
 * and sky needs a soil and a sky on either side of it; with no field behind
 * the mark it separates nothing and reads as a stray curve under the plant.
 * It was tried at two widths before that became obvious.
 *
 * Everything is `currentColor`, and the rail wraps this in `text-accent`, so
 * the mark follows the chosen accent through the cascade with no work of its
 * own. That is the same mechanism the whole app uses, and the reason this is
 * a component rather than an image.
 *
 * The leaves are filled where the rail's other glyphs are stroked. They are
 * meant to differ: those are navigation, this is a logo, and at 20px a stroked
 * leaf closes up into a blob.
 */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V7.8" />
      <path
        d="M12 11.4c0-3.2 2.6-5.8 5.8-5.8 0 3.2-2.6 5.8-5.8 5.8Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 15.2c0-2.4-2-4.4-4.4-4.4 0 2.4 2 4.4 4.4 4.4Z"
        fill="currentColor"
        stroke="none"
        opacity="0.62"
      />
    </svg>
  )
}
