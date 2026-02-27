import { request } from 'node:https';
import { basename } from 'node:path';

const API_BASE = 'generativelanguage.googleapis.com';

const RULE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING", description: "Short descriptive title for the rule" },
      description: { type: "STRING", description: "One-line description of what pattern this rule enforces" },
      globs: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "File glob patterns this rule applies to, using actual directories from the project"
      },
      alwaysApply: { type: "BOOLEAN", description: "True only for project-wide conventions (max 2)" },
      body: { type: "STRING", description: "Full rule instructions telling an AI how to follow this pattern when writing new code" }
    },
    required: ["title", "description", "globs", "alwaysApply", "body"]
  }
};

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
      projectInfo = `\nStack: ${deps.concat(devDeps).join(', ') || 'none'} | Type: ${pkg.type || 'commonjs'}`;
    } catch { /* ignore parse errors */ }
  }

  let prompt = `You are writing rules for an AI coding assistant. These rules tell the AI HOW TO WRITE NEW CODE in this project. They are NOT documentation of what the code does.

PROJECT: ${projectName}${projectInfo}

WHAT ARE RULES FOR:
Rules guide an AI that is writing or modifying code in this project. They answer: "If the AI needs to add a new feature or fix a bug, what patterns must it follow?"

BAD RULE (describes what code does — useless as a rule):
"The lintMdcFile function validates .mdc files by checking frontmatter fields"
— This just describes existing code. The AI can read the code itself.

GOOD RULE (tells AI what pattern to follow when writing new code):
"When adding a new CLI command: add the case in src/cli.js, implement the logic in a separate src/<feature>.js module, export a single function that takes (cwd) as its first argument"
— This tells the AI what to DO when making changes.

MORE EXAMPLES OF GOOD RULES:
- "Error messages in this project follow the pattern: 'Error: <what failed>. <suggestion to fix it>.' Always include a fix suggestion."
- "New parser files go in src/parsers/ and must export a single parse(content) function that returns { frontmatter, body }"
- "This project has zero dependencies by design. Never add an npm dependency. Use Node.js built-in modules only."

STEP 1: Read the code below. Ask yourself: if a new developer joined this project, what non-obvious conventions would they need to follow?
STEP 2: Write 5-8 rules capturing those conventions. Each rule = one pattern.

CONSTRAINTS:
- Generate EXACTLY 5-8 rules. Not 9. Not 15.
- Max 2 rules with alwaysApply: true
- Each rule body should be 100-250 words
- Use globs matching ACTUAL directories from the files below
- The "title" field should be a short descriptive name (e.g. "cli-command-structure", "error-message-format")

FILES:

`;

  for (const file of files) {
    const ext = file.ext.replace('.', '');
    prompt += `## ${file.relativePath}\n\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
  }

  // Final constraint reminder — last thing the model sees
  prompt += `
FINAL REMINDER: Generate 5-8 rules about how to write NEW code in this project. Not documentation of existing code. Each rule should help an AI follow the project's conventions.
`;

  return prompt;
}

function structuredRulesToOutput(rules) {
  return rules.map(rule => {
    const filename = rule.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const globs = JSON.stringify(rule.globs);
    const content = `---
description: ${rule.description}
globs: ${globs}
alwaysApply: ${rule.alwaysApply}
---

# ${rule.title}

${rule.body}
`;

    return { filename, content, title: rule.title, description: rule.description };
  });
}

// Legacy parser for models that don't support structured output
function parseRules(text) {
  let chunks = text.split('===RULE===').map(s => s.trim()).filter(Boolean);

  if (chunks.length <= 1 && text.match(/---\n/g)?.length > 2) {
    chunks = text.split(/(?=---\ndescription:)/g).map(s => s.trim()).filter(Boolean);
    if (chunks.length <= 1) {
      chunks = text.split(/\n(?=---\n(?:description|globs|alwaysApply):)/g).map(s => s.trim()).filter(Boolean);
    }
  }

  const rules = [];

  for (const chunk of chunks) {
    let description = 'Generated rule';
    let globs = '["**/*"]';
    let alwaysApply = 'false';
    let body = '';

    const fmMatch = chunk.match(/---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      const frontmatter = fmMatch[1];
      body = fmMatch[2].trim();

      const descMatch = frontmatter.match(/description:\s*(.+)/);
      const globsMatch = frontmatter.match(/globs:\s*(\[.+\])/);
      const alwaysMatch = frontmatter.match(/alwaysApply:\s*(true|false)/);

      if (descMatch) description = descMatch[1].trim();
      if (globsMatch) globs = globsMatch[1];
      if (alwaysMatch) alwaysApply = alwaysMatch[1];
    } else {
      const descMd = chunk.match(/\*\*Description:\*\*\s*(.+)/);
      const globsMd = chunk.match(/\*\*Globs?:\*\*\s*`?(\[.+?\])`?/);
      const alwaysMd = chunk.match(/\*\*alwaysApply:\*\*\s*(true|false)/i);

      if (descMd) description = descMd[1].trim();
      if (globsMd) globs = globsMd[1];
      if (alwaysMd) alwaysApply = alwaysMd[1];

      const ruleBodyMatch = chunk.match(/\*\*Rule:\*\*\n([\s\S]*)/);
      if (ruleBodyMatch) {
        const titleLine = chunk.match(/^#\s+(.+)/m);
        body = titleLine ? `${titleLine[0]}\n\n${ruleBodyMatch[1].trim()}` : ruleBodyMatch[1].trim();
      } else {
        const titleIdx = chunk.search(/^#\s+/m);
        if (titleIdx >= 0) body = chunk.slice(titleIdx).trim();
      }
    }

    if (!body) continue;

    const titleMatch = body.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].replace(/^Rule:\s*/i, '') : 'generated-rule';
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

function apiRequest(model, apiKey, prompt, useStructured) {
  return new Promise((resolve, reject) => {
    const genConfig = {
      temperature: 0.3,
      maxOutputTokens: 16384,
    };

    if (useStructured) {
      genConfig.responseMimeType = "application/json";
      genConfig.responseSchema = RULE_SCHEMA;
    }

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: genConfig,
    });

    const options = {
      hostname: API_BASE,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 300000, // 5 minute timeout for thinking models
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
      reject(new Error('Gemini API request timed out. Try --max-files to reduce input size.'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const MAX_RULES = 8;

export const gemini = {
  async generate(files, model, apiKey, projectPath) {
    const prompt = buildPrompt(files, projectPath);

    // Use structured output for all models
    let useStructured = true;
    const { text, usage } = await apiRequest(model, apiKey, prompt, useStructured);

    if (usage.promptTokenCount) {
      console.log(`  API usage: ${usage.promptTokenCount.toLocaleString()} input, ${usage.candidatesTokenCount?.toLocaleString() || '?'} output tokens`);
    }

    let rules;

    if (useStructured) {
      try {
        const parsed = JSON.parse(text);
        rules = structuredRulesToOutput(parsed);
      } catch {
        // Structured output failed, fall back to text parsing
        console.log('  ⚠ Structured output parse failed, falling back to text parser');
        rules = parseRules(text);
      }
    } else {
      rules = parseRules(text);
    }

    // Hard cap
    if (rules.length > MAX_RULES) {
      console.log(`  ⚠ Model generated ${rules.length} rules, capping to ${MAX_RULES}`);
      rules = rules.slice(0, MAX_RULES);
    }

    return rules;
  },
};
