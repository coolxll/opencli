import { cli, Strategy } from '../../registry.js';
import { lingmaRequiredEnv } from './shared.js';

export const statusCommand = cli({
  site: 'lingma',
  name: 'status',
  description: 'Check active CDP connection to Lingma Desktop',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [],
  columns: ['Status', 'Url', 'Title'],
  func: async (page) => {
    const url = await page.evaluate('window.location.href');
    const title = await page.evaluate('document.title');
    return [{ Status: 'Connected', Url: url, Title: title }];
  },
});
