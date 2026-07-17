import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCard } from '../types/hass';
import type { HiperMvhrCardConfig } from '../types/config';
import type { RoleValue } from '../types/snapshot';
import type { EntityRoleId } from '../types/entity-roles';
import { parseConfig } from '../data/config-schema';
import { resolveCapabilities } from '../data/capability-resolver';
import { resolveSnapshot } from '../data/entity-resolver';
import { summarizeAvailability, type AvailabilitySummary } from '../data/availability-summary';
import { ControlDispatcher } from '../data/control-dispatcher';
import { getProfile } from '../manufacturers';
import { formatRoleValue, capitalize } from '../utils/format';
import { getRoleIcon } from '../utils/icons';
import { calculateHeatRecovery, type HeatRecoveryResult } from '../utils/heat-recovery';

const CARD_TAG = 'hiper-mvhr-card';

const TEMPERATURE_ROLES: Array<[EntityRoleId, string]> = [
  ['outdoor_air_temp', 'Outdoor air'],
  ['supply_air_temp', 'Supply air'],
  ['extract_air_temp', 'Extract air'],
  ['exhaust_air_temp', 'Exhaust air'],
];

const AIRFLOW_ROLES: Array<[EntityRoleId, string]> = [
  ['supply_airflow', 'Supply airflow'],
  ['extract_airflow', 'Extract airflow'],
];

const FAN_ROLES: Array<[EntityRoleId, string]> = [
  ['supply_fan_speed', 'Supply fan'],
  ['extract_fan_speed', 'Extract fan'],
];

const STATUS_ROLES: Array<[EntityRoleId, string]> = [
  ['bypass_state', 'Summer bypass'],
  ['filter_remaining', 'Filter'],
  ['calibration_result', 'Calibration'],
  ['fault_active', 'Fault'],
  ['frost_protection_active', 'Frost protection'],
];

// Phase 3A: the one action role implemented so far. Kept out of
// STATUS_ROLES/`_present` because it renders as an interactive control, not
// read-only text, when its snapshot status is 'ok' — see `_controlRow`.
const CONTROL_ROLES: Array<[EntityRoleId, string]> = [['filter_reset_control', 'Filter reset']];

const TONE_ICONS: Record<AvailabilitySummary['tone'], string> = {
  success: 'mdi:check-circle',
  warning: 'mdi:alert',
  muted: 'mdi:information-outline',
};

/** What one resolved role should look like once display_mode is applied. */
interface Presentation {
  tone: 'normal' | 'muted' | 'warning';
  text: string;
}

/**
 * No manufacturer-specific logic lives in this component (CLAUDE.md's one
 * rule) — it only ever asks the resolved CapabilityProfile whether a role is
 * supported, and renders the resulting MvhrSnapshot. Which manufacturer
 * produced that profile is never inspected here.
 */
export class HiperMvhrCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: HiperMvhrCardConfig;
  @state() private _configError?: string;

  // One ControlDispatcher per active action role, created lazily and kept
  // alive across renders (not a @state field — its pending/error state is
  // read on demand in render(), and `onChange` explicitly requests an
  // update, so Lit's own reactivity doesn't need to know about this map).
  private readonly _dispatchers = new Map<EntityRoleId, ControlDispatcher>();

  private _getDispatcher(role: EntityRoleId): ControlDispatcher {
    let dispatcher = this._dispatchers.get(role);
    if (!dispatcher) {
      dispatcher = new ControlDispatcher();
      dispatcher.onChange(() => this.requestUpdate());
      this._dispatchers.set(role, dispatcher);
    }
    return dispatcher;
  }

  static getStubConfig(): Partial<HiperMvhrCardConfig> {
    return {
      manufacturer: 'generic',
      display_mode: 'homeowner',
      entities: {},
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('hiper-mvhr-card-editor');
  }

  setConfig(config: Record<string, unknown>): void {
    try {
      this._config = parseConfig(config);
      this._configError = undefined;
    } catch (err) {
      this._config = undefined;
      this._configError = err instanceof Error ? err.message : String(err);
    }
  }

  getCardSize(): number {
    return 4;
  }

  protected render(): TemplateResult {
    if (this._configError) {
      return html`<ha-card><div class="error" role="alert">${this._configError}</div></ha-card>`;
    }
    if (!this._config || !this.hass) {
      return html``;
    }

    const config = this._config;
    const hass = this.hass;
    const detailed = config.display_mode === 'detailed';
    const profile = resolveCapabilities(config.manufacturer, config.feature_flags);
    const displayProfile = getProfile(config.manufacturer);
    const snapshot = resolveSnapshot(hass, profile, config.entities);
    const availability = summarizeAvailability(snapshot, profile);
    // "Not configured" is the header summary's fallback for "nothing mapped
    // yet" — configuration jargon, so homeowner mode omits the chip entirely
    // rather than show it (same "quiet, no jargon" policy as _present()'s
    // not_configured/entity_missing handling below). Detailed mode keeps it.
    const showAvailability = detailed || availability.label !== 'Not configured';
    const modePresentation = snapshot.mode ? this._present(snapshot.mode, detailed) : null;
    const title = config.title ?? config.name ?? displayProfile.name;
    const subtitle = config.subtitle ?? 'Heat Recovery Ventilation System';
    const active = availability.tone !== 'warning' && availability.label !== 'Not configured';
    const recovery = this._heatRecovery(snapshot, config.heat_recovery_method);
    const modeLabel = this._modeLabel(modePresentation?.text ?? this._text(snapshot.effective_mode));
    const unitBrand = config.title ?? displayProfile.name;
    const showStatusStrip =
      detailed ||
      availability.label !== 'Not configured' ||
      Boolean(config.show_calibration && (this._value(snapshot.calibration_result) || this._value(snapshot.last_calibration)));

    return html`
      <ha-card>
        <div class="header mvhr-header">
          <div>
            <h2 class="title">${title}</h2>
            <div class="subheader">
              <span class="model">${subtitle}</span>
              <span class="sep" aria-hidden="true">·</span>
              <span class="mode">${modeLabel || displayProfile.name}</span>
            </div>
          </div>
          ${showAvailability
            ? html`
                <div class="availability tone-${availability.tone}" role="status">
                  <ha-icon icon=${TONE_ICONS[availability.tone]} aria-hidden="true"></ha-icon>
                  <span>${availability.label}</span>
                </div>
              `
            : ''}
        </div>

        <div class="content">
          ${this._metricSection('Temperatures', TEMPERATURE_ROLES, snapshot, detailed)}
          ${this._metricSection('Airflow', AIRFLOW_ROLES, snapshot, detailed)}
          ${this._statusSection('System status', STATUS_ROLES, snapshot, detailed, config, hass)}
        </div>

        <div class="dashboard">
          <section class="visual-panel" aria-label="MVHR airflow diagram">
            ${this._systemVisual(snapshot, config, active, unitBrand)}
          </section>
          ${config.show_controls && this._hasControls(snapshot, config)
            ? this._controlsPanel(snapshot, config, hass)
            : ''}
          <section class="tile-grid" aria-label="MVHR metrics">
            ${this._infoTile('Mode', modeLabel || '—', 'mdi:fan-auto')}
            ${this._infoTile('Measured airflow', this._value(snapshot.airflow) ?? this._value(snapshot.supply_airflow) ?? '—', 'mdi:weather-windy')}
            ${this._infoTile('Target airflow', this._value(snapshot.target_airflow) ?? '—', 'mdi:target')}
            ${this._infoTile('Mapped level', this._value(snapshot.mapped_level) ?? '—', 'mdi:tune-variant')}
            ${this._infoTile('Heat recovery', recovery.label, 'mdi:heat-wave', recovery.status)}
            ${config.show_fan_speeds ? this._infoTile('Fan speeds', this._pair(FAN_ROLES, snapshot), 'mdi:fan') : ''}
            ${this._infoTile('Humidity', this._value(snapshot.indoor_humidity) ?? '—', 'mdi:water-percent')}
            ${config.show_filter ? this._filterTile(snapshot, config) : ''}
          </section>
          ${showStatusStrip
            ? html`
                <section class="status-strip" aria-label="MVHR status">
                  <span>${this._systemStatus(snapshot, availability)}</span>
                  ${config.show_calibration
                    ? html`
                        <span>Calibration: ${this._value(snapshot.calibration_result) ?? '—'}</span>
                        <span>Last calibration: ${this._value(snapshot.last_calibration) ?? '—'}</span>
                      `
                    : ''}
                </section>
              `
            : ''}
        </div>
      </ha-card>
    `;
  }

  /**
   * Applies the SPECIFICATION.md §6 / display-mode policy to one resolved
   * role: what should actually appear, and how prominent should it look.
   * Returns null when nothing should render for this role at all.
   */
  private _present(value: RoleValue, detailed: boolean): Presentation | null {
    if (value.status === 'unsupported') {
      return null;
    }
    if (value.status === 'not_configured') {
      // Homeowner: omit unconfigured optional roles entirely.
      // Detailed: show it, quietly, so an installer can see what's left to wire up.
      return detailed ? { tone: 'muted', text: 'Not configured' } : null;
    }
    if (value.status === 'entity_missing') {
      // Homeowner: no raw entity IDs, no configuration jargon — reads the
      // same as a sensor that's simply unavailable right now.
      // Detailed: a real configuration warning, with the entity id that's missing.
      return detailed
        ? { tone: 'warning', text: `Entity not found: ${value.entityId}` }
        : { tone: 'muted', text: 'Unavailable' };
    }
    if (value.status === 'unavailable') {
      return { tone: 'muted', text: 'Unavailable' };
    }
    // status === 'ok' — includes a legitimate zero reading, formatRoleValue
    // renders value.value verbatim so "0" is never mistaken for "no data".
    return { tone: 'normal', text: formatRoleValue(value) };
  }

  private _metricSection(
    heading: string,
    roles: Array<[EntityRoleId, string]>,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    detailed: boolean,
  ): TemplateResult {
    const cells = roles
      .map(([role, label]) => {
        const value = snapshot[role];
        const presentation = value ? this._present(value, detailed) : null;
        return presentation ? this._metricCell(role, label, presentation) : null;
      })
      .filter((cell): cell is TemplateResult => cell !== null);

    if (cells.length === 0) {
      return html``;
    }

    return html`
      <section class="metric-section" aria-label=${heading}>
        <h3>${heading}</h3>
        <div class="metric-grid">${cells}</div>
      </section>
    `;
  }

  private _metricCell(role: EntityRoleId, label: string, presentation: Presentation): TemplateResult {
    const icon = getRoleIcon(role);
    return html`
      <div class="metric tone-${presentation.tone}">
        ${icon ? html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon>` : ''}
        <div class="metric-text">
          <span class="metric-label">${label}</span>
          <span class="metric-value">${presentation.text}</span>
        </div>
      </div>
    `;
  }

  private _statusSection(
    heading: string,
    roles: Array<[EntityRoleId, string]>,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    detailed: boolean,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const valueRows = roles
      .map(([role, label]) => {
        const value = snapshot[role];
        const presentation = value ? this._present(value, detailed) : null;
        return presentation ? this._statusRow(role, label, presentation) : null;
      })
      .filter((row): row is TemplateResult => row !== null);

    const controlRows = CONTROL_ROLES.map(([role, label]) =>
      this._controlRow(role, label, snapshot[role], detailed, config, hass),
    ).filter((row): row is TemplateResult => row !== null);

    const rows = [...valueRows, ...controlRows];
    if (rows.length === 0) {
      return html``;
    }

    return html`
      <section class="status-section" aria-label=${heading}>
        <h3>${heading}</h3>
        <div class="status-list">${rows}</div>
      </section>
    `;
  }

  private _statusRow(role: EntityRoleId, label: string, presentation: Presentation): TemplateResult {
    const icon = getRoleIcon(role);
    return html`
      <div class="status-row tone-${presentation.tone}">
        ${icon ? html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon>` : ''}
        <span class="status-label">${label}</span>
        <span class="status-value">${presentation.text}</span>
      </div>
    `;
  }

  /**
   * Renders one action role. The non-value states (unsupported/not
   * configured/entity missing/unavailable) reuse `_present`/`_statusRow`
   * verbatim, so a control degrades identically to every read-only role
   * (SPECIFICATION.md §6) — only the 'ok' state diverges, showing an
   * interactive button instead of formatted text, since a button entity's
   * raw state (a last-pressed timestamp) isn't meaningful to show.
   */
  private _controlRow(
    role: EntityRoleId,
    label: string,
    value: RoleValue | undefined,
    detailed: boolean,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult | null {
    if (!value) {
      return null;
    }
    if (value.status !== 'ok') {
      const presentation = this._present(value, detailed);
      return presentation ? this._statusRow(role, label, presentation) : null;
    }

    const entityId = config.entities[role];
    if (!entityId) {
      // Can't happen in practice — entity-resolver only produces 'ok' when
      // an entity id was mapped — but keeps this method total rather than
      // asserting non-null.
      return null;
    }

    const dispatcher = this._getDispatcher(role);
    const state = dispatcher.state;
    const icon = getRoleIcon(role);

    return html`
      <div class="status-row">
        ${icon ? html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon>` : ''}
        <span class="status-label">${label}</span>
        ${state.status === 'error'
          ? html`<span class="status-value tone-warning">Couldn't reset</span>`
          : ''}
        <button
          type="button"
          class="control-button"
          aria-label=${label}
          ?disabled=${state.status === 'pending'}
          @click=${() => dispatcher.dispatchAction(hass, entityId)}
        >
          ${state.status === 'pending' ? 'Resetting…' : 'Reset'}
        </button>
      </div>
    `;
  }

  private _systemVisual(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    active: boolean,
    unitBrand: string,
  ): TemplateResult {
    const sharedAirflow = this._value(snapshot.airflow);
    const showAllAirflows = config.show_airflow_on_all_paths;
    const path = (
      key: string,
      label: string,
      role: EntityRoleId,
      airflow?: string | null,
    ) => html`
      <div class="air-path ${key} ${active ? 'active' : ''}">
        <span class="path-label">${label}</span>
        <span class="path-temp">${this._value(snapshot[role]) ?? '—'}</span>
        ${airflow ? html`<span class="path-airflow">${airflow}</span>` : ''}
      </div>
    `;

    return html`
      <div class="visual-wrap">
        ${path('extract', 'Extract air', 'extract_air_temp', sharedAirflow)}
        ${path('exhaust', 'Exhaust air', 'exhaust_air_temp', showAllAirflows ? sharedAirflow : null)}
        <div class="unit" aria-label="Heat recovery unit">
          <div class="brand">
            ${unitBrand}${unitBrand.toLowerCase().includes('mvhr') ? '' : html`<br /><span>MVHR</span>`}
          </div>
          <div class="exchanger" aria-hidden="true"></div>
          <div class="fan fan-a" aria-hidden="true">✦</div>
          <div class="fan fan-b" aria-hidden="true">✦</div>
        </div>
        ${path('outdoor', 'Outdoor air', 'outdoor_air_temp', showAllAirflows ? sharedAirflow : null)}
        ${path('supply', 'Supply air', 'supply_air_temp', sharedAirflow)}
      </div>
    `;
  }

  private _controlsPanel(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const modeEntity = config.entities.mode;
    const durationEntity = config.entities.boost_duration;
    const overrideEntity = config.entities.override_duration;
    const modeOptions = this._modeOptions(snapshot.mode);
    const overrideOptions = this._selectOptions(snapshot.override_duration);
    const boostActive = this._state(snapshot.boost_active) === 'on';
    return html`
      <aside class="controls-panel" aria-label="MVHR controls">
        <div class="panel-heading">Controls</div>
        <div class="mode-buttons">
          ${modeOptions.map(
            (option) => html`
              <button
                type="button"
                class="chip"
                ?disabled=${!modeEntity}
                aria-label=${`Set mode ${this._modeLabel(option)}`}
                @click=${() => modeEntity && this._call(hass, 'select', 'select_option', { entity_id: modeEntity, option })}
              >
                ${this._modeLabel(option)}
              </button>
            `,
          )}
        </div>
        <div class="control-block">
          <span>Boost</span>
          <strong>${boostActive ? 'Active' : 'Ready'}</strong>
          <small>${this._value(snapshot.boost_remaining) ?? '—'} remaining</small>
          <label class="field">
            <span>Duration</span>
            <input
              type="number"
              min="1"
              step="1"
              .value=${this._state(snapshot.boost_duration) ?? ''}
              ?disabled=${!durationEntity}
              aria-label="Boost duration"
              @change=${(event: Event) => {
                const value = Number((event.currentTarget as HTMLInputElement).value);
                if (durationEntity && Number.isFinite(value)) {
                  void this._call(hass, 'number', 'set_value', { entity_id: durationEntity, value });
                }
              }}
            />
          </label>
          <div class="button-row">
            <button
              type="button"
              aria-label="Start Boost"
              ?disabled=${boostActive || !config.entities.start_boost}
              @click=${() => this._press(hass, config.entities.start_boost)}
            >
              Start
            </button>
            <button
              type="button"
              aria-label="Cancel Boost"
              ?disabled=${!boostActive || !config.entities.cancel_boost}
              @click=${() => this._press(hass, config.entities.cancel_boost)}
            >
              Cancel
            </button>
          </div>
        </div>
        <div class="control-block">
          <span>Override</span>
          <strong>${this._value(snapshot.override_duration) ?? 'Until next schedule change'}</strong>
          <small>${this._value(snapshot.override_remaining) ?? '—'} remaining</small>
          <label class="field">
            <span>Duration</span>
            <select
              ?disabled=${!overrideEntity}
              aria-label="Override duration"
              @change=${(event: Event) => {
                const option = (event.currentTarget as HTMLSelectElement).value;
                if (overrideEntity) {
                  void this._call(hass, 'select', 'select_option', { entity_id: overrideEntity, option });
                }
              }}
            >
              ${overrideOptions.map(
                (option) => html`
                  <option .value=${option} ?selected=${this._state(snapshot.override_duration) === option}>
                    ${this._modeLabel(option)}
                  </option>
                `,
              )}
            </select>
          </label>
          <button
            type="button"
            aria-label="Clear override"
            ?disabled=${!config.entities.clear_override}
            @click=${() => this._press(hass, config.entities.clear_override)}
          >
            Clear override
          </button>
        </div>
      </aside>
    `;
  }

  private _infoTile(
    label: string,
    value: string,
    icon: string,
    status: HeatRecoveryResult['status'] | 'ok' = 'ok',
  ): TemplateResult {
    return html`
      <div class="info-tile tone-${status}">
        <ha-icon icon=${icon} aria-hidden="true"></ha-icon>
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  private _filterTile(snapshot: Partial<Record<EntityRoleId, RoleValue>>, config: HiperMvhrCardConfig): TemplateResult {
    const days = this._number(snapshot.filter_remaining);
    const percent = days === undefined ? 0 : Math.max(0, Math.min(100, (days / config.filter_max_days) * 100));
    const label = days === undefined ? '—' : `${Math.round(days)} days`;
    return html`
      <div class="info-tile">
        <ha-icon icon="mdi:air-filter" aria-hidden="true"></ha-icon>
        <span>Filter</span>
        <strong>${label}</strong>
        <div class="bar" aria-hidden="true"><span style=${`width:${percent}%`}></span></div>
      </div>
    `;
  }

  private _heatRecovery(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    method: HiperMvhrCardConfig['heat_recovery_method'],
  ): HeatRecoveryResult {
    return calculateHeatRecovery({
      outdoor: this._number(snapshot.outdoor_air_temp),
      extract: this._number(snapshot.extract_air_temp),
      supply: this._number(snapshot.supply_air_temp),
      method,
    });
  }

  private _pair(
    roles: Array<[EntityRoleId, string]>,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
  ): string {
    return roles
      .map(([role, label]) => `${label.replace(' fan', '')}: ${this._value(snapshot[role]) ?? '—'}`)
      .join(' · ');
  }

  private _value(value: RoleValue | undefined, detailed = false): string | null {
    if (!value) {
      return null;
    }
    const presentation = this._present(value, detailed);
    return presentation?.text ?? null;
  }

  private _text(value: RoleValue | undefined): string {
    return this._value(value) ?? '';
  }

  private _state(value: RoleValue | undefined): string | undefined {
    return value?.status === 'ok' ? value.value : undefined;
  }

  private _number(value: RoleValue | undefined): number | undefined {
    return value?.status === 'ok' ? value.numericValue : undefined;
  }

  private _modeLabel(value: string): string {
    const normalized = value.toLowerCase();
    if (normalized === 'medium' || normalized === 'normal') {
      return 'Home';
    }
    if (normalized === 'boost') {
      return 'Boost';
    }
    return value ? capitalize(value) : '';
  }

  private _modeOptions(value: RoleValue | undefined): string[] {
    const options =
      value?.status === 'ok' && Array.isArray(value.attributes.options)
        ? value.attributes.options.filter((option): option is string => typeof option === 'string')
        : ['Away', 'Low', 'Home', 'High'];
    return options.filter((option) => option.toLowerCase() !== 'boost');
  }

  private _selectOptions(value: RoleValue | undefined): string[] {
    return value?.status === 'ok' && Array.isArray(value.attributes.options)
      ? value.attributes.options.filter((option): option is string => typeof option === 'string')
      : [];
  }

  private _hasControls(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): boolean {
    return [
      snapshot.mode,
      snapshot.boost_duration,
      snapshot.start_boost,
      snapshot.cancel_boost,
      snapshot.override_duration,
      snapshot.clear_override,
    ].some((value) => value?.status === 'ok' && Boolean(config.entities));
  }

  private _systemStatus(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    availability: AvailabilitySummary,
  ): string {
    const calibrationStatus = snapshot.calibration_status?.status === 'ok' ? snapshot.calibration_status.value : '';
    if (
      calibrationStatus &&
      !['calibrated', 'complete', 'completed', 'idle', 'none', 'unknown'].includes(calibrationStatus)
    ) {
      return 'Calibration running';
    }
    if (snapshot.calibration_result?.status === 'ok' && snapshot.calibration_result.value === 'not_calibrated') {
      return 'Calibration required';
    }
    if (availability.tone === 'warning') {
      return 'Entity unavailable';
    }
    return availability.label === 'Not configured' ? 'Not configured' : 'System OK';
  }

  private _press(hass: HomeAssistant, entityId: string | undefined): void {
    if (!entityId) {
      return;
    }
    void this._call(hass, 'button', 'press', { entity_id: entityId });
  }

  private async _call(
    hass: HomeAssistant,
    domain: string,
    service: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await hass.callService?.(domain, service, data);
  }

  static styles = css`
    :host {
      display: block;
    }

    .header {
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .title {
      margin: 0;
      font-size: 1.2em;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .subheader {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .sep {
      margin: 0 4px;
    }
    .availability {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
      margin-top: 2px;
    }
    .availability ha-icon {
      --mdc-icon-size: 16px;
    }
    /* Tone classes are scoped to .availability explicitly — metric/status
       rows below reuse the same tone-* class names but only ever color
       their .metric-value/.status-value text, never the label or icon,
       so labels stay legible and consistent regardless of tone. */
    .availability.tone-success {
      color: var(--success-color);
    }
    .availability.tone-warning {
      color: var(--warning-color);
    }
    .availability.tone-muted {
      color: var(--secondary-text-color);
    }

    .content {
      padding: 0 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dashboard {
      padding: 0 16px 16px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 0.38fr);
      gap: 16px;
    }
    .visual-panel {
      min-width: 0;
      border: 1px solid var(--divider-color);
      border-radius: 14px;
      background:
        linear-gradient(145deg, rgba(40, 90, 130, 0.14), transparent),
        var(--ha-card-background, var(--card-background-color));
      padding: 14px;
    }
    .visual-wrap {
      min-height: 310px;
      display: grid;
      grid-template-columns: 1fr minmax(180px, 0.85fr) 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 14px;
      align-items: center;
    }
    .unit {
      grid-column: 2;
      grid-row: 1 / span 2;
      min-height: 190px;
      border-radius: 18px;
      border: 1px solid var(--divider-color);
      background: linear-gradient(155deg, rgba(255, 255, 255, 0.16), rgba(128, 128, 128, 0.08));
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      color: var(--primary-text-color);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    .brand {
      position: absolute;
      top: 16px;
      left: 18px;
      font-weight: 700;
      line-height: 1.05;
    }
    .brand span {
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .exchanger {
      width: 74px;
      height: 74px;
      transform: rotate(45deg);
      border: 2px solid var(--primary-color);
      background:
        linear-gradient(90deg, transparent 45%, var(--divider-color) 45% 55%, transparent 55%),
        linear-gradient(0deg, transparent 45%, var(--divider-color) 45% 55%, transparent 55%);
      opacity: 0.8;
    }
    .fan {
      position: absolute;
      color: var(--secondary-text-color);
      font-size: 24px;
    }
    .fan-a {
      right: 22px;
      top: 34px;
    }
    .fan-b {
      left: 24px;
      bottom: 34px;
    }
    .air-path {
      border-radius: 12px;
      padding: 12px;
      min-height: 78px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      border: 1px solid color-mix(in srgb, var(--divider-color), transparent 20%);
      position: relative;
      overflow: hidden;
    }
    .air-path::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(90deg, transparent 0 16px, rgba(255, 255, 255, 0.18) 16px 20px);
      opacity: 0.18;
      transform: translateX(-20px);
    }
    .air-path.active::after {
      animation: flow 1.8s linear infinite;
    }
    .extract {
      background: color-mix(in srgb, var(--error-color), transparent 82%);
    }
    .exhaust {
      background: color-mix(in srgb, #ff9800, transparent 84%);
    }
    .outdoor {
      background: color-mix(in srgb, #009688, transparent 84%);
    }
    .supply {
      background: color-mix(in srgb, var(--primary-color), transparent 84%);
    }
    .path-label,
    .path-airflow {
      color: var(--secondary-text-color);
      font-size: 0.78em;
      z-index: 1;
    }
    .path-temp {
      color: var(--primary-text-color);
      font-size: 1.2em;
      font-weight: 700;
      z-index: 1;
    }
    .controls-panel {
      border: 1px solid var(--divider-color);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: color-mix(in srgb, var(--ha-card-background, var(--card-background-color)), var(--primary-color) 4%);
    }
    .panel-heading {
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .mode-buttons,
    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip,
    .controls-panel button {
      font: inherit;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      padding: 7px 12px;
      cursor: pointer;
    }
    .chip:focus-visible,
    .controls-panel button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .chip:disabled,
    .controls-panel button:disabled {
      cursor: default;
      color: var(--secondary-text-color);
      opacity: 0.6;
    }
    .control-block {
      display: grid;
      gap: 6px;
      color: var(--primary-text-color);
    }
    .control-block small {
      color: var(--secondary-text-color);
    }
    .field {
      display: grid;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .field input,
    .field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      padding: 7px 9px;
      font: inherit;
      font-size: 1.12em;
    }
    .field input:focus-visible,
    .field select:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .field input:disabled,
    .field select:disabled {
      opacity: 0.6;
    }
    .tile-grid {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 12px;
    }
    .info-tile {
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 12px;
      display: grid;
      gap: 4px;
      color: var(--primary-text-color);
      min-width: 0;
    }
    .info-tile ha-icon {
      color: var(--primary-color);
    }
    .info-tile span {
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .info-tile strong {
      font-size: 1.08em;
      word-break: break-word;
    }
    .info-tile.tone-unavailable strong,
    .info-tile.tone-not_applicable strong,
    .info-tile.tone-calculating strong {
      color: var(--secondary-text-color);
    }
    .bar {
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--divider-color), transparent 20%);
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      background: var(--success-color);
    }
    .status-strip {
      grid-column: 1 / -1;
      border-top: 1px solid var(--divider-color);
      padding-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }

    @keyframes flow {
      to {
        transform: translateX(20px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .air-path.active::after {
        animation: none;
      }
    }

    section h3 {
      margin: 0 0 8px;
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 12px;
    }
    .metric {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .metric-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .metric-label {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .metric-value {
      font-size: 1em;
      color: var(--primary-text-color);
      word-break: break-word;
    }
    .metric.tone-muted .metric-value {
      color: var(--secondary-text-color);
    }
    .metric.tone-warning .metric-value {
      color: var(--warning-color);
    }

    .status-list {
      display: flex;
      flex-direction: column;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--divider-color);
      font-size: 0.95em;
      color: var(--primary-text-color);
    }
    .status-row:last-child {
      border-bottom: none;
    }
    .status-label {
      flex: 1;
      min-width: 0;
    }
    .status-value {
      text-align: right;
      word-break: break-word;
      max-width: 60%;
    }
    .status-row.tone-muted .status-value {
      color: var(--secondary-text-color);
    }
    .status-row.tone-warning .status-value {
      color: var(--warning-color);
    }
    /* Used only by an action row's own error state (e.g. filter reset
       failed) — the row itself carries no overall tone, unlike the
       value-role rows above, so this is scoped to the value span directly. */
    .status-value.tone-warning {
      color: var(--warning-color);
      font-size: 0.85em;
    }

    .control-button {
      font: inherit;
      font-size: 0.85em;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .control-button:disabled {
      color: var(--secondary-text-color);
      border-color: var(--divider-color);
      cursor: default;
    }
    .control-button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .error {
      padding: 16px;
      color: var(--error-color);
    }

    @media (max-width: 360px) {
      .metric-grid {
        grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      }
      .header,
      .content {
        padding-left: 12px;
        padding-right: 12px;
      }
    }

    @media (max-width: 760px) {
      .dashboard {
        grid-template-columns: 1fr;
      }
      .visual-wrap {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
      }
      .unit {
        grid-column: auto;
        grid-row: auto;
        min-height: 150px;
      }
      .tile-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;
}

// Defined manually (no @customElement decorator) and guarded so that a Vite
// dev-server hot reload re-evaluating this module doesn't throw
// "this name has already been used with this registry".
if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, HiperMvhrCard);
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
  interface HTMLElementTagNameMap {
    'hiper-mvhr-card': HiperMvhrCard;
  }
}

// Home Assistant's card picker reads window.customCards to list custom
// cards. Guarded the same way as the element registration above.
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'HiPer MVHR Card',
    description: 'Universal MVHR dashboard card for Home Assistant',
  });
}
