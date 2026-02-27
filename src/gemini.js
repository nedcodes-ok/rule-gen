import { request } from 'node:https';
import { basename } from 'node:path';

const API_BASE = 'generativelanguage.googleapis.com';

function buildPrompt(files, projectPath) {
  const projectName = basename(projectPath);

  let prompt = `You are an expert AI coding rules generator. Analyze the following codebase and generate Cursor .mdc rule files.

PROJECT: ${projectName}

Your job:
1. Read every file carefully
2. Identify coding patterns, conventions, architecture decisions, and style preferences
3. Generate specific, actionable rules that an AI coding assistant should follow when working in this codebase

Rules you generate should be SPECIFIC to this project — not generic advice. Look for:
- Naming conventions (camelCase vs snake_case, prefixes, suffixes)
- Import patterns (relative vs absolute, aliases, barrel exports)
- Error handling patterns
- State management approach
- API/route structure conventions
- Testing patterns and conventions
- Component/module structure
- Type usage (TypeScript strictness, Zod schemas, etc.)
- Framework-specific patterns (React hooks, Next.js conventions, Express middleware, etc.)

OUTPUT FORMAT:
Generate each rule in this exact format, separated by ===RULE===

---
description: One-line description of what this rule enforces
globs: ["glob/pattern/**/*.ext"]
alwaysApply: false
---

# Rule Title

Detailed instructions for the AI assistant. Be specific and actionable.
Include DO and DON'T examples where helpful.

===RULE===

GUIDELINES:
- Generate 5-10 rules depending on codebase complexity
- Set alwaysApply: true only for project-wide conventions (max 2-3 rules)
- Use accurate glob patterns that match the relevant files
- Each rule should be 100-300 words — enough detail to be useful, not so long it wastes context
- Don't generate rules for things that linters already catch (semicolons, trailing commas)
- Focus on patterns that an AI would get wrong without guidance

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
