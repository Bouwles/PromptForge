'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.vite',
  'out',
  '.cache',
  '.turbo',
  '.svelte-kit',
  'release',
  '.idea',
  '.vscode',
  '__pycache__',
  'venv',
  '.venv',
];

const LOCK_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']);

const MEDIA_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
  '.mp4', '.mov', '.avi', '.webm', '.mkv',
  '.mp3', '.wav', '.ogg', '.flac',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.glb', '.gltf', '.fbx', '.obj', '.wasm',
  '.pdf', '.ttf', '.otf', '.woff', '.woff2', '.eot',
]);

const MAX_DEPTH = 7;
const MAX_NODES = 4000;

function scanFolder(folderPath, { ignoredFolders = [] } = {}) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }
  const ignore = new Set([...DEFAULT_IGNORES, ...ignoredFolders]);
  const counts = { files: 0, dirs: 0, nodes: 0, truncated: false };
  const allFiles = []; // relative posix paths

  const tree = walk(folderPath, folderPath, ignore, 0, counts, allFiles);

  const pkg = readJsonSafe(path.join(folderPath, 'package.json'));
  const readme = readReadme(folderPath);
  const summary = buildSummary(folderPath, pkg, allFiles);

  return {
    root: path.basename(folderPath) || folderPath,
    folderPath,
    tree,
    summary,
    readme,
    fileCount: counts.files,
    dirCount: counts.dirs,
    truncated: counts.truncated,
    files: allFiles,
  };
}

function walk(dir, root, ignore, depth, counts, allFiles) {
  if (depth > MAX_DEPTH || counts.nodes >= MAX_NODES) {
    counts.truncated = true;
    return [];
  }
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  // dirs first, then files, alphabetical
  entries.sort((a, b) => {
    const ad = a.isDirectory() ? 0 : 1;
    const bd = b.isDirectory() ? 0 : 1;
    if (ad !== bd) return ad - bd;
    return a.name.localeCompare(b.name);
  });

  const out = [];
  for (const e of entries) {
    if (counts.nodes >= MAX_NODES) {
      counts.truncated = true;
      break;
    }
    if (e.name.startsWith('.git')) continue;
    const full = path.join(dir, e.name);
    const rel = toPosix(path.relative(root, full));

    if (e.isDirectory()) {
      if (ignore.has(e.name)) continue;
      counts.dirs += 1;
      counts.nodes += 1;
      const children = walk(full, root, ignore, depth + 1, counts, allFiles);
      out.push({ name: e.name, path: rel, type: 'dir', children });
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (MEDIA_EXT.has(ext)) continue;
      if (LOCK_FILES.has(e.name)) continue;
      counts.files += 1;
      counts.nodes += 1;
      out.push({ name: e.name, path: rel, type: 'file' });
      allFiles.push(rel);
    }
  }
  return out;
}

function buildSummary(root, pkg, files) {
  const summary = {
    framework: 'Unknown',
    language: detectLanguage(files),
    packageManager: detectPackageManager(root),
    scripts: {},
    dependencies: [],
    devDependencies: [],
    entryFiles: [],
    components: [],
    routes: [],
    dbFiles: [],
    dataFiles: [],
    configFiles: [],
    tests: [],
  };

  if (pkg) {
    summary.scripts = pkg.scripts || {};
    summary.dependencies = Object.keys(pkg.dependencies || {});
    summary.devDependencies = Object.keys(pkg.devDependencies || {});
    summary.framework = detectFramework(summary.dependencies.concat(summary.devDependencies));
  }

  const lower = files.map((f) => ({ f, l: f.toLowerCase() }));

  const ENTRY = /(^|\/)(main|index|app|server)\.(jsx?|tsx?|mjs)$/i;
  const CONFIG = /(^|\/)(vite\.config|webpack\.config|tsconfig|next\.config|tailwind\.config|\.env|babel\.config|rollup\.config|svelte\.config|astro\.config)/i;
  const DB = /(firebase|supabase|prisma|mongoose|sequelize|drizzle|knex|\.db$|database|schema\.prisma|sqlite)/i;
  const DATA = /(^|\/)(data|content)\/.*\.(json|ya?ml|csv|md)$/i;

  for (const { f, l } of lower) {
    if (ENTRY.test(f)) summary.entryFiles.push(f);
    if (/\/components?\//.test(l)) summary.components.push(f);
    if (/\/(routes?|pages?|app)\//.test(l)) summary.routes.push(f);
    if (DB.test(l)) summary.dbFiles.push(f);
    if (DATA.test(l)) summary.dataFiles.push(f);
    if (CONFIG.test(f)) summary.configFiles.push(f);
    if (/\.(test|spec)\.[jt]sx?$/.test(l) || /\/__tests__\//.test(l)) summary.tests.push(f);
  }

  // de-dupe + cap each list for prompt friendliness
  for (const k of ['entryFiles', 'components', 'routes', 'dbFiles', 'dataFiles', 'configFiles', 'tests']) {
    summary[k] = uniqueCap(summary[k], 25);
  }
  return summary;
}

function detectFramework(deps) {
  const has = (n) => deps.includes(n);
  if (has('next')) return 'Next.js';
  if (has('nuxt')) return 'Nuxt';
  if (has('@angular/core')) return 'Angular';
  if (has('svelte')) return 'Svelte';
  if (has('vue')) return 'Vue';
  if (has('react') && has('react-native')) return 'React Native';
  if (has('react')) return 'React';
  if (has('express') || has('fastify') || has('koa')) return 'Node/Express';
  if (has('electron')) return 'Electron';
  if (has('three')) return 'Three.js';
  return deps.length ? 'JavaScript/Node' : 'Unknown';
}

function detectLanguage(files) {
  const ts = files.some((f) => /\.tsx?$/.test(f));
  const py = files.some((f) => /\.py$/.test(f));
  const js = files.some((f) => /\.[cm]?jsx?$/.test(f));
  if (ts) return 'TypeScript';
  if (py) return 'Python';
  if (js) return 'JavaScript';
  return 'Unknown';
}

function detectPackageManager(root) {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(root, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(root, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function readReadme(root) {
  const candidates = ['README.md', 'readme.md', 'README.markdown', 'README.txt', 'README'];
  for (const c of candidates) {
    const p = path.join(root, c);
    if (fs.existsSync(p)) {
      let raw = '';
      try {
        raw = fs.readFileSync(p, 'utf8');
      } catch {
        return null;
      }
      const description = firstParagraph(raw);
      return { file: c, description, raw: raw.slice(0, 4000) };
    }
  }
  return null;
}

function firstParagraph(md) {
  const lines = md.split('\n');
  let headingFallback = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('![') || t.startsWith('[![')) continue; // badges/images
    if (/^#{1,6}\s/.test(t)) {
      if (!headingFallback) headingFallback = t.replace(/^#{1,6}\s*/, '').slice(0, 280);
      continue; // prefer a real paragraph over the title
    }
    return t.slice(0, 280);
  }
  return headingFallback;
}

function uniqueCap(arr, n) {
  return [...new Set(arr)].slice(0, n);
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

module.exports = { scanFolder, DEFAULT_IGNORES };
