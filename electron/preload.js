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
  listModels: () => ipcRenderer.invoke('ollama:list'),
  testConnection: () => ipcRenderer.invoke('ollama:test'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  savePrompt: (row) => ipcRenderer.invoke('prompt:save', row),
  listPrompts: (filter) => ipcRenderer.invoke('prompt:list', filter),
  deletePrompt: (id) => ipcRenderer.invoke('prompt:delete', id),
  generate: (payload, handlers) => runGeneration('initial', payload, handlers),
  generateAction: (payload, handlers) => runGeneration('action', payload, handlers),
});
