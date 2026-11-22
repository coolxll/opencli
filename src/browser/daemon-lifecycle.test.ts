import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: mocks.spawn,
}));

import { spawnDaemonProcess } from './daemon-lifecycle.js';

describe('spawnDaemonProcess', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('attaches a no-crash error listener before unref', () => {
    const fakeProc = Object.assign(new EventEmitter(), {
      unref: vi.fn(),
    });
    mocks.spawn.mockReturnValue(fakeProc);

    const proc = spawnDaemonProcess();

    expect(proc).toBe(fakeProc);
    expect(fakeProc.listenerCount('error')).toBeGreaterThanOrEqual(1);
    expect(fakeProc.unref).toHaveBeenCalledTimes(1);
    // Emitting an error must not throw an uncaught error event
    expect(() => fakeProc.emit('error', new Error('ENOENT'))).not.toThrow();
  });
});
