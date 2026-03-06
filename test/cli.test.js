import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';
import { parseArgs } from '../src/cli.js';

describe('CLI --output-dir flag', () => {
  it('should parse --output-dir and store in outputDir', () => {
    const opts = parseArgs(['--output-dir', '/tmp/rules']);
    assert.strictEqual(opts.outputDir, '/tmp/rules');
  });

  it('should default outputDir to null when not specified', () => {
    const opts = parseArgs([]);
    assert.strictEqual(opts.outputDir, null);
  });

  it('should handle --output-dir with relative path', () => {
    const opts = parseArgs(['--output-dir', './custom-output']);
    assert.strictEqual(opts.outputDir, './custom-output');
  });

  it('should coexist with other flags', () => {
    const opts = parseArgs(['--format', 'claude-md', '--output-dir', '/tmp/out', '--dry-run', '.']);
    assert.strictEqual(opts.format, 'claude-md');
    assert.strictEqual(opts.outputDir, '/tmp/out');
    assert.strictEqual(opts.dryRun, true);
    assert.strictEqual(opts.path, '.');
  });
});
