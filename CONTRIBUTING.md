# Contributing to rule-gen

Thanks for your interest in contributing! Here's how to get started.

## Quick Start

```bash
git clone https://github.com/nedcodes-ok/rule-gen.git
cd rule-gen
export GEMINI_API_KEY=your-key  # free at aistudio.google.com/apikey
node bin/rule-gen.js ./some-project --dry-run
```

No build step. No dependencies to install. The project runs on Node.js built-in modules only.

## How to Contribute

1. **Fork** the repo
2. **Create a branch** (`git checkout -b my-fix`)
3. **Make your changes**
4. **Test manually** with `--dry-run` on a real project
5. **Submit a PR**

## What We're Looking For

- Bug fixes
- Better project detection (Python, Go, Rust, etc.)
- Scanner improvements (smarter file selection)
- Prompt improvements (better rule quality)
- Documentation improvements

Check the [issues labeled `good first issue`](https://github.com/nedcodes-ok/rule-gen/labels/good%20first%20issue) for beginner-friendly tasks.

## Code Style

- Zero external dependencies — use Node.js built-ins only
- Five modules: `scanner.js`, `budgeter.js`, `gemini.js`, `writer.js`, `cli.js`
- Use Gemini structured output (`responseSchema`) for all API calls
- Error messages follow the pattern: `Error: <what failed>. <suggestion>`

## Architecture

```
bin/rule-gen.js  → entry point
src/cli.js       → argument parsing, orchestration
src/scanner.js   → walks project tree, respects .gitignore
src/budgeter.js  → selects files to fit context window
src/gemini.js    → prompt + Gemini API + structured output parsing
src/writer.js    → outputs rules in chosen format
```

## Reporting Bugs

Open an issue with:
- What you expected
- What happened
- The project you scanned (or a description of it)
- Your Node.js version (`node -v`)

## Questions?

Open an issue — happy to help.
