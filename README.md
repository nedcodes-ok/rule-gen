# rule-gen

![Cursor Rules](https://img.shields.io/badge/Cursor%20Rules-validated-brightgreen)


[![npm version](https://img.shields.io/npm/v/rulegen-ai)](https://www.npmjs.com/package/rulegen-ai) [![npm downloads](https://img.shields.io/npm/dw/rulegen-ai)](https://www.npmjs.com/package/rulegen-ai) [![license](https://img.shields.io/npm/l/rulegen-ai)](https://github.com/nedcodes-ok/rule-gen/blob/main/LICENSE)

**Stop writing Cursor rules by hand.**

Feed your codebase to Gemini. Get rules based on patterns it finds in *your* code, not generic templates from a package.json scan.

```bash
export GEMINI_API_KEY=your-key-here
npx rulegen-ai
```

Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## What you get

```
$ npx rulegen-ai ./my-express-api

Scanning ./my-express-api...
  Found 47 files · Selected 32 for analysis · ~89,200 tokens

Generating rules with gemini-2.5-flash-lite...

Written 7 files:
  ✓ .cursor/rules/zod-validation-before-handlers.mdc
  ✓ .cursor/rules/prisma-singleton-import.mdc
  ✓ .cursor/rules/consistent-error-response-shape.mdc
  ✓ .cursor/rules/route-file-structure.mdc
  ✓ .cursor/rules/barrel-exports-from-src.mdc
  ✓ .cursor/rules/test-naming-convention.mdc
  ✓ .cursor/rules/middleware-ordering.mdc
```

Not "use TypeScript" or "write clean code". Rules like:

- *"Import prisma from `../db` — never instantiate PrismaClient directly"*
- *"Route files validate with Zod schemas before handlers, return `{ data }` or `{ error }` shapes"*
- *"Tests live in `__tests__/` and mirror the `src/` directory structure"*

## Output formats

| Format | Flag | Output |
|--------|------|--------|
| Cursor | `--format cursor` (default) | `.cursor/rules/*.mdc` |
| Claude Code | `--format claude-md` | `CLAUDE.md` |
| AGENTS.md | `--format agents-md` | `AGENTS.md` |
| GitHub Copilot | `--format copilot` | `.github/copilot-instructions.md` |
| Windsurf | `--format windsurf` | `.windsurfrules` |

## How it works

1. **Scans** your project tree (respects `.gitignore`, skips binaries)
2. **Detects** your stack — Node.js, Python frameworks (Django, Flask, FastAPI), testing tools, linters, type checkers
3. **Prioritizes** config files, entry points, routes, and pattern-rich files to fit Gemini's context window
4. **Sends everything in one request** — Gemini's 1M token context sees your whole codebase at once. No chunking, no lost context.
5. **Writes** valid rule files in your chosen format

## Language & framework support

rule-gen auto-detects:

**Python**
- Frameworks: Django, Flask, FastAPI, Tornado, Sanic, and 10+ more
- Testing: pytest, unittest, nose, tox, coverage
- Type checking: mypy, pyright, pyre, pytype
- Linting: ruff, flake8, pylint, black, isort, bandit
- Package managers: Poetry, Pipenv, pip, setuptools

**Node.js/TypeScript**
- Detects from `package.json` dependencies
- Identifies module type (ESM/CommonJS)

This context helps Gemini generate rules specific to your stack — e.g., Django best practices for Django projects, FastAPI patterns for FastAPI apps.

## Options

```
--format <format>   cursor, claude-md, agents-md, copilot, windsurf
--model <model>     Gemini model (default: gemini-2.5-flash-lite)
--dry-run           Preview without writing files
--verbose           Show which files are sent
--max-files <n>     Max source files (default: 50)
--api-key <key>     Or set GEMINI_API_KEY env var
```

Zero dependencies. Built with Node.js builtins only.

## Next step: check your rules

rule-gen creates rules. **[cursor-doctor](https://github.com/nedcodes-ok/cursor-doctor)** makes sure they actually work.

```bash
npx cursor-doctor scan    # Health check with letter grade
npx cursor-doctor lint    # Detailed rule-by-rule linting
```

100+ checks for broken globs, vague instructions, conflicts, and token waste. Also: **[rule-porter](https://github.com/nedcodes-ok/rule-porter)** converts rules between Cursor, Claude, Copilot, and Windsurf.

## License

MIT
