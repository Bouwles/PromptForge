'use strict';

const path = require('node:path');
const os = require('node:os');

/**
 * Resolve the application data directory.
 * Uses Electron's userData path when running inside Electron; falls back to a
 * temp-based path for unit tests / non-Electron contexts.
 */
function getUserDataDir() {
  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      return app.getPath('userData');
    }
  } catch {
    // not running under electron (e.g. tests)
  }
  return path.join(os.tmpdir(), 'PromptForge');
}

function getDbPath() {
  return path.join(getUserDataDir(), 'promptforge.db');
}

module.exports = { getUserDataDir, getDbPath };
