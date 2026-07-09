import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { markEntriesRead, parseIdList } from './utils.js';

cli({
    site: 'feedly',
    name: 'mark-read',
    access: 'write',
    description: 'Mark Feedly entries as read',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'ids', type: 'str', required: true, valueRequired: true, help: 'Comma-separated Feedly entry ids' },
        { name: 'confirm', type: 'str', required: true, valueRequired: true, choices: ['MARK_READ'], help: 'Must be MARK_READ to confirm the write' },
    ],
    columns: ['status', 'count'],
    func: async (args) => {
        if (args.confirm !== 'MARK_READ') {
            throw new ArgumentError('--confirm MARK_READ is required before marking entries read');
        }
        return markEntriesRead(parseIdList(args.ids));
    },
});
