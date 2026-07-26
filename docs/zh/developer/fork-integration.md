# Fork Integration 主线

当前 fork 以最新上游 `main` 为基础，把本地修改集中在一个整合提交中。

## 当前结构

- `main` 是 fork 后续使用的主线。
- `fork-integration` 在过渡期间保留为整合分支别名。
- `backup/main-before-fork-integration-20260726` 保留重建前的 fork `main`，用于恢复。
- `providers/feedly/` 已完整合入，包括插件清单、命令、测试、文档、技能文件和 lockfile。
- `providers/lingma/` 与 Feedly 一样作为独立 provider 保留。

## 同步上游

保持整合分支为“`upstream/main` + 一个本地整合提交”：

```powershell
git switch main
git fetch upstream
git rebase upstream/main
```

如果 `cli-manifest.json` 等生成文件发生冲突，先处理源代码，不要手工拼接生成 JSON：

```powershell
git restore --ours cli-manifest.json
# 解决源代码冲突后重新生成
npm run build
git add -A
git rebase --continue
git push --force-with-lease
```

在 rebase 过程中，`ours` 是上游基线，`theirs` 是 fork 的整合提交。重新生成 manifest 可以保证清单与最终适配器源码一致。
