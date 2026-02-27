/**
 * Token budget manager.
 * Selects the most informative files to fit within Gemini's context window.
 * 
 * Priority order:
 * 1. Config files (package.json, tsconfig, etc.) — always included
 * 2. Entry points (index.*, main.*, app.*, server.*)
 * 3. Route/API files
 * 4. Largest source files (more code = more patterns to learn)
 * 5. Test files (shows testing conventions)
 * 
 * Reserves ~10K tokens for the system prompt and response.
 */

const MAX_CONTEXT_TOKENS = 900_000; // Leave headroom from 1M limit
const PROMPT_RESERVE = 10_000;
const BUDGET = MAX_CONTEXT_TOKENS - PROMPT_RESERVE;

function priority(file) {
  const rel = file.relativePath.toLowerCase();
  const name = rel.split('/').pop();

  // Config files — highest priority
  if (file.isConfig) return 0;

  // Entry points
  if (/^(index|main|app|server)\.[jt]sx?$/.test(name)) return 1;
  if (rel.includes('src/') && /^(index|main|app|server)\.[jt]sx?$/.test(name)) return 1;

  // Schema/model files
  if (rel.includes('schema') || rel.includes('model') || rel.includes('prisma')) return 2;

  // Route/API/controller files
  if (rel.includes('route') || rel.includes('api/') || rel.includes('controller')) return 3;

  // Middleware, hooks, utils — pattern-rich
  if (rel.includes('middleware') || rel.includes('hook') || rel.includes('util')) return 4;

  // Components (representative)
  if (rel.includes('component')) return 5;

  // Test files — shows conventions but lower priority
  if (rel.includes('test') || rel.includes('spec') || rel.includes('__tests__')) return 7;

  // Everything else
  return 6;
}

export const budgeter = {
  select(files, maxFiles = 50) {
    // Sort by priority, then by size (larger files have more patterns)
    const sorted = [...files].sort((a, b) => {
      const pa = priority(a);
      const pb = priority(b);
      if (pa !== pb) return pa - pb;
      return b.size - a.size; // Larger files first within same priority
    });

    const selected = [];
    let tokenBudget = BUDGET;

    for (const file of sorted) {
      if (selected.length >= maxFiles) break;
      if (file.tokens > tokenBudget) continue;

      selected.push(file);
      tokenBudget -= file.tokens;
    }

    return selected;
  },
};
