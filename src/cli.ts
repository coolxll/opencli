/**
 * CLI entry point: registers built-in commands and wires up Commander.
 *
 * Built-in commands are registered inline here (list, validate, explore, etc.).
 * Dynamic adapter commands are registered via commanderAdapter.ts.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { type CliCommand, fullName, getRegistry, strategyLabel } from './registry.js';
import { serializeCommand, formatArgSummary } from './serialization.js';
import { render as renderOutput } from './output.js';
import { getBrowserFactory, browserSession } from './runtime.js';
import { addBrowserEnvOverrideOptions, runWithBrowserEnvOptions } from './browserEnvOptions.js';
import { PKG_VERSION } from './version.js';
import { printCompletionScript } from './completion.js';
import { loadExternalClis, executeExternalCli, installExternalCli, registerExternalCli, isBinaryInstalled } from './external.js';
import { registerAllCommands } from './commanderAdapter.js';
import { CliError, EXIT_CODES, ERROR_ICONS, getErrorMessage } from './errors.js';

export function runCli(BUILTIN_CLIS: string, USER_CLIS: string): void {
  const program = new Command();
  // enablePositionalOptions: prevents parent from consuming flags meant for subcommands;
  // prerequisite for passThroughOptions to forward --help/--version to external binaries
  program
    .name('opencli')
    .description('Make any website your CLI. Zero setup. AI-powered.')
    .version(PKG_VERSION)
    .enablePositionalOptions();

  // ── Built-in: list ────────────────────────────────────────────────────────

  program
    .command('list')
    .description('List all available CLI commands')
    .option('-f, --format <fmt>', 'Output format: table, json, yaml, md, csv', 'table')
    .option('--json', 'JSON output (deprecated)')
    .action((opts) => {
      const registry = getRegistry();
      const commands = [...new Set(registry.values())].sort((a, b) => fullName(a).localeCompare(fullName(b)));
      const fmt = opts.json && opts.format === 'table' ? 'json' : opts.format;
      const isStructured = fmt === 'json' || fmt === 'yaml';

      if (fmt !== 'table') {
        const rows = isStructured
          ? commands.map(serializeCommand)
          : commands.map(c => ({
              command: fullName(c),
              site: c.site,
              name: c.name,
              aliases: c.aliases?.join(', ') ?? '',
              description: c.description,
              strategy: strategyLabel(c),
              browser: !!c.browser,
              args: formatArgSummary(c.args),
            }));
        renderOutput(rows, {
          fmt,
          columns: ['command', 'site', 'name', 'aliases', 'description', 'strategy', 'browser', 'args',
                     ...(isStructured ? ['columns', 'domain'] : [])],
          title: 'opencli/list',
          source: 'opencli list',
        });
        return;
      }

      // Table (default) — grouped by site
      const sites = new Map<string, CliCommand[]>();
      for (const cmd of commands) {
        const g = sites.get(cmd.site) ?? [];
        g.push(cmd);
        sites.set(cmd.site, g);
      }

      console.log();
      console.log(chalk.bold('  opencli') + chalk.dim(' — available commands'));
      console.log();
      for (const [site, cmds] of sites) {
        console.log(chalk.bold.cyan(`  ${site}`));
        for (const cmd of cmds) {
          const label = strategyLabel(cmd);
          const tag = label === 'public'
            ? chalk.green('[public]')
            : chalk.yellow(`[${label}]`);
          const aliases = cmd.aliases?.length ? chalk.dim(` (aliases: ${cmd.aliases.join(', ')})`) : '';
          console.log(`    ${cmd.name} ${tag}${aliases}${cmd.description ? chalk.dim(` — ${cmd.description}`) : ''}`);
        }
        console.log();
      }

      const externalClis = loadExternalClis();
      if (externalClis.length > 0) {
        console.log(chalk.bold.cyan('  external CLIs'));
        for (const ext of externalClis) {
          const isInstalled = isBinaryInstalled(ext.binary);
          const tag = isInstalled ? chalk.green('[installed]') : chalk.yellow('[auto-install]');
          console.log(`    ${ext.name} ${tag}${ext.description ? chalk.dim(` — ${ext.description}`) : ''}`);
        }
        console.log();
      }

      console.log(chalk.dim(`  ${commands.length} built-in commands across ${sites.size} sites, ${externalClis.length} external CLIs`));
      console.log();
    });

  // ── Built-in: validate / verify ───────────────────────────────────────────

  program
    .command('validate')
    .description('Validate CLI definitions')
    .argument('[target]', 'site or site/name')
    .action(async (target) => {
      const { validateClisWithTarget, renderValidationReport } = await import('./validate.js');
      console.log(renderValidationReport(validateClisWithTarget([BUILTIN_CLIS, USER_CLIS], target)));
    });

  program
    .command('verify')
    .description('Validate + smoke test')
    .argument('[target]')
    .option('--smoke', 'Run smoke tests', false)
    .action(async (target, opts) => {
      const { verifyClis, renderVerifyReport } = await import('./verify.js');
      const r = await verifyClis({ builtinClis: BUILTIN_CLIS, userClis: USER_CLIS, target, smoke: opts.smoke });
      console.log(renderVerifyReport(r));
      process.exitCode = r.ok ? EXIT_CODES.SUCCESS : EXIT_CODES.GENERIC_ERROR;
    });

  // ── Built-in: explore / synthesize / generate / cascade ───────────────────

  addBrowserEnvOverrideOptions(
    program
    .command('explore')
    .alias('probe')
    .description('Explore a website: discover APIs, stores, and recommend strategies')
    .argument('<url>')
    .option('--site <name>')
    .option('--goal <text>')
    .option('--wait <s>', '', '3')
    .option('--auto', 'Enable interactive fuzzing')
    .option('--click <labels>', 'Comma-separated labels to click before fuzzing'),
    { allowBrowserCdp: true },
  )
    .action(async (url, opts) => {
      await runWithBrowserEnvOptions(opts, async () => {
        const { exploreUrl, renderExploreSummary } = await import('./explore.js');
        const clickLabels = opts.click
          ? opts.click.split(',').map((s: string) => s.trim())
          : undefined;
        const workspace = `explore:${inferHost(url, opts.site)}`;
        const result = await exploreUrl(url, {
          BrowserFactory: getBrowserFactory(),
          site: opts.site,
          goal: opts.goal,
          waitSeconds: parseFloat(opts.wait),
          auto: opts.auto,
          clickLabels,
          workspace,
        });
        console.log(renderExploreSummary(result));
      }, { allowBrowserCdp: true });
    });

  program
    .command('synthesize')
    .description('Synthesize CLIs from explore')
    .argument('<target>')
    .option('--top <n>', '', '3')
    .action(async (target, opts) => {
      const { synthesizeFromExplore, renderSynthesizeSummary } = await import('./synthesize.js');
      console.log(renderSynthesizeSummary(synthesizeFromExplore(target, { top: parseInt(opts.top) })));
    });

  addBrowserEnvOverrideOptions(
    program
    .command('generate')
    .description('One-shot: explore → synthesize → register')
    .argument('<url>')
    .option('--goal <text>')
    .option('--site <name>'),
    { allowBrowserCdp: true },
  )
    .action(async (url, opts) => {
      await runWithBrowserEnvOptions(opts, async () => {
        const { generateCliFromUrl, renderGenerateSummary } = await import('./generate.js');
        const workspace = `generate:${inferHost(url, opts.site)}`;
        const r = await generateCliFromUrl({
          url,
          BrowserFactory: getBrowserFactory(),
          goal: opts.goal,
          site: opts.site,
          workspace,
        });
        console.log(renderGenerateSummary(r));
        process.exitCode = r.ok ? EXIT_CODES.SUCCESS : EXIT_CODES.GENERIC_ERROR;
      }, { allowBrowserCdp: true });
    });

  // ── Built-in: record ─────────────────────────────────────────────────────

  addBrowserEnvOverrideOptions(
    program
    .command('record')
    .description('Record API calls from a live browser session → generate YAML candidates')
    .argument('<url>', 'URL to open and record')
    .option('--site <name>', 'Site name (inferred from URL if omitted)')
    .option('--out <dir>', 'Output directory for candidates')
    .option('--poll <ms>', 'Poll interval in milliseconds', '2000')
    .option('--timeout <ms>', 'Auto-stop after N milliseconds (default: 60000)', '60000'),
    { allowBrowserCdp: true },
  )
    .action(async (url, opts) => {
      await runWithBrowserEnvOptions(opts, async () => {
        const { recordSession, renderRecordSummary } = await import('./record.js');
        const result = await recordSession({
          BrowserFactory: getBrowserFactory(),
          url,
          site: opts.site,
          outDir: opts.out,
          pollMs: parseInt(opts.poll, 10),
          timeoutMs: parseInt(opts.timeout, 10),
        });
        console.log(renderRecordSummary(result));
        process.exitCode = result.candidateCount > 0 ? EXIT_CODES.SUCCESS : EXIT_CODES.EMPTY_RESULT;
      }, { allowBrowserCdp: true });
    });

  addBrowserEnvOverrideOptions(
    program
    .command('cascade')
    .description('Strategy cascade: find simplest working strategy')
    .argument('<url>')
    .option('--site <name>'),
    { allowBrowserCdp: true },
  )
    .action(async (url, opts) => {
      await runWithBrowserEnvOptions(opts, async () => {
        const { cascadeProbe, renderCascadeResult } = await import('./cascade.js');
        const workspace = `cascade:${inferHost(url, opts.site)}`;
        const result = await browserSession(getBrowserFactory(), async (page) => {
          try {
            const siteUrl = new URL(url);
            await page.goto(`${siteUrl.protocol}//${siteUrl.host}`);
            await page.wait(2);
          } catch {}
          return cascadeProbe(page, url);
        }, { workspace });
        console.log(renderCascadeResult(result));
      }, { allowBrowserCdp: true });
    });

  // ── Built-in: doctor / completion ──────────────────────────────────────────

  program
    .command('doctor')
    .description('Diagnose opencli browser bridge connectivity')
    .option('--no-live', 'Skip live browser connectivity test')
    .option('--sessions', 'Show active automation sessions', false)
    .action(async (opts) => {
      const { runBrowserDoctor, renderBrowserDoctorReport } = await import('./doctor.js');
      const report = await runBrowserDoctor({ live: opts.live, sessions: opts.sessions, cliVersion: PKG_VERSION });
      console.log(renderBrowserDoctorReport(report));
    });

  program
    .command('completion')
    .description('Output shell completion script')
    .argument('<shell>', 'Shell type: bash, zsh, or fish')
    .action((shell) => {
      printCompletionScript(shell);
    });

  // ── Plugin management ──────────────────────────────────────────────────────

  const pluginCmd = program.command('plugin').description('Manage opencli plugins');

  pluginCmd
    .command('install')
    .description('Install a plugin from a git repository')
    .argument('<source>', 'Plugin source (e.g. github:user/repo)')
    .action(async (source: string) => {
      const { installPlugin } = await import('./plugin.js');
      const { discoverPlugins } = await import('./discovery.js');
      try {
        const result = installPlugin(source);
        await discoverPlugins();
        if (Array.isArray(result)) {
          if (result.length === 0) {
            console.log(chalk.yellow('No plugins were installed (all skipped or incompatible).'));
          } else {
            console.log(chalk.green(`\u2705 Installed ${result.length} plugin(s) from monorepo: ${result.join(', ')}`));
          }
        } else {
          console.log(chalk.green(`\u2705 Plugin "${result}" installed successfully. Commands are ready to use.`));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${getErrorMessage(err)}`));
        process.exitCode = EXIT_CODES.GENERIC_ERROR;
      }
    });

  pluginCmd
    .command('uninstall')
    .description('Uninstall a plugin')
    .argument('<name>', 'Plugin name')
    .action(async (name: string) => {
      const { uninstallPlugin } = await import('./plugin.js');
      try {
        uninstallPlugin(name);
        console.log(chalk.green(`✅ Plugin "${name}" uninstalled.`));
      } catch (err) {
        console.error(chalk.red(`Error: ${getErrorMessage(err)}`));
        process.exitCode = EXIT_CODES.GENERIC_ERROR;
      }
    });

  pluginCmd
    .command('update')
    .description('Update a plugin (or all plugins) to the latest version')
    .argument('[name]', 'Plugin name (required unless --all is passed)')
    .option('--all', 'Update all installed plugins')
    .action(async (name: string | undefined, opts: { all?: boolean }) => {
      if (!name && !opts.all) {
        console.error(chalk.red('Error: Please specify a plugin name or use the --all flag.'));
        process.exitCode = EXIT_CODES.USAGE_ERROR;
        return;
      }
      if (name && opts.all) {
        console.error(chalk.red('Error: Cannot specify both a plugin name and --all.'));
        process.exitCode = EXIT_CODES.USAGE_ERROR;
        return;
      }

      const { updatePlugin, updateAllPlugins } = await import('./plugin.js');
      const { discoverPlugins } = await import('./discovery.js');
      if (opts.all) {
        const results = updateAllPlugins();
        if (results.length > 0) {
          await discoverPlugins();
        }

        let hasErrors = false;
        console.log(chalk.bold('  Update Results:'));
        for (const result of results) {
          if (result.success) {
            console.log(`  ${chalk.green('✓')} ${result.name}`);
            continue;
          }
          hasErrors = true;
          console.log(`  ${chalk.red('✗')} ${result.name} — ${chalk.dim(result.error)}`);
        }

        if (results.length === 0) {
          console.log(chalk.dim('  No plugins installed.'));
          return;
        }

        console.log();
        if (hasErrors) {
          console.error(chalk.red('Completed with some errors.'));
          process.exitCode = EXIT_CODES.GENERIC_ERROR;
        } else {
          console.log(chalk.green('✅ All plugins updated successfully.'));
        }
        return;
      }

      try {
        updatePlugin(name!);
        await discoverPlugins();
        console.log(chalk.green(`✅ Plugin "${name}" updated successfully.`));
      } catch (err) {
        console.error(chalk.red(`Error: ${getErrorMessage(err)}`));
        process.exitCode = EXIT_CODES.GENERIC_ERROR;
      }
    });


  pluginCmd
    .command('list')
    .description('List installed plugins')
    .option('-f, --format <fmt>', 'Output format: table, json', 'table')
    .action(async (opts) => {
      const { listPlugins } = await import('./plugin.js');
      const plugins = listPlugins();
      if (plugins.length === 0) {
        console.log(chalk.dim('  No plugins installed.'));
        console.log(chalk.dim(`  Install one with: opencli plugin install github:user/repo`));
        return;
      }
      if (opts.format === 'json') {
        renderOutput(plugins, {
          fmt: 'json',
          columns: ['name', 'commands', 'source'],
          title: 'opencli/plugins',
          source: 'opencli plugin list',
        });
        return;
      }
      console.log();
      console.log(chalk.bold('  Installed plugins'));
      console.log();

      // Group by monorepo
      const standalone = plugins.filter((p) => !p.monorepoName);
      const monoGroups = new Map<string, typeof plugins>();
      for (const p of plugins) {
        if (!p.monorepoName) continue;
        const g = monoGroups.get(p.monorepoName) ?? [];
        g.push(p);
        monoGroups.set(p.monorepoName, g);
      }

      for (const p of standalone) {
        const version = p.version ? chalk.green(` @${p.version}`) : '';
        const desc = p.description ? chalk.dim(` — ${p.description}`) : '';
        const cmds = p.commands.length > 0 ? chalk.dim(` (${p.commands.join(', ')})`) : '';
        const src = p.source ? chalk.dim(` ← ${p.source}`) : '';
        console.log(`  ${chalk.cyan(p.name)}${version}${desc}${cmds}${src}`);
      }

      for (const [mono, group] of monoGroups) {
        console.log();
        console.log(chalk.bold.magenta(`  📦 ${mono}`) + chalk.dim(' (monorepo)'));
        for (const p of group) {
          const version = p.version ? chalk.green(` @${p.version}`) : '';
          const desc = p.description ? chalk.dim(` — ${p.description}`) : '';
          const cmds = p.commands.length > 0 ? chalk.dim(` (${p.commands.join(', ')})`) : '';
          console.log(`    ${chalk.cyan(p.name)}${version}${desc}${cmds}`);
        }
      }

      console.log();
      console.log(chalk.dim(`  ${plugins.length} plugin(s) installed`));
      console.log();
    });

  pluginCmd
    .command('create')
    .description('Create a new plugin scaffold')
    .argument('<name>', 'Plugin name (lowercase, hyphens allowed)')
    .option('-d, --dir <path>', 'Output directory (default: ./<name>)')
    .option('--description <text>', 'Plugin description')
    .action(async (name: string, opts: { dir?: string; description?: string }) => {
      const { createPluginScaffold } = await import('./plugin-scaffold.js');
      try {
        const result = createPluginScaffold(name, {
          dir: opts.dir,
          description: opts.description,
        });
        console.log(chalk.green(`✅ Plugin scaffold created at ${result.dir}`));
        console.log();
        console.log(chalk.bold('  Files created:'));
        for (const f of result.files) {
          console.log(`    ${chalk.cyan(f)}`);
        }
        console.log();
        console.log(chalk.dim('  Next steps:'));
        console.log(chalk.dim(`    cd ${result.dir}`));
        console.log(chalk.dim(`    opencli plugin install file://${result.dir}`));
        console.log(chalk.dim(`    opencli ${name} hello`));
      } catch (err) {
        console.error(chalk.red(`Error: ${getErrorMessage(err)}`));
        process.exitCode = EXIT_CODES.GENERIC_ERROR;
      }
    });

  // ── External CLIs ─────────────────────────────────────────────────────────

  const externalClis = loadExternalClis();

  program
    .command('install')
    .description('Install an external CLI')
    .argument('<name>', 'Name of the external CLI')
    .action((name: string) => {
      const ext = externalClis.find(e => e.name === name);
      if (!ext) {
        console.error(chalk.red(`External CLI '${name}' not found in registry.`));
        process.exitCode = EXIT_CODES.USAGE_ERROR;
        return;
      }
      installExternalCli(ext);
    });

  program
    .command('register')
    .description('Register an external CLI')
    .argument('<name>', 'Name of the CLI')
    .option('--binary <bin>', 'Binary name if different from name')
    .option('--install <cmd>', 'Auto-install command')
    .option('--desc <text>', 'Description')
    .action((name, opts) => {
      registerExternalCli(name, { binary: opts.binary, install: opts.install, description: opts.desc });
    });

  function passthroughExternal(name: string, parsedArgs?: string[]) {
    const args = parsedArgs ?? (() => {
      const idx = process.argv.indexOf(name);
      return process.argv.slice(idx + 1);
    })();
    try {
      executeExternalCli(name, args, externalClis);
    } catch (err) {
      console.error(chalk.red(`Error: ${getErrorMessage(err)}`));
      process.exitCode = EXIT_CODES.GENERIC_ERROR;
    }
  }

  for (const ext of externalClis) {
    if (program.commands.some(c => c.name() === ext.name)) continue;
    program
      .command(ext.name)
      .description(`(External) ${ext.description || ext.name}`)
      .argument('[args...]')
      .allowUnknownOption()
      .passThroughOptions()
      .helpOption(false)
      .action((args: string[]) => passthroughExternal(ext.name, args));
  }

  // ── Antigravity serve (long-running, special case) ────────────────────────

  const antigravityCmd = program.command('antigravity').description('antigravity commands');
  addBrowserEnvOverrideOptions(
    antigravityCmd
    .command('serve')
    .description('Start Anthropic-compatible API proxy for Antigravity')
    .option('--port <port>', 'Server port (default: 8082)', '8082'),
  )
    .action(async (opts) => {
      await runWithBrowserEnvOptions(opts, async () => {
        const { startServe } = await import('./clis/antigravity/serve.js');
        await startServe({ port: parseInt(opts.port) });
      });
    });

  const lingmaCmd = program.command('lingma').description('lingma commands');
  addBrowserEnvOverrideOptions(
    lingmaCmd
    .command('serve')
    .description('Start Anthropic-compatible API proxy for Lingma')
    .option('--port <port>', 'Server port (default: 8083)', '8083')
    .option('--session-mode <mode>', 'Session handling mode: auto, fresh, reuse', 'auto'),
    { allowBrowserCdp: true },
  )
    .action(async (opts) => {
      await runWithBrowserEnvOptions(opts, async () => {
        const { startServe } = await import('./clis/lingma/serve.js');
        await startServe({
          port: parseInt(opts.port),
          sessionMode: opts.sessionMode,
        });
      }, { allowBrowserCdp: true });
    });

  const lingmaIpcCmd = lingmaCmd.command('ipc').description('Lingma native IPC commands');

  lingmaIpcCmd
    .command('probe')
    .description('Probe Lingma named-pipe IPC and summarize live capabilities')
    .option('--pipe <path>', 'Explicit Lingma named pipe path (for example: \\\\.\\pipe\\lingma-xxxx)')
    .option('-f, --format <fmt>', 'Output format: table, json, yaml, md, csv', 'table')
    .option('-v, --verbose', 'Debug output', false)
    .action(async (opts) => {
      await runManualRenderedCommand(async () => {
        const { probeLingmaIpc } = await import('./clis/lingma/ipc-probe.js');
        const result = await probeLingmaIpc({ pipe: opts.pipe });
        renderOutput(result, {
          fmt: opts.format,
          columns: ['Key', 'Value'],
          title: 'lingma/ipc-probe',
          source: 'opencli lingma ipc probe',
        });
      }, opts.verbose === true);
    });

  lingmaIpcCmd
    .command('ask')
    .description('Send a prompt through Lingma native IPC and wait for the streamed response')
    .argument('<text>', 'Prompt text to send')
    .option('--pipe <path>', 'Explicit Lingma named pipe path (for example: \\\\.\\pipe\\lingma-xxxx)')
    .option('--session-id <id>', 'Reuse an existing Lingma ACP session id instead of creating a new one')
    .option('--cwd <path>', 'Working directory used when creating a new IPC session', process.cwd())
    .option('--current-file-path <path>', 'Current file path sent through ACP meta')
    .option('--mode <mode>', 'ACP mode meta value (default: agent)', 'agent')
    .option('--model <id>', 'Model id passed to session/set_model before prompting')
    .option('--timeout <seconds>', 'Max seconds to wait for completion (default: 60)', '60')
    .option('-f, --format <fmt>', 'Output format: table, json, yaml, md, csv', 'table')
    .option('-v, --verbose', 'Debug output', false)
    .action(async (text, opts) => {
      await runManualRenderedCommand(async () => {
        const { askLingmaIpc } = await import('./clis/lingma/ipc-ask.js');
        const result = await askLingmaIpc({
          text,
          pipe: opts.pipe,
          sessionId: opts.sessionId,
          cwd: opts.cwd,
          currentFilePath: opts.currentFilePath,
          timeoutSeconds: parseInt(opts.timeout, 10) || 60,
          mode: opts.mode,
          model: opts.model,
        });
        renderOutput(result, {
          fmt: opts.format,
          columns: ['Role', 'Type', 'Text'],
          title: 'lingma/ipc-ask',
          source: 'opencli lingma ipc ask',
        });
      }, opts.verbose === true);
    });

  lingmaIpcCmd
    .command('serve')
    .description('Start Anthropic-compatible API proxy for Lingma over native IPC')
    .option('--port <port>', 'Server port (default: 8084)', '8084')
    .option('--session-mode <mode>', 'Session handling mode: auto, fresh, reuse', 'auto')
    .option('--pipe <path>', 'Explicit Lingma named pipe path (for example: \\\\.\\pipe\\lingma-xxxx)')
    .option('--cwd <path>', 'Working directory used when creating new IPC sessions', process.cwd())
    .option('--current-file-path <path>', 'Current file path sent through ACP meta')
    .option('--mode <mode>', 'ACP mode meta value (default: agent)', 'agent')
    .option('--timeout <seconds>', 'Max seconds to wait for each completion (default: 120)', '120')
    .option('-v, --verbose', 'Debug output', false)
    .action(async (opts) => {
      await runManualRenderedCommand(async () => {
        const { startIpcServe } = await import('./clis/lingma/ipc-serve.js');
        await startIpcServe({
          port: parseInt(opts.port, 10) || 8084,
          sessionMode: opts.sessionMode,
          pipe: opts.pipe,
          cwd: opts.cwd,
          currentFilePath: opts.currentFilePath,
          timeoutSeconds: parseInt(opts.timeout, 10) || 120,
          mode: opts.mode,
        });
      }, opts.verbose === true);
    });

  // ── Dynamic adapter commands ──────────────────────────────────────────────

  const siteGroups = new Map<string, Command>();
  siteGroups.set('antigravity', antigravityCmd);
  siteGroups.set('lingma', lingmaCmd);
  registerAllCommands(program, siteGroups);

  // ── Unknown command fallback ──────────────────────────────────────────────
  // Security: do NOT auto-discover and register arbitrary system binaries.
  // Only explicitly registered external CLIs (via `opencli register`) are allowed.

  program.on('command:*', (operands: string[]) => {
    const binary = operands[0];
    console.error(chalk.red(`error: unknown command '${binary}'`));
    if (isBinaryInstalled(binary)) {
      console.error(chalk.dim(`  Tip: '${binary}' exists on your PATH. Use 'opencli register ${binary}' to add it as an external CLI.`));
    }
    program.outputHelp();
    process.exitCode = EXIT_CODES.USAGE_ERROR;
  });

  program.parse();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function runManualRenderedCommand(
  fn: () => Promise<void>,
  verbose: boolean = false,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof CliError) {
      const icon = ERROR_ICONS[err.code] ?? '⚠️';
      console.error(chalk.red(`${icon} ${err.message}`));
      if (err.hint) console.error(chalk.yellow(`→ ${err.hint}`));
      process.exitCode = 1;
      return;
    }

    if (verbose && err instanceof Error && err.stack) {
      console.error(chalk.red(err.stack));
      process.exitCode = 1;
      return;
    }

    console.error(chalk.red(`Error: ${getErrorMessage(err)}`));
    process.exitCode = 1;
  }
}

/** Infer a workspace-friendly hostname from a URL, with site override. */
function inferHost(url: string, site?: string): string {
  if (site) return site;
  try { return new URL(url).host; } catch { return 'default'; }
}
