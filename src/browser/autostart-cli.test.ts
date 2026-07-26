import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { createProgram } from '../cli.js';
import { loadBrowserAutostartState } from './autostart.js';

describe('browser autostart CLI', () => {
  let configDir: string;

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-browser-autostart-cli-'));
    vi.stubEnv('OPENCLI_CONFIG_DIR', configDir);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(configDir, { recursive: true, force: true });
  });

  it('passes browser flags through after the executable', async () => {
    const program = createProgram('', '');
    await program.parseAsync([
      'node',
      'opencli',
      'browser',
      'autostart',
      'set',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      '--',
      '--user-data-dir=C:\\Workspace\\chrome-debug',
      '--remote-debugging-port=9222',
    ]);

    expect(loadBrowserAutostartState().config).toEqual({
      version: 1,
      enabled: true,
      executable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--user-data-dir=C:\\Workspace\\chrome-debug',
        '--remote-debugging-port=9222',
      ],
      probeUrl: 'http://127.0.0.1:9222/json/version',
    });
  });
});
