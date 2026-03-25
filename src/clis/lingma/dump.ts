import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { lingmaRequiredEnv } from './shared.js';

export const dumpCommand = cli({
  site: 'lingma',
  name: 'dump',
  description: 'Dump the DOM and Accessibility tree of Lingma for reverse-engineering',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [],
  columns: ['action', 'files'],
  func: async (page: IPage) => {
    const domPath = path.join(os.tmpdir(), 'lingma-dom.html');
    const snapshotPath = path.join(os.tmpdir(), 'lingma-snapshot.json');
    const dom = await page.evaluate('document.body.innerHTML');
    fs.writeFileSync(domPath, dom);

    const snap = await page.snapshot({ interactive: false });
    fs.writeFileSync(snapshotPath, JSON.stringify(snap, null, 2));

    return [
      {
        action: 'Dom extraction finished',
        files: `${domPath}, ${snapshotPath}`,
      },
    ];
  },
});
