import { cli, Strategy } from '../../registry.js';
import { SelectorError } from '../../errors.js';
import type { IPage } from '../../types.js';
import { lingmaRequiredEnv } from './shared.js';
import { startLingmaNewConversation } from './helpers.js';

export const newCommand = cli({
  site: 'lingma',
  name: 'new',
  description: 'Start a new Lingma conversation',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [],
  columns: ['Status'],
  func: async (page: IPage) => {
    const started = await startLingmaNewConversation(page);
    if (!started) {
      throw new SelectorError('Lingma new conversation button');
    }

    return [{ Status: 'Success' }];
  },
});
