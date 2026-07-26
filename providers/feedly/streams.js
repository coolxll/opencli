import { cli, Strategy } from '@jackwener/opencli/registry';
import { getStreams } from './utils.js';

cli({
    site: 'feedly',
    name: 'streams',
    access: 'read',
    description: 'List global, category, and feed streams with unread counts',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [],
    columns: ['id', 'type', 'label', 'parent', 'unread'],
    func: async () => getStreams(),
});
