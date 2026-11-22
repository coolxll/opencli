/**
 * CDP client — implements IPage by connecting directly to a Chrome CDP WebSocket.
 *
 * Fixes applied:
 * - send() now has a 30s timeout guard (P0 #4)
 * - goto() waits for Page.loadEventFired instead of hardcoded 1s sleep (P1 #3)
 * - Implemented scroll, autoScroll, screenshot, networkRequests (P1 #2)
 * - Shared DOM helper methods extracted to reduce duplication with Page (P1 #5)
 */

import { WebSocket, type RawData } from 'ws';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync, statSync } from 'node:fs';
import type { BrowserCookie, BrowserEvaluateFunction, IPage, ScreenshotOptions } from '../types.js';
import type { IBrowserFactory } from '../runtime.js';
import { buildEvaluateExpression } from './utils.js';
import { generateStealthJs } from './stealth.js';
import { waitForDomStableJs } from './dom-helpers.js';
import { isRecord, saveBase64ToFile } from '../utils.js';
import { CommandExecutionError } from '../errors.js';
import { CDPBasePage } from './base-page.js';

export interface CDPTarget {
  type?: string;
  url?: string;
  title?: string;
  webSocketDebuggerUrl?: string;
}

interface RuntimeEvaluateResult {
  result?: {
    value?: unknown;
  };
  exceptionDetails?: {
    exception?: {
      description?: string;
    };
  };
}

const CDP_SEND_TIMEOUT = 30_000;

// Memory guard for in-process capture. The 4k cap we used to apply everywhere
// silently truncated JSON so `JSON.parse` failed or gave partial objects — the
// primary agent-facing bug. Now we keep the full body up to a large cap and
// surface `responseBodyFullSize` + `responseBodyTruncated` so downstream layers
// can tell the agent what happened instead of lying about the payload.
export const CDP_RESPONSE_BODY_CAPTURE_LIMIT = 8 * 1024 * 1024;
export const CDP_REQUEST_BODY_CAPTURE_LIMIT = 1 * 1024 * 1024;

export class CDPBridge implements IBrowserFactory {
  private _ws: WebSocket | null = null;
  private _connectingWs: WebSocket | null = null;
  private _connecting = false;
  private _connectGen = 0;
  private _connectAbortController: AbortController | null = null;
  private _connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _rejectConnect: ((err: Error) => void) | null = null;
  private _idCounter = 0;
  private _pending = new Map<number, { resolve: (val: unknown) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private _eventListeners = new Map<string, Set<(params: unknown) => void>>();
  private _eventWaiters = new Set<{ event: string; handler: (params: unknown) => void; timer: ReturnType<typeof setTimeout>; reject: (err: Error) => void }>();

  async connect(opts?: { timeout?: number; session?: string; cdpEndpoint?: string; contextId?: string; idleTimeout?: number; windowMode?: 'foreground' | 'background'; surface?: 'browser' | 'adapter'; siteSession?: 'ephemeral' | 'persistent' }): Promise<IPage> {
    if (this._ws || this._connectingWs || this._connecting) throw new Error('CDPBridge is already connected. Call close() before reconnecting.');

    const endpoint = opts?.cdpEndpoint ?? process.env.OPENCLI_CDP_ENDPOINT;
    if (!endpoint) throw new Error('CDP endpoint not provided (pass cdpEndpoint or set OPENCLI_CDP_ENDPOINT)');

    // Validate before connecting: reading a FIFO synchronously could block forever.
    const initPath = process.env.OPENCLI_CDP_INIT_SCRIPT;
    if (initPath && !statSync(initPath).isFile()) {
      throw new Error('OPENCLI_CDP_INIT_SCRIPT must point to a regular JavaScript file');
    }
    const initSource = initPath ? readFileSync(initPath, 'utf8') : undefined;

    const connectGen = ++this._connectGen;
    this._connecting = true;
    const abortController = new AbortController();
    this._connectAbortController = abortController;

    let wsUrl = endpoint;
    if (endpoint.startsWith('http')) {
      try {
        const targets = await fetchJsonDirect(`${endpoint.replace(/\/$/, '')}/json`, abortController.signal) as CDPTarget[];
        if (this._connectGen !== connectGen || abortController.signal.aborted) {
          throw new Error('CDP connection closed');
        }
        const target = selectCDPTarget(targets);
        if (!target || !target.webSocketDebuggerUrl) {
          throw new Error('No inspectable targets found at CDP endpoint');
        }
        wsUrl = target.webSocketDebuggerUrl;
      } catch (err) {
        if (this._connectAbortController === abortController) {
          this._connectAbortController = null;
        }
        if (this._connectGen === connectGen) {
          this._connecting = false;
        }
        if (abortController.signal.aborted || this._connectGen !== connectGen) {
          throw new Error('CDP connection closed');
        }
        throw err;
      }
    }

    if (this._connectAbortController === abortController) {
      this._connectAbortController = null;
    }
    if (this._connectGen !== connectGen || abortController.signal.aborted) {
      throw new Error('CDP connection closed');
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      if (this._connectGen === connectGen) this._connecting = false;
      throw err;
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutMs = (opts?.timeout ?? 10) * 1000;

      const clearConnectState = () => {
        if (this._connectTimeout) {
          clearTimeout(this._connectTimeout);
          this._connectTimeout = null;
        }
        if (this._connectingWs === ws) this._connectingWs = null;
        if (this._rejectConnect === rejectConnect) this._rejectConnect = null;
        if (this._connectGen === connectGen) this._connecting = false;
      };

      const rejectConnect = (err: Error) => {
        if (settled) return;
        settled = true;
        clearConnectState();
        reject(err);
      };

      this._connectingWs = ws;
      this._rejectConnect = rejectConnect;
      this._connectTimeout = setTimeout(() => {
        if (this._ws === ws) this._ws = null;
        ws.close();
        rejectConnect(new Error('CDP connect timeout'));
      }, timeoutMs);

      ws.on('open', async () => {
        if (settled || this._connectingWs !== ws) {
          try { ws.close(); } catch {}
          return;
        }
        if (this._connectTimeout) {
          clearTimeout(this._connectTimeout);
          this._connectTimeout = null;
        }
        this._connectingWs = null;
        this._ws = ws;
        try {
          await this.send('Page.enable');
          await this.send('Page.addScriptToEvaluateOnNewDocument', { source: generateStealthJs() });
          // Optional caller script for every new document, e.g. state a headless peer cannot share across connections.
          if (initSource !== undefined) await this.send('Page.addScriptToEvaluateOnNewDocument', { source: initSource });
        } catch (err) {
          const connectErr = err instanceof Error ? err : new Error(String(err));
          if (this._rejectConnect === rejectConnect) this._rejectConnect = null;
          if (this._ws === ws) await this.close();
          rejectConnect(connectErr);
          return;
        }
        if (settled || this._ws !== ws) return;
        settled = true;
        clearConnectState();
        resolve(new CDPPage(this));
      });

      ws.on('error', (err: Error) => {
        if (ws !== this._ws && ws !== this._connectingWs) return;
        rejectConnect(err);
      });

      ws.on('close', () => {
        if (ws === this._connectingWs) {
          rejectConnect(new Error('CDP connection closed'));
          return;
        }
        if (ws !== this._ws) return;
        this._ws = null;
        this._rejectPending('CDP connection closed');
        this._rejectEventWaiters('CDP connection closed');
        rejectConnect(new Error('CDP connection closed'));
      });

      ws.on('message', (data: RawData) => {
        if (ws !== this._ws) return;
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id && this._pending.has(msg.id)) {
            const entry = this._pending.get(msg.id)!;
            clearTimeout(entry.timer);
            this._pending.delete(msg.id);
            if (msg.error) {
              entry.reject(new Error(msg.error.message));
            } else {
              entry.resolve(msg.result);
            }
          }
          if (msg.method) {
            const listeners = this._eventListeners.get(msg.method);
            if (listeners) {
              for (const fn of listeners) fn(msg.params);
            }
          }
        } catch (err) {
          if (process.env.OPENCLI_VERBOSE) {
            // eslint-disable-next-line no-console
            console.error('[cdp] Failed to parse WebSocket message:', err instanceof Error ? err.message : err);
          }
        }
      });
    });
  }

  private _rejectPending(message: string): void {
    const entries = [...this._pending.values()];
    this._pending.clear();
    for (const p of entries) {
      clearTimeout(p.timer);
      p.reject(new Error(message));
    }
  }

  private _rejectEventWaiters(message: string): void {
    const waiters = [...this._eventWaiters];
    this._eventWaiters.clear();
    for (const w of waiters) {
      clearTimeout(w.timer);
      this.off(w.event, w.handler);
      w.reject(new Error(message));
    }
  }

  async close(): Promise<void> {
    this._connectGen++;
    this._connecting = false;
    if (this._connectAbortController) {
      const controller = this._connectAbortController;
      this._connectAbortController = null;
      controller.abort();
    }
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }
    if (this._connectingWs) {
      const connecting = this._connectingWs;
      this._connectingWs = null;
      try { connecting.close(); } catch {}
    }
    if (this._rejectConnect) {
      const rejectConnect = this._rejectConnect;
      this._rejectConnect = null;
      rejectConnect(new Error('CDP connection closed'));
    }
    if (this._ws) {
      const ws = this._ws;
      this._ws = null;
      ws.close();
    }
    this._rejectPending('CDP connection closed');
    this._rejectEventWaiters('CDP connection closed');
    this._eventListeners.clear();
  }

  async send(method: string, params: Record<string, unknown> = {}, timeoutMs: number = CDP_SEND_TIMEOUT): Promise<unknown> {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      throw new Error('CDP connection is not open');
    }
    const id = ++this._idCounter;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`CDP command '${method}' timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
      this._pending.set(id, { resolve, reject, timer });
      this._ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event: string, handler: (params: unknown) => void): void {
    let set = this._eventListeners.get(event);
    if (!set) {
      set = new Set();
      this._eventListeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: (params: unknown) => void): void {
    this._eventListeners.get(event)?.delete(handler);
  }

  waitForEvent(event: string, timeoutMs: number = 15_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const entry = {
        event,
        handler: (params: unknown) => {
          clearTimeout(entry.timer);
          this._eventWaiters.delete(entry);
          this.off(event, entry.handler);
          resolve(params);
        },
        timer: setTimeout(() => {
          this._eventWaiters.delete(entry);
          this.off(event, entry.handler);
          reject(new Error(`Timed out waiting for CDP event '${event}'`));
        }, timeoutMs),
        reject,
      };
      this._eventWaiters.add(entry);
      this.on(event, entry.handler);
    });
  }
}

class CDPPage extends CDPBasePage {
  private _pageEnabled = false;

  // Network capture state (mirrors extension/src/cdp.ts NetworkCaptureEntry shape)
  private _networkCapturing = false;
  private _networkCapturePattern = '';
  private _networkEntries: Array<{
    requestId: string; url: string; method: string; responseStatus?: number;
    requestHeaders?: Record<string, string>;
    requestBodyKind?: string;
    requestBodyPreview?: string;
    requestBodyFullSize?: number;
    requestBodyTruncated?: boolean;
    responseContentType?: string;
    responsePreview?: string;
    responseBodyFullSize?: number;
    responseBodyTruncated?: boolean;
    requestBodyPending?: boolean;
    responseFinished?: boolean;
    captureComplete?: boolean;
    timestamp: number;
  }> = [];
  private _pendingRequests = new Map<string, number>(); // requestId → index in _networkEntries
  private _pendingBodyFetches: Set<Promise<void>> = new Set(); // track in-flight getResponseBody calls
  private _consoleMessages: Array<{ type: string; text: string; timestamp: number }> = [];
  private _consoleCapturing = false;

  constructor(private bridge: CDPBridge) {
    super();
  }

  async goto(url: string, options?: { waitUntil?: 'load' | 'none'; settleMs?: number; allowBoundNavigation?: boolean }): Promise<void> {
    if (!this._pageEnabled) {
      await this.bridge.send('Page.enable');
      this._pageEnabled = true;
    }
    const loadPromise = this.bridge.waitForEvent('Page.loadEventFired', 30_000).catch(() => {});
    await this.bridge.send('Page.navigate', { url });
    await loadPromise;
    this._lastUrl = url;
    if (options?.waitUntil !== 'none') {
      const maxMs = options?.settleMs ?? 1000;
      await this.evaluate(waitForDomStableJs(maxMs, Math.min(500, maxMs)));
    }
  }

  async evaluate<T = unknown>(js: string): Promise<T>;
  async evaluate<Args extends unknown[], T>(fn: BrowserEvaluateFunction<Args, T>, ...args: Args): Promise<Awaited<T>>;
  async evaluate(input: string | BrowserEvaluateFunction<unknown[], unknown>, ...args: unknown[]): Promise<unknown> {
    const expression = buildEvaluateExpression(input, args);
    const result = await this.bridge.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }) as RuntimeEvaluateResult;
    if (result.exceptionDetails) {
      throw new Error('Evaluate error: ' + (result.exceptionDetails.exception?.description || 'Unknown exception'));
    }
    return result.result?.value;
  }

  /** Direct CDP evaluation has no replay/retry path. */
  async evaluateOnce<T = unknown>(js: string): Promise<T> {
    return this.evaluate<T>(js);
  }

  async getCookies(opts: { domain?: string; url?: string } = {}): Promise<BrowserCookie[]> {
    // Network.getCookies without URLs is scoped to the current page, which may
    // be on another site during a no-navigation auth check.
    const result = opts.url
      ? await this.bridge.send('Network.getCookies', { urls: [opts.url] })
      : await this.bridge.send('Storage.getCookies', {});
    if (!isRecord(result) || !Array.isArray(result.cookies) || !result.cookies.every(isCookie)) {
      throw new CommandExecutionError('CDP returned an invalid cookies response');
    }
    const cookies = result.cookies;
    const domain = opts.domain;
    return domain
      ? cookies.filter((cookie): cookie is BrowserCookie => isCookie(cookie) && matchesCookieDomain(cookie.domain, domain))
      : cookies;
  }

  async screenshot(options: ScreenshotOptions = {}): Promise<string> {
    const fullPage = options.fullPage === true;
    const overrideWidth = options.width && options.width > 0 ? Math.ceil(options.width) : undefined;
    // height is ignored under fullPage so the captureBeyondViewport path stays unchanged for users who pass --height alongside --full-page.
    const overrideHeight = !fullPage && options.height && options.height > 0 ? Math.ceil(options.height) : undefined;
    const needsOverride = overrideWidth !== undefined || overrideHeight !== undefined;

    if (needsOverride) {
      if (overrideWidth !== undefined && fullPage) {
        await this.bridge.send('Emulation.setDeviceMetricsOverride', {
          mobile: false,
          width: overrideWidth,
          height: 0,
          deviceScaleFactor: 1,
        });
      }
      let finalWidth = overrideWidth ?? 0;
      let finalHeight = overrideHeight ?? 0;
      if (fullPage) {
        const metrics = await this.bridge.send('Page.getLayoutMetrics');
        const m = isRecord(metrics) ? metrics : {};
        const css = isRecord(m.cssContentSize) ? m.cssContentSize : undefined;
        const fb = isRecord(m.contentSize) ? m.contentSize : undefined;
        const size = css ?? fb;
        if (size && typeof size.width === 'number' && typeof size.height === 'number') {
          if (finalWidth === 0) finalWidth = Math.ceil(size.width);
          finalHeight = Math.ceil(size.height);
        }
      }
      await this.bridge.send('Emulation.setDeviceMetricsOverride', {
        mobile: false,
        width: finalWidth,
        height: finalHeight,
        deviceScaleFactor: 1,
      });
    }

    try {
      const result = await this.bridge.send('Page.captureScreenshot', {
        format: options.format ?? 'png',
        quality: options.format === 'jpeg' ? (options.quality ?? 80) : undefined,
        captureBeyondViewport: !needsOverride && fullPage,
      });
      const base64 = isRecord(result) && typeof result.data === 'string' ? result.data : '';
      if (options.path) {
        await saveBase64ToFile(base64, options.path);
      }
      return base64;
    } finally {
      if (needsOverride) {
        await this.bridge.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
      }
    }
  }

  async startNetworkCapture(pattern: string = ''): Promise<boolean> {
    // Always update the filter pattern
    this._networkCapturePattern = pattern;

    // Reset state only on first start; avoid wiping entries if already capturing
    if (!this._networkCapturing) {
      this._networkEntries = [];
      this._pendingRequests.clear();
      this._pendingBodyFetches.clear();
      await this.bridge.send('Network.enable');

      // Step 1: Record request method/url on requestWillBeSent
      this.bridge.on('Network.requestWillBeSent', (params: unknown) => {
        const p = params as {
          requestId: string;
          request: {
            method: string;
            url: string;
            headers?: Record<string, unknown>;
            postData?: string;
            hasPostData?: boolean;
          };
          timestamp: number;
        };
        // Redirect hops reuse the request ID. Keep the original request/body
        // and settle it from the final response instead of retaining an orphan.
        if (this._pendingRequests.has(p.requestId)) return;
        if (!this._networkCapturePattern || p.request.url.includes(this._networkCapturePattern)) {
          const rawBody = typeof p.request.postData === 'string' ? p.request.postData : '';
          const bodyTruncated = rawBody.length > CDP_REQUEST_BODY_CAPTURE_LIMIT;
          const entry: (typeof this._networkEntries)[number] = {
            requestId: p.requestId,
            url: p.request.url,
            method: p.request.method,
            requestHeaders: Object.fromEntries(
              Object.entries(p.request.headers ?? {}).map(([name, value]) => [name, String(value)]),
            ),
            requestBodyKind: p.request.hasPostData ? 'string' : 'empty',
            requestBodyPreview: bodyTruncated ? rawBody.slice(0, CDP_REQUEST_BODY_CAPTURE_LIMIT) : rawBody,
            requestBodyFullSize: rawBody.length,
            requestBodyTruncated: bodyTruncated,
            timestamp: Date.now(),
          };
          const idx = this._networkEntries.push(entry) - 1;
          this._pendingRequests.set(p.requestId, idx);

          if (p.request.hasPostData && p.request.postData === undefined) {
            // Complete only when BOTH bodies are settled; a response body that
            // finishes first must not let a retaining read drop the entry
            // before its late request body lands.
            entry.requestBodyPending = true;
            const settleComplete = () => {
              entry.captureComplete = entry.responseFinished === true && entry.requestBodyPending !== true;
            };
            const requestBodyFetch = this.bridge.send('Network.getRequestPostData', { requestId: p.requestId }).then((result: unknown) => {
              const postData = (result as { postData?: string } | undefined)?.postData;
              if (typeof postData !== 'string') return;
              const truncated = postData.length > CDP_REQUEST_BODY_CAPTURE_LIMIT;
              entry.requestBodyPreview = truncated
                ? postData.slice(0, CDP_REQUEST_BODY_CAPTURE_LIMIT)
                : postData;
              entry.requestBodyFullSize = postData.length;
              entry.requestBodyTruncated = truncated;
            }).catch(() => {
              // Some request types do not expose post data.
            }).finally(() => {
              entry.requestBodyPending = false;
              settleComplete();
              this._pendingBodyFetches.delete(requestBodyFetch);
            });
            this._pendingBodyFetches.add(requestBodyFetch);
          }
        }
      });

      // Step 2: Fill in response metadata on responseReceived
      this.bridge.on('Network.responseReceived', (params: unknown) => {
        const p = params as { requestId: string; response: { status: number; mimeType?: string } };
        const idx = this._pendingRequests.get(p.requestId);
        if (idx !== undefined) {
          this._networkEntries[idx].responseStatus = p.response.status;
          this._networkEntries[idx].responseContentType = p.response.mimeType || '';
        }
      });

      // Step 3: Fetch body on loadingFinished (body is only reliably available after this)
      this.bridge.on('Network.loadingFinished', (params: unknown) => {
        const p = params as { requestId: string };
        const idx = this._pendingRequests.get(p.requestId);
        if (idx !== undefined) {
          const entry = this._networkEntries[idx];
          const bodyFetch = this.bridge.send('Network.getResponseBody', { requestId: p.requestId }).then((result: unknown) => {
            const r = result as { body?: string; base64Encoded?: boolean } | undefined;
            if (typeof r?.body === 'string') {
              const fullSize = r.body.length;
              const truncated = fullSize > CDP_RESPONSE_BODY_CAPTURE_LIMIT;
              const body = truncated ? r.body.slice(0, CDP_RESPONSE_BODY_CAPTURE_LIMIT) : r.body;
              entry.responsePreview = r.base64Encoded ? `base64:${body}` : body;
              entry.responseBodyFullSize = fullSize;
              entry.responseBodyTruncated = truncated;
            }
          }).catch((err) => {
            // Body unavailable for some requests (e.g. uploads) — non-fatal
            if (process.env.OPENCLI_VERBOSE) {
              // eslint-disable-next-line no-console
              console.error(`[cdp] getResponseBody failed for ${p.requestId}:`, err instanceof Error ? err.message : err);
            }
          }).finally(() => {
            entry.responseFinished = true;
            entry.captureComplete = entry.requestBodyPending !== true;
            this._pendingBodyFetches.delete(bodyFetch);
          });
          this._pendingBodyFetches.add(bodyFetch);
          this._pendingRequests.delete(p.requestId);
        }
      });

      this.bridge.on('Network.loadingFailed', (params: unknown) => {
        const p = params as { requestId: string };
        const idx = this._pendingRequests.get(p.requestId);
        if (idx !== undefined) {
          const entry = this._networkEntries[idx];
          entry.responseFinished = true;
          // Mirror the extension: a pending request body still completes later.
          entry.captureComplete = entry.requestBodyPending !== true;
          this._pendingRequests.delete(p.requestId);
        }
      });

      this._networkCapturing = true;
    }
    return true;
  }

  async readNetworkCapture(options: { retainIncomplete?: boolean } = {}): Promise<unknown[]> {
    // A draining read awaits all in-flight body fetches so entries are fully
    // populated. A retaining read must not block on them: a slow or stalled
    // fetch would hold the caller past its deadline instead of returning the
    // current snapshot while the entry stays retained for a later read.
    if (!options.retainIncomplete && this._pendingBodyFetches.size > 0) {
      await Promise.all([...this._pendingBodyFetches]);
    }
    const entries = this._networkEntries.map(entry => ({ ...entry }));
    if (!options.retainIncomplete) {
      this._networkEntries = [];
      this._pendingRequests.clear();
      return entries;
    }
    const retained: typeof this._networkEntries = [];
    const reindexed = new Map<number, number>();
    this._networkEntries.forEach((entry, index) => {
      if (!entry.captureComplete) {
        reindexed.set(index, retained.length);
        retained.push(entry);
      }
    });
    this._networkEntries = retained;
    this._pendingRequests = new Map([...this._pendingRequests].flatMap(([id, index]) =>
      reindexed.has(index) ? [[id, reindexed.get(index)!]] : []));
    return entries;
  }

  async consoleMessages(level: string = 'all'): Promise<Array<{ type: string; text: string; timestamp: number }>> {
    if (!this._consoleCapturing) {
      await this.bridge.send('Runtime.enable');
      this.bridge.on('Runtime.consoleAPICalled', (params: unknown) => {
        const p = params as { type: string; args: Array<{ value?: unknown; description?: string }>; timestamp: number };
        const text = (p.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
        this._consoleMessages.push({ type: p.type, text, timestamp: Date.now() });
        if (this._consoleMessages.length > 500) this._consoleMessages.shift();
      });
      // Capture uncaught exceptions as error-level messages
      this.bridge.on('Runtime.exceptionThrown', (params: unknown) => {
        const p = params as { timestamp: number; exceptionDetails?: { exception?: { description?: string }; text?: string } };
        const desc = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'Unknown exception';
        this._consoleMessages.push({ type: 'error', text: desc, timestamp: Date.now() });
        if (this._consoleMessages.length > 500) this._consoleMessages.shift();
      });
      this._consoleCapturing = true;
    }
    if (level === 'all') return [...this._consoleMessages];
    // 'error' level includes both console.error() and uncaught exceptions
    if (level === 'error') return this._consoleMessages.filter(m => m.type === 'error');
    return this._consoleMessages.filter(m => m.type === level);
  }

  async tabs(): Promise<unknown[]> {
    return [];
  }

  async selectTab(_target: number | string): Promise<void> {
    // Not supported in direct CDP mode
  }

  async cdp(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.bridge.send(method, params);
  }

  async insertText(text: string): Promise<void> {
    await this.nativeType(text);
  }
}

function isCookie(value: unknown): value is BrowserCookie {
  return isRecord(value)
    && typeof value.name === 'string'
    && typeof value.value === 'string'
    && typeof value.domain === 'string';
}

function matchesCookieDomain(cookieDomain: string, targetDomain: string): boolean {
  const normalizedCookieDomain = cookieDomain.replace(/^\./, '').toLowerCase();
  const normalizedTargetDomain = targetDomain.replace(/^\./, '').toLowerCase();
  return normalizedTargetDomain === normalizedCookieDomain
    || normalizedCookieDomain.endsWith(`.${normalizedTargetDomain}`);
}

function selectCDPTarget(targets: CDPTarget[]): CDPTarget | undefined {
  const preferredPattern = compilePreferredPattern(process.env.OPENCLI_CDP_TARGET);
  return targets
    .map((target, index) => ({ target, index, score: scoreCDPTarget(target, preferredPattern) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.target;
}

function scoreCDPTarget(target: CDPTarget, preferredPattern?: RegExp): number {
  if (!target.webSocketDebuggerUrl) return Number.NEGATIVE_INFINITY;

  const type = (target.type ?? '').toLowerCase();
  const url = (target.url ?? '').toLowerCase();
  const title = (target.title ?? '').toLowerCase();
  const haystack = `${title} ${url}`;

  if (!haystack.trim() && !type) return Number.NEGATIVE_INFINITY;
  if (haystack.includes('devtools')) return Number.NEGATIVE_INFINITY;
  // Chrome exposes browser UI targets (e.g. the toolbar) alongside real tabs.
  // They cannot be navigated and must never outrank an about:blank page.
  if (/^chrome(?:-untrusted)?:\/\/[^/]*\.top-chrome(?:\/|$)/.test(url)) return Number.NEGATIVE_INFINITY;
  if (type === 'background_page' || type === 'service_worker') return Number.NEGATIVE_INFINITY;

  let score = 0;

  if (preferredPattern && preferredPattern.test(haystack)) score += 1000;

  if (type === 'page') score += 80;
  else if (type === 'iframe') score += 20;

  if (url.startsWith('about:blank')) score -= 120;
  if (url === '' || url === 'about:blank') score -= 40;

  if (title && title !== 'devtools') score += 25;

  return score;
}

function compilePreferredPattern(raw: string | undefined): RegExp | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  return new RegExp(escapeRegExp(value.toLowerCase()));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const __test__ = {
  selectCDPTarget,
  scoreCDPTarget,
};

function fetchJsonDirect(url: string, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('CDP connection closed'));
      return;
    }
    const parsed = new URL(url);
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      fn();
    };
    const onAbort = () => {
      request.destroy();
      finish(() => reject(new Error('CDP connection closed')));
    };

    const request = (parsed.protocol === 'https:' ? httpsRequest : httpRequest)(parsed, (res) => {
      const statusCode = res.statusCode ?? 0;
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        finish(() => reject(new Error(`Failed to fetch CDP targets: HTTP ${statusCode}`)));
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          finish(() => resolve(parsedBody));
        } catch (error) {
          finish(() => reject(error instanceof Error ? error : new Error(String(error))));
        }
      });
      res.on('error', (error) => finish(() => reject(error)));
    });

    signal?.addEventListener('abort', onAbort, { once: true });
    request.on('error', (error) => finish(() => reject(error)));
    request.setTimeout(10_000, () => request.destroy(new Error('Timed out fetching CDP targets')));
    request.end();
  });
}
