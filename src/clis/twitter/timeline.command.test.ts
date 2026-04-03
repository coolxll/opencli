import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '../../registry.js';
import './timeline.js';

describe('twitter timeline command', () => {
  it('fetches the for-you timeline through the browser page and parses tweets', async () => {
    const command = getRegistry().get('twitter/timeline');
    expect(command?.func).toBeTypeOf('function');

    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn()
        // ct0 cookie lookup
        .mockResolvedValueOnce('ct0-token')
        // resolveTwitterQueryId()
        .mockResolvedValueOnce('query-live')
        // timeline fetch
        .mockResolvedValueOnce({
          data: {
            home: {
              home_timeline_urt: {
                instructions: [
                  {
                    entries: [
                      {
                        entryId: 'tweet-1',
                        content: {
                          itemContent: {
                            tweet_results: {
                              result: {
                                rest_id: '1',
                                legacy: {
                                  full_text: 'hello timeline',
                                  favorite_count: 5,
                                  retweet_count: 2,
                                  reply_count: 1,
                                  created_at: 'Wed Apr 01 10:00:00 +0000 2026',
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: { screen_name: 'alice' },
                                    },
                                  },
                                },
                                views: { count: '42' },
                              },
                            },
                          },
                        },
                      },
                      {
                        entryId: 'cursor-bottom-1',
                        content: {
                          entryType: 'TimelineTimelineCursor',
                          cursorType: 'Bottom',
                          value: 'cursor-2',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        }),
    };

    const result = await command!.func!(page as any, { type: 'for-you', limit: 1 });

    expect(result).toEqual([
      {
        id: '1',
        author: 'alice',
        text: 'hello timeline',
        likes: 5,
        retweets: 2,
        replies: 1,
        views: 42,
        created_at: 'Wed Apr 01 10:00:00 +0000 2026',
        url: 'https://x.com/alice/status/1',
      },
    ]);
    expect(page.goto).toHaveBeenCalledWith('https://x.com');
    expect(page.wait).toHaveBeenCalledWith(3);
    expect(page.evaluate).toHaveBeenCalledTimes(3);
    expect(String(page.evaluate.mock.calls[2][0])).toContain('/i/api/graphql/query-live/HomeTimeline');
  });

  it('uses the HomeLatestTimeline endpoint for following timeline requests', async () => {
    const command = getRegistry().get('twitter/timeline');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn()
        .mockResolvedValueOnce('ct0-token')
        .mockResolvedValueOnce('query-following')
        .mockResolvedValueOnce({
          data: {
            home: {
              home_timeline_urt: {
                instructions: [],
              },
            },
          },
        }),
    };

    await command!.func!(page as any, { type: 'following', limit: 3 });

    const fetchScript = String(page.evaluate.mock.calls[2][0]);
    expect(fetchScript).toContain('/i/api/graphql/query-following/HomeLatestTimeline');
    expect(fetchScript).toContain('method: "POST"');
    expect(fetchScript).toContain('%22seenTweetIds%22%3A%5B%5D');
  });
});
