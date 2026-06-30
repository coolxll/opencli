import { CommandExecutionError } from '../../errors.js';
import { initializeLingmaIpc, LingmaIpcClient, resolveLingmaPipePath } from './ipc-shared.js';

function countItems(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function summarizeSelectedModels(queryModels: any): string {
  if (!queryModels || typeof queryModels !== 'object') return '';
  const parts: string[] = [];

  for (const [scene, models] of Object.entries(queryModels as Record<string, unknown>)) {
    if (!Array.isArray(models)) continue;
    const selected = models.find((model: any) => model?.selected)?.key;
    if (selected) parts.push(`${scene}:${selected}`);
  }

  return parts.join(', ');
}

export async function probeLingmaIpc(opts: { pipe?: string } = {}): Promise<Record<string, unknown>[]> {
  const pipePath = resolveLingmaPipePath(opts.pipe);
  const client = await LingmaIpcClient.connect(pipePath);

  try {
    const init = await initializeLingmaIpc(client);
    const ping = await client.request('ping', {});
    const extension = await client.request<any>('extension/query', {});
    const models = await client.request<any>('config/queryModels', {});
    const current = await client.request<any>('session/getCurrent', {});
    const tasks = await client.request<any>('task/list', {});

    const taskCount =
      Array.isArray(tasks) ? tasks.length :
      Array.isArray(tasks?.tasks) ? tasks.tasks.length :
      countItems(tasks);
    const pingValue =
      ping && typeof ping === 'object' && 'success' in ping
        ? ((ping as { success?: boolean }).success ? 'OK' : JSON.stringify(ping))
        : ping == null
          ? 'OK'
          : String(ping);

    const currentSessionIds = Array.isArray(current?.currentSessionIds) ? current.currentSessionIds : [];
    const modelScenes = models && typeof models === 'object' ? Object.keys(models) : [];

    return [
      { Key: 'Pipe', Value: pipePath, Pipe: pipePath },
      {
        Key: 'Server',
        Value: `${init?.serverInfo?.name ?? 'unknown'} ${init?.serverInfo?.version ?? ''}`.trim(),
        Name: init?.serverInfo?.name ?? null,
        Version: init?.serverInfo?.version ?? null,
      },
      { Key: 'Ping', Value: pingValue, Result: ping ?? null },
      {
        Key: 'Commands',
        Value: String(countItems(extension?.commands)),
        Count: countItems(extension?.commands),
      },
      {
        Key: 'ContextProviders',
        Value: String(countItems(extension?.contextProviders)),
        Count: countItems(extension?.contextProviders),
      },
      {
        Key: 'ModelScenes',
        Value: modelScenes.join(', '),
        Scenes: modelScenes,
      },
      {
        Key: 'SelectedModels',
        Value: summarizeSelectedModels(models),
        Models: models,
      },
      {
        Key: 'CurrentSessions',
        Value: String(currentSessionIds.length),
        SessionIds: currentSessionIds,
      },
      {
        Key: 'Tasks',
        Value: String(taskCount),
        TaskCount: taskCount,
      },
    ];
  } catch (error) {
    throw error instanceof CommandExecutionError
      ? error
      : new CommandExecutionError(error instanceof Error ? error.message : String(error));
  } finally {
    await client.close();
  }
}
