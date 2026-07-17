import { cli, Strategy } from '@jackwener/opencli/registry';
import { selectorError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';
import { lingmaRequiredEnv } from './shared.js';
import { startLingmaNewConversation } from './helpers.js';

export const newCommand = cli({
  site: 'lingma',
  name: 'new',
  access: 'write',
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
      throw selectorError('Lingma new conversation button');
    }

    return [{ Status: 'Success' }];
  },
});
