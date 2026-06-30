import type { RequiredEnv } from '../../registry.js';

export const lingmaRequiredEnv: RequiredEnv[] = [
  {
    name: 'OPENCLI_CDP_ENDPOINT',
    help: 'Connect Lingma via CDP, for example: OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9344 opencli lingma status. If multiple windows are exposed, also set OPENCLI_CDP_TARGET=Lingma or pass --cdp-target.',
  },
];
