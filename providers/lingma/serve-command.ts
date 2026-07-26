import { cli, Strategy } from '@jackwener/opencli/registry';
import { startServe } from './serve.js';
import { lingmaRequiredEnv } from './shared.js';

cli({
  site: 'lingma',
  name: 'serve',
  access: 'write',
  description: 'Start an Anthropic-compatible API proxy backed by Lingma CDP',
  strategy: Strategy.LOCAL,
  browser: false,
  requiredEnv: lingmaRequiredEnv,
  args: [
    { name: 'port', type: 'int', default: 8083, help: 'Local proxy port' },
    {
      name: 'session-mode',
      type: 'str',
      default: 'auto',
      choices: ['auto', 'fresh', 'reuse'],
      help: 'Conversation reuse policy',
    },
  ],
  func: async (args) => startServe({
    port: Number(args.port) || 8083,
    sessionMode: args['session-mode'],
  }),
});
