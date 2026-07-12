import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/hiper-mvhr-card';
import type { HiperMvhrCard } from '../../src/components/hiper-mvhr-card';
import { altairHass } from '../fixtures/hass-altair-160';
import { zehnderHass } from '../fixtures/hass-zehnder-comfoair-q';

function mount(): HiperMvhrCard {
  const el = document.createElement('hiper-mvhr-card') as HiperMvhrCard;
  document.body.appendChild(el);
  return el;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => el.setConfig({ manufacturer: 'not-a-real-brand' } as any)).not.toThrow();
    el.hass = altairHass;
    await el.updateComplete;
    expect(el.shadowRoot?.textContent).toMatch(/unknown manufacturer/i);
  });

  it('renders configured temperatures for Altair and omits bypass entirely', async () => {
    const el = mount();
    el.setConfig({
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'altair',
      entities: {
        supply_air_temp: 'sensor.altair_supply_temp',
        extract_air_temp: 'sensor.altair_extract_temp',
      },
    });
    el.hass = altairHass;
    await el.updateComplete;

    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toContain('19.4');
    expect(text).toContain('21.1');
    expect(text.toLowerCase()).not.toContain('bypass');
  });

  it('renders a bypass row for a manufacturer that supports it', async () => {
    const el = mount();
    el.setConfig({
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'zehnder-comfoair-q',
      entities: { bypass_state: 'binary_sensor.comfoair_bypass' },
    });
    el.hass = zehnderHass;
    await el.updateComplete;

    expect((el.shadowRoot?.textContent ?? '').toLowerCase()).toContain('bypass');
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

  it('shows "Not configured" for a supported role with no mapped entity', async () => {
    const el = mount();
    el.setConfig({
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'altair',
      entities: {},
    });
    el.hass = altairHass;
    await el.updateComplete;

    expect(el.shadowRoot?.textContent).toMatch(/not configured/i);
  });
});
