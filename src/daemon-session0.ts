export const DEFAULT_SESSION0_IDLE_TIMEOUT_MS = 60_000;

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

export class Session0IdleManager {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private readonly _isSession0: boolean;
  private readonly _timeoutMs: number;
  private readonly _onTimeout: () => void;

  constructor(opts: { isSession0: boolean; timeoutMs?: number; onTimeout: () => void }) {
    this._isSession0 = opts.isSession0;
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

  onIdle(pendingCount: number): void {
    if (!this._isSession0) return;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (pendingCount === 0) {
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
