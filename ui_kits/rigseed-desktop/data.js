export const CATEGORIES = [
  { name: 'linux-isos', icon: 'box',   color: 'var(--swatch-mustard)',   count: 6,  path: '/mnt/media/iso' },
  { name: 'films',      icon: 'film',  color: 'var(--swatch-terracota)', count: 5,  path: '/mnt/media/films' },
  { name: 'music',      icon: 'music', color: 'var(--swatch-sage)',      count: 4,  path: '/mnt/media/music' },
  { name: 'archive',    icon: 'folder',color: 'var(--swatch-lavender)',  count: 3,  path: '/mnt/archive' },
];

export const TAGS = [
  { name: 'seeding-forever', color: 'var(--swatch-teal)', count: 7 },
  { name: 'to-watch',        color: 'var(--swatch-rose)', count: 4 },
  { name: 'verified',        color: 'var(--swatch-blue)', count: 9 },
];

export const TORRENTS = [
  { hash: 'a1b2c3d4e5f6', name: 'ubuntu-24.04.1-desktop-amd64.iso', size: '5.7 GB', progress: 64,
    state: 'downloading', dl: '4.2 MiB/s', up: '812 KiB/s', seeds: 24, peers: 9, eta: '4m 12s',
    ratio: '0.42', category: 'linux-isos', tags: ['verified'], added: '12 Aug 2026' },
  { hash: 'b7c8d9e0f1a2', name: 'debian-12.7.0-amd64-netinst.iso', size: '628 MB', progress: 100,
    state: 'seeding', dl: '0 B/s', up: '1.4 MiB/s', seeds: 0, peers: 14, eta: '-',
    ratio: '3.18', category: 'linux-isos', tags: ['seeding-forever','verified'], added: '2 Aug 2026' },
  { hash: 'c3d4e5f6a7b8', name: 'Cosmos.A.Spacetime.Odyssey.S01.1080p.WEB-DL', size: '18.4 GB', progress: 38,
    state: 'downloading', dl: '11.8 MiB/s', up: '2.1 MiB/s', seeds: 61, peers: 22, eta: '18m 04s',
    ratio: '0.11', category: 'films', tags: ['to-watch'], added: '14 Aug 2026' },
  { hash: 'd5e6f7a8b9c0', name: 'archlinux-2026.08.01-x86_64.iso', size: '1.1 GB', progress: 100,
    state: 'seeding', dl: '0 B/s', up: '340 KiB/s', seeds: 0, peers: 6, eta: '-',
    ratio: '5.02', category: 'linux-isos', tags: ['seeding-forever'], added: '1 Aug 2026' },
  { hash: 'e7f8a9b0c1d2', name: 'Blue.Planet.II.2017.COMPLETE.2160p', size: '42.1 GB', progress: 12,
    state: 'stalled', dl: '0 B/s', up: '0 B/s', seeds: 2, peers: 0, eta: '-',
    ratio: '0.00', category: 'films', tags: ['to-watch'], added: '15 Aug 2026' },
  { hash: 'f9a0b1c2d3e4', name: 'Miles.Davis.Kind.of.Blue.1959.24bit.FLAC', size: '892 MB', progress: 100,
    state: 'seeding', dl: '0 B/s', up: '96 KiB/s', seeds: 0, peers: 3, eta: '-',
    ratio: '1.42', category: 'music', tags: ['verified'], added: '28 Jul 2026' },
  { hash: '0a1b2c3d4e5f', name: 'fedora-workstation-41-x86_64.iso', size: '2.3 GB', progress: 81,
    state: 'downloading', dl: '2.9 MiB/s', up: '410 KiB/s', seeds: 17, peers: 5, eta: '2m 38s',
    ratio: '0.28', category: 'linux-isos', tags: [], added: '14 Aug 2026' },
  { hash: '1b2c3d4e5f6a', name: 'project-backup-2026-08.tar.zst', size: '14.8 GB', progress: 47,
    state: 'paused', dl: '0 B/s', up: '0 B/s', seeds: 1, peers: 0, eta: '-',
    ratio: '0.03', category: 'archive', tags: [], added: '9 Aug 2026' },
];

export const STATUSES = [
  { key: 'all',         label: 'All torrents', icon: 'list',  count: 18 },
  { key: 'downloading', label: 'Downloading',  icon: 'down',  count: 4 },
  { key: 'seeding',     label: 'Seeding',      icon: 'up',    count: 11 },
  { key: 'completed',   label: 'Completed',    icon: 'check', count: 11 },
  { key: 'paused',      label: 'Paused',       icon: 'pause', count: 2 },
  { key: 'stalled',     label: 'Stalled',      icon: 'clock', count: 1 },
];

export const LOGS = [
  { t: '19:42:07', level: 'info',     msg: 'Torrent "ubuntu-24.04.1-desktop-amd64.iso" resumed' },
  { t: '19:41:55', level: 'normal',   msg: 'DHT bootstrap node responded, 412 nodes known' },
  { t: '19:41:02', level: 'warning',  msg: 'Tracker udp://tracker.example.org:6969 timed out' },
  { t: '19:40:18', level: 'info',     msg: 'Peer 91.203.44.18 connected to 3 torrents' },
  { t: '19:38:44', level: 'normal',   msg: 'Alternative speed limits disabled by schedule' },
  { t: '19:36:12', level: 'critical', msg: 'I/O error writing to /mnt/archive: disk full' },
  { t: '19:35:50', level: 'info',     msg: 'Category "films" save path changed to /mnt/media/films' },
  { t: '19:33:07', level: 'normal',   msg: 'Session started, listening on port 51413' },
];

export const ACCENTS = [
  { key: 'dustblue',   label: 'Dusty Blue', hex: '#7FA2BC' },
  { key: 'amber',      label: 'Amber',      hex: '#E2AC66' },
  { key: 'sage',       label: 'Sage',       hex: '#8FB08F' },
  { key: 'terracotta', label: 'Terracotta', hex: '#C97B63' },
  { key: 'mustard',    label: 'Mustard',    hex: '#D4B15E' },
  { key: 'slateteal',  label: 'Slate Teal', hex: '#6FA3A0' },
  { key: 'lavender',   label: 'Lavender',   hex: '#A69BC9' },
];

export const speedSeries = (n, seed, scale = 1) =>
  Array.from({ length: n }, (_, i) =>
    scale * (40 + 30 * Math.sin(i / 5 + seed) + 14 * Math.sin(i / 2.3 + seed * 2) + 8 * Math.sin(i / 1.3)));
