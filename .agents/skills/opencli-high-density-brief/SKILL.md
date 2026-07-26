---
name: opencli-high-density-brief
description: |
  Generate high-density Chinese digests, daily briefs, or panoramic summaries from websites supported by opencli. Use when the user asks for 今日简报 / 高浓度简报 / 全景简报 / digest / roundup / deep-read summary for V2EX, Hacker News, Reddit, Twitter/X, Weibo, 小红书, Zhihu, YouTube, 雪球, 微信读书 and other opencli-supported sites. Prefer current-repo opencli commands and lightweight repo-local extractor patches over heavy browser automation.
---

# opencli-high-density-brief

Use this skill when the user wants a concise but high-value content brief across one supported site.

## Goal

Produce a Chinese brief that:
- starts from a broad candidate pool
- filters by information density
- deep-reads only the best items
- removes comment noise
- outputs categorized, actionable takeaways

## Default workflow

1. Discover the current site capability from the repo, not from memory.
2. Prefer the repo-generated command manual first:
   - `docs/generated/opencli-command-manual.md`
3. If needed, verify with:
   - `opencli list`
   - `opencli <site> --help`
   - `opencli <site> <command> --help`
4. Fetch the broad candidate pool with the site's list-like command (`latest`, `hot`, `feed`, `search`, `frontpage`, `top`, etc.).
5. Do first-pass filtering from titles and light metadata only.
6. For shortlisted items, fetch detail and comments using existing opencli commands.
7. If the current adapter is missing only a few required fields, prefer a tiny repo-local patch or extractor over switching tools.
8. Avoid Playwright or heavy browser automation unless the user explicitly asks for that path.

## Filtering standard

Prefer:
- AI tools, models, automation, agent workflows
- infra, servers, cloud, DNS, CDN, Cloudflare, domains, hosting, networking
- terminal, CLI, tmux, devtools, OSS, engineering productivity
- software recommendations with hard-won experience
- concrete career, workflow, finance, travel, or life-hack posts with execution value

Filter out:
- pure chat
- low-information complaints
- ragebait
- title-only emotional posts
- meme or joke threads
- comments like “顶 / 同问 / mark / +1 / 纯表情 / 纯附和”

## Output rules

- Output only in Chinese unless the user asks otherwise.
- Do not expose command logs, scraping steps, or chain-of-thought.
- Sort by `信息密度 × 实用性 × 讨论质量`, not by time.
- If sample size is lower than requested, continue with real data and mention it briefly at the end.

Default per-item format:

```text
[原标题 + 紧凑链接]

核心脉络：
1-2 句话概括楼主真正的问题、坑点、方案对比或核心信息。

评论区风向：
只提炼有执行价值的建议、经验、纠偏、最佳实践或失败案例。

✅ 一句话结论：
给出最值得带走的判断。
```

Default wrap-up:
- 今日总体风向：3-5 条
- 今日最值得立即试试的 5 个点

## Site adaptation

Before execution, read [references/site-strategies.md](references/site-strategies.md).

When the user asks for a reusable prompt or wants to switch to another site, read:
- [references/prompt-template.md](references/prompt-template.md)

## Patch policy

If the current repo is missing small but necessary fields:
- patch the current repo minimally
- keep the patch local to the target site adapter
- prefer public API expansion or narrow field mapping changes
- do not introduce heavyweight fallback machinery just to finish one brief

Typical acceptable patch scope:
- expose `id`, `url`, `author`, `content`, `node`, `score`, or `comments`
- add a light detail/replies extractor
- adjust output columns for downstream digest generation

## Validation

Before trusting a workflow:
- ensure the commands actually exist in the current repo/manual
- check argument shape from the manual or `--help`
- if you patch an adapter, run a focused command or targeted test when practical
