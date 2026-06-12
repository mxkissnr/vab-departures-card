<p align="center">
  <img src="logo.svg" alt="VAB Departures Card" width="120"/>
</p>

<p align="center">
  <a href="https://github.com/mxkissnr/vab-departures-card/releases/latest">
    <img src="https://img.shields.io/github/v/tag/mxkissnr/vab-departures-card?color=%2341bdf5&label=Version&style=flat-square" alt="Version"/>
  </a>
  <img src="https://img.shields.io/badge/Home%20Assistant-Lovelace%20Card-41bdf5?logo=home-assistant&style=flat-square" alt="Lovelace Card"/>
  <img src="https://img.shields.io/badge/HACS-Custom-orange?style=flat-square" alt="HACS Custom"/>
  <img src="https://img.shields.io/badge/Built%20with-Claude%20by%20Anthropic-D97706?style=flat-square" alt="Built with Claude"/>
</p>

<h2 align="center">VAB Departures Card</h2>

<p align="center">
  Custom Lovelace card for real-time bus and train departures in the <strong>VAB region (Aschaffenburg)</strong>.<br/>
  Works with the <a href="https://github.com/mxkissnr/ha-vab-integration">ha-vab-integration</a> custom integration.
</p>

---

## ✨ Features

- **Auto-detect stops** — card finds all VAB sensors automatically, zero config needed
- Collapsible stop sections — click the header to expand/expand, state persists across browser restarts
- Colored line badge — unique color per line, fully customizable in the visual editor
- Minutes countdown — **jetzt** when the bus is departing now
- Delay indicator — amber for small delays, red for ≥5 min
- Green dot = live GPS tracked · grey dot = schedule only
- Platform / bay display
- Walk-time support — "Los in X min" shows when you need to leave, not just when the bus departs
- **"Jetzt los!" indicator** — pulsing badge when it's time to go (configurable threshold)
- **"Morgen früh" badge** — red badge for overnight/next-day departures
- ★ **Star any departure** for notifications — mark a specific trip and get alerted when it's time to leave or when it's delayed
- **Push notifications** via HA Companion App (mobile_app) or HA sidebar bell
- Visual config editor — no YAML needed
- Dark and light theme compatible via HA CSS variables

---

## 🚀 Installation

### Via HACS (recommended)

**Step 1 — Add repository:**

<p>
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=mxkissnr&repository=vab-departures-card&category=plugin">
    <img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open your Home Assistant instance and open a repository inside the Home Assistant Community Store." height="40"/>
  </a>
</p>

Or manually: **HACS → Frontend → ⋮ → Custom repositories** → add `https://github.com/mxkissnr/vab-departures-card` as **Frontend**.

**Step 2 — Restart Home Assistant** (or reload resources).

### Manual

1. Copy `vab-departures-card.js` to `config/www/vab-departures-card.js`
2. Add it as a Lovelace resource:
   - **Settings → Dashboards → ⋮ → Resources → + Add resource**
   - URL: `/local/vab-departures-card.js` · Type: JavaScript module

---

## ⚙️ Configuration

The easiest way is the **visual editor** — just add the card and everything is configurable without YAML.

### Minimal (auto-detect all VAB sensors)

```yaml
type: custom:vab-departures-card
```

### Full example

```yaml
type: custom:vab-departures-card
title: Meine Haltestellen
auto_entities: true          # auto-detect all VAB sensors (default)
leave_threshold: 2           # minutes: highlight row when leave_in_minutes ≤ this
notify_service: mobile_app_iphone  # HA Companion App device for push notifications
line_colors:
  "10": "#f97316"
  "4":  "#2563eb"
```

### Manual entity selection

```yaml
type: custom:vab-departures-card
auto_entities: false
entities:
  - sensor.vab_freihofsplatz
  - sensor.vab_hauptbahnhof
```

### Config options

| Option | Type | Default | Description |
|---|---|---|---|
| `auto_entities` | boolean | `true` | Auto-detect all VAB sensors. Set to `false` to pick sensors manually. |
| `entities` | list | — | Entity IDs when `auto_entities: false` |
| `title` | string | — | Optional card title |
| `leave_threshold` | number | `2` | Minutes: "Jetzt los!" badge + notification fires when `leave_in_minutes ≤` this |
| `notify_service` | string | — | HA notify service name for push notifications, e.g. `mobile_app_iphone`. If not set, notifications go to the HA sidebar bell. |
| `line_colors` | map | — | Custom hex color per line number, e.g. `"10": "#f97316"` |

---

## ⭐ Star notifications

Tap the **★** button on any departure row to watch that specific trip:

- **"Jetzt losrennen!"** — push notification when `leave_in_minutes ≤ leave_threshold`
- **Verspätung** — push notification when the trip gets a delay, with the new departure time

Stars are saved in `localStorage` and survive browser restarts. To receive push notifications on your phone, configure `notify_service` in the editor (requires the [HA Companion App](https://companion.home-assistant.io/)).

> **When does the notification fire?**  
> `leave_in_minutes = minutes_until − walk_time`. With walk_time = 5 min and leave_threshold = 2, the notification fires 7 minutes before departure — enough time to leave and catch the bus.

---

## 🗺️ What the card shows

```
▼ FREIHOFSPLATZ                          ← click to collapse
● [10]  Innenstadt / Hbf     2 min  14:32
                              ✓
        Los in 0 min          Jetzt los!
● [ 4]  Hauptbahnhof         7 min  14:37
                             +2 min
        Los in 5 min

+3 weitere                               ← click header to expand

▶ HAUPTBAHNHOF                           ← collapsed, shows only next departure
● [RE] Frankfurt Hbf        12 min  14:42
```

| Symbol | Meaning |
|---|---|
| Green dot | Live GPS tracked (MONITORED) |
| Grey dot | Schedule only (PLANNED) |
| +X min | Delay in minutes (amber < 5 min, red ≥ 5 min) |
| ✓ | On time and live tracked |
| jetzt | Departing now |
| Los in X min | Time left before you need to leave (walk time considered) |
| Jetzt los! | Time to go — departure is imminent |
| Morgen früh | Next-day departure (no more service tonight) |
| ★ | Starred trip — notifications active |

---

## 📋 Requirements

- [ha-vab-integration](https://github.com/mxkissnr/ha-vab-integration) ≥ v1.2.0 (for walk-time support)

---

## 📝 License

GPL-3.0 — see [LICENSE](LICENSE)
