/**
 * lingma serve — Anthropic-compatible `/v1/messages` proxy server.
 *
 * Starts an HTTP server that accepts Anthropic Messages API requests,
 * forwards them to a running Lingma app via CDP, waits for the response,
 * and returns it in Anthropic format.
 *
 * Usage:
 *   OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9344 opencli lingma serve --port 8083
 *   OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9344 OPENCLI_CDP_TARGET=Lingma opencli lingma serve --session-mode auto
 *   ANTHROPIC_BASE_URL=http://localhost:8083 claude
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { CDPBridge } from '../../browser/cdp.js';
import type { IPage } from '../../types.js';
import {
  countLingmaMessages,
  ensureLingmaEditorMode,
  getLastLingmaAssistantMessage,
  sendLingmaMessage,
  startLingmaNewConversation,
  switchLingmaModel,
  waitForLingmaResponse,
} from './helpers.js';
import {
  type AnthropicRequest,
  type AnthropicResponse,
  type SessionMode,
  buildLingmaPrompt,
  estimateTokens,
  generateMsgId,
  jsonResponse,
  readBody,
  resolveSessionMode,
} from './serve-shared.js';

async function handleMessages(
  body: AnthropicRequest,
  page: IPage,
  opts: { sessionMode: SessionMode },
): Promise<AnthropicResponse> {
  const effectiveMode = resolveSessionMode(body, opts.sessionMode);
  const prompt = buildLingmaPrompt(body, effectiveMode);

  if (!prompt.trim()) {
    throw new Error('Empty user message');
  }

  await ensureLingmaEditorMode(page);

  if (effectiveMode === 'fresh') {
    const started = await startLingmaNewConversation(page);
    if (!started) throw new Error('Could not start a new Lingma conversation');
    await ensureLingmaEditorMode(page);
  }

  if (body.model) {
    const switched = await switchLingmaModel(page, body.model).catch(() => false);
    if (!switched) {
      console.error(`[serve] Warning: could not switch Lingma model to "${body.model}"`);
    }
  }

  const beforeCount = await countLingmaMessages(page);
  const sent = await sendLingmaMessage(page, prompt);
  if (!sent) {
    throw new Error('Could not send prompt to Lingma');
  }

  const result = await waitForLingmaResponse(page, beforeCount, 120);
  const assistant = getLastLingmaAssistantMessage(result.rows);

  if (!assistant && result.timedOut) {
    throw new Error('Timed out while waiting for Lingma to finish responding');
  }
  if (!assistant) {
    throw new Error('Lingma did not produce an assistant reply');
  }
  if (result.timedOut) {
    throw new Error(`Lingma response remained unstable before timeout. Partial reply: ${assistant.Text.slice(0, 120)}`);
  }

  return {
    id: generateMsgId(),
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: assistant.Text }],
    model: body.model ?? 'lingma',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: estimateTokens(prompt),
      output_tokens: estimateTokens(assistant.Text),
    },
  };
}

export async function startServe(opts: { port?: number; sessionMode?: SessionMode } = {}): Promise<void> {
  const port = opts.port ?? 8083;
  const sessionMode = opts.sessionMode ?? 'auto';

  let cdp: CDPBridge | null = null;
  let page: IPage | null = null;
  let requestInFlight = false;

  async function ensureConnected(): Promise<IPage> {
    if (page) {
      try {
        await page.evaluate('1+1');
        return page;
      } catch {
        console.error('[serve] Lingma CDP connection lost, reconnecting...');
        cdp?.close().catch(() => {});
        cdp = null;
        page = null;
      }
    }

    const endpoint = process.env.OPENCLI_CDP_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        'OPENCLI_CDP_ENDPOINT is not set.\n' +
        'Usage: OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9344 opencli lingma serve',
      );
    }

    if (process.env.OPENCLI_CDP_TARGET) {
      console.error(`[serve] Using OPENCLI_CDP_TARGET=${process.env.OPENCLI_CDP_TARGET}`);
    }

    try {
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/json`);
      const targets = await res.json() as Array<{ title?: string; type?: string }>;
      const pages = targets.filter((target) => target.type === 'page');
      console.error(`[serve] Available targets: ${pages.map((target) => `"${target.title}"`).join(', ')}`);
    } catch {
      // ignore target listing failures
    }

    cdp = new CDPBridge();
    page = await cdp.connect({ timeout: 15_000 });
    await ensureLingmaEditorMode(page);
    console.error(`[serve] Lingma serve listening with session mode: ${sessionMode}`);
    return page;
  }

  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
      });
      res.end();
      return;
    }

    const url = req.url ?? '/';
    const pathname = url.split('?')[0];

    try {
      if (req.method === 'GET' && pathname === '/v1/models') {
        jsonResponse(res, 200, {
          data: [
            {
              id: 'lingma',
              object: 'model',
              created: Math.floor(Date.now() / 1000),
              owned_by: 'lingma',
            },
          ],
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/v1/messages') {
        if (requestInFlight) {
          jsonResponse(res, 429, {
            type: 'error',
            error: { type: 'rate_limit_error', message: 'Lingma serve handles one request at a time.' },
          });
          return;
        }

        const raw = await readBody(req);
        let body: AnthropicRequest;
        try {
          body = JSON.parse(raw) as AnthropicRequest;
        } catch {
          jsonResponse(res, 400, {
            type: 'error',
            error: { type: 'invalid_request_error', message: 'Invalid JSON body.' },
          });
          return;
        }

        if (body.stream) {
          jsonResponse(res, 400, {
            type: 'error',
            error: { type: 'invalid_request_error', message: 'Streaming is not supported. Set "stream": false.' },
          });
          return;
        }

        requestInFlight = true;
        try {
          const activePage = await ensureConnected();
          const response = await handleMessages(body, activePage, { sessionMode });
          jsonResponse(res, 200, response);
        } finally {
          requestInFlight = false;
        }
        return;
      }

      jsonResponse(res, 404, {
        type: 'error',
        error: { type: 'not_found_error', message: `Unknown route: ${pathname}` },
      });
    } catch (err: any) {
      jsonResponse(res, 500, {
        type: 'error',
        error: { type: 'api_error', message: err?.message || String(err) },
      });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.error(`[serve] Lingma proxy ready at http://127.0.0.1:${port}/v1/messages`);
      resolve();
    });
  });
}
