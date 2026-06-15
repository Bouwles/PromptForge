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

module.exports = {
  initDb,
  getDb,
  getSettings,
  setSetting,
  savePrompt,
  listPrompts,
  deletePrompt,
  DEFAULT_SETTINGS,
};
