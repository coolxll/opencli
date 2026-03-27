import { describe, expect, it, vi } from 'vitest';

const { mockSendCommand } = vi.hoisted(() => ({
  mockSendCommand: vi.fn(),
}));

vi.mock('./daemon-client.js', () => ({
  sendCommand: mockSendCommand,
}));

import { Page } from './page.js';

describe('Page.goto', () => {
  it('fails fast when navigate returns the internal blank page', async () => {
    mockSendCommand.mockResolvedValueOnce({
      tabId: 11,
      url: 'data:text/html,<html></html>',
      timedOut: true,
    });

    const page = new Page('site:v2ex');

    await expect(page.goto('https://www.v2ex.com')).rejects.toThrow(
      'Navigation failed for https://www.v2ex.com: browser remained on data:text/html,<html></html>',
    );
    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    expect(mockSendCommand).toHaveBeenCalledWith('navigate', {
      url: 'https://www.v2ex.com',
      workspace: 'site:v2ex',
    });
  });
});
