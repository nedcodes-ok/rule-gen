/**
 * Project detection module
 * Identifies project types and their frameworks/tools
 */

/**
 * Detect Node.js/TypeScript project info from package.json
 */
function detectNodeProject(files) {
  const pkgFile = files.find(f => f.relativePath === 'package.json');
  if (!pkgFile) return null;

  try {
    const pkg = JSON.parse(pkgFile.content);
    const deps = Object.keys(pkg.dependencies || {});
    const devDeps = Object.keys(pkg.devDependencies || {});
    const allDeps = deps.concat(devDeps);
    
    return {
      type: 'node',
      dependencies: allDeps,
      moduleType: pkg.type || 'commonjs',
    };
  } catch {
    return null;
  }
}

/**
 * Detect Python project info from various config files
 */
function detectPythonProject(files) {
  // Check for Python config files
  const pyprojectFile = files.find(f => f.relativePath === 'pyproject.toml');
  const requirementsFile = files.find(f => f.relativePath === 'requirements.txt');
  const setupPyFile = files.find(f => f.relativePath === 'setup.py');
  const setupCfgFile = files.find(f => f.relativePath === 'setup.cfg');
  const pipfileFile = files.find(f => f.relativePath === 'Pipfile');
  const poetryLockFile = files.find(f => f.relativePath === 'poetry.lock');

  // If no Python config files found, check for .py files
  const hasPyFiles = files.some(f => f.ext === '.py' || f.ext === '.pyw');
  
  if (!pyprojectFile && !requirementsFile && !setupPyFile && !setupCfgFile && !pipfileFile && !hasPyFiles) {
    return null;
  }

  const info = {
    type: 'python',
    frameworks: [],
    testing: [],
    linting: [],
    typeChecking: [],
    packageManager: null,
  };

  // Detect package manager
  if (poetryLockFile || (pyprojectFile && pyprojectFile.content.includes('[tool.poetry]'))) {
    info.packageManager = 'poetry';
  } else if (pipfileFile) {
    info.packageManager = 'pipenv';
  } else if (requirementsFile) {
    info.packageManager = 'pip';
  } else if (setupPyFile || setupCfgFile) {
    info.packageManager = 'setuptools';
  }

  // Collect all dependency sources
  const dependencies = new Set();

  if (requirementsFile) {
    // Parse requirements.txt
    const lines = requirementsFile.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Extract package name (before ==, >=, etc.)
        const match = trimmed.match(/^([a-zA-Z0-9._-]+)/);
        if (match) dependencies.add(match[1].toLowerCase());
      }
    }
  }

  if (pyprojectFile) {
    // Parse pyproject.toml dependencies
    const content = pyprojectFile.content;
    
    // Poetry dependencies
    const poetryDepsMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (poetryDepsMatch) {
      const depLines = poetryDepsMatch[1].split('\n');
      for (const line of depLines) {
        const match = line.match(/^([a-zA-Z0-9._-]+)\s*=/);
        if (match) dependencies.add(match[1].toLowerCase());
      }
    }

    // Poetry dev dependencies
    const poetryDevDepsMatch = content.match(/\[tool\.poetry\.dev-dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (poetryDevDepsMatch) {
      const depLines = poetryDevDepsMatch[1].split('\n');
      for (const line of depLines) {
        const match = line.match(/^([a-zA-Z0-9._-]+)\s*=/);
        if (match) dependencies.add(match[1].toLowerCase());
      }
    }

    // PEP 621 dependencies
    const pep621DepsMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (pep621DepsMatch) {
      const depStr = pep621DepsMatch[1];
      const depMatches = depStr.matchAll(/"([a-zA-Z0-9._-]+)/g);
      for (const match of depMatches) {
        dependencies.add(match[1].toLowerCase());
      }
    }
  }

  if (setupPyFile) {
    // Parse setup.py for install_requires
    const installReqMatch = setupPyFile.content.match(/install_requires\s*=\s*\[([\s\S]*?)\]/);
    if (installReqMatch) {
      const depStr = installReqMatch[1];
      const depMatches = depStr.matchAll(/['"]([a-zA-Z0-9._-]+)/g);
      for (const match of depMatches) {
        dependencies.add(match[1].toLowerCase());
      }
    }
  }

  if (pipfileFile) {
    // Parse Pipfile
    const packagesMatch = pipfileFile.content.match(/\[packages\]([\s\S]*?)(?=\n\[|$)/);
    if (packagesMatch) {
      const depLines = packagesMatch[1].split('\n');
      for (const line of depLines) {
        const match = line.match(/^([a-zA-Z0-9._-]+)\s*=/);
        if (match) dependencies.add(match[1].toLowerCase());
      }
    }

    // Parse Pipfile dev-packages
    const devPackagesMatch = pipfileFile.content.match(/\[dev-packages\]([\s\S]*?)(?=\n\[|$)/);
    if (devPackagesMatch) {
      const depLines = devPackagesMatch[1].split('\n');
      for (const line of depLines) {
        const match = line.match(/^([a-zA-Z0-9._-]+)\s*=/);
        if (match) dependencies.add(match[1].toLowerCase());
      }
    }
  }

  const depsArray = Array.from(dependencies);

  // Detect frameworks
  const frameworkMap = {
    'django': 'Django',
    'flask': 'Flask',
    'fastapi': 'FastAPI',
    'tornado': 'Tornado',
    'bottle': 'Bottle',
    'pyramid': 'Pyramid',
    'sanic': 'Sanic',
    'starlette': 'Starlette',
    'aiohttp': 'aiohttp',
    'cherrypy': 'CherryPy',
    'falcon': 'Falcon',
    'responder': 'Responder',
    'dash': 'Dash',
    'streamlit': 'Streamlit',
    'gradio': 'Gradio',
  };

  for (const [dep, name] of Object.entries(frameworkMap)) {
    if (depsArray.includes(dep)) {
      info.frameworks.push(name);
    }
  }

  // Detect testing frameworks
  const testingMap = {
    'pytest': 'pytest',
    'unittest2': 'unittest2',
    'nose': 'nose',
    'nose2': 'nose2',
    'tox': 'tox',
    'coverage': 'coverage',
    'pytest-cov': 'pytest-cov',
  };

  for (const [dep, name] of Object.entries(testingMap)) {
    if (depsArray.includes(dep)) {
      info.testing.push(name);
    }
  }

  // unittest is in stdlib, check for test files
  if (files.some(f => f.relativePath.includes('test') && f.ext === '.py')) {
    if (!info.testing.includes('pytest') && !info.testing.includes('nose')) {
      info.testing.push('unittest');
    }
  }

  // Detect type checking
  const typeCheckMap = {
    'mypy': 'mypy',
    'pyright': 'pyright',
    'pyre-check': 'pyre',
    'pytype': 'pytype',
  };

  for (const [dep, name] of Object.entries(typeCheckMap)) {
    if (depsArray.includes(dep)) {
      info.typeChecking.push(name);
    }
  }

  // Detect linting/formatting tools
  const lintingMap = {
    'ruff': 'ruff',
    'flake8': 'flake8',
    'pylint': 'pylint',
    'black': 'black',
    'autopep8': 'autopep8',
    'yapf': 'yapf',
    'isort': 'isort',
    'bandit': 'bandit',
  };

  for (const [dep, name] of Object.entries(lintingMap)) {
    if (depsArray.includes(dep)) {
      info.linting.push(name);
    }
  }

  return info;
}

/**
 * Build project info string for prompt
 */
export function buildProjectInfo(files) {
  const parts = [];

  // Try Node.js detection
  const nodeInfo = detectNodeProject(files);
  if (nodeInfo) {
    parts.push(`Type: Node.js (${nodeInfo.moduleType})`);
    if (nodeInfo.dependencies.length > 0) {
      parts.push(`Dependencies: ${nodeInfo.dependencies.join(', ')}`);
    }
  }

  // Try Python detection
  const pythonInfo = detectPythonProject(files);
  if (pythonInfo) {
    parts.push('Type: Python');
    
    if (pythonInfo.packageManager) {
      parts.push(`Package Manager: ${pythonInfo.packageManager}`);
    }
    
    if (pythonInfo.frameworks.length > 0) {
      parts.push(`Frameworks: ${pythonInfo.frameworks.join(', ')}`);
    }
    
    if (pythonInfo.testing.length > 0) {
      parts.push(`Testing: ${pythonInfo.testing.join(', ')}`);
    }
    
    if (pythonInfo.typeChecking.length > 0) {
      parts.push(`Type Checking: ${pythonInfo.typeChecking.join(', ')}`);
    }
    
    if (pythonInfo.linting.length > 0) {
      parts.push(`Linting: ${pythonInfo.linting.join(', ')}`);
    }
  }

  return parts.length > 0 ? parts.join(' | ') : '';
}

export const detector = {
  detectNodeProject,
  detectPythonProject,
  buildProjectInfo,
};
