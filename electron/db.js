'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Database } = require('node-sqlite3-wasm');
const { getDbPath } = require('./paths');

let db = null;

const DEFAULT_SETTINGS = {
  endpoint: 'http://localhost:11434',
  model: '',
  temperature: 0.4,
  theme: 'dark',
  clarifyBeforeGenerate: false,
};

function initDb(dbPath = getDbPath()) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  db = new Database(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  migrate();
  return db;
}

function getDb() {
  if (!db) initDb();
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      description      TEXT,
      folderPath       TEXT,
      techStack        TEXT,
      targetAgent      TEXT,
      rules            TEXT,
      restrictions     TEXT,
      importantSystems TEXT,
      ignoredFolders   TEXT,
      memory           TEXT,
      createdAt        INTEGER,
      updatedAt        INTEGER
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id          TEXT PRIMARY KEY,
      projectId   TEXT,
      title       TEXT,
      promptText  TEXT,
      inputText   TEXT,
      targetAgent TEXT,
      promptType  TEXT,
      tags        TEXT,
      favorite    INTEGER DEFAULT 0,
      createdAt   INTEGER,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pinned_files (
      id        TEXT PRIMARY KEY,
      projectId TEXT,
      path      TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_project ON prompts(projectId);
  `);
}

function id() {
  return crypto.randomUUID();
}

// ---- Settings ----

function getSettings() {
  const rows = getDb().all('SELECT key, value FROM settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      out[r.key] = r.value;
    }
  }
  return out;
}

function setSetting(key, value) {
  getDb().run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, JSON.stringify(value)]
  );
  return getSettings();
}

// ---- Prompts ----

function savePrompt(row = {}) {
  const rec = {
    id: row.id || id(),
    projectId: row.projectId ?? null,
    title: row.title || untitled(row),
    promptText: row.promptText || '',
    inputText: row.inputText || '',
    targetAgent: row.targetAgent || '',
    promptType: row.promptType || '',
    tags: JSON.stringify(row.tags || []),
    favorite: row.favorite ? 1 : 0,
    createdAt: row.createdAt || Date.now(),
  };
  getDb().run(
    `INSERT INTO prompts
      (id, projectId, title, promptText, inputText, targetAgent, promptType, tags, favorite, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.id,
      rec.projectId,
      rec.title,
      rec.promptText,
      rec.inputText,
      rec.targetAgent,
      rec.promptType,
      rec.tags,
      rec.favorite,
      rec.createdAt,
    ]
  );
  return decodePrompt(rec);
}

function listPrompts({ projectId } = {}) {
  let rows;
  if (projectId === undefined) {
    rows = getDb().all('SELECT * FROM prompts ORDER BY createdAt DESC');
  } else if (projectId === null) {
    rows = getDb().all('SELECT * FROM prompts WHERE projectId IS NULL ORDER BY createdAt DESC');
  } else {
    rows = getDb().all('SELECT * FROM prompts WHERE projectId = ? ORDER BY createdAt DESC', [
      projectId,
    ]);
  }
  return rows.map(decodePrompt);
}

function deletePrompt(promptId) {
  getDb().run('DELETE FROM prompts WHERE id = ?', [promptId]);
  return { ok: true };
}

function decodePrompt(r) {
  let tags = [];
  try {
    tags = JSON.parse(r.tags || '[]');
  } catch {
    tags = [];
  }
  return { ...r, tags, favorite: Boolean(r.favorite) };
}

function untitled(row) {
  const src = (row.inputText || row.promptText || 'Untitled prompt').trim();
  const firstLine = src.split('\n')[0];
  return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine || 'Untitled prompt';
}

function getPrompt(promptId) {
  const r = getDb().get('SELECT * FROM prompts WHERE id = ?', [promptId]);
  return r ? decodePrompt(r) : null;
}

function updatePrompt(promptId, patch = {}) {
  const cur = getDb().get('SELECT * FROM prompts WHERE id = ?', [promptId]);
  if (!cur) return null;
  const next = {
    title: patch.title ?? cur.title,
    promptText: patch.promptText ?? cur.promptText,
    inputText: patch.inputText ?? cur.inputText,
    targetAgent: patch.targetAgent ?? cur.targetAgent,
    promptType: patch.promptType ?? cur.promptType,
    tags: patch.tags !== undefined ? JSON.stringify(patch.tags) : cur.tags,
    favorite: patch.favorite !== undefined ? (patch.favorite ? 1 : 0) : cur.favorite,
  };
  getDb().run(
    `UPDATE prompts SET title=?, promptText=?, inputText=?, targetAgent=?, promptType=?, tags=?, favorite=?
     WHERE id=?`,
    [
      next.title,
      next.promptText,
      next.inputText,
      next.targetAgent,
      next.promptType,
      next.tags,
      next.favorite,
      promptId,
    ]
  );
  return getPrompt(promptId);
}

function toggleFavorite(promptId) {
  const cur = getDb().get('SELECT favorite FROM prompts WHERE id = ?', [promptId]);
  if (!cur) return null;
  const fav = cur.favorite ? 0 : 1;
  getDb().run('UPDATE prompts SET favorite=? WHERE id=?', [fav, promptId]);
  return getPrompt(promptId);
}

function duplicatePrompt(promptId) {
  const cur = getPrompt(promptId);
  if (!cur) return null;
  return savePrompt({
    projectId: cur.projectId,
    title: `${cur.title} (copy)`,
    promptText: cur.promptText,
    inputText: cur.inputText,
    targetAgent: cur.targetAgent,
    promptType: cur.promptType,
    tags: cur.tags,
  });
}

function searchPrompts({ query = '', projectId } = {}) {
  const all = listPrompts({ projectId });
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((p) =>
    [p.title, p.promptText, p.inputText, p.promptType, p.targetAgent]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(q))
  );
}

// ---- Projects ----

function decodeProject(r) {
  const parse = (v, fb) => {
    try {
      return JSON.parse(v);
    } catch {
      return fb;
    }
  };
  return {
    ...r,
    techStack: parse(r.techStack, []),
    ignoredFolders: parse(r.ignoredFolders, []),
  };
}

function createProject(p = {}) {
  const now = Date.now();
  const rec = {
    id: p.id || id(),
    name: p.name || 'Untitled Project',
    description: p.description || '',
    folderPath: p.folderPath || '',
    techStack: JSON.stringify(p.techStack || []),
    targetAgent: p.targetAgent || 'Claude Code',
    rules: p.rules || '',
    restrictions: p.restrictions || '',
    importantSystems: p.importantSystems || '',
    ignoredFolders: JSON.stringify(p.ignoredFolders || []),
    memory: p.memory || '',
    createdAt: now,
    updatedAt: now,
  };
  getDb().run(
    `INSERT INTO projects
      (id, name, description, folderPath, techStack, targetAgent, rules, restrictions,
       importantSystems, ignoredFolders, memory, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.id,
      rec.name,
      rec.description,
      rec.folderPath,
      rec.techStack,
      rec.targetAgent,
      rec.rules,
      rec.restrictions,
      rec.importantSystems,
      rec.ignoredFolders,
      rec.memory,
      rec.createdAt,
      rec.updatedAt,
    ]
  );
  return getProject(rec.id);
}

function getProject(projectId) {
  const r = getDb().get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!r) return null;
  const proj = decodeProject(r);
  proj.pinnedFiles = listPinnedFiles(projectId);
  const c = getDb().get('SELECT COUNT(*) AS n FROM prompts WHERE projectId = ?', [projectId]);
  proj.promptCount = c ? c.n : 0;
  return proj;
}

function listProjects() {
  const rows = getDb().all('SELECT * FROM projects ORDER BY updatedAt DESC');
  return rows.map((r) => {
    const proj = decodeProject(r);
    const c = getDb().get('SELECT COUNT(*) AS n FROM prompts WHERE projectId = ?', [r.id]);
    proj.promptCount = c ? c.n : 0;
    return proj;
  });
}

function updateProject(projectId, patch = {}) {
  const cur = getDb().get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!cur) return null;
  const enc = (v, curVal) =>
    v !== undefined ? JSON.stringify(v) : curVal;
  const next = {
    name: patch.name ?? cur.name,
    description: patch.description ?? cur.description,
    folderPath: patch.folderPath ?? cur.folderPath,
    techStack: enc(patch.techStack, cur.techStack),
    targetAgent: patch.targetAgent ?? cur.targetAgent,
    rules: patch.rules ?? cur.rules,
    restrictions: patch.restrictions ?? cur.restrictions,
    importantSystems: patch.importantSystems ?? cur.importantSystems,
    ignoredFolders: enc(patch.ignoredFolders, cur.ignoredFolders),
    memory: patch.memory ?? cur.memory,
    updatedAt: Date.now(),
  };
  getDb().run(
    `UPDATE projects SET
      name=?, description=?, folderPath=?, techStack=?, targetAgent=?, rules=?, restrictions=?,
      importantSystems=?, ignoredFolders=?, memory=?, updatedAt=?
     WHERE id=?`,
    [
      next.name,
      next.description,
      next.folderPath,
      next.techStack,
      next.targetAgent,
      next.rules,
      next.restrictions,
      next.importantSystems,
      next.ignoredFolders,
      next.memory,
      next.updatedAt,
      projectId,
    ]
  );
  return getProject(projectId);
}

function deleteProject(projectId) {
  getDb().run('DELETE FROM projects WHERE id = ?', [projectId]);
  return { ok: true };
}

// ---- Pinned files ----

function listPinnedFiles(projectId) {
  return getDb()
    .all('SELECT path FROM pinned_files WHERE projectId = ? ORDER BY path', [projectId])
    .map((r) => r.path);
}

function setPinnedFiles(projectId, paths = []) {
  const dbi = getDb();
  dbi.run('DELETE FROM pinned_files WHERE projectId = ?', [projectId]);
  for (const p of paths) {
    dbi.run('INSERT INTO pinned_files (id, projectId, path) VALUES (?, ?, ?)', [id(), projectId, p]);
  }
  return listPinnedFiles(projectId);
}

module.exports = {
  initDb,
  getDb,
  getSettings,
  setSetting,
  savePrompt,
  listPrompts,
  getPrompt,
  updatePrompt,
  deletePrompt,
  toggleFavorite,
  duplicatePrompt,
  searchPrompts,
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  listPinnedFiles,
  setPinnedFiles,
  DEFAULT_SETTINGS,
};
