'use strict';

const fs = require('node:fs');
const { ipcMain, dialog, BrowserWindow } = require('electron');
const db = require('./db');
const { createOllama } = require('./ollama');
const { buildMessages, buildActionMessages, buildProjectContext } = require('./prompt-engine');
const { scanFolder } = require('./scanner');

const FILE_SNIPPET_LIMIT = 8000; // chars included from a single file

function clientFromSettings() {
  const s = db.getSettings();
  return { ollama: createOllama({ endpoint: s.endpoint }), settings: s };
}

function registerIpc() {
  // ---- Ollama ----
  ipcMain.handle('ollama:list', async () => {
    const { ollama } = clientFromSettings();
    try {
      return { ok: true, models: await ollama.listModels() };
    } catch (err) {
      return { ok: false, error: err.message, models: [] };
    }
  });

  ipcMain.handle('ollama:test', async () => {
    const { ollama } = clientFromSettings();
    return ollama.testConnection();
  });

  // ---- Settings ----
  ipcMain.handle('settings:get', async () => db.getSettings());
  ipcMain.handle('settings:set', async (_e, key, value) => db.setSetting(key, value));

  // ---- Prompts / history ----
  ipcMain.handle('prompt:save', async (_e, row) => db.savePrompt(row));
  ipcMain.handle('prompt:list', async (_e, filter) => db.listPrompts(filter || {}));
  ipcMain.handle('prompt:get', async (_e, id) => db.getPrompt(id));
  ipcMain.handle('prompt:update', async (_e, id, patch) => db.updatePrompt(id, patch));
  ipcMain.handle('prompt:delete', async (_e, id) => db.deletePrompt(id));
  ipcMain.handle('prompt:toggleFavorite', async (_e, id) => db.toggleFavorite(id));
  ipcMain.handle('prompt:duplicate', async (_e, id) => db.duplicatePrompt(id));
  ipcMain.handle('prompt:search', async (_e, args) => db.searchPrompts(args || {}));

  // ---- Projects ----
  ipcMain.handle('project:create', async (_e, data) => db.createProject(data));
  ipcMain.handle('project:get', async (_e, id) => db.getProject(id));
  ipcMain.handle('project:list', async () => db.listProjects());
  ipcMain.handle('project:update', async (_e, id, patch) => db.updateProject(id, patch));
  ipcMain.handle('project:delete', async (_e, id) => db.deleteProject(id));

  ipcMain.handle('project:pinned:list', async (_e, id) => db.listPinnedFiles(id));
  ipcMain.handle('project:pinned:set', async (_e, id, paths) => db.setPinnedFiles(id, paths));

  // ---- Filesystem ----
  ipcMain.handle('dialog:pickFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      title: 'Select project folder',
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('project:scan', async (_e, folderPath, ignoredFolders) => {
    try {
      return { ok: true, scan: scanFolder(folderPath, { ignoredFolders }) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Read a single file as a context snippet. `fullPath` joins folderPath + rel.
  ipcMain.handle('project:readFile', async (_e, fullPath) => {
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return { ok: false, error: 'Not a file' };
      const raw = fs.readFileSync(fullPath, 'utf8');
      const truncated = raw.length > FILE_SNIPPET_LIMIT;
      return {
        ok: true,
        content: truncated ? raw.slice(0, FILE_SNIPPET_LIMIT) : raw,
        truncated,
        size: stat.size,
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ---- Streaming generation (one-off + project-aware + actions) ----
  ipcMain.handle('generate:run', async (event, { requestId, mode, payload }) => {
    const { ollama, settings } = clientFromSettings();
    const fail = (msg) => {
      event.sender.send(`generate:error:${requestId}`, msg);
      return { ok: false, error: msg };
    };
    if (!settings.model) return fail('No model selected. Choose a model in Settings.');

    let messages;
    try {
      if (mode === 'action') {
        messages = buildActionMessages(payload);
      } else {
        let projectContext = payload.projectContext || '';
        if (payload.project) {
          projectContext = buildProjectContext(payload.project, payload.files || []);
        }
        messages = buildMessages({ ...payload, projectContext });
      }
    } catch (err) {
      return fail(err.message);
    }

    try {
      const full = await ollama.chatStream({
        model: settings.model,
        temperature: settings.temperature,
        messages,
        onToken: (t) => event.sender.send(`generate:token:${requestId}`, t),
      });
      event.sender.send(`generate:done:${requestId}`, full);
      return { ok: true };
    } catch (err) {
      return fail(err.message);
    }
  });
}

module.exports = { registerIpc };
