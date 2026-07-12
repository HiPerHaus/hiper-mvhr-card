import { describe, it, expect, vi, afterEach } from 'vitest';
import { ControlDispatcher } from '../../src/data/control-dispatcher';
import type { HomeAssistant } from '../../src/types/hass';

/**
 * Phase 3A scope only: a fire-and-forget "press" action (filter_reset_control)
 * with no target value to reconcile against. Mode/bypass optimistic-value
 * reconciliation is Phase 3B/3C — not tested here because it doesn't exist
 * yet (see docs/architecture.md §8 step 6, ROADMAP.md).
 */

function hassWithCallService(impl: (...args: unknown[]) => Promise<unknown>): HomeAssistant {
  return {
    states: {},
    callService: impl as HomeAssistant['callService'],
  };
}

describe('ControlDispatcher.dispatchAction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls hass.callService with the domain derived from the entity id and a "press" service', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();

    await dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('button', 'press', {
      entity_id: 'button.mvhr_filter_reset',
    });
  });

  it('derives the domain generically — an input_button entity calls input_button.press', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();

    await dispatcher.dispatchAction(hass, 'input_button.mvhr_filter_reset');

    expect(callService).toHaveBeenCalledWith('input_button', 'press', {
      entity_id: 'input_button.mvhr_filter_reset',
    });
  });

  it('does nothing and does not throw when hass.callService is unavailable', async () => {
    const hass: HomeAssistant = { states: {} }; // no callService — dev preview / minimal fake hass
    const dispatcher = new ControlDispatcher();

    await expect(dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset')).resolves.toBeUndefined();
    expect(dispatcher.state).toEqual({ status: 'idle' });
  });

  it('does nothing and does not throw when hass itself is undefined', async () => {
    const dispatcher = new ControlDispatcher();
    await expect(dispatcher.dispatchAction(undefined, 'button.mvhr_filter_reset')).resolves.toBeUndefined();
    expect(dispatcher.state).toEqual({ status: 'idle' });
  });

  it('is in a pending state while the service call is in flight', async () => {
    let resolveCall!: () => void;
    const callService = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCall = resolve;
        }),
    );
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();

    const promise = dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');
    expect(dispatcher.state).toEqual({ status: 'pending' });

    resolveCall();
    await promise;
    expect(dispatcher.state).toEqual({ status: 'idle' });
  });

  it('ignores a second dispatch while one is already pending (no double-press)', async () => {
    let resolveCall!: () => void;
    const callService = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCall = resolve;
        }),
    );
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();

    const first = dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');
    const second = dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');
    expect(callService).toHaveBeenCalledTimes(1);

    resolveCall();
    await Promise.all([first, second]);
    expect(dispatcher.state).toEqual({ status: 'idle' });
  });

  it('transitions to an error state, with a message, when the service call rejects', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('service unavailable'));
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();

    await dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');

    expect(dispatcher.state).toMatchObject({ status: 'error', message: 'service unavailable' });
  });

  it('allows a fresh dispatch after a previous call errored (does not get stuck)', async () => {
    const callService = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();

    await dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');
    expect(dispatcher.state.status).toBe('error');

    await dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');
    expect(dispatcher.state).toEqual({ status: 'idle' });
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it('transitions to an error state if the call never settles within the timeout', async () => {
    vi.useFakeTimers();
    const callService = vi.fn(() => new Promise<void>(() => {})); // never resolves
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher({ timeoutMs: 1000 });

    const promise = dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');
    expect(dispatcher.state).toEqual({ status: 'pending' });

    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(dispatcher.state.status).toBe('error');
  });

  it('notifies subscribers whenever state changes', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();
    const listener = vi.fn();
    dispatcher.onChange(listener);

    await dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');

    // At least one notification for pending, one for the idle settle.
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('stops notifying after unsubscribing', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const hass = hassWithCallService(callService);
    const dispatcher = new ControlDispatcher();
    const listener = vi.fn();
    const unsubscribe = dispatcher.onChange(listener);
    unsubscribe();

    await dispatcher.dispatchAction(hass, 'button.mvhr_filter_reset');

    expect(listener).not.toHaveBeenCalled();
  });
});
