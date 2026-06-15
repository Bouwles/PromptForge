import React, { useEffect } from 'react';
import { useStore } from './store.js';
import Sidebar from './components/Sidebar.jsx';
import ProjectContextPanel from './components/ProjectContextPanel.jsx';
import Home from './screens/Home.jsx';
import OneOff from './screens/OneOff.jsx';
import Projects from './screens/Projects.jsx';
import ProjectWorkspace from './screens/ProjectWorkspace.jsx';
import History from './screens/History.jsx';
import Settings from './screens/Settings.jsx';

export default function App() {
  const view = useStore((s) => s.view);
  const connection = useStore((s) => s.connection);
  const settings = useStore((s) => s.settings);
  const loadSettings = useStore((s) => s.loadSettings);
  const refreshModels = useStore((s) => s.refreshModels);
  const loadProjects = useStore((s) => s.loadProjects);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadProjects();
      await refreshModels();
    })();
  }, [loadSettings, refreshModels, loadProjects]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          Prompt<span className="mark">Forge</span>
        </span>
        <span className="spacer" />
        <span className="conn">
          <span
            className={`dot ${connection.state === 'ok' ? 'ok' : connection.state === 'down' ? 'bad' : ''}`}
          />
          {connection.state === 'ok'
            ? `Ollama · ${settings.model || 'no model'}`
            : connection.state === 'down'
              ? 'Ollama offline'
              : 'connecting…'}
        </span>
      </header>

      <Sidebar />

      <main className="main">
        {view === 'home' && <Home />}
        {view === 'oneoff' && <OneOff />}
        {view === 'projects' && <Projects />}
        {view === 'project' && <ProjectWorkspace />}
        {view === 'history' && <History />}
        {view === 'settings' && <Settings />}
      </main>

      <ContextPanel view={view} />
    </div>
  );
}

function ContextPanel({ view }) {
  return (
    <aside className="context">
      {view === 'oneoff' && <OneOffContext />}
      {view === 'project' && <ProjectContextPanel />}
      {view !== 'oneoff' && view !== 'project' && <DefaultContext view={view} />}
    </aside>
  );
}

function OneOffContext() {
  return (
    <>
      <div className="block">
        <div className="section-title">Prompt style</div>
        <p>
          PromptForge outputs direct, structured prompts: clear title, current problem, goal, exact
          requirements, implementation notes, success criteria, and a "do not break" section. No
          fluff.
        </p>
      </div>
      <div className="block">
        <div className="section-title">Tips</div>
        <p>· Be messy — dump everything you know, the model structures it.</p>
        <p>· Use "Clarify before generating" when the task is fuzzy.</p>
        <p>· Use "Split Into Prompts" for large multi-step tasks.</p>
        <p>· Edit the output directly before copying.</p>
      </div>
      <div className="block">
        <div className="section-title">Privacy</div>
        <p>Your input never leaves this machine. Generation runs on local Ollama.</p>
      </div>
    </>
  );
}

function DefaultContext({ view }) {
  return (
    <div className="block">
      <div className="section-title">Context</div>
      {view === 'projects' && (
        <p>
          Create a project, connect its local folder, and PromptForge will scan it and write prompts
          that know your stack, important systems, and files.
        </p>
      )}
      {view === 'history' && <p>Every saved prompt lives here — search, copy, duplicate, or favorite.</p>}
      {(view === 'home' || view === 'settings') && (
        <p>Open a project to see its files, rules, and pinned context here.</p>
      )}
    </div>
  );
}
