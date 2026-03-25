import * as fs from 'node:fs';
import * as net from 'node:net';
import { randomUUID } from 'node:crypto';
import { CommandExecutionError, ConfigError } from '../../errors.js';

const PIPE_DIR = '\\\\.\\pipe\\';
const PIPE_PREFIX = 'lingma-';

export const lingmaAcpMetaKeys = {
  requestId: 'ai-coding/request-id',
  mode: 'ai-coding/mode',
  model: 'ai-coding/model',
  shellType: 'ai-coding/shell-type',
  currentFilePath: 'ai-coding/current-file-path',
  enabledMcpServers: 'ai-coding/enabled-mcp-servers',
} as const;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: number;
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;
type NotificationHandler = (message: JsonRpcNotification) => void;

function normalizePipePath(pipe: string): string {
  return pipe.startsWith(PIPE_DIR) ? pipe : `${PIPE_DIR}${pipe}`;
}

function rejectNoWindows(): never {
  throw new ConfigError('Lingma IPC integration currently requires Windows named pipes.');
}

export function resolveLingmaPipePath(explicitPipe?: string): string {
  if (process.platform !== 'win32') rejectNoWindows();

  const envPipe = process.env.OPENCLI_LINGMA_IPC_PIPE;
  if (explicitPipe?.trim()) return normalizePipePath(explicitPipe.trim());
  if (envPipe?.trim()) return normalizePipePath(envPipe.trim());

  let pipes: string[];
  try {
    pipes = fs.readdirSync(PIPE_DIR).filter((name) => name.startsWith(PIPE_PREFIX)).sort();
  } catch (error) {
    throw new CommandExecutionError(
      `Failed to enumerate Lingma named pipes: ${error instanceof Error ? error.message : String(error)}`,
      'Make sure Lingma is running, or pass --pipe / set OPENCLI_LINGMA_IPC_PIPE explicitly.',
    );
  }

  if (pipes.length === 0) {
    throw new CommandExecutionError(
      'No active Lingma named pipe was found.',
      'Start Lingma first, then rerun the command. You can also pass --pipe or set OPENCLI_LINGMA_IPC_PIPE.',
    );
  }

  return `${PIPE_DIR}${pipes[pipes.length - 1]}`;
}

function defaultShellType(): string {
  if (process.env.OPENCLI_LINGMA_IPC_SHELL_TYPE) {
    return process.env.OPENCLI_LINGMA_IPC_SHELL_TYPE;
  }
  if (process.platform === 'win32') return 'powershell';
  return process.env.SHELL?.split(/[\\/]/).pop() || 'sh';
}

export function createLingmaRequestId(prefix: string = 'ipc'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export function createLingmaAcpMeta(opts: {
  requestId?: string;
  mode?: string;
  model?: string;
  shellType?: string;
  currentFilePath?: string;
  enabledMcpServers?: unknown[];
} = {}): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    [lingmaAcpMetaKeys.requestId]: opts.requestId ?? createLingmaRequestId(),
    [lingmaAcpMetaKeys.shellType]: opts.shellType ?? defaultShellType(),
    [lingmaAcpMetaKeys.enabledMcpServers]: opts.enabledMcpServers ?? [],
  };

  if (opts.mode) meta[lingmaAcpMetaKeys.mode] = opts.mode;
  if (opts.model) meta[lingmaAcpMetaKeys.model] = opts.model;
  if (opts.currentFilePath) meta[lingmaAcpMetaKeys.currentFilePath] = opts.currentFilePath;
  return meta;
}

export interface LingmaIpcPromptRunResult {
  sessionId: string;
  requestId: string;
  promptResult: any;
  finishData: any;
  contextUsage: any;
  assistantText: string;
  chunks: string[];
  timedOut: boolean;
}

export class LingmaIpcClient {
  private readonly socket: net.Socket;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason?: unknown) => void;
      method: string;
    }
  >();
  private readonly notifications = new Set<NotificationHandler>();
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private closed = false;

  private constructor(socket: net.Socket) {
    this.socket = socket;
    this.socket.on('data', (chunk) => this.handleChunk(chunk));
    this.socket.on('error', (error) => this.failPending(error));
    this.socket.on('close', () => this.failPending(new Error('Lingma IPC socket closed')));
  }

  static async connect(pipePath: string, timeoutMs: number = 10_000): Promise<LingmaIpcClient> {
    if (process.platform !== 'win32') rejectNoWindows();

    return await new Promise((resolve, reject) => {
      const socket = net.createConnection(pipePath);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new CommandExecutionError(`Timed out connecting to Lingma IPC pipe ${pipePath}`));
      }, timeoutMs);

      socket.once('connect', () => {
        clearTimeout(timer);
        resolve(new LingmaIpcClient(socket));
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(
          new CommandExecutionError(
            `Failed to connect to Lingma IPC pipe ${pipePath}: ${error.message}`,
            'Make sure Lingma is running, or pass the correct --pipe value.',
          ),
        );
      });
    });
  }

  onNotification(handler: NotificationHandler): () => void {
    this.notifications.add(handler);
    return () => this.notifications.delete(handler);
  }

  async request<T = unknown>(method: string, params: unknown = {}): Promise<T> {
    if (this.closed) {
      throw new CommandExecutionError(`Lingma IPC client is closed before request ${method}`);
    }

    return await new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject, method });
      this.writeFrame({ jsonrpc: '2.0', id, method, params });
    });
  }

  async notify(method: string, params: unknown = {}): Promise<void> {
    if (this.closed) return;
    this.writeFrame({ jsonrpc: '2.0', method, params });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await new Promise<void>((resolve) => {
      this.socket.end(() => resolve());
      this.socket.once('close', () => resolve());
      setTimeout(() => resolve(), 500);
    });
  }

  private writeFrame(message: Omit<JsonRpcRequest, 'id'> | JsonRpcRequest): void {
    const body = JSON.stringify(message);
    const frame = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
    this.socket.write(frame, 'utf8');
  }

  private handleChunk(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.failPending(new Error(`Lingma IPC frame missing Content-Length header: ${header}`));
        return;
      }

      const contentLength = Number(match[1]);
      const frameEnd = headerEnd + 4 + contentLength;
      if (this.buffer.length < frameEnd) return;

      const body = this.buffer.slice(headerEnd + 4, frameEnd).toString('utf8');
      this.buffer = this.buffer.slice(frameEnd);

      let message: JsonRpcMessage;
      try {
        message = JSON.parse(body) as JsonRpcMessage;
      } catch (error) {
        this.failPending(new Error(`Failed to parse Lingma IPC frame: ${error instanceof Error ? error.message : String(error)}`));
        return;
      }

      this.handleMessage(message);
    }
  }

  private handleMessage(message: JsonRpcMessage): void {
    if ('method' in message && !('result' in message) && !('error' in message)) {
      for (const handler of this.notifications) handler(message as JsonRpcNotification);
      return;
    }

    if (!('id' in message) || typeof message.id !== 'number') return;

    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);

    const response = message as JsonRpcResponse;
    if (response.error) {
      pending.reject(
        new CommandExecutionError(
          `Lingma IPC ${pending.method} failed: ${response.error.message ?? 'Unknown error'}`,
        ),
      );
      return;
    }

    pending.resolve(response.result);
  }

  private failPending(error: Error): void {
    if (this.closed && this.pending.size === 0) return;
    this.closed = true;
    for (const [, pending] of this.pending) pending.reject(error);
    this.pending.clear();
  }
}

export async function initializeLingmaIpc(client: LingmaIpcClient): Promise<any> {
  return await client.request('initialize', {
    protocolVersion: 1,
    clientCapabilities: {},
    timestamp: Date.now(),
  });
}

export async function createLingmaSession(
  client: LingmaIpcClient,
  opts: {
    cwd?: string;
    mcpServers?: unknown[];
    meta?: Record<string, unknown>;
  } = {},
): Promise<string> {
  const created = await client.request<any>('session/new', {
    cwd: opts.cwd ?? process.cwd(),
    mcpServers: opts.mcpServers ?? [],
    _meta: opts.meta ?? {},
    timestamp: Date.now(),
  });

  const sessionId = created?.sessionId ?? created?.id ?? '';
  if (!sessionId) {
    throw new CommandExecutionError('Lingma IPC did not return a sessionId.');
  }

  return sessionId;
}

export async function setLingmaSessionModel(
  client: LingmaIpcClient,
  opts: {
    sessionId: string;
    modelId: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  const modelId = opts.modelId.trim();
  if (!modelId) return;

  await client.request('session/set_model', {
    sessionId: opts.sessionId,
    modelId,
    timestamp: Date.now(),
    _meta: opts.meta ?? {},
  });
}

export async function runLingmaIpcPrompt(
  client: LingmaIpcClient,
  opts: {
    sessionId: string;
    text: string;
    requestId: string;
    timeoutMs: number;
    meta?: Record<string, unknown>;
  },
): Promise<LingmaIpcPromptRunResult> {
  const chunks: string[] = [];
  let finishData: any = null;
  let contextUsage: any = null;
  let promptResult: any = null;
  let doneResolver: (() => void) | null = null;

  const donePromise = new Promise<void>((resolve) => {
    doneResolver = resolve;
  });

  const offNotification = client.onNotification((message) => {
    if (message.method === 'chat/process_step_callback') {
      const params = message.params ?? {};
      if (params.requestId === opts.requestId && params.step === 'step_end' && finishData) {
        doneResolver?.();
      }
      return;
    }

    if (message.method !== 'session/update') return;

    const params = message.params ?? {};
    const metaRequestId = params?._meta?.[lingmaAcpMetaKeys.requestId];
    if (metaRequestId !== opts.requestId) return;

    const update = params.update ?? {};
    if (update.sessionUpdate === 'agent_message_chunk') {
      const chunk = update.content?.text;
      if (typeof chunk === 'string' && chunk.length > 0) chunks.push(chunk);
      return;
    }

    if (update.sessionUpdate === 'notification' && update.type === 'context_usage') {
      contextUsage = update.data ?? null;
      return;
    }

    if (update.sessionUpdate === 'notification' && update.type === 'chat_finish') {
      finishData = update.data ?? null;
      doneResolver?.();
    }
  });

  try {
    promptResult = await client.request<any>('session/prompt', {
      sessionId: opts.sessionId,
      prompt: [{ type: 'text', text: opts.text }],
      _meta: opts.meta ?? {},
    });

    const finished = await Promise.race([
      donePromise.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), opts.timeoutMs)),
    ]);

    return {
      sessionId: opts.sessionId,
      requestId: opts.requestId,
      promptResult,
      finishData,
      contextUsage,
      assistantText: chunks.join(''),
      chunks,
      timedOut: !finished,
    };
  } finally {
    offNotification();
  }
}
