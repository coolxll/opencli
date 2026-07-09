import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArgumentError, CommandExecutionError, ConfigError } from '@jackwener/opencli/errors';
import { getRegistry, Strategy } from '@jackwener/opencli/registry';
import './profile.js';
import './unread.js';
import './categories.js';
import './subscriptions.js';
import './counts.js';
import './streams.js';
import './mark-read.js';
import {
    FEEDLY_API_BASE,
    feedlyJson,
    getStreams,
    getUnreadEntries,
    loadFeedlyConfig,
    markEntriesRead,
    parseIdList,
    refreshFeedlyToken,
    resolveConfigPath,
} from './utils.js';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(data),
    };
}

function emptyResponse(status = 204) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => '',
    };
}

describe('feedly config', () => {
    let dir;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'opencli-feedly-'));
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        rmSync(dir, { recursive: true, force: true });
    });

    it('resolves FEEDLY_CONFIG_PATH before the default path', () => {
        vi.stubEnv('FEEDLY_CONFIG_PATH', join(dir, 'feedly.json'));
        expect(resolveConfigPath()).toBe(join(dir, 'feedly.json'));
    });

    it('loads snake_case config fields and normalizes second-based expiry', () => {
        const path = join(dir, 'feedly.json');
        writeFileSync(path, JSON.stringify({
            access_token: 'access-a',
            refresh_token: 'refresh-a',
            user_id: 'user-a',
            expires_at: 1_800_000_000,
        }));
        const config = loadFeedlyConfig({ env: { FEEDLY_CONFIG_PATH: path } });
        expect(config.accessToken).toBe('access-a');
        expect(config.refreshToken).toBe('refresh-a');
        expect(config.userId).toBe('user-a');
        expect(config.expiresAt).toBe(1_800_000_000_000);
    });

    it('throws ConfigError for missing config', () => {
        expect(() => loadFeedlyConfig({ env: { FEEDLY_CONFIG_PATH: join(dir, 'missing.json') } })).toThrow(ConfigError);
    });
});

describe('feedly token refresh and API helper', () => {
    let dir;
    let config;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'opencli-feedly-'));
        config = {
            path: join(dir, 'feedly.json'),
            raw: { refresh_token: 'refresh-1' },
            accessToken: '',
            refreshToken: 'refresh-1',
            userId: '',
            clientId: '',
            clientSecret: '',
            expiresAt: 0,
        };
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('refreshes with client_id=feedly, then falls back to feedlydev', async () => {
        const seenClientIds = [];
        const fetchImpl = vi.fn(async (_url, init) => {
            seenClientIds.push(init.body.get('client_id'));
            if (seenClientIds.length === 1) return jsonResponse(400, { error: 'invalid_client' });
            return jsonResponse(200, { access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 7200 });
        });

        const refreshed = await refreshFeedlyToken(config, { fetchImpl });

        expect(seenClientIds).toEqual(['feedly', 'feedlydev']);
        expect(refreshed.accessToken).toBe('access-2');
        expect(JSON.parse(readFileSync(config.path, 'utf-8')).refresh_token).toBe('refresh-2');
    });

    it('retries one API request after a 401 by refreshing the token', async () => {
        config = { ...config, raw: { access_token: 'old', refresh_token: 'refresh-1' }, accessToken: 'old', expiresAt: Date.now() + 600_000 };
        const fetchImpl = vi.fn(async (url, init) => {
            if (String(url).endsWith('/profile') && init.headers.authorization === 'Bearer old') {
                return jsonResponse(401, { errorMessage: 'expired' });
            }
            if (String(url).endsWith('/auth/token')) {
                return jsonResponse(200, { access_token: 'new', expires_in: 3600 });
            }
            return jsonResponse(200, { id: 'user-1', email: 'a@example.com' });
        });

        const data = await feedlyJson('/profile', { config, fetchImpl });

        expect(data.id).toBe('user-1');
        expect(fetchImpl).toHaveBeenCalledTimes(3);
        expect(fetchImpl.mock.calls[2][1].headers.authorization).toBe('Bearer new');
    });

    it('throws typed failure for malformed JSON payloads', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            status: 200,
            text: async () => '{not-json',
        }));
        config = { ...config, accessToken: 'access', expiresAt: Date.now() + 600_000 };

        await expect(feedlyJson('/profile', { config, fetchImpl })).rejects.toThrow(CommandExecutionError);
    });
});

describe('feedly unread pagination and stream joining', () => {
    const config = {
        path: 'memory',
        raw: { access_token: 'access' },
        accessToken: 'access',
        refreshToken: '',
        userId: 'user-1',
        clientId: '',
        clientSecret: '',
        expiresAt: Date.now() + 600_000,
    };

    it('paginates unread stream contents up to the requested limit', async () => {
        const continuations = [];
        const fetchImpl = vi.fn(async (url) => {
            const parsed = new URL(url);
            continuations.push(parsed.searchParams.get('continuation') || '');
            if (!parsed.searchParams.get('continuation')) {
                return jsonResponse(200, {
                    continuation: 'next-page',
                    items: [
                        { id: 'entry-1', title: 'One', origin: { title: 'Feed A', streamId: 'feed/a' }, published: 1000 },
                    ],
                });
            }
            return jsonResponse(200, {
                items: [
                    { id: 'entry-2', title: 'Two', origin: { title: 'Feed B', streamId: 'feed/b' }, alternate: [{ href: 'https://example.com/two' }] },
                ],
            });
        });

        const rows = await getUnreadEntries({ config, fetchImpl, streamId: 'feed/a', limit: 2 });

        expect(rows.map((row) => row.id)).toEqual(['entry-1', 'entry-2']);
        expect(rows[1].url).toBe('https://example.com/two');
        expect(continuations).toEqual(['', 'next-page']);
    });

    it('does not treat malformed unread item payloads as empty results', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { items: [{ title: 'missing id' }] }));
        await expect(getUnreadEntries({ config, fetchImpl, streamId: 'feed/a', limit: 1 })).rejects.toThrow(CommandExecutionError);
    });

    it('joins global, category, and feed streams with unread counts', async () => {
        const fetchImpl = vi.fn(async (url) => {
            const path = new URL(url).pathname.replace('/v3', '');
            if (path === '/profile') return jsonResponse(200, { id: 'user-1' });
            if (path === '/categories') return jsonResponse(200, [{ id: 'user/user-1/category/Tech', label: 'Tech' }]);
            if (path === '/subscriptions') {
                return jsonResponse(200, [{
                    id: 'feed/https://example.com/rss',
                    title: 'Example',
                    categories: [{ id: 'user/user-1/category/Tech', label: 'Tech' }],
                }]);
            }
            if (path === '/markers/counts') {
                return jsonResponse(200, {
                    unreadcounts: [
                        { id: 'user/user-1/category/global.all', count: 8 },
                        { id: 'user/user-1/category/Tech', count: 3 },
                        { id: 'feed/https://example.com/rss', count: 2 },
                    ],
                });
            }
            throw new Error(`unexpected URL ${url}`);
        });

        const rows = await getStreams({ config, fetchImpl });

        expect(rows).toEqual([
            { id: 'user/user-1/category/global.all', type: 'global', label: 'All', parent: '', unread: 8 },
            { id: 'user/user-1/tag/global.saved', type: 'global', label: 'Saved', parent: '', unread: 0 },
            { id: 'user/user-1/category/Tech', type: 'category', label: 'Tech', parent: '', unread: 3 },
            { id: 'feed/https://example.com/rss', type: 'feed', label: 'Example', parent: 'Tech', unread: 2 },
        ]);
    });
});

describe('feedly mark-read command', () => {
    it('requires ids and confirmation before marking entries read', async () => {
        expect(() => parseIdList(' , ')).toThrow(ArgumentError);
        const cmd = getRegistry().get('feedly/mark-read');
        await expect(cmd.func({ ids: 'entry-1', confirm: 'NOPE' })).rejects.toThrow(ArgumentError);
    });

    it('posts Feedly marker payload for confirmed entries', async () => {
        const config = {
            path: 'memory',
            raw: { access_token: 'access' },
            accessToken: 'access',
            refreshToken: '',
            userId: '',
            clientId: '',
            clientSecret: '',
            expiresAt: Date.now() + 600_000,
        };
        const fetchImpl = vi.fn(async (_url, init) => {
            expect(init.method).toBe('POST');
            expect(JSON.parse(init.body)).toEqual({
                action: 'markAsRead',
                type: 'entries',
                entryIds: ['entry-1', 'entry-2'],
            });
            return emptyResponse();
        });

        await expect(markEntriesRead(['entry-1', 'entry-2'], { config, fetchImpl })).resolves.toEqual([
            { status: 'marked_read', count: 2 },
        ]);
    });
});

describe('feedly registry shape', () => {
    it('registers local browser-free commands', () => {
        for (const name of ['profile', 'unread', 'categories', 'subscriptions', 'counts', 'streams', 'mark-read']) {
            const cmd = getRegistry().get(`feedly/${name}`);
            expect(cmd, name).toBeDefined();
            expect(cmd.strategy, name).toBe(Strategy.LOCAL);
            expect(cmd.browser, name).toBe(false);
        }
    });

    it('uses stable id columns for round-trip workflows', () => {
        expect(getRegistry().get('feedly/unread').columns[0]).toBe('id');
        expect(getRegistry().get('feedly/streams').columns[0]).toBe('id');
    });

    it('uses the Feedly v3 API base', () => {
        expect(FEEDLY_API_BASE).toBe('https://cloud.feedly.com/v3');
    });
});
