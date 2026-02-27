import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, extname, basename } from 'node:path';

// File extensions we care about
const SOURCE_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.go',
  '.rs',
  '.rb',
  '.java', '.kt', '.kts',
  '.cs',
  '.php',
  '.swift',
  '.c', '.h', '.cpp', '.hpp', '.cc',
  '.vue', '.svelte', '.astro',
  '.css', '.scss', '.less',
  '.html', '.htm',
  '.sql',
  '.sh', '.bash', '.zsh',
  '.yaml', '.yml',
  '.toml',
  '.graphql', '.gql',
  '.proto',
]);

// Config files we always want (these reveal project structure)
const CONFIG_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  'eslint.config.js',
  'eslint.config.mjs',
  '.prettierrc',
  '.prettierrc.json',
  'prettier.config.js',
  'biome.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'nuxt.config.ts',
  'svelte.config.js',
  'astro.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'webpack.config.js',
  'rollup.config.js',
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.js',
  'jest.config.ts',
  'playwright.config.ts',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  '.dockerignore',
  'Makefile',
  'Cargo.toml',
  'go.mod',
  'go.sum',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'Gemfile',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  '.env.example',
  'prisma/schema.prisma',
  'drizzle.config.ts',
]);

// Directories to always skip
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  'target',
  'vendor',
  'coverage',
  '.nyc_output',
  '.turbo',
  '.vercel',
  '.netlify',
  'tmp',
  'temp',
  '.cache',
  '.parcel-cache',
  '.DS_Store',
  'logs',
]);

// Max file size to read (100KB)
const MAX_FILE_SIZE = 100 * 1024;

async function loadGitignore(projectPath) {
  const patterns = [];
  try {
    const content = await readFile(join(projectPath, '.gitignore'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        patterns.push(trimmed);
      }
    }
  } catch {
    // No .gitignore, that's fine
  }
  return patterns;
}

function matchesGitignore(relativePath, patterns) {
  for (const pattern of patterns) {
    const clean = pattern.replace(/\/$/, '');
    if (relativePath.includes(clean)) return true;
  }
  return false;
}

async function walk(dir, projectPath, gitignorePatterns, results) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(projectPath, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (matchesGitignore(relPath, gitignorePatterns)) continue;
      await walk(fullPath, projectPath, gitignorePatterns, results);
    } else if (entry.isFile()) {
      if (matchesGitignore(relPath, gitignorePatterns)) continue;

      const ext = extname(entry.name).toLowerCase();
      const name = basename(entry.name);
      const isConfig = CONFIG_FILES.has(name) || CONFIG_FILES.has(relPath);
      const isSource = SOURCE_EXTS.has(ext);

      if (!isConfig && !isSource) continue;

      try {
        const stats = await stat(fullPath);
        if (stats.size > MAX_FILE_SIZE) continue;
        if (stats.size === 0) continue;

        const content = await readFile(fullPath, 'utf-8');

        // Rough token estimate: ~4 chars per token
        const tokens = Math.ceil(content.length / 4);

        results.push({
          fullPath,
          relativePath: relPath,
          content,
          size: stats.size,
          tokens,
          isConfig,
          ext,
        });
      } catch {
        // Skip files we can't read
      }
    }
  }
}

export const scanner = {
  async scan(projectPath) {
    const gitignorePatterns = await loadGitignore(projectPath);
    const results = [];
    await walk(projectPath, projectPath, gitignorePatterns, results);
    return results;
  },
};
