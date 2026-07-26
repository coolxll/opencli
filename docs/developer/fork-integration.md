# Fork Integration Mainline

OpenCLI's fork now uses the upstream `main` as its base and keeps local changes in one integration commit.

## Current layout

- `main` is the working mainline for the fork.
- `fork-integration` is kept as the integration branch alias during the transition.
- `backup/main-before-fork-integration-20260726` preserves the previous fork `main` and is retained for recovery.
- `providers/feedly/` is included in the integration. It contains the Feedly plugin manifest, commands, tests, documentation, skill files, and lockfile.
- `providers/lingma/` is included alongside Feedly as the other extracted provider.

## Updating from upstream

Keep the integration branch as a single commit on top of `upstream/main`:

```powershell
git switch main
git fetch upstream
git rebase upstream/main
```

When a generated file such as `cli-manifest.json` conflicts, resolve source files first. Do not hand-merge the generated JSON:

```powershell
git restore --ours cli-manifest.json
# resolve source conflicts, then regenerate
npm run build
git add -A
git rebase --continue
git push --force-with-lease
```

During a rebase, `ours` is the upstream base and `theirs` is the fork integration commit. Regenerating the manifest keeps it consistent with the resolved adapter source.
