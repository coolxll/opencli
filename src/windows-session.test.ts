import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WINDOWS_SESSION0_AUTOSTART_ENV,
  getWindowsSessionAutostartBlock,
  isWindowsSession0,
  windowsSessionHooks,
} from './windows-session.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Windows session autostart policy', () => {
  it('does not apply outside Windows', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('linux');
    vi.spyOn(windowsSessionHooks, 'isWslWindowsHost').mockReturnValue(false);
    const sessionSpy = vi.spyOn(windowsSessionHooks, 'getCurrentSessionId');

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
    expect(isWindowsSession0({})).toBe(false);
    expect(sessionSpy).not.toHaveBeenCalled();
  });

  it('allows process creation in Windows Session 0 by default with controlled lifecycle', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
    expect(isWindowsSession0({})).toBe(true);
  });

  it('allows Windows process creation from WSL when host is in Session 0 by default', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('linux');
    vi.spyOn(windowsSessionHooks, 'isWslWindowsHost').mockReturnValue(true);
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
    expect(isWindowsSession0({})).toBe(true);
  });

  it('allows process creation in an interactive Windows session', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(1);

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
    expect(isWindowsSession0({})).toBe(false);
  });

  it('blocks process creation in Session 0 when explicitly disabled via environment', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);

    expect(getWindowsSessionAutostartBlock({ [WINDOWS_SESSION0_AUTOSTART_ENV]: '0' })).toMatchObject({
      sessionId: 0,
      message: expect.stringContaining('Session 0'),
      hint: expect.stringContaining('Run only when user is logged on'),
    });

    expect(getWindowsSessionAutostartBlock({ [WINDOWS_SESSION0_AUTOSTART_ENV]: 'false' })).toMatchObject({
      sessionId: 0,
      message: expect.stringContaining('Session 0'),
    });
  });

  it('allows process creation when OPENCLI_ALLOW_SESSION0_AUTOSTART=1', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);

    expect(getWindowsSessionAutostartBlock({ [WINDOWS_SESSION0_AUTOSTART_ENV]: '1' })).toBeNull();
  });

  it('fails open when the Windows session cannot be detected', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(null);

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
    expect(isWindowsSession0({})).toBe(false);
  });
});
