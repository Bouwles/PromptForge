// Unified API adapter. In Electron it delegates to the preload-exposed window.api
// (full local power). In a plain browser (e.g. GitHub Pages) it uses the web
// implementation: IndexedDB storage + the OpenRouter-via-Worker backend + the
// File System Access scanner. The store and screens are identical in both.

import { createWebApi } from './web/index.js';

const electronApi = typeof window !== 'undefined' ? window.api : undefined;
const impl = electronApi || createWebApi();

export const mode = electronApi ? 'electron' : 'web';
export const isElectron = Boolean(electronApi);
export const ready = true; // a backend is always present now (electron or web)
export const backendLabel = 'Ollama'; // both desktop and web talk to local Ollama

// Models / connection
export const listModels = () => impl.listModels();
export const testConnection = () => impl.testConnection();

// Settings
export const getSettings = () => impl.getSettings();
export const setSetting = (key, value) => impl.setSetting(key, value);

// Prompts / history
export const savePrompt = (row) => impl.savePrompt(row);
export const listPrompts = (filter) => impl.listPrompts(filter);
export const getPrompt = (id) => impl.getPrompt(id);
export const updatePrompt = (id, patch) => impl.updatePrompt(id, patch);
export const deletePrompt = (id) => impl.deletePrompt(id);
export const toggleFavorite = (id) => impl.toggleFavorite(id);
export const duplicatePrompt = (id) => impl.duplicatePrompt(id);
export const searchPrompts = (args) => impl.searchPrompts(args);

// Projects
export const createProject = (data) => impl.createProject(data);
export const getProject = (id) => impl.getProject(id);
export const listProjects = () => impl.listProjects();
export const updateProject = (id, patch) => impl.updateProject(id, patch);
export const deleteProject = (id) => impl.deleteProject(id);
export const listPinnedFiles = (id) => impl.listPinnedFiles(id);
export const setPinnedFiles = (id, paths) => impl.setPinnedFiles(id, paths);

// Filesystem
export const pickFolder = () => impl.pickFolder();
export const scanFolder = (folderPath, ignoredFolders) => impl.scanFolder(folderPath, ignoredFolders);
export const readFile = (fullPath) => impl.readFile(fullPath);

// Generation
export const generate = (payload, handlers) => impl.generate(payload, handlers);
export const generateAction = (payload, handlers) => impl.generateAction(payload, handlers);
