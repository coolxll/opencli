# Site Strategies

Use this file to choose the fetch path quickly for a high-density brief.

## General strategy

For any site:
1. fetch a broad list command
2. shortlist from title + lightweight metadata
3. fetch details for shortlisted items
4. fetch comments/replies if they materially improve the brief
5. denoise
6. output categorized insights

## V2EX

Preferred commands:
- `opencli v2ex latest --limit N -f json`
- `opencli v2ex hot --limit N -f json`
- `opencli v2ex topic <id> -f json`
- `opencli v2ex replies <id> --limit N -f json`

Notes:
- `latest`, `hot`, `topic`, `replies` are public-api friendly.
- If `latest` does not expose enough fields for deep-read routing, patch the adapter lightly instead of switching tools.

## Hacker News

Preferred commands:
- `opencli hackernews top --limit N -f json`
- `opencli hackernews new --limit N -f json`
- `opencli hackernews best --limit N -f json`
- `opencli hackernews show --limit N -f json`
- `opencli hackernews search <query> -f json`

Notes:
- HN often has high information density in title + points + comments count.
- Deep-read only items that clearly justify the cost.

## Reddit

Preferred commands:
- `opencli reddit frontpage --limit N -f json`
- `opencli reddit hot --subreddit <name> --limit N -f json`
- `opencli reddit search <query> --limit N -f json`
- `opencli reddit read <url-or-id> -f json`

Notes:
- For large threads, aggressively denoise comments.
- Ignore low-signal banter unless it carries concrete evidence or comparison data.

## Twitter / X

Preferred commands:
- `opencli twitter trending --limit N -f json`
- `opencli twitter search <query> --limit N -f json`
- `opencli twitter timeline --limit N -f json`
- `opencli twitter thread <tweet-id-or-url> -f json`
- `opencli twitter article <tweet-id-or-url> -f json`

Notes:
- Only deep-read threads with strong signal.
- Ignore engagement bait and repetitive quote-tweet sentiment.

## Weibo

Preferred commands:
- `opencli weibo hot --limit N -f json`
- `opencli weibo search <keyword> --limit N -f json`
- `opencli weibo comments <url-or-id> --limit N -f json`

Notes:
- Hot lists are noisy; title filtering is critical.

## Xiaohongshu

Preferred commands:
- `opencli xiaohongshu feed --limit N -f json`
- `opencli xiaohongshu search <query> --limit N -f json`
- `opencli xiaohongshu comments <note-id> --limit N -f json`
- creator-side commands when the user asks for creator analysis

Notes:
- High-value posts are usually how-to, tool stacks, templates, or personal workflows.
- Filter out aesthetic-only, low-content notes.

## Zhihu

Preferred commands:
- `opencli zhihu hot --limit N -f json`
- `opencli zhihu search <query> --limit N -f json`
- `opencli zhihu question <id> --limit N -f json`

Notes:
- Prefer questions with concrete problem framing and experienced answers.

## YouTube

Preferred commands:
- `opencli youtube search <query> --limit N -f json`
- `opencli youtube video <url> -f json`
- `opencli youtube transcript <url> -f json`

Notes:
- Use transcript only for a small selected subset.
- Avoid wasting time on low-signal videos.

## Xueqiu

Preferred commands:
- `opencli xueqiu hot --limit N -f json`
- `opencli xueqiu hot-stock --limit N -f json`
- `opencli xueqiu search <query> -f json`
- `opencli xueqiu stock --symbol <symbol> -f json`

Notes:
- Prioritize posts with evidence, valuation logic, or concrete timing/context.

## WeRead

Preferred commands:
- `opencli weread shelf -f json`
- `opencli weread ranking -f json`
- `opencli weread book <book-id> -f json`
- `opencli weread highlights <book-id> --limit N -f json`
- `opencli weread notes <book-id> --limit N -f json`

Notes:
- This is better for reading insight briefs than “today feed” briefs.

## Fallback rule

If a site has no clean detail path yet:
- patch the current site adapter lightly
- keep it small and local
- do not introduce Playwright-first logic into this workflow
