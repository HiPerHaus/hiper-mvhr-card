import { LitElement, css, html, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HiperMvhrCardConfig } from '../types/config';
import { MANUFACTURER_IDS } from '../manufacturers';
import type { HomeAssistant } from '../types/hass';

const EDITOR_TAG = 'hiper-mvhr-card-editor';

export class HiperMvhrCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: Partial<HiperMvhrCardConfig>;

  setConfig(config: Partial<HiperMvhrCardConfig>): void {
    this._config = { ...config };
  }

  protected render(): TemplateResult {
    const config = this._config ?? {};
    return html`
      <div class="editor">
        ${this._textField('Title', 'title', config.title)}
        ${this._textField('Subtitle', 'subtitle', config.subtitle)}
        <label>
          <span>Manufacturer</span>
          <select
            .value=${config.manufacturer ?? 'generic'}
            @change=${(event: Event) => this._set('manufacturer', (event.currentTarget as HTMLSelectElement).value)}
          >
            ${MANUFACTURER_IDS.map(
              (manufacturer) => html`<option .value=${manufacturer}>${manufacturer}</option>`,
            )}
          </select>
        </label>
        <label>
          <span>Display mode</span>
          <select
            .value=${config.display_mode ?? 'homeowner'}
            @change=${(event: Event) => this._set('display_mode', (event.currentTarget as HTMLSelectElement).value)}
          >
            <option value="homeowner">homeowner</option>
            <option value="detailed">detailed</option>
            <option value="system">system</option>
          </select>
        </label>
        <label>
          <span>Heat recovery</span>
          <select
            .value=${config.heat_recovery_method ?? 'automatic'}
            @change=${(event: Event) =>
              this._set('heat_recovery_method', (event.currentTarget as HTMLSelectElement).value)}
          >
            <option value="automatic">automatic</option>
            <option value="supply_temperature">supply_temperature</option>
            <option value="disabled">disabled</option>
          </select>
        </label>
        <label>
          <span>Filter max days</span>
          <input
            type="number"
            min="1"
            step="1"
            .value=${String(config.filter_max_days ?? 365)}
            @change=${(event: Event) =>
              this._set('filter_max_days', Number((event.currentTarget as HTMLInputElement).value))}
          />
        </label>
        <div class="toggles">
          ${this._checkbox('Show controls', 'show_controls', config.show_controls !== false)}
          ${this._checkbox('Show fan speeds', 'show_fan_speeds', config.show_fan_speeds !== false)}
          ${this._checkbox('Show filter', 'show_filter', config.show_filter !== false)}
          ${this._checkbox('Show calibration', 'show_calibration', config.show_calibration !== false)}
          ${this._checkbox(
            'Airflow on all paths',
            'show_airflow_on_all_paths',
            config.show_airflow_on_all_paths === true,
          )}
          ${this._checkbox(
            'Show airflow animation (system mode)',
            'show_airflow_animation',
            config.show_airflow_animation !== false,
          )}
          ${this._checkbox(
            'Show advanced controls (system mode)',
            'show_advanced_controls',
            config.show_advanced_controls !== false,
          )}
        </div>
      </div>
    `;
  }

  private _textField(
    label: string,
    key: keyof HiperMvhrCardConfig,
    value: string | undefined,
  ): TemplateResult {
    return html`
      <label>
        <span>${label}</span>
        <input
          .value=${value ?? ''}
          @input=${(event: Event) => this._set(key, (event.currentTarget as HTMLInputElement).value)}
        />
      </label>
    `;
  }

  private _checkbox(
    label: string,
    key: keyof HiperMvhrCardConfig,
    checked: boolean,
  ): TemplateResult {
    return html`
      <label class="check">
        <input
          type="checkbox"
          .checked=${checked}
          @change=${(event: Event) => this._set(key, (event.currentTarget as HTMLInputElement).checked)}
        />
        <span>${label}</span>
      </label>
    `;
  }

  private _set(key: keyof HiperMvhrCardConfig, value: unknown): void {
    const config = { ...(this._config ?? {}), [key]: value };
    this._config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    .editor {
      display: grid;
      gap: 12px;
      padding: 8px 0;
    }
    label {
      display: grid;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    input,
    select {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
      font: inherit;
    }
    .toggles {
      display: grid;
      gap: 8px;
    }
    .check {
      grid-template-columns: auto 1fr;
      align-items: center;
    }
    .check input {
      width: auto;
    }
  `;
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, HiperMvhrCardEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    'hiper-mvhr-card-editor': HiperMvhrCardEditor;
  }
}
