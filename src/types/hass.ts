/**
 * Minimal Home Assistant interfaces needed by this card — deliberately NOT a
 * copy of home-assistant-frontend's full type definitions. Only what this
 * card actually touches lives here, isolated so it can be swapped for
 * official types later without touching card logic. See docs/architecture.md.
 */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  callService?: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => Promise<unknown>;
}

/** Base contract Home Assistant expects from any Lovelace custom card element. */
export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: Record<string, unknown>): void;
  getCardSize?: () => number | Promise<number>;
}
