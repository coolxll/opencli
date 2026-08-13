import { spawnSync } from 'node:child_process';
import * as os from 'node:os';

export const WINDOWS_SESSION0_AUTOSTART_ENV = 'OPENCLI_ALLOW_SESSION0_AUTOSTART';

export interface WindowsSessionAutostartBlock {
  sessionId: number;
  message: string;
  hint: string;
}

function queryCurrentWindowsSessionId(): number | null {
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

function envAllowsSession0Autostart(env: NodeJS.ProcessEnv): boolean {
  const value = env[WINDOWS_SESSION0_AUTOSTART_ENV]?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
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

/**
 * Windows Session 0 is a non-interactive service session. GUI Chrome processes
 * started there cannot participate in the signed-in user's desktop session.
 * Existing localhost services remain reusable; only process creation is
 * blocked by this policy.
 */
export function getWindowsSessionAutostartBlock(
  env: NodeJS.ProcessEnv = process.env,
): WindowsSessionAutostartBlock | null {
  const platform = windowsSessionHooks.platform();
  const hasWindowsHost = platform === 'win32'
    || (platform === 'linux' && windowsSessionHooks.isWslWindowsHost(env));
  if (!hasWindowsHost) return null;
  if (envAllowsSession0Autostart(env)) return null;

  const sessionId = windowsSessionHooks.getCurrentSessionId();
  if (sessionId !== 0) return null;

  return {
    sessionId,
    message: 'Refusing to start OpenCLI background processes in Windows Session 0',
    hint:
      'Start the OpenCLI daemon and Chrome from the signed-in desktop session (for example, a Task Scheduler task configured with "Run only when user is logged on"). ' +
      `Set ${WINDOWS_SESSION0_AUTOSTART_ENV}=1 only if Session 0 startup is intentional.`,
  };
}
