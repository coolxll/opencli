import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WebSocket } from 'ws';

export interface TrackedBrowser {
  pid?: number;
  executable?: string;
  args: string[];
  probeUrl?: string;
  userDataDir?: string;
  launchedAt: number;
}

export function extractUserDataDir(args: readonly string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--user-data-dir=')) {
      return arg.slice('--user-data-dir='.length).trim();
    }
    if (arg === '--user-data-dir' && i + 1 < args.length) {
      return args[i + 1]?.trim();
    }
  }
  return undefined;
}

export function toPlatformPath(targetPath: string): string {
  if (!targetPath) return targetPath;
  if (process.platform === 'linux' && /^[a-zA-Z]:[/\\]/.test(targetPath)) {
    const drive = targetPath[0].toLowerCase();
    const rest = targetPath.slice(2).replace(/\\/g, '/');
    return `/mnt/${drive}${rest.startsWith('/') ? '' : '/'}${rest}`;
  }
  return targetPath;
}

export function discoverProbeUrl(userDataDir: string): string | undefined {
  try {
    const activePortFile = path.join(toPlatformPath(userDataDir), 'DevToolsActivePort');
    if (fs.existsSync(activePortFile)) {
      const lines = fs.readFileSync(activePortFile, 'utf8').trim().split('\n');
      const port = Number.parseInt(lines[0]?.trim(), 10);
      if (Number.isInteger(port) && port > 0) {
        return `http://127.0.0.1:${port}/json/version`;
      }
    }
  } catch {
    // Ignore discovery error
  }
  return undefined;
}

export function releaseProfileLocks(userDataDir: string): void {
  const dir = toPlatformPath(userDataDir);
  if (!dir) return;
  const lockFiles = [
    'SingletonLock',
    'SingletonCookie',
    'SingletonSocket',
    'lockfile',
    'Lockfile',
  ];
  for (const name of lockFiles) {
    const filePath = path.join(dir, name);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore removal failure (e.g. permissions or racing delete)
    }
  }
}

export function isProcessAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    return code === 'EPERM';
  }
}

export function terminateProcess(pid: number): void {
  if (!pid || pid <= 0) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // Process might already be dead
  }
}

export async function closeBrowserViaCdp(probeUrl: string, timeoutMs: number = 2000): Promise<boolean> {
  try {
    const res = await fetch(probeUrl, { signal: AbortSignal.timeout(Math.min(1000, timeoutMs)) });
    if (!res.ok) return false;
    const info = await res.json() as { webSocketDebuggerUrl?: string };
    const wsUrl = info?.webSocketDebuggerUrl;
    if (!wsUrl) return false;

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (val: boolean) => {
        if (!settled) {
          settled = true;
          try { ws.close(); } catch {}
          resolve(val);
        }
      };
      const timer = setTimeout(() => done(false), timeoutMs);
      const ws = new WebSocket(wsUrl);
      ws.once('open', () => {
        try {
          ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }), (err) => {
            if (err) done(false);
            else {
              setTimeout(() => done(true), 300);
            }
          });
        } catch {
          done(false);
        }
      });
      ws.once('close', () => {
        clearTimeout(timer);
        done(true);
      });
      ws.once('error', () => {
        clearTimeout(timer);
        done(false);
      });
    });
  } catch {
    return false;
  }
}

function trackingFilePath(): string {
  const configDir = process.env.OPENCLI_CONFIG_DIR || path.join(os.homedir(), '.opencli');
  return path.join(configDir, 'session0-browsers.json');
}

let inMemoryTracked: TrackedBrowser[] = [];

export function loadTrackedBrowsers(): TrackedBrowser[] {
  const filePath = trackingFilePath();
  const result: TrackedBrowser[] = [...inMemoryTracked];
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && typeof item === 'object') {
            const cast = item as TrackedBrowser;
            if (!result.some((existing) => (existing.pid && existing.pid === cast.pid) || (existing.userDataDir && existing.userDataDir === cast.userDataDir))) {
              result.push(cast);
            }
          }
        }
      }
    }
  } catch {
    // Ignore read errors
  }
  return result;
}

function saveTrackedBrowsers(browsers: TrackedBrowser[]): void {
  const filePath = trackingFilePath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(browsers, null, 2) + '\n', 'utf8');
  } catch {
    // Ignore write errors
  }
}

export function trackBrowserProcess(browser: TrackedBrowser): void {
  inMemoryTracked.push(browser);
  const all = loadTrackedBrowsers();
  if (!all.some((b) => b.pid === browser.pid && b.userDataDir === browser.userDataDir)) {
    all.push(browser);
  }
  saveTrackedBrowsers(all);
}

export function clearTrackedBrowsers(): void {
  inMemoryTracked = [];
  const filePath = trackingFilePath();
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore error
  }
}

export const session0TrackerHooks = {
  closeBrowserViaCdp,
  isProcessAlive,
  terminateProcess,
  releaseProfileLocks,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function closeTrackedBrowser(
  browser: TrackedBrowser,
  opts: { cdpTimeoutMs?: number; killTimeoutMs?: number } = {},
): Promise<void> {
  const cdpTimeoutMs = opts.cdpTimeoutMs ?? 2000;
  const killTimeoutMs = opts.killTimeoutMs ?? 2000;

  // 1. Try CDP Browser.close first
  const probeUrl = browser.probeUrl || (browser.userDataDir ? discoverProbeUrl(browser.userDataDir) : undefined);
  if (probeUrl) {
    await session0TrackerHooks.closeBrowserViaCdp(probeUrl, cdpTimeoutMs);
  }

  // 2. If pid is known, wait briefly for exit
  if (browser.pid) {
    const deadline = Date.now() + killTimeoutMs;
    while (Date.now() < deadline && session0TrackerHooks.isProcessAlive(browser.pid)) {
      await sleep(100);
    }
    // 3. Fallback kill if still alive
    if (session0TrackerHooks.isProcessAlive(browser.pid)) {
      session0TrackerHooks.terminateProcess(browser.pid);
      await sleep(100);
    }
  }

  // 4. Release profile locks
  if (browser.userDataDir) {
    session0TrackerHooks.releaseProfileLocks(browser.userDataDir);
  }
}

export async function closeAllTrackedBrowsers(
  opts: { cdpTimeoutMs?: number; killTimeoutMs?: number } = {},
): Promise<void> {
  const all = loadTrackedBrowsers();
  for (const b of all) {
    await closeTrackedBrowser(b, opts);
  }
  clearTrackedBrowsers();
}
