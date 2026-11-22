export const DEFAULT_SESSION0_IDLE_TIMEOUT_MS = 60_000;
export const DEFAULT_DAEMON_IDLE_TIMEOUT_MS = 1_800_000; // 30 minutes

export function getSession0IdleTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const envVal = env.OPENCLI_SESSION0_IDLE_TIMEOUT?.trim();
  if (envVal) {
    const parsed = Number.parseInt(envVal, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed * 1000;
    }
  }
  return DEFAULT_SESSION0_IDLE_TIMEOUT_MS;
}

/**
 * Resolve the daemon idle auto-shutdown timeout in milliseconds.
 * - In Windows Session 0: prefers OPENCLI_SESSION0_IDLE_TIMEOUT (default 60s),
 *   falling back to OPENCLI_DAEMON_IDLE_TIMEOUT if set.
 * - On all other platforms: reads OPENCLI_DAEMON_IDLE_TIMEOUT in seconds
 *   (default 1800s / 30 min; `0` disables idle auto-shutdown).
 */
export function getDaemonIdleTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
  isSession0: boolean = false,
): number {
  if (isSession0) {
    const session0Val = env.OPENCLI_SESSION0_IDLE_TIMEOUT?.trim();
    if (session0Val) {
      return getSession0IdleTimeoutMs(env);
    }
    const daemonVal = env.OPENCLI_DAEMON_IDLE_TIMEOUT?.trim();
    if (daemonVal) {
      const parsed = Number.parseInt(daemonVal, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed * 1000;
      }
    }
    return DEFAULT_SESSION0_IDLE_TIMEOUT_MS;
  }

  const daemonVal = env.OPENCLI_DAEMON_IDLE_TIMEOUT?.trim();
  if (daemonVal) {
    const parsed = Number.parseInt(daemonVal, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed * 1000;
    }
  }
  return DEFAULT_DAEMON_IDLE_TIMEOUT_MS;
}

export class Session0IdleManager {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private readonly _enabled: boolean;
  private readonly _timeoutMs: number;
  private readonly _onTimeout: () => void;

  constructor(opts: { isSession0?: boolean; enabled?: boolean; timeoutMs?: number; onTimeout: () => void }) {
    this._enabled = opts.enabled ?? Boolean(opts.isSession0);
    this._timeoutMs = opts.timeoutMs ?? DEFAULT_SESSION0_IDLE_TIMEOUT_MS;
    this._onTimeout = opts.onTimeout;
  }

  get isArmed(): boolean {
    return this._timer !== null;
  }

  get timeoutMs(): number {
    return this._timeoutMs;
  }

  onActivity(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  onIdle(pendingCount: number, waiterCount: number = 0): void {
    if (!this._enabled || this._timeoutMs <= 0) return;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (pendingCount === 0 && waiterCount === 0) {
      this._timer = setTimeout(() => {
        this._timer = null;
        this._onTimeout();
      }, this._timeoutMs);
      this._timer.unref?.();
    }
  }

  stop(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}
