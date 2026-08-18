# rigseed — Cozy Terminal design system

rigseed is a desktop client for **qBittorrent**. It is a Tauri shell that launches
`qbittorrent-nox` as a sidecar and drives it entirely over the existing Web API v2.x.
No C++/Qt is touched — the product is a frontend replacement for a dated GUI, plus a
first-run experience and a theming layer the stock client does not have.

The design system is called **Cozy Terminal**. It is deliberately not Material: the
dominant Android qBittorrent client is Material 3, and following M3 would make this
read as the desktop port of that app.

## Sources

Everything here is derived from the hi-fi prototypes built in this project — the same
files that ship in `docs/design-references/`:

| Prototype | Screen |
|---|---|
| `Dashboard Cozy.dc.html` | Transfers (main), first-run setup modal, add FAB |
| `Torrent Detail.dc.html` | Detail view, five tabs |
| `Add Torrent.dc.html` | Add modal, inline category/tag creators |
| `Search.dc.html` | Search, engines, plugin manager, five states |
| `Settings.dc.html` | Preferences, alt-speed schedule grid |
| `Categories and Tags.dc.html` | Category and tag CRUD |
| `Logs.dc.html` | Log viewer and ban list |
| `RSS.dc.html` | Feeds, item table, auto-download rules |
| `Connections.dc.html` | Saved instances, address and auth, test connection |

Six further prototypes are shared pieces the screens import: `Rail`, `Appearance`,
`ConfirmDialog`, `FormDialog`, `EmptyState` and `Skeleton`, plus `rigseed-theme.css`
(the `[data-mode][data-accent]` variable layer) and `keyboard.js`.

The written specification follows the Verastack Labs shape: `PRODUCT.md` and `DESIGN.md`
at the root, detail in `docs/` (`docs/README.md` first). No Figma file, no external
codebase and no brand book were provided; nothing in this system is inferred from a
source I could not read.

**No logo file was supplied.** The brand mark is a cleat glyph drawn as a line icon
(see Iconography) and the wordmark is set in plain type. If a real mark exists, drop
it into `assets/` and replace both.

Agency: verastack-labs. Product owner: Rigan / Riggs.

---

## Content fundamentals

**Voice.** Plain, factual, slightly technical. The app assumes the reader is capable
but does not assume they know BitTorrent vocabulary. Sentences are complete and
lowercase-after-the-first-word; no exclamation marks, no encouragement, no jokes.

**Person.** Second person, sparingly. "You can change all of this later in Settings."
Never first person — the app does not have a personality that says "I".

**Casing.** Sentence case for every title, label, button and menu item. The only
uppercase is the 10px section header (`ENGINES`, `CATEGORY`, `VIEW`) and table headers.
The product name **rigseed** is lowercase always, including sentence-initial.

**Verbs.** Pause and Resume are the verbs for a running or paused torrent. Start and
Stop are reserved for 0% and 100%. The two pairs are never mixed — that rule is worth
more than it looks, because the stock client mixes them and users misread it.

**Explanations sit next to controls, not in help.** Every switch has a one-line hint
under its label; every destructive action names its consequence inline
("torrents are not deleted, they lose the label").

**Empty states explain the mechanism, not the feeling.** "Searching needs at least one
plugin. Each plugin is a Python file that teaches the client how to query one site."
Not "Nothing here yet!".

**The API is visible.** Each screen prints the endpoints it exercises in mono
(`torrents/add · app/preferences`). This is intentional: the audience is technical, it
doubles as living documentation, and it makes the app feel like a real client rather
than a skin.

**Numbers are never dressed up.** `3.65 GB of 5.7 GB`, `4m 12s left`, `1.42`. In the
Easy layout only, plain language replaces them: "4 minutes left".

**No emoji.** Anywhere. Status is a coloured dot plus a word.

---

## Visual foundations

**Palette.** Warm, low-contrast neutrals — no pure black, no pure white, no cool
Material grey. Dark mode is warm charcoal (`#191A1C` base); light is paper
(`#F6F6F5`). Dark is the default.

**The accent tints everything.** Picking an accent does not just recolour buttons: a
percentage of it is mixed into every neutral surface via `color-mix`, so bg, sidebar,
surface, surface2 and line all shift. Switching accent reads as a reskin, not a
highlight swap. Seven accents, each with a paired secondary: download/progress use
`--accent`, upload/seeding use `--accent2`. Paused and stalled states are never
accent-coloured — they drop to `--surface2` / `--text-dimmer`.

**Type.** Inter for language, JetBrains Mono for data. Two families, no third. Body
text is 12.5px, which is small by web standards and correct for a desktop client
with dense tables. Titles are 30px/600 at −0.02em.

**Backgrounds.** Flat colour only. No gradients, no imagery, no texture, no pattern.
The only "graphic" surfaces in the whole app are the speed sparklines (a filled area
at ~16% accent opacity under a 1.6–1.8px line) and the alt-speed schedule grid.

**Cards.** `--surface` fill, 1px `--line` border, radius 11–12px, no shadow at rest.
Depth comes from layering surfaces, not from elevation. Shadows appear only on things
that genuinely float: menus, the FAB, modals, the expanded rail.

**Corner radii** step from 4px (checkbox) through 7–9px (controls) to 11–14px (cards
and modals), with 20px pills for chips and full circles for swatches and the FAB.

**Transparency and blur** are rationed. Scrims (rail 80% + 3px blur, modal 72% + 6px
blur) and the FAB option circles (8px backdrop blur) are the only uses. Hover on a
floating element mixes the accent *into* the surface rather than using a translucent
tint — a translucent hover let the page show through and looked broken.

**Motion.** Overshoot for anything that expands (`cubic-bezier(0.34,1.56,0.64,1)`),
a gentler curve for the rail, a long ease-out for the appearance panel, plain ease for
colour. Nothing is linear. Progress bars animate between polls so a download reads as
continuous; list rows animate in and out because `sync/maindata` changes them
underneath the user. `prefers-reduced-motion` drops scale and overshoot, keeps fades.

**Hover.** Rows take `--surface2`; cards raise their border to `--accent`; secondary
buttons take `--accent-soft` with `--accent` text; primary buttons brighten 7%.
**Press** scales to 0.96. **Focus** is a 2px `--accent` ring at 2px offset, on
everything.

**Selected** is always the same pair: `--accent-soft` background with `--accent` text
or border. Learn it once, read it everywhere.

**Layout.** Fixed left rail (60px, expanding to 212px as an overlay with no reflow),
fixed sidebar and pane widths, everything else flexes. Designed at 1440×900; minimum
supported 1100×700.

**Density.** High but not cramped: 40px rows, 9px vertical padding, 12–18px gaps
between cards. The Easy layout deliberately breaks this — bigger tiles, 44px targets,
fewer numbers — and is the one recommended to newcomers.

---

## Iconography

**Feather-style line icons**, drawn inline in the prototypes: `viewBox="0 0 24 24"`,
`fill: none`, `stroke: currentColor`, `stroke-width: 2` (2.2–2.6 for small or emphatic
glyphs), round caps and joins. Sizes: 11–13px inline with text, 14–17px in buttons and
rows, 20–24px for feature tiles.

No icon font, no sprite sheet and no icon package existed in the sources — the
prototypes hand-inline each path. For the real app, use **Lucide**, which is the same
drawing convention at the same stroke weight. This system links it from CDN in the
component cards and UI kit. *Flagged substitution: Lucide stands in for the
hand-drawn paths; they match visually, but if you want the prototype paths exactly,
they are in the `.dc.html` files.*

The one glyph that is **not** Lucide is the brand mark, in `assets/mark.svg`: a cleat
— a horizontal bar with flared horns at both ends and a rope loop rotated −38° across
it. Always `--accent`, 19–20px, 1.7–2px stroke.

Icons never carry meaning alone. Every status dot has a word beside it; every icon
button has a `title`.

No emoji, no unicode symbols as icons, no PNG icons anywhere.

---

## Index

| Path | What |
|---|---|
| `styles.css` | The entry point. Imports every token file. |
| `tokens/` | `fonts`, `colors`, `typography`, `spacing`, `shape`, `motion`, `base` |
| `guidelines/` | Foundation specimen cards (Colors, Type, Spacing, Motion, Brand) |
| `components/core/` | Button, IconButton, Input, Checkbox, Switch, SegmentedControl, Chip, Card, SectionHeader, StatusDot, IconTile, Badge |
| `components/data/` | ProgressBar, StatCard, Sparkline, DataValue |
| `components/navigation/` | NavRail, RailItem, FilterRow, TabBar, ContextMenu |
| `ui_kits/rigseed-desktop/` | Click-through recreation of the app |
| `assets/` | `mark.svg` (cleat brand mark) |
| `SKILL.md` | Agent Skills entry point |
| `PRODUCT.md` | Product schema — platform, users, purpose, constraints, principles |
| `DESIGN.md` | Design system with machine-readable frontmatter, `[shared]`/`[app]` tagged |
| `docs/` | Architecture, foundations, app shell, motion and states, build plan, screens |
| `COMPONENTS.md` | Which file owns which kind of change in the prototypes |

### Intentional additions

- **IconTile** — the rounded accent-tinted square that fronts modal headers, category
  rows and empty states. It recurs on every screen; it is one component, not a pattern
  to re-inline.
- **DataValue** — a mono `<span>` with the right size and weight. Trivial, but it is
  what enforces the Inter/Mono split, which is the rule most likely to be broken.
