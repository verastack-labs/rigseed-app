---
name: rigseed
description: A desktop client for qBittorrent. Warm surfaces, live numbers, seven accents.
colors:
  page-bg: "#191A1C"
  sidebar-bg: "#141517"
  surface: "#212327"
  surface-raised: "#2A2C31"
  border: "#34373C"
  text-primary: "#E9E8E6"
  text-secondary: "#979A9F"
  text-muted: "#6A6D73"
  accent: "#7FA2BC"
  accent-secondary: "#C97B63"
  accent-on: "#14181C"
  ok: "#7FA87F"
  warn: "#C79A3E"
  danger: "#C0563C"
typography:
  screen-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  big-metric:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
  card-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
  secondary:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 400
  section-label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.08em"
  table-header:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.07em"
  data:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "11.5px"
    fontWeight: 400
  data-readout:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "18px"
    fontWeight: 600
rounded:
  badge: "5px"
  control: "8px"
  group: "9px"
  card: "12px"
  modal: "14px"
  pill: "20px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    rounded: "{rounded.control}"
    padding: "9px 17px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
  input-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "0 12px"
---

# Design System: rigseed

## How this document is structured

rigseed has one surface today — the app — so unlike riggit there is no Persuade/Operate split to manage. The convention still holds:

- **Foundations** (colour, shape, elevation, motion principles, the brand mark) are canonical in `docs/design-foundations.md`, destined for `rigseed-internal/docs/`. They are mirrored below so the machine-readable block sits next to the code that gets checked. **Change them at the source first**, then propagate here and into the theme layer.
- **Everything else in this file is app-specific** and owned here.

Sections are tagged `[shared]` or `[app]`. When the landing page lands in `verastack-labs/rigseed`, it gets its own `DESIGN.md` mirroring the `[shared]` sections and owning its own type scale.

Propagation order: `rigseed-internal/docs/design-foundations.md` → this file's frontmatter → `rigseed-theme.css` (the prototype's variable layer, which the real app's `@theme` block replaces).

## Overview

**Creative North Star: "Cozy Terminal"**

A torrent client is a dashboard someone leaves open all day, so the surfaces are warm and low-contrast rather than cool and clinical, and the only sharp thing in the interface is the data. Monospace carries every number; Inter carries every sentence. The accent is chosen by the user and tints every neutral in the app, so switching it reads as a reskin rather than a highlight swap.

The register is a well-kept terminal rather than a media centre: no pure black, no pure white, no cool Material greys, no ripple, no tonal elevation, no pill FAB.

**Key Characteristics:**

- Warm neutrals in four steps (page, sidebar, surface, raised surface), each tinted with a percentage of the live accent
- Seven user-chosen accents, each with a paired secondary used for upload and seeding
- Monospace strictly for data; uppercase 10px tracked micro-labels do the section labelling
- Tight radii — 8px controls, 12px cards, 14px modals, full pills only for chips
- Spring overshoot on expand/collapse, never linear
- Light and dark both ship; dark is the default

## Colors [shared]

Colour is computed in two stages: a mode-dependent base palette with per-mode tint strengths, then the chosen accent mixed into each base tone.

### Stage 1 — base neutrals and tint strengths

Dark mode:

```
--base-bg: #191A1C;   --base-sidebar: #141517;  --base-surface: #212327;  --base-surface2: #2A2C31;
--border: #34373C;    --text: #E9E8E6;          --text-dim: #979A9F;      --text-dimmer: #6A6D73;
--accent-on: #14181C; --shadow-color: rgba(0,0,0,0.5);
--ok: #7FA87F;        --warn: #C79A3E;          --danger: #C0563C;
tint: bg 7% · sidebar 9% · surface 8% · surface2 10% · border 14%
```

Light mode:

```
--base-bg: #F6F6F5;   --base-sidebar: #EFEFEE;  --base-surface: #FFFFFF;  --base-surface2: #F9F9F8;
--border: #E0E0DE;    --text: #232527;          --text-dim: #7E8288;      --text-dimmer: #A9ADB2;
--accent-on: #FFFFFF; --shadow-color: rgba(40,50,60,0.14);
--ok: #4C7A4C;        --warn: #9A7420;          --danger: #B04A31;
tint: bg 9% · sidebar 12% · surface 4% · surface2 8% · border 22%
```

### Stage 2 — derived tokens

```css
--bg:          color-mix(in srgb, var(--accent) var(--tint-bg),       var(--base-bg));
--sidebar-bg:  color-mix(in srgb, var(--accent) var(--tint-sidebar),  var(--base-sidebar));
--surface:     color-mix(in srgb, var(--accent) var(--tint-surface),  var(--base-surface));
--surface2:    color-mix(in srgb, var(--accent) var(--tint-surface2), var(--base-surface2));
--line:        color-mix(in srgb, var(--accent) var(--tint-border),   var(--border));
--accent-soft:  color-mix(in srgb, var(--accent)  18%, transparent);
--accent2-soft: color-mix(in srgb, var(--accent2) 18%, transparent);
--warn-soft:    color-mix(in srgb, var(--warn)   14%, transparent);
--danger-soft:  color-mix(in srgb, var(--danger) 14%, transparent);
```

`color-mix` in sRGB is what the prototypes use. Reproduce it with CSS variables on a `[data-mode][data-accent]` wrapper rather than computing colour in JS, so a mode or accent change is one attribute write and no re-render.

### Accents

Seven options, each with a dark value, a light value and a paired secondary. **Default: Dusty Blue.**

| Key | Label | Accent (dark) | Accent (light) | Accent2 (dark) | Accent2 (light) |
|---|---|---|---|---|---|
| `dustblue` | Dusty Blue | `#7FA2BC` | `#43718F` | `#C97B63` | `#A85A42` |
| `amber` | Amber | `#E2AC66` | `#B0731F` | `#93B393` | `#4C7A4C` |
| `sage` | Sage | `#8FB08F` | `#4C7A4C` | `#E0A458` | `#B8752E` |
| `terracotta` | Terracotta | `#C97B63` | `#A85A42` | `#7C9CB4` | `#4E7590` |
| `mustard` | Mustard | `#D4B15E` | `#93761F` | `#6FA3A0` | `#3E7A76` |
| `slateteal` | Slate Teal | `#6FA3A0` | `#35726E` | `#D4B15E` | `#9C7E2E` |
| `lavender` | Lavender | `#A69BC9` | `#7367A5` | `#B08F6A` | `#8A6A42` |

### Named Rules

**The Tinted Neutral Rule.** No neutral in the app is a raw hex. Every surface is a mix of the base tone and the live accent at the tint strength for that mode, so the whole window shifts when the accent changes.

**The Semantic Colour Rule.** `--accent` carries download speed, progress fill, primary buttons, active nav, focus ring and links. `--accent2` carries upload speed, seeding state and peer progress. Status colours are fixed and independent of the accent: `--ok` for reachable/online, `--warn` for degraded, `--danger` for failed and destructive. A status must never borrow the accent — on a terracotta accent, an accent-coloured "online" is indistinguishable from a red "refused".

**Paused is never accent.** Paused, stalled and queued states use `--surface2` and `--text-dimmer`.

## Typography [app]

**UI font:** Inter. **Data font:** JetBrains Mono. Base document size 13px.

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Screen title (h1) | Inter | 30px (26px Settings, 34px Torrent Detail) | 600 | −0.02em |
| Big metric | Inter | 40px | 700 | Detail progress percentage |
| Card/section title | Inter | 12.5px | 600 | |
| Body / row text | Inter | 12.5px | 400–500 | |
| Secondary text | Inter | 11.5px | 400 | `--text-dim` |
| Section label | Inter | 10px | 700 | uppercase, +0.08em, `--text-dimmer` |
| Table header | Inter | 9.5–10px | 700 | uppercase, +0.07em |
| Data | JetBrains Mono | 10.5–12.5px | 400–600 | sizes, speeds, %, hashes, IPs, API names |
| Big data readout | JetBrains Mono | 17–20px | 600 | stat and speed cards |

### Named Rules

**The Mono Means Data Rule.** If it is a number, a path, a hash, an IP or an API endpoint, it is JetBrains Mono. If it is a sentence or a label, it is Inter. Nothing is mono for texture.

## Shapes [shared]

| Token | Value | Used for |
|---|---|---|
| radius-sm | 4–6px | checkboxes, badges, schedule cells |
| radius-md | 7–8px | buttons, inputs, small controls |
| radius-lg | 9px | segmented groups, nav and rail items |
| radius-xl | 11–12px | cards, tables, panels |
| radius-2xl | 14px | modals |
| pill | 20px | filter, engine and tag chips |
| circle | 50% | swatches, dots, FAB |

Borders are always `1px solid var(--line)`, four-sided. No single-sided accent borders.

## Elevation & Depth [shared]

Depth is background stepping first, shadow second. Shadows are reserved for things that genuinely float:

- card / menu: `0 8px 24px var(--shadow-color)`
- FAB and floating options: `0 4px 14px` (options), `0 6px 20px` (main button)
- modal: `0 24px 60px` to `0 30px 80px var(--shadow-color)`
- expanded nav rail: `10px 0 30px var(--shadow-color)`

In-flow cards, inputs and table rows never cast a shadow.

## Controls [app]

**Toggle switch** — track 36×20px, radius 10px, 1px border; knob 12×12px, 3px inset, `translateX(16px)` when on, transition `0.28s cubic-bezier(0.34,1.56,0.64,1)`. On: track `--accent-soft`, border `--accent`, knob `--accent`. Off: track `--surface2`, border `--line`, knob `--text-dimmer`.

**Segmented group** — wrapper `--surface2` + `--line`, radius 9px, 3px padding, 2–4px gap. Selected: `--accent-soft` background, `--accent` text. Unselected: transparent, `--text-dim`.

**Primary button** — `--accent` background, `--accent-on` text, radius 8px, padding 9px 17px, 12.5px/600. Hover `filter: brightness(1.07)`.

**Secondary button** — `--surface2` background, `--line` border, `--text` text. Hover `--accent-soft` background, `--accent` text.

**Destructive button** — `--surface2` background with `--danger` text at rest; on hover, `--danger-soft` background and `--danger` border. The filled `--danger` treatment is reserved for the confirm action inside a dialog.

**Icon button** — 30–34px square, radius 8px, `--surface2` + `--line`, `--text-dim` icon, `--accent` on hover.

**Input** — height 34–36px, radius 8px, `--surface2` background, `--line` border, 12px text; mono for paths, numbers and magnets, Inter for names. Focus: border `--accent`.

**Checkbox** — 16–17px square, radius 4–5px, 1.5px border. Checked: filled + `--accent-on` tick at 3.2–3.4 stroke width.

**Chip / tag** — radius 20px, padding 6px 11px, 12px/600, 7px colour dot, 1px border. Selected chips use the item's own colour at low alpha.

## Icons [shared]

Feather-style line icons: `viewBox 0 0 24 24`, `fill: none`, `stroke: currentColor`, stroke width 2 (2.2–2.6 for small or emphatic glyphs), round caps and joins. Sizes: 11–13px inline with text, 14–17px in buttons and rows, 20–24px for feature icons. Use one library in the real app — Lucide matches the drawing style — rather than re-inlining the prototype paths.

**Brand mark** — cleat glyph, accent-coloured:

```svg
<path d="M6.5 12h11M6.5 12 4 9.3M6.5 12 4 14.7M17.5 12 20 9.3M17.5 12 20 14.7"/>
<ellipse cx="12" cy="12" rx="5.2" ry="3.1" transform="rotate(-38 12 12)" stroke-width="1.7"/>
```

## Category and tag colours [app]

A fixed swatch set for category icons and tag dots, independent of the theme accent. Store the key, not the hex, so both modes render correctly. A category with no local entry falls back to the folder icon and a neutral colour rather than blocking.

## Do's and Don'ts

### Do:

- **Do** let the accent tint the neutrals. A theme change that only recolours buttons is the wrong implementation.
- **Do** keep status colours fixed and separate from the accent, per the Semantic Colour Rule.
- **Do** give every interactive element a visible focus ring (`:focus-visible`, 2px `--accent`, 2px offset) and make it reachable by Tab.
- **Do** state each screen's API endpoints in the small mono line, and keep them accurate as the implementation lands.
- **Do** respect `prefers-reduced-motion` — springs become instant state changes, not slower springs.

### Don't:

- **Don't** use Material patterns: no ripple, no tonal elevation, no pill FAB. LibreTorrent already owns that register on Android.
- **Don't** put pure black, pure white or a cool grey anywhere.
- **Don't** colour a paused, stalled or queued state with the accent.
- **Don't** use monospace for texture. It means data.
- **Don't** mix the verb pairs — Pause/Resume for a running or paused torrent, Start/Stop only at 0% and 100%.
- **Don't** shadow an in-flow surface. Depth is the four-step background ramp and 1px borders.
