import type { HomeAssistant } from '../types/hass';

/**
 * Phase 3A: the generic mechanism for firing a Home Assistant service call
 * from the card and tracking whether that call is in flight or recently
 * failed.
 *
 * Scope note: this module deliberately does NOT implement optimistic
 * target-value tracking or reconciliation against a resolved snapshot value
 * (docs/architecture.md §8 step 6, ROADMAP.md Phase 3B). `filter_reset_control`
 * — the only role that uses this dispatcher today — is a fire-and-forget
 * action: pressing a Home Assistant `button`/`input_button` entity has no
 * target value to wait for, so "is a call pending" and "did the last call
 * fail" is the entire state machine this phase needs. Phase 3B's
 * `mode_control` (and Phase 3C's `bypass_control`, once verified) will
 * extend this dispatcher with a value-reconciliation mode rather than
 * replace it — see ROADMAP.md.
 *
 * No manufacturer-specific logic lives here, matching CLAUDE.md's one rule:
 * the service/domain used to fire an action is derived generically from the
 * entity id's domain (see `domainOf`/`ACTION_SERVICE_BY_DOMAIN` below), never
 * from which manufacturer profile is active.
 */

export type DispatchState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'error'; message: string };

export interface ControlDispatcherOptions {
  /** How long to wait for the service call to settle before giving up. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Home Assistant's own `button` and `input_button` platforms both expose a
 * `press` service — this is a documented fact about Home Assistant itself,
 * not a per-manufacturer assumption, so it's safe to hardcode generically.
 * If a real installation exposes its filter-reset action through some other
 * domain (e.g. a script), that's a gap to close once a manufacturer's
 * integration path is confirmed (see the "known integration path(s)" TBD
 * entries in docs/manufacturers/*.md) — not something to guess at here.
 */
const ACTION_SERVICE = 'press';

function domainOf(entityId: string): string {
  const [domain] = entityId.split('.');
  return domain ?? '';
}

/**
 * Dispatches one action-role's service call and exposes its current state.
 * One instance is expected per active control (see
 * src/components/hiper-mvhr-card.ts), kept alive across re-renders so its
 * pending/error state survives the component's next render pass.
 */
export class ControlDispatcher {
  private _state: DispatchState = { status: 'idle' };
  private readonly _listeners = new Set<() => void>();
  private readonly _timeoutMs: number;

  constructor(options: ControlDispatcherOptions = {}) {
    this._timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get state(): DispatchState {
    return this._state;
  }

  /** Subscribes to state changes; returns an unsubscribe function. */
  onChange(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _setState(next: DispatchState): void {
    this._state = next;
    for (const listener of this._listeners) {
      listener();
    }
  }

  /**
   * Fires a "press" action for the given entity id. Safe to call even when
   * `hass` or `hass.callService` isn't available (dev preview, tests with a
   * minimal fake hass) — it simply does nothing rather than throwing, per
   * the same "degrade, never fail" principle the rest of the card follows
   * (SPECIFICATION.md §6).
   */
  async dispatchAction(hass: HomeAssistant | undefined, entityId: string): Promise<void> {
    if (!hass?.callService) {
      return;
    }
    if (this._state.status === 'pending') {
      // Already in flight — ignore the extra click rather than double-fire.
      return;
    }

    this._setState({ status: 'pending' });

    const domain = domainOf(entityId);
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timeoutHandle = setTimeout(() => resolve('timeout'), this._timeoutMs);
    });

    try {
      const outcome = await Promise.race([
        hass.callService(domain, ACTION_SERVICE, { entity_id: entityId }).then(() => 'done' as const),
        timeout,
      ]);

      if (outcome === 'timeout') {
        this._setState({ status: 'error', message: 'Timed out waiting for a response.' });
        return;
      }
      this._setState({ status: 'idle' });
    } catch (err) {
      this._setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'The action failed.',
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
