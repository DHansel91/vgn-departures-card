/**
 * VGN Departures Card für Home Assistant
 * Zeigt ÖPNV-Abfahrtszeiten aus der vgn-departures Integration
 * Datenquelle/Integration: https://github.com/DHansel91/vgn-departures
 *
 * Installation: www/vgn-departures-card/vgn-departures-card.js
 *
 * v2.0.0 – Umbau auf LitElement, Editor auf ha-form, getGridOptions
 */

const CARD_VERSION = "2.0.0";

// LitElement aus dem bereits geladenen HA-Frontend beziehen (kein Build-Step nötig)
const LitElement =
  window.LitElement ||
  Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace") || customElements.get("hui-view")
  );
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

// ha-form / Selektoren sicherstellen
const loadHaComponents = async () => {
  if (customElements.get("ha-form")) return;
  try {
    if (window.loadCardHelpers) {
      const helpers = await window.loadCardHelpers();
      const card = helpers.createCardElement({ type: "entities", entities: [] });
      await card?.constructor?.getConfigElement?.();
    }
  } catch (e) {
    console.warn("VGN-Departures-Card: ha-form konnte nicht vorgeladen werden", e);
  }
};
loadHaComponents();

const TRANSPORT_COLORS = {
  "Zug":                                    "#e84020",
  "Nahverkehrszug":                         "#d81e05",
  "Fernverkehrszug":                        "#e84020",
  "Fernverkehrszug (zuschlagspflichtig)":   "#c41200",
  "Fernverkehrszug (Spezialtarif)":         "#b30000",
  "S-Bahn":                                 "#008d4f",
  "U-Bahn":                                 "#0057a8",
  "Stadtbahn":                              "#ff9900",
  "Straßenbahn":                            "#cc0000",
  "Bus":                                    "#7a3fa0",
  "Regionalbus":                            "#4b2e83",
  "Expressbus":                             "#ff6600",
  "Schienenersatzverkehr":                  "#ffcc00",
  "Rail Shuttle":                           "#009688",
  "Bürgerbus":                              "#8bc34a",
  "Rufbus":                                 "#795548",
  "Reisebus":                               "#3f51b5",
  "Fähre":                                  "#0099cc",
  "Seilbahn/Zahnradbahn":                   "#996633",
  "Flugzeug":                               "#0066cc",
  "On-Demand-Verkehr":                      "#e91e63",
  "Sonstiges":                              "#555555",
  "ÖPNV":                                   "#555555",
};

const DEFAULTS = {
  title: "Abfahrten",
  entities: [],
  show_stop_name: true,
  show_platform: true,
  max_departures: 5,
  maps_link: "google",
};

// ---------------------------------------------------------------------------
// Visual Editor (ha-form)
// ---------------------------------------------------------------------------
class VgnDeparturesCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: { state: true } };
  }

  setConfig(config) {
    // entity (Einzelwert) für Abwärtskompatibilität in entities überführen
    const entities = Array.isArray(config.entities)
      ? config.entities
      : config.entity
      ? [config.entity]
      : [];
    this._config = { ...DEFAULTS, ...config, entities };
  }

  _schema() {
    return [
      { name: "title", selector: { text: {} } },
      {
        name: "entities",
        selector: { entity: { multiple: true, domain: "sensor" } },
      },
      {
        name: "max_departures",
        selector: { number: { min: 1, max: 20, mode: "box" } },
      },
      {
        name: "maps_link",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "google", label: "Google Maps" },
              { value: "apple", label: "Apple Maps" },
              { value: "both", label: "Beide" },
              { value: "none", label: "Kein Link" },
            ],
          },
        },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_stop_name", selector: { boolean: {} } },
          { name: "show_platform", selector: { boolean: {} } },
        ],
      },
    ];
  }

  _computeLabel = (schema) => {
    const labels = {
      title: "Titel",
      entities: "Haltestellen (Sensoren)",
      max_departures: "Max. Abfahrten pro Haltestelle",
      maps_link: "Karten-Link",
      show_stop_name: "Haltestellenname anzeigen",
      show_platform: "Gleis / Steig anzeigen",
    };
    return labels[schema.name] ?? schema.name;
  };

  _valueChanged(ev) {
    ev.stopPropagation();
    const config = { ...ev.detail.value };
    // leeres "entity"-Legacy-Feld entfernen
    delete config.entity;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema()}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("vgn-departures-card-editor", VgnDeparturesCardEditor);

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------
class VgnDeparturesCard extends LitElement {
  static get properties() {
    return { hass: {}, _config: { state: true } };
  }

  static getConfigElement() {
    return document.createElement("vgn-departures-card-editor");
  }

  static getStubConfig() {
    return { title: "Abfahrten", entities: [], max_departures: 5 };
  }

  setConfig(config) {
    if (!config.entities && !config.entity) {
      throw new Error("Bitte mindestens eine Entity (entities: [...]) angeben.");
    }
    this._config = {
      ...DEFAULTS,
      ...config,
      entities: config.entities ?? (config.entity ? [config.entity] : []),
    };
  }

  getCardSize() {
    return 1 + (this._config?.entities?.length || 1) * 2;
  }

  // Sections-Dashboard (HA 2024.x+) Größenangaben
  getGridOptions() {
    return { columns: 12, min_columns: 6, min_rows: 2 };
  }

  _relTime(iso) {
    if (!iso) return "?";
    try {
      const diff = Math.round((new Date(iso) - Date.now()) / 60000);
      if (diff <= 0) return "Jetzt";
      if (diff < 60) return `${diff} min`;
      const h = Math.floor(diff / 60), m = diff % 60;
      return m > 0 ? `${h}:${String(m).padStart(2, "0")} h` : `${h} h`;
    } catch {
      return "?";
    }
  }

  _absTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  _mapsLinks(stopName, lat, lon) {
    const mode = this._config.maps_link;
    if (mode === "none" || !stopName) return { google: null, apple: null };
    const q = encodeURIComponent(stopName);
    const ll = lat && lon ? `${lat},${lon}` : null;
    const googleUrl = ll
      ? `https://www.google.com/maps/search/?api=1&query=${ll}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    const appleUrl = ll
      ? `https://maps.apple.com/?ll=${ll}&q=${q}`
      : `https://maps.apple.com/?q=${q}`;
    return {
      google: mode === "google" || mode === "both" ? googleUrl : null,
      apple: mode === "apple" || mode === "both" ? appleUrl : null,
    };
  }

  _renderDepartures(departures) {
    if (!departures || departures.length === 0) {
      return html`<div class="no-departures">Keine Abfahrten verfügbar</div>`;
    }

    return departures.slice(0, this._config.max_departures).map((dep) => {
      const color = TRANSPORT_COLORS[dep.transport_type || "ÖPNV"] || "#555555";
      const line = dep.line || "?";
      const dir = dep.direction || "";
      const rel = this._relTime(dep.departure_time);
      const abs = this._absTime(dep.departure_time);
      const delay = dep.delay_minutes || 0;
      const isRT = dep.realtime === true;
      const platform = dep.platform || "";

      const timeClass =
        rel === "Jetzt" ? "time-now" : parseInt(rel) <= 3 ? "time-soon" : "time-normal";

      return html`
        <div class="dep-row">
          <div class="line-col">
            <div class="line-badge" style="--lc:${color}">${line}</div>
          </div>
          <div class="dep-mid">
            <div class="dep-dir">${dir}</div>
            ${this._config.show_platform && platform
              ? html`<div class="platform-label">Gleis ${platform}</div>`
              : ""}
          </div>
          <div class="delay-slot">
            ${delay > 0 ? html`<span class="delay-badge">+${delay}'</span>` : ""}
          </div>
          <div class="dep-right">
            <div class="time-row">
              <span class="time ${timeClass}">${rel}</span>${isRT
                ? html`<span class="rt-dot"></span>`
                : ""}
            </div>
            <div class="abs-time">${abs}</div>
          </div>
        </div>
      `;
    });
  }

  _renderStopHeader(stopName, lat, lon, updTime) {
    if (!this._config.show_stop_name) return "";
    const links = this._mapsLinks(stopName, lat, lon);
    let nameHtml;
    if (links.google && links.apple) {
      nameHtml = html`<a class="map-link" href=${links.google} target="_blank" rel="noopener">${stopName}</a>
        <a class="map-link-apple" href=${links.apple} target="_blank" rel="noopener" title="Apple Maps">&#x2767;</a>`;
    } else if (links.google) {
      nameHtml = html`<a class="map-link" href=${links.google} target="_blank" rel="noopener">${stopName}</a>`;
    } else if (links.apple) {
      nameHtml = html`<a class="map-link" href=${links.apple} target="_blank" rel="noopener">${stopName}</a>`;
    } else {
      nameHtml = html`<span>${stopName}</span>`;
    }
    return html`
      <div class="stop-header">
        <div class="stop-name">${nameHtml}</div>
        ${updTime ? html`<span class="stand">Stand: ${updTime}</span>` : ""}
      </div>
    `;
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const stops = this._config.entities.map((entityId) => {
      const stateObj = this.hass.states[entityId];
      if (!stateObj) {
        return html`<div class="error-row">⚠ Entity nicht gefunden: ${entityId}</div>`;
      }
      const attrs = stateObj.attributes || {};
      const stopName = attrs.stop_name || entityId;
      const lat = attrs.latitude || null;
      const lon = attrs.longitude || null;
      const departures = attrs.departures || [];
      const updTime = attrs.last_updated
        ? new Date(attrs.last_updated).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      return html`
        <div class="stop-block">
          ${this._renderStopHeader(stopName, lat, lon, updTime)}
          <div class="dep-list">${this._renderDepartures(departures)}</div>
        </div>
      `;
    });

    return html`
      <ha-card>
        <div class="card-header">${this._config.title}</div>
        ${stops}
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        --pri: var(--primary-text-color, #212121);
        --sec: var(--secondary-text-color, #727272);
        --div: var(--divider-color, rgba(0, 0, 0, 0.12));
      }
      ha-card {
        overflow: hidden;
      }
      .card-header {
        display: flex;
        align-items: center;
        padding: 13px 16px 10px;
        font-size: 15px;
        font-weight: 500;
        color: var(--pri);
        border-bottom: 0.5px solid var(--div);
      }
      .stop-block + .stop-block {
        border-top: 0.5px solid var(--div);
      }
      .stop-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px 3px;
        gap: 8px;
      }
      .stop-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--pri);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .map-link {
        color: var(--pri);
        text-decoration: none;
        border-bottom: 0.5px solid var(--div);
      }
      .map-link:hover {
        border-bottom-color: var(--pri);
      }
      .map-link-apple {
        color: var(--sec);
        text-decoration: none;
        font-size: 12px;
        flex-shrink: 0;
      }
      .map-link-apple:hover {
        color: var(--pri);
      }
      .stand {
        font-size: 11px;
        color: var(--sec);
        white-space: nowrap;
        flex-shrink: 0;
      }
      .dep-list {
        padding: 2px 14px 6px;
      }
      .dep-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 0;
        min-height: 46px;
        border-bottom: 0.5px solid var(--div);
      }
      .dep-row:last-child {
        border-bottom: none;
      }
      .line-col {
        flex-shrink: 0;
        width: 46px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
      }
      .line-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 22px;
        min-width: 38px;
        max-width: 46px;
        padding: 0 6px;
        border-radius: 5px;
        background: var(--lc, #555);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
      }
      .platform-label {
        font-size: 11px;
        color: var(--sec);
        margin-top: 2px;
      }
      .dep-mid {
        flex: 1;
        min-width: 0;
      }
      .dep-dir {
        font-size: 13px;
        font-weight: 600;
        color: var(--pri);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .delay-slot {
        flex-shrink: 0;
        width: 28px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .delay-badge {
        font-size: 10px;
        font-weight: 700;
        color: #e53935;
        white-space: nowrap;
      }
      .dep-right {
        flex-shrink: 0;
        text-align: right;
        min-width: 48px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1px;
      }
      .time-row {
        display: flex;
        align-items: center;
        gap: 2px;
        line-height: 1;
      }
      .time {
        font-size: 15px;
        font-weight: 500;
      }
      .rt-dot {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #4caf50;
        flex-shrink: 0;
        margin-bottom: 4px;
      }
      .time-now {
        color: #e53935;
      }
      .time-soon {
        color: #fb8c00;
      }
      .time-normal {
        color: var(--pri);
      }
      .abs-time {
        font-size: 11px;
        color: var(--sec);
      }
      .no-departures {
        padding: 12px 8px;
        font-size: 13px;
        color: var(--sec);
        text-align: center;
      }
      .error-row {
        padding: 10px 16px;
        font-size: 12px;
        color: #e53935;
      }
    `;
  }
}

customElements.define("vgn-departures-card", VgnDeparturesCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "vgn-departures-card",
  name: "VGN Departures Card",
  description:
    "ÖPNV-Abfahrtsmonitor für Bayern (VGN, RVV, MVV) via vgn-departures Integration",
  preview: true,
  documentationURL: "https://github.com/DHansel91/vgn-departures-card",
});

console.info(
  `%c VGN-DEPARTURES-CARD %c v${CARD_VERSION} `,
  "background:#0057a8;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:700",
  "background:#444;color:#fff;padding:2px 6px;border-radius:0 4px 4px 0"
);
