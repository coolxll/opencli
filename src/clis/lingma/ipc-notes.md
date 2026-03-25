# Lingma IPC Notes

## Runtime endpoints

Observed on Windows while Lingma IDE was running:

- Main backend process:
  - `C:\Users\coolx\AppData\Local\Programs\Lingma\resources\app\resources\bin\x86_64_windows\Lingma.exe`
- Observed backend PID:
  - `14060`
- Observed TCP listeners:
  - `127.0.0.1:36510`
  - `127.0.0.1:37510`
- Observed named pipe:
  - `\\.\pipe\lingma-bf0f32`

Notes:

- `36510` accepts WebSocket handshake and is the active WebSocket endpoint.
- `37510` accepts TCP but returns `404 Not Found` for WebSocket handshake.
- The named pipe is the active IPC endpoint for `IPCConnectionProvider`.
- Pipe names are ephemeral and should not be treated as stable identifiers.

## Transport

The IPC endpoint uses Windows Named Pipe transport plus `vscode-jsonrpc`-style framing.

- Node transport:
  - `net.createConnection('\\\\.\\pipe\\lingma-bf0f32')`
- Message layer:
  - `vscode-jsonrpc`
  - `Content-Length: ...` framed JSON-RPC messages

This matches the extension implementation in:

- [extension.js](C:/Users/coolx/AppData/Local/Programs/Lingma/resources/app/extensions/aicoding-agent/dist/extension.js)

The built-in extension registers:

- `IPCConnectionProvider`
- `WebSocketConnectionProvider`

with connection priority:

1. `IPC`
2. `WEBSOCKET`

## Probe result

The following methods were probed over the live named pipe and were confirmed to be callable with object-style params.

### Confirmed working

- `ping`
- `extension/query`
- `config/queryModels`
- `config/getGlobal`
- `auth/status`
- `auth/profile/getGlobalConfig`
- `feature/getFeatureFlags`
- `statistics/general`
- `user/plan`
- `session/getCurrent`
- `chat/listAllSessions`
- `extension/contextProvider/loadComboBoxItems`
- `kb/list`
- `webview/mcpSetting/overview`
- `webview/memory/count`
- `wiki/getStatus`
- `task/list`
- `model/getByokConfig`
- `dataPolicy/query`

### Confirmed callable but returned business error

- `credit/usage`
  - error: `get user credit info error: HTTP status 400`
- `webview/projectRule/list`
  - error: `cannot get workspace folder`
- `integration/vcs/connections`
  - error: `failed to get connection: Invalid data format`
- `integration/vcs/repository/permission`
  - error: `git remotes is empty`
- `model/queryClasses`
  - error: `no model config for scene: `

These still confirm the IPC route and method name are valid.

## Important request-shape note

Some methods that looked parameterless in the extension code still expect an object payload over IPC.

Examples:

- `extension/query`
- `config/queryModels`

Sending them with no params caused server-side decode errors like:

- `json: cannot unmarshal array into Go value of type definition.EmptyRequest`
- `json: cannot unmarshal array into Go value of type struct {}`

Sending `{}` works.

## High-value payloads

### ACP meta keys

Static extraction from the built-in extension showed these important literal keys:

- `ai-coding/request-id`
- `ai-coding/mode`
- `ai-coding/model`
- `ai-coding/shell-type`
- `ai-coding/current-file-path`
- `ai-coding/enabled-mcp-servers`
- `ai-coding/quest-task-id`
- `ai-coding/tool-call-error-code`
- `ai-coding/tool-call-error-message`
- `ai-coding/tool-call-internal-status`
- `ai-coding/tool-name`
- `ai-coding/tool-kind`
- `ai-coding/parent-tool-call-id`

The request-id key must be the literal string:

- `ai-coding/request-id`

Using a plain key like `requestId` caused:

- `requestId is empty`

### `extension/query`

Returns:

- `commands`
- `commandShowPosition`
- `commandShowOrder`
- `contextProviders`

This is useful for discovering:

- built-in command identifiers
- required context items
- available context provider identifiers

### `config/queryModels`

Returns model lists by scene:

- `assistant`
- `chat`
- `developer`
- `inline`
- `quest`

Example visible model keys included:

- `org_auto`
- `dashscope_qmodel`
- `q35model`
- `dashscope_qwen3_coder`
- `dashscope_qwen_plus_20250428_thinking`
- `dashscope_qwen_max_latest`

### `config/getGlobal`

Returns local runtime settings, including:

- `proxyMode`
- `commandDenyList`
- `mcpAutoRun`
- `terminalRunMode`
- `webToolsExecutionMode`
- `askModeUseTools`
- `browserRunMode`
- `browserToolsRunMode`

### `session/getCurrent`

Returns:

- `currentSessionIds`

Observed value during probing:

- `[]`

### `task/list`

Returns task metadata including:

- `id`
- `status`
- `filePath`
- `executionSessionId`
- `query`

This confirms the IPC backend exposes task-level state that is richer than the DOM layer.

## Live ACP session flow

The ACP-style session flow was validated over the live named pipe:

1. `initialize`
2. `session/new`
3. `session/prompt`

### `initialize`

Minimal working payload:

```json
{
  "protocolVersion": 1,
  "clientCapabilities": {},
  "timestamp": 1774432779540
}
```

Observed response included:

- `serverInfo.name = "lingma"`
- `serverInfo.version = "0.7.1"`

### `session/new`

Minimal working payload:

```json
{
  "cwd": "C:/Workspace/Personal/opencli",
  "mcpServers": [],
  "_meta": {},
  "timestamp": 1774432779542
}
```

Observed result:

```json
{
  "sessionId": "8e9fd104-e5d2-4c3e-8724-c094ba7dc500"
}
```

Also observed immediately after creation:

- `session/update`
  - `update.sessionUpdate = "available_commands_update"`

### `session/prompt`

Minimal working payload:

```json
{
  "sessionId": "8e9fd104-e5d2-4c3e-8724-c094ba7dc500",
  "prompt": [
    {
      "type": "text",
      "text": "请只回复：IPC_OK_2"
    }
  ],
  "_meta": {
    "ai-coding/request-id": "ipc-1774432779539",
    "ai-coding/shell-type": "powershell",
    "ai-coding/current-file-path": "C:/Workspace/Personal/opencli/src/clis/lingma/ipc-notes.md",
    "ai-coding/enabled-mcp-servers": []
  }
}
```

Observed behavior:

- request returned successfully
- `result` was `undefined`
- answer streamed asynchronously through notifications

### Stream notifications observed

Before answer tokens:

- `chat/process_step_callback`
  - `step = "step_start"`
- `chat/process_step_callback`
  - `step = "step_end"`
- `snapshot/syncAll`
- `session/title/update`

Answer stream:

- `session/update`
  - `update.sessionUpdate = "agent_message_chunk"`
  - `update.content.text = "IPC"`
- `session/update`
  - `update.sessionUpdate = "agent_message_chunk"`
  - `update.content.text = "_OK_2"`

Post-answer notifications:

- `session/update`
  - `update.sessionUpdate = "notification"`
  - `update.type = "context_usage"`
- `session/update`
  - `update.sessionUpdate = "notification"`
  - `update.type = "chat_finish"`

Important detail:

- `chat_finish.data.fullAnswer` was empty in this run
- the real final answer had to be reconstructed by concatenating `agent_message_chunk` texts
- reconstructed answer:
  - `IPC_OK_2`

## Tool-related observation

A live tool-oriented probe was also attempted through the same ACP session flow.

Prompt used:

- `请先使用 plan 工具把任务拆成两步，最后只回复：TOOL_FLOW_OK`

Meta used:

- `ai-coding/request-id`
- `ai-coding/mode = "agent"`
- `ai-coding/shell-type = "powershell"`
- `ai-coding/current-file-path`
- `ai-coding/enabled-mcp-servers = []`

Observed notifications:

- `chat/process_step_callback`
  - `step_start`
  - `step_end`
- `snapshot/syncAll`
- `session/update`
  - `agent_message_chunk`
- `session/update`
  - `notification.context_usage`
- `session/update`
  - `notification.chat_finish`

What was not observed in this run:

- no separate `tool_call` notification method
- no separate `tool_result` notification method
- no explicit tool event in IPC notifications

Observed model behavior:

- the model answered in plain text
- it did not actually execute a distinct `plan` tool path in this prompt

Current implication:

- tool activity may still be represented through `_meta` fields on updates
- but a normal natural-language prompt asking to “use plan” was not enough to surface a dedicated tool event
- for robust tool-call reverse engineering, a stronger trigger or a real tool-using task is still needed

## Engineering implications

- The IPC route is viable and already more structured than DOM scraping.
- The ACP session route is live and usable:
  - `initialize -> session/new -> session/prompt`
- For Lingma IPC/serve integration, final assistant text should be assembled from:
  - `session/update` with `sessionUpdate = "agent_message_chunk"`
- Do not rely on:
  - `chat_finish.data.fullAnswer`
  - because it can be empty even on successful completion
- A future `lingma ipc probe` command can safely start from:
  - `ping`
  - `extension/query`
  - `config/queryModels`
  - `config/getGlobal`
  - `session/getCurrent`
  - `task/list`
- A future IPC-based ask implementation can likely use:
  - `initialize`
  - `session/new`
  - `session/prompt`
  - then collect `agent_message_chunk` notifications by request id
- Tool/error handling should watch for `_meta` keys such as:
  - `ai-coding/tool-name`
  - `ai-coding/tool-kind`
  - `ai-coding/tool-call-error-code`
  - `ai-coding/tool-call-error-message`
  - `ai-coding/tool-call-internal-status`
- For methods with optional/no params, default to `{}` instead of omitting params.
- Workspace-sensitive methods may require:
  - active workspace
  - git remotes
  - selected scene
  - current session

## Follow-up candidates

- Probe direct chat methods for comparison:
  - `chat/getSessionById`
  - `chat/ask`
  - `chat/replyRequest`
  - `chat/stopSession`
- Probe tool-call prompts to see how tool execution is represented in:
  - `session/update`
  - `chat/process_step_callback`
- Trigger a real tool-using task, not just a natural-language request to use a tool
  - for example a prompt that forces command execution or browser/file interaction
- Probe model/session mutation methods carefully:
  - `session/set_model`
  - `session/set_mode`
- Build a dedicated local probe tool in `opencli` that:
  - discovers active pipe name
  - connects via `vscode-jsonrpc`
  - sends object-shaped params by default
  - dumps result summaries and optional raw JSON
