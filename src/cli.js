import { resolve } from 'node:path';
import { scanner } from './scanner.js';
import { budgeter } from './budgeter.js';
import { gemini } from './gemini.js';
import { writer } from './writer.js';

const VERSION = '1.0.0';

const HELP = `
rule-gen v${VERSION}
Generate AI coding rules from your codebase using Google Gemini

Usage:
  rule-gen [path] [options]

Arguments:
  path                Project directory to scan (default: ".")

Options:
  --format <format>   Output format: cursor (default), claude-md, agents-md, copilot, windsurf
  --model <model>     Gemini model to use (default: gemini-2.5-flash-lite)
  --dry-run           Preview rules without writing files
  --verbose           Show which files are sent to Gemini
  --max-files <n>     Max source files to include (default: 50)
  --api-key <key>     Gemini API key (or set GEMINI_API_KEY env var)
  -v, --version       Show version
  -h, --help          Show help

Examples:
  npx rule-gen                          # Scan current directory, output .mdc files
  npx rule-gen ./my-project             # Scan specific directory
  npx rule-gen --format claude-md       # Output as CLAUDE.md
  npx rule-gen --dry-run --verbose      # Preview without writing
  npx rule-gen --model gemini-2.5-pro   # Use Gemini Pro for higher quality
`.trim();

function parseArgs(argv) {
  const opts = {
    path: '.',
    format: 'cursor',
    model: 'gemini-2.5-flash-lite',
    dryRun: false,
    verbose: false,
    maxFiles: 50,
    apiKey: process.env.GEMINI_API_KEY || '',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h': case '--help':
        console.log(HELP);
        process.exit(0);
      case '-v': case '--version':
        console.log(VERSION);
        process.exit(0);
      case '--format':
        opts.format = argv[++i];
        break;
      case '--model':
        opts.model = argv[++i];
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      case '--max-files':
        opts.maxFiles = parseInt(argv[++i], 10);
        break;
      case '--api-key':
        opts.apiKey = argv[++i];
        break;
      default:
        if (!arg.startsWith('-')) opts.path = arg;
        break;
    }
  }

  return opts;
}

export async function main(argv) {
  const opts = parseArgs(argv);
  const projectPath = resolve(opts.path);

  if (!opts.apiKey) {
    console.error('Error: No Gemini API key found.');
    console.error('Set GEMINI_API_KEY environment variable or use --api-key <key>');
    console.error('Get a free key at https://aistudio.google.com/apikey');
    process.exit(1);
  }

  // Phase 1: Scan
  console.log(`\nScanning ${projectPath}...`);
  const files = await scanner.scan(projectPath);
  console.log(`  Found ${files.length} files`);

  if (files.length === 0) {
    console.error('No source files found. Is this a code project?');
    process.exit(1);
  }

  // Phase 2: Budget
  const selected = budgeter.select(files, opts.maxFiles);
  console.log(`  Selected ${selected.length} files for analysis`);

  if (opts.verbose) {
    console.log('\n  Files sent to Gemini:');
    for (const f of selected) {
      console.log(`    ${f.relativePath} (${f.tokens} est. tokens)`);
    }
  }

  const totalTokens = selected.reduce((sum, f) => sum + f.tokens, 0);
  console.log(`  Estimated tokens: ~${totalTokens.toLocaleString()}`);

  // Phase 3: Generate
  console.log(`\nGenerating rules with ${opts.model}...`);
  const rules = await gemini.generate(selected, opts.model, opts.apiKey, projectPath);
  console.log(`  Generated ${rules.length} rules`);

  if (rules.length === 0) {
    console.error('Gemini did not generate any rules. Try a different model or add more source files.');
    process.exit(1);
  }

  // Phase 4: Write
  if (opts.dryRun) {
    console.log('\n--- DRY RUN (no files written) ---\n');
    for (const rule of rules) {
      console.log(`=== ${rule.filename} ===`);
      console.log(rule.content);
      console.log('');
    }
  } else {
    const written = await writer.write(rules, projectPath, opts.format);
    console.log(`\nWritten ${written.length} files:`);
    for (const f of written) {
      console.log(`  ✓ ${f}`);
    }
  }

  console.log('\nDone!');
}
