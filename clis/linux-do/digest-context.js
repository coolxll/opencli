import { AuthRequiredError, CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { htmlToMarkdown, isRecord } from '@jackwener/opencli/utils';

const LINUX_DO_DOMAIN = 'linux.do';
const LINUX_DO_HOME = 'https://linux.do';
const MAX_TOPICS = 25;

function cleanMarkdown(value, limit) {
    if (typeof value !== 'string')
        return '';
    return value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, limit);
}

function postText(post, limit) {
    const raw = typeof post.raw === 'string' ? post.raw.trim() : '';
    return cleanMarkdown(raw || htmlToMarkdown(typeof post.cooked === 'string' ? post.cooked : ''), limit);
}

function normalizeIds(value) {
    const ids = String(value ?? '')
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id > 0);
    return [...new Set(ids)].slice(0, MAX_TOPICS);
}

function extractDigestContext(payload, id, options = {}) {
    if (!isRecord(payload))
        throw new CommandExecutionError(`linux.do returned an unexpected payload for topic ${id}`);
    const posts = Array.isArray(payload.posts) ? payload.posts.filter(isRecord) : [];
    const mainPost = posts.find((post) => post.post_number === 1) ?? posts[0];
    if (!mainPost)
        throw new CommandExecutionError(`linux.do topic ${id} does not contain any readable posts`);

    const bodyChars = Math.max(500, Number(options.bodyChars) || 6000);
    const commentChars = Math.max(100, Number(options.commentChars) || 1000);
    const commentsLimit = Math.max(0, Number(options.commentsLimit) || 8);
    const comments = posts
        .filter((post) => post !== mainPost && post.post_number !== 1)
        .map((post) => ({
        author: typeof post.username === 'string' ? post.username : '',
        content: postText(post, commentChars),
        likes: typeof post.like_count === 'number' ? post.like_count : 0,
        created_at: typeof post.created_at === 'string' ? post.created_at : '',
        post_number: typeof post.post_number === 'number' ? post.post_number : null,
    }))
        .filter((post) => post.content)
        .sort((left, right) => right.likes - left.likes || (left.post_number ?? 0) - (right.post_number ?? 0))
        .slice(0, commentsLimit);

    return {
        id,
        title: typeof payload.title === 'string' ? payload.title : '',
        url: `${LINUX_DO_HOME}/t/topic/${id}`,
        author: typeof mainPost.username === 'string' ? mainPost.username : '',
        body: postText(mainPost, bodyChars),
        likes: typeof mainPost.like_count === 'number' ? mainPost.like_count : 0,
        created_at: typeof mainPost.created_at === 'string' ? mainPost.created_at : '',
        comments,
        scanned_comment_count: Math.max(0, posts.length - 1),
    };
}

async function fetchTopicContexts(page, ids, commentScan) {
    await page.goto(LINUX_DO_HOME);
    await page.wait(2);
    const script = `(async () => {
      const ids = ${JSON.stringify(ids)};
      const commentScan = ${JSON.stringify(commentScan)};
      async function json(path) {
        const response = await fetch(path, { credentials: 'include' });
        let data = null;
        try { data = await response.json(); } catch {}
        if (!data) return { ok: false, status: response.status, error: 'invalid_json' };
        if (!response.ok) return { ok: false, status: response.status, error: 'http_error' };
        return { ok: true, status: response.status, data };
      }
      return Promise.all(ids.map(async (id) => {
        const initial = await json('/t/' + id + '.json?include_raw=true');
        if (!initial.ok) return { id, ok: false, status: initial.status };
        const stream = Array.isArray(initial.data?.post_stream?.stream)
          ? initial.data.post_stream.stream.slice(0, commentScan + 1)
          : [];
        const initialPosts = Array.isArray(initial.data?.post_stream?.posts)
          ? initial.data.post_stream.posts
          : [];
        const loaded = new Set(initialPosts.map((post) => post?.id));
        const missing = stream.filter((postId) => !loaded.has(postId));
        let extraPosts = [];
        if (missing.length) {
          const query = missing.map((postId) => 'post_ids[]=' + encodeURIComponent(postId)).join('&');
          const extra = await json('/t/' + id + '/posts.json?' + query);
          if (extra.ok && Array.isArray(extra.data?.post_stream?.posts)) {
            extraPosts = extra.data.post_stream.posts;
          }
        }
        return {
          id,
          ok: true,
          payload: {
            title: initial.data?.title || '',
            posts: [...initialPosts, ...extraPosts],
          },
        };
      }));
    })()`;
    const results = await page.evaluate(script);
    if (!Array.isArray(results))
        throw new CommandExecutionError('linux.do returned an empty batch response');
    if (results.some((result) => result?.status === 401 || result?.status === 403)) {
        throw new AuthRequiredError(LINUX_DO_DOMAIN, 'linux.do requires an active signed-in browser session');
    }
    if (!results.some((result) => result?.ok)) {
        if (results.some((result) => result?.error === 'invalid_json')) {
            throw new AuthRequiredError(LINUX_DO_DOMAIN, 'linux.do returned a sign-in page instead of topic JSON');
        }
        const statuses = [...new Set(results.map((result) => result?.status).filter(Boolean))];
        throw new CommandExecutionError(`linux.do batch request failed${statuses.length ? `: HTTP ${statuses.join(', ')}` : ''}`);
    }
    return results;
}

cli({
    site: 'linux-do',
    name: 'digest-context',
    access: 'read',
    description: 'Batch-read topic bodies and high-signal comments for editorial review',
    domain: LINUX_DO_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    args: [
        { name: 'ids', positional: true, type: 'string', required: true, help: 'Comma-separated topic IDs (max 25)' },
        { name: 'comments-limit', type: 'int', default: 8, help: 'Comments returned per topic' },
        { name: 'comment-scan', type: 'int', default: 80, help: 'First comments scanned for likes' },
        { name: 'body-chars', type: 'int', default: 6000, help: 'Maximum main-body characters' },
        { name: 'comment-chars', type: 'int', default: 1000, help: 'Maximum characters per comment' },
    ],
    columns: ['id', 'title', 'url', 'author', 'body', 'likes', 'created_at', 'comments', 'scanned_comment_count'],
    func: async (page, kwargs) => {
        const ids = normalizeIds(kwargs.ids);
        if (!ids.length)
            throw new CommandExecutionError('At least one valid linux.do topic id is required');
        const commentsLimit = Math.min(20, Math.max(0, Number(kwargs['comments-limit']) || 8));
        const commentScan = Math.min(150, Math.max(commentsLimit, Number(kwargs['comment-scan']) || 80));
        const bodyChars = Math.min(20000, Math.max(500, Number(kwargs['body-chars']) || 6000));
        const commentChars = Math.min(4000, Math.max(100, Number(kwargs['comment-chars']) || 1000));
        const results = await fetchTopicContexts(page, ids, commentScan);
        return results
            .filter((result) => result?.ok && result.payload)
            .map((result) => extractDigestContext(result.payload, result.id, {
            commentsLimit,
            bodyChars,
            commentChars,
        }));
    },
});

export const __test__ = { cleanMarkdown, extractDigestContext, normalizeIds, postText };
