# rule-gen

Generate AI coding rules from your codebase using Google Gemini.

Feed Gemini your source code. Get back tailored `.mdc` rules for Cursor — or convert to CLAUDE.md, AGENTS.md, Copilot, or Windsurf format.

## Quick Start

```bash
npx rule-gen
```

That's it. rule-gen scans your project, sends it to Gemini's 1M token context window, and generates rules based on your actual code patterns.

## Requirements

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier works)

Set your API key:

```bash
export GEMINI_API_KEY=your-key-here
```

## Usage

```bash
# Scan current directory, output .cursor/rules/*.mdc files
npx rule-gen

# Scan a specific project
npx rule-gen ./my-project

# Output as CLAUDE.md instead
npx rule-gen --format claude-md

# Preview without writing files
npx rule-gen --dry-run --verbose

# Use Gemini Pro for higher quality
npx rule-gen --model gemini-2.5-pro
```

## Output Formats

| Format | Flag | Output |
|--------|------|--------|
| Cursor | `--format cursor` (default) | `.cursor/rules/*.mdc` |
| Claude | `--format claude-md` | `CLAUDE.md` |
| Agents | `--format agents-md` | `AGENTS.md` |
| Copilot | `--format copilot` | `.github/copilot-instructions.md` |
| Windsurf | `--format windsurf` | `.windsurfrules` |

## How It Works

1. **Scan** — Walks your project tree, respects `.gitignore`, collects source and config files
2. **Budget** — Prioritizes config files, entry points, and pattern-rich files to fit within Gemini's context window
3. **Generate** — Sends your code to Gemini with a specialized prompt for rule generation
4. **Write** — Outputs valid rule files in your chosen format

## What Makes This Different

Most rule generators use static analysis — they read your `package.json` and output generic templates. rule-gen sends your **actual source code** to Gemini's 1M token context window. It reads your naming conventions, your error handling patterns, your component structure, and generates rules specific to *your* codebase.

## Options

```
--format <format>   Output format: cursor, claude-md, agents-md, copilot, windsurf
--model <model>     Gemini model (default: gemini-2.5-flash)
--dry-run           Preview rules without writing files
--verbose           Show which files are sent to Gemini
--max-files <n>     Max source files to include (default: 50)
--api-key <key>     Gemini API key (or set GEMINI_API_KEY)
-v, --version       Show version
-h, --help          Show help
```

## Zero Dependencies

rule-gen uses only Node.js built-in modules (`node:https`, `node:fs`, `node:path`). No SDK, no node_modules.

## Part of the nedcodes ecosystem

- **[rule-gen](https://github.com/nedcodes-ok/rule-gen)** — Generate rules from your codebase (you are here)
- **[cursor-doctor](https://github.com/nedcodes-ok/cursor-doctor)** — Validate and fix your rules
- **[rule-porter](https://github.com/nedcodes-ok/rule-porter)** — Convert rules between formats

## License

MIT
