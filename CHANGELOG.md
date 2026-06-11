# Changelog

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
