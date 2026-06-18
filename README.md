# VGN Departures Card

[![Validate](https://github.com/DHansel91/vgn-departures-card/actions/workflows/validate.yml/badge.svg)](https://github.com/DHansel91/vgn-departures-card/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/v/release/DHansel91/vgn-departures-card?sort=semver)](https://github.com/DHansel91/vgn-departures-card/releases)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

ÖPNV-Abfahrtsmonitor für Bayern (VGN, RVV, MVV) – zeigt Abfahrtszeiten aus der
[vgn-departures](https://github.com/DHansel91/vgn-departures) Integration als
Lovelace-Card in Home Assistant.

## Features

- Abfahrtszeiten mehrerer Haltestellen in einer Card
- Farbliche Kennzeichnung nach Verkehrsmittel (Zug, S-Bahn, U-Bahn, Bus, Tram …)
- Anzeige von Gleis/Steig und Haltestellenname (optional)
- Visual Editor zur Konfiguration
- Optionaler Link zu Karten/Maps

## Installation

### HACS (empfohlen)

1. HACS → **Frontend** → ⋮ → **Custom repositories**
2. Repository-URL `https://github.com/DHansel91/vgn-departures-card` eintragen, Kategorie **Lovelace/Plugin**
3. „VGN Departures Card" installieren

### Manuell

1. `vgn-departures-card.js` nach `config/www/vgn-departures-card/` kopieren
2. In Home Assistant → **Einstellungen → Dashboards → Ressourcen** hinzufügen:
   - URL: `/local/vgn-departures-card/vgn-departures-card.js`
   - Typ: **JavaScript-Modul**

## Konfiguration

| Option           | Typ      | Standard      | Beschreibung                                   |
| ---------------- | -------- | ------------- | ---------------------------------------------- |
| `type`           | string   | –             | `custom:vgn-departures-card`                   |
| `title`          | string   | `"Abfahrten"` | Überschrift der Card                           |
| `entities`       | list     | `[]`          | Liste der Abfahrts-Entities (vgn-departures)  |
| `max_departures` | number   | `5`           | Max. Anzahl angezeigter Abfahrten              |
| `show_platform`  | boolean  | `true`        | Gleis/Steig anzeigen                           |
| `show_stop_name` | boolean  | `true`        | Haltestellenname anzeigen                      |
| `maps_link`      | string   | –             | Optionaler Link zu einer Karte                 |

### Beispiel

```yaml
type: custom:vgn-departures-card
title: Abfahrten
max_departures: 5
entities:
  - sensor.vgn_abfahrten_hauptbahnhof
```

## Lizenz

[MIT](LICENSE)
