import { cli, Strategy } from '../../registry.js';
import { SelectorError } from '../../errors.js';
import type { IPage } from '../../types.js';
import { lingmaRequiredEnv } from './shared.js';
import { sendLingmaMessage } from './helpers.js';

export const sendCommand = cli({
  site: 'lingma',
  name: 'send',
  description: 'Send a message to the active Lingma sidebar conversation',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [{ name: 'text', required: true, positional: true, help: 'Message to send' }],
  columns: ['Status', 'InjectedText'],
  func: async (page: IPage, kwargs: any) => {
    const text = kwargs.text as string;

    const sent = await sendLingmaMessage(page, text);
    if (!sent) {
      throw new SelectorError('Lingma chat input (.chat-input-contenteditable)');
    }

    return [
      {
        Status: 'Success',
        InjectedText: text,
      },
    ];
  },
});
