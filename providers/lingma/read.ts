import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';
import { lingmaRequiredEnv } from './shared.js';
import { extractLingmaMessages } from './helpers.js';

export const readCommand = cli({
  site: 'lingma',
  name: 'read',
  access: 'read',
  description: 'Read the current Lingma conversation history',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [
    { name: 'last', type: 'int', required: false, help: 'Return only the last N top-level conversation items' },
  ],
  columns: ['Role', 'Type', 'Text'],
  func: async (page: IPage, kwargs: any) => {
    const last = typeof kwargs.last === 'number' ? kwargs.last : undefined;
    const history = await extractLingmaMessages(page, last);

    if (!history || !Array.isArray(history) || history.length === 0) {
      throw new EmptyResultError('lingma read', 'No conversation history found in Lingma.');
    }

    return history;
  },
});
