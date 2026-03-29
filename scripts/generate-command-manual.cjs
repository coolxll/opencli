#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'dist', 'cli-manifest.json');
const DEFAULT_OUTPUT = path.join(ROOT, 'docs', 'generated', 'opencli-command-manual.md');

const DESKTOP_SITES = new Set([
  'antigravity',
  'chatgpt',
  'chatwise',
  'codex',
  'cursor',
  'discord-app',
  'doubao-app',
  'lingma',
  'notion',
]);

const SKIP_SITES = new Set(['_shared']);

function printHelp() {
  console.log(`Usage: node scripts/generate-command-manual.cjs [options]

Options:
  --manifest <path>   Manifest file to read (default: dist/cli-manifest.json)
  --out <path>        Output markdown path (default: docs/generated/opencli-command-manual.md)
  --stdout            Print markdown to stdout instead of writing a file
  --help              Show this help

Examples:
  node scripts/generate-command-manual.cjs
  node scripts/generate-command-manual.cjs --stdout
  node scripts/generate-command-manual.cjs --out "C:\\Users\\coolx\\.agents\\skills\\opencli\\references\\commands.md"
`);
}

function parseArgs(argv) {
  const opts = {
    manifest: DEFAULT_MANIFEST,
    out: DEFAULT_OUTPUT,
    stdout: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--stdout') {
      opts.stdout = true;
      continue;
    }
    if (arg === '--manifest') {
      opts.manifest = argv[++i];
      continue;
    }
    if (arg === '--out') {
      opts.out = argv[++i];
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return opts;
}

function typeLabel(arg) {
  return arg.type || 'str';
}

function cleanHelp(text) {
  if (!text) return '';
  return String(text).replace(/\s+/g, ' ').trim();
}

function modeLabel(entry) {
  if (!entry.browser) return 'Public/Local';
  if (DESKTOP_SITES.has(entry.site)) return 'Desktop';
  return 'Browser';
}

function usageArg(arg) {
  if (arg.positional) {
    return arg.required ? `<${arg.name}>` : `[${arg.name}]`;
  }
  if (arg.type === 'bool') {
    return arg.required ? `--${arg.name}` : `[--${arg.name}]`;
  }
  const value = `<${arg.name}>`;
  return arg.required ? `--${arg.name} ${value}` : `[--${arg.name} ${value}]`;
}

function renderManual(manifest) {
  const bySite = new Map();

  for (const entry of manifest) {
    if (SKIP_SITES.has(entry.site)) continue;
    if (!bySite.has(entry.site)) bySite.set(entry.site, []);
    bySite.get(entry.site).push(entry);
  }

  const sites = [...bySite.keys()].sort((a, b) => a.localeCompare(b));
  const lines = [];

  lines.push('# opencli Complete Command Manual');
  lines.push('');
  lines.push('This manual is generated from `dist/cli-manifest.json` in the current repository state.');
  lines.push('');
  lines.push('It is intended to be the static reference manual for:');
  lines.push('- command discovery');
  lines.push('- usage lookup');
  lines.push('- parameter lookup');
  lines.push('');
  lines.push('For the live installed registry, still verify with:');
  lines.push('');
  lines.push('```bash');
  lines.push('opencli list');
  lines.push('opencli list -f yaml');
  lines.push('```');
  lines.push('');
  lines.push('## Global commands');
  lines.push('');
  lines.push('```bash');
  lines.push('opencli list');
  lines.push('opencli validate [target]');
  lines.push('opencli verify [target] [--smoke]');
  lines.push('opencli explore <url> [--site <name>] [--goal <text>]');
  lines.push('opencli synthesize <target> [--top <n>]');
  lines.push('opencli generate <url> [--site <name>] [--goal <text>]');
  lines.push('opencli record <url> [--site <name>] [--out <dir>]');
  lines.push('opencli cascade <url> [--site <name>]');
  lines.push('opencli doctor [--no-live] [--sessions]');
  lines.push('opencli completion <bash|zsh|fish>');
  lines.push('opencli plugin install <source>');
  lines.push('opencli plugin uninstall <name>');
  lines.push('opencli plugin update [name] [--all]');
  lines.push('```');
  lines.push('');
  lines.push('## Common rules');
  lines.push('');
  lines.push('- All commands support `-f table|json|yaml|md|csv` and `-v`.');
  lines.push('- Many search/read commands use positional arguments instead of `--query` / `--keyword`.');
  lines.push('- For browser commands, Chrome login state and Browser Bridge availability matter.');
  lines.push('- Use `opencli <site> <command> --help` when you need the exact Commander rendering.');
  lines.push('');
  lines.push('## Complete built-in commands');
  lines.push('');

  for (const site of sites) {
    const entries = bySite.get(site).slice().sort((a, b) => a.name.localeCompare(b.name));
    lines.push(`## ${site}`);
    lines.push('');
    lines.push(`Commands: ${entries.map(entry => `\`${entry.name}\``).join(' ')}`);
    lines.push('');

    for (const entry of entries) {
      const args = entry.args || [];
      const usage = ['opencli', entry.site, entry.name, ...args.map(usageArg)]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      lines.push(`### \`${entry.name}\``);
      lines.push('');
      if (entry.description) lines.push(`- Description: ${entry.description}`);
      lines.push(`- Mode: ${modeLabel(entry)}`);
      lines.push(`- Strategy: \`${entry.strategy}\``);
      lines.push(`- Usage: \`${usage}\``);

      if (args.length === 0) {
        lines.push('- Parameters: none');
      } else {
        lines.push('- Parameters:');
        for (const arg of args) {
          const flag = arg.positional ? `<${arg.name}>` : `--${arg.name}`;
          const kind = arg.positional ? 'positional' : 'option';
          const required = arg.required ? 'required' : 'optional';
          const type = typeLabel(arg);
          const defaultText = Object.prototype.hasOwnProperty.call(arg, 'default')
            ? `, default=${JSON.stringify(arg.default)}`
            : '';
          const choicesText = Array.isArray(arg.choices) && arg.choices.length > 0
            ? `, choices=${arg.choices.join('|')}`
            : '';
          const helpText = cleanHelp(arg.help);
          const helpSuffix = helpText ? `, ${helpText}` : '';
          lines.push(`  - \`${flag}\`: ${kind}, ${required}, type=${type}${defaultText}${choicesText}${helpSuffix}`);
        }
      }

      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(opts.manifest)) {
    throw new Error(`Manifest not found: ${opts.manifest}\nRun \`npm run build\` or \`npm run build-manifest\` first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(opts.manifest, 'utf8'));
  const markdown = renderManual(manifest);

  if (opts.stdout) {
    process.stdout.write(markdown);
    return;
  }

  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, markdown, 'utf8');
  console.log(`Wrote command manual to ${opts.out}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
