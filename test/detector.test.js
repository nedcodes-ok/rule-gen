import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detector, buildProjectInfo } from '../src/detector.js';

describe('detector', () => {
  describe('detectNodeProject', () => {
    it('should detect Node.js project from package.json', () => {
      const files = [
        {
          relativePath: 'package.json',
          content: JSON.stringify({
            dependencies: { express: '^4.0.0' },
            devDependencies: { jest: '^29.0.0' },
            type: 'module'
          })
        }
      ];

      const result = detector.detectNodeProject(files);
      assert.strictEqual(result.type, 'node');
      assert.strictEqual(result.moduleType, 'module');
      assert.deepStrictEqual(result.dependencies, ['express', 'jest']);
    });

    it('should return null if no package.json', () => {
      const files = [];
      const result = detector.detectNodeProject(files);
      assert.strictEqual(result, null);
    });
  });

  describe('detectPythonProject', () => {
    it('should detect Django from requirements.txt', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'Django==4.2.0\npsycopg2==2.9.0\npytest==7.4.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
      assert.strictEqual(result.packageManager, 'pip');
      assert.ok(result.frameworks.includes('Django'));
      assert.ok(result.testing.includes('pytest'));
    });

    it('should detect Flask from requirements.txt', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'Flask==2.3.0\nflask-sqlalchemy==3.0.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
      assert.ok(result.frameworks.includes('Flask'));
    });

    it('should detect FastAPI from requirements.txt', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'fastapi==0.100.0\nuvicorn==0.23.0\npydantic==2.0.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
      assert.ok(result.frameworks.includes('FastAPI'));
    });

    it('should detect Poetry project from pyproject.toml', () => {
      const files = [
        {
          relativePath: 'pyproject.toml',
          content: `[tool.poetry]
name = "my-project"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.9"
django = "^4.2"
celery = "^5.3"

[tool.poetry.dev-dependencies]
pytest = "^7.4"
black = "^23.0"
mypy = "^1.0"
`
        },
        {
          relativePath: 'poetry.lock',
          content: '# Poetry lock file'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
      assert.strictEqual(result.packageManager, 'poetry');
      assert.ok(result.frameworks.includes('Django'));
      assert.ok(result.testing.includes('pytest'));
      assert.ok(result.linting.includes('black'));
      assert.ok(result.typeChecking.includes('mypy'));
    });

    it('should detect Pipenv project from Pipfile', () => {
      const files = [
        {
          relativePath: 'Pipfile',
          content: `[packages]
flask = "*"
gunicorn = "*"

[dev-packages]
pylint = "*"
pytest = "*"
`
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
      assert.strictEqual(result.packageManager, 'pipenv');
      assert.ok(result.frameworks.includes('Flask'));
      assert.ok(result.testing.includes('pytest'));
      assert.ok(result.linting.includes('pylint'));
    });

    it('should detect linting tools', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'ruff==0.1.0\nflake8==6.0.0\npylint==2.17.0\nblack==23.0.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.ok(result.linting.includes('ruff'));
      assert.ok(result.linting.includes('flake8'));
      assert.ok(result.linting.includes('pylint'));
      assert.ok(result.linting.includes('black'));
    });

    it('should detect type checking tools', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'mypy==1.0.0\npyright==1.1.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.ok(result.typeChecking.includes('mypy'));
      assert.ok(result.typeChecking.includes('pyright'));
    });

    it('should detect unittest from test files when no pytest', () => {
      const files = [
        {
          relativePath: 'test_app.py',
          ext: '.py',
          content: 'import unittest'
        },
        {
          relativePath: 'requirements.txt',
          content: 'flask==2.3.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.ok(result.testing.includes('unittest'));
    });

    it('should detect Python project from .py files only', () => {
      const files = [
        {
          relativePath: 'main.py',
          ext: '.py',
          content: 'print("hello")'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
    });

    it('should return null if no Python indicators', () => {
      const files = [
        {
          relativePath: 'index.js',
          ext: '.js',
          content: 'console.log("hello")'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result, null);
    });

    it('should detect setup.py project', () => {
      const files = [
        {
          relativePath: 'setup.py',
          content: `from setuptools import setup

setup(
    name='myproject',
    install_requires=[
        'django>=4.0',
        'pytest',
    ]
)
`
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.strictEqual(result.type, 'python');
      assert.strictEqual(result.packageManager, 'setuptools');
      assert.ok(result.frameworks.includes('Django'));
      assert.ok(result.testing.includes('pytest'));
    });

    it('should handle multiple web frameworks', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'fastapi==0.100.0\nstarlette==0.27.0\naiohttp==3.8.0'
        }
      ];

      const result = detector.detectPythonProject(files);
      assert.ok(result.frameworks.includes('FastAPI'));
      assert.ok(result.frameworks.includes('Starlette'));
      assert.ok(result.frameworks.includes('aiohttp'));
    });
  });

  describe('buildProjectInfo', () => {
    it('should build info for Node.js project', () => {
      const files = [
        {
          relativePath: 'package.json',
          content: JSON.stringify({
            dependencies: { express: '^4.0.0' },
            type: 'module'
          })
        }
      ];

      const info = buildProjectInfo(files);
      assert.ok(info.includes('Type: Node.js'));
      assert.ok(info.includes('module'));
      assert.ok(info.includes('express'));
    });

    it('should build info for Python project', () => {
      const files = [
        {
          relativePath: 'requirements.txt',
          content: 'django==4.2.0\npytest==7.4.0\nblack==23.0.0\nmypy==1.0.0'
        }
      ];

      const info = buildProjectInfo(files);
      assert.ok(info.includes('Type: Python'));
      assert.ok(info.includes('Package Manager: pip'));
      assert.ok(info.includes('Frameworks: Django'));
      assert.ok(info.includes('Testing: pytest'));
      assert.ok(info.includes('Linting: black'));
      assert.ok(info.includes('Type Checking: mypy'));
    });

    it('should build info for polyglot project', () => {
      const files = [
        {
          relativePath: 'package.json',
          content: JSON.stringify({
            dependencies: { express: '^4.0.0' },
            type: 'module'
          })
        },
        {
          relativePath: 'requirements.txt',
          content: 'flask==2.3.0'
        }
      ];

      const info = buildProjectInfo(files);
      assert.ok(info.includes('Type: Node.js'));
      assert.ok(info.includes('Type: Python'));
      assert.ok(info.includes('Frameworks: Flask'));
    });

    it('should return empty string for unknown project', () => {
      const files = [];
      const info = buildProjectInfo(files);
      assert.strictEqual(info, '');
    });
  });
});
