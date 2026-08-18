# rigseed prototype - shared parts

Every screen is a Design Component at the project root. Chrome and states come from shared child DCs, so a change lands in one place.

## Where things live

| Change this | Edit |
| --- | --- |
| Colours, light/dark bases, accent palettes, `--ok` / `--warn` / `--danger`, keyframes | `rigseed-theme.css` |
| Nav items, order, icons, rail behaviour | `Rail.dc.html` |
| Palette button, mode toggle, swatch list | `Appearance.dc.html` |
| Any destructive confirm | `ConfirmDialog.dc.html` |
| Any empty / nothing-here view | `EmptyState.dc.html` |
| Any loading placeholder | `Skeleton.dc.html` |
| Any add / create dialog | `FormDialog.dc.html` |
| Keyboard activation, Escape, focus trap | `keyboard.js` |

Screens: `Dashboard Cozy`, `Torrent Detail`, `Add Torrent`, `Search`, `RSS`, `Categories and Tags`, `Logs`, `Settings`, `Connections`.

## Using the shared parts

Rail - one line per screen, `active` picks the highlighted item:

```html
<dc-import name="Rail" active="rss" style="display: contents" hint-size="60px,100%"></dc-import>
```

Appearance - the screen owns `mode`/`accent` state (its root sets `data-mode` / `data-accent`), the component only reports changes:

```html
<dc-import name="Appearance" mode="{{ mode }}" accent="{{ accent }}"
  on-mode="{{ onMode }}" on-accent="{{ onAccent }}"
  style="display: flex; align-items: center;" hint-size="72px,32px"></dc-import>
```

Confirm dialog - `open` drives it; `option-label` adds the "also delete files" checkbox; `tone="neutral"` for non-destructive asks:

```html
<dc-import name="ConfirmDialog" open="{{ confirmOpen }}" title="{{ confirmTitle }}"
  body="…" target="{{ confirmTarget }}" confirm-label="Remove"
  on-cancel="{{ closeConfirm }}" on-confirm="{{ closeConfirm }}"
  style="display: contents" hint-size="100%,100%"></dc-import>
```

Empty state and skeleton take `open` too, so a screen switches between loading / empty / content by flag rather than by branching markup.

## State coverage

- Dashboard - `connection` prop: `ok`, `connecting` (skeleton), `lost` (banner over last known list). Remove confirm from the toolbar and the row context menu.
- RSS - `state` prop for loading; empty feed and gone-quiet feed variants; delete feed / delete rule confirm.
- Search - already carried its own `searching`, `zero results`, `no python`, `no plugins` states.
- Connections - refused-login error card, remove-connection confirm, bundled instance locked.
- Categories & tags - delete category / delete tag confirm.

## Keyboard

`rigseed-theme.css` carries the `:focus-visible` ring; `keyboard.js` (loaded in every screen's helmet) makes Enter and Space activate anything with `tabindex="0"`, Escape click whatever carries `data-esc`, and Tab cycle inside the nearest visible `[data-modal]`. New interactive elements need `tabIndex="0"`; new dialogs need `data-modal` on the card and `data-esc` on the dismiss control.

## Category and tag model

One category per torrent, any number of tags - the qBittorrent model. Add Torrent leads its category row with an always-present **Uncategorised** chip, so the default is a choice rather than the absence of one.

Written specification: `PRODUCT.md` and `DESIGN.md` at the root, detail in `docs/` (start at `docs/README.md`). `docs/design-references/` holds a snapshot of these prototypes for handoff.
