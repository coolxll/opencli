import { cli, Strategy } from '@jackwener/opencli/registry';
import { getCategories } from './utils.js';

cli({
    site: 'feedly',
    name: 'categories',
    access: 'read',
    description: 'List Feedly categories with unread counts',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [],
    columns: ['id', 'label', 'unread'],
    func: async () => getCategories(),
});
