/**
 * vab-departures-card
 * Custom Lovelace card for real-time VAB bus/train departures.
 * https://github.com/mxkissnr/vab-departures-card
 */

const LINE_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#b45309',
];

function lineColor(line, config) {
  const custom = config?.line_colors?.[String(line)];
  if (custom) return custom;
  let hash = 0;
  for (const c of String(line)) hash = (hash * 31 + c.charCodeAt(0)) & 0xff;
  return LINE_COLORS[hash % LINE_COLORS.length];
}

function fmtMinutes(mins) {
  if (mins <= 0) return 'jetzt';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function fmtTime(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

// ─────────────────────────────────────────────
//  Card
// ─────────────────────────────────────────────

class VabDeparturesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(hass) {
    this._hass = hass;
    const entityIds = this._config?.entities?.length
      ? this._config.entities
      : this._getVabEntities();
    const key = entityIds.map(id => {
      const s = hass.states[id];
      return s ? JSON.stringify(s.attributes.departures) : 'x';
    }).join('|');
    if (key === this._renderKey) return;
    this._renderKey = key;
    this._render();
  }

  setConfig(config) {
    this._config = config ?? {};
  }

  static getConfigElement() {
    return document.createElement('vab-departures-card-editor');
  }

  static getStubConfig() {
    return { title: '' };
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entityIds = this._config.entities?.length
      ? this._config.entities
      : this._getVabEntities();

    const stops = entityIds.map(id => this._hass.states[id]).filter(Boolean);

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        ${this._config.title ? `<h1 class="card-header">${this._config.title}</h1>` : ''}
        ${stops.map(s => this._renderStop(s)).join('<div class="stop-divider"></div>')}
        ${!stops.length ? '<div class="empty">Keine Entitäten gefunden.</div>' : ''}
      </ha-card>
    `;
  }

  _renderStop(state) {
    const attrs = state.attributes;
    const departures = attrs.departures || [];
    const dirFilter = (attrs.direction_filter || []).join(' / ');
    const header = dirFilter
      ? `${attrs.stop_name} <span class="dir-label">→ ${dirFilter}</span>`
      : attrs.stop_name;

    const maxMins = Math.max(10, ...departures.map(d => d.minutes_until ?? 0));

    const rows = departures.length
      ? departures.map(d => this._renderRow(d, maxMins)).join('')
      : '<div class="no-dep">Keine Abfahrten</div>';

    return `
      <div class="stop-section">
        <div class="stop-header">${header}</div>
        ${rows}
      </div>
    `;
  }

  _renderRow(dep, maxMins = 30) {
    const color  = lineColor(dep.line, this._config);
    const mins   = dep.minutes_until ?? 0;
    const delay  = dep.delay_minutes ?? 0;
    const isNow  = mins <= 0;
    const clockTime = fmtTime(dep.effective);

    const threshold = this._config.leave_threshold ?? 2;
    const leaveMins = dep.leave_in_minutes;
    const leaveDue  = leaveMins != null && leaveMins <= threshold;

    const isNextDay = dep.effective
      && new Date(dep.effective).toDateString() !== new Date().toDateString();

    // Progress bar: fills up as departure approaches (0% = far, 100% = now)
    const pct = Math.max(0, Math.min(100, (1 - Math.min(mins, maxMins) / maxMins) * 100));
    const pctColor = pct > 66 ? '#ef4444' : pct > 33 ? '#f59e0b' : '#22c55e';

    const delayHtml = delay > 0
      ? `<span class="delay ${delay >= 5 ? 'severe' : ''}">&nbsp;+${delay} min</span>`
      : (dep.monitored ? `<span class="on-time">✓</span>` : '');

    const platformHtml = dep.platform
      ? `<span class="platform">Stg.&nbsp;${dep.platform}</span>`
      : '';

    return `
      <div class="row ${isNow ? 'now-row' : ''} ${leaveDue ? 'leave-now' : ''}">
        <div class="dot ${dep.monitored ? 'live' : 'planned'}"
             title="${dep.monitored ? 'Live' : 'Fahrplan'}"></div>
        <div class="badge" style="background:${color}">
          ${dep.line}
          <div class="progress-bar" style="width:${pct}%;background:${pctColor}"></div>
        </div>
        <div class="middle">
          <span class="direction">${dep.direction}</span>
          ${platformHtml}
        </div>
        <div class="time-col">
          <span class="mins ${isNow ? 'now' : ''}">${fmtMinutes(mins)}</span>
          ${clockTime ? `<span class="clock-time">${clockTime}</span>` : ''}
          ${delayHtml}
          ${isNextDay ? `<span class="next-day-badge">Morgen früh</span>` : ''}
          ${leaveDue ? `<span class="leave-badge">Jetzt los!</span>` : (leaveMins != null && leaveMins > threshold ? `<span class="leave-soon">Los in ${leaveMins} min</span>` : '')}
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────
//  Editor
// ─────────────────────────────────────────────

class VabDeparturesCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { entities: [], title: '', ...config };
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    const vabEntities = this._getVabEntities();
    this.querySelectorAll('ha-entity-picker').forEach(p => {
      p.hass = hass;
      p.includeEntities = vabEntities;
    });
  }

  _getVabEntities() {
    if (!this._hass) return [];
    return Object.keys(this._hass.states).filter(
      id => 'departures' in (this._hass.states[id].attributes || {})
    );
  }

  _build() {
    if (!this._config) return;
    this.innerHTML = `<style>${EDITOR_STYLES}</style><div class="cfg"></div>`;
    const cfg = this.querySelector('.cfg');

    // Title
    const titleField = document.createElement('ha-textfield');
    titleField.label = 'Titel (optional)';
    titleField.value = this._config.title || '';
    titleField.style.cssText = 'width:100%;display:block;margin-bottom:12px';
    titleField.addEventListener('change', e => {
      this._fire({ ...this._config, title: e.target.value || undefined });
    });
    cfg.appendChild(titleField);

    // Walk-time threshold
    const thresholdField = document.createElement('ha-textfield');
    thresholdField.label = 'Gehzeit-Schwelle (Minuten, Standard 2)';
    thresholdField.type = 'number';
    thresholdField.value = this._config.leave_threshold ?? 2;
    thresholdField.style.cssText = 'width:100%;display:block;margin-bottom:12px';
    thresholdField.addEventListener('change', e => {
      const val = parseInt(e.target.value);
      this._fire({ ...this._config, leave_threshold: isNaN(val) ? undefined : val });
    });
    cfg.appendChild(thresholdField);

    // Label
    const lbl = document.createElement('div');
    lbl.className = 'section-label';
    lbl.textContent = 'Haltestellen-Sensoren';
    cfg.appendChild(lbl);

    // Entity rows
    (this._config.entities || []).forEach((id, idx) => {
      cfg.appendChild(this._makeRow(id, idx));
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+ Haltestelle hinzufügen';
    addBtn.addEventListener('click', () => {
      this._fire({ ...this._config, entities: [...(this._config.entities || []), ''] });
    });
    cfg.appendChild(addBtn);

    // Line colors section
    const lines = this._collectLines();
    if (lines.length) {
      const colorLbl = document.createElement('div');
      colorLbl.className = 'section-label';
      colorLbl.textContent = 'Linienfarben';
      cfg.appendChild(colorLbl);
      lines.forEach(line => cfg.appendChild(this._makeColorRow(line)));
    }
  }

  _collectLines() {
    const lines = new Set();
    for (const id of (this._config.entities || [])) {
      const state = this._hass?.states[id];
      for (const dep of state?.attributes?.departures || []) {
        if (dep.line) lines.add(String(dep.line));
      }
    }
    return [...lines].sort((a, b) => (isNaN(a) || isNaN(b) ? a.localeCompare(b) : Number(a) - Number(b)));
  }

  _makeColorRow(line) {
    const currentColor = lineColor(line, this._config);
    const row = document.createElement('div');
    row.className = 'color-row';

    const badge = document.createElement('div');
    badge.className = 'color-badge';
    badge.style.background = currentColor;
    badge.textContent = line;

    const label = document.createElement('span');
    label.className = 'color-label';
    label.textContent = `Linie ${line}`;

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'color-input';
    input.value = currentColor;
    input.addEventListener('input', e => {
      badge.style.background = e.target.value;
    });
    input.addEventListener('change', e => {
      const colors = { ...(this._config.line_colors || {}), [line]: e.target.value };
      this._fire({ ...this._config, line_colors: colors });
    });

    const reset = document.createElement('button');
    reset.className = 'color-reset';
    reset.title = 'Auf Standard zurücksetzen';
    reset.textContent = '↺';
    reset.addEventListener('click', () => {
      const colors = { ...(this._config.line_colors || {}) };
      delete colors[line];
      this._fire({ ...this._config, line_colors: Object.keys(colors).length ? colors : undefined });
    });

    row.appendChild(badge);
    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(reset);
    return row;
  }

  _makeRow(entityId, idx) {
    const row = document.createElement('div');
    row.className = 'entity-row';

    const picker = document.createElement('ha-entity-picker');
    picker.hass           = this._hass;
    picker.value          = entityId;
    picker.label          = `Sensor ${idx + 1}`;
    picker.includeEntities = this._getVabEntities();
    picker.addEventListener('value-changed', e => {
      const updated = [...(this._config.entities || [])];
      updated[idx] = e.detail.value;
      this._fire({ ...this._config, entities: updated });
    });

    const del = document.createElement('ha-icon-button');
    del.setAttribute('icon', 'mdi:delete');
    del.title = 'Entfernen';
    del.addEventListener('click', () => {
      const updated = [...(this._config.entities || [])];
      updated.splice(idx, 1);
      this._fire({ ...this._config, entities: updated });
    });

    row.appendChild(picker);
    row.appendChild(del);
    return row;
  }

  _fire(config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
    this._build();
  }
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const CARD_STYLES = `
  ha-card { overflow:hidden; padding:0; }
  .card-header {
    padding: 16px 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--primary-text-color);
    margin: 0;
  }
  .stop-section { padding-bottom: 4px; }
  .stop-header {
    padding: 12px 16px 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .dir-label {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }
  .stop-divider {
    height: 1px;
    background: var(--divider-color, rgba(0,0,0,.12));
    margin: 4px 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    transition: background .15s;
  }
  .row:hover { background: var(--secondary-background-color); }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot.live    { background: #22c55e; }
  .dot.planned { background: var(--disabled-color, #9ca3af); }
  .badge {
    min-width: 34px; height: 26px;
    border-radius: 6px;
    color: #fff;
    font-size: 12px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    padding: 0 5px;
    flex-shrink: 0;
    letter-spacing: .02em;
    position: relative;
    overflow: hidden;
  }
  .progress-bar {
    position: absolute;
    bottom: 0; left: 0;
    height: 3px;
    border-radius: 0 0 6px 6px;
    transition: width .4s ease;
  }
  .middle {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 1px;
  }
  .direction {
    font-size: 14px;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .platform { font-size: 11px; color: var(--secondary-text-color); }
  .time-col {
    text-align: right;
    flex-shrink: 0;
    display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
  }
  .mins {
    font-size: 17px; font-weight: 700;
    color: var(--primary-text-color);
    line-height: 1.1;
  }
  .mins.now  { color: var(--error-color, #dc2626); }
  .now-row .mins { color: var(--error-color, #dc2626); }
  .clock-time {
    font-size: 11px;
    color: var(--secondary-text-color);
    letter-spacing: .02em;
  }
  .delay       { font-size: 11px; font-weight: 600; color: var(--warning-color, #f59e0b); }
  .delay.severe{ color: var(--error-color, #dc2626); }
  .on-time     { font-size: 11px; color: #22c55e; font-weight: 600; }
  .no-dep, .empty {
    padding: 8px 16px 12px;
    font-size: 13px;
    color: var(--secondary-text-color);
  }
  .leave-now {
    border-left: 3px solid var(--warning-color, #f59e0b);
    padding-left: 13px;
    background: rgba(245,158,11,.06);
  }
  .leave-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--warning-color, #f59e0b);
    letter-spacing: .04em;
    text-transform: uppercase;
    animation: leavePulse 1.2s ease-in-out infinite;
  }
  @keyframes leavePulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .35; }
  }
  .leave-soon {
    font-size: 10px;
    font-weight: 600;
    color: var(--secondary-text-color);
    letter-spacing: .02em;
  }
  .next-day-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--error-color, #dc2626);
    letter-spacing: .04em;
    text-transform: uppercase;
  }
`;

const EDITOR_STYLES = `
  .cfg { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
  .section-label {
    font-size: 12px; font-weight: 600;
    color: var(--secondary-text-color);
    text-transform: uppercase; letter-spacing: .05em;
    margin-top: 4px;
  }
  .entity-row {
    display: flex; align-items: center; gap: 8px;
  }
  .entity-row ha-entity-picker { flex: 1; }
  .add-btn {
    margin-top: 4px;
    background: none;
    border: 1px dashed var(--primary-color);
    color: var(--primary-color);
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    width: 100%;
  }
  .add-btn:hover { background: var(--primary-color); color: white; }
  .color-row {
    display: flex; align-items: center; gap: 10px;
    padding: 4px 0;
  }
  .color-badge {
    min-width: 34px; height: 26px;
    border-radius: 6px;
    color: #fff;
    font-size: 12px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    padding: 0 6px;
    flex-shrink: 0;
  }
  .color-label { flex: 1; font-size: 13px; color: var(--primary-text-color); }
  .color-input {
    width: 36px; height: 28px;
    border: none; border-radius: 6px;
    padding: 2px; cursor: pointer;
    background: none;
  }
  .color-reset {
    background: none; border: none;
    color: var(--secondary-text-color);
    cursor: pointer; font-size: 16px;
    padding: 2px 4px; border-radius: 4px;
  }
  .color-reset:hover { color: var(--primary-text-color); }
`;

// ─────────────────────────────────────────────
//  Registration
// ─────────────────────────────────────────────

customElements.define('vab-departures-card', VabDeparturesCard);
customElements.define('vab-departures-card-editor', VabDeparturesCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'vab-departures-card',
  name: 'VAB Departures Card',
  description: 'Real-time bus and train departures for VAB Aschaffenburg',
  preview: false,
});
