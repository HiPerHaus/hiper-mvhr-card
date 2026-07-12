import { describe, it, expect, afterEach } from 'vitest';
import { HiperMvhrCard } from '../../src/components/hiper-mvhr-card';
import { altairHass } from '../fixtures/hass-altair-160';
import { zehnderHass } from '../fixtures/hass-zehnder-comfoair-q';
import { aerofreshHass } from '../fixtures/hass-aerofresh';

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
      expect(cssText).not.toMatch(/height:\s*\d/);
    });
  });
});
