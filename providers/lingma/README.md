# Lingma

Control the **Lingma Desktop App** from the terminal via Chrome DevTools Protocol (CDP).

## Prerequisites

Expose Lingma's Chromium debugging endpoint, for example on port `9344`.

## Setup

```bash
export OPENCLI_CDP_ENDPOINT="http://127.0.0.1:9344"
export OPENCLI_CDP_TARGET="openai.yaml - QA-Skills - Lingma"
```

If you have multiple Lingma windows, set `OPENCLI_CDP_TARGET` to a more specific window title.

## Commands

### Diagnostics
- `opencli lingma status`: Check CDP connection status.
- `opencli lingma screenshot`: Export DOM + accessibility snapshot. If `--output` is omitted, artifacts are written under your system temp directory.
- `opencli lingma dump`: Dump DOM + snapshot artifacts for selector debugging under your system temp directory.

### Chat
- `opencli lingma new`: Start a new conversation in the active Lingma sidebar.
- `opencli lingma send "message"`: Send a message to the active Lingma sidebar chat.
- `opencli lingma read`: Read the current Lingma conversation history.
- `opencli lingma ask "message"`: Send a message and wait for the resulting activity, terminal, and assistant reply.
- `opencli lingma model [name]`: Read the current visible model, or try to switch when Lingma exposes a model selector in the active view.
- `opencli lingma probe-network "message"`: Send a prompt while probing renderer-side fetch/XHR/WebSocket traffic to see whether responses can be read from the network layer instead of the DOM.
- `opencli lingma serve --port 8083 --session-mode auto`: Start an Anthropic-compatible `/v1/messages` proxy over the active Lingma session.

### Native IPC
- `opencli lingma ipc probe`: Inspect Lingma's named-pipe IPC surface and summarize detected capabilities.
- `opencli lingma ipc ask "message"`: Send a prompt through Lingma's native IPC channel and wait for the streamed response.
- `opencli lingma ipc serve --port 8084 --session-mode auto`: Start an Anthropic-compatible `/v1/messages` proxy backed by Lingma native IPC.

## Serve Session Modes

- `auto`: If the request includes prior messages or `system`, start a new Lingma conversation and replay the transcript as a synthesized prompt. If the request is a single user message, reuse the current session.
- `fresh`: Always start a new Lingma conversation before sending the request.
- `reuse`: Always reuse the current Lingma conversation and send only the latest user message.

## IPC Notes

- `ipc ask` and `ipc serve` accept `--pipe` if auto-discovery is insufficient.
- New IPC sessions can be scoped with `--cwd`, `--current-file-path`, `--mode`, and `--model`.
- `ipc serve` defaults to port `8084`; the CDP-backed `serve` command defaults to `8083`.
