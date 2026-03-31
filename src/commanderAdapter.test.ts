import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import type { CliCommand } from './registry.js';

const { mockExecuteCommand, mockRenderOutput } = vi.hoisted(() => ({
  mockExecuteCommand: vi.fn(),
  mockRenderOutput: vi.fn(),
}));

vi.mock('./execution.js', () => ({
  executeCommand: mockExecuteCommand,
}));

vi.mock('./output.js', () => ({
  render: mockRenderOutput,
}));

import { registerCommandToProgram } from './commanderAdapter.js';

describe('commanderAdapter arg passing', () => {
  const cmd: CliCommand = {
    site: 'paperreview',
    name: 'submit',
    description: 'Submit a PDF',
    browser: false,
    args: [
      { name: 'pdf', positional: true, required: true, help: 'Path to the paper PDF' },
      { name: 'dry-run', type: 'bool', default: false, help: 'Validate only' },
      { name: 'prepare-only', type: 'bool', default: false, help: 'Prepare only' },
    ],
    func: vi.fn(),
  };

  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue([]);
    mockRenderOutput.mockReset();
    delete process.env.OPENCLI_VERBOSE;
    process.exitCode = undefined;
  });

  it('passes bool flag values through to executeCommand for coercion', async () => {
    const program = new Command();
    const siteCmd = program.command('paperreview');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync(['node', 'opencli', 'paperreview', 'submit', './paper.pdf', '--dry-run', 'false']);

    expect(mockExecuteCommand).toHaveBeenCalled();
    const kwargs = mockExecuteCommand.mock.calls[0][1];
    expect(kwargs.pdf).toBe('./paper.pdf');
    expect(kwargs).toHaveProperty('dry-run');
  });

  it('passes valueless bool flags as true to executeCommand', async () => {
    const program = new Command();
    const siteCmd = program.command('paperreview');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync(['node', 'opencli', 'paperreview', 'submit', './paper.pdf', '--prepare-only']);

    expect(mockExecuteCommand).toHaveBeenCalled();
    const kwargs = mockExecuteCommand.mock.calls[0][1];
    expect(kwargs.pdf).toBe('./paper.pdf');
    expect(kwargs['prepare-only']).toBe(true);
  });

  it('rejects invalid bool values before calling executeCommand', async () => {
    const program = new Command();
    const siteCmd = program.command('paperreview');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync(['node', 'opencli', 'paperreview', 'submit', './paper.pdf', '--dry-run', 'maybe']);

    // normalizeArgValue validates bools eagerly; executeCommand should not be reached
    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });
});

describe('commanderAdapter boolean alias support', () => {
  const cmd: CliCommand = {
    site: 'reddit',
    name: 'save',
    description: 'Save a post',
    browser: false,
    args: [
      { name: 'post-id', positional: true, required: true, help: 'Post ID' },
      { name: 'undo', type: 'boolean', default: false, help: 'Unsave instead of save' },
    ],
    func: vi.fn(),
  };

  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue([]);
    mockRenderOutput.mockReset();
    delete process.env.OPENCLI_VERBOSE;
    process.exitCode = undefined;
  });

  it('coerces default false for boolean args to a real boolean', async () => {
    const program = new Command();
    const siteCmd = program.command('reddit');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync(['node', 'opencli', 'reddit', 'save', 't3_abc123']);

    expect(mockExecuteCommand).toHaveBeenCalled();
    const kwargs = mockExecuteCommand.mock.calls[0][1];
    expect(kwargs['post-id']).toBe('t3_abc123');
    expect(kwargs.undo).toBe(false);
  });

  it('coerces explicit false for boolean args to a real boolean', async () => {
    const program = new Command();
    const siteCmd = program.command('reddit');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync(['node', 'opencli', 'reddit', 'save', 't3_abc123', '--undo', 'false']);

    expect(mockExecuteCommand).toHaveBeenCalled();
    const kwargs = mockExecuteCommand.mock.calls[0][1];
    expect(kwargs.undo).toBe(false);
  });
});

describe('commanderAdapter command aliases', () => {
  const cmd: CliCommand = {
    site: 'notebooklm',
    name: 'get',
    aliases: ['metadata'],
    description: 'Get notebook metadata',
    browser: false,
    args: [],
    func: vi.fn(),
  };

  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockExecuteCommand.mockResolvedValue([]);
    mockRenderOutput.mockReset();
    delete process.env.OPENCLI_VERBOSE;
    process.exitCode = undefined;
  });

  it('registers aliases with Commander so compatibility names execute the same command', async () => {
    const program = new Command();
    const siteCmd = program.command('notebooklm');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync(['node', 'opencli', 'notebooklm', 'metadata']);

    expect(mockExecuteCommand).toHaveBeenCalledWith(cmd, {}, false);
  });
});

describe('registerCommandToProgram browser env overrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    process.exitCode = undefined;
  });

  it('applies command-level CDP overrides only while a browser command executes', async () => {
    const seen: Array<{ endpoint?: string; target?: string }> = [];
    mockExecuteCommand.mockImplementation(async () => {
      seen.push({
        endpoint: process.env.OPENCLI_CDP_ENDPOINT,
        target: process.env.OPENCLI_CDP_TARGET,
      });
      return [];
    });

    const cmd: CliCommand = {
      site: 'antigravity',
      name: 'status',
      description: 'status',
      browser: true,
      supportsBrowserCdp: false,
      args: [],
    };

    const program = new Command();
    const siteCmd = program.command('antigravity');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync([
      'node',
      'opencli',
      'antigravity',
      'status',
      '--cdp-endpoint',
      'http://127.0.0.1:9333',
      '--cdp-target',
      'launchpad',
    ]);

    expect(mockExecuteCommand).toHaveBeenCalledWith(cmd, {}, false);
    expect(seen).toEqual([
      {
        endpoint: 'http://127.0.0.1:9333',
        target: 'launchpad',
      },
    ]);
    expect(process.env.OPENCLI_CDP_ENDPOINT).toBeUndefined();
    expect(process.env.OPENCLI_CDP_TARGET).toBeUndefined();
  });

  it('enables browser-cdp auto mode only for supported browser commands', async () => {
    const seen: Array<{ endpoint?: string }> = [];
    mockExecuteCommand.mockImplementation(async () => {
      seen.push({ endpoint: process.env.OPENCLI_CDP_ENDPOINT });
      return [];
    });

    const cmd: CliCommand = {
      site: 'linux-do',
      name: 'categories',
      description: 'categories',
      browser: true,
      supportsBrowserCdp: true,
      args: [],
    };

    const program = new Command();
    const siteCmd = program.command('linux-do');
    registerCommandToProgram(siteCmd, cmd);

    await program.parseAsync([
      'node',
      'opencli',
      'linux-do',
      'categories',
      '--browser-cdp',
    ]);

    expect(seen).toEqual([{ endpoint: 'auto' }]);
    expect(process.env.OPENCLI_CDP_ENDPOINT).toBeUndefined();
  });

  it('does not register browser-cdp flags for desktop-style commands', async () => {
    const cmd: CliCommand = {
      site: 'cursor',
      name: 'ask',
      description: 'ask',
      browser: true,
      supportsBrowserCdp: false,
      args: [],
    };

    const program = new Command();
    program.exitOverride();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const siteCmd = program.command('cursor');
    registerCommandToProgram(siteCmd, cmd);

    await expect(program.parseAsync([
      'node',
      'opencli',
      'cursor',
      'ask',
      '--browser-cdp',
    ])).rejects.toThrow();

    errorSpy.mockRestore();
  });
});
