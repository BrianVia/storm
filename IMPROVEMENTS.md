# Storm Improvement Roadmap

Storm is an Angular 13 + PrimeNG 13 frontend that polls a single `/api/view`
endpoint every two seconds (with ETag short-circuiting) and renders a flat list
of torrent cards. Each card supports pause, resume, remove, and label. There is
search, a state filter, sort, and URL-synced state. The Go backend wraps
`go-libdeluge` but exposes only a fraction of what the library supports. A
torrent details dialog component exists but is never opened from anywhere.

The list below is ordered by impact.

## 1. Torrent details view

The biggest functional gap. Tapping a card should open a full view showing:

- Tracker host and tracker status
- Download location
- Peers and seeds (connected / total)
- Time added and time completed
- Per-file progress with priority toggles

The backend already fetches `FilePriorities` and `FileProgress`, and the
`TorrentDetailsDialogComponent` scaffold exists. Files need one new endpoint
since the current status struct omits the file list.

## 2. Per-torrent actions the daemon already supports

`go-libdeluge` exposes `MoveStorage`, `ForceReannounce`, `SetTorrentTracker`,
and `SetTorrentOptions`. Only `SetTorrentOptions` has a route (`PUT
/torrent/{id}`) and nothing in the UI calls it. Add:

- Move storage
- Force reannounce
- Per-torrent speed limits and stop-at-ratio editing

This turns Storm from a viewer into a real remote.

## 3. Multi-select with bulk actions

Bulk pause and remove currently apply to "everything in view", which is a
blunt instrument. Add long-press or checkbox selection with a floating action
bar for pause, resume, remove, and relabel. This is the standard mobile
pattern and much safer.

## 4. Label as a first-class filter

Labels are shown on cards but cannot be filtered on. Add a label chip row or a
second dropdown, synced to the URL like the existing filters. The view
endpoint already returns labels, so this is frontend-only.

## 5. Push-style updates instead of polling

Add a Server-Sent Events endpoint on the Go side that emits the view when the
ETag changes. This cuts latency and battery drain on phones. The polling loop
already pauses when the tab is unfocused, so reconnect logic can reuse
`FocusService`.

## 6. Proper PWA

`index.html` has home-screen meta tags but there is no manifest or service
worker. Adding Angular's service worker gives an installable app, an offline
shell, and a real app icon on Android and iOS.

## 7. Stack modernization

Angular 13, RxJS 6, tslint, and Protractor are all end of life. Move to a
current Angular with standalone components and signals, swap tslint for
eslint, and drop Protractor. This makes every later change cheaper and
unblocks newer PrimeNG.

Do this before items 1 through 5 if a lot more work is planned; do it after
if visible wins come first.

## 8. Smaller quality-of-life items

- Dark / light theme toggle
- Torrent count and aggregate speeds in the header
- In-app settings page for global speed limits
- "Add torrent" flow that reads the clipboard for magnet links on mobile
- Toast confirmation on actions

## Suggested starting point

Begin with the details view and per-torrent actions (items 1 and 2) since they
share the same new backend routes, then do multi-select and label filtering
(items 3 and 4).
