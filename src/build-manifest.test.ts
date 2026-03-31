import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cli, getRegistry, Strategy } from './registry.js';
import { loadTsManifestEntries, shouldReplaceManifestEntry } from './build-manifest.js';

describe('manifest helper rules', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('prefers TS adapters over duplicate YAML adapters', () => {
    expect(shouldReplaceManifestEntry(
      {
        site: 'demo',
        name: 'search',
        description: 'yaml',
        strategy: 'public',
        browser: false,
        args: [],
        type: 'yaml',
      },
      {
        site: 'demo',
        name: 'search',
        description: 'ts',
        strategy: 'public',
        browser: false,
        args: [],
        type: 'ts',
        modulePath: 'demo/search.js',
      },
    )).toBe(true);

    expect(shouldReplaceManifestEntry(
      {
        site: 'demo',
        name: 'search',
        description: 'ts',
        strategy: 'public',
        browser: false,
        args: [],
        type: 'ts',
        modulePath: 'demo/search.js',
      },
      {
        site: 'demo',
        name: 'search',
        description: 'yaml',
        strategy: 'public',
        browser: false,
        args: [],
        type: 'yaml',
      },
    )).toBe(false);
  });

  it('skips TS files that do not register a cli', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-manifest-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'utils.ts');
    fs.writeFileSync(file, `export function helper() { return 'noop'; }`);

    return expect(loadTsManifestEntries(file, 'demo', async () => ({}))).resolves.toEqual([]);
  });

  it('builds TS manifest entries from exported runtime commands', async () => {
    const site = `manifest-hydrate-${Date.now()}`;
    const key = `${site}/dynamic`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-manifest-'));
    tempDirs.push(dir);
    const file = path.join(dir, `${site}.ts`);
    fs.writeFileSync(file, `export const command = cli({ site: '${site}', name: 'dynamic' });`);

    const entries = await loadTsManifestEntries(file, site, async () => ({
      command: cli({
        site,
        name: 'dynamic',
        description: 'dynamic command',
        strategy: Strategy.PUBLIC,
        browser: false,
        aliases: ['metadata'],
        args: [
          {
            name: 'model',
            required: true,
            positional: true,
            help: 'Choose a model',
            choices: ['auto', 'thinking'],
            default: '30',
          },
        ],
        domain: 'localhost',
        navigateBefore: 'https://example.com/session',
        deprecated: 'legacy command',
        replacedBy: 'opencli demo new',
      }),
    }));

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      site,
      name: 'dynamic',
      description: 'dynamic command',
      domain: 'localhost',
      strategy: 'public',
      browser: false,
      aliases: ['metadata'],
      args: [
        {
          name: 'model',
          type: 'str',
          required: true,
          positional: true,
          help: 'Choose a model',
          choices: ['auto', 'thinking'],
          default: '30',
        },
      ],
      type: 'ts',
      modulePath: `${site}/${site}.js`,
      navigateBefore: 'https://example.com/session',
      deprecated: 'legacy command',
      replacedBy: 'opencli demo new',
      supportsBrowserCdp: false,
    });

    getRegistry().delete(key);
  });

  it('keeps literal domain and navigateBefore for TS adapters', async () => {
    const file = path.join(process.cwd(), 'src', 'clis', 'xueqiu', 'fund-holdings.ts');
    const entries = await loadTsManifestEntries(file, 'xueqiu');

    expect(entries[0]).toMatchObject({
      site: 'xueqiu',
      name: 'fund-holdings',
      domain: 'danjuanfunds.com',
      navigateBefore: 'https://danjuanfunds.com/my-money',
      type: 'ts',
      modulePath: 'xueqiu/fund-holdings.js',
    });
  });

  it('falls back to registry delta for side-effect-only cli modules', async () => {
    const site = `manifest-side-effect-${Date.now()}`;
    const key = `${site}/legacy`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-manifest-'));
    tempDirs.push(dir);
    const file = path.join(dir, `${site}.ts`);
    fs.writeFileSync(file, `cli({ site: '${site}', name: 'legacy' });`);

    const entries = await loadTsManifestEntries(file, site, async () => {
      cli({
        site,
        name: 'legacy',
        description: 'legacy command',
        deprecated: 'legacy is deprecated',
        replacedBy: 'opencli demo new',
      });
      return {};
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      site,
      name: 'legacy',
      description: 'legacy command',
      strategy: 'cookie',
      browser: true,
      args: [],
      type: 'ts',
      modulePath: `${site}/${site}.js`,
      deprecated: 'legacy is deprecated',
      replacedBy: 'opencli demo new',
      supportsBrowserCdp: true,
    });

    getRegistry().delete(key);
  });

  it('preserves supportsBrowserCdp for desktop-style TS adapters', async () => {
    const site = `manifest-ui-${Date.now()}`;
    const key = `${site}/ask`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-manifest-'));
    tempDirs.push(dir);
    const file = path.join(dir, `${site}.ts`);
    fs.writeFileSync(file, `cli({ site: '${site}', name: 'ask' });`);

    const entries = await loadTsManifestEntries(file, site, async () => ({
      command: cli({
        site,
        name: 'ask',
        description: 'ask',
        domain: 'doubao-app',
        strategy: Strategy.UI,
        browser: true,
      }),
    }));

    expect(entries[0]).toEqual(expect.objectContaining({
      site,
      name: 'ask',
      supportsBrowserCdp: false,
    }));

    getRegistry().delete(key);
  });

  it('keeps every command a module exports instead of guessing by site', async () => {
    const site = `manifest-multi-${Date.now()}`;
    const screenKey = `${site}/screen`;
    const statusKey = `${site}/status`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-manifest-'));
    tempDirs.push(dir);
    const file = path.join(dir, `${site}.ts`);
    fs.writeFileSync(file, `export const screen = cli({ site: '${site}', name: 'screen' });`);

    const entries = await loadTsManifestEntries(file, site, async () => ({
      screen: cli({
        site,
        name: 'screen',
        description: 'capture screen',
      }),
      status: cli({
        site,
        name: 'status',
        description: 'show status',
      }),
    }));

    expect(entries.map(entry => entry.name)).toEqual(['screen', 'status']);

    getRegistry().delete(screenKey);
    getRegistry().delete(statusKey);
  });
});
