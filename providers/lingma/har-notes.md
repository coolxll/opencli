# Lingma HAR Notes

Source HAR: [`/C:/Workspace/Personal/opencli/lingma.har`](/C:/Workspace/Personal/opencli/lingma.har)

## Summary

- Lingma's answer stream is visible in the proxy capture and is not opaque ciphertext.
- The readable answer path is a server-sent events stream, not a renderer `fetch/xhr/ws` path that `opencli lingma probe-network` can currently see.
- Several requests use `User-Agent: Go-http-client/1.1`, which strongly suggests a main-process or sidecar client rather than page JavaScript.
- There are also encoded business/reporting requests with `Encode=1`; those are not needed for first-pass answer extraction.

## Main Findings

### Readable answer stream

- Endpoint pattern:
  - `POST /algo/api/v2/service/pro/sse/agent_chat_generation?FetchKeys=llm_model_result&AgentId=...&Encode=1`
- Host:
  - `https://lingma-api.tongyi.aliyun.com`
- Response content type:
  - `text/event-stream;charset=UTF-8`
- Request user agent often appears as:
  - `Go-http-client/1.1`

### SSE payload shape

Each SSE frame uses outer `data:` lines whose payload is JSON. The outer JSON contains a `body` field, and `body` is itself a stringified JSON object.

Representative structure:

```json
{
  "headers": { "Content-Type": ["application/json"] },
  "body": "{\"choices\":[{\"delta\":{\"content\":\"你好\",\"role\":\"assistant\"},\"index\":0}],\"id\":\"chatcmpl-...\",\"model\":\"auto\",\"object\":\"chat.completion.chunk\"}",
  "statusCodeValue": 200,
  "statusCode": "OK"
}
```

The inner `body` JSON is close to OpenAI chat completion chunks:

```json
{
  "choices": [
    {
      "delta": { "content": "你好", "role": "assistant" },
      "index": 0
    }
  ],
  "id": "chatcmpl-...",
  "model": "auto",
  "object": "chat.completion.chunk"
}
```

### End of stream markers

Observed stream terminators:

- a chunk with `finish_reason: "stop"`
- a later chunk carrying `usage`
- a later chunk whose inner `body` is `[DONE]`
- a final SSE event:

```text
event:finish
data:{"firstTokenDuration":...,"totalDuration":...,"serverDuration":...}
```

## AgentId Observations

Observed values:

- `AgentId=agent_chat`
- `AgentId=agent_common`

Practical interpretation from this HAR:

- `agent_chat` looks like the safest candidate for the actual user-facing answer stream.
- `agent_common` can contain planning or reasoning-style text such as `思考: ...`, so it should not be blindly merged into the final assistant answer.

## Encoded Requests

Separate from the SSE answer stream, the HAR also contains encoded requests like:

- `POST /algo/api/v2/service/business/finish?Encode=1`

Characteristics:

- request body looks encoded/obfuscated, for example `f*DSQ...`
- headers include many `Cosy-*` values
- response is simple, for example `success`

Current assessment:

- these requests appear to be bookkeeping, finish/reporting, or business-state traffic
- they are not required for first-pass extraction of the assistant reply

## Why CDP Renderer Probe Missed It

`opencli lingma probe-network` only probes the active renderer target. In this session it captured no renderer-side `fetch/xhr/ws` events, while the proxy HAR captured readable SSE traffic.

Most likely explanation:

- Lingma's network path for model responses is initiated outside the page context
- likely through Electron main process, a preload bridge, or a local sidecar/client

This matches the `Go-http-client/1.1` user agent seen in the HAR.

## Implementation Implications

### Current safest path

- Keep DOM-based `lingma ask` / `lingma serve` as the default working path.

### Better long-term path

- Build a non-renderer integration that consumes the captured SSE answer stream.
- Focus on parsing `agent_chat_generation` responses.
- Reconstruct the final answer by concatenating `choices[0].delta.content`.
- Treat `agent_common` as planning/meta unless proven otherwise.

### Not first priority

- Decoding `Encode=1` business request bodies
- inferring session semantics from `/business/finish`

## Minimal SSE Reconstruction Rule

For a single SSE response:

1. Split frames by blank lines.
2. Keep `data:` frames.
3. Parse the outer JSON.
4. Parse the inner `body` when it is JSON.
5. Append `choices[0].delta.content` when present.
6. Stop after `[DONE]` or after the `finish_reason` + `usage` tail is complete.

## Open Questions

- Whether `agent_chat` is always the user-facing stream in all chat modes
- Whether model switching changes `AgentId` or response shape
- Whether a stable local hook exists in Lingma main process or sidecar without relying on a system proxy

## Local Observation Snapshot

- Process name observed during this capture:
  - `Lingma.exe`
- Observed PID during this capture:
  - `6780`
- This is only a local runtime snapshot, not a stable identifier.
