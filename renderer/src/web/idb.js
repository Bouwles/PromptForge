// IndexedDB persistence for the web build. Mirrors the API and return shapes of
// electron/db.js so the renderer/store can't tell which backend it's talking to.

const DB_NAME = 'promptforge';
const DB_VERSION = 1;
const STORES = {
  settings: 'settings', // key/value
  prompts: 'prompts', // keyPath: id
  projects: 'projects', // keyPath: id
  pinned: 'pinned', // keyPath: projectId -> { projectId, paths: [] }
  handles: 'handles', // key/value: folderKey -> FileSystemDirectoryHandle
};

const DEFAULT_BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) || '';

const DEFAULT_SETTINGS = {
  endpoint: DEFAULT_BACKEND_URL, // in web mode, "endpoint" is the backend (Worker) URL
  model: '',
  temperature: 0.4,
  theme: 'dark',
  clarifyBeforeGenerate: false,
};

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.settings)) db.createObjectStore(STORES.settings);
      if (!db.objectStoreNames.contains(STORES.prompts)) db.createObjectStore(STORES.prompts, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.projects)) db.createObjectStore(STORES.projects, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.pinned)) db.createObjectStore(STORES.pinned, { keyPath: 'projectId' });
      if (!db.objectStoreNames.contains(STORES.handles)) db.createObjectStore(STORES.handles);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        let out;
        Promise.resolve(fn(s)).then((v) => {
          out = v;
        }).catch(reject);
        t.oncomplete = () => resolve(out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

const reqP = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---- Settings ----

export async function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  await tx(STORES.settings, 'readonly', async (s) => {
    const keys = await reqP(s.getAllKeys());
    const vals = await reqP(s.getAll());
    keys.forEach((k, i) => {
      out[k] = vals[i];
    });
  });
  // ponytail: baked Worker URL always wins on the deployed site, so a stale
  // saved endpoint (e.g. localhost from dev) can't break a Pages build.
  if (DEFAULT_BACKEND_URL) out.endpoint = DEFAULT_BACKEND_URL;
  return out;
}

export async function setSetting(key, value) {
  await tx(STORES.settings, 'readwrite', (s) => reqP(s.put(value, key)));
  return getSettings();
}

// ---- Prompts ----

function untitled(row) {
  const src = (row.inputText || row.promptText || 'Untitled prompt').trim();
  const firstLine = src.split('\n')[0];
  return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine || 'Untitled prompt';
}

export async function savePrompt(row = {}) {
  const rec = {
    id: row.id || uuid(),
    projectId: row.projectId ?? null,
    title: row.title || untitled(row),
    promptText: row.promptText || '',
    inputText: row.inputText || '',
    targetAgent: row.targetAgent || '',
    promptType: row.promptType || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    favorite: row.favorite ? true : false,
    createdAt: row.createdAt || Date.now(),
  };
  await tx(STORES.prompts, 'readwrite', (s) => reqP(s.put(rec)));
  return rec;
}

export async function listPrompts({ projectId } = {}) {
  const all = await tx(STORES.prompts, 'readonly', (s) => reqP(s.getAll()));
  let rows = all;
  if (projectId === null) rows = all.filter((p) => p.projectId == null);
  else if (projectId !== undefined) rows = all.filter((p) => p.projectId === projectId);
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPrompt(id) {
  const r = await tx(STORES.prompts, 'readonly', (s) => reqP(s.get(id)));
  return r || null;
}

export async function updatePrompt(id, patch = {}) {
  const cur = await getPrompt(id);
  if (!cur) return null;
  const next = {
    ...cur,
    title: patch.title ?? cur.title,
    promptText: patch.promptText ?? cur.promptText,
    inputText: patch.inputText ?? cur.inputText,
    targetAgent: patch.targetAgent ?? cur.targetAgent,
    promptType: patch.promptType ?? cur.promptType,
    tags: patch.tags !== undefined ? patch.tags : cur.tags,
    favorite: patch.favorite !== undefined ? Boolean(patch.favorite) : cur.favorite,
  };
  await tx(STORES.prompts, 'readwrite', (s) => reqP(s.put(next)));
  return next;
}

export async function deletePrompt(id) {
  await tx(STORES.prompts, 'readwrite', (s) => reqP(s.delete(id)));
  return { ok: true };
}

export async function toggleFavorite(id) {
  const cur = await getPrompt(id);
  if (!cur) return null;
  return updatePrompt(id, { favorite: !cur.favorite });
}

export async function duplicatePrompt(id) {
  const cur = await getPrompt(id);
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

export async function searchPrompts({ query = '', projectId } = {}) {
  const all = await listPrompts({ projectId });
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((p) =>
    [p.title, p.promptText, p.inputText, p.promptType, p.targetAgent]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(q))
  );
}

// ---- Pinned files ----

export async function listPinnedFiles(projectId) {
  const rec = await tx(STORES.pinned, 'readonly', (s) => reqP(s.get(projectId)));
  return rec && Array.isArray(rec.paths) ? [...rec.paths].sort() : [];
}

export async function setPinnedFiles(projectId, paths = []) {
  await tx(STORES.pinned, 'readwrite', (s) => reqP(s.put({ projectId, paths })));
  return listPinnedFiles(projectId);
}

// ---- Projects ----

async function countPrompts(projectId) {
  const rows = await listPrompts({ projectId });
  return rows.length;
}

export async function createProject(p = {}) {
  const now = Date.now();
  const rec = {
    id: p.id || uuid(),
    name: p.name || 'Untitled Project',
    description: p.description || '',
    folderPath: p.folderPath || '',
    techStack: Array.isArray(p.techStack) ? p.techStack : [],
    targetAgent: p.targetAgent || 'Claude Code',
    rules: p.rules || '',
    restrictions: p.restrictions || '',
    importantSystems: p.importantSystems || '',
    ignoredFolders: Array.isArray(p.ignoredFolders) ? p.ignoredFolders : [],
    memory: p.memory || '',
    createdAt: now,
    updatedAt: now,
  };
  await tx(STORES.projects, 'readwrite', (s) => reqP(s.put(rec)));
  return getProject(rec.id);
}

export async function getProject(id) {
  const r = await tx(STORES.projects, 'readonly', (s) => reqP(s.get(id)));
  if (!r) return null;
  return { ...r, pinnedFiles: await listPinnedFiles(id), promptCount: await countPrompts(id) };
}

export async function listProjects() {
  const rows = await tx(STORES.projects, 'readonly', (s) => reqP(s.getAll()));
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  const out = [];
  for (const r of rows) out.push({ ...r, promptCount: await countPrompts(r.id) });
  return out;
}

export async function updateProject(id, patch = {}) {
  const cur = await tx(STORES.projects, 'readonly', (s) => reqP(s.get(id)));
  if (!cur) return null;
  const next = {
    ...cur,
    name: patch.name ?? cur.name,
    description: patch.description ?? cur.description,
    folderPath: patch.folderPath ?? cur.folderPath,
    techStack: patch.techStack !== undefined ? patch.techStack : cur.techStack,
    targetAgent: patch.targetAgent ?? cur.targetAgent,
    rules: patch.rules ?? cur.rules,
    restrictions: patch.restrictions ?? cur.restrictions,
    importantSystems: patch.importantSystems ?? cur.importantSystems,
    ignoredFolders: patch.ignoredFolders !== undefined ? patch.ignoredFolders : cur.ignoredFolders,
    memory: patch.memory ?? cur.memory,
    updatedAt: Date.now(),
  };
  await tx(STORES.projects, 'readwrite', (s) => reqP(s.put(next)));
  return getProject(id);
}

export async function deleteProject(id) {
  await tx(STORES.projects, 'readwrite', (s) => reqP(s.delete(id)));
  await tx(STORES.pinned, 'readwrite', (s) => reqP(s.delete(id)));
  // Cascade: drop this project's prompts (mirrors ON DELETE CASCADE in db.js).
  const prompts = await listPrompts({ projectId: id });
  await tx(STORES.prompts, 'readwrite', async (s) => {
    for (const p of prompts) await reqP(s.delete(p.id));
  });
  return { ok: true };
}

// ---- Directory handles (File System Access API) ----
// Persist picked folder handles so a project's folder survives page reloads.

export async function saveHandle(key, handle) {
  await tx(STORES.handles, 'readwrite', (s) => reqP(s.put(handle, key)));
}

export async function getHandle(key) {
  return tx(STORES.handles, 'readonly', (s) => reqP(s.get(key)));
}

export { DEFAULT_SETTINGS };
