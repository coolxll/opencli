import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { ArgumentError, AuthRequiredError, CommandExecutionError, ConfigError } from '@jackwener/opencli/errors';

export const FEEDLY_API_BASE = 'https://cloud.feedly.com/v3';
export const DEFAULT_CONFIG_PATH = join(homedir(), '.opencli', 'feedly.json');
export const DEFAULT_CLIENT_IDS = ['feedly', 'feedlydev'];

const TOKEN_EXPIRY_SKEW_MS = 60_000;

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringField(obj, ...keys) {
    for (const key of keys) {
        const value = obj?.[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function numberField(obj, ...keys) {
    for (const key of keys) {
        const value = obj?.[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    }
    return 0;
}

export function resolveConfigPath(env = process.env) {
    return stringField(env, 'FEEDLY_CONFIG_PATH') || DEFAULT_CONFIG_PATH;
}

export function normalizePositiveInt(value, fallback, label, max) {
    const raw = value === undefined || value === null || value === '' ? fallback : value;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > max) {
        throw new ArgumentError(`feedly ${label} must be an integer between 1 and ${max}`);
    }
    return n;
}

export function parseIdList(value) {
    const ids = String(value || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    if (ids.length === 0) {
        throw new ArgumentError('--ids must contain at least one Feedly entry id');
    }
    return ids;
}

export function loadFeedlyConfig({ env = process.env, readFile = readFileSync } = {}) {
    const path = resolveConfigPath(env);
    let rawText = '';
    try {
        rawText = readFile(path, 'utf-8');
    } catch (err) {
        throw new ConfigError(
            `Missing Feedly config: ${path}`,
            'Create a JSON file with refresh_token or access_token, or set FEEDLY_CONFIG_PATH to an existing config.',
        );
    }

    let raw;
    try {
        raw = JSON.parse(rawText);
    } catch (err) {
        throw new ConfigError(`Feedly config is not valid JSON: ${path}`);
    }
    if (!isRecord(raw)) {
        throw new ConfigError(`Feedly config must be a JSON object: ${path}`);
    }

    const accessToken = stringField(raw, 'access_token', 'accessToken');
    const refreshToken = stringField(raw, 'refresh_token', 'refreshToken');
    if (!accessToken && !refreshToken) {
        throw new ConfigError(
            `Feedly config is missing credentials: ${path}`,
            'Expected refresh_token for automatic refresh, or access_token for a static token.',
        );
    }

    return {
        path,
        raw,
        accessToken,
        refreshToken,
        userId: stringField(raw, 'user_id', 'userId', 'id'),
        clientId: stringField(raw, 'client_id', 'clientId'),
        clientSecret: stringField(raw, 'client_secret', 'clientSecret'),
        expiresAt: normalizeExpiresAt(numberField(raw, 'expires_at', 'expiresAt', 'expiry', 'expires')),
    };
}

function normalizeExpiresAt(value) {
    if (!value) return 0;
    // Some tools store seconds since epoch; opencli stores milliseconds.
    return value < 10_000_000_000 ? value * 1000 : value;
}

export function saveFeedlyToken(config, tokenData, { writeFile = writeFileSync, mkdir = mkdirSync } = {}) {
    const next = { ...config.raw };
    const expiresAt = Date.now() + Math.max(1, Number(tokenData.expires_in || 3600)) * 1000;
    next.access_token = tokenData.access_token;
    next.expires_at = expiresAt;
    if (tokenData.refresh_token) next.refresh_token = tokenData.refresh_token;
    if (next.accessToken !== undefined) next.accessToken = tokenData.access_token;
    if (next.expiresAt !== undefined) next.expiresAt = expiresAt;
    if (tokenData.refresh_token && next.refreshToken !== undefined) next.refreshToken = tokenData.refresh_token;

    mkdir(dirname(config.path), { recursive: true });
    writeFile(config.path, `${JSON.stringify(next, null, 2)}\n`);
    return {
        ...config,
        raw: next,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || config.refreshToken,
        expiresAt,
    };
}

function refreshClientIds(config) {
    const ids = [];
    if (config.clientId) ids.push(config.clientId);
    for (const id of DEFAULT_CLIENT_IDS) {
        if (!ids.includes(id)) ids.push(id);
    }
    return ids;
}

async function parseJsonResponse(resp, label) {
    const text = await resp.text();
    if (!text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new CommandExecutionError(`${label} returned malformed JSON`);
    }
}

export async function refreshFeedlyToken(config, { fetchImpl = fetch, writeFile = writeFileSync, mkdir = mkdirSync } = {}) {
    if (!config.refreshToken) {
        throw new AuthRequiredError('cloud.feedly.com', 'Feedly access token expired and no refresh_token is configured.');
    }

    const failures = [];
    for (const clientId of refreshClientIds(config)) {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: config.refreshToken,
            client_id: clientId,
        });
        if (config.clientSecret) body.set('client_secret', config.clientSecret);

        const resp = await fetchImpl(`${FEEDLY_API_BASE}/auth/token`, {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
            body,
        });
        const data = await parseJsonResponse(resp, `Feedly token refresh (${clientId})`);
        if (resp.ok && isRecord(data) && typeof data.access_token === 'string' && data.access_token.trim()) {
            return saveFeedlyToken(config, data, { writeFile, mkdir });
        }
        failures.push(`${clientId}: HTTP ${resp.status}`);
    }

    throw new AuthRequiredError(
        'cloud.feedly.com',
        `Feedly token refresh failed (${failures.join('; ')}).`,
    );
}

async function getAccessToken(config, opts) {
    if (config.accessToken && (!config.expiresAt || Date.now() < config.expiresAt - TOKEN_EXPIRY_SKEW_MS)) {
        return { config, accessToken: config.accessToken };
    }
    const refreshed = await refreshFeedlyToken(config, opts);
    return { config: refreshed, accessToken: refreshed.accessToken };
}

function buildUrl(path, query = {}) {
    const url = new URL(path.startsWith('http') ? path : `${FEEDLY_API_BASE}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

export async function feedlyJson(path, {
    method = 'GET',
    query,
    body,
    config,
    fetchImpl = fetch,
    retryAuth = true,
    writeFile = writeFileSync,
    mkdir = mkdirSync,
} = {}) {
    let activeConfig = config || loadFeedlyConfig();
    let tokenInfo = await getAccessToken(activeConfig, { fetchImpl, writeFile, mkdir });
    activeConfig = tokenInfo.config;

    const url = buildUrl(path, query);
    const resp = await fetchImpl(url, {
        method,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${tokenInfo.accessToken}`,
            ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (resp.status === 401 && retryAuth && activeConfig.refreshToken) {
        activeConfig = await refreshFeedlyToken(activeConfig, { fetchImpl, writeFile, mkdir });
        return feedlyJson(path, { method, query, body, config: activeConfig, fetchImpl, retryAuth: false, writeFile, mkdir });
    }

    if (resp.status === 204 || resp.status === 202) return null;
    const data = await parseJsonResponse(resp, `Feedly API ${method} ${path}`);
    if (!resp.ok) {
        const message = isRecord(data)
            ? stringField(data, 'errorMessage', 'message', 'error') || `HTTP ${resp.status}`
            : `HTTP ${resp.status}`;
        if (resp.status === 401 || resp.status === 403) {
            throw new AuthRequiredError('cloud.feedly.com', `Feedly API rejected credentials: ${message}`);
        }
        throw new CommandExecutionError(`Feedly API ${method} ${path} failed: ${message}`);
    }
    return data;
}

export function requireArrayPayload(data, field, label) {
    const value = field ? data?.[field] : data;
    if (!Array.isArray(value)) {
        throw new CommandExecutionError(`Feedly ${label} returned malformed payload; expected ${field || 'array'}.`);
    }
    return value;
}

export function countMapFromPayload(data) {
    const rows = requireArrayPayload(data, 'unreadcounts', 'counts');
    return new Map(rows
        .filter((row) => isRecord(row) && typeof row.id === 'string')
        .map((row) => [row.id, Number(row.count || 0)]));
}

function isoDate(ms) {
    const n = Number(ms || 0);
    if (!Number.isFinite(n) || n <= 0) return '';
    return new Date(n).toISOString();
}

function stripHtml(value) {
    return String(value || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function firstAlternateUrl(entry) {
    const alternate = Array.isArray(entry?.alternate) ? entry.alternate : [];
    const found = alternate.find((item) => isRecord(item) && typeof item.href === 'string' && item.href.trim());
    return found?.href || '';
}

export function normalizeFeedlyEntry(entry) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id.trim()) {
        throw new CommandExecutionError('Feedly unread returned an entry without a stable id.');
    }
    const origin = isRecord(entry.origin) ? entry.origin : {};
    const summary = isRecord(entry.summary) ? entry.summary.content : isRecord(entry.content) ? entry.content.content : '';
    return {
        id: entry.id,
        title: String(entry.title || '').trim(),
        author: String(entry.author || '').trim(),
        published: isoDate(entry.published || entry.updated || entry.crawled),
        origin_title: String(origin.title || '').trim(),
        stream_id: String(origin.streamId || '').trim(),
        url: firstAlternateUrl(entry) || String(origin.htmlUrl || '').trim(),
        summary: stripHtml(summary).slice(0, 240),
    };
}

export function globalAllStreamId(userId) {
    if (!userId) {
        throw new CommandExecutionError('Feedly profile did not include a user id for the default unread stream.');
    }
    return `user/${userId}/category/global.all`;
}

export async function getFeedlyProfile(opts = {}) {
    const data = await feedlyJson('/profile', opts);
    if (!isRecord(data) || typeof data.id !== 'string') {
        throw new CommandExecutionError('Feedly profile returned malformed payload; expected id.');
    }
    return data;
}

export async function getUnreadEntries({ limit = 20, streamId = '', ...opts } = {}) {
    const count = normalizePositiveInt(limit, 20, '--limit', 1000);
    let resolvedStreamId = streamId;
    if (!resolvedStreamId) {
        const profile = await getFeedlyProfile(opts);
        resolvedStreamId = globalAllStreamId(profile.id);
    }

    const rows = [];
    let continuation = '';
    while (rows.length < count) {
        const pageSize = Math.min(100, count - rows.length);
        const data = await feedlyJson('/streams/contents', {
            ...opts,
            query: {
                streamId: resolvedStreamId,
                unreadOnly: 'true',
                ranked: 'newest',
                count: pageSize,
                continuation,
            },
        });
        const items = requireArrayPayload(data, 'items', 'unread');
        rows.push(...items.map(normalizeFeedlyEntry));
        continuation = typeof data?.continuation === 'string' ? data.continuation : '';
        if (!continuation || items.length === 0) break;
    }
    return rows.slice(0, count);
}

export async function getCategories(opts = {}) {
    const [categories, counts] = await Promise.all([
        feedlyJson('/categories', opts),
        feedlyJson('/markers/counts', opts),
    ]);
    const unreadById = countMapFromPayload(counts);
    return requireArrayPayload(categories, null, 'categories').map((category) => ({
        id: String(category.id || ''),
        label: String(category.label || ''),
        unread: unreadById.get(category.id) || 0,
    }));
}

export async function getSubscriptions(opts = {}) {
    const [subscriptions, counts] = await Promise.all([
        feedlyJson('/subscriptions', opts),
        feedlyJson('/markers/counts', opts),
    ]);
    const unreadById = countMapFromPayload(counts);
    return requireArrayPayload(subscriptions, null, 'subscriptions').map((sub) => ({
        id: String(sub.id || ''),
        title: String(sub.title || ''),
        categories: Array.isArray(sub.categories) ? sub.categories.map((c) => c.label || c.id).filter(Boolean).join(', ') : '',
        website: String(sub.website || ''),
        unread: unreadById.get(sub.id) || 0,
    }));
}

export async function getCounts(opts = {}) {
    const data = await feedlyJson('/markers/counts', opts);
    return requireArrayPayload(data, 'unreadcounts', 'counts').map((row) => ({
        id: String(row.id || ''),
        count: Number(row.count || 0),
        updated: isoDate(row.updated),
    }));
}

export async function getStreams(opts = {}) {
    const [profile, categories, subscriptions, counts] = await Promise.all([
        getFeedlyProfile(opts),
        feedlyJson('/categories', opts),
        feedlyJson('/subscriptions', opts),
        feedlyJson('/markers/counts', opts),
    ]);
    const unreadById = countMapFromPayload(counts);
    const rows = [
        {
            id: globalAllStreamId(profile.id),
            type: 'global',
            label: 'All',
            parent: '',
            unread: unreadById.get(globalAllStreamId(profile.id)) || 0,
        },
        {
            id: `user/${profile.id}/tag/global.saved`,
            type: 'global',
            label: 'Saved',
            parent: '',
            unread: unreadById.get(`user/${profile.id}/tag/global.saved`) || 0,
        },
    ];

    for (const category of requireArrayPayload(categories, null, 'categories')) {
        rows.push({
            id: String(category.id || ''),
            type: 'category',
            label: String(category.label || ''),
            parent: '',
            unread: unreadById.get(category.id) || 0,
        });
    }
    for (const sub of requireArrayPayload(subscriptions, null, 'subscriptions')) {
        rows.push({
            id: String(sub.id || ''),
            type: 'feed',
            label: String(sub.title || ''),
            parent: Array.isArray(sub.categories) ? sub.categories.map((c) => c.label || c.id).filter(Boolean).join(', ') : '',
            unread: unreadById.get(sub.id) || 0,
        });
    }
    return rows;
}

export async function markEntriesRead(ids, opts = {}) {
    const entryIds = Array.isArray(ids) ? ids : parseIdList(ids);
    await feedlyJson('/markers', {
        ...opts,
        method: 'POST',
        body: {
            action: 'markAsRead',
            type: 'entries',
            entryIds,
        },
    });
    return [{ status: 'marked_read', count: entryIds.length }];
}
