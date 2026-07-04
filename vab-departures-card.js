/**
 * vab-departures-card
 * Custom Lovelace card for real-time VAB bus/train departures.
 * https://github.com/mxkissnr/vab-departures-card
 */

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const LINE_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#b45309',
];

function lineColor(line, config) {
  const custom = config?.line_colors?.[String(line)];
  // Only accept hex colors — anything else could inject CSS via the style attribute
  if (custom && /^#[0-9a-f]{3,8}$/i.test(custom)) return custom;
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

function leaveUrgency(leaveMins) {
  if (leaveMins <= 0) return 'Sofort losrennen! Du verpasst sonst den Bus.';
  if (leaveMins === 1) return 'In 1 Minute losgehen!';
  return `Noch ${leaveMins} Minuten — jetzt losgehen!`;
}

// ─────────────────────────────────────────────
//  Card
// ─────────────────────────────────────────────

class VabDeparturesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    try {
      this._expanded = new Set(JSON.parse(localStorage.getItem('vab-expanded') || '[]'));
    } catch {
      this._expanded = new Set();
    }
    try {
      this._starred = new Set(JSON.parse(localStorage.getItem('vab-starred') || '[]'));
    } catch {
      this._starred = new Set();
    }
    this._notified      = new Set();
    this._notifiedDelay = new Map();
  }

  set hass(hass) {
    this._hass = hass;
    const entityIds = this._resolveEntities();
    const key = entityIds.map(id => {
      const s = hass.states[id];
      return s ? JSON.stringify(s.attributes.departures) : 'x';
    }).join('|');
    if (key !== this._renderKey) {
      this._renderKey = key;
      this._render();
    }
    this._checkStarNotifications();
  }

  setConfig(config) {
    const c = config ?? {};
    // Backwards-compat: if entities already set and auto_entities not explicitly given → manual
    this._config = { auto_entities: !c.entities?.length, ...c };
  }

  static getConfigElement() {
    return document.createElement('vab-departures-card-editor');
  }

  static getStubConfig() {
    return { title: '', auto_entities: true };
  }

  _getVabEntities() {
    if (!this._hass) return [];
    return Object.keys(this._hass.states).filter(
      id => 'departures' in (this._hass.states[id].attributes || {})
    );
  }

  _resolveEntities() {
    return this._config.auto_entities !== false
      ? this._getVabEntities()
      : (this._config.entities || []);
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entityIds = this._resolveEntities();

    const stops = entityIds.map(id => this._hass.states[id]).filter(Boolean);

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        ${this._config.title ? `<h1 class="card-header">${esc(this._config.title)}</h1>` : ''}
        ${stops.map(s => this._renderStop(s)).join('<div class="stop-divider"></div>')}
        ${!stops.length ? '<div class="empty">Keine Entitäten gefunden.</div>' : ''}
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('.stop-header.collapsible').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        this._expanded.has(key) ? this._expanded.delete(key) : this._expanded.add(key);
        try { localStorage.setItem('vab-expanded', JSON.stringify([...this._expanded])); } catch {}
        this._renderKey = null;
        this._render();
      });
    });

    this.shadowRoot.querySelectorAll('.row-star').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const row = btn.closest('.row');
        const dep = { line: row.dataset.starLine, direction: row.dataset.starDir, planned: row.dataset.starPlanned };
        this._toggleStar(dep);
      });
    });
  }

  _renderStop(state) {
    const attrs = state.attributes;
    const departures = attrs.departures || [];
    const dirFilter = (attrs.direction_filter || []).map(esc).join(' / ');
    const stopLabel = dirFilter
      ? `${esc(attrs.stop_name)} <span class="dir-label">→ ${dirFilter}</span>`
      : esc(attrs.stop_name);

    const collapseKey = state.entity_id;
    const isCollapsed = !this._expanded.has(collapseKey);
    const visible = isCollapsed ? departures.slice(0, 1) : departures;

    const rows = visible.length
      ? visible.map(d => this._renderRow(d)).join('')
      : '<div class="no-dep">Keine Abfahrten</div>';

    const chevron = departures.length > 1
      ? `<span class="chevron">${isCollapsed ? '▶' : '▼'}</span>`
      : '';

    return `
      <div class="stop-section">
        <div class="stop-header ${departures.length > 1 ? 'collapsible' : ''}"
             data-key="${esc(collapseKey)}">
          ${chevron}${stopLabel}
        </div>
        ${rows}
        ${isCollapsed && departures.length > 1
          ? `<div class="collapsed-hint">+${departures.length - 1} weitere</div>`
          : ''}
      </div>
    `;
  }

  _starKey(dep) {
    return `${dep.line}|${dep.direction}|${dep.planned}`;
  }

  _toggleStar(dep) {
    const k = this._starKey(dep);
    this._starred.has(k) ? this._starred.delete(k) : this._starred.add(k);
    try { localStorage.setItem('vab-starred', JSON.stringify([...this._starred])); } catch {}
    this._renderKey = null;
    this._render();
  }

  _renderRow(dep) {
    const color     = lineColor(dep.line, this._config);
    const mins      = dep.minutes_until ?? 0;
    const delay     = dep.delay_minutes ?? 0;
    const isNow     = mins <= 0;
    const clockTime = fmtTime(dep.effective);

    const threshold = this._config.leave_threshold ?? 2;
    const leaveMins = dep.leave_in_minutes;
    const leaveDue  = leaveMins != null && leaveMins <= threshold;

    const isNextDay = dep.effective
      && new Date(dep.effective).toDateString() !== new Date().toDateString();

    const starred = this._starred.has(this._starKey(dep));

    const delayHtml = delay > 0
      ? `<span class="delay ${delay >= 5 ? 'severe' : ''}">&nbsp;+${delay} min</span>`
      : (dep.monitored ? `<span class="on-time">✓</span>` : '');

    const platformHtml = dep.platform
      ? `<span class="platform">Stg.&nbsp;${esc(dep.platform)}</span>`
      : '';

    return `
      <div class="row ${isNow ? 'now-row' : ''} ${leaveDue ? 'leave-now' : ''} ${starred ? 'starred-row' : ''}"
           data-star-line="${esc(dep.line)}" data-star-dir="${esc(dep.direction)}" data-star-planned="${esc(dep.planned)}">
        <div class="dot ${dep.monitored ? 'live' : 'planned'}"
             title="${dep.monitored ? 'Live' : 'Fahrplan'}"></div>
        <div class="badge" style="background:${esc(color)}">${esc(dep.line)}</div>
        <div class="middle">
          <span class="direction">${esc(dep.direction)}</span>
          ${platformHtml}
        </div>
        <div class="time-col">
          <span class="mins ${isNow ? 'now' : ''}">${fmtMinutes(mins)}</span>
          ${clockTime ? `<span class="clock-time">${clockTime}</span>` : ''}
          ${delayHtml}
          ${isNextDay ? `<span class="next-day-badge">Morgen früh</span>` : ''}
          ${leaveDue ? `<span class="leave-badge">Jetzt los!</span>` : (leaveMins != null && leaveMins > threshold && leaveMins <= 60 ? `<span class="leave-soon">Los in ${leaveMins} min</span>` : '')}
        </div>
        <button class="row-star${starred ? ' starred' : ''}" title="${starred ? 'Beobachtung entfernen' : 'Benachrichtigung wenn los'}">★</button>
      </div>
    `;
  }

  _checkStarNotifications() {
    if (!this._starred.size || !this._hass) return;
    const threshold     = this._config.leave_threshold ?? 2;
    // Only call services that actually exist under the notify domain
    const cfgService    = this._config.notify_service;
    const mobileService = cfgService && this._hass.services?.notify?.[cfgService] ? cfgService : null;
    const entityIds     = this._resolveEntities();
    for (const id of entityIds) {
      const state    = this._hass.states[id];
      const stopName = state?.attributes?.stop_name || '';
      const deps     = state?.attributes?.departures || [];
      for (const dep of deps) {
        const k = this._starKey(dep);
        if (!this._starred.has(k)) continue;
        const leaveMins = dep.leave_in_minutes;
        const isDue     = leaveMins != null && leaveMins <= threshold;
        if (isDue && !this._notified.has(k)) {
          this._notified.add(k);
          const title   = `Bus ${dep.line} → ${dep.direction}`;
          const message = `${leaveUrgency(leaveMins)} Fährt um ${fmtTime(dep.effective)} ab ${stopName}.`;
          if (mobileService) {
            this._hass.callService('notify', mobileService, { title, message });
          } else {
            this._hass.callService('persistent_notification', 'create', {
              notification_id: `vab_watch_${k.replace(/[^a-z0-9]/gi, '_')}`,
              title:           `${title} — Jetzt losrennen!`,
              message,
            });
          }
        } else if (!isDue) {
          this._notified.delete(k);
          if (!mobileService) {
            this._hass.callService('persistent_notification', 'dismiss', {
              notification_id: `vab_watch_${k.replace(/[^a-z0-9]/gi, '_')}`,
            });
          }
        }

        // Delay notification
        const delay = dep.delay_minutes ?? 0;
        if (delay > 0 && this._notifiedDelay.get(k) !== delay) {
          this._notifiedDelay.set(k, delay);
          const title   = `Bus ${dep.line} → ${dep.direction}`;
          const message = `+${delay} min Verspätung. Neue Abfahrt: ${fmtTime(dep.effective)} ab ${stopName}.`;
          if (mobileService) {
            this._hass.callService('notify', mobileService, { title, message });
          } else {
            this._hass.callService('persistent_notification', 'create', {
              notification_id: `vab_delay_${k.replace(/[^a-z0-9]/gi, '_')}`,
              title:           `${title} — Verspätung!`,
              message,
            });
          }
        } else if (delay === 0) {
          this._notifiedDelay.delete(k);
        }
      }
    }
  }
}

// ─────────────────────────────────────────────
//  Editor
// ─────────────────────────────────────────────

class VabDeparturesCardEditor extends HTMLElement {
  setConfig(config) {
    const c = config ?? {};
    this._config = { entities: [], title: '', auto_entities: !c.entities?.length, ...c };
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

    // Notify service picker
    const mobileServices = Object.keys(this._hass?.services?.notify || {})
      .filter(s => s.startsWith('mobile_app_'));
    if (mobileServices.length) {
      const notifyLbl = document.createElement('div');
      notifyLbl.className = 'section-label';
      notifyLbl.textContent = 'Benachrichtigungs-Gerät';
      cfg.appendChild(notifyLbl);

      const notifyHint = document.createElement('div');
      notifyHint.className = 'notify-hint';
      notifyHint.textContent = 'Push-Notification wenn Stern-Abfahrt bevorsteht (HA Companion App)';
      cfg.appendChild(notifyHint);

      const notifyRow = document.createElement('div');
      notifyRow.className = 'notify-row';

      const sel = document.createElement('select');
      sel.className = 'notify-select';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '— keins (nur HA-Glocke) —';
      sel.appendChild(noneOpt);
      mobileServices.forEach(svc => {
        const opt = document.createElement('option');
        opt.value = svc;
        opt.textContent = svc.replace('mobile_app_', '').replace(/_/g, ' ');
        if (svc === this._config.notify_service) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', e => {
        this._fire({ ...this._config, notify_service: e.target.value || undefined });
      });
      notifyRow.appendChild(sel);
      cfg.appendChild(notifyRow);
    }

    // Mode toggle: Auto / Manual
    const modeLbl = document.createElement('div');
    modeLbl.className = 'section-label';
    modeLbl.textContent = 'Haltestellen-Modus';
    cfg.appendChild(modeLbl);

    const isAuto = this._config.auto_entities !== false;
    const modeRow = document.createElement('div');
    modeRow.className = 'mode-row';
    ['Automatisch', 'Manuell'].forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = `mode-btn${(i === 0) === isAuto ? ' active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this._fire({ ...this._config, auto_entities: i === 0 });
      });
      modeRow.appendChild(btn);
    });
    cfg.appendChild(modeRow);

    // Entity pickers — only in manual mode
    if (!isAuto) {
      const lbl = document.createElement('div');
      lbl.className = 'section-label';
      lbl.textContent = 'Haltestellen-Sensoren';
      cfg.appendChild(lbl);

      (this._config.entities || []).forEach((id, idx) => {
        cfg.appendChild(this._makeRow(id, idx));
      });

      const addBtn = document.createElement('button');
      addBtn.className = 'add-btn';
      addBtn.textContent = '+ Haltestelle hinzufügen';
      addBtn.addEventListener('click', () => {
        this._fire({ ...this._config, entities: [...(this._config.entities || []), ''] });
      });
      cfg.appendChild(addBtn);
    }

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
    const ids = this._config.auto_entities !== false
      ? this._getVabEntities()
      : (this._config.entities || []);
    for (const id of ids) {
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
  .stop-header.collapsible {
    cursor: pointer;
    user-select: none;
  }
  .stop-header.collapsible:hover { color: var(--primary-text-color); }
  .chevron { margin-right: 5px; font-size: 9px; }
  .collapsed-hint {
    padding: 2px 16px 8px;
    font-size: 11px;
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
  }
  .starred-row { border-left: 3px solid var(--warning-color, #f59e0b); padding-left: 13px; }
  .row-star {
    background: none; border: none; cursor: pointer; padding: 0 0 0 6px;
    font-size: 14px; line-height: 1;
    color: var(--secondary-text-color);
    flex-shrink: 0;
    opacity: 0.35;
    transition: opacity .15s, color .15s;
  }
  .row:hover .row-star { opacity: 0.75; }
  .row-star.starred { color: var(--warning-color, #f59e0b); opacity: 1; }
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
  .notify-hint {
    font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;
  }
  .notify-row { display: flex; }
  .notify-select {
    flex: 1; padding: 8px 10px; border-radius: 6px;
    border: 1px solid var(--divider-color, #e5e7eb);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 14px; cursor: pointer;
  }
  .entity-row {
    display: flex; align-items: center; gap: 8px;
  }
  .entity-row ha-entity-picker { flex: 1; }
  .mode-row {
    display: flex; gap: 8px; margin-bottom: 8px;
  }
  .mode-btn {
    flex: 1; padding: 8px;
    border: 1px solid var(--divider-color, #ccc);
    border-radius: 6px;
    background: none;
    color: var(--primary-text-color);
    cursor: pointer; font-size: 13px;
    transition: background .15s, color .15s;
  }
  .mode-btn.active {
    background: var(--primary-color);
    color: #fff;
    border-color: var(--primary-color);
  }
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
