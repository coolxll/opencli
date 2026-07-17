import { cli, Strategy } from '@jackwener/opencli/registry';
import { getSubscriptions } from './utils.js';

cli({
    site: 'feedly',
    name: 'subscriptions',
    access: 'read',
    description: 'List Feedly feed subscriptions with unread counts',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [],
    columns: ['id', 'title', 'categories', 'website', 'unread'],
    func: async () => getSubscriptions(),
});
