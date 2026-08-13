import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { windowsSessionHooks } from '../windows-session.js';

import {
  browserAutostartHooks,
  disableBrowserAutostart,
  launchConfiguredBrowser,
  loadBrowserAutostartState,
  saveBrowserAutostartConfig,
} from './autostart.js';

describe('browser autostart configuration', () => {
  let configDir: string;

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-browser-autostart-'));
    vi.stubEnv('OPENCLI_CONFIG_DIR', configDir);
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('linux');
    vi.spyOn(windowsSessionHooks, 'isWslWindowsHost').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(configDir, { recursive: true, force: true });
  });

  it('is disabled when no configuration exists', () => {
    expect(loadBrowserAutostartState().config).toEqual({ version: 1, enabled: false, args: [] });
  });

  it('stores executable and arguments and infers a CDP probe URL', () => {
    const state = saveBrowserAutostartConfig({
      executable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--user-data-dir=C:\\Workspace\\chrome-debug', '--remote-debugging-port=9222'],
    });

    expect(state.config).toMatchObject({
      enabled: true,
      executable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      probeUrl: 'http://127.0.0.1:9222/json/version',
    });
    expect(loadBrowserAutostartState().config).toEqual(state.config);
  });

  it('preserves the launch command when disabled', () => {
    saveBrowserAutostartConfig({ executable: '/usr/bin/chromium', args: ['--profile-directory=Work'] });
    expect(disableBrowserAutostart().config).toEqual({
      version: 1,
      enabled: false,
      executable: '/usr/bin/chromium',
      args: ['--profile-directory=Work'],
    });
  });

  it('does not spawn when the configured probe is already reachable', async () => {
    saveBrowserAutostartConfig({
      executable: '/usr/bin/chromium',
      args: ['--remote-debugging-port=9222'],
    });
    vi.spyOn(browserAutostartHooks, 'probeConfiguredBrowser').mockResolvedValue(true);
    const spawnSpy = vi.spyOn(browserAutostartHooks, 'spawnConfiguredBrowser');

    await expect(launchConfiguredBrowser()).resolves.toMatchObject({
      attempted: true,
      launched: false,
      reason: 'already-running',
    });
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('spawns the configured executable without a shell', async () => {
    saveBrowserAutostartConfig({ executable: '/usr/bin/chromium', args: ['--user-data-dir=/tmp/opencli'] });
    const spawnSpy = vi.spyOn(browserAutostartHooks, 'spawnConfiguredBrowser').mockResolvedValue();

    await expect(launchConfiguredBrowser()).resolves.toMatchObject({ attempted: true, launched: true });
    expect(spawnSpy).toHaveBeenCalledWith('/usr/bin/chromium', ['--user-data-dir=/tmp/opencli']);
  });

  it('does not spawn a configured browser from Windows Session 0', async () => {
    saveBrowserAutostartConfig({ executable: 'chrome.exe', args: ['--user-data-dir=C:\\Workspace\\chrome-debug'] });
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);
    const spawnSpy = vi.spyOn(browserAutostartHooks, 'spawnConfiguredBrowser');

    await expect(launchConfiguredBrowser()).resolves.toMatchObject({
      attempted: false,
      reason: 'windows-session-0',
      error: expect.stringContaining('Session 0'),
    });
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('can reuse an already-running configured browser from Windows Session 0', async () => {
    saveBrowserAutostartConfig({
      executable: 'chrome.exe',
      args: ['--remote-debugging-port=9222'],
    });
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);
    vi.spyOn(browserAutostartHooks, 'probeConfiguredBrowser').mockResolvedValue(true);
    const spawnSpy = vi.spyOn(browserAutostartHooks, 'spawnConfiguredBrowser');

    await expect(launchConfiguredBrowser()).resolves.toMatchObject({
      attempted: true,
      launched: false,
      reason: 'already-running',
    });
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
