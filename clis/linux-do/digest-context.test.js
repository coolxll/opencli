import { getRegistry } from '@jackwener/opencli/registry';
import { describe, expect, it, vi } from 'vitest';
import { __test__ } from './digest-context.js';

describe('linux-do digest-context', () => {
    it('extracts the body and ranks scanned comments by likes', () => {
        const result = __test__.extractDigestContext({
            title: 'A useful discussion',
            posts: [
                { id: 1, post_number: 1, username: 'author', raw: 'Full **body**', like_count: 4 },
                { id: 2, post_number: 2, username: 'early', raw: 'First reply', like_count: 1 },
                { id: 3, post_number: 3, username: 'expert', raw: 'Verified workaround', like_count: 12 },
            ],
        }, 123, { commentsLimit: 1, bodyChars: 6000, commentChars: 1000 });

        expect(result.body).toBe('Full **body**');
        expect(result.comments).toEqual([expect.objectContaining({ author: 'expert', likes: 12 })]);
        expect(result.scanned_comment_count).toBe(2);
        expect(result.url).toBe('https://linux.do/t/topic/123');
    });

    it('deduplicates and caps positional topic ids', () => {
        const values = Array.from({ length: 30 }, (_, index) => index + 1).join(',');
        expect(__test__.normalizeIds(`1,1,invalid,${values}`)).toHaveLength(25);
        expect(__test__.normalizeIds('1,1,2')).toEqual([1, 2]);
    });

    it('registers a single-browser-call batch command', async () => {
        const command = getRegistry().get('linux-do/digest-context');
        const page = {
            goto: vi.fn().mockResolvedValue(undefined),
            wait: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn().mockResolvedValue([
                {
                    id: 42,
                    ok: true,
                    payload: {
                        title: 'Topic',
                        posts: [{ post_number: 1, username: 'neo', raw: 'Body' }],
                    },
                },
            ]),
        };

        const result = await command.func(page, { ids: '42' });

        expect(page.goto).toHaveBeenCalledTimes(1);
        expect(page.evaluate).toHaveBeenCalledTimes(1);
        expect(result).toEqual([expect.objectContaining({ id: 42, body: 'Body' })]);
    });

    it('fails clearly instead of returning an empty success when every topic request fails', async () => {
        const command = getRegistry().get('linux-do/digest-context');
        const page = {
            goto: vi.fn().mockResolvedValue(undefined),
            wait: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn().mockResolvedValue([{ id: 42, ok: false, status: 500, error: 'http_error' }]),
        };

        await expect(command.func(page, { ids: '42' })).rejects.toThrow('HTTP 500');
    });
});
