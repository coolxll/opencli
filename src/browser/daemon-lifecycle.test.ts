import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: mocks.spawn,
}));

import { daemonLifecycleHooks, restartDaemon, spawnDaemonProcess, stopDaemonWithFallback } from './daemon-lifecycle.js';
import type { DaemonStatus } from './daemon-transport.js';

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

describe('stopDaemonWithFallback & restartDaemon', () => {
  const runningStatus: DaemonStatus = {
    ok: true,
    daemonVersion: '1.0.0',
    pid: 4242,
    uptime: 60,
    extensionConnected: true,
    pending: 0,
    memoryMB: 32,
    port: 19825,
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('skips process.kill when POST /shutdown fails and health re-check shows daemon already stopped', async () => {
    vi.spyOn(daemonLifecycleHooks, 'requestDaemonShutdown').mockResolvedValue(false);
    vi.spyOn(daemonLifecycleHooks, 'fetchDaemonStatus').mockResolvedValue(null);
    const waitSpy = vi.spyOn(daemonLifecycleHooks, 'waitForDaemonStop');
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    const stopped = await stopDaemonWithFallback(runningStatus);

    expect(stopped).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
    expect(waitSpy).not.toHaveBeenCalled();
  });

  it('restartDaemon falls back to SIGTERM and SIGKILL when graceful shutdown fails/times out', async () => {
    const restartedStatus: DaemonStatus = { ...runningStatus, pid: 5252 };
    vi.spyOn(daemonLifecycleHooks, 'fetchDaemonStatus')
      .mockResolvedValueOnce(runningStatus) // initial status
      .mockResolvedValueOnce(runningStatus); // re-check after failed /shutdown
    vi.spyOn(daemonLifecycleHooks, 'requestDaemonShutdown').mockResolvedValue(false);
    vi.spyOn(daemonLifecycleHooks, 'waitForDaemonStop')
      .mockResolvedValueOnce(false) // after SIGTERM
      .mockResolvedValueOnce(true); // after SIGKILL
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const spawnSpy = vi.spyOn(daemonLifecycleHooks, 'spawnDaemonProcess').mockReturnValue({} as ReturnType<typeof spawnDaemonProcess>);
    vi.spyOn(daemonLifecycleHooks, 'waitForDaemonStatus').mockResolvedValue(restartedStatus);

    const result = await restartDaemon();

    expect(killSpy).toHaveBeenNthCalledWith(1, runningStatus.pid, 'SIGTERM');
    expect(killSpy).toHaveBeenNthCalledWith(2, runningStatus.pid, 'SIGKILL');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      previousStatus: runningStatus,
      status: restartedStatus,
      stopped: true,
      spawned: true,
    });
  });

  it('restartDaemon does not spawn when graceful shutdown and signal fallbacks all fail', async () => {
    vi.spyOn(daemonLifecycleHooks, 'fetchDaemonStatus').mockResolvedValue(runningStatus);
    vi.spyOn(daemonLifecycleHooks, 'requestDaemonShutdown').mockResolvedValue(true);
    vi.spyOn(daemonLifecycleHooks, 'waitForDaemonStop').mockResolvedValue(false);
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const spawnSpy = vi.spyOn(daemonLifecycleHooks, 'spawnDaemonProcess');

    const result = await restartDaemon({ stopTimeoutMs: 500 });

    expect(killSpy).toHaveBeenNthCalledWith(1, runningStatus.pid, 'SIGTERM');
    expect(killSpy).toHaveBeenNthCalledWith(2, runningStatus.pid, 'SIGKILL');
    expect(spawnSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      previousStatus: runningStatus,
      status: runningStatus,
      stopped: false,
      spawned: false,
    });
  });
});
