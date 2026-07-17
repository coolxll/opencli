import { cli, Strategy } from '@jackwener/opencli/registry';
import { getCounts } from './utils.js';

cli({
    site: 'feedly',
    name: 'counts',
    access: 'read',
    description: 'List Feedly unread marker counts',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [],
    columns: ['id', 'count', 'updated'],
    func: async () => getCounts(),
});
