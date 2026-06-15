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

// Ollama
export const listModels = () => ensure().listModels();
export const testConnection = () => ensure().testConnection();

// Settings
export const getSettings = () => ensure().getSettings();
export const setSetting = (key, value) => ensure().setSetting(key, value);

// Prompts / history
export const savePrompt = (row) => ensure().savePrompt(row);
export const listPrompts = (filter) => ensure().listPrompts(filter);
export const getPrompt = (id) => ensure().getPrompt(id);
export const updatePrompt = (id, patch) => ensure().updatePrompt(id, patch);
export const deletePrompt = (id) => ensure().deletePrompt(id);
export const toggleFavorite = (id) => ensure().toggleFavorite(id);
export const duplicatePrompt = (id) => ensure().duplicatePrompt(id);
export const searchPrompts = (args) => ensure().searchPrompts(args);

// Projects
export const createProject = (data) => ensure().createProject(data);
export const getProject = (id) => ensure().getProject(id);
export const listProjects = () => ensure().listProjects();
export const updateProject = (id, patch) => ensure().updateProject(id, patch);
export const deleteProject = (id) => ensure().deleteProject(id);
export const listPinnedFiles = (id) => ensure().listPinnedFiles(id);
export const setPinnedFiles = (id, paths) => ensure().setPinnedFiles(id, paths);

// Filesystem
export const pickFolder = () => ensure().pickFolder();
export const scanFolder = (folderPath, ignoredFolders) =>
  ensure().scanFolder(folderPath, ignoredFolders);
export const readFile = (fullPath) => ensure().readFile(fullPath);

// Generation
export const generate = (payload, handlers) => ensure().generate(payload, handlers);
export const generateAction = (payload, handlers) => ensure().generateAction(payload, handlers);
