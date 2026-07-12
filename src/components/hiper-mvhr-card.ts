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

const STATUS_ROLES: Array<[EntityRoleId, string]> = [
  ['bypass_state', 'Summer bypass'],
  ['filter_remaining', 'Filter'],
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

    return html`
      <ha-card>
        <div class="header">
          <h2 class="title">${config.name ?? 'HiPer MVHR Card'}</h2>
          <div class="subheader">
            <span class="model">${displayProfile.name}</span>
            ${modePresentation
              ? html`
                  <span class="sep" aria-hidden="true">·</span>
                  <span class="mode">
                    ${modePresentation.tone === 'normal'
                      ? capitalize(modePresentation.text)
                      : modePresentation.text}
                  </span>
                `
              : ''}
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
