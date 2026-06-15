import { create } from 'zustand';
import * as api from './api.js';

export const useStore = create((set, get) => ({
  view: 'home', // home | oneoff | projects | project | history | settings
  setView: (view) => set({ view }),

  // Projects
  projects: [],
  currentProject: null,

  async loadProjects() {
    if (!api.isElectron) return;
    const projects = await api.listProjects();
    set({ projects });
  },

  async openProject(id) {
    if (!api.isElectron) return;
    const currentProject = await api.getProject(id);
    set({ currentProject, view: 'project' });
  },

  async refreshCurrentProject() {
    const cur = get().currentProject;
    if (!cur || !api.isElectron) return;
    const currentProject = await api.getProject(cur.id);
    set({ currentProject });
  },

  closeProject() {
    set({ currentProject: null, view: 'projects' });
  },

  settings: {
    endpoint: 'http://localhost:11434',
    model: '',
    temperature: 0.4,
    clarifyBeforeGenerate: false,
  },
  models: [],
  connection: { state: 'unknown', error: '', count: 0 }, // unknown | ok | down

  // One-off prompt working state
  oneOff: {
    input: '',
    promptType: 'Build Feature',
    targetAgent: 'Claude Code',
    clarify: false,
    output: '',
    streaming: false,
    error: '',
    saved: false,
  },
  setOneOff: (patch) => set((s) => ({ oneOff: { ...s.oneOff, ...patch } })),

  async loadSettings() {
    if (!api.isElectron) return;
    const settings = await api.getSettings();
    set((s) => ({
      settings,
      oneOff: { ...s.oneOff, clarify: Boolean(settings.clarifyBeforeGenerate) },
    }));
  },

  async saveSetting(key, value) {
    set((s) => ({ settings: { ...s.settings, [key]: value } }));
    if (!api.isElectron) return;
    const settings = await api.setSetting(key, value);
    set({ settings });
  },

  async refreshModels() {
    if (!api.isElectron) {
      set({ connection: { state: 'down', error: 'Not running in Electron.', count: 0 } });
      return;
    }
    const res = await api.listModels();
    if (res.ok) {
      set({ models: res.models, connection: { state: 'ok', error: '', count: res.models.length } });
      // Default model = first installed if none selected.
      const { settings } = get();
      if (!settings.model && res.models.length) {
        get().saveSetting('model', res.models[0].name);
      }
    } else {
      set({ models: [], connection: { state: 'down', error: res.error, count: 0 } });
    }
  },
}));
