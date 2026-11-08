import { spawnSync } from 'node:child_process';
import * as os from 'node:os';

export const WINDOWS_SESSION0_AUTOSTART_ENV = 'OPENCLI_ALLOW_SESSION0_AUTOSTART';

export interface WindowsSessionAutostartBlock {
  sessionId: number;
  message: string;
  hint: string;
}

function queryCurrentWindowsSessionId(): number | null {
  const envSession = process.env.OPENCLI_WINDOWS_SESSION;
  if (envSession !== undefined && /^\d+$/.test(envSession.trim())) {
    return Number.parseInt(envSession.trim(), 10);
  }

  const systemRoot = process.env.SystemRoot || process.env.WINDIR;
  const executables = [
    ...(systemRoot
      ? [`${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`]
      : []),
    // WSL cron/service environments often omit the inherited Windows PATH.
    '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
    'powershell.exe',
  ];

  for (const executable of [...new Set(executables)]) {
    try {
      // The PowerShell child inherits the Node process session, so querying the
      // child's own SessionId gives us the launch context without native addons.
      const result = spawnSync(
        executable,
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '[System.Diagnostics.Process]::GetCurrentProcess().SessionId',
        ],
        {
          encoding: 'utf8',
          windowsHide: true,
          timeout: 3_000,
        },
      );
      if (result.status !== 0) continue;
      const value = Number.parseInt(result.stdout.trim(), 10);
      if (Number.isInteger(value) && value >= 0) return value;
    } catch {
      // Try the next path; detection failure is handled by the caller.
    }
  }
  return null;
}

function envDisallowsSession0Autostart(env: NodeJS.ProcessEnv): boolean {
  const value = env[WINDOWS_SESSION0_AUTOSTART_ENV]?.trim().toLowerCase();
  return value === '0' || value === 'false' || value === 'no' || value === 'off';
}

function isWslWindowsHost(env: NodeJS.ProcessEnv): boolean {
  if (env.WSL_DISTRO_NAME || env.WSL_INTEROP) return true;
  const release = os.release().toLowerCase();
  return release.includes('microsoft') || release.includes('wsl');
}

export const windowsSessionHooks = {
  platform: (): NodeJS.Platform => process.platform,
  isWslWindowsHost,
  getCurrentSessionId: queryCurrentWindowsSessionId,
};

export function isWindowsSession0(env: NodeJS.ProcessEnv = process.env): boolean {
  const platform = windowsSessionHooks.platform();
  const hasWindowsHost = platform === 'win32'
    || (platform === 'linux' && windowsSessionHooks.isWslWindowsHost(env));
  if (!hasWindowsHost) return false;
  return windowsSessionHooks.getCurrentSessionId() === 0;
}

/**
 * Windows Session 0 is a non-interactive service session.
 * Controlled background process execution is permitted by default (with auto-exit and
 * browser lifecycle tracking). If explicitly disabled via OPENCLI_ALLOW_SESSION0_AUTOSTART=0,
 * process creation is blocked.
 */
export function getWindowsSessionAutostartBlock(
  env: NodeJS.ProcessEnv = process.env,
): WindowsSessionAutostartBlock | null {
  const platform = windowsSessionHooks.platform();
  const hasWindowsHost = platform === 'win32'
    || (platform === 'linux' && windowsSessionHooks.isWslWindowsHost(env));
  if (!hasWindowsHost) return null;

  const sessionId = windowsSessionHooks.getCurrentSessionId();
  if (sessionId !== 0) return null;

  // Controlled execution is enabled by default. Only block if explicitly disabled.
  if (envDisallowsSession0Autostart(env)) {
    return {
      sessionId,
      message: 'Refusing to start OpenCLI background processes in Windows Session 0 (explicitly disabled)',
      hint:
        'Start the OpenCLI daemon and Chrome from the signed-in desktop session (for example, a Task Scheduler task configured with "Run only when user is logged on"), ' +
        `or unset ${WINDOWS_SESSION0_AUTOSTART_ENV}=0 to allow controlled Session 0 execution.`,
    };
  }

  return null;
}
