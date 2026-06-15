'use strict';

const { ipcMain } = require('electron');
const db = require('./db');
const { createOllama } = require('./ollama');
const { buildMessages, buildActionMessages } = require('./prompt-engine');

function clientFromSettings() {
  const s = db.getSettings();
  return { ollama: createOllama({ endpoint: s.endpoint }), settings: s };
}

function registerIpc() {
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

  ipcMain.handle('settings:get', async () => db.getSettings());

  ipcMain.handle('settings:set', async (_e, key, value) => db.setSetting(key, value));

  ipcMain.handle('prompt:save', async (_e, row) => db.savePrompt(row));

  ipcMain.handle('prompt:list', async (_e, filter) => db.listPrompts(filter || {}));

  ipcMain.handle('prompt:delete', async (_e, promptId) => db.deletePrompt(promptId));

  // Streaming generation. Renderer supplies a requestId; tokens stream back on
  // dedicated channels. Used for both initial generation and follow-up actions.
  ipcMain.handle('generate:run', async (event, { requestId, mode, payload }) => {
    const { ollama, settings } = clientFromSettings();
    if (!settings.model) {
      event.sender.send(`generate:error:${requestId}`, 'No model selected. Choose a model in Settings.');
      return { ok: false };
    }
    let messages;
    try {
      messages =
        mode === 'action'
          ? buildActionMessages(payload)
          : buildMessages(payload);
    } catch (err) {
      event.sender.send(`generate:error:${requestId}`, err.message);
      return { ok: false };
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
      event.sender.send(`generate:error:${requestId}`, err.message);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerIpc };
