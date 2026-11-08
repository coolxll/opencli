import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  closeAllTrackedBrowsers,
  closeTrackedBrowser,
  discoverProbeUrl,
  extractUserDataDir,
  loadTrackedBrowsers,
  releaseProfileLocks,
  session0TrackerHooks,
  toPlatformPath,
  trackBrowserProcess,
} from './session0-tracker.js';

describe('session0-tracker', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-tracker-test-'));
    vi.stubEnv('OPENCLI_CONFIG_DIR', tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('extracts userDataDir from arguments', () => {
    expect(extractUserDataDir(['--user-data-dir=C:\\Workspace\\chrome-debug'])).toBe('C:\\Workspace\\chrome-debug');
    expect(extractUserDataDir(['--user-data-dir', '/tmp/chrome-test'])).toBe('/tmp/chrome-test');
    expect(extractUserDataDir(['--headless', '--remote-debugging-port=9222'])).toBeUndefined();
  });

  it('converts Windows drive paths to WSL paths on linux', () => {
    if (process.platform === 'linux') {
      expect(toPlatformPath('C:\\Workspace\\chrome-debug')).toBe('/mnt/c/Workspace/chrome-debug');
      expect(toPlatformPath('D:/Data/Profile')).toBe('/mnt/d/Data/Profile');
    } else {
      expect(toPlatformPath('C:\\Workspace\\chrome-debug')).toBe('C:\\Workspace\\chrome-debug');
    }
  });

  it('releases profile locks in the userDataDir', () => {
    const profileDir = path.join(tempDir, 'user-data');
    fs.mkdirSync(profileDir, { recursive: true });

    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile', 'Lockfile'];
    for (const name of lockFiles) {
      fs.writeFileSync(path.join(profileDir, name), 'locked');
    }

    releaseProfileLocks(profileDir);

    for (const name of lockFiles) {
      expect(fs.existsSync(path.join(profileDir, name))).toBe(false);
    }
  });

  it('discovers probe url from DevToolsActivePort in userDataDir', () => {
    const profileDir = path.join(tempDir, 'user-data');
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(path.join(profileDir, 'DevToolsActivePort'), '9222\n/devtools/browser/abc\n');

    expect(discoverProbeUrl(profileDir)).toBe('http://127.0.0.1:9222/json/version');
  });

  it('persists and loads tracked browser processes', () => {
    trackBrowserProcess({
      pid: 12345,
      executable: 'chrome.exe',
      args: ['--user-data-dir=/tmp/test'],
      userDataDir: '/tmp/test',
      launchedAt: Date.now(),
    });

    const loaded = loadTrackedBrowsers();
    expect(loaded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pid: 12345,
          executable: 'chrome.exe',
          userDataDir: '/tmp/test',
        }),
      ]),
    );
  });

  it('prioritizes CDP Browser.close when closing a tracked browser', async () => {
    const cdpSpy = vi.spyOn(session0TrackerHooks, 'closeBrowserViaCdp').mockResolvedValue(true);
    const aliveSpy = vi.spyOn(session0TrackerHooks, 'isProcessAlive').mockReturnValue(false);
    const killSpy = vi.spyOn(session0TrackerHooks, 'terminateProcess');
    const lockSpy = vi.spyOn(session0TrackerHooks, 'releaseProfileLocks');

    await closeTrackedBrowser({
      pid: 45678,
      probeUrl: 'http://127.0.0.1:9222/json/version',
      userDataDir: '/tmp/chrome-test',
      args: [],
      launchedAt: Date.now(),
    });

    expect(cdpSpy).toHaveBeenCalledWith('http://127.0.0.1:9222/json/version', expect.any(Number));
    expect(killSpy).not.toHaveBeenCalled();
    expect(lockSpy).toHaveBeenCalledWith('/tmp/chrome-test');
  });

  it('falls back to process termination if CDP close fails or process remains alive', async () => {
    vi.spyOn(session0TrackerHooks, 'closeBrowserViaCdp').mockResolvedValue(false);
    let aliveCalls = 0;
    vi.spyOn(session0TrackerHooks, 'isProcessAlive').mockImplementation(() => {
      aliveCalls++;
      return aliveCalls < 20; // stays alive during timeout
    });
    const killSpy = vi.spyOn(session0TrackerHooks, 'terminateProcess').mockImplementation(() => undefined);
    const lockSpy = vi.spyOn(session0TrackerHooks, 'releaseProfileLocks');

    await closeTrackedBrowser({
      pid: 99999,
      probeUrl: 'http://127.0.0.1:9222/json/version',
      userDataDir: '/tmp/chrome-test',
      args: [],
      launchedAt: Date.now(),
    }, { cdpTimeoutMs: 50, killTimeoutMs: 150 });

    expect(killSpy).toHaveBeenCalledWith(99999);
    expect(lockSpy).toHaveBeenCalledWith('/tmp/chrome-test');
  });

  it('closeAllTrackedBrowsers clears registry after closing', async () => {
    trackBrowserProcess({
      pid: 11111,
      userDataDir: '/tmp/p1',
      args: [],
      launchedAt: Date.now(),
    });

    vi.spyOn(session0TrackerHooks, 'closeBrowserViaCdp').mockResolvedValue(true);
    vi.spyOn(session0TrackerHooks, 'isProcessAlive').mockReturnValue(false);

    await closeAllTrackedBrowsers({ cdpTimeoutMs: 50, killTimeoutMs: 50 });

    expect(loadTrackedBrowsers()).toEqual([]);
  });
});
