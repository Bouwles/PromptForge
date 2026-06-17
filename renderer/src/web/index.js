// Web implementation of the window.api surface. Composes IndexedDB storage, the
// OpenRouter-via-Worker backend, and the File System Access scanner so the React
// app behaves identically to the Electron build.

import * as idb from './idb.js';
import { createBackend } from './backend.js';
import * as fsweb from './scanner.js';
import { buildMessages, buildActionMessages, buildProjectContext } from '../lib/prompt-engine.mjs';

async function runGeneration(mode, payload, handlers = {}) {
  const settings = await idb.getSettings();
  if (!settings.model) throw new Error('No model selected. Choose a model in Settings.');

  let messages;
  if (mode === 'action') {
    messages = buildActionMessages(payload);
  } else {
    let projectContext = payload.projectContext || '';
    if (payload.project) {
      projectContext = buildProjectContext(payload.project, payload.files || []);
    }
    messages = buildMessages({ ...payload, projectContext });
  }

  const backend = createBackend(settings.endpoint);
  return backend.chatStream({
    model: settings.model,
    temperature: settings.temperature,
    messages,
    onToken: handlers.onToken,
  });
}

export function createWebApi() {
  return {
    // Models / connection
    async listModels() {
      const settings = await idb.getSettings();
      const backend = createBackend(settings.endpoint);
      try {
        return { ok: true, models: await backend.listModels() };
      } catch (err) {
        return { ok: false, error: err.message, models: [] };
      }
    },
    async testConnection() {
      const settings = await idb.getSettings();
      return createBackend(settings.endpoint).testConnection();
    },

    // Settings
    getSettings: () => idb.getSettings(),
    setSetting: (key, value) => idb.setSetting(key, value),

    // Prompts / history
    savePrompt: (row) => idb.savePrompt(row),
    listPrompts: (filter) => idb.listPrompts(filter || {}),
    getPrompt: (id) => idb.getPrompt(id),
    updatePrompt: (id, patch) => idb.updatePrompt(id, patch),
    deletePrompt: (id) => idb.deletePrompt(id),
    toggleFavorite: (id) => idb.toggleFavorite(id),
    duplicatePrompt: (id) => idb.duplicatePrompt(id),
    searchPrompts: (args) => idb.searchPrompts(args || {}),

    // Projects
    createProject: (data) => idb.createProject(data),
    getProject: (id) => idb.getProject(id),
    listProjects: () => idb.listProjects(),
    updateProject: (id, patch) => idb.updateProject(id, patch),
    deleteProject: (id) => idb.deleteProject(id),
    listPinnedFiles: (id) => idb.listPinnedFiles(id),
    setPinnedFiles: (id, paths) => idb.setPinnedFiles(id, paths),

    // Filesystem (File System Access API)
    async pickFolder() {
      try {
        return await fsweb.pickFolder();
      } catch (err) {
        // User cancelled the picker, or unsupported browser.
        if (err && err.name === 'AbortError') return null;
        throw err;
      }
    },
    scanFolder: (folderPath, ignoredFolders) => fsweb.scanFolder(folderPath, ignoredFolders),
    readFile: (fullPath) => fsweb.readFile(fullPath),

    // Generation
    generate: (payload, handlers) => runGeneration('initial', payload, handlers),
    generateAction: (payload, handlers) => runGeneration('action', payload, handlers),
  };
}
