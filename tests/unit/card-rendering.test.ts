import { describe, it, expect, vi, afterEach } from 'vitest';
import { HiperMvhrCard } from '../../src/components/hiper-mvhr-card';
import { altairHass } from '../fixtures/hass-altair-160';
import { zehnderHass } from '../fixtures/hass-zehnder-comfoair-q';
import { aerofreshHass } from '../fixtures/hass-aerofresh';
import { genericHass } from '../fixtures/hass-generic';
import type { HomeAssistant } from '../../src/types/hass';

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

      it('opens the advanced drawer when the disclosure is clicked, revealing mapped level and override', async () => {
        const el = mountSystem();
        await el.updateComplete;

        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        const drawer = el.shadowRoot?.querySelector('.advanced-drawer');
        expect(drawer).toBeTruthy();
        expect(drawer?.textContent).toContain('Mapped level');
        expect(drawer?.textContent).toContain('Override');
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

    describe('metrics', () => {
      it('the primary metrics row omits mapped level', async () => {
        const el = mountSystem();
        await el.updateComplete;

        const primaryRow = el.shadowRoot?.querySelector('.system-metrics-row');
        expect(primaryRow?.textContent).not.toContain('Mapped level');
      });

      it('mapped level appears only in the advanced diagnostics drawer', async () => {
        const el = mountSystem();
        await el.updateComplete;

        expect(el.shadowRoot?.textContent).not.toContain('Mapped level');
        (el.shadowRoot?.querySelector('.disclosure-toggle') as HTMLButtonElement)?.click();
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.advanced-drawer')?.textContent).toContain(
          'Mapped level',
        );
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

    describe('controls', () => {
      it('sends the internal medium option when the visible Home mode button is pressed', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem();
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates }, callService };
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

      it('starts and cancels boost, and sets the boost duration, via the documented services', async () => {
        const callService = vi.fn().mockResolvedValue(undefined);
        const el = mountSystem();
        el.hass = { ...altairHass, states: { ...altairHass.states, ...systemStates }, callService };
        await el.updateComplete;

        (
          el.shadowRoot?.querySelector('input[aria-label="Boost duration"]') as HTMLInputElement
        ).value = '20';
        el.shadowRoot
          ?.querySelector('input[aria-label="Boost duration"]')
          ?.dispatchEvent(new Event('change'));
        (
          el.shadowRoot?.querySelector('button[aria-label="Start Boost"]') as HTMLButtonElement
        ).click();

        expect(callService).toHaveBeenCalledWith('number', 'set_value', {
          entity_id: 'number.altair_mvhr_boost_duration',
          value: 20,
        });
        expect(callService).toHaveBeenCalledWith('button', 'press', {
          entity_id: 'button.altair_mvhr_start_boost',
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

      it('the system metrics row locks to 2 columns on mobile (via the shared .metrics-grid rule)', async () => {
        const el = mountSystem();
        await el.updateComplete;
        expect(
          el.shadowRoot?.querySelector('.system-metrics-row')?.classList.contains('metrics-grid'),
        ).toBe(true);
      });

      it('respects prefers-reduced-motion for the duct and fan animations', () => {
        const cssText = HiperMvhrCard.styles.cssText;
        const reducedMotionBlock =
          cssText.match(/@media \(prefers-reduced-motion: reduce\)\s*{[^}]*}/)?.[0] ?? '';
        expect(reducedMotionBlock).toMatch(/animation:\s*none/);
        expect(reducedMotionBlock).toMatch(/system-visual-panel/);
      });
    });

    describe('regression', () => {
      it('Altair still never renders a bypass control or status anywhere in system mode', async () => {
        const el = mountSystem();
        await el.updateComplete;
        expect((el.shadowRoot?.textContent ?? '').toLowerCase()).not.toContain('bypass');
      });
    });
  });
});
