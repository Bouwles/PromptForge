// Thin wrapper over the preload-exposed window.api with a guard for non-Electron
// dev (e.g. opening the Vite URL directly in a browser).

const api = typeof window !== 'undefined' ? window.api : undefined;

function ensure() {
  if (!api) {
    throw new Error('PromptForge bridge unavailable. Run the app via "npm run dev" (Electron).');
  }
  return api;
}

export const isElectron = Boolean(api);

export const listModels = () => ensure().listModels();
export const testConnection = () => ensure().testConnection();
export const getSettings = () => ensure().getSettings();
export const setSetting = (key, value) => ensure().setSetting(key, value);
export const savePrompt = (row) => ensure().savePrompt(row);
export const listPrompts = (filter) => ensure().listPrompts(filter);
export const deletePrompt = (id) => ensure().deletePrompt(id);
export const generate = (payload, handlers) => ensure().generate(payload, handlers);
export const generateAction = (payload, handlers) => ensure().generateAction(payload, handlers);
