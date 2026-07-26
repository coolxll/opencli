import { spawnSync } from 'node:child_process';

const PROXY_ENV_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
] as const;

const REEXEC_SENTINEL = 'OPENCLI_USE_ENV_PROXY_REEXEC';
const DISABLE_AUTO_PROXY_SENTINEL = 'OPENCLI_DISABLE_ENV_PROXY_AUTO';

export function hasProxyEnv(env: NodeJS.ProcessEnv): boolean {
  return PROXY_ENV_KEYS.some((key) => {
    const value = env[key];
    return typeof value === 'string' && value.trim() !== '';
  });
}

export function supportsNodeEnvProxyFlag(
  allowedFlags: ReadonlySet<string> = process.allowedNodeEnvironmentFlags,
): boolean {
  return allowedFlags.has('--use-env-proxy') || allowedFlags.has('use-env-proxy');
}

export function hasEnvProxyEnabled(
  execArgv: readonly string[],
  env: NodeJS.ProcessEnv,
): boolean {
  return execArgv.includes('--use-env-proxy') || env.NODE_USE_ENV_PROXY === '1';
}

export function shouldRelaunchWithEnvProxy(
  execArgv: readonly string[],
  env: NodeJS.ProcessEnv,
  allowedFlags: ReadonlySet<string> = process.allowedNodeEnvironmentFlags,
): boolean {
  if (env[DISABLE_AUTO_PROXY_SENTINEL] === '1') return false;
  if (env[REEXEC_SENTINEL] === '1') return false;
  if (!hasProxyEnv(env)) return false;
  if (!supportsNodeEnvProxyFlag(allowedFlags)) return false;
  if (hasEnvProxyEnabled(execArgv, env)) return false;
  return true;
}

export function maybeRelaunchWithEnvProxy(): void {
  if (!shouldRelaunchWithEnvProxy(process.execArgv, process.env)) return;

  const result = spawnSync(
    process.execPath,
    [...process.execArgv, '--use-env-proxy', ...process.argv.slice(1)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_USE_ENV_PROXY: '1',
        [REEXEC_SENTINEL]: '1',
      },
    },
  );

  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

