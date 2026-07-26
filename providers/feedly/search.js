import { cli, Strategy } from '@jackwener/opencli/registry';
import { searchFeedlyContents } from './utils.js';

cli({
    site: 'feedly',
    name: 'search',
    access: 'read',
    description: 'Search Feedly personal feeds and publication buckets',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'query', type: 'string', required: true, positional: true, help: 'Text to search for in Feedly contents' },
        { name: 'limit', type: 'int', default: 40, help: 'Max search results to return (1-100)' },
        { name: 'newer-than', type: 'str', help: 'Only return items newer than this epoch-ms timestamp or ISO date' },
        { name: 'older-than', type: 'str', help: 'Only return items older than this epoch-ms timestamp or ISO date' },
        {
            name: 'scope',
            type: 'str',
            default: 'all',
            choices: ['all', 'personal', 'business', 'tech'],
            help: 'Sources to search: all, personal feeds, Business & Strategy, or Tech Blogs',
        },
    ],
    columns: ['id', 'title', 'author', 'published', 'origin_title', 'stream_id', 'url', 'summary'],
    func: async (args) => searchFeedlyContents({
        query: args.query,
        limit: args.limit,
        newerThan: args['newer-than'],
        olderThan: args['older-than'],
        scope: args.scope,
    }),
});
