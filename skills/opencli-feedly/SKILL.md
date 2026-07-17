---
name: opencli-feedly
description: Use OpenCLI to inspect a Feedly account, list unread entries and streams, search personal feeds or Feedly publication buckets, and mark entries read. Use when a user asks to query Feedly, search subscribed feeds/newsletters, filter Feedly results by date or source scope, configure Feedly credentials, or investigate Feedly structured/template search layers.
---

# OpenCLI Feedly

Use the browser-free `feedly` adapter. Read live help before execution because the installed OpenCLI version is the source of truth.

## Preflight

```bash
opencli feedly --help
opencli feedly <command> --help
```

Feedly commands use `Strategy.LOCAL`: they run from Node without controlling Chrome, but call Feedly's authenticated APIs.

Configure `FEEDLY_CONFIG_PATH` or create `~/.opencli/feedly.json` with a `refresh_token` or `access_token`. Never place tokens in commands, skill files, fixtures, or source code.

## Choose a command

- Verify credentials or obtain the account ID: `opencli feedly profile -f json`
- Search subscribed and curated sources: `opencli feedly search <query> ... -f json`
- Read unread entries: `opencli feedly unread ... -f json`
- Discover source IDs: `opencli feedly streams -f json`
- Inspect categories, subscriptions, or counts: use the matching command
- Mark entries read: inspect `opencli feedly mark-read --help`, then honor its confirmation requirement

## Search contents

```bash
opencli feedly search "typescript" --limit 40 -f json
opencli feedly search "OpenAI" --scope personal --newer-than 2026-01-01 --older-than 2026-07-01 -f json
opencli feedly search "database" --scope tech -f json
```

Treat `--newer-than` and `--older-than` as epoch-millisecond timestamps or ISO dates. Keep `newer-than` earlier than `older-than`.

Use scopes as follows:

- `personal`: the account's `global.all` stream
- `business`: Feedly's Business & Strategy publication bucket
- `tech`: Feedly's Tech Blogs publication bucket
- `all`: all three sources above

Return stable entry IDs so callers can pass results to `mark-read` or later detail workflows.

## Template search boundary

The Feedly web page implements templates with the same `/v3/search/contents` endpoint, but represents them as multiple structured `layers` containing Feedly NLP model or entity IDs.

The current `opencli feedly search` command exposes one plain-text layer only. Do not invent `--template`, `--company`, `--technology`, or `--layers-json` flags unless live help shows they were added in a newer version.

When extending or diagnosing template support, read [references/search-api.md](references/search-api.md). Preserve a plain-text fallback, because entity autocomplete/model IDs may be unavailable or plan-gated.

## Failure handling

- On missing config, create or point to a Feedly JSON config; do not fall back to scraping Chrome silently.
- On `401`, allow the adapter's refresh-token retry to run once; then ask for credential renewal.
- On `403`, report that the Feedly plan or feature may not permit the requested search model.
- On an empty `items` array, return an empty result rather than treating it as an adapter failure.
- On malformed entries or payloads, keep the typed adapter error; do not coerce broken data into empty rows.
