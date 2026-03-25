import { CommandExecutionError } from '../../errors.js';
import {
  createLingmaSession,
  createLingmaAcpMeta,
  createLingmaRequestId,
  initializeLingmaIpc,
  LingmaIpcClient,
  runLingmaIpcPrompt,
  resolveLingmaPipePath,
  setLingmaSessionModel,
} from './ipc-shared.js';

interface AskOptions {
  text: string;
  pipe?: string;
  sessionId?: string;
  cwd?: string;
  currentFilePath?: string;
  timeoutSeconds?: number;
  mode?: string;
  model?: string;
}

export async function askLingmaIpc(opts: AskOptions): Promise<Record<string, unknown>[]> {
  const text = opts.text.trim();
  if (!text) {
    throw new CommandExecutionError('Lingma IPC ask requires a non-empty prompt.');
  }

  const pipePath = resolveLingmaPipePath(opts.pipe);
  const timeoutMs = Math.max(1, opts.timeoutSeconds ?? 60) * 1000;
  const client = await LingmaIpcClient.connect(pipePath);

  let sessionId = opts.sessionId ?? '';
  const requestId = createLingmaRequestId('ipc');

  try {
    await initializeLingmaIpc(client);

    const promptMeta = createLingmaAcpMeta({
      requestId,
      mode: opts.mode ?? 'agent',
      model: opts.model,
      currentFilePath: opts.currentFilePath,
    });

    if (!sessionId) {
      sessionId = await createLingmaSession(client, {
        cwd: opts.cwd ?? process.cwd(),
        mcpServers: [],
      });
    }

    if (opts.model?.trim()) {
      await setLingmaSessionModel(client, {
        sessionId,
        modelId: opts.model,
        meta: promptMeta,
      });
    }

    const promptRun = await runLingmaIpcPrompt(client, {
      sessionId,
      text,
      requestId,
      timeoutMs,
      meta: promptMeta,
    });
    const baseAssistantRow = {
      Role: 'Assistant',
      Type: 'message',
      Text: promptRun.assistantText,
      SessionId: promptRun.sessionId,
      RequestId: promptRun.requestId,
      Pipe: pipePath,
      Model: opts.model ?? null,
      FinishReason: promptRun.finishData?.reason ?? null,
      StopReason: promptRun.promptResult?.stopReason ?? null,
      UsedTokens: promptRun.contextUsage?.usedTokens ?? null,
      LimitTokens: promptRun.contextUsage?.limitTokens ?? null,
      TimedOut: promptRun.timedOut,
    };

    if (!promptRun.timedOut) {
      return [
        {
          Role: 'User',
          Type: 'message',
          Text: text,
          SessionId: sessionId,
          RequestId: requestId,
          Pipe: pipePath,
          Model: opts.model ?? null,
        },
        baseAssistantRow,
      ];
    }

    const rows: Record<string, unknown>[] = [
      {
        Role: 'User',
        Type: 'message',
        Text: text,
        SessionId: sessionId,
        RequestId: requestId,
        Pipe: pipePath,
        Model: opts.model ?? null,
      },
    ];

    if (promptRun.assistantText) rows.push(baseAssistantRow);
    rows.push({
      Role: 'System',
      Type: 'status',
      Text: `Timed out after ${Math.round(timeoutMs / 1000)}s while waiting for Lingma IPC to finish responding.`,
      SessionId: sessionId,
      RequestId: requestId,
      Pipe: pipePath,
      Model: opts.model ?? null,
      TimedOut: true,
    });
    return rows;
  } catch (error) {
    throw error instanceof CommandExecutionError
      ? error
      : new CommandExecutionError(error instanceof Error ? error.message : String(error));
  } finally {
    await client.close();
  }
}
