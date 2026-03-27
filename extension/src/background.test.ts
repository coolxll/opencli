import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener<T extends (...args: any[]) => void> = { addListener: (fn: T) => void };

type MockTab = {
  id: number;
  windowId: number;
  url?: string;
  title?: string;
  active?: boolean;
  status?: string;
};

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_url: string) {}
  send(_data: string): void {}
  close(): void {
    this.onclose?.();
  }
}

vi.mock('./cdp', () => ({
  registerListeners: vi.fn(),
  evaluateAsync: vi.fn(async (_tabId: number, code: string) => code),
  detach: vi.fn(async (_tabId?: number) => {}),
  screenshot: vi.fn(async (_tabId: number, _opts?: unknown) => 'mock-screenshot'),
}));

function createChromeMock() {
  let nextTabId = 10;
  const tabs: MockTab[] = [
    { id: 1, windowId: 1, url: 'https://automation.example', title: 'automation', active: true, status: 'complete' },
    { id: 2, windowId: 2, url: 'https://user.example', title: 'user', active: true, status: 'complete' },
    { id: 3, windowId: 1, url: 'chrome://extensions', title: 'chrome', active: false, status: 'complete' },
  ];

  const query = vi.fn(async (queryInfo: { windowId?: number } = {}) => {
    return tabs.filter((tab) => queryInfo.windowId === undefined || tab.windowId === queryInfo.windowId);
  });
  const create = vi.fn(async ({ windowId, url, active }: { windowId?: number; url?: string; active?: boolean }) => {
    const tab: MockTab = {
      id: nextTabId++,
      windowId: windowId ?? 999,
      url,
      title: url ?? 'blank',
      active: !!active,
      status: 'complete',
    };
    tabs.push(tab);
    return tab;
  });
  const update = vi.fn(async (tabId: number, updates: { active?: boolean; url?: string }) => {
    const tab = tabs.find((entry) => entry.id === tabId);
    if (!tab) throw new Error(`Unknown tab ${tabId}`);
    if (updates.active !== undefined) tab.active = updates.active;
    if (updates.url !== undefined) tab.url = updates.url;
    return tab;
  });

  const chrome = {
    tabs: {
      query,
      create,
      update,
      remove: vi.fn(async (_tabId: number) => {}),
      get: vi.fn(async (tabId: number) => {
        const tab = tabs.find((entry) => entry.id === tabId);
        if (!tab) throw new Error(`Unknown tab ${tabId}`);
        return tab;
      }),
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() } as Listener<(id: number, info: chrome.tabs.TabChangeInfo) => void>,
    },
    windows: {
      get: vi.fn(async (windowId: number) => ({ id: windowId })),
      create: vi.fn(async ({ url, focused, width, height, type, state }: any) => ({ id: 1, url, focused, width, height, type, state })),
      remove: vi.fn(async (_windowId: number) => {}),
      onRemoved: { addListener: vi.fn() } as Listener<(windowId: number) => void>,
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() } as Listener<(alarm: { name: string }) => void>,
    },
    runtime: {
      onInstalled: { addListener: vi.fn() } as Listener<() => void>,
      onStartup: { addListener: vi.fn() } as Listener<() => void>,
      onMessage: { addListener: vi.fn() } as Listener<(msg: unknown, sender: unknown, sendResponse: (value: unknown) => void) => void>,
      getManifest: vi.fn(() => ({ version: '1.4.1-test' })),
    },
    cookies: {
      getAll: vi.fn(async () => []),
    },
  };

  return { chrome, tabs, query, create, update };
}

describe('background tab isolation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lists only automation-window web tabs', async () => {
    const { chrome } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:twitter', 1);

    const result = await mod.__test__.handleTabs({ id: '1', action: 'tabs', op: 'list', workspace: 'site:twitter' }, 'site:twitter');

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([
      {
        index: 0,
        tabId: 1,
        url: 'https://automation.example',
        title: 'automation',
        active: true,
      },
    ]);
  });

  it('creates new tabs inside the automation window', async () => {
    const { chrome, create } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:twitter', 1);

    const result = await mod.__test__.handleTabs({ id: '2', action: 'tabs', op: 'new', url: 'https://new.example', workspace: 'site:twitter' }, 'site:twitter');

    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledWith({ windowId: 1, url: 'https://new.example', active: false });
  });

  it('creates automation windows minimized to avoid stealing foreground focus', async () => {
    const { chrome } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');

    const result = await mod.__test__.handleTabs({
      id: 'new-window',
      action: 'tabs',
      op: 'new',
      url: 'https://new.example',
      workspace: 'site:quiet',
    }, 'site:quiet');

    expect(result.ok).toBe(true);
    expect(chrome.windows.create).toHaveBeenCalledWith({
      url: 'data:text/html,<html></html>',
      focused: false,
      state: 'minimized',
      type: 'normal',
    });
  });

  it('does not bind a non-automation tab to the workspace session', async () => {
    const { chrome, tabs } = createChromeMock();
    tabs[1].url = 'https://example.com/';
    tabs[1].title = 'Example Domain';
    tabs[1].status = 'complete';
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:probe', null);

    const result = await mod.__test__.handleExec({
      id: 'foreign-tab',
      action: 'exec',
      workspace: 'site:probe',
      tabId: 2,
      code: 'window.location.href',
    }, 'site:probe');

    expect(result.ok).toBe(true);
    expect(mod.__test__.getAutomationWindowId('site:probe')).toBe(null);
  });

  it('keeps the workspace session on its own automation window when a foreign tab id is used', async () => {
    const { chrome, tabs } = createChromeMock();
    tabs[1].url = 'https://example.com/';
    tabs[1].title = 'Example Domain';
    tabs[1].status = 'complete';
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:probe', 1);

    const result = await mod.__test__.handleExec({
      id: 'keep-session',
      action: 'exec',
      workspace: 'site:probe',
      tabId: 2,
      code: 'window.location.href',
    }, 'site:probe');

    expect(result.ok).toBe(true);
    expect(mod.__test__.getAutomationWindowId('site:probe')).toBe(1);
  });

  it('refuses to close an explicit tab outside the automation window', async () => {
    const { chrome } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:probe', 1);

    await expect(mod.__test__.handleTabs({
      id: 'close-foreign',
      action: 'tabs',
      op: 'close',
      workspace: 'site:probe',
      tabId: 2,
    }, 'site:probe')).rejects.toThrow('Tab 2 is not in the automation window');
    expect(chrome.tabs.remove).not.toHaveBeenCalled();
  });

  it('treats normalized same-url navigate as already complete', async () => {
    const { chrome, tabs, update } = createChromeMock();
    tabs[0].url = 'https://www.bilibili.com/';
    tabs[0].title = 'bilibili';
    tabs[0].status = 'complete';
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:bilibili', 1);

    const result = await mod.__test__.handleNavigate(
      { id: 'same-url', action: 'navigate', url: 'https://www.bilibili.com', workspace: 'site:bilibili' },
      'site:bilibili',
    );

    expect(result).toEqual({
      id: 'same-url',
      ok: true,
      data: {
        title: 'bilibili',
        url: 'https://www.bilibili.com/',
        tabId: 1,
        timedOut: false,
      },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('fails navigate when the tab times out and stays on the internal blank page', async () => {
    vi.useFakeTimers();
    const { chrome, tabs } = createChromeMock();
    tabs[0].url = 'data:text/html,<html></html>';
    tabs[0].title = 'blank';
    tabs[0].status = 'complete';
    chrome.tabs.update = vi.fn(async (tabId: number, updates: { active?: boolean; url?: string }) => {
      const tab = tabs.find((entry) => entry.id === tabId);
      if (!tab) throw new Error(`Unknown tab ${tabId}`);
      if (updates.active !== undefined) tab.active = updates.active;
      return tab;
    }) as typeof chrome.tabs.update;
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:v2ex', 1);

    const promise = mod.__test__.handleNavigate(
      { id: 'blank-timeout', action: 'navigate', url: 'https://www.v2ex.com', workspace: 'site:v2ex' },
      'site:v2ex',
    );

    await vi.advanceTimersByTimeAsync(15_100);

    await expect(promise).resolves.toEqual({
      id: 'blank-timeout',
      ok: false,
      error: 'Navigation to https://www.v2ex.com timed out and stayed on data:text/html,<html></html>',
    });
  });

  it('keeps hash routes distinct when comparing target URLs', async () => {
    const { chrome } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');

    expect(mod.__test__.isTargetUrl('https://example.com/', 'https://example.com')).toBe(true);
    expect(mod.__test__.isTargetUrl('https://example.com/#feed', 'https://example.com/#settings')).toBe(false);
    expect(mod.__test__.isTargetUrl('https://example.com/app/', 'https://example.com/app')).toBe(false);
  });

  it('reports sessions per workspace', async () => {
    const { chrome } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./background');
    mod.__test__.setAutomationWindowId('site:twitter', 1);
    mod.__test__.setAutomationWindowId('site:zhihu', 2);

    const result = await mod.__test__.handleSessions({ id: '3', action: 'sessions' });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ workspace: 'site:twitter', windowId: 1 }),
      expect.objectContaining({ workspace: 'site:zhihu', windowId: 2 }),
    ]));
  });
});
