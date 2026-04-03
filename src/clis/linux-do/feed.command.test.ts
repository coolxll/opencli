import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '../../registry.js';
import './feed.js';
import { __test__ } from './feed.js';

describe('linux-do feed command', () => {
  afterEach(() => {
    __test__.resetMetadataCaches();
  });

  it('navigates to linux.do and returns parsed topic rows', async () => {
    const command = getRegistry().get('linux-do/feed');
    expect(command?.func).toBeTypeOf('function');

    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          topic_list: {
            topics: [
              {
                id: 101,
                title: 'OpenCLI bridge fix',
                posts_count: 12,
                created_at: '2026-04-01T09:00:00.000Z',
                like_count: 8,
                views: 300,
                slug: 'opencli-bridge-fix',
              },
            ],
          },
        },
      }),
    };

    const result = await command!.func!(page as any, { view: 'latest', limit: 5 });

    expect(page.goto).toHaveBeenCalledWith('https://linux.do');
    expect(page.wait).toHaveBeenCalledWith(2);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(String(page.evaluate.mock.calls[0][0])).toContain('/latest.json');
    expect(result).toEqual([
      {
        title: 'OpenCLI bridge fix',
        replies: 11,
        created: '2026/4/1 17:00:00',
        likes: 8,
        views: 300,
        url: 'https://linux.do/t/topic/101',
      },
    ]);
  });

  it('requests the resolved top feed url for category and tag combinations', async () => {
    const command = getRegistry().get('linux-do/feed');
    expect(command?.func).toBeTypeOf('function');
    __test__.resetMetadataCaches();
    __test__.setLiveMetadataForTests({
      tags: [{ id: 3, slug: 'chatgpt', name: 'ChatGPT' }],
      categories: [{
        id: 4,
        name: '开发调优',
        description: '',
        slug: 'develop',
        parentCategoryId: null,
        parent: null,
      }],
    });

    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: { topic_list: { topics: [] } },
      }),
    };

    await command!.func!(page as any, {
      tag: 'ChatGPT',
      category: '开发调优',
      view: 'top',
      period: 'monthly',
      limit: 5,
    });

    expect(page.goto).toHaveBeenCalledWith('https://linux.do');
    expect(page.wait).toHaveBeenCalledWith(2);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(String(page.evaluate.mock.calls[0][0])).toContain('/tags/c/develop/4/chatgpt/3/l/top.json?per_page=5&period=monthly');
  });
});
