import React from 'react';
import { useStore } from '../store.js';

const ITEMS = [
  { key: 'home', label: 'Home', ico: 'Home' },
  { key: 'oneoff', label: 'One-Off Prompt', ico: 'New' },
  { key: 'projects', label: 'Projects', ico: 'Proj' },
  { key: 'history', label: 'History', ico: 'Hist' },
  { key: 'settings', label: 'Settings', ico: 'Set' },
];

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const currentProject = useStore((s) => s.currentProject);

  const activeKey = view === 'project' ? 'projects' : view;

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          className={`nav-item ${activeKey === it.key ? 'active' : ''}`}
          onClick={() => setView(it.key)}
          type="button"
          aria-current={activeKey === it.key ? 'page' : undefined}
        >
          <span className="ico" aria-hidden="true">{it.ico}</span>
          {it.label}
        </button>
      ))}

      {currentProject && (
        <>
          <div className="nav-section">Open project</div>
          <button
            className={`nav-item ${view === 'project' ? 'active' : ''}`}
            onClick={() => setView('project')}
            title={currentProject.folderPath}
            type="button"
            aria-current={view === 'project' ? 'page' : undefined}
          >
            <span className="ico" aria-hidden="true">Open</span>
            {currentProject.name}
          </button>
        </>
      )}
    </aside>
  );
}
