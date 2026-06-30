# opencli Complete Command Manual

This manual is generated from `dist/cli-manifest.json` in the current repository state.

It is intended to be the static reference manual for:
- command discovery
- usage lookup
- parameter lookup

For the live installed registry, still verify with:

```bash
opencli list
opencli list -f yaml
```

## Global commands

```bash
opencli list
opencli validate [target]
opencli verify [target] [--smoke]
opencli explore <url> [--site <name>] [--goal <text>]
opencli synthesize <target> [--top <n>]
opencli generate <url> [--site <name>] [--goal <text>]
opencli record <url> [--site <name>] [--out <dir>]
opencli cascade <url> [--site <name>]
opencli doctor [--no-live] [--sessions]
opencli completion <bash|zsh|fish>
opencli plugin install <source>
opencli plugin uninstall <name>
opencli plugin update [name] [--all]
```

## Common rules

- All commands support `-f table|json|yaml|md|csv` and `-v`.
- Many search/read commands use positional arguments instead of `--query` / `--keyword`.
- For browser commands, Chrome login state and Browser Bridge availability matter.
- Use `opencli <site> <command> --help` when you need the exact Commander rendering.

## Complete built-in commands

## 36kr

Commands: `article` `hot` `news` `search`

### `article`

- Description: 获取36氪文章正文内容
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli 36kr article <id>`
- Parameters:
  - `<id>`: positional, required, type=str, Article ID or full 36kr article URL

### `hot`

- Description: 36氪热榜 — trending articles (renqi/zonghe/shoucang/catalog)
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli 36kr hot [--limit <limit>] [--type <type>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of items (max 50)
  - `--type`: option, optional, type=string, default="catalog", List type: renqi (人气), zonghe (综合), shoucang (收藏), catalog (热门资讯)

### `news`

- Description: Latest tech/startup news from 36kr (36氪)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli 36kr news [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of articles (max 50)

### `search`

- Description: 搜索36氪文章
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli 36kr search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword (e.g.
  - `--limit`: option, optional, type=int, default=20, Number of results (max 50)

## antigravity

Commands: `dump` `extract-code` `model` `new` `read` `send` `status` `watch`

### `dump`

- Description: Dump the DOM to help AI understand the UI
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity dump`
- Parameters: none

### `extract-code`

- Description: Extract multi-line code blocks from the current Antigravity conversation
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity extract-code`
- Parameters: none

### `model`

- Description: Switch the active LLM model in Antigravity
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity model <name>`
- Parameters:
  - `<name>`: positional, required, type=str, Target model name (e.g. claude, gemini, o1)

### `new`

- Description: Start a new conversation / clear context in Antigravity
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity new`
- Parameters: none

### `read`

- Description: Read the latest chat messages from Antigravity AI
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity read [--last <last>]`
- Parameters:
  - `--last`: option, optional, type=str, Number of recent messages to read (not fully implemented due to generic structure, currently returns full history text or latest chunk)

### `send`

- Description: Send a message to Antigravity AI via the internal Lexical editor
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity send <message>`
- Parameters:
  - `<message>`: positional, required, type=str, The message text to send

### `status`

- Description: Check Antigravity CDP connection and get current page state
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity status`
- Parameters: none

### `watch`

- Description: Stream new chat messages from Antigravity in real-time
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli antigravity watch`
- Parameters: none

## apple-podcasts

Commands: `episodes` `search` `top`

### `episodes`

- Description: List recent episodes of an Apple Podcast (use ID from search)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli apple-podcasts episodes <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, Podcast ID (collectionId from search output)
  - `--limit`: option, optional, type=int, default=15, Max episodes to show

### `search`

- Description: Search Apple Podcasts
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli apple-podcasts search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--limit`: option, optional, type=int, default=10, Max results

### `top`

- Description: Top podcasts chart on Apple Podcasts
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli apple-podcasts top [--limit <limit>] [--country <country>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of podcasts (max 100)
  - `--country`: option, optional, type=str, default="us", Country code (e.g. us, cn, gb, jp)

## arxiv

Commands: `paper` `search`

### `paper`

- Description: Get arXiv paper details by ID
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli arxiv paper <id>`
- Parameters:
  - `<id>`: positional, required, type=str, arXiv paper ID (e.g. 1706.03762)

### `search`

- Description: Search arXiv papers
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli arxiv search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword (e.g.
  - `--limit`: option, optional, type=int, default=10, Max results (max 25)

## barchart

Commands: `flow` `greeks` `options` `quote`

### `flow`

- Description: Barchart unusual options activity / options flow
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli barchart flow [--type <type>] [--limit <limit>]`
- Parameters:
  - `--type`: option, optional, type=str, default="all", choices=all|call|put, Filter: all, call, or put
  - `--limit`: option, optional, type=int, default=20, Number of results

### `greeks`

- Description: Barchart options greeks overview (IV, delta, gamma, theta, vega)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli barchart greeks <symbol> [--expiration <expiration>] [--limit <limit>]`
- Parameters:
  - `<symbol>`: positional, required, type=str, Stock ticker (e.g. AAPL)
  - `--expiration`: option, optional, type=str, Expiration date (YYYY-MM-DD). Defaults to the nearest available expiration.
  - `--limit`: option, optional, type=int, default=10, Number of near-the-money strikes per type

### `options`

- Description: Barchart options chain with greeks, IV, volume, and open interest
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli barchart options <symbol> [--type <type>] [--limit <limit>]`
- Parameters:
  - `<symbol>`: positional, required, type=str, Stock ticker (e.g. AAPL)
  - `--type`: option, optional, type=str, default="Call", choices=Call|Put, Option type: Call or Put
  - `--limit`: option, optional, type=int, default=20, Max number of strikes to return

### `quote`

- Description: Barchart stock quote with price, volume, and key metrics
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli barchart quote <symbol>`
- Parameters:
  - `<symbol>`: positional, required, type=str, Stock ticker (e.g. AAPL, MSFT, TSLA)

## bbc

Commands: `news`

### `news`

- Description: BBC News headlines (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bbc news [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of headlines (max 50)

## bilibili

Commands: `comments` `download` `dynamic` `favorite` `feed` `following` `history` `hot` `me` `ranking` `search` `subtitle` `user-videos`

### `comments`

- Description: 获取 B站视频评论（使用官方 API + WBI 签名）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili comments <bvid> [--limit <limit>]`
- Parameters:
  - `<bvid>`: positional, required, type=str, Video BV ID (e.g. BV1WtAGzYEBm)
  - `--limit`: option, optional, type=int, default=20, Number of comments (max 50)

### `download`

- Description: 下载B站视频（需要 yt-dlp）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili download <bvid> [--output <output>] [--quality <quality>]`
- Parameters:
  - `<bvid>`: positional, required, type=str, Video BV ID (e.g., BV1xxx)
  - `--output`: option, optional, type=str, default="./bilibili-downloads", Output directory
  - `--quality`: option, optional, type=str, default="best", Video quality (best, 1080p, 720p, 480p)

### `dynamic`

- Description: Get Bilibili user dynamic feed
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili dynamic [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15

### `favorite`

- Description: 我的默认收藏夹
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili favorite [--limit <limit>] [--page <page>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results
  - `--page`: option, optional, type=int, default=1, Page number

### `feed`

- Description: 关注的人的动态时间线
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili feed [--limit <limit>] [--type <type>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results
  - `--type`: option, optional, type=str, default="all", Filter: all, video, article

### `following`

- Description: 获取 Bilibili 用户的关注列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili following [uid] [--page <page>] [--limit <limit>]`
- Parameters:
  - `<uid>`: positional, optional, type=str, 目标用户 ID（默认为当前登录用户）
  - `--page`: option, optional, type=int, default=1, 页码
  - `--limit`: option, optional, type=int, default=50, 每页数量 (最大 50)

### `history`

- Description: 我的观看历史
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili history [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results

### `hot`

- Description: B站热门视频
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of videos

### `me`

- Description: My Bilibili profile info
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili me`
- Parameters: none

### `ranking`

- Description: Get Bilibili video ranking board
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili ranking [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `search`

- Description: Search Bilibili videos or users
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili search <query> [--type <type>] [--page <page>] [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--type`: option, optional, type=str, default="video", video or user
  - `--page`: option, optional, type=int, default=1, Result page
  - `--limit`: option, optional, type=int, default=20, Number of results

### `subtitle`

- Description: 获取 Bilibili 视频的字幕
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili subtitle <bvid> [--lang <lang>]`
- Parameters:
  - `<bvid>`: positional, required, type=str
  - `--lang`: option, optional, type=str, 字幕语言代码 (如 zh-CN, en-US, ai-zh)，默认取第一个

### `user-videos`

- Description: 查看指定用户的投稿视频
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bilibili user-videos <uid> [--limit <limit>] [--order <order>] [--page <page>]`
- Parameters:
  - `<uid>`: positional, required, type=str, User UID or username
  - `--limit`: option, optional, type=int, default=20, Number of results
  - `--order`: option, optional, type=str, default="pubdate", Sort: pubdate, click, stow
  - `--page`: option, optional, type=int, default=1, Page number

## bloomberg

Commands: `businessweek` `economics` `feeds` `industries` `main` `markets` `news` `opinions` `politics` `tech`

### `businessweek`

- Description: Bloomberg Businessweek top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg businessweek [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `economics`

- Description: Bloomberg Economics top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg economics [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `feeds`

- Description: List the Bloomberg RSS feed aliases used by the adapter
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg feeds`
- Parameters: none

### `industries`

- Description: Bloomberg Industries top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg industries [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `main`

- Description: Bloomberg homepage top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg main [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `markets`

- Description: Bloomberg Markets top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg markets [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `news`

- Description: Read a Bloomberg story/article page and return title, full content, and media links
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli bloomberg news <link>`
- Parameters:
  - `<link>`: positional, required, type=str, Bloomberg story/article URL or relative Bloomberg path

### `opinions`

- Description: Bloomberg Opinion top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg opinions [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `politics`

- Description: Bloomberg Politics top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg politics [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

### `tech`

- Description: Bloomberg Tech top stories (RSS)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli bloomberg tech [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=1, Number of feed items to return (max 20)

## boss

Commands: `batchgreet` `chatlist` `chatmsg` `detail` `exchange` `greet` `invite` `joblist` `mark` `recommend` `resume` `search` `send` `stats`

### `batchgreet`

- Description: BOSS直聘批量向推荐候选人发送招呼
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss batchgreet [--job-id <job-id>] [--limit <limit>] [--text <text>]`
- Parameters:
  - `--job-id`: option, optional, type=str, default="", Filter by encrypted job ID (greet all jobs if empty)
  - `--limit`: option, optional, type=int, default=5, Max candidates to greet
  - `--text`: option, optional, type=str, default="", Custom greeting message (uses default if empty)

### `chatlist`

- Description: BOSS直聘查看聊天列表（招聘端）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss chatlist [--page <page>] [--limit <limit>] [--job-id <job-id>]`
- Parameters:
  - `--page`: option, optional, type=int, default=1, Page number
  - `--limit`: option, optional, type=int, default=20, Number of results
  - `--job-id`: option, optional, type=str, default="0", Filter by job ID (0=all)

### `chatmsg`

- Description: BOSS直聘查看与候选人的聊天消息
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss chatmsg <uid> [--page <page>]`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID (from chatlist)
  - `--page`: option, optional, type=int, default=1, Page number

### `detail`

- Description: BOSS直聘查看职位详情
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss detail <security-id>`
- Parameters:
  - `<security-id>`: positional, required, type=str, Security ID from search results (securityId field)

### `exchange`

- Description: BOSS直聘交换联系方式（请求手机/微信）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss exchange <uid> [--type <type>]`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID of the candidate
  - `--type`: option, optional, type=str, default="phone", choices=phone|wechat, Exchange type: phone or wechat

### `greet`

- Description: BOSS直聘向新候选人发送招呼（开始聊天）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss greet <uid> --security-id <security-id> --job-id <job-id> [--text <text>]`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID of the candidate (from recommend)
  - `--security-id`: option, required, type=str, Security ID of the candidate
  - `--job-id`: option, required, type=str, Encrypted job ID
  - `--text`: option, optional, type=str, default="", Custom greeting message (uses default template if empty)

### `invite`

- Description: BOSS直聘发送面试邀请
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss invite <uid> --time <time> [--address <address>] [--contact <contact>]`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID of the candidate
  - `--time`: option, required, type=str, Interview time (e.g. 2025-04-01 14:00)
  - `--address`: option, optional, type=str, default="", Interview address (uses saved address if empty)
  - `--contact`: option, optional, type=str, default="", Contact person name (uses saved contact if empty)

### `joblist`

- Description: BOSS直聘查看我发布的职位列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss joblist`
- Parameters: none

### `mark`

- Description: BOSS直聘给候选人添加标签
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss mark <uid> --label <label> [--remove <remove>]`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID of the candidate
  - `--label`: option, required, type=str, Label name (新招呼/沟通中/已约面/已获取简历/已交换电话/已交换微信/不合适/收藏) or label ID
  - `--remove`: option, optional, type=boolean, default=false, Remove the label instead of adding

### `recommend`

- Description: BOSS直聘查看推荐候选人（新招呼列表）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss recommend [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results to return

### `resume`

- Description: BOSS直聘查看候选人简历（招聘端）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss resume <uid>`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID of the candidate (from chatlist)

### `search`

- Description: BOSS直聘搜索职位
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss search <query> [--city <city>] [--experience <experience>] [--degree <degree>] [--salary <salary>] [--industry <industry>] [--page <page>] [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword (e.g. AI agent, 前端)
  - `--city`: option, optional, type=str, default="北京", City name or code (e.g. 杭州, 上海, 101010100)
  - `--experience`: option, optional, type=str, default="", Experience: 应届/1年以内/1-3年/3-5年/5-10年/10年以上
  - `--degree`: option, optional, type=str, default="", Degree: 大专/本科/硕士/博士
  - `--salary`: option, optional, type=str, default="", Salary: 3K以下/3-5K/5-10K/10-15K/15-20K/20-30K/30-50K/50K以上
  - `--industry`: option, optional, type=str, default="", Industry code or name (e.g. 100020, 互联网)
  - `--page`: option, optional, type=int, default=1, Page number
  - `--limit`: option, optional, type=int, default=15, Number of results

### `send`

- Description: BOSS直聘发送聊天消息
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss send <uid> <text>`
- Parameters:
  - `<uid>`: positional, required, type=str, Encrypted UID of the candidate (from chatlist)
  - `<text>`: positional, required, type=str, Message text to send

### `stats`

- Description: BOSS直聘职位数据统计
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli boss stats [--job-id <job-id>]`
- Parameters:
  - `--job-id`: option, optional, type=str, default="", Encrypted job ID (show all if empty)

## chaoxing

Commands: `assignments` `exams`

### `assignments`

- Description: 学习通作业列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli chaoxing assignments [--course <course>] [--status <status>] [--limit <limit>]`
- Parameters:
  - `--course`: option, optional, type=string, 按课程名过滤（模糊匹配）
  - `--status`: option, optional, type=string, default="all", choices=all|pending|submitted|graded, 按状态过滤
  - `--limit`: option, optional, type=int, default=20, 最大返回数量

### `exams`

- Description: 学习通考试列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli chaoxing exams [--course <course>] [--status <status>] [--limit <limit>]`
- Parameters:
  - `--course`: option, optional, type=string, 按课程名过滤（模糊匹配）
  - `--status`: option, optional, type=string, default="all", choices=all|upcoming|ongoing|finished, 按状态过滤
  - `--limit`: option, optional, type=int, default=20, 最大返回数量

## chatgpt

Commands: `ask` `model` `new` `read` `send` `status`

### `ask`

- Description: Send a prompt and wait for the AI response (send + wait + read)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli chatgpt ask <text> [--model <model>] [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--model`: option, optional, type=str, Model/mode to use: auto, instant, thinking, 5.2-instant, 5.2-thinking
  - `--timeout`: option, optional, type=str, default="30)", Max seconds to wait for response (default: 30)

### `model`

- Description: Switch ChatGPT Desktop model/mode (auto, instant, thinking, 5.2-instant, 5.2-thinking)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli chatgpt model <model>`
- Parameters:
  - `<model>`: positional, required, type=str, Model to switch to

### `new`

- Description: Open a new chat in ChatGPT Desktop App
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli chatgpt new`
- Parameters: none

### `read`

- Description: Read the last visible message from the focused ChatGPT Desktop window
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli chatgpt read`
- Parameters: none

### `send`

- Description: Send a message to the active ChatGPT Desktop App window
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli chatgpt send <text> [--model <model>]`
- Parameters:
  - `<text>`: positional, required, type=str, Message to send
  - `--model`: option, optional, type=str, Model/mode to use: auto, instant, thinking, 5.2-instant, 5.2-thinking

### `status`

- Description: Check if ChatGPT Desktop App is running natively on macOS
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli chatgpt status`
- Parameters: none

## chatwise

Commands: `ask` `export` `history` `model` `read` `send`

### `ask`

- Description: Send a prompt and wait for the AI response (send + wait + read)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli chatwise ask <text> [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--timeout`: option, optional, type=str, default="30)", Max seconds to wait (default: 30)

### `export`

- Description: Export the current ChatWise conversation to a Markdown file
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli chatwise export [--output <output>]`
- Parameters:
  - `--output`: option, optional, type=str, default="/tmp/chatwise-export.md)", Output file (default: /tmp/chatwise-export.md)

### `history`

- Description: List conversation history in ChatWise sidebar
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli chatwise history`
- Parameters: none

### `model`

- Description: Get or switch the active AI model in ChatWise
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli chatwise model [model-name]`
- Parameters:
  - `<model-name>`: positional, optional, type=str, Model to switch to (e.g. gpt-4, claude-3)

### `read`

- Description: Read the current ChatWise conversation history
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli chatwise read`
- Parameters: none

### `send`

- Description: Send a message to the active ChatWise conversation
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli chatwise send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Message to send

## codex

Commands: `ask` `export` `extract-diff` `history` `model` `read` `send`

### `ask`

- Description: Send a prompt and wait for the AI response (send + wait + read)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex ask <text> [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--timeout`: option, optional, type=str, default="60)", Max seconds to wait for response (default: 60)

### `export`

- Description: Export the current Codex conversation to a Markdown file
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex export [--output <output>]`
- Parameters:
  - `--output`: option, optional, type=str, default="/tmp/codex-export.md)", Output file (default: /tmp/codex-export.md)

### `extract-diff`

- Description: Extract visual code review diff patches from Codex
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex extract-diff`
- Parameters: none

### `history`

- Description: List recent conversation threads in Codex
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex history`
- Parameters: none

### `model`

- Description: Get or switch the currently active AI model in Codex Desktop
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex model [model-name]`
- Parameters:
  - `<model-name>`: positional, optional, type=str, The ID of the model to switch to (e.g. gpt-4)

### `read`

- Description: Read the contents of the current Codex conversation thread
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex read`
- Parameters: none

### `send`

- Description: Send text/commands to the Codex AI composer
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli codex send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Text, command (e.g. /review), or skill (e.g. $imagegen)

## coupang

Commands: `add-to-cart` `search`

### `add-to-cart`

- Description: Add a Coupang product to cart using logged-in browser session
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli coupang add-to-cart [product-id] [--url <url>]`
- Parameters:
  - `<product-id>`: positional, optional, type=str, Coupang product ID
  - `--url`: option, optional, type=str, Canonical product URL

### `search`

- Description: Search Coupang products with logged-in browser session
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli coupang search <query> [--page <page>] [--limit <limit>] [--filter <filter>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--page`: option, optional, type=int, default=1, Search result page number
  - `--limit`: option, optional, type=int, default=20, Max results (max 50)
  - `--filter`: option, optional, type=str, Optional search filter (currently supports: rocket)

## ctrip

Commands: `search`

### `search`

- Description: 携程旅行搜索
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli ctrip search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword (city or attraction)
  - `--limit`: option, optional, type=int, default=15, Number of results

## cursor

Commands: `ask` `composer` `export` `extract-code` `history` `model` `read` `send`

### `ask`

- Description: Send a prompt and wait for the AI response (send + wait + read)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor ask <text> [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--timeout`: option, optional, type=str, default="30)", Max seconds to wait for response (default: 30)

### `composer`

- Description: Send a prompt directly into Cursor Composer (Cmd+I shortcut)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor composer <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Text to send into Composer

### `export`

- Description: Export the current ${site} conversation to a Markdown file
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor export [--output <output>]`
- Parameters:
  - `--output`: option, optional, type=str, default="/tmp/${site", Output file (default: /tmp/${site}-export.md)

### `extract-code`

- Description: Extract multi-line code blocks from the current Cursor conversation
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor extract-code`
- Parameters: none

### `history`

- Description: List recent chat sessions from the Cursor sidebar
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor history`
- Parameters: none

### `model`

- Description: Get or switch the currently active AI model in Cursor
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor model [model-name]`
- Parameters:
  - `<model-name>`: positional, optional, type=str, The ID of the model to switch to (e.g. claude-3.5-sonnet)

### `read`

- Description: Read the current Cursor chat/composer conversation history
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor read`
- Parameters: none

### `send`

- Description: Send a prompt directly into Cursor Composer/Chat
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli cursor send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Text to send into Cursor

## devto

Commands: `tag` `top` `user`

### `tag`

- Description: Latest DEV.to articles for a specific tag
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli devto tag <tag> [--limit <limit>]`
- Parameters:
  - `<tag>`: positional, required, type=str, Tag name (e.g. javascript, python, webdev)
  - `--limit`: option, optional, type=int, default=20, Number of articles

### `top`

- Description: Top DEV.to articles of the day
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli devto top [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of articles

### `user`

- Description: Recent DEV.to articles from a specific user
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli devto user <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, DEV.to username (e.g. ben, thepracticaldev)
  - `--limit`: option, optional, type=int, default=20, Number of articles

## dictionary

Commands: `examples` `search` `synonyms`

### `examples`

- Description: Read real-world example sentences utilizing the word
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli dictionary examples <word>`
- Parameters:
  - `<word>`: positional, required, type=string, Word to get example sentences for

### `search`

- Description: Search the Free Dictionary API for definitions, parts of speech, and pronunciations.
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli dictionary search <word>`
- Parameters:
  - `<word>`: positional, required, type=string, Word to define (e.g., serendipity)

### `synonyms`

- Description: Find synonyms for a specific word
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli dictionary synonyms <word>`
- Parameters:
  - `<word>`: positional, required, type=string, Word to find synonyms for (e.g., serendipity)

## discord-app

Commands: `channels` `members` `read` `search` `send` `servers` `status`

### `channels`

- Description: List channels in the current Discord server
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app channels`
- Parameters: none

### `members`

- Description: List online members in the current Discord channel
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app members`
- Parameters: none

### `read`

- Description: Read recent messages from the active Discord channel
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app read [--count <count>]`
- Parameters:
  - `--count`: option, optional, type=str, default="20)", Number of messages to read (default: 20)

### `search`

- Description: Search messages in the current Discord server/channel (Cmd+F)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app search <query>`
- Parameters:
  - `<query>`: positional, required, type=str, Search query

### `send`

- Description: Send a message in the active Discord channel
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Message to send

### `servers`

- Description: List all Discord servers (guilds) in the sidebar
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app servers`
- Parameters: none

### `status`

- Description: Check active CDP connection to Discord Desktop
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli discord-app status`
- Parameters: none

## douban

Commands: `book-hot` `download` `marks` `movie-hot` `photos` `reviews` `search` `subject` `top250`

### `book-hot`

- Description: 豆瓣图书热门榜单
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban book-hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 返回的图书数量

### `download`

- Description: 下载电影海报/剧照图片
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban download <id> [--type <type>] [--limit <limit>] [--photo-id <photo-id>] [--output <output>]`
- Parameters:
  - `<id>`: positional, required, type=str, 电影 subject ID
  - `--type`: option, optional, type=str, default="Rb", 豆瓣 photos 的 type 参数，默认 Rb（海报）
  - `--limit`: option, optional, type=int, default=120, 最多下载多少张图片
  - `--photo-id`: option, optional, type=str, 只下载指定 photo_id 的图片
  - `--output`: option, optional, type=str, default="./douban-downloads", 输出目录

### `marks`

- Description: 导出个人观影标记
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban marks [--status <status>] [--limit <limit>] [--uid <uid>]`
- Parameters:
  - `--status`: option, optional, type=str, default="collect", choices=collect|wish|do|all, 标记类型: collect(看过), wish(想看), do(在看), all(全部)
  - `--limit`: option, optional, type=int, default=50, 导出数量， 0 表示全部
  - `--uid`: option, optional, type=str, 用户ID，不填则使用当前登录账号

### `movie-hot`

- Description: 豆瓣电影热门榜单
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban movie-hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 返回的电影数量

### `photos`

- Description: 获取电影海报/剧照图片列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban photos <id> [--type <type>] [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, 电影 subject ID
  - `--type`: option, optional, type=str, default="Rb", 豆瓣 photos 的 type 参数，默认 Rb（海报）
  - `--limit`: option, optional, type=int, default=120, 最多返回多少张图片

### `reviews`

- Description: 导出个人影评
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban reviews [--limit <limit>] [--uid <uid>] [--full]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 导出数量
  - `--uid`: option, optional, type=str, 用户ID，不填则使用当前登录账号
  - `--full`: option, optional, type=bool, default=false, 获取完整影评内容

### `search`

- Description: 搜索豆瓣电影、图书或音乐
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban search [--type <type>] <keyword> [--limit <limit>]`
- Parameters:
  - `--type`: option, optional, type=str, default="movie", choices=movie|book|music, 搜索类型（movie=电影, book=图书, music=音乐）
  - `<keyword>`: positional, required, type=str, 搜索关键词
  - `--limit`: option, optional, type=int, default=20, 返回结果数量

### `subject`

- Description: 获取电影详情
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban subject <id>`
- Parameters:
  - `<id>`: positional, required, type=str, 电影 ID

### `top250`

- Description: 豆瓣电影 Top250
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douban top250 [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=250, 返回结果数量

## doubao

Commands: `ask` `new` `read` `send` `status`

### `ask`

- Description: Send a prompt and wait for the Doubao response
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli doubao ask <text> [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--timeout`: option, optional, type=str, default="60)", Max seconds to wait (default: 60)

### `new`

- Description: Start a new conversation in Doubao web chat
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli doubao new`
- Parameters: none

### `read`

- Description: Read the current Doubao conversation history
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli doubao read`
- Parameters: none

### `send`

- Description: Send a message to Doubao web chat
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli doubao send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Message to send

### `status`

- Description: Check Doubao chat page availability and login state
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli doubao status`
- Parameters: none

## doubao-app

Commands: `ask` `dump` `new` `read` `screenshot` `send` `status`

### `ask`

- Description: Send a message to Doubao desktop app and wait for the AI response
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app ask <text> [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--timeout`: option, optional, type=int, default=30, Max seconds to wait for response

### `dump`

- Description: Dump Doubao desktop app DOM and snapshot to /tmp for debugging
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app dump`
- Parameters: none

### `new`

- Description: Start a new chat in Doubao desktop app
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app new`
- Parameters: none

### `read`

- Description: Read chat history from Doubao desktop app
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app read`
- Parameters: none

### `screenshot`

- Description: Capture a screenshot of the Doubao desktop app window
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app screenshot [--output <output>]`
- Parameters:
  - `--output`: option, optional, type=str, default="/tmp/doubao-screenshot.png)", Output file path (default: /tmp/doubao-screenshot.png)

### `send`

- Description: Send a message to Doubao desktop app
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Message text to send

### `status`

- Description: Check CDP connection to Doubao desktop app
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli doubao-app status`
- Parameters: none

## douyin

Commands: `activities` `collections` `delete` `draft` `drafts` `hashtag` `location` `profile` `publish` `stats` `update` `videos`

### `activities`

- Description: 官方活动列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin activities`
- Parameters: none

### `collections`

- Description: 合集列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin collections [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `delete`

- Description: 删除作品
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin delete <aweme_id>`
- Parameters:
  - `<aweme_id>`: positional, required, type=str, 作品 ID

### `draft`

- Description: 上传视频并保存为草稿
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin draft <video> --title <title> [--caption <caption>] [--cover <cover>] [--visibility <visibility>]`
- Parameters:
  - `<video>`: positional, required, type=str, 视频文件路径
  - `--title`: option, required, type=str, 视频标题（≤30字）
  - `--caption`: option, optional, type=str, default="", 正文内容（≤1000字，支持 #话题）
  - `--cover`: option, optional, type=str, default="", 封面图片路径
  - `--visibility`: option, optional, type=str, default="public", choices=public|friends|private

### `drafts`

- Description: 获取草稿列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin drafts [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `hashtag`

- Description: 话题搜索 / AI推荐 / 热点词
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin hashtag <action> [--keyword <keyword>] [--cover <cover>] [--limit <limit>]`
- Parameters:
  - `<action>`: positional, required, type=str, choices=search|suggest|hot, search=关键词搜索 suggest=AI推荐 hot=热点词
  - `--keyword`: option, optional, type=str, default="", 搜索关键词（search/hot 使用）
  - `--cover`: option, optional, type=str, default="", 封面 URI（suggest 使用）
  - `--limit`: option, optional, type=int, default=10

### `location`

- Description: 地理位置 POI 搜索
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin location <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, 地名关键词
  - `--limit`: option, optional, type=int, default=20

### `profile`

- Description: 获取账号信息
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin profile`
- Parameters: none

### `publish`

- Description: 定时发布视频到抖音（必须设置 2h ~ 14天后的发布时间）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin publish <video> --title <title> --schedule <schedule> [--caption <caption>] [--cover <cover>] [--visibility <visibility>] [--allow_download] [--collection <collection>] [--activity <activity>] [--poi_id <poi_id>] [--poi_name <poi_name>] [--hotspot <hotspot>] [--no_safety_check] [--sync_toutiao]`
- Parameters:
  - `<video>`: positional, required, type=str, 视频文件路径
  - `--title`: option, required, type=str, 视频标题（≤30字）
  - `--schedule`: option, required, type=str, 定时发布时间（ISO8601 或 Unix 秒，2h ~ 14天后）
  - `--caption`: option, optional, type=str, default="", 正文内容（≤1000字，支持 #话题）
  - `--cover`: option, optional, type=str, default="", 封面图片路径（不提供时使用视频截帧）
  - `--visibility`: option, optional, type=str, default="public", choices=public|friends|private
  - `--allow_download`: option, optional, type=bool, default=false, 允许下载
  - `--collection`: option, optional, type=str, default="", 合集 ID
  - `--activity`: option, optional, type=str, default="", 活动 ID
  - `--poi_id`: option, optional, type=str, default="", 地理位置 ID
  - `--poi_name`: option, optional, type=str, default="", 地理位置名称
  - `--hotspot`: option, optional, type=str, default="", 关联热点词
  - `--no_safety_check`: option, optional, type=bool, default=false, 跳过内容安全检测
  - `--sync_toutiao`: option, optional, type=bool, default=false, 同步发布到头条

### `stats`

- Description: 作品数据分析
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin stats <aweme_id>`
- Parameters:
  - `<aweme_id>`: positional, required, type=str

### `update`

- Description: 更新视频信息
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin update <aweme_id> [--reschedule <reschedule>] [--caption <caption>]`
- Parameters:
  - `<aweme_id>`: positional, required, type=str
  - `--reschedule`: option, optional, type=str, default="", 新的发布时间（ISO8601 或 Unix 秒）
  - `--caption`: option, optional, type=str, default="", 新的正文内容

### `videos`

- Description: 获取作品列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli douyin videos [--limit <limit>] [--page <page>] [--status <status>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 每页数量
  - `--page`: option, optional, type=int, default=1, 页码
  - `--status`: option, optional, type=str, default="all", choices=all|published|reviewing|scheduled

## facebook

Commands: `add-friend` `events` `feed` `friends` `groups` `join-group` `memories` `notifications` `profile` `search`

### `add-friend`

- Description: Send a friend request on Facebook
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook add-friend <username>`
- Parameters:
  - `<username>`: positional, required, type=str, Facebook username or profile URL

### `events`

- Description: Browse Facebook event categories
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook events [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15, Number of categories

### `feed`

- Description: Get your Facebook news feed
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook feed [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Number of posts

### `friends`

- Description: Get Facebook friend suggestions
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook friends [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Number of friend suggestions

### `groups`

- Description: List your Facebook groups
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook groups [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of groups

### `join-group`

- Description: Join a Facebook group
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook join-group <group>`
- Parameters:
  - `<group>`: positional, required, type=str, Group ID or URL path (e.g. '1876150192925481' or group name)

### `memories`

- Description: Get your Facebook memories (On This Day)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook memories [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Number of memories

### `notifications`

- Description: Get recent Facebook notifications
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook notifications [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15, Number of notifications

### `profile`

- Description: Get Facebook user/page profile info
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook profile <username>`
- Parameters:
  - `<username>`: positional, required, type=str, Facebook username or page name

### `search`

- Description: Search Facebook for people, pages, or posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli facebook search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=10, Number of results

## google

Commands: `news` `search` `suggest` `trends`

### `news`

- Description: Get Google News headlines
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli google news [keyword] [--limit <limit>] [--lang <lang>] [--region <region>]`
- Parameters:
  - `<keyword>`: positional, optional, type=str, Search query (omit for top stories)
  - `--limit`: option, optional, type=int, default=10, Number of results
  - `--lang`: option, optional, type=str, default="en", Language short code (e.g. en, zh)
  - `--region`: option, optional, type=str, default="US", Region code (e.g. US, CN)

### `search`

- Description: Search Google
- Mode: Browser
- Strategy: `public`
- Usage: `opencli google search <keyword> [--limit <limit>] [--lang <lang>]`
- Parameters:
  - `<keyword>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=10, Number of results (1-100)
  - `--lang`: option, optional, type=str, default="en", Language short code (e.g. en, zh)

### `suggest`

- Description: Get Google search suggestions
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli google suggest <keyword> [--lang <lang>]`
- Parameters:
  - `<keyword>`: positional, required, type=str, Search query
  - `--lang`: option, optional, type=str, default="zh-CN", Language code

### `trends`

- Description: Get Google Trends daily trending searches
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli google trends [--region <region>] [--limit <limit>]`
- Parameters:
  - `--region`: option, optional, type=str, default="US", Region code (e.g. US, CN, JP)
  - `--limit`: option, optional, type=int, default=20, Number of results

## grok

Commands: `ask`

### `ask`

- Description: Send a message to Grok and get response
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli grok ask <prompt> [--timeout <timeout>] [--new <new>] [--web <web>]`
- Parameters:
  - `<prompt>`: positional, required, type=string, Prompt to send to Grok
  - `--timeout`: option, optional, type=int, default=120, Max seconds to wait for response (default: 120)
  - `--new`: option, optional, type=boolean, default=false, Start a new chat before sending (default: false)
  - `--web`: option, optional, type=boolean, default=false, Use the explicit grok.com consumer web flow (default: false)

## hackernews

Commands: `ask` `best` `jobs` `new` `search` `show` `top` `user`

### `ask`

- Description: Hacker News Ask HN posts
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews ask [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `best`

- Description: Hacker News best stories
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews best [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `jobs`

- Description: Hacker News job postings
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews jobs [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of job postings

### `new`

- Description: Hacker News newest stories
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews new [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `search`

- Description: Search Hacker News stories
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews search <query> [--limit <limit>] [--sort <sort>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=20, Number of results
  - `--sort`: option, optional, type=str, default="relevance", choices=relevance|date, Sort by relevance or date

### `show`

- Description: Hacker News Show HN posts
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews show [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `top`

- Description: Hacker News top stories
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews top [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `user`

- Description: Hacker News user profile
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hackernews user <username>`
- Parameters:
  - `<username>`: positional, required, type=str, HN username

## hf

Commands: `top`

### `top`

- Description: Top upvoted Hugging Face papers
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli hf top [--limit <limit>] [--all] [--date <date>] [--period <period>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of papers
  - `--all`: option, optional, type=bool, default=false, Return all papers (ignore limit)
  - `--date`: option, optional, type=str, Date (YYYY-MM-DD), defaults to most recent
  - `--period`: option, optional, type=str, default="daily", choices=daily|weekly|monthly, Time period: daily, weekly, or monthly

## imdb

Commands: `person` `reviews` `search` `title` `top` `trending`

### `person`

- Description: Get actor or director info
- Mode: Browser
- Strategy: `public`
- Usage: `opencli imdb person <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, IMDb person ID (nm0634240) or URL
  - `--limit`: option, optional, type=int, default=10, Max filmography entries

### `reviews`

- Description: Get user reviews for a movie or TV show
- Mode: Browser
- Strategy: `public`
- Usage: `opencli imdb reviews <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, IMDb title ID (tt1375666) or URL
  - `--limit`: option, optional, type=int, default=10, Number of reviews

### `search`

- Description: Search IMDb for movies, TV shows, and people
- Mode: Browser
- Strategy: `public`
- Usage: `opencli imdb search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=20, Number of results

### `title`

- Description: Get movie or TV show details
- Mode: Browser
- Strategy: `public`
- Usage: `opencli imdb title <id>`
- Parameters:
  - `<id>`: positional, required, type=str, IMDb title ID (tt1375666) or URL

### `top`

- Description: IMDb Top 250 Movies
- Mode: Browser
- Strategy: `public`
- Usage: `opencli imdb top [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results

### `trending`

- Description: IMDb Most Popular Movies
- Mode: Browser
- Strategy: `public`
- Usage: `opencli imdb trending [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results

## instagram

Commands: `comment` `explore` `follow` `followers` `following` `like` `profile` `save` `saved` `search` `unfollow` `unlike` `unsave` `user`

### `comment`

- Description: Comment on an Instagram post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram comment <username> <text> [--index <index>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username of the post author
  - `<text>`: positional, required, type=str, Comment text
  - `--index`: option, optional, type=int, default=1, Post index (1 = most recent)

### `explore`

- Description: Instagram explore/discover trending posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram explore [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of posts

### `follow`

- Description: Follow an Instagram user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram follow <username>`
- Parameters:
  - `<username>`: positional, required, type=str, Instagram username to follow

### `followers`

- Description: List followers of an Instagram user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram followers <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Instagram username
  - `--limit`: option, optional, type=int, default=20, Number of followers

### `following`

- Description: List accounts an Instagram user is following
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram following <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Instagram username
  - `--limit`: option, optional, type=int, default=20, Number of accounts

### `like`

- Description: Like an Instagram post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram like <username> [--index <index>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username of the post author
  - `--index`: option, optional, type=int, default=1, Post index (1 = most recent)

### `profile`

- Description: Get Instagram user profile info
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram profile <username>`
- Parameters:
  - `<username>`: positional, required, type=str, Instagram username

### `save`

- Description: Save (bookmark) an Instagram post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram save <username> [--index <index>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username of the post author
  - `--index`: option, optional, type=int, default=1, Post index (1 = most recent)

### `saved`

- Description: Get your saved Instagram posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram saved [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of saved posts

### `search`

- Description: Search Instagram users
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=10, Number of results

### `unfollow`

- Description: Unfollow an Instagram user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram unfollow <username>`
- Parameters:
  - `<username>`: positional, required, type=str, Instagram username to unfollow

### `unlike`

- Description: Unlike an Instagram post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram unlike <username> [--index <index>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username of the post author
  - `--index`: option, optional, type=int, default=1, Post index (1 = most recent)

### `unsave`

- Description: Unsave (remove bookmark) an Instagram post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram unsave <username> [--index <index>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username of the post author
  - `--index`: option, optional, type=int, default=1, Post index (1 = most recent)

### `user`

- Description: Get recent posts from an Instagram user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli instagram user <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Instagram username
  - `--limit`: option, optional, type=int, default=12, Number of posts

## jd

Commands: `item`

### `item`

- Description: 京东商品详情（价格、店铺、规格参数、AVIF 图片）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jd item <sku> [--images <images>]`
- Parameters:
  - `<sku>`: positional, required, type=str, 商品 SKU ID（如 100291143898）
  - `--images`: option, optional, type=int, default=10, AVIF 图片数量上限（默认10）

## jike

Commands: `comment` `create` `feed` `like` `notifications` `post` `repost` `search` `topic` `user`

### `comment`

- Description: 评论即刻帖子
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli jike comment <id> <text>`
- Parameters:
  - `<id>`: positional, required, type=string, 帖子 ID
  - `<text>`: positional, required, type=string, 评论内容

### `create`

- Description: 发布即刻动态
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli jike create <text>`
- Parameters:
  - `<text>`: positional, required, type=string, 动态正文内容

### `feed`

- Description: 即刻首页动态流
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jike feed [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `like`

- Description: 点赞即刻帖子
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli jike like <id>`
- Parameters:
  - `<id>`: positional, required, type=string, 帖子 ID

### `notifications`

- Description: 即刻通知
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jike notifications [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `post`

- Description: 即刻帖子详情及评论
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jike post <id>`
- Parameters:
  - `<id>`: positional, required, type=string, Post ID (from post URL)

### `repost`

- Description: 转发即刻帖子
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli jike repost <id> [text]`
- Parameters:
  - `<id>`: positional, required, type=string, 帖子 ID
  - `<text>`: positional, optional, type=string, 转发附言（可选）

### `search`

- Description: 搜索即刻帖子
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jike search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=string
  - `--limit`: option, optional, type=int, default=20

### `topic`

- Description: 即刻话题/圈子帖子
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jike topic <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=string, Topic ID (from topic URL, e.g. 553870e8e4b0cafb0a1bef68)
  - `--limit`: option, optional, type=int, default=20, Number of posts

### `user`

- Description: 即刻用户动态
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jike user <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=string, Username from profile URL (e.g. wenhao1996)
  - `--limit`: option, optional, type=int, default=20, Number of posts

## jimeng

Commands: `generate` `history`

### `generate`

- Description: 即梦AI 文生图 — 输入 prompt 生成图片
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jimeng generate <prompt> [--model <model>] [--wait <wait>]`
- Parameters:
  - `<prompt>`: positional, required, type=string, 图片描述 prompt
  - `--model`: option, optional, type=string, default="high_aes_general_v50", 模型: high_aes_general_v50 (5.0 Lite), high_aes_general_v42 (4.6), high_aes_general_v40 (4.0)
  - `--wait`: option, optional, type=int, default=40, 等待生成完成的秒数

### `history`

- Description: 即梦AI 查看最近生成的作品
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli jimeng history [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=5

## lingma

Commands: `ask` `dump` `model` `new` `probe-network` `read` `screenshot` `send` `status`

### `ask`

- Description: Send a prompt and wait for the Lingma response (send + wait + read)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma ask <text> [--timeout <timeout>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send
  - `--timeout`: option, optional, type=str, default="60)", Max seconds to wait (default: 60)

### `dump`

- Description: Dump the DOM and Accessibility tree of Lingma for reverse-engineering
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma dump`
- Parameters: none

### `model`

- Description: Get or switch the active model in the Lingma Editor chat footer
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma model [model-name]`
- Parameters:
  - `<model-name>`: positional, optional, type=str, Model to switch to, for example Auto, qwen3-coder, qwen3-max

### `new`

- Description: Start a new Lingma conversation
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma new`
- Parameters: none

### `probe-network`

- Description: Send a Lingma prompt while probing fetch/XHR/WebSocket traffic for the active renderer
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma probe-network <text> [--timeout <timeout>] [--preview-bytes <preview-bytes>] [--max-events <max-events>]`
- Parameters:
  - `<text>`: positional, required, type=str, Prompt to send while probing traffic
  - `--timeout`: option, optional, type=str, default="45)", Max seconds to wait (default: 45)
  - `--preview-bytes`: option, optional, type=str, default="400)", Max preview length per captured payload (default: 400)
  - `--max-events`: option, optional, type=str, default="120)", Max captured rows to return (default: 120)

### `read`

- Description: Read the current Lingma conversation history
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma read [--last <last>]`
- Parameters:
  - `--last`: option, optional, type=int, Return only the last N top-level conversation items

### `screenshot`

- Description: Capture a snapshot of the current Lingma window (DOM + Accessibility tree)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma screenshot [--output <output>]`
- Parameters:
  - `--output`: option, optional, type=str, default="<system-temp>/lingma-snapshot.txt)", Output file path (default: <system-temp>/lingma-snapshot.txt)

### `send`

- Description: Send a message to the active Lingma sidebar conversation
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma send <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Message to send

### `status`

- Description: Check active CDP connection to Lingma Desktop
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli lingma status`
- Parameters: none

## linkedin

Commands: `search` `timeline`

### `search`

- Mode: Browser
- Strategy: `header`
- Usage: `opencli linkedin search <query> [--location <location>] [--limit <limit>] [--start <start>] [--details] [--company <company>] [--experience-level <experience-level>] [--job-type <job-type>] [--date-posted <date-posted>] [--remote <remote>]`
- Parameters:
  - `<query>`: positional, required, type=string, Job search keywords
  - `--location`: option, optional, type=string, Location text such as San Francisco Bay Area
  - `--limit`: option, optional, type=int, default=10, Number of jobs to return (max 100)
  - `--start`: option, optional, type=int, default=0, Result offset for pagination
  - `--details`: option, optional, type=bool, default=false, Include full job description and apply URL (slower)
  - `--company`: option, optional, type=string, Comma-separated company names or LinkedIn company IDs
  - `--experience-level`: option, optional, type=string, Comma-separated: internship, entry, associate, mid-senior, director, executive
  - `--job-type`: option, optional, type=string, Comma-separated: full-time, part-time, contract, temporary, volunteer, internship, other
  - `--date-posted`: option, optional, type=string, One of: any, month, week, 24h
  - `--remote`: option, optional, type=string, Comma-separated: on-site, hybrid, remote

### `timeline`

- Description: Read LinkedIn home timeline posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linkedin timeline [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of posts to return (max 100)

## linux-do

Commands: `categories` `category` `feed` `hot` `latest` `search` `tags` `topic` `user-posts` `user-topics`

### `categories`

- Description: linux.do 分类列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do categories [--subcategories <subcategories>] [--limit <limit>]`
- Parameters:
  - `--subcategories`: option, optional, type=boolean, default=false, Include subcategories
  - `--limit`: option, optional, type=int, default=20, Number of categories

### `category`

- Description: linux.do 分类内话题
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do category <slug> <id> [--limit <limit>]`
- Parameters:
  - `<slug>`: positional, required, type=str, Category slug (legacy compatibility argument)
  - `<id>`: positional, required, type=int, Category ID
  - `--limit`: option, optional, type=int, default=20, Number of items (per_page)

### `feed`

- Description: linux.do 话题列表（需登录；支持全站、标签、分类）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do feed [--view <view>] [--tag <tag>] [--category <category>] [--limit <limit>] [--order <order>] [--ascending <ascending>] [--period <period>]`
- Parameters:
  - `--view`: option, optional, type=str, default="latest", choices=latest|hot|top, View type
  - `--tag`: option, optional, type=str, Tag name, slug, or id
  - `--category`: option, optional, type=str, Category name, slug, id, or parent/name path
  - `--limit`: option, optional, type=int, default=20, Number of items (per_page)
  - `--order`: option, optional, type=str, default="default", choices=default|created|activity|views|posts|category|likes|op_likes|posters, Sort order
  - `--ascending`: option, optional, type=boolean, default=false, Sort ascending (default: desc)
  - `--period`: option, optional, type=str, choices=all|daily|weekly|monthly|quarterly|yearly, Time period (only for --view top)

### `hot`

- Description: linux.do 热门话题
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do hot [--limit <limit>] [--period <period>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of items (per_page)
  - `--period`: option, optional, type=str, default="weekly", choices=all|daily|weekly|monthly|quarterly|yearly, Time period

### `latest`

- Description: linux.do 最新话题
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do latest [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of items (per_page)

### `search`

- Description: 搜索 linux.do
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=20, Number of results

### `tags`

- Description: linux.do 标签列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do tags [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=30, Number of tags

### `topic`

- Description: linux.do 帖子详情和回复（首页）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do topic <id> [--limit <limit>] [--main_only]`
- Parameters:
  - `<id>`: positional, required, type=int, Topic ID
  - `--limit`: option, optional, type=int, default=20, Number of posts
  - `--main_only`: option, optional, type=bool, default=false, Only return the main post body without truncation

### `user-posts`

- Description: linux.do 用户的帖子
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do user-posts <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username
  - `--limit`: option, optional, type=int, default=20, Number of posts

### `user-topics`

- Description: linux.do 用户创建的话题
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli linux-do user-topics <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username
  - `--limit`: option, optional, type=int, default=20, Number of topics

## lobsters

Commands: `active` `hot` `newest` `tag`

### `active`

- Description: Lobste.rs most active discussions
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli lobsters active [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `hot`

- Description: Lobste.rs hottest stories
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli lobsters hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `newest`

- Description: Lobste.rs newest stories
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli lobsters newest [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of stories

### `tag`

- Description: Lobste.rs stories by tag
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli lobsters tag <tag> [--limit <limit>]`
- Parameters:
  - `<tag>`: positional, required, type=str, Tag name (e.g. programming, rust, security, ai)
  - `--limit`: option, optional, type=int, default=20, Number of stories

## medium

Commands: `feed` `search` `user`

### `feed`

- Description: Medium 热门文章 Feed
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli medium feed [--topic <topic>] [--limit <limit>]`
- Parameters:
  - `--topic`: option, optional, type=str, default="", 话题标签（如 technology, programming, ai）
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

### `search`

- Description: 搜索 Medium 文章
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli medium search <keyword> [--limit <limit>]`
- Parameters:
  - `<keyword>`: positional, required, type=str, 搜索关键词
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

### `user`

- Description: 获取 Medium 用户的文章列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli medium user <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Medium 用户名（如 @username 或 username）
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

## notion

Commands: `export` `favorites` `new` `read` `search` `sidebar` `status` `write`

### `export`

- Description: Export the current Notion page as Markdown
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion export [--output <output>]`
- Parameters:
  - `--output`: option, optional, type=str, default="/tmp/notion-export.md)", Output file (default: /tmp/notion-export.md)

### `favorites`

- Description: List pages from the Notion Favorites section in the sidebar
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion favorites`
- Parameters: none

### `new`

- Description: Create a new page in Notion
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion new [title]`
- Parameters:
  - `<title>`: positional, optional, type=str, Page title (optional)

### `read`

- Description: Read the content of the currently open Notion page
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion read`
- Parameters: none

### `search`

- Description: Search pages and databases in Notion via Quick Find (Cmd+P)
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion search <query>`
- Parameters:
  - `<query>`: positional, required, type=str, Search query

### `sidebar`

- Description: List pages and databases from the Notion sidebar
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion sidebar`
- Parameters: none

### `status`

- Description: Check active CDP connection to Notion Desktop
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion status`
- Parameters: none

### `write`

- Description: Append text content to the currently open Notion page
- Mode: Desktop
- Strategy: `ui`
- Usage: `opencli notion write <text>`
- Parameters:
  - `<text>`: positional, required, type=str, Text to append to the page

## paperreview

Commands: `feedback` `review` `submit`

### `feedback`

- Description: Submit feedback for a paperreview.ai review token
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli paperreview feedback <token> --helpfulness <helpfulness> --critical-error <critical-error> --actionable-suggestions <actionable-suggestions> [--additional-comments <additional-comments>]`
- Parameters:
  - `<token>`: positional, required, type=str, Review token returned by paperreview.ai
  - `--helpfulness`: option, required, type=int, Helpfulness score from 1 to 5
  - `--critical-error`: option, required, type=str, choices=yes|no, Whether the review contains a critical error
  - `--actionable-suggestions`: option, required, type=str, choices=yes|no, Whether the review contains actionable suggestions
  - `--additional-comments`: option, optional, type=str, Optional free-text feedback

### `review`

- Description: Fetch a paperreview.ai review by token
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli paperreview review <token>`
- Parameters:
  - `<token>`: positional, required, type=str, Review token returned by paperreview.ai

### `submit`

- Description: Submit a PDF to paperreview.ai for review
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli paperreview submit <pdf> --email <email> [--venue <venue>] [--dry-run] [--prepare-only]`
- Parameters:
  - `<pdf>`: positional, required, type=str, Path to the paper PDF
  - `--email`: option, required, type=str, Email address for the submission
  - `--venue`: option, optional, type=str, Optional target venue such as ICLR or NeurIPS
  - `--dry-run`: option, optional, type=bool, default=false, Validate the input and stop before remote submission
  - `--prepare-only`: option, optional, type=bool, default=false, Request an upload slot but stop before uploading the PDF

## pixiv

Commands: `detail` `download` `illusts` `ranking` `search` `user`

### `detail`

- Description: View illustration details (tags, stats, URLs)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli pixiv detail <id>`
- Parameters:
  - `<id>`: positional, required, type=str, Illustration ID

### `download`

- Description: Download illustration images from Pixiv
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli pixiv download <illust-id> [--output <output>]`
- Parameters:
  - `<illust-id>`: positional, required, type=str, Illustration ID
  - `--output`: option, optional, type=str, default="./pixiv-downloads", Output directory

### `illusts`

- Description: List a Pixiv artist
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli pixiv illusts <user-id> [--limit <limit>]`
- Parameters:
  - `<user-id>`: positional, required, type=str, Pixiv user ID
  - `--limit`: option, optional, type=int, default=20, Number of results

### `ranking`

- Description: Pixiv illustration rankings (daily/weekly/monthly)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli pixiv ranking [--mode <mode>] [--page <page>] [--limit <limit>]`
- Parameters:
  - `--mode`: option, optional, type=str, default="daily", choices=daily|weekly|monthly|rookie|original|male|female|daily_r18|weekly_r18, Ranking mode
  - `--page`: option, optional, type=int, default=1, Page number
  - `--limit`: option, optional, type=int, default=20, Number of results

### `search`

- Description: Search Pixiv illustrations by keyword
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli pixiv search <query> [--limit <limit>] [--order <order>] [--mode <mode>] [--page <page>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword or tag
  - `--limit`: option, optional, type=int, default=20, Number of results
  - `--order`: option, optional, type=str, default="date_d", choices=date_d|date|popular_d|popular_male_d|popular_female_d, Sort order
  - `--mode`: option, optional, type=str, default="all", choices=all|safe|r18, Search mode
  - `--page`: option, optional, type=int, default=1, Page number

### `user`

- Description: View Pixiv artist profile
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli pixiv user <uid>`
- Parameters:
  - `<uid>`: positional, required, type=str, Pixiv user ID

## producthunt

Commands: `browse` `hot` `posts` `today`

### `browse`

- Description: Best products in a Product Hunt category
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli producthunt browse <category> [--limit <limit>]`
- Parameters:
  - `<category>`: positional, required, type=string, Category slug, e.g. vibe-coding, ai-agents, developer-tools
  - `--limit`: option, optional, type=int, default=20, Number of results (max 50)

### `hot`

- Description: Today
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli producthunt hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results (max 50)

### `posts`

- Description: Latest Product Hunt launches (optional category filter)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli producthunt posts [--limit <limit>] [--category <category>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of results (max 50)
  - `--category`: option, optional, type=string, default="", Category filter: ${PRODUCTHUNT_CATEGORY_SLUGS.join(

### `today`

- Description: Today
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli producthunt today [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Max results

## reddit

Commands: `comment` `frontpage` `hot` `popular` `read` `save` `saved` `search` `subreddit` `subscribe` `upvote` `upvoted` `user` `user-comments` `user-posts`

### `comment`

- Description: Post a comment on a Reddit post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit comment <post-id> <text>`
- Parameters:
  - `<post-id>`: positional, required, type=string, Post ID (e.g. 1abc123) or fullname (t3_xxx)
  - `<text>`: positional, required, type=string, Comment text

### `frontpage`

- Description: Reddit Frontpage / r/all
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit frontpage [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15

### `hot`

- Description: Reddit 热门帖子
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit hot [--subreddit <subreddit>] [--limit <limit>]`
- Parameters:
  - `--subreddit`: option, optional, type=str, default="", Subreddit name (e.g. programming). Empty for frontpage
  - `--limit`: option, optional, type=int, default=20, Number of posts

### `popular`

- Description: Reddit Popular posts (/r/popular)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit popular [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `read`

- Description: Read a Reddit post and its comments
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit read <post-id> [--sort <sort>] [--limit <limit>] [--depth <depth>] [--replies <replies>] [--max-length <max-length>]`
- Parameters:
  - `<post-id>`: positional, required, type=str, Post ID (e.g. 1abc123) or full URL
  - `--sort`: option, optional, type=str, default="best", Comment sort: best, top, new, controversial, old, qa
  - `--limit`: option, optional, type=int, default=25, Number of top-level comments
  - `--depth`: option, optional, type=int, default=2, Max reply depth (1=no replies, 2=one level of replies, etc.)
  - `--replies`: option, optional, type=int, default=5, Max replies shown per comment at each level (sorted by score)
  - `--max-length`: option, optional, type=int, default=2000, Max characters per comment body (min 100)

### `save`

- Description: Save or unsave a Reddit post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit save <post-id> [--undo <undo>]`
- Parameters:
  - `<post-id>`: positional, required, type=string, Post ID (e.g. 1abc123) or fullname (t3_xxx)
  - `--undo`: option, optional, type=boolean, default=false, Unsave instead of save

### `saved`

- Description: Browse your saved Reddit posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit saved [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15

### `search`

- Description: Search Reddit Posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit search <query> [--subreddit <subreddit>] [--sort <sort>] [--time <time>] [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=string
  - `--subreddit`: option, optional, type=string, default="", Search within a specific subreddit
  - `--sort`: option, optional, type=string, default="relevance", Sort order: relevance, hot, top, new, comments
  - `--time`: option, optional, type=string, default="all", Time filter: hour, day, week, month, year, all
  - `--limit`: option, optional, type=int, default=15

### `subreddit`

- Description: Get posts from a specific Subreddit
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit subreddit <name> [--sort <sort>] [--time <time>] [--limit <limit>]`
- Parameters:
  - `<name>`: positional, required, type=string
  - `--sort`: option, optional, type=string, default="hot", Sorting method: hot, new, top, rising, controversial
  - `--time`: option, optional, type=string, default="all", Time filter for top/controversial: hour, day, week, month, year, all
  - `--limit`: option, optional, type=int, default=15

### `subscribe`

- Description: Subscribe or unsubscribe to a subreddit
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit subscribe <subreddit> [--undo <undo>]`
- Parameters:
  - `<subreddit>`: positional, required, type=string, Subreddit name (e.g. python)
  - `--undo`: option, optional, type=boolean, default=false, Unsubscribe instead of subscribe

### `upvote`

- Description: Upvote or downvote a Reddit post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit upvote <post-id> [--direction <direction>]`
- Parameters:
  - `<post-id>`: positional, required, type=string, Post ID (e.g. 1abc123) or fullname (t3_xxx)
  - `--direction`: option, optional, type=string, default="up", Vote direction: up, down, none

### `upvoted`

- Description: Browse your upvoted Reddit posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit upvoted [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15

### `user`

- Description: View a Reddit user profile
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit user <username>`
- Parameters:
  - `<username>`: positional, required, type=string

### `user-comments`

- Description: View a Reddit user's comment history
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit user-comments <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=string
  - `--limit`: option, optional, type=int, default=15

### `user-posts`

- Description: View a Reddit user's submitted posts
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reddit user-posts <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=string
  - `--limit`: option, optional, type=int, default=15

## reuters

Commands: `search`

### `search`

- Description: Reuters 路透社新闻搜索
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli reuters search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=10, Number of results (max 40)

## sinablog

Commands: `article` `hot` `search` `user`

### `article`

- Description: 获取新浪博客单篇文章详情
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli sinablog article <url>`
- Parameters:
  - `<url>`: positional, required, type=str, 文章URL（如 https://blog.sina.com.cn/s/blog_xxx.html）

### `hot`

- Description: 获取新浪博客热门文章/推荐
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli sinablog hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

### `search`

- Description: 搜索新浪博客文章（通过新浪搜索）
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli sinablog search <keyword> [--limit <limit>]`
- Parameters:
  - `<keyword>`: positional, required, type=str, 搜索关键词
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

### `user`

- Description: 获取新浪博客用户的文章列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli sinablog user <uid> [--limit <limit>]`
- Parameters:
  - `<uid>`: positional, required, type=str, 新浪博客用户ID（如 1234567890）
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

## sinafinance

Commands: `news`

### `news`

- Description: 新浪财经 7x24 小时实时快讯
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli sinafinance news [--limit <limit>] [--type <type>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Max results (max 50)
  - `--type`: option, optional, type=int, default=0, News type: 0=全部 1=A股 2=宏观 3=公司 4=数据 5=市场 6=国际 7=观点 8=央行 9=其它

## smzdm

Commands: `search`

### `search`

- Description: 什么值得买搜索好价
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli smzdm search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--limit`: option, optional, type=int, default=20, Number of results

## stackoverflow

Commands: `bounties` `hot` `search` `unanswered`

### `bounties`

- Description: Active bounties on Stack Overflow
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli stackoverflow bounties [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Max number of results

### `hot`

- Description: Hot Stack Overflow questions
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli stackoverflow hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Max number of results

### `search`

- Description: Search Stack Overflow questions
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli stackoverflow search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=string, Search query
  - `--limit`: option, optional, type=int, default=10, Max number of results

### `unanswered`

- Description: Top voted unanswered questions on Stack Overflow
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli stackoverflow unanswered [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Max number of results

## steam

Commands: `top-sellers`

### `top-sellers`

- Description: Steam top selling games
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli steam top-sellers [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Number of games

## substack

Commands: `feed` `publication` `search`

### `feed`

- Description: Substack 热门文章 Feed
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli substack feed [--category <category>] [--limit <limit>]`
- Parameters:
  - `--category`: option, optional, type=str, default="all", 文章分类: all, tech, business, culture, politics, science, health
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

### `publication`

- Description: 获取特定 Substack Newsletter 的最新文章
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli substack publication <url> [--limit <limit>]`
- Parameters:
  - `<url>`: positional, required, type=str, Newsletter URL（如 https://example.substack.com）
  - `--limit`: option, optional, type=int, default=20, 返回的文章数量

### `search`

- Description: 搜索 Substack 文章和 Newsletter
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli substack search <keyword> [--type <type>] [--limit <limit>]`
- Parameters:
  - `<keyword>`: positional, required, type=str, 搜索关键词
  - `--type`: option, optional, type=str, default="posts", choices=posts|publications, 搜索类型（posts=文章, publications=Newsletter）
  - `--limit`: option, optional, type=int, default=20, 返回结果数量

## tiktok

Commands: `comment` `explore` `follow` `following` `friends` `like` `live` `notifications` `profile` `save` `search` `unfollow` `unlike` `unsave` `user`

### `comment`

- Description: Comment on a TikTok video
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok comment <url> <text>`
- Parameters:
  - `<url>`: positional, required, type=str, TikTok video URL
  - `<text>`: positional, required, type=str, Comment text

### `explore`

- Description: Get trending TikTok videos from explore page
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok explore [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of videos

### `follow`

- Description: Follow a TikTok user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok follow <username>`
- Parameters:
  - `<username>`: positional, required, type=str, TikTok username (without @)

### `following`

- Description: List accounts you follow on TikTok
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok following [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of accounts

### `friends`

- Description: Get TikTok friend suggestions
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok friends [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of suggestions

### `like`

- Description: Like a TikTok video
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok like <url>`
- Parameters:
  - `<url>`: positional, required, type=str, TikTok video URL

### `live`

- Description: Browse live streams on TikTok
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok live [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Number of streams

### `notifications`

- Description: Get TikTok notifications (likes, comments, mentions, followers)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok notifications [--limit <limit>] [--type <type>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15, Number of notifications
  - `--type`: option, optional, type=str, default="all", choices=all|likes|comments|mentions|followers, Notification type

### `profile`

- Description: Get TikTok user profile info
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok profile <username>`
- Parameters:
  - `<username>`: positional, required, type=str, TikTok username (without @)

### `save`

- Description: Add a TikTok video to Favorites
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok save <url>`
- Parameters:
  - `<url>`: positional, required, type=str, TikTok video URL

### `search`

- Description: Search TikTok videos
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=10, Number of results

### `unfollow`

- Description: Unfollow a TikTok user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok unfollow <username>`
- Parameters:
  - `<username>`: positional, required, type=str, TikTok username (without @)

### `unlike`

- Description: Unlike a TikTok video
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok unlike <url>`
- Parameters:
  - `<url>`: positional, required, type=str, TikTok video URL

### `unsave`

- Description: Remove a TikTok video from Favorites
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok unsave <url>`
- Parameters:
  - `<url>`: positional, required, type=str, TikTok video URL

### `user`

- Description: Get recent videos from a TikTok user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli tiktok user <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, TikTok username (without @)
  - `--limit`: option, optional, type=int, default=10, Number of videos

## twitter

Commands: `accept` `article` `block` `bookmark` `bookmarks` `delete` `download` `follow` `followers` `following` `hide-reply` `like` `likes` `notifications` `post` `profile` `reply` `reply-dm` `search` `thread` `timeline` `trending` `unblock` `unbookmark` `unfollow`

### `accept`

- Description: Auto-accept DM requests containing specific keywords
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter accept <query> [--max <max>]`
- Parameters:
  - `<query>`: positional, required, type=string, Keywords to match (comma-separated for OR, e.g.
  - `--max`: option, optional, type=int, default=20, Maximum number of requests to accept (default: 20)

### `article`

- Description: Fetch a Twitter Article (long-form content) and export as Markdown
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter article <tweet-id>`
- Parameters:
  - `<tweet-id>`: positional, required, type=string, Tweet ID or URL containing the article

### `block`

- Description: Block a Twitter user
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter block <username>`
- Parameters:
  - `<username>`: positional, required, type=string, Twitter screen name (without @)

### `bookmark`

- Description: Bookmark a tweet
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter bookmark <url>`
- Parameters:
  - `<url>`: positional, required, type=string, Tweet URL to bookmark

### `bookmarks`

- Description: Fetch Twitter/X bookmarks
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter bookmarks [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `delete`

- Description: Delete a specific tweet by URL
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter delete <url>`
- Parameters:
  - `<url>`: positional, required, type=string, The URL of the tweet to delete

### `download`

- Description: 下载 Twitter/X 媒体（图片和视频）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter download [username] [--tweet-url <tweet-url>] [--limit <limit>] [--output <output>]`
- Parameters:
  - `<username>`: positional, optional, type=str, Twitter username (downloads from media tab)
  - `--tweet-url`: option, optional, type=str, Single tweet URL to download
  - `--limit`: option, optional, type=int, default=10, Number of tweets to scan
  - `--output`: option, optional, type=str, default="./twitter-downloads", Output directory

### `follow`

- Description: Follow a Twitter user
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter follow <username>`
- Parameters:
  - `<username>`: positional, required, type=string, Twitter screen name (without @)

### `followers`

- Description: Get accounts following a Twitter/X user
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli twitter followers [user] [--limit <limit>]`
- Parameters:
  - `<user>`: positional, optional, type=string
  - `--limit`: option, optional, type=int, default=50

### `following`

- Description: Get accounts a Twitter/X user is following
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli twitter following [user] [--limit <limit>]`
- Parameters:
  - `<user>`: positional, optional, type=string
  - `--limit`: option, optional, type=int, default=50

### `hide-reply`

- Description: Hide a reply on your tweet (useful for hiding bot/spam replies)
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter hide-reply <url>`
- Parameters:
  - `<url>`: positional, required, type=string, The URL of the reply tweet to hide

### `like`

- Description: Like a specific tweet
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter like <url>`
- Parameters:
  - `<url>`: positional, required, type=string, The URL of the tweet to like

### `likes`

- Description: Fetch liked tweets of a Twitter user
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter likes [username] [--limit <limit>]`
- Parameters:
  - `<username>`: positional, optional, type=string, Twitter screen name (without @). Defaults to logged-in user.
  - `--limit`: option, optional, type=int, default=20

### `notifications`

- Description: Get Twitter/X notifications
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli twitter notifications [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20

### `post`

- Description: Post a new tweet/thread
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter post <text>`
- Parameters:
  - `<text>`: positional, required, type=string, The text content of the tweet

### `profile`

- Description: Fetch a Twitter user profile (bio, stats, etc.)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter profile [username]`
- Parameters:
  - `<username>`: positional, optional, type=string, Twitter screen name (without @). Defaults to logged-in user.

### `reply`

- Description: Reply to a specific tweet
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter reply <url> <text>`
- Parameters:
  - `<url>`: positional, required, type=string, The URL of the tweet to reply to
  - `<text>`: positional, required, type=string, The text content of your reply

### `reply-dm`

- Description: Send a message to recent DM conversations
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter reply-dm <text> [--max <max>] [--skip-replied <skip-replied>]`
- Parameters:
  - `<text>`: positional, required, type=string, Message text to send (e.g.
  - `--max`: option, optional, type=int, default=20, Maximum number of conversations to reply to (default: 20)
  - `--skip-replied`: option, optional, type=boolean, default=true, Skip conversations where you already sent the same text (default: true)

### `search`

- Description: Search Twitter/X for tweets
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli twitter search <query> [--filter <filter>] [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=string
  - `--filter`: option, optional, type=string, default="top", choices=top|live
  - `--limit`: option, optional, type=int, default=15

### `thread`

- Description: Get a tweet thread (original + all replies)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter thread <tweet-id> [--limit <limit>]`
- Parameters:
  - `<tweet-id>`: positional, required, type=string
  - `--limit`: option, optional, type=int, default=50

### `timeline`

- Description: Fetch Twitter timeline (for-you or following)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter timeline [--type <type>] [--limit <limit>]`
- Parameters:
  - `--type`: option, optional, type=str, default="for-you", choices=for-you|following, Timeline type: for-you (algorithmic) or following (chronological)
  - `--limit`: option, optional, type=int, default=20

### `trending`

- Description: Twitter/X trending topics
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli twitter trending [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of trends to show

### `unblock`

- Description: Unblock a Twitter user
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter unblock <username>`
- Parameters:
  - `<username>`: positional, required, type=string, Twitter screen name (without @)

### `unbookmark`

- Description: Remove a tweet from bookmarks
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter unbookmark <url>`
- Parameters:
  - `<url>`: positional, required, type=string, Tweet URL to unbookmark

### `unfollow`

- Description: Unfollow a Twitter user
- Mode: Browser
- Strategy: `ui`
- Usage: `opencli twitter unfollow <username>`
- Parameters:
  - `<username>`: positional, required, type=string, Twitter screen name (without @)

## v2ex

Commands: `daily` `hot` `latest` `me` `member` `node` `nodes` `notifications` `replies` `topic` `user`

### `daily`

- Description: V2EX 每日签到并领取铜币
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli v2ex daily`
- Parameters: none

### `hot`

- Description: V2EX 热门话题
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of topics

### `latest`

- Description: V2EX 最新话题
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex latest [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of topics

### `me`

- Description: V2EX 获取个人资料 (余额/未读提醒)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli v2ex me`
- Parameters: none

### `member`

- Description: V2EX 用户资料
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex member <username>`
- Parameters:
  - `<username>`: positional, required, type=str, Username

### `node`

- Description: V2EX 节点话题列表
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex node <name> [--limit <limit>]`
- Parameters:
  - `<name>`: positional, required, type=str, Node name (e.g. python, javascript, apple)
  - `--limit`: option, optional, type=int, default=10, Number of topics (API returns max 20)

### `nodes`

- Description: V2EX 所有节点列表
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex nodes [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=30, Number of nodes

### `notifications`

- Description: V2EX 获取提醒 (回复/由于)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli v2ex notifications [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of notifications

### `replies`

- Description: V2EX 主题回复列表
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex replies <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, Topic ID
  - `--limit`: option, optional, type=int, default=20, Number of replies

### `topic`

- Description: V2EX 主题详情和回复
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex topic <id>`
- Parameters:
  - `<id>`: positional, required, type=str, Topic ID

### `user`

- Description: V2EX 用户发帖列表
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli v2ex user <username> [--limit <limit>]`
- Parameters:
  - `<username>`: positional, required, type=str, Username
  - `--limit`: option, optional, type=int, default=10, Number of topics (API returns max 20)

## web

Commands: `read`

### `read`

- Description: Fetch any web page and export as Markdown
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli web read --url <url> [--output <output>] [--download-images <download-images>] [--wait <wait>]`
- Parameters:
  - `--url`: option, required, type=str, Any web page URL
  - `--output`: option, optional, type=str, default="./web-articles", Output directory
  - `--download-images`: option, optional, type=boolean, default=true, Download images locally
  - `--wait`: option, optional, type=int, default=3, Seconds to wait after page load

## weibo

Commands: `comments` `feed` `hot` `me` `post` `search` `user`

### `comments`

- Description: Get comments on a Weibo post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo comments <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, Post ID (numeric idstr)
  - `--limit`: option, optional, type=int, default=20, Number of comments (max 50)

### `feed`

- Description: Weibo home timeline (posts from followed users)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo feed [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=15, Number of posts (max 50)

### `hot`

- Description: 微博热搜
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=30, Number of items (max 50)

### `me`

- Description: My Weibo profile info
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo me`
- Parameters: none

### `post`

- Description: Get a single Weibo post
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo post <id>`
- Parameters:
  - `<id>`: positional, required, type=str, Post ID (numeric idstr or mblogid from URL)

### `search`

- Description: 搜索微博
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo search <keyword> [--limit <limit>]`
- Parameters:
  - `<keyword>`: positional, required, type=str, Search keyword
  - `--limit`: option, optional, type=int, default=10, Number of results (max 50)

### `user`

- Description: Get Weibo user profile
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weibo user <id>`
- Parameters:
  - `<id>`: positional, required, type=str, User ID (numeric uid) or screen name

## weixin

Commands: `download`

### `download`

- Description: 下载微信公众号文章为 Markdown 格式
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weixin download --url <url> [--output <output>] [--download-images <download-images>]`
- Parameters:
  - `--url`: option, required, type=str, WeChat article URL (mp.weixin.qq.com/s/xxx)
  - `--output`: option, optional, type=str, default="./weixin-articles", Output directory
  - `--download-images`: option, optional, type=boolean, default=true, Download images locally

## weread

Commands: `book` `highlights` `notebooks` `notes` `ranking` `search` `shelf`

### `book`

- Description: View book details on WeRead
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weread book <book-id>`
- Parameters:
  - `<book-id>`: positional, required, type=str, Book ID (numeric, from search or shelf results)

### `highlights`

- Description: List your highlights (underlines) in a book
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weread highlights <book-id> [--limit <limit>]`
- Parameters:
  - `<book-id>`: positional, required, type=str, Book ID (from shelf or search results)
  - `--limit`: option, optional, type=int, default=20, Max results

### `notebooks`

- Description: List books that have highlights or notes
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weread notebooks`
- Parameters: none

### `notes`

- Description: List your notes (thoughts) on a book
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weread notes <book-id> [--limit <limit>]`
- Parameters:
  - `<book-id>`: positional, required, type=str, Book ID (from shelf or search results)
  - `--limit`: option, optional, type=int, default=20, Max results

### `ranking`

- Description: WeRead book rankings by category
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli weread ranking [category] [--limit <limit>]`
- Parameters:
  - `<category>`: positional, optional, type=str, default="all", Category: all (default), rising, or numeric category ID
  - `--limit`: option, optional, type=int, default=20, Max results

### `search`

- Description: Search books on WeRead
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli weread search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--limit`: option, optional, type=int, default=10, Max results

### `shelf`

- Description: List books on your WeRead bookshelf
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli weread shelf [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Max results

## wikipedia

Commands: `random` `search` `summary` `trending`

### `random`

- Description: Get a random Wikipedia article
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli wikipedia random [--lang <lang>]`
- Parameters:
  - `--lang`: option, optional, type=str, default="en", Language code (e.g. en, zh, ja)

### `search`

- Description: Search Wikipedia articles
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli wikipedia search <query> [--limit <limit>] [--lang <lang>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--limit`: option, optional, type=int, default=10, Max results
  - `--lang`: option, optional, type=str, default="en", Language code (e.g. en, zh, ja)

### `summary`

- Description: Get Wikipedia article summary
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli wikipedia summary <title> [--lang <lang>]`
- Parameters:
  - `<title>`: positional, required, type=str, Article title (e.g.
  - `--lang`: option, optional, type=str, default="en", Language code (e.g. en, zh, ja)

### `trending`

- Description: Most-read Wikipedia articles (yesterday)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli wikipedia trending [--limit <limit>] [--lang <lang>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=10, Max results
  - `--lang`: option, optional, type=str, default="en", Language code (e.g. en, zh, ja)

## xiaohongshu

Commands: `comments` `creator-note-detail` `creator-notes` `creator-notes-summary` `creator-profile` `creator-stats` `download` `feed` `notifications` `publish` `search` `user`

### `comments`

- Description: 获取小红书笔记评论（仅主评论，不含楼中楼）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu comments <note-id> [--limit <limit>]`
- Parameters:
  - `<note-id>`: positional, required, type=str, Note ID or full /explore/<id> URL
  - `--limit`: option, optional, type=int, default=20, Number of comments (max 50)

### `creator-note-detail`

- Description: 小红书单篇笔记详情页数据 (笔记信息 + 核心/互动数据 + 观看来源 + 观众画像 + 趋势数据)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu creator-note-detail <note-id>`
- Parameters:
  - `<note-id>`: positional, required, type=string, Note ID (from creator-notes or note-detail page URL)

### `creator-notes`

- Description: 小红书创作者笔记列表 + 每篇数据 (标题/日期/观看/点赞/收藏/评论)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu creator-notes [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of notes to return

### `creator-notes-summary`

- Description: 小红书最近笔记批量摘要 (列表 + 单篇关键数据汇总)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu creator-notes-summary [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=3, Number of recent notes to summarize

### `creator-profile`

- Description: 小红书创作者账号信息 (粉丝/关注/获赞/成长等级)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu creator-profile`
- Parameters: none

### `creator-stats`

- Description: 小红书创作者数据总览 (观看/点赞/收藏/评论/分享/涨粉，含每日趋势)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu creator-stats [--period <period>]`
- Parameters:
  - `--period`: option, optional, type=string, default="seven", choices=seven|thirty, Stats period: seven or thirty

### `download`

- Description: 下载小红书笔记中的图片和视频
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu download <note-id> [--output <output>]`
- Parameters:
  - `<note-id>`: positional, required, type=str, Note ID (from URL)
  - `--output`: option, optional, type=str, default="./xiaohongshu-downloads", Output directory

### `feed`

- Description: 小红书首页推荐 Feed (via Pinia Store Action)
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli xiaohongshu feed [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of items to return

### `notifications`

- Description: 小红书通知 (mentions/likes/connections)
- Mode: Browser
- Strategy: `intercept`
- Usage: `opencli xiaohongshu notifications [--type <type>] [--limit <limit>]`
- Parameters:
  - `--type`: option, optional, type=str, default="mentions", Notification type: mentions, likes, or connections
  - `--limit`: option, optional, type=int, default=20, Number of notifications to return

### `publish`

- Description: 小红书发布图文笔记 (creator center UI automation)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu publish --title <title> <content> [--images <images>] [--topics <topics>] [--draft]`
- Parameters:
  - `--title`: option, required, type=str, 笔记标题 (最多20字)
  - `<content>`: positional, required, type=str, 笔记正文
  - `--images`: option, optional, type=str, 图片路径，逗号分隔，最多9张 (jpg/png/gif/webp)
  - `--topics`: option, optional, type=str, 话题标签，逗号分隔，不含 # 号
  - `--draft`: option, optional, type=bool, default=false, 保存为草稿，不直接发布

### `search`

- Description: 搜索小红书笔记
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search keyword
  - `--limit`: option, optional, type=int, default=20, Number of results

### `user`

- Description: Get public notes from a Xiaohongshu user profile
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xiaohongshu user <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=string, User id or profile URL
  - `--limit`: option, optional, type=int, default=15, Number of notes to return

## xiaoyuzhou

Commands: `episode` `podcast` `podcast-episodes`

### `episode`

- Description: View details of a Xiaoyuzhou podcast episode
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli xiaoyuzhou episode <id>`
- Parameters:
  - `<id>`: positional, required, type=str, Episode ID (eid from podcast-episodes output)

### `podcast`

- Description: View a Xiaoyuzhou podcast profile
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli xiaoyuzhou podcast <id>`
- Parameters:
  - `<id>`: positional, required, type=str, Podcast ID (from xiaoyuzhoufm.com URL)

### `podcast-episodes`

- Description: List recent episodes of a Xiaoyuzhou podcast (up to 15, SSR limit)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli xiaoyuzhou podcast-episodes <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, Podcast ID (from xiaoyuzhoufm.com URL)
  - `--limit`: option, optional, type=int, default=15, Max episodes to show (up to 15, SSR limit)

## xueqiu

Commands: `earnings-date` `feed` `fund-holdings` `fund-snapshot` `hot` `hot-stock` `search` `stock` `watchlist`

### `earnings-date`

- Description: 获取股票预计财报发布日期（公司大事）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu earnings-date <symbol> [--next] [--limit <limit>]`
- Parameters:
  - `<symbol>`: positional, required, type=str, 股票代码，如 SH600519、SZ000858、00700
  - `--next`: option, optional, type=bool, default=false, 仅返回最近一次未发布的财报日期
  - `--limit`: option, optional, type=int, default=10, 返回数量，默认 10

### `feed`

- Description: 获取雪球首页时间线（关注用户的动态）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu feed [--page <page>] [--limit <limit>]`
- Parameters:
  - `--page`: option, optional, type=int, default=1, 页码，默认 1
  - `--limit`: option, optional, type=int, default=20, 每页数量，默认 20

### `fund-holdings`

- Description: 获取蛋卷基金持仓明细（可用 --account 按子账户过滤）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu fund-holdings [--account <account>]`
- Parameters:
  - `--account`: option, optional, type=str, default="", 按子账户名称或 ID 过滤

### `fund-snapshot`

- Description: 获取蛋卷基金快照（总资产、子账户、持仓，推荐 -f json 输出）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu fund-snapshot`
- Parameters: none

### `hot`

- Description: 获取雪球热门动态
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 返回数量，默认 20，最大 50

### `hot-stock`

- Description: 获取雪球热门股票榜
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu hot-stock [--limit <limit>] [--type <type>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, 返回数量，默认 20，最大 50
  - `--type`: option, optional, type=str, default="10", 榜单类型 10=人气榜(默认) 12=关注榜

### `search`

- Description: 搜索雪球股票（代码或名称）
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, 搜索关键词，如 茅台、AAPL、腾讯
  - `--limit`: option, optional, type=int, default=10, 返回数量，默认 10

### `stock`

- Description: 获取雪球股票实时行情
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu stock <symbol>`
- Parameters:
  - `<symbol>`: positional, required, type=str, 股票代码，如 SH600519、SZ000858、AAPL、00700

### `watchlist`

- Description: 获取雪球自选股列表
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli xueqiu watchlist [--category <category>] [--limit <limit>]`
- Parameters:
  - `--category`: option, optional, type=str, default="1", 分类：1=自选(默认) 2=持仓 3=关注
  - `--limit`: option, optional, type=int, default=100, 默认 100

## yahoo-finance

Commands: `quote`

### `quote`

- Description: Yahoo Finance 股票行情
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yahoo-finance quote <symbol>`
- Parameters:
  - `<symbol>`: positional, required, type=str, Stock ticker (e.g. AAPL, MSFT, TSLA)

## yollomi

Commands: `background` `edit` `face-swap` `generate` `models` `object-remover` `remove-bg` `restore` `try-on` `upload` `upscale` `video`

### `background`

- Description: Generate AI background for a product/object image (5 credits)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi background <image> [--prompt <prompt>] [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<image>`: positional, required, type=str, Image URL (upload via
  - `--prompt`: option, optional, type=str, default="", Background description (optional)
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `edit`

- Description: Edit images with AI text prompts (Qwen image edit)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi edit <image> <prompt> [--model <model>] [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<image>`: positional, required, type=str, Input image URL (upload via
  - `<prompt>`: positional, required, type=str, Editing instruction (e.g.
  - `--model`: option, optional, type=str, default="qwen-image-edit", choices=qwen-image-edit|qwen-image-edit-plus, Edit model
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `face-swap`

- Description: Swap faces between two photos (3 credits)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi face-swap --source <source> --target <target> [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `--source`: option, required, type=str, Source face image URL
  - `--target`: option, required, type=str, Target photo URL
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `generate`

- Description: Generate images with AI (text-to-image or image-to-image)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi generate <prompt> [--model <model>] [--ratio <ratio>] [--image <image>] [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<prompt>`: positional, required, type=str, Text prompt describing the image
  - `--model`: option, optional, type=str, default="z-image-turbo", Model ID (z-image-turbo, flux-schnell, nano-banana, flux-2-pro, ...)
  - `--ratio`: option, optional, type=str, default="1:1", choices=1:1|16:9|9:16|4:3|3:4, Aspect ratio
  - `--image`: option, optional, type=str, Input image URL for image-to-image (upload via
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URLs, skip download

### `models`

- Description: List available Yollomi AI models (image, video, tools)
- Mode: Public/Local
- Strategy: `public`
- Usage: `opencli yollomi models [--type <type>]`
- Parameters:
  - `--type`: option, optional, type=str, default="all", choices=all|image|video|tool, Filter by model type

### `object-remover`

- Description: Remove unwanted objects from images (3 credits)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi object-remover <image> <mask> [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<image>`: positional, required, type=str, Image URL
  - `<mask>`: positional, required, type=str, Mask image URL (white = area to remove)
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `remove-bg`

- Description: Remove image background with AI (free)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi remove-bg <image> [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<image>`: positional, required, type=str, Image URL to remove background from
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `restore`

- Description: Restore old or damaged photos with AI (4 credits)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi restore <image> [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<image>`: positional, required, type=str, Image URL to restore
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `try-on`

- Description: Virtual try-on — see how clothes look on a person (3 credits)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi try-on --person <person> --cloth <cloth> [--cloth-type <cloth-type>] [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `--person`: option, required, type=str, Person photo URL (upload via
  - `--cloth`: option, required, type=str, Clothing image URL
  - `--cloth-type`: option, optional, type=str, default="upper", choices=upper|lower|overall, Clothing type
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `upload`

- Description: Upload an image or video to Yollomi (returns URL for other commands)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi upload <file>`
- Parameters:
  - `<file>`: positional, required, type=str, Local file path to upload

### `upscale`

- Description: Upscale image resolution with AI (1 credit)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi upscale <image> [--scale <scale>] [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<image>`: positional, required, type=str, Image URL to upscale
  - `--scale`: option, optional, type=str, default="2", choices=2|4, Upscale factor (2 or 4)
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL

### `video`

- Description: Generate videos with AI (text-to-video or image-to-video)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli yollomi video <prompt> [--model <model>] [--image <image>] [--ratio <ratio>] [--output <output>] [--no-download <no-download>]`
- Parameters:
  - `<prompt>`: positional, required, type=str, Text prompt describing the video
  - `--model`: option, optional, type=str, default="kling-2-1", Model (kling-2-1, openai-sora-2, google-veo-3-1, wan-2-5-t2v, ...)
  - `--image`: option, optional, type=str, Input image URL for image-to-video
  - `--ratio`: option, optional, type=str, default="16:9", choices=1:1|16:9|9:16|4:3|3:4, Aspect ratio
  - `--output`: option, optional, type=str, default="./yollomi-output", Output directory
  - `--no-download`: option, optional, type=boolean, default=false, Only show URL, skip download

## youtube

Commands: `channel` `comments` `search` `transcript` `video`

### `channel`

- Description: Get YouTube channel info and recent videos
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli youtube channel <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, Channel ID (UCxxxx) or handle (@name)
  - `--limit`: option, optional, type=int, default=10, Max recent videos (max 30)

### `comments`

- Description: Get YouTube video comments
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli youtube comments <url> [--limit <limit>]`
- Parameters:
  - `<url>`: positional, required, type=str, YouTube video URL or video ID
  - `--limit`: option, optional, type=int, default=20, Max comments (max 100)

### `search`

- Description: Search YouTube videos
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli youtube search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=20, Max results (max 50)

### `transcript`

- Description: Get YouTube video transcript/subtitles
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli youtube transcript <url> [--lang <lang>] [--mode <mode>]`
- Parameters:
  - `<url>`: positional, required, type=str, YouTube video URL or video ID
  - `--lang`: option, optional, type=str, Language code (e.g. en, zh-Hans). Omit to auto-select
  - `--mode`: option, optional, type=str, default="grouped", Output mode: grouped (readable paragraphs) or raw (every segment)

### `video`

- Description: Get YouTube video metadata (title, views, description, etc.)
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli youtube video <url>`
- Parameters:
  - `<url>`: positional, required, type=str, YouTube video URL or video ID

## zhihu

Commands: `download` `hot` `question` `search`

### `download`

- Description: 导出知乎文章为 Markdown 格式
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli zhihu download --url <url> [--output <output>] [--download-images <download-images>]`
- Parameters:
  - `--url`: option, required, type=str, Article URL (zhuanlan.zhihu.com/p/xxx)
  - `--output`: option, optional, type=str, default="./zhihu-articles", Output directory
  - `--download-images`: option, optional, type=boolean, default=false, Download images locally

### `hot`

- Description: 知乎热榜
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli zhihu hot [--limit <limit>]`
- Parameters:
  - `--limit`: option, optional, type=int, default=20, Number of items to return

### `question`

- Description: 知乎问题详情和回答
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli zhihu question <id> [--limit <limit>]`
- Parameters:
  - `<id>`: positional, required, type=str, Question ID (numeric)
  - `--limit`: option, optional, type=int, default=5, Number of answers

### `search`

- Description: 知乎搜索
- Mode: Browser
- Strategy: `cookie`
- Usage: `opencli zhihu search <query> [--limit <limit>]`
- Parameters:
  - `<query>`: positional, required, type=str, Search query
  - `--limit`: option, optional, type=int, default=10, Number of results

