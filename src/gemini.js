import { request } from 'node:https';
import { basename } from 'node:path';

const API_BASE = 'generativelanguage.googleapis.com';

function buildPrompt(files, projectPath) {
  const projectName = basename(projectPath);

  // Detect project info from config files
  const pkgFile = files.find(f => f.relativePath === 'package.json');
  let projectInfo = '';
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      projectInfo = `
DETECTED STACK:
- Dependencies: ${deps.join(', ') || 'none'}
- Dev dependencies: ${devDeps.join(', ') || 'none'}
- Type: ${pkg.type || 'commonjs'}
`;
    } catch { /* ignore parse errors */ }
  }

  let prompt = `You are an expert at writing Cursor .mdc rules. Your job is to analyze a SPECIFIC codebase and generate rules that capture THIS project's unique patterns.

PROJECT: ${projectName}
${projectInfo}
CRITICAL INSTRUCTION: Do NOT generate generic coding advice. Every rule you write must reference a specific pattern you observed in the files below. If you can't point to a line of code that demonstrates the pattern, don't write the rule.

BAD (generic): "Use const instead of let" — any linter catches this
BAD (generic): "Prefer async/await" — obvious, not project-specific  
BAD (generic): "Use PascalCase for components" — standard convention everyone knows

GOOD (specific): "This project exports a singleton pattern from db.ts — always import prisma from '../db', never instantiate PrismaClient directly"
GOOD (specific): "Route files in src/routes/ follow a pattern: export a Router, validate with Zod schemas before handlers, return consistent { data } or { error } shapes"
GOOD (specific): "All CLI commands use the same structure: parse args, validate, call a pure function from src/, format output — keep side effects in cli.js only"

WHAT TO LOOK FOR:
1. How does this project structure its modules? (barrel exports, flat files, feature folders)
2. What patterns repeat across multiple files? (error handling, validation, response shapes)
3. What conventions would an AI get wrong without guidance? (import paths, naming patterns unique to this project)
4. What architectural boundaries exist? (separation of concerns, where side effects live)
5. What framework-specific patterns does this project use? (not generic framework advice — THIS project's usage)

OUTPUT FORMAT:
Generate each rule in this exact format, separated by ===RULE===

---
description: One-line description referencing this specific project
globs: ["actual/paths/from/this/project/**/*.ext"]
alwaysApply: false
---

# Rule Title

Specific instructions referencing actual file paths, function names, and patterns from this codebase.
Include a concrete example from the actual code when possible.

===RULE===

CONSTRAINTS:
- Generate EXACTLY 5-8 rules. No more. No fewer.
- If you find yourself generating more than 8, you are being too granular. Merge related patterns into single rules.
- Set alwaysApply: true for max 2 rules (only truly project-wide conventions)
- Use glob patterns that match ACTUAL directories in this project (e.g., "src/routes/**" not "**/*.ts")
- Each rule 100-250 words
- Every rule must reference something specific from the code below
- ONE rule per architectural pattern, not one rule per code branch or validation check
- No rules about: semicolons, trailing commas, const vs let, basic TypeScript, obvious framework conventions
- Do NOT enumerate every validation check in a file as separate rules — describe the PATTERN, not the checks

Here are the codebase files:

`;

  for (const file of files) {
    const ext = file.ext.replace('.', '');
    prompt += `## ${file.relativePath}\n\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
  }

  return prompt;
}

function parseRules(text) {
  const chunks = text.split('===RULE===').map(s => s.trim()).filter(Boolean);
  const rules = [];

  for (const chunk of chunks) {
    // Extract frontmatter — may have text before the ---
    const fmMatch = chunk.match(/---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) continue;

    const frontmatter = fmMatch[1];
    const body = fmMatch[2].trim();

    // Parse frontmatter fields
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    const globsMatch = frontmatter.match(/globs:\s*(\[.+\])/);
    const alwaysMatch = frontmatter.match(/alwaysApply:\s*(true|false)/);

    const description = descMatch ? descMatch[1].trim() : 'Generated rule';
    const globs = globsMatch ? globsMatch[1] : '["**/*"]';
    const alwaysApply = alwaysMatch ? alwaysMatch[1] : 'false';

    // Generate filename from title
    const titleMatch = body.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : 'generated-rule';
    const filename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const content = `---\ndescription: ${description}\nglobs: ${globs}\nalwaysApply: ${alwaysApply}\n---\n\n${body}\n`;

    rules.push({ filename, content, title, description });
  }

  return rules;
}

function apiRequest(model, apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16384,
      },
    });

    const options = {
      hostname: API_BASE,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 120000, // 2 minute timeout
    };

    const req = request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Gemini API error: ${json.error.message}`));
            return;
          }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Gemini returned an empty response'));
            return;
          }
          const usage = json.usageMetadata || {};
          resolve({ text, usage });
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out (120s). Try --max-files to reduce input size.'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export const gemini = {
  async generate(files, model, apiKey, projectPath) {
    const prompt = buildPrompt(files, projectPath);
    const { text, usage } = await apiRequest(model, apiKey, prompt);

    if (usage.promptTokenCount) {
      console.log(`  API usage: ${usage.promptTokenCount.toLocaleString()} input, ${usage.candidatesTokenCount?.toLocaleString() || '?'} output tokens`);
    }

    return parseRules(text);
  },
};
