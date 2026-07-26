import { describe, expect, it } from 'vitest';
import { getRegistry, Strategy } from '@jackwener/opencli/registry';
import './ask.js';
import './dump.js';
import './ipc.js';
import './model.js';
import './new.js';
import './probe-network.js';
import './read.js';
import './screenshot.js';
import './send.js';
import './serve-command.js';
import './status.js';

describe('lingma provider registration', () => {
  it('registers all commands through the public plugin registry', () => {
    const expected = [
      'ask', 'dump', 'ipc', 'model', 'new', 'probe-network',
      'read', 'screenshot', 'send', 'serve', 'status',
    ];
    for (const name of expected) {
      expect(getRegistry().get(`lingma/${name}`), name).toBeDefined();
    }
  });

  it('keeps local transport commands browser-free', () => {
    for (const name of ['ipc', 'serve']) {
      const command = getRegistry().get(`lingma/${name}`)!;
      expect(command.strategy).toBe(Strategy.LOCAL);
      expect(command.browser).toBe(false);
    }
  });
});
