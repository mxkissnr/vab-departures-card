# Changelog

## v1.10.6 — 2026-07-04

### Security
- **Config-XSS-Fix** — `title` und Collapse-Key werden jetzt vor dem Einfügen in `innerHTML` escaped; der Fix aus v1.10.5 deckte nur API-Daten ab, nicht die Karten-Config ([#28](https://github.com/mxkissnr/vab-departures-card/issues/28))
- **CSS-Injection-Schutz** — `line_colors`-Werte werden als Hex-Farbe validiert (`#rgb` bis `#rrggbbaa`), ungültige Werte fallen auf die Auto-Farbe zurück ([#28](https://github.com/mxkissnr/vab-departures-card/issues/28))
- **notify_service-Validierung** — Benachrichtigungen werden nur noch an Services geschickt, die tatsächlich unter `notify.*` existieren ([#28](https://github.com/mxkissnr/vab-departures-card/issues/28))

## v1.10.5 — 2026-06-12

### Security
- **XSS-Fix** — API-Daten (Linie, Richtung, Haltestelle, Gleis) werden jetzt vor dem Einfügen in `innerHTML` escaped. Verhindert Code-Ausführung falls die EFA-API manipulierte Werte liefert ([#27](https://github.com/mxkissnr/vab-departures-card/issues/27))

## v1.10.4 — 2026-06-12

### Changed
- **Kontextabhängiger Benachrichtigungstext** — statt immer "Jetzt losrennen!" wird der Text je nach Dringlichkeit angepasst: "Sofort losrennen! Du verpasst sonst den Bus." / "In 1 Minute losgehen!" / "Noch X Minuten — jetzt losgehen!" ([#26](https://github.com/mxkissnr/vab-departures-card/issues/26))

## v1.10.3 — 2026-06-12

### Added
- **Verspätungs-Benachrichtigung für Stern-Abfahrten** — wenn ein markierter Bus Verspätung bekommt, geht eine Push-Notification raus: "+5 min Verspätung. Neue Abfahrt: 14:37 ab Freihofsplatz." Wird erneut gesendet wenn die Verspätung sich ändert, und zurückgesetzt wenn der Bus wieder pünktlich ist ([#25](https://github.com/mxkissnr/vab-departures-card/issues/25))

## v1.10.2 — 2026-06-12

### Fixed
- **Haltestelle in Benachrichtigung** — Notification zeigt jetzt "Fährt in X min (HH:MM) ab Freihofsplatz" damit bei mehreren Haltestellen klar ist, von wo der Bus abfährt ([#24](https://github.com/mxkissnr/vab-departures-card/issues/24))

## v1.10.1 — 2026-06-12

### Fixed
- **Stern markierte alle Abfahrten der gleichen Linie** — Star-Key enthält jetzt die geplante Abfahrtszeit (`line|direction|planned`), sodass genau die eine angeklickte Abfahrt markiert wird ([#23](https://github.com/mxkissnr/vab-departures-card/issues/23))

## v1.10.0 — 2026-06-12

### Added
- **Mobile Push-Benachrichtigungen** — Geräte-Auswahl im Editor: alle `notify.mobile_app_*` Services aus der HA Companion App werden automatisch erkannt und als Dropdown angezeigt. Wenn ein Gerät gewählt ist, wird die Push-Notification direkt aufs Handy geschickt statt in die HA-Glocke ([#22](https://github.com/mxkissnr/vab-departures-card/issues/22))
- Spam-Schutz: Notification wird nur einmal pro "Jetzt losrennen"-Ereignis gesendet, nicht bei jedem HA-State-Update

## v1.9.0 — 2026-06-12

### Changed
- **Per-Abfahrt Stern statt Linien-Stern** — Sternmarkierung jetzt direkt auf jeder Zeile in der Karte (★ erscheint beim Hover, bleibt bei Aktivierung sichtbar). Markiert eine bestimmte Linie+Richtungs-Kombination, nicht mehr die ganze Linie. Gespeichert in `localStorage` ([#21](https://github.com/mxkissnr/vab-departures-card/issues/21))
- **Benachrichtigungen auf Linie+Richtung** — HA `persistent_notification` wird ausgelöst wenn eine beobachtete Verbindung `leave_in_minutes ≤ leave_threshold` erreicht; wird automatisch wieder abgebaut wenn die Bedingung nicht mehr gilt

### Removed
- Stern-Button aus dem visuellen Editor entfernt (`starred_lines` Config-Key obsolet); Benachrichtigungen werden nur noch über den Stern auf der Karte gesteuert

## v1.8.2 — 2026-06-11

### Fixed
- **Collapse state persists across browser restarts** — expanded stops saved to `localStorage`; default is always collapsed, including newly added stops ([#19](https://github.com/mxkissnr/vab-departures-card/issues/19))

## v1.8.1 — 2026-06-11

### Changed
- Stop sections now **start collapsed by default** — click header to expand ([#18](https://github.com/mxkissnr/vab-departures-card/issues/18))

## v1.8.0 — 2026-06-11

### Added
- **Collapsible stop sections** — click the stop header to collapse/expand. Collapsed = only the next departure shown + "+X weitere" hint. State survives re-renders. Saves significant vertical space on large dashboards ([#17](https://github.com/mxkissnr/vab-departures-card/issues/17))

## v1.7.0 — 2026-06-11

### Added
- **Star a line for notifications** — star icon per line in the editor; when a starred departure's `leave_in_minutes ≤ leave_threshold`, a HA persistent notification fires automatically ("Jetzt losrennen! Bus X in Y min"). Dismissed automatically when condition clears ([#16](https://github.com/mxkissnr/vab-departures-card/issues/16))
- Starred rows get a subtle gold left border in the card

### Removed
- **Progress bar** removed from line badge — the time column already communicates urgency clearly ([#15](https://github.com/mxkissnr/vab-departures-card/issues/15))

## v1.6.1 — 2026-06-11

### Fixed
- **'Los in X min' hidden for overnight departures** — label now only appears when `leave_in_minutes ≤ 60`; values like "Los in 357 min" no longer shown ([#14](https://github.com/mxkissnr/vab-departures-card/issues/14))

## v1.6.0 — 2026-06-11

### Added
- **Auto/Manual mode toggle** — editor now has an "Automatisch / Manuell" toggle. Automatisch shows all VAB sensors found in HA; Manuell shows entity pickers for selecting specific sensors. Backwards-compatible: existing YAML configs with `entities` keep manual behaviour ([#13](https://github.com/mxkissnr/vab-departures-card/issues/13))

## v1.5.0 — 2026-06-11

### Added
- **Auto-detect VAB sensors** — if `entities` is not configured, the card automatically finds all sensors with a `departures` attribute. Zero config: just add the card and all stops appear ([#9](https://github.com/mxkissnr/vab-departures-card/issues/9))
- **Progress bar** — 3 px bar at the bottom of each line badge fills up as the departure approaches: green → amber → red. Reference is the furthest departure in the stop's list ([#11](https://github.com/mxkissnr/vab-departures-card/issues/11))
- **"Morgen früh" badge** — red badge on departures whose effective time is the next calendar day (overnight fetch result) so users immediately see there's no more service tonight ([#10](https://github.com/mxkissnr/vab-departures-card/issues/10))

### Fixed
- **Row flicker on hover** — card was re-rendering the full DOM on every HA state change, destroying the hover style. Now only re-renders when actual departure data changes ([#12](https://github.com/mxkissnr/vab-departures-card/issues/12))

## v1.4.0 — 2026-06-11

### Added
- **Walk-time countdown** — when `leave_in_minutes` is available and > `leave_threshold`, each row shows a secondary "Los in X min" label so you see when to leave, not just when the bus departs ([#8](https://github.com/mxkissnr/vab-departures-card/issues/8))
- **leave_threshold in visual editor** — the walk-time highlight threshold is now configurable directly in the card UI (no YAML needed) ([#8](https://github.com/mxkissnr/vab-departures-card/issues/8))

## v1.3.0 — 2026-06-11

### Added
- **"Jetzt los!" indicator** — when `leave_in_minutes` (walk time from integration) is ≤ `leave_threshold` (default 2 min), the row gets an orange left border + pulsing "Jetzt los!" badge. Requires walk time configured in the VAB integration. Threshold configurable via `leave_threshold` in card YAML ([#7](https://github.com/mxkissnr/vab-departures-card/issues/7))

## v1.2.0 — 2026-06-11

### Added
- Custom color per line number: card editor now shows a color picker for each active line — click to change, ↺ to reset to auto-color ([#6](https://github.com/mxkissnr/vab-departures-card/issues/6))

## v1.1.3 — 2026-06-11

### Changed
- Minutes display now formats values ≥ 60 as hours: "7h 9min" instead of "429 min" (useful for overnight departures) ([#5](https://github.com/mxkissnr/vab-departures-card/issues/5))

## v1.1.2 — 2026-06-11

### Changed
- Card editor entity picker now only lists VAB integration sensors (entities with a `departures` attribute) instead of all sensor entities ([#4](https://github.com/mxkissnr/vab-departures-card/issues/4))

## v1.1.1 — 2026-06-11

### Fixed
- HACS category corrected from `frontend` to `plugin` (HACS v2 compatibility) — add `"filename"` to `hacs.json` and fix README install button URL ([#3](https://github.com/mxkissnr/vab-departures-card/issues/3))

## v1.1.0 — 2026-06-11

### Added
- Visual config editor — add/remove stops directly in the HA UI, no YAML needed ([#1](https://github.com/mxkissnr/vab-departures-card/issues/1))
- Departure clock time (HH:MM) shown below the minutes countdown ([#2](https://github.com/mxkissnr/vab-departures-card/issues/2))

## v1.0.0 — 2026-06-11

### Added
- Initial release
- Departure board layout for one or more VAB sensor entities
- Colored line badge (deterministic color per line number)
- Minutes countdown with "jetzt" for imminent departures
- Delay indicator: amber (<5 min), red (≥5 min)
- Live-tracking dot: green (MONITORED) / grey (PLANNED)
- Platform display
- Dark/light theme compatible via HA CSS variables
