import { cli, Strategy } from '@jackwener/opencli/registry';
import { getUnreadEntries } from './utils.js';

cli({
    site: 'feedly',
    name: 'unread',
    access: 'read',
    description: 'List unread Feedly entries from a stream',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'limit', type: 'int', default: 20, help: 'Max unread entries to return (1-1000)' },
        { name: 'stream-id', type: 'str', help: 'Feedly stream id; defaults to global.all' },
    ],
    columns: ['id', 'title', 'author', 'published', 'origin_title', 'stream_id', 'url', 'summary'],
    func: async (args) => getUnreadEntries({
        limit: args.limit,
        streamId: args['stream-id'] || '',
    }),
});
