import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCard } from '../types/hass';
import type { HiperMvhrCardConfig } from '../types/config';
import type { RoleValue } from '../types/snapshot';
import { parseConfig } from '../data/config-schema';
import { resolveCapabilities } from '../data/capability-resolver';
import { resolveSnapshot } from '../data/entity-resolver';
import { getProfile } from '../manufacturers';
import { formatRoleValue } from '../utils/format';

const CARD_TAG = 'hiper-mvhr-card';

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

  static getStubConfig(): Partial<HiperMvhrCardConfig> {
    return {
      manufacturer: 'generic',
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
    return 3;
  }

  protected render(): TemplateResult {
    if (this._configError) {
      return html`<ha-card><div class="error">${this._configError}</div></ha-card>`;
    }
    if (!this._config || !this.hass) {
      return html``;
    }

    const config = this._config;
    const hass = this.hass;
    const profile = resolveCapabilities(config.manufacturer, config.feature_flags);
    const displayProfile = getProfile(config.manufacturer);
    const snapshot = resolveSnapshot(hass, profile, config.entities);

    return html`
      <ha-card .header=${config.name ?? displayProfile.name}>
        <div class="content">
          <div class="subtitle">${displayProfile.vendor} · ${displayProfile.name}</div>
          ${this._row('Status', snapshot.mode)}
          ${this._row('Outdoor', snapshot.outdoor_air_temp)}
          ${this._row('Supply', snapshot.supply_air_temp)}
          ${this._row('Extract', snapshot.extract_air_temp)}
          ${this._row('Exhaust', snapshot.exhaust_air_temp)}
          ${this._row('Supply airflow', snapshot.supply_airflow)}
          ${this._row('Extract airflow', snapshot.extract_airflow)}
          ${this._row('Bypass', snapshot.bypass_state)}
        </div>
      </ha-card>
    `;
  }

  /** Renders nothing at all for an unsupported role — not even a "muted" row. */
  private _row(label: string, value?: RoleValue): TemplateResult {
    if (!value || value.status === 'unsupported') {
      return html``;
    }
    const muted = value.status !== 'ok';
    return html`
      <div class="row ${muted ? 'muted' : ''}">
        <span>${label}</span>
        <span>${formatRoleValue(value)}</span>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .content {
      padding: 0 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .subtitle {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      margin-bottom: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      font-size: 0.95em;
      color: var(--primary-text-color);
    }
    .row:last-child {
      border-bottom: none;
    }
    .row.muted {
      color: var(--secondary-text-color);
    }
    .error {
      padding: 16px;
      color: var(--error-color, #db4437);
    }
    @media (max-width: 400px) {
      .row {
        font-size: 0.85em;
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
