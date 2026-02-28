# rule-gen

[![npm version](https://img.shields.io/npm/v/rulegen-ai)](https://www.npmjs.com/package/rulegen-ai) [![npm downloads](https://img.shields.io/npm/dw/rulegen-ai)](https://www.npmjs.com/package/rulegen-ai) [![license](https://img.shields.io/npm/l/rulegen-ai)](https://github.com/nedcodes-ok/rule-gen/blob/main/LICENSE) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](https://github.com/nedcodes-ok/rule-gen/blob/main/CONTRIBUTING.md)

Generate AI coding rules from your codebase, powered by Google Gemini.

Most rule generators read your `package.json` and spit out generic templates. rule-gen feeds your **actual source code** into Gemini's 1M token context window and generates rules based on patterns it finds in *your* codebase.

## Quick Start

```bash
export GEMINI_API_KEY=your-key-here
npx rulegen-ai
```

Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## What It Does

```
$ npx rulegen-ai ./my-express-api

Scanning ./my-express-api...
  Found 47 files
  Selected 32 files for analysis
  Estimated tokens: ~89,200

Generating rules with gemini-2.5-flash-lite...
  API usage: 91,043 input, 2,180 output tokens
  Generated 7 rules

Written 7 files:
  ✓ .cursor/rules/zod-validation-before-handlers.mdc
  ✓ .cursor/rules/prisma-singleton-import.mdc
  ✓ .cursor/rules/consistent-error-response-shape.mdc
  ✓ .cursor/rules/route-file-structure.mdc
  ✓ .cursor/rules/barrel-exports-from-src.mdc
  ✓ .cursor/rules/test-naming-convention.mdc
  ✓ .cursor/rules/middleware-ordering.mdc
```

These aren't generic rules. They're specific to your project:

- "Import prisma from `../db` — never instantiate PrismaClient directly"
- "Route files validate with Zod schemas before handlers, return `{ data }` or `{ error }` shapes"
- "Tests live in `__tests__/` and mirror the `src/` directory structure"

## Output Formats

| Format | Flag | Output |
|--------|------|--------|
| **Cursor** | `--format cursor` (default) | `.cursor/rules/*.mdc` |
| **Claude Code** | `--format claude-md` | `CLAUDE.md` |
| **Claude Agents** | `--format agents-md` | `AGENTS.md` |
| **GitHub Copilot** | `--format copilot` | `.github/copilot-instructions.md` |
| **Windsurf** | `--format windsurf` | `.windsurfrules` |

## How It Works

1. **Scan** — Walks your project tree, respects `.gitignore`, skips `node_modules`/`dist`/binaries
2. **Budget** — Prioritizes config files, entry points, routes, and pattern-rich files to fit Gemini's context window
3. **Generate** — Sends code to Gemini with a prompt engineered to reject generic advice and produce project-specific rules
4. **Write** — Outputs valid rule files in your chosen format

## Why Gemini

Gemini's 1M token context window lets rule-gen send your entire codebase in a single request. No chunking, no summarization, no lost context. The model sees all your files at once and identifies patterns that span across modules.

## Options

```
--format <format>   Output format: cursor, claude-md, agents-md, copilot, windsurf
--model <model>     Gemini model (default: gemini-2.5-flash-lite)
--dry-run           Preview rules without writing files
--verbose           Show which files are sent to Gemini
--max-files <n>     Max source files to include (default: 50)
--api-key <key>     Gemini API key (or set GEMINI_API_KEY env var)
-v, --version       Show version
-h, --help          Show help
```

## Zero Dependencies

Built with Node.js built-in modules only (`node:https`, `node:fs`, `node:path`). No SDK, no `node_modules`.

## Requirements

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier works)

## Part of the nedcodes ecosystem

| Tool | What it does |
|------|-------------|
| **[rule-gen](https://github.com/nedcodes-ok/rule-gen)** | Generate rules from your codebase ← you are here |
| **[cursor-doctor](https://github.com/nedcodes-ok/cursor-doctor)** | Validate and fix your rules |
| **[rule-porter](https://github.com/nedcodes-ok/rule-porter)** | Convert rules between formats |

Generate → Validate → Convert. One pipeline, three tools.

## License

MIT
