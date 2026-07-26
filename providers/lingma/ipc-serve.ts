import { createServer } from 'node:http';
import {
  createLingmaAcpMeta,
  createLingmaRequestId,
  createLingmaSession,
  initializeLingmaIpc,
  LingmaIpcClient,
  resolveLingmaPipePath,
  runLingmaIpcPrompt,
  setLingmaSessionModel,
} from './ipc-shared.js';
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

interface StartServeOptions {
  port?: number;
  sessionMode?: SessionMode;
  pipe?: string;
  cwd?: string;
  currentFilePath?: string;
  timeoutSeconds?: number;
  mode?: string;
}

export async function startIpcServe(opts: StartServeOptions = {}): Promise<void> {
  const port = opts.port ?? 8084;
  const configuredSessionMode = opts.sessionMode ?? 'auto';
  const promptTimeoutMs = Math.max(1, opts.timeoutSeconds ?? 120) * 1000;

  let client: LingmaIpcClient | null = null;
  let connectedPipePath = '';
  let requestInFlight = false;
  let stickySessionId = '';

  async function closeClient(): Promise<void> {
    if (!client) return;
    const current = client;
    client = null;
    connectedPipePath = '';
    stickySessionId = '';
    await current.close().catch(() => {});
  }

  async function ensureConnected(): Promise<{ client: LingmaIpcClient; pipePath: string }> {
    if (client) {
      try {
        await client.request('ping', {});
        return { client, pipePath: connectedPipePath };
      } catch {
        console.error('[ipc-serve] Lingma IPC connection lost, reconnecting...');
        await closeClient();
      }
    }

    const pipePath = resolveLingmaPipePath(opts.pipe);
    const nextClient = await LingmaIpcClient.connect(pipePath);
    await initializeLingmaIpc(nextClient);

    client = nextClient;
    connectedPipePath = pipePath;
    console.error(`[ipc-serve] Connected to ${pipePath}`);
    return { client: nextClient, pipePath };
  }

  async function resolveServeSession(
    ipcClient: LingmaIpcClient,
    effectiveMode: Exclude<SessionMode, 'auto'>,
  ): Promise<string> {
    if (effectiveMode === 'reuse' && stickySessionId) {
      return stickySessionId;
    }

    const sessionId = await createLingmaSession(ipcClient, {
      cwd: opts.cwd ?? process.cwd(),
      mcpServers: [],
    });

    if (effectiveMode === 'reuse') {
      stickySessionId = sessionId;
    }

    return sessionId;
  }

  async function handleMessages(body: AnthropicRequest): Promise<AnthropicResponse> {
    const effectiveMode = resolveSessionMode(body, configuredSessionMode);
    const prompt = buildLingmaPrompt(body, effectiveMode);
    if (!prompt.trim()) {
      throw new Error('Empty user message');
    }

    const { client: ipcClient } = await ensureConnected();
    const sessionId = await resolveServeSession(ipcClient, effectiveMode);
    const requestId = createLingmaRequestId('serve');
    const promptMeta = createLingmaAcpMeta({
      requestId,
      mode: opts.mode ?? 'agent',
      model: body.model,
      currentFilePath: opts.currentFilePath,
    });

    if (body.model?.trim()) {
      await setLingmaSessionModel(ipcClient, {
        sessionId,
        modelId: body.model,
        meta: promptMeta,
      });
    }

    const result = await runLingmaIpcPrompt(ipcClient, {
      sessionId,
      text: prompt,
      requestId,
      timeoutMs: promptTimeoutMs,
      meta: promptMeta,
    });

    if (!result.assistantText && result.timedOut) {
      if (effectiveMode === 'reuse') stickySessionId = '';
      throw new Error('Timed out while waiting for Lingma IPC to finish responding');
    }
    if (!result.assistantText) {
      if (effectiveMode === 'reuse') stickySessionId = '';
      throw new Error('Lingma IPC did not produce an assistant reply');
    }
    if (result.timedOut) {
      if (effectiveMode === 'reuse') stickySessionId = '';
      throw new Error(`Lingma IPC response remained incomplete before timeout. Partial reply: ${result.assistantText.slice(0, 120)}`);
    }

    return {
      id: generateMsgId(),
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: result.assistantText }],
      model: body.model ?? 'lingma',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: estimateTokens(prompt),
        output_tokens: estimateTokens(result.assistantText),
      },
    };
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

      if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
        jsonResponse(res, 200, {
          ok: true,
          pipe: connectedPipePath || null,
          connected: client !== null,
          stickySessionId: stickySessionId || null,
          sessionMode: configuredSessionMode,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/v1/messages') {
        if (requestInFlight) {
          jsonResponse(res, 429, {
            type: 'error',
            error: { type: 'rate_limit_error', message: 'Lingma IPC serve handles one request at a time.' },
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
          const response = await handleMessages(body);
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

  server.listen(port, '127.0.0.1', () => {
    console.error(`[ipc-serve] Lingma IPC proxy ready at http://127.0.0.1:${port}/v1/messages`);
    console.error(`[ipc-serve] Session mode: ${configuredSessionMode}`);
  });

  const shutdown = async () => {
    console.error('[ipc-serve] Shutting down...');
    server.close();
    await closeClient();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise(() => {});
}
