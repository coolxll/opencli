import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SESSION0_IDLE_TIMEOUT_MS,
  Session0IdleManager,
  getSession0IdleTimeoutMs,
} from './daemon-session0.js';

describe('daemon-session0 idle manager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reads timeout from environment or uses default', () => {
    expect(getSession0IdleTimeoutMs({})).toBe(DEFAULT_SESSION0_IDLE_TIMEOUT_MS);
    expect(getSession0IdleTimeoutMs({ OPENCLI_SESSION0_IDLE_TIMEOUT: '90' })).toBe(90_000);
    expect(getSession0IdleTimeoutMs({ OPENCLI_SESSION0_IDLE_TIMEOUT: 'invalid' })).toBe(DEFAULT_SESSION0_IDLE_TIMEOUT_MS);
  });

  it('does not arm idle timer when not in Session 0', () => {
    const onTimeout = vi.fn();
    const manager = new Session0IdleManager({ isSession0: false, onTimeout });

    manager.onIdle(0);
    expect(manager.isArmed).toBe(false);

    vi.advanceTimersByTime(120_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('arms idle timer in Session 0 when pendingCount is 0', () => {
    const onTimeout = vi.fn();
    const manager = new Session0IdleManager({ isSession0: true, timeoutMs: 60_000, onTimeout });

    manager.onIdle(0);
    expect(manager.isArmed).toBe(true);

    vi.advanceTimersByTime(30_000);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not trigger timeout when pending requests exist', () => {
    const onTimeout = vi.fn();
    const manager = new Session0IdleManager({ isSession0: true, timeoutMs: 60_000, onTimeout });

    manager.onIdle(1);
    expect(manager.isArmed).toBe(false);

    vi.advanceTimersByTime(120_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('resets timer on activity and restarts on idle', () => {
    const onTimeout = vi.fn();
    const manager = new Session0IdleManager({ isSession0: true, timeoutMs: 60_000, onTimeout });

    manager.onIdle(0);
    expect(manager.isArmed).toBe(true);

    vi.advanceTimersByTime(40_000);

    // Request comes in
    manager.onActivity();
    expect(manager.isArmed).toBe(false);

    vi.advanceTimersByTime(40_000);
    expect(onTimeout).not.toHaveBeenCalled();

    // Request settles
    manager.onIdle(0);
    expect(manager.isArmed).toBe(true);

    vi.advanceTimersByTime(59_000);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
