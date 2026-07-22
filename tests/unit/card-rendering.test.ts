import { describe, it, expect, vi, afterEach } from 'vitest';
import { HiperMvhrCard } from '../../src/components/hiper-mvhr-card';
import { altairHass } from '../fixtures/hass-altair-160';
import { zehnderHass } from '../fixtures/hass-zehnder-comfoair-q';
import { aerofreshHass } from '../fixtures/hass-aerofresh';
import { genericHass } from '../fixtures/hass-generic';
import type { HomeAssistant } from '../../src/types/hass';
import type { EntityRoleId } from '../../src/types/entity-roles';

function mount(): HiperMvhrCard {
  const el = document.createElement('hiper-mvhr-card') as HiperMvhrCard;
  document.body.appendChild(el);
  return el;
}

/**
 * setConfig's real parameter type is Record<string, unknown> — config-schema.ts
 * validates the actual shape at runtime, not the TS type system — so this
 * helper deliberately doesn't narrow to HiperMvhrCardConfig. Several tests
 * below intentionally pass invalid values (e.g. an unknown manufacturer) to
 * exercise that runtime validation, which a narrower type would reject at
 * compile time.
 */
function set(el: HiperMvhrCard, config: Record<string, unknown>): void {
  el.setConfig(config);
}

describe('hiper-mvhr-card', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registers the custom element, and the registration guard is doing real work', () => {
    expect(customElements.get('hiper-mvhr-card')).toBeDefined();
    expect(HiperMvhrCard.getConfigElement().tagName.toLowerCase()).toBe('hiper-mvhr-card-editor');

    // This is what would happen on a Vite dev-server hot reload without the
    // `if (!customElements.get(...))` guard in hiper-mvhr-card.ts — the
    // browser itself throws on a second define() for the same tag. Proves
    // the guard is necessary, not just decorative.
    expect(() => customElements.define('hiper-mvhr-card', class extends HTMLElement {})).toThrow();
  });

  it('shows a validation error instead of throwing for invalid config', async () => {
    const el = mount();
    expect(() => set(el, { manufacturer: 'not-a-real-brand' })).not.toThrow();
    el.hass = altairHass;
    await el.updateComplete;
    expect(el.shadowRoot?.textContent).toMatch(/unknown manufacturer/i);
  });

  it('renders no user-visible content and no ha-card before hass/config are set', async () => {
    const el = mount();
    await el.updateComplete;

    const shadow = el.shadowRoot;
    expect(shadow).toBeTruthy();

    // render() returns `html``` here (see hiper-mvhr-card.ts), and Lit keeps
    // an internal marker node in the DOM for that empty ChildPart so it has
    // a stable anchor to diff future renders against. That marker is not
    // user content — asserting on raw shadowRoot.textContent conflates the
    // two, and happy-dom's textContent doesn't exclude marker/comment nodes
    // the way real browsers do, so it leaks through as literal text (e.g.
    // "<?>") instead of being invisible the way a Comment node's data is
    // meant to be. Check what actually matters instead: no ha-card element,
    // and no Text node holds any visible characters.
    expect(shadow?.querySelector('ha-card')).toBeNull();

    const visibleText = Array.from(shadow?.childNodes ?? [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    expect(visibleText).toBe('');
  });

  describe('four-temperature and airflow rendering', () => {
    it('renders all four configured temperatures and both airflows for Altair', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'altair',
        display_mode: 'homeowner',
        entities: {
          outdoor_air_temp: 'sensor.altair_outdoor_temp',
          supply_air_temp: 'sensor.altair_supply_temp',
          extract_air_temp: 'sensor.altair_extract_temp',
          exhaust_air_temp: 'sensor.altair_exhaust_temp',
          supply_airflow: 'sensor.altair_supply_flow',
          extract_airflow: 'sensor.altair_extract_flow',
        },
      });
      el.hass = altairHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).toContain('Outdoor air');
      expect(text).toContain('Supply air');
      expect(text).toContain('Extract air');
      expect(text).toContain('Exhaust air');
      expect(text).toContain('8.2');
      expect(text).toContain('19.4');
      expect(text).toContain('21.1');
      expect(text).toContain('10.6');
      expect(text).toContain('Supply airflow');
      expect(text).toContain('Extract airflow');
      expect(text).toContain('145');
      expect(text).toContain('150');
    });
  });

  describe('Altair — no bypass, ever', () => {
    it('never renders a bypass control, status, or placeholder, in either display mode', async () => {
      for (const display_mode of ['homeowner', 'detailed'] as const) {
        const el = mount();
        set(el, {
          manufacturer: 'altair',
          display_mode,
          entities: { bypass_state: 'binary_sensor.doesnt_exist' },
        });
        el.hass = altairHass;
        await el.updateComplete;

        expect((el.shadowRoot?.textContent ?? '').toLowerCase()).not.toContain('bypass');
        el.remove();
      }
    });
  });

  describe('Altair dashboard concept', () => {
    const altairDashboardEntities = {
      mode: 'select.altair_mvhr_mode',
      effective_mode: 'sensor.altair_mvhr_effective_mode',
      airflow: 'sensor.altair_mvhr_airflow',
      target_airflow: 'sensor.altair_mvhr_target_airflow',
      mapped_level: 'sensor.altair_mvhr_mapped_airflow_level',
      supply_temperature: 'sensor.altair_mvhr_supply_air_temperature',
      extract_temperature: 'sensor.altair_mvhr_extract_air_temperature',
      outdoor_temperature: 'sensor.altair_mvhr_outdoor_air_temperature',
      exhaust_temperature: 'sensor.altair_mvhr_exhaust_air_temperature',
      supply_fan_speed: 'sensor.altair_mvhr_supply_fan_speed',
      extract_fan_speed: 'sensor.altair_mvhr_extract_fan_speed',
      indoor_humidity: 'sensor.altair_mvhr_indoor_humidity',
      filter_days: 'sensor.altair_mvhr_filter_days_remaining',
      boost_active: 'binary_sensor.altair_mvhr_boost_active',
      boost_remaining: 'sensor.altair_mvhr_boost_remaining',
      boost_duration: 'number.altair_mvhr_boost_duration',
      start_boost: 'button.altair_mvhr_start_boost',
      cancel_boost: 'button.altair_mvhr_cancel_boost',
      override_duration: 'select.altair_mvhr_override_duration',
      clear_override: 'button.altair_mvhr_clear_override',
      calibration_result: 'sensor.altair_mvhr_airflow_calibration_result',
      calibration_status: 'sensor.altair_mvhr_airflow_calibration_status',
      last_calibration: 'sensor.altair_mvhr_last_airflow_calibration',
    };

    function mountAltairDashboard(
      callService = vi.fn().mockResolvedValue(undefined),
    ): HiperMvhrCard {
      const el = mount();
      set(el, {
        type: 'custom:hiper-mvhr-card',
        title: 'Altair MVHR',
        manufacturer: 'altair',
        display_mode: 'detailed',
        entities: altairDashboardEntities,
      });
      el.hass = { ...altairHass, callService };
      return el;
    }

    it('renders four airflow paths, the real Altair values, and Home instead of medium', async () => {
      const el = mountAltairDashboard();
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(el.shadowRoot?.querySelectorAll('.air-path')).toHaveLength(4);
      expect(text).toContain('Extract air');
      expect(text).toContain('Exhaust air');
      expect(text).toContain('Outdoor air');
      expect(text).toContain('Supply air');
      expect(text).toContain('95 m³/h');
      expect(text).toContain('Mapped level');
      expect(text).toContain('4');
      expect(text).toContain('83%');
      expect(text).toContain('1476 rpm');
      expect(text).toContain('1500 rpm');
      expect(text).toContain('56 %');
      expect(text).toContain('353 days');
      expect(text).toContain('Home');
      expect(text).not.toContain('medium');
      expect(text.toLowerCase()).not.toContain('bypass');
    });

    it('sends the internal medium option when the visible Home mode button is pressed', async () => {
      const callService = vi.fn().mockResolvedValue(undefined);
      const el = mountAltairDashboard(callService);
      await el.updateComplete;

      const homeButton = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
        (button) => button.textContent?.trim() === 'Home',
      );
      homeButton?.click();

      expect(callService).toHaveBeenCalledWith('select', 'select_option', {
        entity_id: 'select.altair_mvhr_mode',
        option: 'medium',
      });
    });

    it('calls the documented Home Assistant services for boost and override controls', async () => {
      const callService = vi.fn().mockResolvedValue(undefined);
      const el = mountAltairDashboard(callService);
      await el.updateComplete;

      (
        el.shadowRoot?.querySelector('input[aria-label="Boost duration"]') as HTMLInputElement
      ).value = '30';
      el.shadowRoot
        ?.querySelector('input[aria-label="Boost duration"]')
        ?.dispatchEvent(new Event('change'));
      (
        el.shadowRoot?.querySelector('button[aria-label="Start Boost"]') as HTMLButtonElement
      ).click();
      el.shadowRoot
        ?.querySelector('select[aria-label="Override duration"]')
        ?.dispatchEvent(new Event('change'));
      (
        el.shadowRoot?.querySelector('button[aria-label="Clear override"]') as HTMLButtonElement
      ).click();

      expect(callService).toHaveBeenCalledWith('number', 'set_value', {
        entity_id: 'number.altair_mvhr_boost_duration',
        value: 30,
      });
      expect(callService).toHaveBeenCalledWith('button', 'press', {
        entity_id: 'button.altair_mvhr_start_boost',
      });
      expect(callService).toHaveBeenCalledWith('select', 'select_option', {
        entity_id: 'select.altair_mvhr_override_duration',
        option: 'until_next_schedule_change',
      });
      expect(callService).toHaveBeenCalledWith('button', 'press', {
        entity_id: 'button.altair_mvhr_clear_override',
      });
    });
  });

  describe('Zehnder — bypass rendered when configured', () => {
    it('shows the bypass row and its value when mapped', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'zehnder-comfoair-q',
        display_mode: 'homeowner',
        entities: { bypass_state: 'binary_sensor.comfoair_bypass' },
      });
      el.hass = zehnderHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).toMatch(/bypass/i);
      expect(text).toContain('on');
    });
  });

  describe('Aerofresh branding', () => {
    it('shows "Aerofresh" and never mentions the internal Vent-Axia platform id', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'vent_axia_sentinel_econiq',
        display_mode: 'detailed',
        entities: {
          supply_air_temp: 'sensor.aerofresh_supply_temp',
          bypass_state: 'binary_sensor.aerofresh_bypass',
        },
      });
      el.hass = aerofreshHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).toContain('Aerofresh');
      const lower = text.toLowerCase();
      expect(lower).not.toContain('vent-axia');
      expect(lower).not.toContain('vent_axia');
      expect(lower).not.toContain('sentinel');
      expect(lower).not.toContain('econiq');
    });
  });

  describe('valid zero values', () => {
    it('displays a literal zero reading as a value, not as unavailable', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'zehnder-comfoair-q',
        display_mode: 'homeowner',
        entities: { filter_remaining: 'sensor.comfoair_filter_remaining' },
      });
      el.hass = zehnderHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).toContain('Filter');
      expect(text).toContain('0 %');
      // A zero reading must never be swallowed into the "Unavailable" label.
      expect(text).not.toMatch(/Filter[^a-zA-Z0-9]*Unavailable/);
    });
  });

  describe('unavailable and unknown states', () => {
    it('shows "Unavailable" for both the "unavailable" and "unknown" HA states', async () => {
      for (const state of ['unavailable', 'unknown']) {
        const el = mount();
        const hass = {
          states: {
            ...altairHass.states,
            'sensor.altair_supply_temp': {
              entity_id: 'sensor.altair_supply_temp',
              state,
              attributes: {},
            },
          },
        };
        set(el, {
          manufacturer: 'altair',
          display_mode: 'homeowner',
          entities: { supply_air_temp: 'sensor.altair_supply_temp' },
        });
        el.hass = hass;
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).toMatch(/unavailable/i);
        el.remove();
      }
    });
  });

  describe('configured but missing entities', () => {
    it('homeowner mode shows a quiet "Unavailable", no entity id, no configuration jargon', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'altair',
        display_mode: 'homeowner',
        entities: { supply_air_temp: 'sensor.totally_made_up' },
      });
      el.hass = altairHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).toMatch(/unavailable/i);
      expect(text).not.toContain('sensor.totally_made_up');
    });

    it('detailed mode shows an explicit configuration warning naming the missing entity', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'altair',
        display_mode: 'detailed',
        entities: { supply_air_temp: 'sensor.totally_made_up' },
      });
      el.hass = altairHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).toContain('sensor.totally_made_up');
      expect(text.toLowerCase()).toContain('not found');
    });
  });

  describe('unsupported roles are omitted entirely', () => {
    it('a manufacturer with nothing configured/supported renders no section headings', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'homeowner',
        entities: {},
      });
      el.hass = { states: {} };
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(text).not.toContain('Temperatures');
      expect(text).not.toContain('Airflow');
      expect(text).not.toContain('System status');
    });
  });

  describe('display modes', () => {
    it('homeowner omits a supported-but-unconfigured role entirely (no "Not configured" text)', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'altair',
        display_mode: 'homeowner',
        entities: {}, // nothing mapped, but altair supports all these roles
      });
      el.hass = altairHass;
      await el.updateComplete;

      expect(el.shadowRoot?.textContent).not.toMatch(/not configured/i);
    });

    it('detailed shows "Not configured" for a supported role with no mapped entity', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'altair',
        display_mode: 'detailed',
        entities: {},
      });
      el.hass = altairHass;
      await el.updateComplete;

      expect(el.shadowRoot?.textContent).toMatch(/not configured/i);
    });
  });

  describe('narrow-card responsive structure', () => {
    it('lays temperatures out in a wrapping CSS grid with a narrow-width media query', () => {
      const cssText = HiperMvhrCard.styles.cssText;
      // happy-dom has no layout engine, so actual pixel wrapping can't be
      // measured here — this checks the structural mechanism that produces
      // responsive wrapping (an auto-fit/minmax grid plus a narrow-width
      // media query) is actually present in the stylesheet, which is what a
      // unit test can honestly verify without a real browser viewport.
      expect(cssText).toMatch(/grid-template-columns:\s*repeat\(auto-fit/);
      expect(cssText).toMatch(/@media[^{]*max-width/);
    });

    it('never sets a fixed height on the card host', () => {
      const cssText = HiperMvhrCard.styles.cssText;
      const hostBlock = cssText.match(/:host\s*{[^}]*}/)?.[0] ?? '';
      expect(hostBlock).not.toMatch(/height:\s*\d/);
    });
  });

  /**
   * Phase 3A: the first interactive control. filter_reset_control is a
   * fire-and-forget action (no target value, no reconciliation — see
   * src/data/control-dispatcher.ts) and is only enabled today via the
   * generic profile's feature flags — Altair/Zehnder/Aerofresh don't declare
   * it supported by default because filter resettability is still TBD for
   * all three (docs/manufacturers/*.md). Mode selector and bypass override
   * controls are Phase 3B/3C and not tested here because they don't exist yet.
   */
  describe('filter reset control (Phase 3A)', () => {
    function hassWithCallService(impl: (...args: unknown[]) => Promise<unknown>): HomeAssistant {
      return {
        ...genericHass,
        callService: impl as HomeAssistant['callService'],
      };
    }

    it('renders a labeled, native button when supported, configured, and available', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'homeowner',
        feature_flags: { filter_reset_control: true },
        entities: { filter_reset_control: 'button.mvhr_filter_reset' },
      });
      el.hass = hassWithCallService(vi.fn().mockResolvedValue(undefined));
      await el.updateComplete;

      const button = el.shadowRoot?.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('type')).toBe('button');
      expect(button?.getAttribute('aria-label')?.toLowerCase()).toContain('filter');
      expect(button?.disabled).toBe(false);
    });

    it('calls hass.callService with the service derived from the entity id domain on click', async () => {
      const callService = vi.fn().mockResolvedValue(undefined);
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'homeowner',
        feature_flags: { filter_reset_control: true },
        entities: { filter_reset_control: 'button.mvhr_filter_reset' },
      });
      el.hass = hassWithCallService(callService);
      await el.updateComplete;

      el.shadowRoot?.querySelector('button')?.click();
      await el.updateComplete;

      expect(callService).toHaveBeenCalledWith('button', 'press', {
        entity_id: 'button.mvhr_filter_reset',
      });
    });

    it('disables the button and shows a pending state while the call is in flight', async () => {
      let resolveCall!: () => void;
      const callService = vi.fn(() => new Promise<void>((resolve) => (resolveCall = resolve)));
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'homeowner',
        feature_flags: { filter_reset_control: true },
        entities: { filter_reset_control: 'button.mvhr_filter_reset' },
      });
      el.hass = hassWithCallService(callService);
      await el.updateComplete;

      el.shadowRoot?.querySelector('button')?.click();
      await el.updateComplete;

      const button = el.shadowRoot?.querySelector('button');
      expect(button?.disabled).toBe(true);

      resolveCall();
      await new Promise((r) => setTimeout(r, 0));
      await el.updateComplete;

      expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(false);
    });

    it('homeowner mode omits the control entirely when not configured', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'homeowner',
        feature_flags: { filter_reset_control: true },
        entities: {},
      });
      el.hass = genericHass;
      await el.updateComplete;

      expect(el.shadowRoot?.querySelector('button')).toBeNull();
      expect(el.shadowRoot?.textContent ?? '').not.toMatch(/not configured/i);
    });

    it('detailed mode shows a muted "Not configured" row instead of a button when not configured', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'detailed',
        feature_flags: { filter_reset_control: true },
        entities: {},
      });
      el.hass = genericHass;
      await el.updateComplete;

      expect(el.shadowRoot?.querySelector('button')).toBeNull();
      expect(el.shadowRoot?.textContent ?? '').toMatch(/not configured/i);
    });

    it('homeowner mode shows a quiet "Unavailable" (no entity id, no button) for a missing entity', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'homeowner',
        feature_flags: { filter_reset_control: true },
        entities: { filter_reset_control: 'button.does_not_exist' },
      });
      el.hass = genericHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(el.shadowRoot?.querySelector('button')).toBeNull();
      expect(text).toMatch(/unavailable/i);
      expect(text).not.toContain('button.does_not_exist');
    });

    it('detailed mode names the missing entity instead of showing a button', async () => {
      const el = mount();
      set(el, {
        manufacturer: 'generic',
        display_mode: 'detailed',
        feature_flags: { filter_reset_control: true },
        entities: { filter_reset_control: 'button.does_not_exist' },
      });
      el.hass = genericHass;
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect(el.shadowRoot?.querySelector('button')).toBeNull();
      expect(text).toContain('button.does_not_exist');
      expect(text.toLowerCase()).toContain('not found');
    });

    it('is never rendered for a profile that has not declared it supported, in any display mode', async () => {
      for (const display_mode of ['homeowner', 'detailed'] as const) {
        const el = mount();
        set(el, {
          manufacturer: 'altair',
          display_mode,
          entities: { filter_reset_control: 'button.mvhr_filter_reset' },
        });
        el.hass = altairHass;
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('button')).toBeNull();
        el.remove();
      }
    });
  });

  /**
   * Rebuild of the detailed-mode dashboard (ROADMAP.md "Rebuild detailed
   * MVHR dashboard layout"): the old compact/diagnostic content
   * (`_legacyContent` — the Temperatures/Airflow/System status sections)
   * used to render unconditionally above the dashboard added in Phase 3,
   * which is exactly why the live card still looked like the old compact
   * card with a small dashboard bolted on underneath. `display_mode:
   * detailed` now renders `_dashboard` only; `display_mode: homeowner`
   * keeps the legacy compact content exactly as before (see the
   * describe blocks above, all still passing unmodified).
   */
  describe('detailed dashboard rebuild', () => {
    const altairDashboardEntities = {
      mode: 'select.altair_mvhr_mode',
      effective_mode: 'sensor.altair_mvhr_effective_mode',
      airflow: 'sensor.altair_mvhr_airflow',
      target_airflow: 'sensor.altair_mvhr_target_airflow',
      mapped_level: 'sensor.altair_mvhr_mapped_airflow_level',
      supply_temperature: 'sensor.altair_mvhr_supply_air_temperature',
      extract_temperature: 'sensor.altair_mvhr_extract_air_temperature',
      outdoor_temperature: 'sensor.altair_mvhr_outdoor_air_temperature',
      exhaust_temperature: 'sensor.altair_mvhr_exhaust_air_temperature',
      supply_fan_speed: 'sensor.altair_mvhr_supply_fan_speed',
      extract_fan_speed: 'sensor.altair_mvhr_extract_fan_speed',
      indoor_humidity: 'sensor.altair_mvhr_indoor_humidity',
      filter_days: 'sensor.altair_mvhr_filter_days_remaining',
      boost_active: 'binary_sensor.altair_mvhr_boost_active',
      boost_remaining: 'sensor.altair_mvhr_boost_remaining',
      boost_duration: 'number.altair_mvhr_boost_duration',
      start_boost: 'button.altair_mvhr_start_boost',
      cancel_boost: 'button.altair_mvhr_cancel_boost',
      override_duration: 'select.altair_mvhr_override_duration',
      clear_override: 'button.altair_mvhr_clear_override',
      calibration_result: 'sensor.altair_mvhr_airflow_calibration_result',
      calibration_status: 'sensor.altair_mvhr_airflow_calibration_status',
      last_calibration: 'sensor.altair_mvhr_last_airflow_calibration',
    };

    function mountAltairDashboard(hass: HomeAssistant = altairHass): HiperMvhrCard {
      const el = mount();
      set(el, {
        type: 'custom:hiper-mvhr-card',
        title: 'Altair MVHR',
        manufacturer: 'altair',
        display_mode: 'detailed',
        entities: altairDashboardEntities,
      });
      el.hass = hass;
      return el;
    }

    it('does not render the legacy compact sections in detailed mode', async () => {
      const el = mountAltairDashboard();
      await el.updateComplete;

      expect(el.shadowRoot?.querySelector('.content')).toBeNull();
      expect(el.shadowRoot?.querySelector('.metric-section')).toBeNull();
      expect(el.shadowRoot?.querySelector('.status-section:not(.extra-controls)')).toBeNull();
      const text = el.shadowRoot?.textContent ?? '';
      expect(text).not.toContain('Temperatures');
      expect(text).not.toContain('System status');
    });

    it('renders exactly one unified dashboard, starting with the header, not a second layout above it', async () => {
      const el = mountAltairDashboard();
      await el.updateComplete;

      expect(el.shadowRoot?.querySelectorAll('.mvhr-dashboard')).toHaveLength(1);
      expect(el.shadowRoot?.querySelector('.visual-panel')).toBeTruthy();
      expect(el.shadowRoot?.querySelector('.metrics-grid')).toBeTruthy();
      expect(el.shadowRoot?.querySelector('.status-strip')).toBeTruthy();

      // The header is the card's first rendered child, and the dashboard
      // immediately follows it — nothing else precedes the dashboard.
      const card = el.shadowRoot?.querySelector('ha-card');
      const children = Array.from(card?.children ?? []);
      expect(children[0]?.classList.contains('mvhr-header')).toBe(true);
      expect(children[1]?.classList.contains('mvhr-dashboard')).toBe(true);
      expect(children).toHaveLength(2);
    });

    it('does not warn at the top level when only optional fault/frost entities are unmapped', async () => {
      const el = mountAltairDashboard();
      await el.updateComplete;

      expect(el.shadowRoot?.querySelector('.status-dot.dot-warning')).toBeNull();
      const text = el.shadowRoot?.textContent ?? '';
      expect(text).not.toMatch(/configuration issue/i);
      expect(text).not.toMatch(/sensor(s)? unavailable/i);
    });

    it('shows a "Communication issue" status when a required, configured entity is unavailable', async () => {
      const el = mountAltairDashboard({
        ...altairHass,
        states: {
          ...altairHass.states,
          'sensor.altair_mvhr_supply_air_temperature': {
            entity_id: 'sensor.altair_mvhr_supply_air_temperature',
            state: 'unavailable',
            attributes: { unit_of_measurement: '°C' },
          },
        },
      });
      await el.updateComplete;

      expect(el.shadowRoot?.textContent).toMatch(/communication issue/i);
      expect(
        el.shadowRoot?.querySelector('.status-strip')?.classList.contains('tone-warning'),
      ).toBe(true);
    });

    it('renders the calibration reading exactly once', async () => {
      const el = mountAltairDashboard();
      await el.updateComplete;

      const text = el.shadowRoot?.textContent ?? '';
      expect((text.match(/Calibration:/g) ?? []).length).toBe(1);
    });

    it('renders the filter reading exactly once', async () => {
      const el = mountAltairDashboard();
      await el.updateComplete;

      expect(el.shadowRoot?.querySelectorAll('.bar')).toHaveLength(1);
      expect((el.shadowRoot?.textContent?.match(/353 days/g) ?? []).length).toBe(1);
    });

    it('the metrics grid uses a flexible auto-fit layout, never a fixed pixel width', () => {
      const cssText = HiperMvhrCard.styles.cssText;
      const metricsGridBlock = cssText.match(/\.metrics-grid\s*{[^}]*}/)?.[0] ?? '';
      expect(metricsGridBlock).toMatch(/grid-template-columns:\s*repeat\(auto-fit/);
      expect(metricsGridBlock).not.toMatch(/width:\s*\d+px/);
    });

    it('has an explicit mobile breakpoint that locks the metrics grid to 2 columns', () => {
      const cssText = HiperMvhrCard.styles.cssText;
      expect(cssText).toMatch(/@media[^{]*max-width:\s*599px/);
      expect(cssText).toMatch(/repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    });

    it('has a tablet breakpoint that stacks the dashboard into a single column', () => {
      const cssText = HiperMvhrCard.styles.cssText;
      expect(cssText).toMatch(/@media[^{]*max-width:\s*900px/);
    });

    describe('current live example values', () => {
      const liveStates: HomeAssistant['states'] = {
        'sensor.altair_mvhr_outdoor_air_temperature': {
          entity_id: 'sensor.altair_mvhr_outdoor_air_temperature',
          state: '6.5',
          attributes: { unit_of_measurement: '°C' },
        },
        'sensor.altair_mvhr_supply_air_temperature': {
          entity_id: 'sensor.altair_mvhr_supply_air_temperature',
          state: '17.9',
          attributes: { unit_of_measurement: '°C' },
        },
        'sensor.altair_mvhr_extract_air_temperature': {
          entity_id: 'sensor.altair_mvhr_extract_air_temperature',
          state: '20.1',
          attributes: { unit_of_measurement: '°C' },
        },
        'sensor.altair_mvhr_exhaust_air_temperature': {
          entity_id: 'sensor.altair_mvhr_exhaust_air_temperature',
          state: '10.9',
          attributes: { unit_of_measurement: '°C' },
        },
        'sensor.altair_mvhr_airflow': {
          entity_id: 'sensor.altair_mvhr_airflow',
          state: '95',
          attributes: { unit_of_measurement: 'm³/h' },
        },
        'sensor.altair_mvhr_target_airflow': {
          entity_id: 'sensor.altair_mvhr_target_airflow',
          state: '95',
          attributes: { unit_of_measurement: 'm³/h' },
        },
        'sensor.altair_mvhr_mapped_airflow_level': {
          entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
          state: '4',
          attributes: {},
        },
        'sensor.altair_mvhr_supply_fan_speed': {
          entity_id: 'sensor.altair_mvhr_supply_fan_speed',
          state: '1476',
          attributes: { unit_of_measurement: 'rpm' },
        },
        'sensor.altair_mvhr_extract_fan_speed': {
          entity_id: 'sensor.altair_mvhr_extract_fan_speed',
          state: '1512',
          attributes: { unit_of_measurement: 'rpm' },
        },
        'sensor.altair_mvhr_indoor_humidity': {
          entity_id: 'sensor.altair_mvhr_indoor_humidity',
          state: '55',
          attributes: { unit_of_measurement: '%' },
        },
        'sensor.altair_mvhr_filter_days_remaining': {
          entity_id: 'sensor.altair_mvhr_filter_days_remaining',
          state: '353',
          attributes: { unit_of_measurement: 'd' },
        },
        'select.altair_mvhr_mode': {
          entity_id: 'select.altair_mvhr_mode',
          state: 'medium',
          attributes: { options: ['away', 'low', 'medium', 'high'] },
        },
        'sensor.altair_mvhr_airflow_calibration_result': {
          entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
          state: 'calibrated',
          attributes: {},
        },
      };

      function mountLiveAltair(): HiperMvhrCard {
        return mountAltairDashboard({
          ...altairHass,
          states: { ...altairHass.states, ...liveStates },
        });
      }

      it('renders 84% heat recovery and Home instead of the confirmed live values\' raw "medium"', async () => {
        const el = mountLiveAltair();
        await el.updateComplete;

        const text = el.shadowRoot?.textContent ?? '';
        expect(text).toContain('84%');
        expect(text).toContain('Home');
        expect(text).not.toContain('medium');
        expect(text).toContain('95 m³/h');
        expect(text).toContain('1476 rpm');
        expect(text).toContain('1512 rpm');
        expect(text).toContain('55 %');
        expect(text).toContain('353 days');
      });

      it('shows measured airflow on extract and supply, temperature-only on outdoor and exhaust, by default', async () => {
        const el = mountLiveAltair();
        await el.updateComplete;

        const extract = el.shadowRoot?.querySelector('.air-path.extract');
        const supply = el.shadowRoot?.querySelector('.air-path.supply');
        const outdoor = el.shadowRoot?.querySelector('.air-path.outdoor');
        const exhaust = el.shadowRoot?.querySelector('.air-path.exhaust');

        expect(extract?.querySelector('.path-airflow')).toBeTruthy();
        expect(supply?.querySelector('.path-airflow')).toBeTruthy();
        expect(outdoor?.querySelector('.path-airflow')).toBeNull();
        expect(exhaust?.querySelector('.path-airflow')).toBeNull();

        expect(outdoor?.textContent).toContain('6.5');
        expect(exhaust?.textContent).toContain('10.9');
      });

      it('shows measured airflow on all four paths when show_airflow_on_all_paths is set', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'altair',
          display_mode: 'detailed',
          entities: altairDashboardEntities,
          show_airflow_on_all_paths: true,
        });
        el.hass = { ...altairHass, states: { ...altairHass.states, ...liveStates } };
        await el.updateComplete;

        const outdoor = el.shadowRoot?.querySelector('.air-path.outdoor');
        const exhaust = el.shadowRoot?.querySelector('.air-path.exhaust');
        expect(outdoor?.querySelector('.path-airflow')).toBeTruthy();
        expect(exhaust?.querySelector('.path-airflow')).toBeTruthy();
      });
    });

    describe('cross-manufacturer regression', () => {
      it('renders the unified dashboard for Zehnder without the legacy sections (bypass supported, still never shown here)', async () => {
        const el = mount();
        set(el, {
          manufacturer: 'zehnder-comfoair-q',
          display_mode: 'detailed',
          entities: {
            mode: 'select.comfoair_mode',
            outdoor_air_temp: 'sensor.comfoair_outdoor_temp',
            supply_air_temp: 'sensor.comfoair_supply_temp',
            extract_air_temp: 'sensor.comfoair_extract_temp',
            exhaust_air_temp: 'sensor.comfoair_exhaust_temp',
            bypass_state: 'binary_sensor.comfoair_bypass',
            filter_remaining: 'sensor.comfoair_filter_remaining',
          },
        });
        el.hass = zehnderHass;
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.mvhr-dashboard')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.content')).toBeNull();
        expect(el.shadowRoot?.textContent).toMatch(/auto|Home/i);
      });

      it('renders the unified dashboard for Aerofresh, brand name only, degrading missing/unavailable entities correctly', async () => {
        const el = mount();
        set(el, {
          manufacturer: 'vent_axia_sentinel_econiq',
          display_mode: 'detailed',
          entities: {
            mode: 'select.aerofresh_mode',
            outdoor_air_temp: 'sensor.aerofresh_outdoor_temp',
            supply_air_temp: 'sensor.aerofresh_supply_temp',
            extract_air_temp: 'sensor.aerofresh_extract_temp',
            exhaust_air_temp: 'sensor.aerofresh_exhaust_temp_TYPO',
            bypass_state: 'binary_sensor.aerofresh_bypass',
            filter_remaining: 'sensor.aerofresh_filter_remaining',
            fault_active: 'binary_sensor.aerofresh_fault',
          },
        });
        el.hass = aerofreshHass;
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.mvhr-dashboard')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.content')).toBeNull();
        const text = el.shadowRoot?.textContent ?? '';
        expect(text).toContain('Aerofresh');
        expect(text.toLowerCase()).not.toContain('vent-axia');
        expect(text.toLowerCase()).not.toContain('vent_axia');
      });
    });
  });

  /**
   * `display_mode: system` — the flagship, full-width visual panel
   * (ROADMAP.md "Add visual MVHR system display mode"). A homeowner-facing
   * mode that leads with the airflow visual; `detailed` (tested above) is
   * untouched by any of this.
   *
   * Note on the example values: the brief's supply temperature
   * ("approximately 15.7–16.0 °C") is above its extract temperature
   * (13.0 °C), which the existing, unmodified `calculateHeatRecovery`
   * formula correctly treats as physically implausible ("Not applicable" —
   * apparent recovery can't exceed the extract/outdoor delta). These tests
   * use a supply temperature (12.0 °C) that keeps the same outdoor/extract
   * pair internally consistent with that formula, producing a genuine ~74%
   * rather than forcing the literal example numbers through a calculation
   * that would (correctly) reject them.
   */
  describe('system mode (flagship visual panel)', () => {
    const systemEntities = {
      mode: 'select.altair_mvhr_mode',
      stop_control: 'switch.altair_mvhr_stop_unit',
      airflow: 'sensor.altair_mvhr_airflow',
      target_airflow: 'sensor.altair_mvhr_target_airflow',
      mapped_level: 'sensor.altair_mvhr_mapped_airflow_level',
      supply_temperature: 'sensor.altair_mvhr_supply_air_temperature',
      extract_temperature: 'sensor.altair_mvhr_extract_air_temperature',
      outdoor_temperature: 'sensor.altair_mvhr_outdoor_air_temperature',
      exhaust_temperature: 'sensor.altair_mvhr_exhaust_air_temperature',
      supply_fan_speed: 'sensor.altair_mvhr_supply_fan_speed',
      extract_fan_speed: 'sensor.altair_mvhr_extract_fan_speed',
      indoor_humidity: 'sensor.altair_mvhr_indoor_humidity',
      filter_days: 'sensor.altair_mvhr_filter_days_remaining',
      boost_active: 'binary_sensor.altair_mvhr_boost_active',
      boost_remaining: 'sensor.altair_mvhr_boost_remaining',
      boost_duration: 'number.altair_mvhr_boost_duration',
      start_boost: 'button.altair_mvhr_start_boost',
      cancel_boost: 'button.altair_mvhr_cancel_boost',
      override_duration: 'select.altair_mvhr_override_duration',
      clear_override: 'button.altair_mvhr_clear_override',
      calibration_result: 'sensor.altair_mvhr_airflow_calibration_result',
      calibration_available: 'binary_sensor.altair_mvhr_airflow_calibration_available',
      calibration_status: 'sensor.altair_mvhr_airflow_calibration_status',
      calibration_progress: 'sensor.altair_mvhr_airflow_calibration_progress',
      last_calibration: 'sensor.altair_mvhr_last_airflow_calibration',
      calibration_start_control: 'button.altair_mvhr_start_airflow_calibration',
      calibration_cancel_control: 'button.altair_mvhr_cancel_airflow_calibration',
      away_airflow: 'number.altair_mvhr_away_airflow',
      low_airflow: 'number.altair_mvhr_low_airflow',
      home_airflow: 'number.altair_mvhr_home_airflow',
      high_airflow: 'number.altair_mvhr_high_airflow',
    };

    const systemStates: HomeAssistant['states'] = {
      'sensor.altair_mvhr_outdoor_air_temperature': {
        entity_id: 'sensor.altair_mvhr_outdoor_air_temperature',
        state: '9.2',
        attributes: { unit_of_measurement: '°C' },
      },
      'sensor.altair_mvhr_supply_air_temperature': {
        entity_id: 'sensor.altair_mvhr_supply_air_temperature',
        state: '12.0',
        attributes: { unit_of_measurement: '°C' },
      },
      'sensor.altair_mvhr_extract_air_temperature': {
        entity_id: 'sensor.altair_mvhr_extract_air_temperature',
        state: '13.0',
        attributes: { unit_of_measurement: '°C' },
      },
      'sensor.altair_mvhr_exhaust_air_temperature': {
        entity_id: 'sensor.altair_mvhr_exhaust_air_temperature',
        state: '10.5',
        attributes: { unit_of_measurement: '°C' },
      },
      'sensor.altair_mvhr_airflow': {
        entity_id: 'sensor.altair_mvhr_airflow',
        state: '70',
        attributes: { unit_of_measurement: 'm³/h' },
      },
      'sensor.altair_mvhr_target_airflow': {
        entity_id: 'sensor.altair_mvhr_target_airflow',
        state: '95',
        attributes: { unit_of_measurement: 'm³/h' },
      },
      'sensor.altair_mvhr_mapped_airflow_level': {
        entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
        state: '4',
        attributes: {},
      },
      'sensor.altair_mvhr_supply_fan_speed': {
        entity_id: 'sensor.altair_mvhr_supply_fan_speed',
        state: '1164',
        attributes: { unit_of_measurement: 'rpm' },
      },
      'sensor.altair_mvhr_extract_fan_speed': {
        entity_id: 'sensor.altair_mvhr_extract_fan_speed',
        state: '1164',
        attributes: { unit_of_measurement: 'rpm' },
      },
      'sensor.altair_mvhr_indoor_humidity': {
        entity_id: 'sensor.altair_mvhr_indoor_humidity',
        state: '61',
        attributes: { unit_of_measurement: '%' },
      },
      'sensor.altair_mvhr_filter_days_remaining': {
        entity_id: 'sensor.altair_mvhr_filter_days_remaining',
        state: '353',
        attributes: { unit_of_measurement: 'd' },
      },
      'select.altair_mvhr_mode': {
        entity_id: 'select.altair_mvhr_mode',
        state: 'medium',
        attributes: { options: ['away', 'low', 'medium', 'high'] },
      },
      'sensor.altair_mvhr_airflow_calibration_result': {
        entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
        state: 'calibrated',
        attributes: {},
      },
    };

    function mountSystem(
      hass: HomeAssistant = { ...altairHass, states: { ...altairHass.states, ...systemStates } },
    ): HiperMvhrCard {
      const el = mount();
      set(el, {
        type: 'custom:hiper-mvhr-card',
        title: 'Altair MVHR',
        manufacturer: 'altair',
        display_mode: 'system',
        entities: systemEntities,
      });
      el.hass = hass;
      return el;
    }

    const performanceEntities: Partial<Record<EntityRoleId, string>> = {
      ...systemEntities,
      heat_recovery: 'sensor.altair_mvhr_heat_recovery',
      cooling_recovery: 'sensor.altair_mvhr_cooling_recovery',
      heat_recovery_efficiency: 'sensor.altair_mvhr_heat_recovery_efficiency',
      heating_recovered_today: 'sensor.altair_mvhr_heat_recovered_today',
      heating_recovered_month: 'sensor.altair_mvhr_heat_recovered_month',
      heating_recovered_lifetime: 'sensor.altair_mvhr_heat_recovered_total',
      cooling_recovered_today: 'sensor.altair_mvhr_cooling_recovered_today',
      cooling_recovered_month: 'sensor.altair_mvhr_cooling_recovered_month',
      cooling_recovered_lifetime: 'sensor.altair_mvhr_cooling_recovered_total',
      heating_savings_today: 'sensor.altair_mvhr_heating_saving_today',
      heating_savings_lifetime: 'sensor.altair_mvhr_heating_saving_total',
      cooling_savings_today: 'sensor.altair_mvhr_cooling_saving_today',
      cooling_savings_lifetime: 'sensor.altair_mvhr_cooling_saving_total',
      avoided_emissions_today: 'sensor.altair_mvhr_avoided_emissions_today',
      avoided_emissions_lifetime: 'sensor.altair_mvhr_avoided_emissions_total',
    };

    const performanceStates: HomeAssistant['states'] = {
      'sensor.altair_mvhr_heat_recovery': {
        entity_id: 'sensor.altair_mvhr_heat_recovery',
        state: '1420',
        attributes: { unit_of_measurement: 'W' },
      },
      'sensor.altair_mvhr_cooling_recovery': {
        entity_id: 'sensor.altair_mvhr_cooling_recovery',
        state: '380',
        attributes: { unit_of_measurement: 'W' },
      },
      'sensor.altair_mvhr_heat_recovery_efficiency': {
        entity_id: 'sensor.altair_mvhr_heat_recovery_efficiency',
        state: '87',
        attributes: { unit_of_measurement: '%' },
      },
      'sensor.altair_mvhr_heat_recovered_today': {
        entity_id: 'sensor.altair_mvhr_heat_recovered_today',
        state: '4.2',
        attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.altair_mvhr_heat_recovered_month': {
        entity_id: 'sensor.altair_mvhr_heat_recovered_month',
        state: '82.4',
        attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.altair_mvhr_heat_recovered_total': {
        entity_id: 'sensor.altair_mvhr_heat_recovered_total',
        state: '1240.5',
        attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.altair_mvhr_cooling_recovered_today': {
        entity_id: 'sensor.altair_mvhr_cooling_recovered_today',
        state: '1.1',
        attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.altair_mvhr_cooling_recovered_month': {
        entity_id: 'sensor.altair_mvhr_cooling_recovered_month',
        state: '18.6',
        attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.altair_mvhr_cooling_recovered_total': {
        entity_id: 'sensor.altair_mvhr_cooling_recovered_total',
        state: '210.4',
        attributes: { unit_of_measurement: 'kWh' },
      },
      'sensor.altair_mvhr_heating_saving_today': {
        entity_id: 'sensor.altair_mvhr_heating_saving_today',
        state: '1.23',
        attributes: { unit_of_measurement: 'AUD' },
      },
      'sensor.altair_mvhr_heating_saving_total': {
        entity_id: 'sensor.altair_mvhr_heating_saving_total',
        state: '456.78',
        attributes: { unit_of_measurement: 'AUD' },
      },
      'sensor.altair_mvhr_cooling_saving_today': {
        entity_id: 'sensor.altair_mvhr_cooling_saving_today',
        state: '0.42',
        attributes: { unit_of_measurement: 'AUD' },
      },
      'sensor.altair_mvhr_cooling_saving_total': {
        entity_id: 'sensor.altair_mvhr_cooling_saving_total',
        state: '98.76',
        attributes: { unit_of_measurement: 'AUD' },
      },
      'sensor.altair_mvhr_avoided_emissions_today': {
        entity_id: 'sensor.altair_mvhr_avoided_emissions_today',
        state: '1.8',
        attributes: { unit_of_measurement: 'kg CO₂' },
      },
      'sensor.altair_mvhr_avoided_emissions_total': {
        entity_id: 'sensor.altair_mvhr_avoided_emissions_total',
        state: '620',
        attributes: { unit_of_measurement: 'kg CO₂' },
      },
    };

    function mountPerformance(
      performanceOverrideStates: HomeAssistant['states'] = performanceStates,
      entities = performanceEntities,
    ): HiperMvhrCard {
      const el = mount();
      set(el, {
        type: 'custom:hiper-mvhr-card',
        title: 'Altair MVHR',
        manufacturer: 'altair',
        display_mode: 'system',
        entities,
      });
      el.hass = {
        ...altairHass,
        states: { ...altairHass.states, ...systemStates, ...performanceOverrideStates },
      };
      return el;
    }

    describe('configuration', () => {
      it('accepts display_mode: system and old configs (homeowner/detailed) keep working', async () => {
        for (const display_mode of ['homeowner', 'detailed', 'system'] as const) {
          const el = mount();
          expect(() =>
            set(el, { manufacturer: 'altair', display_mode, entities: {} }),
          ).not.toThrow();
          el.hass = altairHass;
          await el.updateComplete;
          expect(el.shadowRoot?.querySelector('ha-card')).toBeTruthy();
          el.remove();
        }
      });
    });

    describe('performance analytics section', () => {
      it('is hidden when no performance analytics entities are configured', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.performance-panel')).toBeNull();
      });

      it('renders live, energy, savings and environmental analytics when configured', async () => {
        const el = mountPerformance();
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.performance-panel');
        expect(panel).toBeTruthy();
        expect(panel?.textContent).toContain('Performance');
        expect(panel?.querySelectorAll('.performance-card')).toHaveLength(4);
        expect(panel?.textContent).toContain('Live Performance');
        expect(panel?.textContent).toContain('Heat Recovery');
        expect(panel?.textContent).toContain('1.42 kW');
        expect(panel?.textContent).toContain('Cooling Recovery');
        expect(panel?.textContent).toContain('0.38 kW');
        expect(panel?.textContent).toContain('Heat Recovery Efficiency');
        expect(panel?.textContent).toContain('87 %');
        expect(panel?.textContent).toContain('Energy Recovered');
        expect(panel?.textContent).toContain('Heating');
        expect(panel?.textContent).toContain('Cooling');
        expect(panel?.textContent).toContain('1240.5 kWh');
        expect(panel?.textContent).toContain('Financial Savings');
        expect(panel?.textContent).toMatch(/\$1\.23|A\$1\.23/);
        expect(panel?.textContent).toContain('Environmental Impact');
        expect(panel?.textContent).toContain('620 kg CO₂');
      });

      it('omits missing and unavailable performance values without placeholders', async () => {
        const el = mountPerformance(
          {
            'sensor.altair_mvhr_heat_recovery': {
              entity_id: 'sensor.altair_mvhr_heat_recovery',
              state: '900',
              attributes: { unit_of_measurement: 'W' },
            },
            'sensor.altair_mvhr_cooling_recovery': {
              entity_id: 'sensor.altair_mvhr_cooling_recovery',
              state: 'unavailable',
              attributes: { unit_of_measurement: 'W' },
            },
          },
          {
            ...systemEntities,
            heat_recovery: 'sensor.altair_mvhr_heat_recovery',
            cooling_recovery: 'sensor.altair_mvhr_cooling_recovery',
            heating_recovered_today: 'sensor.altair_mvhr_missing_energy',
          },
        );
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.performance-panel');
        expect(panel).toBeTruthy();
        expect(panel?.textContent).toContain('0.90 kW');
        expect(panel?.textContent).not.toContain('Cooling Recovery');
        expect(panel?.textContent).not.toContain('Energy Recovered');
        expect(panel?.textContent).not.toContain('Unavailable');
      });

      it('stays hidden when every configured performance entity is unavailable', async () => {
        const el = mountPerformance(
          {
            'sensor.altair_mvhr_heat_recovery': {
              entity_id: 'sensor.altair_mvhr_heat_recovery',
              state: 'unavailable',
              attributes: { unit_of_measurement: 'W' },
            },
          },
          {
            ...systemEntities,
            heat_recovery: 'sensor.altair_mvhr_heat_recovery',
          },
        );
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.performance-panel')).toBeNull();
      });

      it('updates performance values reactively when Home Assistant state changes', async () => {
        const el = mountPerformance({
          'sensor.altair_mvhr_heat_recovery': {
            entity_id: 'sensor.altair_mvhr_heat_recovery',
            state: '1000',
            attributes: { unit_of_measurement: 'W' },
          },
        }, {
          ...systemEntities,
          heat_recovery: 'sensor.altair_mvhr_heat_recovery',
        });
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('.performance-panel')?.textContent).toContain(
          '1.00 kW',
        );

        el.hass = {
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_heat_recovery': {
              entity_id: 'sensor.altair_mvhr_heat_recovery',
              state: '2500',
              attributes: { unit_of_measurement: 'W' },
            },
          },
        };
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.performance-panel')?.textContent).toContain(
          '2.50 kW',
        );
      });

      it('keeps the performance analytics layout responsive', () => {
        const cssText = HiperMvhrCard.styles.toString();

        expect(cssText).toMatch(
          /\.performance-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
        );
        expect(cssText).toMatch(
          /@media \(max-width:\s*599px\)[\s\S]*\.performance-grid\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
        );
      });
    });

    describe('rendering architecture', () => {
      it('renders the hero visual, and neither the legacy content nor the detailed dashboard', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.mvhr-system')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.system-visual-panel')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.content')).toBeNull();
        expect(el.shadowRoot?.querySelector('.mvhr-dashboard')).toBeNull();
      });

      it('detailed mode still renders its own dashboard, unaffected by system mode existing', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'altair',
          display_mode: 'detailed',
          entities: systemEntities,
        });
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates } };
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.mvhr-dashboard')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.mvhr-system')).toBeNull();
      });

      it('homeowner mode is unchanged (still the legacy compact content)', async () => {
        const el = mount();
        set(el, {
          manufacturer: 'altair',
          display_mode: 'homeowner',
          entities: {
            outdoor_air_temp: 'sensor.altair_outdoor_temp',
            supply_air_temp: 'sensor.altair_supply_temp',
          },
        });
        el.hass = altairHass;
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.content')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.mvhr-system')).toBeNull();
        expect(el.shadowRoot?.querySelector('.mvhr-dashboard')).toBeNull();
      });

      it('controls render outside the hero visual', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const visual = el.shadowRoot?.querySelector('.system-visual-panel');
        const controls = el.shadowRoot?.querySelector('.system-controls');
        expect(controls).toBeTruthy();
        expect(visual?.contains(controls ?? null)).toBe(false);
      });

      it('the advanced/diagnostics drawer is collapsed by default', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.advanced-drawer')).toBeNull();
        const toggle = el.shadowRoot?.querySelector('.disclosure-toggle');
        expect(toggle).toBeTruthy();
        expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      });

      it('opens the advanced drawer when the disclosure is clicked, revealing override and boost duration', async () => {
        const el = mountSystem();
        await el.updateComplete;

        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const drawer = el.shadowRoot?.querySelector('.advanced-drawer');
        expect(drawer).toBeTruthy();
        expect(drawer?.textContent).toContain('Override');
        expect(drawer?.querySelector('input[aria-label="Boost duration"]')).toBeTruthy();
      });

      it('Altair never gets a bypass row, even in the advanced drawer', async () => {
        const el = mountSystem();
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        expect((el.shadowRoot?.textContent ?? '').toLowerCase()).not.toContain('bypass');
      });

      it('Zehnder shows a bypass row in the advanced drawer when the profile supports and maps it', async () => {
        const el = mount();
        set(el, {
          manufacturer: 'zehnder-comfoair-q',
          display_mode: 'system',
          entities: {
            mode: 'select.comfoair_mode',
            outdoor_air_temp: 'sensor.comfoair_outdoor_temp',
            supply_air_temp: 'sensor.comfoair_supply_temp',
            extract_air_temp: 'sensor.comfoair_extract_temp',
            exhaust_air_temp: 'sensor.comfoair_exhaust_temp',
            bypass_state: 'binary_sensor.comfoair_bypass',
            filter_remaining: 'sensor.comfoair_filter_remaining',
          },
        });
        el.hass = zehnderHass;
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const drawer = el.shadowRoot?.querySelector('.advanced-drawer');
        expect(drawer?.textContent).toMatch(/summer bypass/i);
        expect(drawer?.textContent).toMatch(/on/i);
      });
    });

    describe('air paths', () => {
      it('renders all four path labels with a positive-direction arrangement', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelectorAll('.system-visual-panel .air-path')).toHaveLength(4);
        const text = el.shadowRoot?.textContent ?? '';
        expect(text).toContain('Extract air');
        expect(text).toContain('Exhaust air');
        expect(text).toContain('Outdoor air');
        expect(text).toContain('Supply air');
      });

      it('removes indoor humidity from the System Overview extract-air card', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const extract = el.shadowRoot?.querySelector('.system-visual-panel .air-path.extract');
        expect(extract?.textContent).not.toContain('Indoor humidity');
        expect(extract?.getAttribute('data-temperature')).toBe('13');
      });

      it('omits overview humidity safely when the humidity entity is unavailable', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_indoor_humidity': {
              entity_id: 'sensor.altair_mvhr_indoor_humidity',
              state: 'unavailable',
              attributes: { unit_of_measurement: '%' },
            },
          },
        });
        await el.updateComplete;

        const extract = el.shadowRoot?.querySelector('.system-visual-panel .air-path.extract');
        expect(extract?.textContent).not.toContain('Indoor humidity');
      });

      it('draws four separate SVG paths with the correct inward and outward directions', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const schematic = el.shadowRoot?.querySelector('.airflow-schematic');
        expect(schematic).toBeTruthy();
        expect(schematic?.querySelectorAll('.airflow-path')).toHaveLength(4);
        expect(schematic?.querySelector('.extract-flow')?.getAttribute('data-flow')).toBe('inward');
        expect(schematic?.querySelector('.outdoor-flow')?.getAttribute('data-flow')).toBe('inward');
        expect(schematic?.querySelector('.exhaust-flow')?.getAttribute('data-flow')).toBe(
          'outward',
        );
        expect(schematic?.querySelector('.supply-flow')?.getAttribute('data-flow')).toBe('outward');
        expect(schematic?.querySelectorAll('.airflow-particle')).toHaveLength(12);
        expect(schematic?.querySelector('.cutaway-shell')).toBeTruthy();
        expect(schematic?.querySelectorAll('.duct-shells path')).toHaveLength(4);
        expect(schematic?.querySelectorAll('.port-collars rect')).toHaveLength(4);
      });

      it('groups outdoor ports on the left, indoor ports on the right, and keeps both fans inside the casing', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.air-path.extract')?.getAttribute('data-side')).toBe(
          'indoor',
        );
        expect(el.shadowRoot?.querySelector('.air-path.supply')?.getAttribute('data-side')).toBe(
          'indoor',
        );
        expect(el.shadowRoot?.querySelector('.air-path.outdoor')?.getAttribute('data-side')).toBe(
          'outdoor',
        );
        expect(el.shadowRoot?.querySelector('.air-path.exhaust')?.getAttribute('data-side')).toBe(
          'outdoor',
        );
        const schematic = el.shadowRoot?.querySelector('.airflow-schematic');
        expect(schematic?.querySelector('.cutaway-shell')).toBeTruthy();
        expect(schematic?.querySelectorAll('.fan-assembly')).toHaveLength(2);
        expect(schematic?.querySelectorAll('.fan-rotor')).toHaveLength(2);
        expect(schematic?.querySelectorAll('.filter-cartridge')).toHaveLength(2);
        expect(schematic?.querySelectorAll('.filter-cartridge[data-path="incoming"]')).toHaveLength(
          2,
        );
        expect(schematic?.querySelectorAll('.fan-assembly[data-location="internal"]')).toHaveLength(
          2,
        );
        expect(el.shadowRoot?.querySelectorAll('.system-visual-wrap > .fan-assembly')).toHaveLength(
          0,
        );
        const paths = [...(el.shadowRoot?.querySelectorAll('.system-visual-wrap > .air-path') ?? [])];
        expect(paths.map((node) => node.getAttribute('data-side'))).toEqual([
          'outdoor',
          'indoor',
          'outdoor',
          'indoor',
        ]);
        expect(schematic?.querySelector('.outdoor-flow')?.getAttribute('d')).toMatch(/^M0 /);
        expect(schematic?.querySelector('.exhaust-flow')?.getAttribute('d')).toMatch(/H0$/);
        expect(schematic?.querySelector('.extract-flow')?.getAttribute('d')).toMatch(/^M700 /);
        expect(schematic?.querySelector('.supply-flow')?.getAttribute('d')).toMatch(/H700$/);
      });

      it('renders a layered equipment shell with depth, mounts, formed ducts, and pleated filters', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const schematic = el.shadowRoot?.querySelector('.airflow-schematic');
        expect(schematic?.getAttribute('viewBox')).toBe('0 0 700 360');
        expect(schematic?.querySelector('.cabinet-outer')).toBeTruthy();
        expect(schematic?.querySelector('.cabinet-seam')).toBeTruthy();
        expect(schematic?.querySelector('.mounting-brackets')).toBeTruthy();
        expect(schematic?.querySelector('.duct-highlights')).toBeTruthy();
        expect(schematic?.querySelectorAll('.filter-pleat').length).toBeGreaterThan(10);
        expect(schematic?.querySelectorAll('.fan-vane')).toHaveLength(36);
        expect(schematic?.querySelectorAll('.fan-blade')).toHaveLength(0);
        expect(schematic?.querySelectorAll('.fan-drum-back')).toHaveLength(2);
        expect(schematic?.querySelectorAll('.fan-mount-frame')).toHaveLength(0);
        expect(schematic?.querySelectorAll('.motor-ribs')).toHaveLength(0);
        expect(el.shadowRoot?.querySelector('.system-visual-panel .unit .brand')).toBeNull();
        expect(schematic?.querySelectorAll('.fan-shroud')).toHaveLength(2);
        expect(schematic?.querySelector('.fan-motor')).toBeTruthy();
        expect(schematic?.querySelector('.fan-ring')?.namespaceURI).toBe(
          'http://www.w3.org/2000/svg',
        );
        expect(schematic?.querySelector('.filter-depth')?.namespaceURI).toBe(
          'http://www.w3.org/2000/svg',
        );
        expect(schematic?.querySelector('.airflow-particle')?.namespaceURI).toBe(
          'http://www.w3.org/2000/svg',
        );
        expect(schematic?.querySelector('.exchanger-shadow')).toBeTruthy();
        expect(schematic?.querySelectorAll('.warm-channels path').length).toBeGreaterThan(10);
        expect(schematic?.querySelectorAll('.cool-channels path').length).toBeGreaterThan(10);
      });

      it('keeps warm and cool exchanger channels visible beneath the separate recovery plate', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const unit = el.shadowRoot?.querySelector('.system-visual-panel .unit');
        expect(unit?.querySelector('.warm-channels')).toBeTruthy();
        expect(unit?.querySelector('.cool-channels')).toBeTruthy();
        expect(unit?.querySelector('.passage-separator')).toBeTruthy();
        const stage = unit?.parentElement;
        expect(stage?.querySelector(':scope > .recovery-badge-plate')?.textContent).toContain('74%');
        expect(stage?.querySelector(':scope > .recovery-badge-plate')?.textContent).toContain(
          'Heat Recovery',
        );
        expect(unit?.querySelector('.recovery-badge-plate')).toBeNull();
        expect(unit?.querySelector('.recovery-badge-circular')).toBeNull();
      });

      it('extract and supply show measured airflow; outdoor and exhaust omit it by default', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const extract = el.shadowRoot?.querySelector('.system-visual-panel .air-path.extract');
        const supply = el.shadowRoot?.querySelector('.system-visual-panel .air-path.supply');
        const outdoor = el.shadowRoot?.querySelector('.system-visual-panel .air-path.outdoor');
        const exhaust = el.shadowRoot?.querySelector('.system-visual-panel .air-path.exhaust');

        expect(extract?.querySelector('.path-airflow')).toBeTruthy();
        expect(supply?.querySelector('.path-airflow')).toBeTruthy();
        expect(outdoor?.querySelector('.path-airflow')).toBeNull();
        expect(exhaust?.querySelector('.path-airflow')).toBeNull();
      });

      it('keeps external temperature cards static while retaining internal airflow particles', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const cards = [
          ...(el.shadowRoot?.querySelectorAll('.system-visual-wrap > .air-path') ?? []),
        ];
        expect(cards).toHaveLength(4);
        for (const card of cards) {
          expect(card.classList.contains('active')).toBe(false);
          expect(card.classList.contains('boost-active')).toBe(false);
          expect(card.querySelector('.airflow-particle')).toBeNull();
        }
        expect(el.shadowRoot?.querySelectorAll('.unit .airflow-particle')).toHaveLength(12);

        const cssText = HiperMvhrCard.styles.cssText;
        const endpointAfterRule =
          cssText.match(/\.system-visual-panel \.air-path::after\s*{[^}]*}/)?.[0] ?? '';
        expect(endpointAfterRule).toMatch(/content:\s*none/);
        expect(endpointAfterRule).toMatch(/display:\s*none/);
        expect(endpointAfterRule).not.toMatch(/radial-gradient/);
      });

      it('uses a compact rectangular recovery plate that leaves the exchanger structure present', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const unit = el.shadowRoot?.querySelector('.system-visual-panel .unit');
        const plate = unit?.parentElement?.querySelector(':scope > .recovery-badge-plate');
        expect(plate?.textContent).toContain('74%');
        expect(plate?.textContent).toContain('Heat Recovery');
        expect(unit?.querySelector('.recovery-badge-circular')).toBeNull();
        expect(unit?.querySelector('.exchanger-outline')).toBeTruthy();
        expect(unit?.querySelector('.warm-channels')).toBeTruthy();
        expect(unit?.querySelector('.cool-channels')).toBeTruthy();

        const cssText = HiperMvhrCard.styles.cssText;
        const plateRule = cssText.match(/\.recovery-badge-plate\s*{[^}]*}/)?.[0] ?? '';
        expect(plateRule).toMatch(/width:\s*176px/);
        expect(plateRule).toMatch(/height:\s*88px/);
        expect(plateRule).toMatch(/border-radius:\s*12px/);
        expect(plateRule).not.toMatch(/border-radius:\s*50%/);
      });

      it('scales the rectangular plate and reduces internal particles at the 430px container layout', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        expect(cssText).toMatch(
          /@container \(max-width:\s*520px\)[\s\S]*\.system-visual-panel \.recovery-badge-plate\s*{[^}]*width:\s*106px[^}]*height:\s*58px/,
        );
        expect(cssText).toMatch(
          /@container \(max-width:\s*520px\)[\s\S]*\.system-visual-panel \.particle-3\s*{[^}]*display:\s*none/,
        );
        expect(cssText).toMatch(
          /@container \(max-width:\s*520px\)[\s\S]*\.system-visual-panel \.unit-stage\s*{[^}]*grid-column:\s*1 \/ -1[^}]*grid-row:\s*2/,
        );
        expect(cssText).toMatch(
          /\.system-visual-panel \.recovery-badge-plate\s*{[^}]*width:\s*106px[^}]*height:\s*58px/,
        );
      });

      it('show_airflow_on_all_paths shows measured airflow on all four paths', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'altair',
          display_mode: 'system',
          entities: systemEntities,
          show_airflow_on_all_paths: true,
        });
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates } };
        await el.updateComplete;

        const outdoor = el.shadowRoot?.querySelector('.system-visual-panel .air-path.outdoor');
        const exhaust = el.shadowRoot?.querySelector('.system-visual-panel .air-path.exhaust');
        expect(outdoor?.querySelector('.path-airflow')).toBeTruthy();
        expect(exhaust?.querySelector('.path-airflow')).toBeTruthy();
      });
    });

    describe('temperature-driven airflow colours', () => {
      function mountTemperatures(values: {
        extract: string;
        supply: string;
        outdoor: string;
        exhaust: string;
      }): HiperMvhrCard {
        return mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_extract_air_temperature': {
              entity_id: 'sensor.altair_mvhr_extract_air_temperature',
              state: values.extract,
              attributes: { unit_of_measurement: '°C' },
            },
            'sensor.altair_mvhr_supply_air_temperature': {
              entity_id: 'sensor.altair_mvhr_supply_air_temperature',
              state: values.supply,
              attributes: { unit_of_measurement: '°C' },
            },
            'sensor.altair_mvhr_outdoor_air_temperature': {
              entity_id: 'sensor.altair_mvhr_outdoor_air_temperature',
              state: values.outdoor,
              attributes: { unit_of_measurement: '°C' },
            },
            'sensor.altair_mvhr_exhaust_air_temperature': {
              entity_id: 'sensor.altair_mvhr_exhaust_air_temperature',
              state: values.exhaust,
              attributes: { unit_of_measurement: '°C' },
            },
          },
        });
      }

      it('maps winter endpoint temperatures independently and gradients toward their paired outlet', async () => {
        const el = mountTemperatures({
          extract: '19.6',
          supply: '17.4',
          outdoor: '6',
          exhaust: '9.8',
        });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.air-path.extract')?.getAttribute('style')).toContain(
          '--stream-color:rgba(243, 211, 148, 1)',
        );
        expect(el.shadowRoot?.querySelector('.air-path.supply')?.getAttribute('style')).toContain(
          '--stream-color:rgba(223, 225, 220, 1)',
        );
        expect(el.shadowRoot?.querySelector('.air-path.outdoor')?.getAttribute('style')).toContain(
          '--stream-color:rgba(54, 123, 216, 1)',
        );
        expect(el.shadowRoot?.querySelector('.air-path.exhaust')?.getAttribute('style')).toContain(
          '--stream-color:rgba(69, 144, 220, 1)',
        );
        expect(
          el.shadowRoot
            ?.querySelector('#supply-gradient stop:last-child')
            ?.getAttribute('stop-color'),
        ).toBe('rgba(223, 225, 220, 1)');
      });

      it('automatically makes hot summer outdoor air warmer than cooled supply air', async () => {
        const el = mountTemperatures({ extract: '21', supply: '22', outdoor: '32', exhaust: '29' });
        await el.updateComplete;

        const outdoor = el.shadowRoot?.querySelector('.air-path.outdoor')?.getAttribute('style');
        const supply = el.shadowRoot?.querySelector('.air-path.supply')?.getAttribute('style');
        expect(outdoor).toContain('--stream-color:rgba(214, 69, 47, 1)');
        expect(supply).toContain('--stream-color:rgba(241, 174, 102, 1)');
        expect(outdoor).not.toBe(supply);
      });

      it('keeps 15-17°C air nearly neutral and introduces warm cream at 18°C', async () => {
        const el = mountTemperatures({ extract: '18', supply: '17', outdoor: '15', exhaust: '16' });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.air-path.outdoor')?.getAttribute('style')).toContain(
          '--stream-color:rgba(198, 211, 220, 1)',
        );
        expect(el.shadowRoot?.querySelector('.air-path.exhaust')?.getAttribute('style')).toContain(
          '--stream-color:rgba(208, 217, 220, 1)',
        );
        expect(el.shadowRoot?.querySelector('.air-path.supply')?.getAttribute('style')).toContain(
          '--stream-color:rgba(219, 223, 220, 1)',
        );
        expect(el.shadowRoot?.querySelector('.air-path.extract')?.getAttribute('style')).toContain(
          '--stream-color:rgba(239, 226, 194, 1)',
        );
      });

      it('uses the same interpolated colour when all four temperatures are equal', async () => {
        const el = mountTemperatures({ extract: '18', supply: '18', outdoor: '18', exhaust: '18' });
        await el.updateComplete;

        const styles = ['extract', 'supply', 'outdoor', 'exhaust'].map((key) =>
          el.shadowRoot?.querySelector(`.air-path.${key}`)?.getAttribute('style'),
        );
        expect(new Set(styles).size).toBe(1);
        expect(styles[0]).toContain('--stream-color:rgba(239, 226, 194, 1)');
      });

      it('uses a neutral theme colour for an unavailable endpoint', async () => {
        const el = mountTemperatures({
          extract: '19.6',
          supply: '17.4',
          outdoor: 'unavailable',
          exhaust: '9.8',
        });
        await el.updateComplete;

        const outdoor = el.shadowRoot?.querySelector('.air-path.outdoor');
        expect(outdoor?.getAttribute('data-temperature')).toBe('unavailable');
        expect(outdoor?.getAttribute('style')).toContain('var(--secondary-text-color)');
        expect(el.shadowRoot?.querySelector('.outdoor-collar')?.getAttribute('style')).toContain(
          'var(--secondary-text-color)',
        );
        expect(
          el.shadowRoot?.querySelector('.outdoor-particles')?.classList.contains('unavailable'),
        ).toBe(true);
      });

      it('keeps unavailable blowers and filters visible but neutral and stopped', async () => {
        const states = { ...altairHass.states, ...systemStates };
        delete states['sensor.altair_mvhr_supply_fan_speed'];
        delete states['sensor.altair_mvhr_extract_fan_speed'];
        delete states['sensor.altair_mvhr_filter_days_remaining'];
        const el = mountSystem({ ...altairHass, states });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelectorAll('.fan-assembly.unavailable')).toHaveLength(2);
        expect(el.shadowRoot?.querySelectorAll('.filter-cartridge.unavailable')).toHaveLength(2);
        expect(el.shadowRoot?.querySelectorAll('.filter-cartridge.known')).toHaveLength(0);
      });
    });

    describe('metrics', () => {
      it('the Airflow lower card shows current airflow, target airflow, fan speed, and current profile', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const airflowCard = el.shadowRoot?.querySelector('.airflow-card');
        expect(airflowCard).toBeTruthy();
        // "Mapped level" is an implementation-detail label; the redesign
        // shows the same role as "Current profile" instead.
        expect(airflowCard?.textContent).toContain('Current profile');
        expect(airflowCard?.textContent).not.toContain('Mapped level');
        expect(airflowCard?.textContent).toContain('Target airflow');
        expect(airflowCard?.textContent).toContain('Fan speed');
        expect(airflowCard?.querySelector('.gauge')).toBeTruthy();
      });

      it('the Temperatures lower card shows all four temperatures and heat recovery', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const card = el.shadowRoot?.querySelector('.temperatures-card');
        expect(card?.textContent).toContain('ENVIRONMENT');
        expect(card?.textContent).toContain('Supply air');
        expect(card?.textContent).toContain('Extract air');
        expect(card?.textContent).toContain('Indoor humidity');
        expect(card?.textContent).toContain('61 %');
        expect(card?.textContent).toContain('Outdoor air');
        expect(card?.textContent).toContain('Exhaust air');
        expect(card?.textContent).toContain('Heat recovery');
      });

      it('orders the Environment lower card rows and preserves unavailable humidity handling', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_indoor_humidity': {
              entity_id: 'sensor.altair_mvhr_indoor_humidity',
              state: 'unavailable',
              attributes: { unit_of_measurement: '%' },
            },
          },
        });
        await el.updateComplete;

        const card = el.shadowRoot?.querySelector('.temperatures-card');
        expect(card?.textContent).toContain('Indoor humidity');
        expect(card?.textContent).toContain('Unavailable');

        const withHumidity = mountSystem();
        await withHumidity.updateComplete;
        const labels = Array.from(
          withHumidity.shadowRoot?.querySelectorAll('.temperatures-card .status-label') ?? [],
        ).map((row) => row.textContent?.trim());

        expect(labels).toEqual([
          'Supply air',
          'Extract air',
          'Indoor humidity',
          'Outdoor air',
          'Exhaust air',
          'Heat recovery',
        ]);
      });

      it('hides the Environment humidity row when indoor_humidity is not mapped', async () => {
        const el = mount();
        const entitiesWithoutHumidity = Object.fromEntries(
          Object.entries(systemEntities).filter(([role]) => role !== 'indoor_humidity'),
        );
        set(el, {
          type: 'custom:hiper-mvhr-card',
          title: 'Altair MVHR',
          manufacturer: 'altair',
          display_mode: 'system',
          entities: entitiesWithoutHumidity,
        });
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates } };
        await el.updateComplete;

        const card = el.shadowRoot?.querySelector('.temperatures-card');
        expect(card?.textContent).not.toContain('Indoor humidity');
      });

      it('renders the apparent heat-recovery calculation correctly (~74% for these values), not a hard-coded figure', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).toContain('74%');
      });

      it('formats the last-calibration timestamp instead of rendering it raw', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'altair',
          display_mode: 'system',
          entities: systemEntities,
        });
        el.hass = {
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_last_airflow_calibration': {
              entity_id: 'sensor.altair_mvhr_last_airflow_calibration',
              state: '2026-07-16T08:30:00',
              attributes: {},
            },
          },
        };
        await el.updateComplete;

        const text = el.shadowRoot?.textContent ?? '';
        expect(text).not.toContain('2026-07-16T08:30:00');
      });
    });

    /**
     * The gauge's arc fill is the configured operating level (mapped_level,
     * falling back to selected_speed), not "current airflow ÷ target
     * airflow" — target airflow is only ever a separate detail row here,
     * never the gauge's maximum. Altair's level scale is 0-10, read
     * directly as 0-100%.
     */
    describe('gauge fraction source (mapped_level / selected_speed)', () => {
      const RADIUS = 40;
      const CIRCUMFERENCE = Math.PI * RADIUS;

      function gaugeFraction(el: HiperMvhrCard): number {
        const fill = el.shadowRoot?.querySelector('.gauge-fill');
        const style = fill?.getAttribute('style') ?? '';
        const match = style.match(/stroke-dashoffset:([\d.]+)/);
        const offset = match?.[1] ? parseFloat(match[1]) : NaN;
        return 1 - offset / CIRCUMFERENCE;
      }

      function mountWithLevel(level: string): HiperMvhrCard {
        return mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_mapped_airflow_level': {
              entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
              state: level,
              attributes: {},
            },
          },
        });
      }

      it.each([
        ['0', 70 / 120],
        ['4', 70 / 120],
        ['6', 70 / 120],
        ['10', 70 / 120],
      ])('reads mapped_level %s as %s of the arc', async (level, expected) => {
        const el = mountWithLevel(level);
        await el.updateComplete;

        expect(gaugeFraction(el)).toBeCloseTo(expected, 5);
      });

      it('scales the arc from measured airflow over the configured high preset', async () => {
        // Default fixture airflow=70 and high_airflow=120, so the v1.0 gauge
        // reads measured airflow over configured maximum while the big number
        // remains the real measured airflow.
        const el = mountSystem();
        await el.updateComplete;

        expect(gaugeFraction(el)).toBeCloseTo(70 / 120, 5);
        const gaugeValue = el.shadowRoot?.querySelector('.gauge .gauge-value strong');
        expect(gaugeValue?.textContent?.trim()).toBe('70');
      });

      it('keeps the gauge empty when airflow is unavailable even if selected_speed exists', async () => {
        // `selected_speed` isn't a verified Altair capability (only
        // `mapped_level` is, per docs/manufacturers/altair.md) — it's a
        // generic, feature-flaggable fallback role, so this exercises it the
        // same way the calibration_start_control tests exercise generic
        // opt-in roles: manufacturer 'generic' + feature_flags.
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'generic',
          display_mode: 'system',
          feature_flags: { mapped_level: true, selected_speed: true },
          entities: {
            mapped_level: 'sensor.altair_mvhr_mapped_airflow_level',
            selected_speed: 'sensor.altair_mvhr_selected_speed',
          },
        });
        el.hass = {
          ...altairHass,
          states: {
            ...altairHass.states,
            'sensor.altair_mvhr_mapped_airflow_level': {
              entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
              state: 'unavailable',
              attributes: {},
            },
            'sensor.altair_mvhr_selected_speed': {
              entity_id: 'sensor.altair_mvhr_selected_speed',
              state: '6',
              attributes: {},
            },
          },
        };
        await el.updateComplete;

        expect(gaugeFraction(el)).toBeCloseTo(0, 5);
      });

      it('ignores mapped-level availability when measured airflow and high preset are available', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_mapped_airflow_level': {
              entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
              state: 'unavailable',
              attributes: {},
            },
          },
        });
        await el.updateComplete;

        expect(gaugeFraction(el)).toBeCloseTo(70 / 120, 5);
        // Still shows the real measured airflow, never a synthesized one.
        const gaugeValue = el.shadowRoot?.querySelector('.gauge .gauge-value strong');
        expect(gaugeValue?.textContent?.trim()).toBe('70');
      });
    });

    describe('controls', () => {
      it('puts Off first only when the runtime mode select supports it', async () => {
        const withOff = mount();
        set(withOff, {
          manufacturer: 'vent_axia_sentinel_econiq',
          display_mode: 'system',
          entities: { mode: 'select.aerofresh_mode' },
        });
        withOff.hass = aerofreshHass;
        await withOff.updateComplete;
        const supportedOptions = [
          ...(withOff.shadowRoot?.querySelectorAll('select[aria-label="Operating mode"] option') ?? []),
        ].map((option) => (option as HTMLOptionElement).value);
        expect(supportedOptions[0]).toBe('off');

        const withoutOff = mount();
        set(withoutOff, {
          manufacturer: 'generic',
          display_mode: 'system',
          entities: { mode: 'select.mvhr_mode' },
          feature_flags: { mode: true },
        });
        withoutOff.hass = {
          states: {
            'select.mvhr_mode': {
              entity_id: 'select.mvhr_mode',
              state: 'Home',
              attributes: { options: ['Away', 'Low', 'Home', 'High'] },
            },
          },
        };
        await withoutOff.updateComplete;
        const unsupportedOptions = [
          ...(withoutOff.shadowRoot?.querySelectorAll('select[aria-label="Operating mode"] option') ?? []),
        ].map((option) => (option as HTMLOptionElement).value);
        expect(unsupportedOptions).not.toContain('off');
      });

      it('preserves the runtime Off option casing and sends it through the select service', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mount();
        set(el, {
          manufacturer: 'generic',
          display_mode: 'system',
          entities: { mode: 'select.mvhr_mode' },
          feature_flags: { mode: true },
        });
        el.hass = {
          states: {
            'select.mvhr_mode': {
              entity_id: 'select.mvhr_mode',
              state: 'OFF',
              attributes: { options: ['Away', 'OFF', 'Low', 'Home', 'High'] },
            },
          },
          callService,
        };
        await el.updateComplete;

        const select = el.shadowRoot?.querySelector(
          'select[aria-label="Operating mode"]',
        ) as HTMLSelectElement;
        const options = [...select.options].map((option) => option.value);
        expect(options[0]).toBe('OFF');
        expect(select.classList.contains('mode-off')).toBe(true);

        select.value = 'OFF';
        select.dispatchEvent(new Event('change'));
        expect(callService).toHaveBeenCalledWith('select', 'select_option', {
          entity_id: 'select.mvhr_mode',
          option: 'OFF',
        });
      });

      it('adds Off from a configured stop control and calls the stop switch service', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'switch.altair_mvhr_stop_unit': {
              entity_id: 'switch.altair_mvhr_stop_unit',
              state: 'off',
              attributes: {},
            },
          },
          callService,
        });
        await el.updateComplete;

        const select = el.shadowRoot?.querySelector(
          'select[aria-label="Operating mode"]',
        ) as HTMLSelectElement;
        expect([...select.options].map((option) => option.value)[0]).toBe('Off');

        select.value = 'Off';
        select.dispatchEvent(new Event('change'));
        expect(callService).toHaveBeenCalledWith('switch', 'turn_on', {
          entity_id: 'switch.altair_mvhr_stop_unit',
        });
      });

      it('starts the unit before selecting a running mode when currently stopped', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'switch.altair_mvhr_stop_unit': {
              entity_id: 'switch.altair_mvhr_stop_unit',
              state: 'on',
              attributes: {},
            },
            'sensor.altair_mvhr_airflow': {
              entity_id: 'sensor.altair_mvhr_airflow',
              state: '0',
              attributes: { unit_of_measurement: 'm³/h' },
            },
          },
          callService,
        });
        await el.updateComplete;

        const select = el.shadowRoot?.querySelector(
          'select[aria-label="Operating mode"]',
        ) as HTMLSelectElement;
        expect(select.value).toBe('Off');
        expect(el.shadowRoot?.textContent).toContain('Stopped');
        expect(el.shadowRoot?.querySelector('.unit.active')).toBeNull();

        select.value = 'medium';
        select.dispatchEvent(new Event('change'));
        await Promise.resolve();
        await Promise.resolve();
        await el.updateComplete;

        expect(callService).toHaveBeenNthCalledWith(1, 'switch', 'turn_off', {
          entity_id: 'switch.altair_mvhr_stop_unit',
        });
        expect(callService).toHaveBeenNthCalledWith(2, 'select', 'select_option', {
          entity_id: 'select.altair_mvhr_mode',
          option: 'medium',
        });
      });

      it('sends the internal medium option when Home is chosen from the compact header mode select', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem();
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates }, callService };
        await el.updateComplete;

        const select = el.shadowRoot?.querySelector(
          'select[aria-label="Operating mode"]',
        ) as HTMLSelectElement;
        expect(select).toBeTruthy();
        select.value = 'medium';
        select.dispatchEvent(new Event('change'));

        expect(callService).toHaveBeenCalledWith('select', 'select_option', {
          entity_id: 'select.altair_mvhr_mode',
          option: 'medium',
        });
      });

      it('does not send duplicate mode commands while a change is pending', async () => {
        let resolveCall: (() => void) | undefined;
        const callService = vi.fn(
          () => new Promise<void>((resolve) => (resolveCall = resolve)),
        );
        const el = mountSystem();
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates }, callService };
        await el.updateComplete;
        const select = el.shadowRoot?.querySelector(
          'select[aria-label="Operating mode"]',
        ) as HTMLSelectElement;
        select.value = 'high';
        select.dispatchEvent(new Event('change'));
        select.dispatchEvent(new Event('change'));
        await el.updateComplete;
        expect(callService).toHaveBeenCalledTimes(1);
        expect(select.disabled).toBe(true);
        resolveCall?.();
      });

      it('renders native preset number controls, validates their order, and debounces writes', async () => {
        vi.useFakeTimers();
        const callService = vi.fn().mockResolvedValue(undefined);
        const presetEntities = {
          away_airflow: 'number.mvhr_away',
          low_airflow: 'number.mvhr_low',
          home_airflow: 'number.mvhr_home',
          high_airflow: 'number.mvhr_high',
        };
        const presetStates = Object.fromEntries(
          [
            ['number.mvhr_away', '50'],
            ['number.mvhr_low', '70'],
            ['number.mvhr_home', '95'],
            ['number.mvhr_high', '120'],
          ].map(([entity_id, state]) => [
            entity_id,
            {
              entity_id,
              state,
              attributes: { min: 20, max: 140, step: 5, unit_of_measurement: 'm³/h' },
            },
          ]),
        );
        const el = mount();
        set(el, {
          manufacturer: 'generic',
          display_mode: 'system',
          entities: presetEntities,
          feature_flags: {
            away_airflow: true,
            low_airflow: true,
            home_airflow: true,
            high_airflow: true,
          },
        });
        el.hass = { states: presetStates, callService };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement).click();
        await el.updateComplete;

        const inputs = el.shadowRoot?.querySelectorAll('.preset-field input') ?? [];
        expect(inputs).toHaveLength(4);
        expect((inputs[0] as HTMLInputElement).min).toBe('20');
        expect((inputs[0] as HTMLInputElement).max).toBe('140');
        expect((inputs[0] as HTMLInputElement).step).toBe('5');

        const high = inputs[3] as HTMLInputElement;
        high.value = '125';
        high.dispatchEvent(new Event('input'));
        high.dispatchEvent(new Event('change'));
        expect(callService).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(300);
        expect(callService).toHaveBeenCalledWith('number', 'set_value', {
          entity_id: 'number.mvhr_high',
          value: 125,
        });

        callService.mockClear();
        const away = inputs[0] as HTMLInputElement;
        away.value = '90';
        away.dispatchEvent(new Event('input'));
        away.dispatchEvent(new Event('change'));
        await el.updateComplete;
        await vi.advanceTimersByTimeAsync(300);
        expect(callService).not.toHaveBeenCalled();
        expect(el.shadowRoot?.querySelector('.preset-validation')?.textContent).toContain(
          'Away ≤ Low ≤ Home ≤ High',
        );

        callService.mockClear();
        const low = inputs[1] as HTMLInputElement;
        low.value = '142';
        low.dispatchEvent(new Event('input'));
        low.dispatchEvent(new Event('change'));
        await el.updateComplete;
        await vi.advanceTimersByTimeAsync(300);
        expect(callService).not.toHaveBeenCalled();
        expect(el.shadowRoot?.querySelector('.control-error')?.textContent).toContain(
          'no more than 140',
        );
        vi.useRealTimers();
      });

      it('shows a preset-airflow empty state when no preset entities are configured', async () => {
        const el = mount();
        set(el, {
          manufacturer: 'generic',
          display_mode: 'system',
          entities: {},
        });
        el.hass = { states: {} };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement).click();
        await el.updateComplete;

        const presets = el.shadowRoot?.querySelector('.preset-controls');
        expect(presets?.textContent).toContain('Preset airflows');
        expect(presets?.textContent).toContain(
          'Preset airflow controls require number entities to be configured.',
        );
        expect(presets?.querySelector('.preset-field')).toBeNull();
      });

      it('renders only available configured preset rows and keeps unavailable rows disabled', async () => {
        const el = mount();
        set(el, {
          manufacturer: 'generic',
          display_mode: 'system',
          entities: {
            away_airflow: 'number.mvhr_away',
            low_airflow: 'number.mvhr_low',
            home_airflow: 'number.mvhr_missing',
            high_airflow: 'number.mvhr_high',
          },
          feature_flags: {
            away_airflow: true,
            low_airflow: true,
            home_airflow: true,
            high_airflow: true,
          },
        });
        el.hass = {
          states: {
            'number.mvhr_away': {
              entity_id: 'number.mvhr_away',
              state: '50',
              attributes: { unit_of_measurement: 'm³/h' },
            },
            'number.mvhr_low': {
              entity_id: 'number.mvhr_low',
              state: 'unavailable',
              attributes: { unit_of_measurement: 'm³/h' },
            },
            'number.mvhr_high': {
              entity_id: 'number.mvhr_high',
              state: '120',
              attributes: { unit_of_measurement: 'm³/h' },
            },
          },
        };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement).click();
        await el.updateComplete;

        const labels = [...(el.shadowRoot?.querySelectorAll('.preset-field > span:first-child') ?? [])]
          .map((node) => node.textContent?.trim());
        expect(labels).toEqual(['Away', 'Low', 'High']);
        const inputs = el.shadowRoot?.querySelectorAll('.preset-field input') ?? [];
        expect((inputs[1] as HTMLInputElement).disabled).toBe(true);
      });

      it('uses the configured preset entity domain for set_value service calls', async () => {
        vi.useFakeTimers();
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mount();
        set(el, {
          manufacturer: 'generic',
          display_mode: 'system',
          entities: { away_airflow: 'input_number.mvhr_away' },
          feature_flags: { away_airflow: true },
        });
        el.hass = {
          states: {
            'input_number.mvhr_away': {
              entity_id: 'input_number.mvhr_away',
              state: '50',
              attributes: { min: 20, max: 140, step: 5, unit_of_measurement: 'm³/h' },
            },
          },
          callService,
        };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement).click();
        await el.updateComplete;

        const input = el.shadowRoot?.querySelector('.preset-field input') as HTMLInputElement;
        input.value = '55';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
        await vi.advanceTimersByTimeAsync(300);

        expect(callService).toHaveBeenCalledWith('input_number', 'set_value', {
          entity_id: 'input_number.mvhr_away',
          value: 55,
        });
        vi.useRealTimers();
      });

      it('the header boost pill starts boost when ready, and reads Active once boost is on', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem();
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates }, callService };
        await el.updateComplete;

        const boostButton = el.shadowRoot?.querySelector(
          'button[aria-label="Start Boost"]',
        ) as HTMLButtonElement;
        expect(boostButton).toBeTruthy();
        expect(boostButton.textContent).toContain('Ready');
        boostButton.click();

        expect(callService).toHaveBeenCalledWith('button', 'press', {
          entity_id: 'button.altair_mvhr_start_boost',
        });

        const activeEl = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'binary_sensor.altair_mvhr_boost_active': {
              entity_id: 'binary_sensor.altair_mvhr_boost_active',
              state: 'on',
              attributes: {},
            },
          },
        });
        await activeEl.updateComplete;
        const cancelButton = activeEl.shadowRoot?.querySelector(
          'button[aria-label="Cancel Boost"]',
        ) as HTMLButtonElement;
        expect(cancelButton).toBeTruthy();
        expect(cancelButton.textContent).toContain('Active');
      });

      it('boost duration, in the advanced drawer, sets the duration via the documented service', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem();
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates }, callService };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        (
          el.shadowRoot?.querySelector('input[aria-label="Boost duration"]') as HTMLInputElement
        ).value = '20';
        el.shadowRoot
          ?.querySelector('input[aria-label="Boost duration"]')
          ?.dispatchEvent(new Event('change'));

        expect(callService).toHaveBeenCalledWith('number', 'set_value', {
          entity_id: 'number.altair_mvhr_boost_duration',
          value: 20,
        });
      });

      it('override duration and clear-override controls are available in the advanced area, not the main view', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('button[aria-label="Clear override"]')).toBeNull();
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('button[aria-label="Clear override"]')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('select[aria-label="Override duration"]')).toBeTruthy();
      });
    });

    describe('status', () => {
      it('optional missing diagnostics (fault/frost/calibration internals) do not trigger a communication issue', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).toMatch(/system ok/i);
        expect(el.shadowRoot?.textContent).not.toMatch(/communication issue/i);
      });

      it('a required, configured-but-unavailable entity produces a communication issue', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_supply_air_temperature': {
              entity_id: 'sensor.altair_mvhr_supply_air_temperature',
              state: 'unavailable',
              attributes: { unit_of_measurement: '°C' },
            },
          },
        });
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).toMatch(/communication issue/i);
      });

      it('shows a calibration-required status when the calibration result says so', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_airflow_calibration_result': {
              entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
              state: 'not_calibrated',
              attributes: {},
            },
          },
        });
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).toMatch(/calibration required/i);
      });

      it('shows a fault status when a fault entity is configured and active', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'altair',
          display_mode: 'system',
          entities: { ...systemEntities, fault_active: 'binary_sensor.altair_fault' },
        });
        el.hass = {
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'binary_sensor.altair_fault': {
              entity_id: 'binary_sensor.altair_fault',
              state: 'on',
              attributes: {},
            },
          },
        };
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).toMatch(/fault/i);
      });
    });

    describe('responsive design', () => {
      it('the host and card use full width, with no restrictive max-width', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const hostBlock = cssText.match(/:host\s*{[^}]*}/)?.[0] ?? '';
        const cardBlock = cssText.match(/ha-card\s*{[^}]*}/)?.[0] ?? '';
        expect(hostBlock).toMatch(/width:\s*100%/);
        expect(cardBlock).toMatch(/width:\s*100%/);
        expect(cardBlock).toMatch(/max-width:\s*none/);
      });

      it('has a mobile breakpoint that gives the system visual a 2-column (2x2) layout', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        expect(cssText).toMatch(/@media[^{]*max-width:\s*599px/);
        expect(cssText).toMatch(/repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
      });

      it('the lower dashboard cards (Airflow/Environment/System Status) collapse to a single column on mobile', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const mobileBlock =
          cssText.match(/@media \(max-width: 599px\)\s*{[\s\S]*?\n {4}}/)?.[0] ?? '';
        expect(mobileBlock).toMatch(
          /\.system-lower-grid\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
        );
        // .system-main is always full width now (System Overview is the
        // sole hero, no side-by-side shower column to collapse — see the
        // "shower detection panel" tests below) — the mobile-specific rule
        // to check for instead is the shower banner stacking to a column.
        expect(mobileBlock).toMatch(/\.shower-active\s*{[^}]*flex-direction:\s*column/);
      });

      it('the airflow gauge becomes fluid-width (not a fixed px width) on mobile', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const mobileBlock =
          cssText.match(/@media \(max-width: 599px\)\s*{[\s\S]*?\n {4}}/)?.[0] ?? '';
        expect(mobileBlock).toMatch(/\.gauge\s*{[^}]*width:\s*100%/);
      });

      it('respects prefers-reduced-motion for airflow, fan, and shower-droplet animations', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const reducedMotionBlock =
          cssText.match(/@media \(prefers-reduced-motion: reduce\)\s*{[^}]*}/)?.[0] ?? '';
        expect(reducedMotionBlock).toMatch(/animation:\s*none/);
        expect(reducedMotionBlock).toMatch(/system-visual-panel/);
        expect(reducedMotionBlock).toMatch(/airflow-particle/);
        expect(reducedMotionBlock).toMatch(/\.droplet/);
      });
    });

    describe('regression', () => {
      it('Altair still never renders a bypass control or status anywhere in system mode', async () => {
        const el = mountSystem();
        await el.updateComplete;
        expect((el.shadowRoot?.textContent ?? '').toLowerCase()).not.toContain('bypass');
      });
    });

    /**
     * Visual-polish follow-up (user review after the first redesign pass):
     * overview/shower side-by-side layout robustness, the heat-recovery
     * badge moved into the centre of the unit graphic, a bigger airflow
     * gauge, compact calibration/fan-speed tiles, System Status badges, and
     * a more prominent boost-remaining countdown.
     */
    describe('visual polish follow-up', () => {
      it("adds a container-query fallback so the overview/shower layout reacts to the card's own width, not just the viewport", () => {
        const cssText = HiperMvhrCard.styles.cssText;
        expect(cssText).toMatch(/container-type:\s*inline-size/);
        expect(cssText).toMatch(/@container[^{]*max-width/);
      });

      it('renders the heat-recovery figure above the unit graphic, not over the exchanger', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const unit = el.shadowRoot?.querySelector('.system-visual-panel .unit');
        expect(unit?.parentElement?.querySelector(':scope > .recovery-badge-plate')?.textContent).toContain(
          '74%',
        );
        expect(unit?.querySelector('.recovery-badge-plate')).toBeNull();
        expect(el.shadowRoot?.querySelector('.panel-heading-row .recovery-pill')).toBeNull();
      });

      it('does not render the recovery badge when the heat-recovery calculation is not valid', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            // Supply above extract makes the recovery calculation invalid.
            'sensor.altair_mvhr_supply_air_temperature': {
              entity_id: 'sensor.altair_mvhr_supply_air_temperature',
              state: '20.0',
              attributes: { unit_of_measurement: '°C' },
            },
          },
        });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.recovery-badge-plate')).toBeNull();
      });

      it('the airflow gauge is sized close to double the original 140px', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const gaugeBlock = cssText.match(/\.gauge\s*{[^}]*}/)?.[0] ?? '';
        expect(gaugeBlock).toMatch(/width:\s*260px/);
      });

      it('shows calibration and fan-speed diagnostics as a compact tile grid instead of full-width rows', async () => {
        const el = mountSystem();
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const stats = el.shadowRoot?.querySelector('.compact-stats-card');
        expect(stats).toBeTruthy();
        expect(stats?.textContent).toContain('Supply fan');
        expect(stats?.textContent).toContain('Extract fan');
        const calibration = el.shadowRoot?.querySelector('.calibration-panel');
        expect(calibration?.textContent).toContain('Airflow calibration');
        expect(calibration?.textContent).toContain('Complete');
      });

      it('shows System Status as coloured badges rather than label/value rows', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const statusCard = el.shadowRoot?.querySelector('.system-status-card');
        const badges = statusCard?.querySelectorAll('.status-badge');
        expect(badges?.length).toBeGreaterThan(0);
        expect(statusCard?.textContent).toContain('Boost Ready');
        expect(statusCard?.textContent).toMatch(/system ok/i);
        // Colour is never the only signal — every badge spells out its
        // state in words too.
        badges?.forEach((badge) =>
          expect((badge.textContent ?? '').trim().length).toBeGreaterThan(0),
        );
      });

      it('gives an active boost a prominent countdown callout in the System Status card', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'binary_sensor.altair_mvhr_boost_active': {
              entity_id: 'binary_sensor.altair_mvhr_boost_active',
              state: 'on',
              attributes: {},
            },
            'sensor.altair_mvhr_boost_remaining': {
              entity_id: 'sensor.altair_mvhr_boost_remaining',
              state: '18',
              attributes: { unit_of_measurement: 'min' },
            },
          },
        });
        await el.updateComplete;

        const highlight = el.shadowRoot?.querySelector('.boost-remaining-highlight');
        expect(highlight?.textContent).toContain('18');
        expect(highlight?.textContent).toMatch(/boost remaining/i);
      });

      it('surfaces the boost-remaining countdown in the header pill too, once boost is active', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'binary_sensor.altair_mvhr_boost_active': {
              entity_id: 'binary_sensor.altair_mvhr_boost_active',
              state: 'on',
              attributes: {},
            },
            'sensor.altair_mvhr_boost_remaining': {
              entity_id: 'sensor.altair_mvhr_boost_remaining',
              state: '18',
              attributes: { unit_of_measurement: 'min' },
            },
          },
        });
        await el.updateComplete;

        const boostButton = el.shadowRoot?.querySelector(
          'button[aria-label="Cancel Boost"]',
        ) as HTMLButtonElement;
        expect(boostButton?.textContent).toContain('18');
      });

      it('does not show a "0 min" boost-remaining countdown when boost is not active', async () => {
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'binary_sensor.altair_mvhr_boost_active': {
              entity_id: 'binary_sensor.altair_mvhr_boost_active',
              state: 'off',
              attributes: {},
            },
            'sensor.altair_mvhr_boost_remaining': {
              entity_id: 'sensor.altair_mvhr_boost_remaining',
              state: '0',
              attributes: { unit_of_measurement: 'min' },
            },
          },
        });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.boost-remaining-highlight')).toBeNull();
        const boostButton = el.shadowRoot?.querySelector(
          'button[aria-label="Start Boost"]',
        ) as HTMLButtonElement;
        expect(boostButton?.textContent).not.toContain('0 min');
      });

      it('stacks the gauge value and its unit on separate lines instead of one run-on string', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const gaugeValue = el.shadowRoot?.querySelector('.gauge .gauge-value');
        const strong = gaugeValue?.querySelector('strong');
        const unit = gaugeValue?.querySelector('.gauge-unit');
        expect(strong?.textContent?.trim()).toBe('70');
        expect(unit?.textContent?.trim()).toBe('m³/h');
      });

      it('gives System Overview the full card width (no competing side column)', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const systemMainBlock = cssText.match(/\.system-main\s*{[^}]*}/)?.[0] ?? '';
        expect(systemMainBlock).toMatch(/display:\s*block/);
      });

      it('adds moving particles to all four schematic paths, gated on activity and reduced-motion', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        expect(cssText).toMatch(/@keyframes schematic-particle/);
        expect(cssText).toMatch(/\.extract-particles \.airflow-particle/);
        expect(cssText).toMatch(/\.supply-particles \.airflow-particle/);
        const reducedMotionBlock =
          cssText.match(/@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?\n {4}}/)?.[0] ?? '';
        expect(reducedMotionBlock).toMatch(/airflow-particle/);
      });

      it('gives the header controls a bordered control-panel appearance instead of floating pills', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const headerControlsBlock =
          cssText.match(/\.system-controls\.header-controls\s*{[^}]*}/)?.[0] ?? '';
        expect(headerControlsBlock).toMatch(/border:\s*1px solid/);
        expect(headerControlsBlock).toMatch(/border-radius/);
      });

      it('shows a confirmed calibration button in the advanced drawer when calibration_start_control is enabled', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const confirm = vi.fn().mockReturnValue(true);
        vi.stubGlobal('confirm', confirm);
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'generic',
          display_mode: 'system',
          entities: { ...systemEntities, calibration_start_control: 'button.mvhr_run_calibration' },
          feature_flags: { calibration_start_control: true },
        });
        el.hass = {
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'button.mvhr_run_calibration': {
              entity_id: 'button.mvhr_run_calibration',
              state: 'unknown',
              attributes: {},
            },
          },
          callService,
        };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const button = el.shadowRoot?.querySelector(
          'button.calibration-button',
        ) as HTMLButtonElement;
        expect(button).toBeTruthy();
        expect(button.textContent).toContain('Start Calibration');
        button.click();
        await el.updateComplete;

        expect(confirm).toHaveBeenCalled();
        expect(callService).toHaveBeenCalledWith('button', 'press', {
          entity_id: 'button.mvhr_run_calibration',
        });
        vi.unstubAllGlobals();
      });

      it('does not show a calibration button for a profile that has not declared it supported', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'generic',
          display_mode: 'system',
          entities: {},
        });
        el.hass = { states: {} };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('button.calibration-button')).toBeNull();
      });

      it('shows calibration progress and cancel while calibration is running', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem({
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'sensor.altair_mvhr_airflow_calibration_status': {
              entity_id: 'sensor.altair_mvhr_airflow_calibration_status',
              state: 'sampling',
              attributes: {},
            },
            'sensor.altair_mvhr_airflow_calibration_progress': {
              entity_id: 'sensor.altair_mvhr_airflow_calibration_progress',
              state: '42',
              attributes: { unit_of_measurement: '%' },
            },
          },
          callService,
        });
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.calibration-panel');
        expect(panel?.textContent).toContain('Airflow calibration');
        expect(panel?.textContent).toContain('sampling');
        expect(panel?.textContent).toContain('42 %');
        expect(panel?.querySelector('.calibration-progress span')?.getAttribute('style')).toContain(
          'width:42%',
        );

        const cancel = panel?.querySelector('.calibration-cancel-button') as HTMLButtonElement;
        expect(cancel?.textContent).toContain('Cancel Calibration');
        cancel.click();
        expect(callService).toHaveBeenCalledWith('button', 'press', {
          entity_id: 'button.altair_mvhr_cancel_airflow_calibration',
        });
      });

      it('shows calibration as unavailable when the configured action entity is unavailable', async () => {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'generic',
          display_mode: 'system',
          entities: { ...systemEntities, calibration_start_control: 'button.mvhr_run_calibration' },
          feature_flags: { calibration_start_control: true },
        });
        el.hass = {
          ...altairHass,
          states: {
            ...altairHass.states,
            ...systemStates,
            'button.mvhr_run_calibration': {
              entity_id: 'button.mvhr_run_calibration',
              state: 'unavailable',
              attributes: {},
            },
          },
        };
        await el.updateComplete;
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const button = el.shadowRoot?.querySelector(
          'button.calibration-button',
        ) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        expect(el.shadowRoot?.textContent).toContain('Calibration unavailable');
      });

      it('speeds up the schematic-particle and fan animations while boost is active', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        expect(cssText).toMatch(
          /\.unit\.active\.boost-active \.fan-rotor\s*{[^}]*animation-duration:\s*1\.6s/,
        );
        expect(cssText).toMatch(
          /\.unit\.active\.boost-active \.airflow-particle\s*{[^}]*animation-duration:\s*1\.35s/,
        );
      });

      describe('micro-animations: one-shot change detection', () => {
        it('does not pulse the recovery badge on the very first render', async () => {
          const el = mountSystem();
          await el.updateComplete;

          expect(
            el.shadowRoot?.querySelector('.recovery-badge-plate.recovery-pulse'),
          ).toBeNull();
        });

        it('pulses the recovery badge only on the render where the figure actually changes', async () => {
          const el = mountSystem();
          await el.updateComplete;
          expect(el.shadowRoot?.querySelector('.recovery-badge-plate')?.textContent).toContain(
            '74%',
          );

          // Same instance, a later hass update with a genuinely different
          // supply temperature -> a different recovery percentage.
          el.hass = {
            ...altairHass,
            states: {
              ...altairHass.states,
              ...systemStates,
              'sensor.altair_mvhr_supply_air_temperature': {
                entity_id: 'sensor.altair_mvhr_supply_air_temperature',
                state: '12.5',
                attributes: { unit_of_measurement: '°C' },
              },
            },
          };
          await el.updateComplete;
          const badge = el.shadowRoot?.querySelector('.recovery-badge-plate');
          expect(badge?.textContent).not.toContain('74%');
          expect(badge?.classList.contains('recovery-pulse')).toBe(true);

          // A further render with the same (now unchanged) figure shouldn't
          // pulse again.
          el.hass = {
            ...altairHass,
            states: {
              ...altairHass.states,
              ...systemStates,
              'sensor.altair_mvhr_supply_air_temperature': {
                entity_id: 'sensor.altair_mvhr_supply_air_temperature',
                state: '12.5',
                attributes: { unit_of_measurement: '°C' },
              },
              // Force a re-render via an unrelated state change.
              'sensor.altair_mvhr_indoor_humidity': {
                entity_id: 'sensor.altair_mvhr_indoor_humidity',
                state: '62',
                attributes: { unit_of_measurement: '%' },
              },
            },
          };
          await el.updateComplete;
          expect(
            el.shadowRoot
              ?.querySelector('.recovery-badge-plate')
              ?.classList.contains('recovery-pulse'),
          ).toBe(false);
        });

        it('does not brighten the Airflow card on the very first render', async () => {
          const el = mountSystem();
          await el.updateComplete;

          expect(el.shadowRoot?.querySelector('.airflow-card.airflow-brighten')).toBeNull();
        });

        it('brightens the Airflow card only when the reading increases, not when it decreases', async () => {
          const el = mountSystem();
          await el.updateComplete;

          el.hass = {
            ...altairHass,
            states: {
              ...altairHass.states,
              ...systemStates,
              'sensor.altair_mvhr_airflow': {
                entity_id: 'sensor.altair_mvhr_airflow',
                state: '90',
                attributes: { unit_of_measurement: 'm³/h' },
              },
            },
          };
          await el.updateComplete;
          expect(
            el.shadowRoot?.querySelector('.airflow-card')?.classList.contains('airflow-brighten'),
          ).toBe(true);

          el.hass = {
            ...altairHass,
            states: {
              ...altairHass.states,
              ...systemStates,
              'sensor.altair_mvhr_airflow': {
                entity_id: 'sensor.altair_mvhr_airflow',
                state: '80',
                attributes: { unit_of_measurement: 'm³/h' },
              },
            },
          };
          await el.updateComplete;
          expect(
            el.shadowRoot?.querySelector('.airflow-card')?.classList.contains('airflow-brighten'),
          ).toBe(false);
        });
      });
    });

    /**
     * Shower-detection panel (visual redesign) — `shower_detected`,
     * `shower_trigger_temperature`, `shower_peak_temperature`,
     * `shower_rearm_temperature`, and `shower_pipe_temperature` are
     * optional roles; these tests deliberately mount with a separate
     * entities object rather than adding them to `systemEntities`, so
     * every test above (mounted without any shower entities) keeps
     * exercising the "not configured at all" path implicitly.
     */
    describe('shower detection panel', () => {
      const showerEntities: Partial<Record<EntityRoleId, string>> = {
        ...systemEntities,
        shower_detected: 'binary_sensor.altair_shower_detected',
        shower_trigger_temperature: 'sensor.altair_shower_trigger_temperature',
        shower_peak_temperature: 'sensor.altair_mvhr_shower_peak_temperature',
        shower_rearm_temperature: 'sensor.altair_mvhr_shower_rearm_temperature',
        shower_pipe_temperature: 'sensor.shower_pipe_temperature',
      };

      function mountShower(
        showerStates: HomeAssistant['states'],
        entities = showerEntities,
        callService?: HomeAssistant['callService'],
      ): HiperMvhrCard {
        const el = mount();
        set(el, {
          type: 'custom:hiper-mvhr-card',
          manufacturer: 'altair',
          display_mode: 'system',
          entities,
        });
        el.hass = {
          ...altairHass,
          states: { ...altairHass.states, ...systemStates, ...showerStates },
          ...(callService ? { callService } : {}),
        };
        return el;
      }

      it('no shower entities configured: no shower panel and no header pill at all', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.shower-panel')).toBeNull();
        expect(el.shadowRoot?.querySelector('.shower-pill')).toBeNull();
      });

      it('shower entities configured but off: a calm ready banner below the lower cards', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
        });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.shower-pill')).toBeNull();
        const panel = el.shadowRoot?.querySelector('.shower-panel');
        expect(panel).toBeTruthy();
        expect(panel?.classList.contains('shower-ready')).toBe(true);
        expect(panel?.textContent).toContain('Shower detection ready');
        expect(panel?.textContent).toContain('Rearmed and watching the pipe sensor');
        expect(el.shadowRoot?.querySelector('.shower-active')).toBeNull();

        const lower = el.shadowRoot?.querySelector('.system-lower-grid');
        const more = el.shadowRoot?.querySelector('.system-more');
        expect(lower?.nextElementSibling).toBe(panel);
        expect(panel?.nextElementSibling).toBe(more);
      });

      it('renders all adjustable shower detection controls from number metadata', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
          'number.altair_mvhr_shower_temperature_rise': {
            entity_id: 'number.altair_mvhr_shower_temperature_rise',
            state: '7.5',
            attributes: { min: 2, max: 20, step: 0.5, unit_of_measurement: '°C' },
          },
          'number.altair_mvhr_shower_detection_window': {
            entity_id: 'number.altair_mvhr_shower_detection_window',
            state: '3',
            attributes: { min: 1, max: 10, step: 1, unit_of_measurement: 'min' },
          },
          'number.altair_mvhr_shower_rearm_temperature_drop': {
            entity_id: 'number.altair_mvhr_shower_rearm_temperature_drop',
            state: '3.0',
            attributes: { min: 1, max: 15, step: 0.5, unit_of_measurement: '°C' },
          },
        }, {
          ...showerEntities,
          shower_temperature_rise: 'number.altair_mvhr_shower_temperature_rise',
          shower_detection_window: 'number.altair_mvhr_shower_detection_window',
          shower_rearm_temperature_drop: 'number.altair_mvhr_shower_rearm_temperature_drop',
        });
        await el.updateComplete;

        const settings = el.shadowRoot?.querySelector('.shower-settings');
        expect(settings?.textContent).toContain('Shower temperature rise');
        expect(settings?.textContent).toContain('Detection window');
        expect(settings?.textContent).toContain('Re-arm temperature drop');
        expect(settings?.textContent).toContain('°C');
        expect(settings?.textContent).toContain('min');
        const inputs = settings?.querySelectorAll('input') ?? [];
        expect(inputs).toHaveLength(3);
        expect((inputs[0] as HTMLInputElement).value).toBe('7.5');
        expect((inputs[0] as HTMLInputElement).min).toBe('2');
        expect((inputs[0] as HTMLInputElement).max).toBe('20');
        expect((inputs[0] as HTMLInputElement).step).toBe('0.5');
        expect((inputs[1] as HTMLInputElement).value).toBe('3');
        expect((inputs[1] as HTMLInputElement).min).toBe('1');
        expect((inputs[1] as HTMLInputElement).max).toBe('10');
        expect((inputs[1] as HTMLInputElement).step).toBe('1');
        expect((inputs[2] as HTMLInputElement).value).toBe('3');
        expect((inputs[2] as HTMLInputElement).min).toBe('1');
        expect((inputs[2] as HTMLInputElement).max).toBe('15');
        expect((inputs[2] as HTMLInputElement).step).toBe('0.5');
      });

      it('hides only the missing adjustable shower control', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
          'number.altair_mvhr_shower_temperature_rise': {
            entity_id: 'number.altair_mvhr_shower_temperature_rise',
            state: '8',
            attributes: { min: 2, max: 20, step: 0.5, unit_of_measurement: '°C' },
          },
        }, {
          ...showerEntities,
          shower_temperature_rise: 'number.altair_mvhr_shower_temperature_rise',
          shower_detection_window: 'number.altair_mvhr_missing_window',
        });
        await el.updateComplete;

        const settings = el.shadowRoot?.querySelector('.shower-settings');
        expect(settings?.querySelectorAll('input')).toHaveLength(1);
        expect(settings?.textContent).toContain('Shower temperature rise');
        expect(settings?.textContent).not.toContain('Detection window');
        expect(el.shadowRoot?.querySelector('.shower-panel')).toBeTruthy();
      });

      it('keeps the shower panel when both adjustable controls are missing', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
        }, {
          ...showerEntities,
          shower_temperature_rise: 'number.altair_mvhr_missing_rise',
          shower_detection_window: 'number.altair_mvhr_missing_window',
        });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.shower-panel')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.shower-settings')).toBeNull();
      });

      it('calls number.set_value with the configured shower setting entity and value', async () => {
        vi.useFakeTimers();
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
          'number.in_ceiling_altair_mvhr_shower_temperature_rise': {
            entity_id: 'number.in_ceiling_altair_mvhr_shower_temperature_rise',
            state: '10',
            attributes: { min: 2, max: 20, step: 0.5, unit_of_measurement: '°C' },
          },
          'number.in_ceiling_altair_mvhr_shower_detection_window': {
            entity_id: 'number.in_ceiling_altair_mvhr_shower_detection_window',
            state: '2',
            attributes: { min: 1, max: 10, step: 1, unit_of_measurement: 'min' },
          },
        }, {
          ...showerEntities,
          shower_temperature_rise: 'number.in_ceiling_altair_mvhr_shower_temperature_rise',
          shower_detection_window: 'number.in_ceiling_altair_mvhr_shower_detection_window',
        }, callService);
        await el.updateComplete;

        const input = el.shadowRoot?.querySelector(
          '.shower-setting-field input',
        ) as HTMLInputElement;
        input.value = '7.5';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
        await vi.advanceTimersByTimeAsync(300);

        expect(callService).toHaveBeenCalledWith('number', 'set_value', {
          entity_id: 'number.in_ceiling_altair_mvhr_shower_temperature_rise',
          value: 7.5,
        });
        vi.useRealTimers();
      });

      it('calls number.set_value for the configured re-arm temperature drop entity', async () => {
        vi.useFakeTimers();
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
          'number.altair_mvhr_shower_rearm_temperature_drop': {
            entity_id: 'number.altair_mvhr_shower_rearm_temperature_drop',
            state: '3.0',
            attributes: { min: 1, max: 15, step: 0.5, unit_of_measurement: '°C' },
          },
        }, {
          ...showerEntities,
          shower_rearm_temperature_drop: 'number.altair_mvhr_shower_rearm_temperature_drop',
        }, callService);
        await el.updateComplete;

        const input = el.shadowRoot?.querySelector(
          'input[aria-label="Re-arm temperature drop"]',
        ) as HTMLInputElement;
        input.value = '3.5';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
        await vi.advanceTimersByTimeAsync(300);

        expect(callService).toHaveBeenCalledWith('number', 'set_value', {
          entity_id: 'number.altair_mvhr_shower_rearm_temperature_drop',
          value: 3.5,
        });
        vi.useRealTimers();
      });

      it('renders unavailable shower setting controls safely disabled', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
          'number.altair_mvhr_shower_temperature_rise': {
            entity_id: 'number.altair_mvhr_shower_temperature_rise',
            state: 'unavailable',
            attributes: { min: 2, max: 20, step: 0.5, unit_of_measurement: '°C' },
          },
        }, {
          ...showerEntities,
          shower_temperature_rise: 'number.altair_mvhr_shower_temperature_rise',
        });
        await el.updateComplete;

        const input = el.shadowRoot?.querySelector(
          '.shower-setting-field input',
        ) as HTMLInputElement;
        expect(input.disabled).toBe(true);
        expect(el.shadowRoot?.querySelector('.shower-settings')?.textContent).toContain(
          'Unavailable',
        );
      });

      it('disables an unavailable re-arm temperature drop control', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'off',
            attributes: {},
          },
          'number.altair_mvhr_shower_rearm_temperature_drop': {
            entity_id: 'number.altair_mvhr_shower_rearm_temperature_drop',
            state: 'unavailable',
            attributes: { min: 1, max: 15, step: 0.5, unit_of_measurement: '°C' },
          },
        }, {
          ...showerEntities,
          shower_rearm_temperature_drop: 'number.altair_mvhr_shower_rearm_temperature_drop',
        });
        await el.updateComplete;

        const input = el.shadowRoot?.querySelector(
          'input[aria-label="Re-arm temperature drop"]',
        ) as HTMLInputElement;
        expect(input.disabled).toBe(true);
        expect(el.shadowRoot?.querySelector('.shower-settings')?.textContent).toContain(
          'Unavailable',
        );
      });

      it('an unavailable shower_detected entity shows neutral unavailable state, not no-shower text', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'unavailable',
            attributes: {},
          },
        });
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.shower-panel');
        expect(panel).toBeTruthy();
        expect(panel?.classList.contains('shower-unavailable')).toBe(true);
        expect(panel?.textContent).toContain('Shower detection unavailable');
        expect(panel?.textContent).not.toContain('No shower detected');
        expect(el.shadowRoot?.querySelector('.shower-active')).toBeNull();
      });

      it('shower detected: shows pipe and trigger without inventing a re-arm temperature', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'on',
            attributes: {},
          },
          'sensor.altair_shower_trigger_temperature': {
            entity_id: 'sensor.altair_shower_trigger_temperature',
            state: '43.6',
            attributes: { unit_of_measurement: '°C' },
          },
          'sensor.shower_pipe_temperature': {
            entity_id: 'sensor.shower_pipe_temperature',
            state: '43.6',
            attributes: { unit_of_measurement: '°C' },
          },
          'binary_sensor.altair_mvhr_boost_active': {
            entity_id: 'binary_sensor.altair_mvhr_boost_active',
            state: 'on',
            attributes: {},
          },
          'sensor.altair_mvhr_boost_remaining': {
            entity_id: 'sensor.altair_mvhr_boost_remaining',
            state: '25',
            attributes: { unit_of_measurement: 'min' },
          },
        });
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.shower-active');
        expect(panel).toBeTruthy();
        expect(panel?.textContent).toContain('Shower detected');
        expect(panel?.textContent).toContain('Boost active');
        expect(panel?.textContent).toContain('43.6 °C');
        expect(panel?.textContent).not.toContain('Re-arm at');
        expect(panel?.textContent).toContain('25 min');
        expect(el.shadowRoot?.querySelector('.shower-pill')).toBeNull();
      });

      it('uses backend peak and re-arm temperature sensors for the dynamic display', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'on',
            attributes: {},
          },
          'sensor.altair_shower_trigger_temperature': {
            entity_id: 'sensor.altair_shower_trigger_temperature',
            state: '31.4',
            attributes: { unit_of_measurement: '°C' },
          },
          'sensor.altair_mvhr_shower_peak_temperature': {
            entity_id: 'sensor.altair_mvhr_shower_peak_temperature',
            state: '40.0',
            attributes: { unit_of_measurement: '°C' },
          },
          'sensor.altair_mvhr_shower_rearm_temperature': {
            entity_id: 'sensor.altair_mvhr_shower_rearm_temperature',
            state: '37.0',
            attributes: { unit_of_measurement: '°C' },
          },
          'number.altair_mvhr_shower_rearm_temperature_drop': {
            entity_id: 'number.altair_mvhr_shower_rearm_temperature_drop',
            state: '3.0',
            attributes: { min: 1, max: 15, step: 0.5, unit_of_measurement: '°C' },
          },
        }, {
          ...showerEntities,
          shower_rearm_temperature_drop: 'number.altair_mvhr_shower_rearm_temperature_drop',
        });
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.shower-active');
        expect(panel?.textContent).toContain('Peak temperature');
        expect(panel?.textContent).toContain('40.0 °C');
        expect(panel?.textContent).toContain('Re-arm at');
        expect(panel?.textContent).toContain('37.0 °C');
        expect(panel?.textContent).toContain('3.0 °C below peak');
        expect(panel?.textContent).not.toContain('28.4 °C');
      });

      it('does not display a fake pipe temperature when that sensor is unavailable', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'on',
            attributes: {},
          },
          'sensor.altair_shower_trigger_temperature': {
            entity_id: 'sensor.altair_shower_trigger_temperature',
            state: '40.0',
            attributes: { unit_of_measurement: '°C' },
          },
          'sensor.shower_pipe_temperature': {
            entity_id: 'sensor.shower_pipe_temperature',
            state: 'unavailable',
            attributes: { unit_of_measurement: '°C' },
          },
        });
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.shower-active');
        expect(panel?.textContent).not.toContain('Pipe temperature');
      });

      it('boost active and boost remaining reflect the same roles used elsewhere in the card', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'on',
            attributes: {},
          },
          'binary_sensor.altair_mvhr_boost_active': {
            entity_id: 'binary_sensor.altair_mvhr_boost_active',
            state: 'off',
            attributes: {},
          },
        });
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.shower-active')?.textContent).toContain(
          'Boost not active',
        );
      });

      it('keeps shower active during software boost while selected mode remains Home', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'on',
            attributes: {},
          },
          'select.altair_mvhr_mode': {
            entity_id: 'select.altair_mvhr_mode',
            state: 'medium',
            attributes: { options: ['away', 'low', 'medium', 'high'] },
          },
          'binary_sensor.altair_mvhr_boost_active': {
            entity_id: 'binary_sensor.altair_mvhr_boost_active',
            state: 'on',
            attributes: {},
          },
          'sensor.altair_mvhr_boost_remaining': {
            entity_id: 'sensor.altair_mvhr_boost_remaining',
            state: '12',
            attributes: { unit_of_measurement: 'min' },
          },
        });
        await el.updateComplete;

        const panel = el.shadowRoot?.querySelector('.shower-panel');
        expect(panel?.classList.contains('shower-active')).toBe(true);
        expect(panel?.textContent).toContain('Shower detected');
        expect(panel?.textContent).toContain('Boost active');
        expect(panel?.textContent).toContain('12 min');
        expect(el.shadowRoot?.querySelector('.mode-select-pill')).toBeTruthy();
      });

      it('renders a lightweight inline SVG illustration, not an externally hosted image', async () => {
        const el = mountShower({
          'binary_sensor.altair_shower_detected': {
            entity_id: 'binary_sensor.altair_shower_detected',
            state: 'on',
            attributes: {},
          },
        });
        await el.updateComplete;

        const svg = el.shadowRoot?.querySelector('.shower-active .shower-svg');
        expect(svg).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.shower-active img')).toBeNull();
      });
    });

    describe('mobile layout structure', () => {
      it('the redesigned system-main and lower-grid sections exist and are styled for a single mobile column', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.system-main')).toBeTruthy();
        expect(el.shadowRoot?.querySelector('.system-lower-grid')).toBeTruthy();
        expect(el.shadowRoot?.querySelectorAll('.lower-card')).toHaveLength(3);
      });
    });
  });
});
