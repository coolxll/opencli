import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ status: vi.fn(), stop: vi.fn(), restart: vi.fn(), waitForStop: vi.fn() }));
vi.mock('../browser/daemon-transport.js', () => ({
  fetchDaemonStatus: mocks.status,
  requestDaemonShutdown: mocks.stop,
  getDaemonHealth: vi.fn(),
}));
vi.mock('../browser/daemon-lifecycle.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../browser/daemon-lifecycle.js')>();
  return { ...actual, restartDaemon: mocks.restart };
});
import { daemonLifecycleHooks } from '../browser/daemon-lifecycle.js';
import { daemonStatus, daemonStop, daemonRestart } from './daemon.js';
import { BrowserConnectError, EXIT_CODES } from '../errors.js';
import { PKG_VERSION } from '../version.js';

let stdout: ReturnType<typeof vi.spyOn>;
const status = { daemonVersion: PKG_VERSION, pid: 42, uptime: 60, extensionConnected: true, memoryMB: 32, port: 19825 };
function result() {
  expect(stdout).toHaveBeenCalledTimes(1);
  return JSON.parse(stdout.mock.calls[0][0]);
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(daemonLifecycleHooks, 'waitForDaemonStop').mockImplementation((ms) => mocks.waitForStop(ms));
  stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  process.exitCode = undefined;
});
afterEach(() => { vi.restoreAllMocks(); process.exitCode = undefined; });
describe('daemon structured output', () => {
  it('reports an unreachable daemon', async () => {
    mocks.status.mockResolvedValue(null); await daemonStatus();
    expect(result()).toEqual({ ok: true, data: { running: false } });
  });
  it('preserves running daemon facts', async () => {
    mocks.status.mockResolvedValue(status); await daemonStatus();
    expect(result()).toEqual({ ok: true, data: { ...status, running: true, stale: false } });
  });
  it.each(['profileRequired', 'profileDisconnected'])('preserves %s and supplies a recovery hint', async flag => {
    mocks.status.mockResolvedValue({ ...status, extensionConnected: false, [flag]: true }); await daemonStatus();
    expect(result().data).toMatchObject({ [flag]: true, hint: expect.stringContaining('opencli profile use') });
  });
  it('distinguishes zero connected profiles from missing selection', async () => {
    mocks.status.mockResolvedValue({ ...status, extensionConnected: false, profiles: [] }); await daemonStatus();
    expect(result().data).toMatchObject({ extensionConnected: false, profiles: [] });
  });
  it('reports stale daemon versions', async () => {
    mocks.status.mockResolvedValue({ ...status, daemonVersion: '0.0.1' }); await daemonStatus();
    expect(result().data.stale).toBe(true);
  });
  it('does not report a daemon from a newer CLI as stale', async () => {
    mocks.status.mockResolvedValue({ ...status, daemonVersion: '999.0.0' }); await daemonStatus();
    expect(result().data.stale).toBe(false);
  });
  it('stops idempotently when absent', async () => {
    mocks.status.mockResolvedValue(null); await daemonStop();
    expect(result().data).toEqual({ running: false, stopped: false }); expect(mocks.stop).not.toHaveBeenCalled();
  });
  it('stops a running daemon and waits for exit', async () => {
    mocks.status.mockResolvedValue(status);
    mocks.stop.mockResolvedValue(true);
    mocks.waitForStop.mockResolvedValue(true);
    await daemonStop();
    expect(mocks.waitForStop).toHaveBeenCalledWith(3000);
    expect(result().data).toEqual({ running: false, stopped: true });
  });
  it('falls back to SIGTERM and SIGKILL if daemon does not exit after /shutdown', async () => {
    mocks.status.mockResolvedValue(status);
    mocks.stop.mockResolvedValue(true);
    mocks.waitForStop
      .mockResolvedValueOnce(false) // after /shutdown
      .mockResolvedValueOnce(false) // after SIGTERM
      .mockResolvedValueOnce(true); // after SIGKILL
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    await daemonStop();

    expect(killSpy).toHaveBeenNthCalledWith(1, status.pid, 'SIGTERM');
    expect(killSpy).toHaveBeenNthCalledWith(2, status.pid, 'SIGKILL');
    expect(result().data).toEqual({ running: false, stopped: true });
  });
  it('reports failure if daemon remains alive after SIGTERM and SIGKILL fallback', async () => {
    mocks.status.mockResolvedValue(status);
    mocks.stop.mockResolvedValue(true);
    mocks.waitForStop.mockResolvedValue(false);
    vi.spyOn(process, 'kill').mockImplementation(() => true);

    await daemonStop();

    expect(result().error.code).toBe('daemon_stop_failed');
    expect(process.exitCode).toBe(1);
  });
  it('falls through to SIGTERM/SIGKILL when POST /shutdown fails or times out', async () => {
    mocks.status.mockResolvedValue(status);
    mocks.stop.mockResolvedValue(false);
    mocks.waitForStop
      .mockResolvedValueOnce(false) // after SIGTERM
      .mockResolvedValueOnce(true); // after SIGKILL
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    await daemonStop();

    expect(killSpy).toHaveBeenNthCalledWith(1, status.pid, 'SIGTERM');
    expect(killSpy).toHaveBeenNthCalledWith(2, status.pid, 'SIGKILL');
    expect(result().data).toEqual({ running: false, stopped: true });
  });
  it('skips process.kill when POST /shutdown fails and health re-check shows daemon already stopped', async () => {
    mocks.status
      .mockResolvedValueOnce(status) // initial check
      .mockResolvedValueOnce(null);  // re-check after failed /shutdown
    mocks.stop.mockResolvedValue(false);
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    await daemonStop();

    expect(killSpy).not.toHaveBeenCalled();
    expect(mocks.waitForStop).not.toHaveBeenCalled();
    expect(result().data).toEqual({ running: false, stopped: true });
  });
  it('succeeds when POST /shutdown fails because daemon already exited (ESRCH)', async () => {
    mocks.status.mockResolvedValue(status);
    mocks.stop.mockResolvedValue(false);
    mocks.waitForStop.mockResolvedValueOnce(true);
    const esrch = Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw esrch; });

    await daemonStop();

    expect(killSpy).toHaveBeenCalledWith(status.pid, 'SIGTERM');
    expect(result().data).toEqual({ running: false, stopped: true });
  });
  it('reports a shutdown failure when /shutdown and signal fallbacks all fail', async () => {
    mocks.status.mockResolvedValue(status);
    mocks.stop.mockResolvedValue(false);
    mocks.waitForStop.mockResolvedValue(false);
    vi.spyOn(process, 'kill').mockImplementation(() => true);
    await daemonStop();
    expect(result().error.code).toBe('daemon_stop_failed');
    expect(process.exitCode).toBe(1);
  });
  it.each([true, false])('reports restart action when previous daemon exists: %s', async previous => {
    mocks.restart.mockResolvedValue({ stopped: true, status, previousStatus: previous ? status : null }); await daemonRestart();
    expect(result().data).toEqual({ action: previous ? 'restarted' : 'started', status });
  });
  it('reports restart stop failure', async () => {
    mocks.restart.mockResolvedValue({ stopped: false }); await daemonRestart();
    expect(result().error.code).toBe('daemon_stop_failed'); expect(process.exitCode).toBe(1);
  });
  it('reports unknown outcome after a restart timeout', async () => {
    mocks.restart.mockResolvedValue({ stopped: true, status: null }); await daemonRestart();
    expect(result().error).toMatchObject({ code: 'outcome_unknown', outcome: 'unknown' });
  });
  it('reports Session 0 startup refusal as service unavailable', async () => {
    mocks.restart.mockRejectedValue(new BrowserConnectError(
      'Refusing to start OpenCLI background processes in Windows Session 0',
      'Run only when user is logged on',
      'daemon-not-running',
    ));

    await daemonRestart();

    expect(result().error).toMatchObject({
      code: 'service_unavailable',
      message: expect.stringContaining('Session 0'),
      hint: expect.stringContaining('Run only when user is logged on'),
    });
    expect(process.exitCode).toBe(EXIT_CODES.SERVICE_UNAVAIL);
  });
});
