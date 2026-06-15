'use strict';

const { contextBridge, ipcRenderer } = require('electron');

let reqCounter = 0;
function nextId() {
  reqCounter += 1;
  return `r${Date.now()}_${reqCounter}`;
}

/**
 * Run a streaming generation. Returns a promise resolving to the full text.
 * Calls handlers.onToken(delta) as tokens arrive.
 */
function runGeneration(mode, payload, handlers = {}) {
  const requestId = nextId();
  const tokenCh = `generate:token:${requestId}`;
  const doneCh = `generate:done:${requestId}`;
  const errCh = `generate:error:${requestId}`;

  return new Promise((resolve, reject) => {
    const onToken = (_e, t) => handlers.onToken && handlers.onToken(t);
    const cleanup = () => {
      ipcRenderer.removeListener(tokenCh, onToken);
      ipcRenderer.removeListener(doneCh, onDone);
      ipcRenderer.removeListener(errCh, onErr);
    };
    const onDone = (_e, full) => {
      cleanup();
      resolve(full);
    };
    const onErr = (_e, msg) => {
      cleanup();
      reject(new Error(msg));
    };
    ipcRenderer.on(tokenCh, onToken);
    ipcRenderer.once(doneCh, onDone);
    ipcRenderer.once(errCh, onErr);
    ipcRenderer.invoke('generate:run', { requestId, mode, payload });
  });
}

contextBridge.exposeInMainWorld('api', {
  // Ollama
  listModels: () => ipcRenderer.invoke('ollama:list'),
  testConnection: () => ipcRenderer.invoke('ollama:test'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Prompts / history
  savePrompt: (row) => ipcRenderer.invoke('prompt:save', row),
  listPrompts: (filter) => ipcRenderer.invoke('prompt:list', filter),
  getPrompt: (id) => ipcRenderer.invoke('prompt:get', id),
  updatePrompt: (id, patch) => ipcRenderer.invoke('prompt:update', id, patch),
  deletePrompt: (id) => ipcRenderer.invoke('prompt:delete', id),
  toggleFavorite: (id) => ipcRenderer.invoke('prompt:toggleFavorite', id),
  duplicatePrompt: (id) => ipcRenderer.invoke('prompt:duplicate', id),
  searchPrompts: (args) => ipcRenderer.invoke('prompt:search', args),

  // Projects
  createProject: (data) => ipcRenderer.invoke('project:create', data),
  getProject: (id) => ipcRenderer.invoke('project:get', id),
  listProjects: () => ipcRenderer.invoke('project:list'),
  updateProject: (id, patch) => ipcRenderer.invoke('project:update', id, patch),
  deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
  listPinnedFiles: (id) => ipcRenderer.invoke('project:pinned:list', id),
  setPinnedFiles: (id, paths) => ipcRenderer.invoke('project:pinned:set', id, paths),

  // Filesystem
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  scanFolder: (folderPath, ignoredFolders) =>
    ipcRenderer.invoke('project:scan', folderPath, ignoredFolders),
  readFile: (fullPath) => ipcRenderer.invoke('project:readFile', fullPath),

  // Generation
  generate: (payload, handlers) => runGeneration('initial', payload, handlers),
  generateAction: (payload, handlers) => runGeneration('action', payload, handlers),
});
