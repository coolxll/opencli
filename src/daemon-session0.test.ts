import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_DAEMON_IDLE_TIMEOUT_MS,
  DEFAULT_SESSION0_IDLE_TIMEOUT_MS,
  Session0IdleManager,
  getDaemonIdleTimeoutMs,
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

  it('resolves cross-platform OPENCLI_DAEMON_IDLE_TIMEOUT with 0 disabling', () => {
    expect(getDaemonIdleTimeoutMs({}, false)).toBe(DEFAULT_DAEMON_IDLE_TIMEOUT_MS);
    expect(getDaemonIdleTimeoutMs({ OPENCLI_DAEMON_IDLE_TIMEOUT: '120' }, false)).toBe(120_000);
    expect(getDaemonIdleTimeoutMs({ OPENCLI_DAEMON_IDLE_TIMEOUT: '0' }, false)).toBe(0);
    expect(getDaemonIdleTimeoutMs({ OPENCLI_DAEMON_IDLE_TIMEOUT: 'invalid' }, false)).toBe(DEFAULT_DAEMON_IDLE_TIMEOUT_MS);
    // Session 0 prefers OPENCLI_SESSION0_IDLE_TIMEOUT, falls back to OPENCLI_DAEMON_IDLE_TIMEOUT
    expect(getDaemonIdleTimeoutMs({}, true)).toBe(DEFAULT_SESSION0_IDLE_TIMEOUT_MS);
    expect(getDaemonIdleTimeoutMs({ OPENCLI_SESSION0_IDLE_TIMEOUT: '45', OPENCLI_DAEMON_IDLE_TIMEOUT: '300' }, true)).toBe(45_000);
    expect(getDaemonIdleTimeoutMs({ OPENCLI_DAEMON_IDLE_TIMEOUT: '300' }, true)).toBe(300_000);
    expect(getDaemonIdleTimeoutMs({ OPENCLI_DAEMON_IDLE_TIMEOUT: '0' }, true)).toBe(0);
  });

  it('supports cross-platform enabled mode and respects queued slot waiters', () => {
    const onTimeout = vi.fn();
    const manager = new Session0IdleManager({ enabled: true, timeoutMs: 30_000, onTimeout });

    // Queued slot waiter prevents arming even when pendingCount is 0
    manager.onIdle(0, 1);
    expect(manager.isArmed).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();

    // Once both pending and waiters reach 0, timer arms and fires
    manager.onIdle(0, 0);
    expect(manager.isArmed).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not arm when timeoutMs is 0', () => {
    const onTimeout = vi.fn();
    const manager = new Session0IdleManager({ enabled: true, timeoutMs: 0, onTimeout });
    manager.onIdle(0, 0);
    expect(manager.isArmed).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
