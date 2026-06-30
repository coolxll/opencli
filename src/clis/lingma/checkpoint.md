# Checkpoint

## Current status
- Overall: `opencli` 已完成一套可实际运行的 `lingma` 适配器，当前核心目标从 DOM 驱动扩展到摸清 Lingma 原生 runtime / sidecar 链路，为后续更稳的 `serve` 或 hook 做准备。
- Progress: `status`、`screenshot`、`read`、`send`、`ask`、`model`、`new`、`serve`、`probe-network` 已落地并通过部分 live 验证；同时已确认 Lingma 安装目录中存在独立 `resources/bin` runtime。
- Key outcomes since last checkpoint: 已确认 renderer 侧抓不到主回答网络流；HAR 证明真实回答流来自非 renderer 链路；进一步确认本地安装包含独立 `Lingma.exe`、`lingmacli.exe`、`node.exe` 和 `bin/extension/main.cjs`。

## What changed
- Completed: 新增 `src/clis/lingma/` 下的 `shared.ts`、`status.ts`、`screenshot.ts`、`dump.ts`、`send.ts`、`read.ts`、`ask.ts`、`model.ts`、`new.ts`、`serve.ts`、`probe-network.ts`、`helpers.ts`；新增文档 `docs/adapters/desktop/lingma.md`、`src/clis/lingma/har-notes.md`；修复 `src/browser/dom-snapshot.ts` 与 `src/browser/dom-snapshot.test.ts` 以适配 Electron / VS Code 风格页面。
- In progress: 逆向 Lingma 原生 IDE 安装目录，确认扩展层、主进程层、`resources/bin` runtime 层之间的边界，并评估后续 hook 点。
- De-scoped / canceled: 暂不改 `antigravity`；暂不继续依赖 renderer `fetch/xhr/ws` probe 作为 Lingma 主链路方案。

## Blockers / risks
- Blockers: Lingma 主回答流不经过 renderer 可见的 `fetch/xhr/ws`，导致现有 CDP renderer probe 无法直接拿到回答流；主进程产物和 `resources/bin/extension/main.cjs` 都是打包后的大文件，直接静态阅读成本较高。
- Risks: DOM 读取在工具调用、继续按钮、复杂活动块场景下仍可能被污染；如果主链路落在 `resources/bin/x86_64_windows/Lingma.exe` 或 `lingmacli.exe` 内，纯扩展层 patch 可能不够；当前观察到的进程 PID 是临时值，不可当作稳定标识。
- Mitigations: 优先沿 `resources/bin/extension/main.cjs` 的 `pipe/ws` JSON-RPC 链路追入口，再决定是否需要更底层 hook `lingmacli.exe` 或 `Lingma.exe`；保留 DOM 路线作为当前可用 fallback。

## Decisions needed
- Decision: 后续 Lingma 深挖优先落在哪一层。
- Options: 继续拆 `resources/bin/extension/main.cjs` 的本地 RPC；分析 `lingmacli.exe` 的行为与参数；直接对 `resources/bin/x86_64_windows/Lingma.exe` 做本地 hook。
- Recommendation: 先拆 `resources/bin/extension/main.cjs`，因为它已经暴露 `pipe/ws`、JSON-RPC 和本地工作目录写入逻辑，性价比最高。
- Needed by: 开始下一轮 Lingma 集成或 hook 实现前。

## Next steps (1–2 weeks)
- [ ] 梳理 `resources/bin/extension/main.cjs` 的启动链、连接模式与 `.info` 文件协议 — ASSISTANT — 立即执行
- [ ] 分析 `lingmacli.exe` 是否参与主回答请求或仅承担辅助 CLI 能力 — ASSISTANT — 1-2 天
- [ ] 评估是否能从本地 `pipe/ws` RPC 拿到比 DOM 更干净的回答结果 — ASSISTANT — 1-3 天
- [ ] 如需要，补充一份 Lingma runtime 结构文档到 `src/clis/lingma` — ASSISTANT — 1 周内

## Notes / links
- `C:/Workspace/Personal/opencli/src/clis/lingma/helpers.ts`
- `C:/Workspace/Personal/opencli/src/clis/lingma/send.ts`
- `C:/Workspace/Personal/opencli/src/clis/lingma/ask.ts`
- `C:/Workspace/Personal/opencli/src/clis/lingma/new.ts`
- `C:/Workspace/Personal/opencli/src/clis/lingma/serve.ts`
- `C:/Workspace/Personal/opencli/src/clis/lingma/probe-network.ts`
- `C:/Workspace/Personal/opencli/src/clis/lingma/har-notes.md`
- `C:/Users/coolx/AppData/Local/Programs/Lingma/resources/app/extensions/aicoding-agent/package.json`
- `C:/Users/coolx/AppData/Local/Programs/Lingma/resources/app/resources/bin/env.json`
- `C:/Users/coolx/AppData/Local/Programs/Lingma/resources/app/resources/bin/extension/main.cjs`
- `C:/Users/coolx/AppData/Local/Programs/Lingma/resources/app/resources/bin/x86_64_windows/Lingma.exe`
- `C:/Users/coolx/AppData/Local/Programs/Lingma/resources/app/resources/bin/x86_64_windows/lingmacli.exe`
