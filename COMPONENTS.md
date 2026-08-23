# Components

Where the interface lives, and the handful of rules that are easy to break by
accident. `DESIGN.md` at the root carries the foundations this builds on;
this file is about the code.

## Four layers

```
tokens/                 the design foundations as CSS custom properties
src/components/ui/      primitives. Know nothing about torrents.
src/components/shell/   the frame every screen sits in
src/features/           a screen's own parts, grouped by screen
src/pages/              assembly. Data in, layout out.
```

The line between `ui/` and `features/` is whether the thing knows what a
torrent is. `ProgressBar` does not, so it is a primitive. `TorrentLink` does,
so it belongs to Transfers. When a feature component turns out to be needed by
a second screen, it moves down a layer rather than being imported sideways.

## The primitives

Thirty-one components in `src/components/ui/`, each with its own test file.

| Group | Components |
| --- | --- |
| Surfaces | `Card` `Chip` `Badge` `IconTile` `SectionHeader` |
| Controls | `Button` `IconButton` `Input` `Textarea` `Switch` `Checkbox` `SegmentedControl` `SwatchRow` `DropZone` |
| Overlays | `Dialog` `ConfirmDialog` `FormDialog` `ContextMenu` `Disclosure` |
| Data | `DataValue` `ProgressBar` `Sparkline` `StatCard` `StatusDot` |
| Navigation | `NavRail` `RailItem` `TabBar` `FilterRow` |
| States | `EmptyState` `Skeleton` |
| Theme | `Appearance` |

`DataValue` looks trivial and is not: it is what enforces the split between
Inter for prose and JetBrains Mono for values. Sizes, speeds, ratios,
percentages, hashes, IPs and API paths go through it. Sentences and labels do
not. It also sets `tabular-nums`, without which every live-updating figure
jitters on each poll.

## Rules that are easy to break

**A write that can fail has to say so.** `void api.torrents.pause(hashes)`
compiles, runs, and reports nothing when the daemon refuses: the row does not
change, the next poll restores the old value, and the click reads as ignored
rather than as refused. Use `write('Pause', () => api.torrents.pause(hashes))`
from `lib/write.ts`, which labels the attempt in the user's word rather than
the endpoint's and returns whether it landed.

This was swept once and the sweep missed five, all of them the shape
`void (cond ? apiCall() : otherCall())` rather than `void api.`.
`lib/write.sweep.test.ts` now scans every page, feature and component file for
it, so the next one fails a test rather than shipping. A `try` counts as
handling: a read that cannot reach the daemon shows a loading shape, which is
the right answer for a read.

**Padding is a named scale, not a `className`.** `Card` puts its body padding
on an inner element, so padding passed through `className` lands on the outer
one and stacks rather than replacing. `cn` cannot resolve a conflict between
two different elements. Hence `padding: 'none' | 'row' | 'card' | 'section'`.

**`cn` has to be told about custom scales.** `tailwind-merge` knows Tailwind's
scales, not ours. Colour utilities work because it accepts anything after
`bg-`, but `rounded-chip` is not in its radius list, so it will not displace
`rounded-lg` and both classes end up on the element with CSS source order
deciding. Every non-colour theme key we invent is declared in
`extendTailwindMerge` in `src/lib/utils.ts`.

**Durations live under `--transition-duration-*`, not `--duration-*`.** A key
under the wrong name is accepted silently, generates no utility, and the class
name is inert: the transition falls back to Tailwind's default 150ms. This
shipped undetected through two merged pull requests because it fails no
typecheck, lint, test or build. `src/styles/theme.test.ts` reads the theme
block and asserts its shape.

**A theme key must not share its name with the token it points at.**
`--radius-lg: var(--radius-lg)` is a cycle that resolves to nothing.

**Tailwind 4 dropped Preflight's pointer cursor on buttons.** Restored once in
`tokens/base.css` for everything clickable, rather than as a utility per
component. Modal scrims are `role="presentation"` and deliberately keep the
arrow.

**One focus ring.** The `:focus-visible` rule in `tokens/base.css` is the
canonical marker. A field that also changes its border colour on focus is
drawing a second ring by another name.

## Overlays

**A dialog traps Tab. A menu does not.** While a dialog is open the rest of the
app is inert, so focus must not be able to leave it. A menu is a passing
convenience, so Tab dismisses it and focus continues through the page from the
trigger. Both close on Escape and return focus to whatever opened them.

**Outside dismissal listens for `pointerdown`, not `click`.** React flushes the
effect that registers the listener while the opening click is still bubbling,
so a `click` listener hears that very click and closes the menu it just
opened. The button looks dead. A scripted `.click()` does not reproduce it,
which is how it survived being checked in a browser.

**A scrim has to be mounted to fade.** A conditionally rendered element has no
previous state to transition from, so `{open ? <Scrim/> : null}` appears at
full strength in one frame. Both scrims stay mounted and toggle opacity.

## State

Stores in `src/state/` are Zustand; the hooks beside them own polling.

**State belongs to a connection and must not outlive it.** The client provider
hands out a mock client while it looks for a daemon and swaps in the real one
when it finds it. Anything that accumulates across polls holds a cursor, a
buffer, or both, and both belong to one client. When `useApi()` returns a
different object, they reset. This has been hit three times; `use-log-tail.ts`
carries the fullest account.

Two ways to do it, both in use: a **loop-scoped** cursor declared inside the
effect, which a new client restarts along with the effect, and **state
adjusted during render**, comparing the client held in state against the one
just returned. Refs do neither, which is exactly how one of the three
survived review.

**Theme, labels and machine preferences are app-local.** Mode, accent, default
layout, category icons and tag colours, which desktop notifications are wanted,
and what the close button does are all kept in `localStorage`, not in
qBittorrent. The Web API has no field for any of them, and a remote instance
shared with another client has no business being told what colour this one
paints things or whose desktop gets interrupted.

They are separate stores rather than one preferences blob. `label-store` is
about naming, `alert-store` about interrupting somebody, `window-prefs` about
whether the process keeps running. A single store for everything local is a
junk drawer by the third entry.

`notice-store` is the exception that is not persisted. A failure from the last
session is not news, and a stale one describes a daemon that may not even be
the one now connected.

## Conventions

Every non-obvious decision is explained next to the code that makes it. If you
find yourself wondering why something is the way it is, the answer is in the
file, and if it is not, that is the bug to fix first.

`PRODUCT.md` covers what rigseed is for. `DESIGN.md` carries the foundations
and the machine-readable token block. `CONTRIBUTING.md` covers branching and
review.
