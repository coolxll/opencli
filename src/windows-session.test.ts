import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WINDOWS_SESSION0_AUTOSTART_ENV,
  getWindowsSessionAutostartBlock,
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
    expect(sessionSpy).not.toHaveBeenCalled();
  });

  it('blocks process creation in Windows Session 0', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);

    expect(getWindowsSessionAutostartBlock({})).toMatchObject({
      sessionId: 0,
      message: expect.stringContaining('Session 0'),
      hint: expect.stringContaining('Run only when user is logged on'),
    });
  });

  it('blocks Windows process creation from WSL when its host process is in Session 0', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('linux');
    vi.spyOn(windowsSessionHooks, 'isWslWindowsHost').mockReturnValue(true);
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(0);

    expect(getWindowsSessionAutostartBlock({})).toMatchObject({
      sessionId: 0,
      message: expect.stringContaining('Session 0'),
    });
  });

  it('allows process creation in an interactive Windows session', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(1);

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
  });

  it('allows an explicit Session 0 override', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    const sessionSpy = vi.spyOn(windowsSessionHooks, 'getCurrentSessionId');

    expect(getWindowsSessionAutostartBlock({ [WINDOWS_SESSION0_AUTOSTART_ENV]: '1' })).toBeNull();
    expect(sessionSpy).not.toHaveBeenCalled();
  });

  it('fails open when the Windows session cannot be detected', () => {
    vi.spyOn(windowsSessionHooks, 'platform').mockReturnValue('win32');
    vi.spyOn(windowsSessionHooks, 'getCurrentSessionId').mockReturnValue(null);

    expect(getWindowsSessionAutostartBlock({})).toBeNull();
  });
});
