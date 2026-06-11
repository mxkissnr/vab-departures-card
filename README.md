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
  <img src="https://img.shields.io/badge/status-Work%20In%20Progress-orange?style=flat-square" alt="Work In Progress"/>
</p>

<h2 align="center">VAB Departures Card</h2>

<p align="center">
  Custom Lovelace card for real-time bus and train departures in the <strong>VAB region (Aschaffenburg)</strong>.<br/>
  Works with the <a href="https://github.com/mxkissnr/ha-vab-integration">ha-vab-integration</a> custom integration.
</p>

---

## ✨ Features

- Departure board layout for one or more stops
- Colored line badge (unique color per line number)
- Minutes countdown — **jetzt** when the bus is departing now
- Delay indicator: amber for small delays, red for ≥5 min
- Green dot = live GPS tracked · grey dot = schedule only
- Platform / bay display
- Dark and light theme compatible via HA CSS variables
- Auto-updates when HA pushes state changes

---

## 🚀 Installation

### Via HACS (recommended)

**Step 1 — Add repository:**

<p>
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=mxkissnr&repository=vab-departures-card&category=frontend">
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

```yaml
type: custom:vab-departures-card
title: Meine Haltestellen       # optional
entities:
  - sensor.abfahrt_hensbachstrasse_innenstadt
  - sensor.abfahrt_hensbachstrasse_hauptbahnhof
```

| Option | Type | Default | Description |
|---|---|---|---|
| `entities` | list | required | VAB sensor entity IDs (from ha-vab-integration) |
| `title` | string | none | Optional card title |

Add the same stop with different direction/line filters as separate entities to show both directions side by side.

---

## 🗺️ What the card shows

```
HENSBACHSTRASSE → Innenstadt
● [14]  Innenstadt           7 min
                            +2 min
● [ 1]  Innenstadt          14 min
                               ✓
──────────────────────────────────
HENSBACHSTRASSE → Hauptbahnhof
● [14]  Hauptbahnhof        jetzt
● [ 1]  Hauptbahnhof         5 min
                            +1 min
```

- **Green dot** = bus is live-tracked (`MONITORED`)
- **Grey dot** = schedule only (`PLANNED`)
- **+X min** = delay in minutes (amber ≤4 min, red ≥5 min)
- **✓** = on time and live-tracked
- **jetzt** = departing now (0 min or negative)

---

## 📋 Requirements

- [ha-vab-integration](https://github.com/mxkissnr/ha-vab-integration) ≥ v1.0.1

---

## 📝 License

GPL-3.0 — see [LICENSE](LICENSE)
