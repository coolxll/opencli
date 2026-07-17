import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { askLingmaIpc } from './ipc-ask.js';
import { probeLingmaIpc } from './ipc-probe.js';
import { startIpcServe } from './ipc-serve.js';

cli({
  site: 'lingma',
  name: 'ipc',
  access: 'write',
  description: 'Probe, call, or serve Lingma through its native IPC channel',
  strategy: Strategy.LOCAL,
  browser: false,
  args: [
    {
      name: 'operation',
      type: 'str',
      required: true,
      positional: true,
      choices: ['probe', 'ask', 'serve'],
      help: 'IPC operation',
    },
    { name: 'text', type: 'str', positional: true, help: 'Prompt text for the ask operation' },
    { name: 'pipe', type: 'str', help: 'Explicit Lingma named pipe path' },
    { name: 'session-id', type: 'str', help: 'Existing ACP session id' },
    { name: 'cwd', type: 'str', default: process.cwd(), help: 'Working directory for new sessions' },
    { name: 'current-file-path', type: 'str', help: 'Current file path sent through ACP meta' },
    { name: 'mode', type: 'str', default: 'agent', help: 'ACP mode metadata value' },
    { name: 'model', type: 'str', help: 'Lingma model id' },
    { name: 'timeout', type: 'int', help: 'Completion timeout in seconds (ask: 60, serve: 120)' },
    { name: 'port', type: 'int', default: 8084, help: 'Local proxy port for serve' },
    {
      name: 'session-mode',
      type: 'str',
      default: 'auto',
      choices: ['auto', 'fresh', 'reuse'],
      help: 'Conversation reuse policy for serve',
    },
  ],
  func: async (args) => {
    switch (args.operation) {
      case 'probe':
        return probeLingmaIpc({ pipe: args.pipe });
      case 'ask': {
        const text = String(args.text ?? '').trim();
        if (!text) throw new ArgumentError('lingma ipc ask requires prompt text');
        return askLingmaIpc({
          text,
          pipe: args.pipe,
          sessionId: args['session-id'],
          cwd: args.cwd,
          currentFilePath: args['current-file-path'],
          timeoutSeconds: Number(args.timeout) || 60,
          mode: args.mode,
          model: args.model,
        });
      }
      case 'serve':
        return startIpcServe({
          port: Number(args.port) || 8084,
          sessionMode: args['session-mode'],
          pipe: args.pipe,
          cwd: args.cwd,
          currentFilePath: args['current-file-path'],
          timeoutSeconds: Number(args.timeout) || 120,
          mode: args.mode,
        });
      default:
        throw new ArgumentError(`Unknown Lingma IPC operation: ${String(args.operation)}`);
    }
  },
});
