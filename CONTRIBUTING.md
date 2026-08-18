# Contributing to rigseed

Thanks for looking. rigseed is a desktop client for qBittorrent - a frontend over the
daemon's Web API v2.x, not a torrent engine. Changes to torrenting behaviour belong
upstream with qBittorrent; changes to the interface belong here.

## Before you start

Read `PRODUCT.md` and `DESIGN.md` at the repo root. They are not decoration - the design
is resolved to a high fidelity, and a change that contradicts them will be sent back even
if the code is good.

Canonical design foundations live in `verastack-labs/rigseed-internal`, in
`docs/design-foundations.md`. Colour, shape, elevation, motion and the brand mark are
owned there and propagate outward. If your change needs a foundation to move, that starts
as a conversation, not a pull request.

## Branching

One branch per unit of work, off the latest `main`:

```
<type>/<short-description>
```

Lowercase and hyphenated. `type` is one of:

| Prefix    | For                                  |
| --------- | ------------------------------------ |
| `docs/`   | Planning docs, specs, README updates |
| `design/` | `DESIGN.md` or design-token changes  |
| `feat/`   | New functionality                    |
| `fix/`    | Bug fixes                            |
| `chore/`  | Tooling, config, dependency bumps    |

Do not pile unrelated changes onto one branch.

## Commits

Each commit is one logical, self-contained change. Unrelated changes get separate commits
within the PR, and separate PRs entirely if they are large enough to stand alone.

```
<type>: <imperative description>
```

For example: `feat: add alternative speed limit toggle to the toolbar`.

## Pull requests

1. Branch off the latest `main`.
2. Commit in logical units.
3. Push and open a PR against `main`.
4. Merge with a **merge commit, not a squash.** Squashing collapses the logical units the
   commit rule exists to create, which defeats the point of separating them.
5. Delete the branch locally with `git branch -d <branch>`. Leave the remote branch alone -
   remote branches stay as a permanent trail, including after merge.

## What gets reviewed

Anything with a visual surface is checked against the design docs:

- Dark and light both correct, all seven accents
- Rail collapsed and expanded, with no reflow
- Empty, loading and error states present
- Every number in mono, every label in Inter
- Keyboard reachable, with a visible focus ring
- Motion respects `prefers-reduced-motion`
- Copy matches the docs exactly

## Copy rules

These get enforced, because they are the rules most often broken:

- **rigseed** is lowercase everywhere, including at the start of a sentence.
- **Pause** and **Resume** are the verbs for a running or paused torrent. **Start** and
  **Stop** are reserved for 0% and 100%. The two pairs are never mixed.
- Sentence case for every title, label, button and menu item.
- No emoji, anywhere. Status is a coloured dot plus a word.
- Monospace means data. Sizes, speeds, ratios, hashes, IPs and API paths are mono;
  every sentence and label is Inter.

## Reporting bugs

Use the issue templates. The footer prints the daemon and API versions
(`qbittorrent-nox 5.0.3 · api 2.11.2`) - include both, since a difference there explains
a large share of reports.

## Contact

Anything that does not belong in a public issue - security reports, conduct concerns,
licensing questions - goes to **verastack.labs@gmail.com**, or
**therealriganb@gmail.com** to reach the maintainer directly.

Please do not open a public issue for a security vulnerability. Mail it, and give us a
chance to ship a fix first.
