# AGENTS.md

## 项目概述

OpenCLI — 将任何网站/Electron 应用转为 CLI 接口，并在已登录的 Chrome 上运行 Browser Use。内置适配器支持 Bilibili、知乎、小红书、Reddit、HackerNews、Twitter/X 等。可作为 AI Agent 的浏览器操作层，也可作为本地工具的 CLI 集线器。

## 技术栈

- **语言**: TypeScript / Node.js (>=20)
- **包管理**: npm（@jackwener/opencli）
- **构建**: tsc + 生成 `dist/` 与 `cli-manifest.json`
- **测试**: Vitest
- **运行时**: Node.js ESM
- **桌面版**: OpenCLIApp（系统托盘 UI）

## 开发命令

```bash
npm install                    # 安装依赖
npm run build                  # 构建（tsc + vite）
npm test                       # 运行测试（Vitest）
npm run dev                    # 开发模式
opencli <command>              # 使用 CLI
```

## 项目结构

- `src/` — 源码（TypeScript ESM）
  - `main.ts` — CLI 入口（bin: opencli，构建后输出 `dist/src/main.js`）
  - `registry-api.ts` — 注册 API（`@jackwener/opencli/registry`）
- `clis/` — 内置 CLI 适配器（每个网站/工具一个）
- `skills/` — AI Agent 技能定义
  - `opencli-browser` — Browser Use 技能
  - `opencli-adapter-author` — 适配器编写技能
  - `opencli-autofix` — 适配器故障修复技能
  - `opencli-browser-sitemap` — 基于站点 sitemap 的浏览器操作技能
  - `opencli-sitemap-author` — 站点 sitemap 编写/维护技能
  - `opencli-usage` — OpenCLI 命令与能力总览技能
  - `smart-search` — 基于 OpenCLI 信息源的搜索路由技能
- `extension/` — 浏览器扩展
- `cli-manifest.json` — CLI 清单
- `autoresearch/` — 自动化研究评估框架
  - 评估浏览器操作、技能执行
  - 支持 V2EX、知乎等平台
- `cases/` — 测试用例
- `designs/` — 设计文档
- `docs/` — 文档
- `tests/` — 测试
- `dist/` — 构建产物
- `scripts/` — 脚本
- `sitemaps/` — 站点地图

## 关键约束

- **Node.js >= 20**: 最低运行时版本
- **ESM**: 使用 ES Modules（"type": "module"）
- **登录态复用**: 通过已登录的 Chrome 浏览器执行操作，不重新登录
- **适配器模式**: 每个网站一个适配器，通过 opencli browser 原语操作
- **AI Agent 集成**: 安装 opencli-browser 技能后，AI Agent 可通过 opencli browser 命令操作浏览器
- **桌面版优先**: macOS/Windows 推荐使用 OpenCLIApp

## 代码风格

- TypeScript strict
- ESM 模块
- Vitest 测试框架
