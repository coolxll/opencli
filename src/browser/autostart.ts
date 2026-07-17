import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface BrowserAutostartConfig {
  version: 1;
  enabled: boolean;
  executable?: string;
  args: string[];
  /** Optional endpoint used to avoid launching a second copy of the browser. */
  probeUrl?: string;
}
export interface BrowserAutostartState {
  path: string;
  config: BrowserAutostartConfig;
  issue?: string;
}

export type BrowserAutostartLaunchResult =
  | { attempted: false; reason: 'disabled' | 'invalid-config' }
  | { attempted: true; launched: false; reason: 'already-running'; config: BrowserAutostartConfig }
  | { attempted: true; launched: true; config: BrowserAutostartConfig }
  | { attempted: true; launched: false; reason: 'launch-failed'; error: string; config: BrowserAutostartConfig };

function configDir(): string {
  return process.env.OPENCLI_CONFIG_DIR || path.join(os.homedir(), '.opencli');
}

export function browserAutostartConfigPath(): string {
  return path.join(configDir(), 'browser-autostart.json');
}

function disabledConfig(): BrowserAutostartConfig {
  return { version: 1, enabled: false, args: [] };
}

function normalizeConfig(raw: unknown): BrowserAutostartConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const enabled = value.enabled === true;
  const executable = typeof value.executable === 'string' && value.executable.trim()
    ? value.executable.trim()
    : undefined;
  const args = Array.isArray(value.args) && value.args.every((arg) => typeof arg === 'string')
    ? value.args as string[]
    : null;
  const probeUrl = typeof value.probeUrl === 'string' && value.probeUrl.trim()
    ? value.probeUrl.trim()
    : undefined;

  if (!args || (enabled && !executable)) return null;
  return {
    version: 1,
    enabled,
    ...(executable ? { executable } : {}),
    args,
    ...(probeUrl ? { probeUrl } : {}),
  };
}

export function loadBrowserAutostartState(): BrowserAutostartState {
  const target = browserAutostartConfigPath();
  try {
    if (!fs.existsSync(target)) return { path: target, config: disabledConfig() };
    const parsed = JSON.parse(fs.readFileSync(target, 'utf-8')) as unknown;
    const config = normalizeConfig(parsed);
    if (!config) {
      return {
        path: target,
        config: disabledConfig(),
        issue: 'Configuration must contain enabled:boolean, executable:string, and args:string[].',
      };
    }
    return { path: target, config };
  } catch (err) {
    return {
      path: target,
      config: disabledConfig(),
      issue: err instanceof Error ? err.message : String(err),
    };
  }
}

function inferProbeUrl(args: readonly string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const inline = /^--remote-debugging-port=(\d+)$/.exec(arg);
    const next = arg === '--remote-debugging-port' ? args[i + 1] : undefined;
    const rawPort = inline?.[1] ?? next;
    if (!rawPort || !/^\d+$/.test(rawPort)) continue;
    const port = Number.parseInt(rawPort, 10);
    if (port > 0 && port <= 65535) return `http://127.0.0.1:${port}/json/version`;
  }
  return undefined;
}

export function saveBrowserAutostartConfig(input: {
  executable: string;
  args?: string[];
  probeUrl?: string;
}): BrowserAutostartState {
  const executable = input.executable.trim();
  if (!executable) throw new Error('Browser executable path is required.');
  const args = input.args ?? [];
  if (!args.every((arg) => typeof arg === 'string')) throw new Error('Browser launch arguments must be strings.');
  const probeUrl = input.probeUrl?.trim() || inferProbeUrl(args);
  if (probeUrl) {
    const parsed = new URL(probeUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Browser probe URL must use http:// or https://.');
    }
  }

  const target = browserAutostartConfigPath();
  const config: BrowserAutostartConfig = {
    version: 1,
    enabled: true,
    executable,
    args: [...args],
    ...(probeUrl ? { probeUrl } : {}),
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return { path: target, config };
}

export function disableBrowserAutostart(): BrowserAutostartState {
  const current = loadBrowserAutostartState().config;
  const target = browserAutostartConfigPath();
  const config: BrowserAutostartConfig = { ...current, version: 1, enabled: false };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return { path: target, config };
}

async function probeConfiguredBrowser(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function spawnConfiguredBrowser(executable: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    const onError = (err: Error): void => reject(err);
    child.once('error', onError);
    child.once('spawn', () => {
      child.off('error', onError);
      child.unref();
      resolve();
    });
  });
}

export const browserAutostartHooks = {
  probeConfiguredBrowser,
  spawnConfiguredBrowser,
};

export async function launchConfiguredBrowser(): Promise<BrowserAutostartLaunchResult> {
  const state = loadBrowserAutostartState();
  if (state.issue) return { attempted: false, reason: 'invalid-config' };
  const { config } = state;
  if (!config.enabled || !config.executable) return { attempted: false, reason: 'disabled' };

  if (config.probeUrl && await browserAutostartHooks.probeConfiguredBrowser(config.probeUrl)) {
    return { attempted: true, launched: false, reason: 'already-running', config };
  }

  try {
    await browserAutostartHooks.spawnConfiguredBrowser(config.executable, config.args);
    return { attempted: true, launched: true, config };
  } catch (err) {
    return {
      attempted: true,
      launched: false,
      reason: 'launch-failed',
      error: err instanceof Error ? err.message : String(err),
      config,
    };
  }
}
