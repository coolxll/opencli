import { cli, Strategy } from '../../registry.js';
import { SelectorError } from '../../errors.js';
import type { IPage } from '../../types.js';
import { lingmaRequiredEnv } from './shared.js';
import {
  countLingmaMessages,
  ensureLingmaEditorMode,
  sendLingmaMessage,
  waitForLingmaResponse,
  type LingmaMessage,
} from './helpers.js';

export const askCommand = cli({
  site: 'lingma',
  name: 'ask',
  description: 'Send a prompt and wait for the Lingma response (send + wait + read)',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [
    { name: 'text', required: true, positional: true, help: 'Prompt to send' },
    { name: 'timeout', required: false, help: 'Max seconds to wait (default: 60)', default: '60' },
  ],
  columns: ['Role', 'Type', 'Text'],
  func: async (page: IPage, kwargs: any) => {
    const text = kwargs.text as string;
    const timeout = parseInt(kwargs.timeout as string, 10) || 60;

    await ensureLingmaEditorMode(page);
    const beforeCount = await countLingmaMessages(page);
    const sent = await sendLingmaMessage(page, text);
    if (!sent) throw new SelectorError('Lingma chat input (.chat-input-contenteditable)');

    const result = await waitForLingmaResponse(page, beforeCount, timeout);
    if (!result.timedOut) {
      return result.rows;
    }

    if (result.rows.length > 0) {
      return [
        ...result.rows,
        { Role: 'System', Type: 'status', Text: `Timed out after ${timeout}s while waiting for Lingma to finish responding.` },
      ];
    }

    return [
      { Role: 'User', Type: 'message', Text: text },
      { Role: 'System', Type: 'status', Text: `No response received within ${timeout}s.` },
    ];
  },
});
