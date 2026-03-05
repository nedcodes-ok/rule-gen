import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scanner } from '../src/scanner.js';
import { buildProjectInfo } from '../src/detector.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testProjectsDir = join(__dirname, '..', 'test-projects');

describe('integration', () => {
  it('should scan and detect Django project correctly', async () => {
    const djangoPath = join(testProjectsDir, 'django-sample');
    const files = await scanner.scan(djangoPath);
    
    assert.ok(files.length > 0, 'Should find files');
    
    const requirementsTxt = files.find(f => f.relativePath === 'requirements.txt');
    assert.ok(requirementsTxt, 'Should find requirements.txt');
    assert.ok(requirementsTxt.isConfig, 'requirements.txt should be marked as config');
    
    const info = buildProjectInfo(files);
    assert.ok(info.includes('Type: Python'), 'Should detect Python');
    assert.ok(info.includes('Django'), 'Should detect Django framework');
    assert.ok(info.includes('pytest'), 'Should detect pytest');
    assert.ok(info.includes('mypy'), 'Should detect mypy');
    assert.ok(info.includes('ruff'), 'Should detect ruff');
    assert.ok(info.includes('black'), 'Should detect black');
  });

  it('should scan and detect Flask project correctly', async () => {
    const flaskPath = join(testProjectsDir, 'flask-sample');
    const files = await scanner.scan(flaskPath);
    
    assert.ok(files.length > 0, 'Should find files');
    
    const info = buildProjectInfo(files);
    assert.ok(info.includes('Type: Python'), 'Should detect Python');
    assert.ok(info.includes('Flask'), 'Should detect Flask framework');
    assert.ok(info.includes('pytest'), 'Should detect pytest');
    assert.ok(info.includes('black'), 'Should detect black');
  });

  it('should scan and detect FastAPI project correctly', async () => {
    const fastapiPath = join(testProjectsDir, 'fastapi-sample');
    const files = await scanner.scan(fastapiPath);
    
    assert.ok(files.length > 0, 'Should find files');
    
    const pyprojectToml = files.find(f => f.relativePath === 'pyproject.toml');
    assert.ok(pyprojectToml, 'Should find pyproject.toml');
    assert.ok(pyprojectToml.isConfig, 'pyproject.toml should be marked as config');
    
    const poetryLock = files.find(f => f.relativePath === 'poetry.lock');
    assert.ok(poetryLock, 'Should find poetry.lock');
    
    const info = buildProjectInfo(files);
    assert.ok(info.includes('Type: Python'), 'Should detect Python');
    assert.ok(info.includes('poetry'), 'Should detect Poetry package manager');
    assert.ok(info.includes('FastAPI'), 'Should detect FastAPI framework');
    assert.ok(info.includes('pytest'), 'Should detect pytest');
    assert.ok(info.includes('mypy'), 'Should detect mypy');
  });

  it('should handle Python files without config files', async () => {
    const files = [
      {
        relativePath: 'main.py',
        ext: '.py',
        content: 'print("hello")',
        isConfig: false
      }
    ];
    
    const info = buildProjectInfo(files);
    assert.ok(info.includes('Type: Python'), 'Should detect Python from .py files');
  });
});
