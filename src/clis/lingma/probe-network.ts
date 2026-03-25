import { cli, Strategy } from '../../registry.js';
import { CDPBridge } from '../../browser/cdp.js';
import type { IPage } from '../../types.js';
import { lingmaRequiredEnv } from './shared.js';
import {
  countLingmaMessages,
  ensureLingmaEditorMode,
  getLastLingmaAssistantMessage,
  sendLingmaMessage,
  waitForLingmaResponse,
} from './helpers.js';

interface ProbeRow {
  Seq: number;
  Source: string;
  Type: string;
  Method: string;
  Url: string;
  Status: string;
  Preview: string;
}

function truncate(text: string, limit: number): string {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

function makePageProbeInstallJs(maxPreview: number): string {
  return `
    (() => {
      function __defHidden(obj, key, val) {
        try {
          Object.defineProperty(obj, key, { value: val, writable: true, enumerable: false, configurable: true });
        } catch { obj[key] = val; }
      }

      const storeKey = '__opencli_lingma_probe_store';
      const guardKey = '__opencli_lingma_probe_patched';
      const maxKey = '__opencli_lingma_probe_max';
      __defHidden(window, maxKey, ${JSON.stringify(maxPreview)});
      if (!window[storeKey]) __defHidden(window, storeKey, []);

      function push(entry) {
        try {
          window[storeKey].push(entry);
        } catch {}
      }

      async function readPreviewFromResponse(response) {
        try {
          const clone = response.clone();
          const text = await clone.text();
          const max = Number(window[maxKey] || 400);
          return String(text || '').slice(0, max);
        } catch (err) {
          return '[unreadable response body: ' + String(err) + ']';
        }
      }

      if (!window[guardKey]) {
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
          const req = args[0];
          const init = args[1] || {};
          const url = typeof req === 'string' ? req : (req && req.url) || '';
          const method = String(init.method || (req && req.method) || 'GET');
          try {
            const response = await origFetch.apply(this, args);
            const preview = await readPreviewFromResponse(response);
            push({
              source: 'page',
              type: 'fetch',
              method,
              url,
              status: String(response.status || ''),
              preview,
              contentType: response.headers.get('content-type') || '',
            });
            return response;
          } catch (err) {
            push({
              source: 'page',
              type: 'fetch-error',
              method,
              url,
              status: 'ERROR',
              preview: String(err),
            });
            throw err;
          }
        };

        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
          this.__opencliProbeUrl = String(url || '');
          this.__opencliProbeMethod = String(method || 'GET');
          return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
          this.addEventListener('load', function() {
            const max = Number(window[maxKey] || 400);
            push({
              source: 'page',
              type: 'xhr',
              method: String(this.__opencliProbeMethod || 'GET'),
              url: String(this.__opencliProbeUrl || ''),
              status: String(this.status || ''),
              preview: String(this.responseText || '').slice(0, max),
              contentType: this.getResponseHeader('content-type') || '',
            });
          });
          this.addEventListener('error', function() {
            push({
              source: 'page',
              type: 'xhr-error',
              method: String(this.__opencliProbeMethod || 'GET'),
              url: String(this.__opencliProbeUrl || ''),
              status: 'ERROR',
              preview: 'XMLHttpRequest error',
            });
          });
          return origSend.apply(this, arguments);
        };

        __defHidden(window, guardKey, true);
      }
    })()
  `;
}

function makePageProbeReadJs(): string {
  return `
    (() => {
      const key = '__opencli_lingma_probe_store';
      const data = Array.isArray(window[key]) ? window[key] : [];
      window[key] = [];
      return data;
    })()
  `;
}

function createRow(
  seq: number,
  source: string,
  type: string,
  url: string,
  method: string,
  status: string,
  preview: string,
): ProbeRow {
  return {
    Seq: seq,
    Source: source,
    Type: type,
    Method: method || '',
    Url: url || '',
    Status: status || '',
    Preview: preview || '',
  };
}

function isInterestingUrl(url: string): boolean {
  return /^(https?:|wss?:)/i.test(String(url || ''));
}

export const probeNetworkCommand = cli({
  site: 'lingma',
  name: 'probe-network',
  description: 'Send a Lingma prompt while probing fetch/XHR/WebSocket traffic for the active renderer',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [
    { name: 'text', required: true, positional: true, help: 'Prompt to send while probing traffic' },
    { name: 'timeout', required: false, help: 'Max seconds to wait (default: 45)', default: '45' },
    { name: 'preview-bytes', required: false, help: 'Max preview length per captured payload (default: 400)', default: '400' },
    { name: 'max-events', required: false, help: 'Max captured rows to return (default: 120)', default: '120' },
  ],
  columns: ['Seq', 'Source', 'Type', 'Method', 'Url', 'Status', 'Preview'],
  func: async (page: IPage, kwargs: any) => {
    const text = String(kwargs.text || '');
    const timeoutSeconds = parseInt(String(kwargs.timeout || '45'), 10) || 45;
    const previewBytes = parseInt(String(kwargs['preview-bytes'] || '400'), 10) || 400;
    const maxEvents = parseInt(String(kwargs['max-events'] || '120'), 10) || 120;

    await ensureLingmaEditorMode(page);
    await page.evaluate(makePageProbeInstallJs(previewBytes));

    const bridge = new CDPBridge();
    const bodyTasks: Promise<void>[] = [];
    const requestMeta = new Map<string, { url: string; method: string; type: string; status?: string }>();
    const rows: ProbeRow[] = [];
    let seq = 0;
    let networkEventCount = 0;

    const push = (source: string, type: string, url: string, method: string, status: string, preview: string) => {
      if (rows.length >= maxEvents) return;
      seq += 1;
      rows.push(createRow(seq, source, type, truncate(url, 140), method, status, truncate(preview, previewBytes)));
    };

    await bridge.connect({ timeout: 15 });
    try {
      await bridge.send('Network.enable', {});

      bridge.on('Network.requestWillBeSent', (params: unknown) => {
        const p = params as any;
        const type = String(p?.type || '');
        const requestId = String(p?.requestId || '');
        const url = String(p?.request?.url || '');
        if (!isInterestingUrl(url) || type === 'WebSocket') return;
        const method = String(p?.request?.method || '');
        requestMeta.set(requestId, { url, method, type });
        networkEventCount += 1;
        push('cdp', 'request', url, method, type, '');
      });

      bridge.on('Network.responseReceived', (params: unknown) => {
        const p = params as any;
        const type = String(p?.type || '');
        const requestId = String(p?.requestId || '');
        const url = String(p?.response?.url || requestMeta.get(requestId)?.url || '');
        if (!isInterestingUrl(url) || type === 'WebSocket') return;
        const method = String(requestMeta.get(requestId)?.method || '');
        const status = String(p?.response?.status || '');
        requestMeta.set(requestId, { url, method, type, status });
        networkEventCount += 1;
        push('cdp', 'response', url, method, status, String(p?.response?.mimeType || ''));
      });

      bridge.on('Network.loadingFinished', (params: unknown) => {
        const p = params as any;
        const requestId = String(p?.requestId || '');
        const meta = requestMeta.get(requestId);
        if (!meta || !['Fetch', 'XHR', 'EventSource'].includes(meta.type)) return;
        if (rows.length >= maxEvents) return;

        bodyTasks.push((async () => {
          try {
            const result = await bridge.send('Network.getResponseBody', { requestId }) as { body?: string; base64Encoded?: boolean };
            const body = typeof result?.body === 'string' ? result.body : '';
            push('cdp', 'body', meta.url, meta.method, meta.status || meta.type, body);
          } catch (err) {
            push('cdp', 'body-error', meta.url, meta.method, meta.status || meta.type, String(err));
          }
        })());
      });

      bridge.on('Network.webSocketCreated', (params: unknown) => {
        const p = params as any;
        const url = String(p?.url || '');
        if (!isInterestingUrl(url)) return;
        networkEventCount += 1;
        requestMeta.set(String(p?.requestId || ''), { url, method: 'WS', type: 'WebSocket' });
        push('cdp', 'ws-open', url, 'WS', '', '');
      });

      bridge.on('Network.webSocketFrameSent', (params: unknown) => {
        const p = params as any;
        networkEventCount += 1;
        push('cdp', 'ws-send', String(requestMeta.get(String(p?.requestId || ''))?.url || ''), 'WS', '', String(p?.response?.payloadData || ''));
      });

      bridge.on('Network.webSocketFrameReceived', (params: unknown) => {
        const p = params as any;
        networkEventCount += 1;
        push('cdp', 'ws-recv', String(requestMeta.get(String(p?.requestId || ''))?.url || ''), 'WS', '', String(p?.response?.payloadData || ''));
      });

      bridge.on('Network.eventSourceMessageReceived', (params: unknown) => {
        const p = params as any;
        networkEventCount += 1;
        push('cdp', 'sse', String(requestMeta.get(String(p?.requestId || ''))?.url || ''), 'SSE', '', String(p?.data || ''));
      });

      const beforeCount = await countLingmaMessages(page);
      const sent = await sendLingmaMessage(page, text);
      if (!sent) {
        push('system', 'error', '', '', 'ERROR', 'Could not send message to Lingma');
        return rows;
      }

      const waitResult = await waitForLingmaResponse(page, beforeCount, timeoutSeconds);
      const assistant = getLastLingmaAssistantMessage(waitResult.rows);
      if (assistant) {
        push('dom', 'assistant', '', '', waitResult.timedOut ? 'TIMEOUT' : 'OK', assistant.Text);
      } else if (waitResult.timedOut) {
        push('dom', 'assistant-missing', '', '', 'TIMEOUT', 'No final assistant message found');
      }

      await page.wait(1);
      await Promise.allSettled(bodyTasks);

      const pageRowsRaw = await page.evaluate(makePageProbeReadJs());
      const pageRows = Array.isArray(pageRowsRaw) ? pageRowsRaw as Array<Record<string, unknown>> : [];
      for (const entry of pageRows) {
        if (rows.length >= maxEvents) break;
        push(
          String(entry.source || 'page'),
          String(entry.type || 'event'),
          String(entry.url || ''),
          String(entry.method || ''),
          String(entry.status || ''),
          String(entry.preview || ''),
        );
      }

      if (networkEventCount === 0) {
        push('system', 'summary', '', '', 'NO_NETWORK_EVENTS', 'No renderer-side http/ws traffic was captured during this prompt; Lingma likely uses IPC or a non-page transport for model responses.');
      } else if (rows.length === 0) {
        push('system', 'summary', '', '', 'EMPTY', 'No fetch/XHR/WebSocket traffic was captured during this prompt; Lingma may be using IPC or another non-renderer transport.');
      }

      return rows;
    } finally {
      await bridge.close().catch(() => {});
    }
  },
});
