# UI kit — rigseed desktop

A click-through recreation of the app: the shell (rail, top bar, footer) with four
screens inside it — Transfers, Torrent Detail, Settings and Logs — plus the first-run
setup modal and the add-torrent FAB.

Open `index.html`. It boots straight into the setup modal, exactly as a first launch
does. Everything is fake data; nothing calls an API.

| File | What |
|---|---|
| `index.html` | Mounts the app, loads React + the component bundle |
| `App.jsx` | Shell, routing, theme state, setup modal, appearance control |
| `TransfersScreen.jsx` | Sidebar filters, toolbar, three layouts, context menus, FAB |
| `DetailScreen.jsx` | Title block, five tabs |
| `SettingsScreen.jsx` | Section nav, setting cards, save bar |
| `LogsScreen.jsx` | Level chips, log table, follow toggle |
| `data.js` | Fake torrents, categories, tags, log lines |
| `icons.jsx` | The inline icon set (Lucide-equivalent paths) |

What to try: expand the rail, switch layouts, open a torrent's three-dot menu, open the
FAB, click a torrent to open its detail view, change accent and mode from the palette
button, reopen the setup modal from `Setup…`.

Not built here: Add Torrent, Search and Categories & Tags. Those three are fully
specified in `docs/screens/` and drawn in their prototypes; they are the next screens to add.
