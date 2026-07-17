# OpenCLI Providers

Optional site providers maintained separately from the OpenCLI core runtime.
Each provider uses the public plugin API and can be installed independently.

## Local development

```bash
opencli plugin install file:///absolute/path/to/opencli/providers/feedly
opencli plugin install file:///absolute/path/to/opencli/providers/lingma
```

The directory is also a valid OpenCLI plugin monorepo and can be published as
its own Git repository later without moving provider source again.

## Providers

- `feedly` — browser-free authenticated Feedly API commands.
- `lingma` — Lingma Desktop automation over CDP and native IPC.
