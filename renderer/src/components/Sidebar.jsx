import React from 'react';
import { useStore } from '../store.js';

const ITEMS = [
  { key: 'home', label: 'Home', ico: '⌂' },
  { key: 'oneoff', label: 'One-Off Prompt', ico: '✎' },
  { key: 'projects', label: 'Projects', ico: '▣' },
  { key: 'history', label: 'History', ico: '≡' },
  { key: 'settings', label: 'Settings', ico: '⚙' },
];

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const currentProject = useStore((s) => s.currentProject);

  const activeKey = view === 'project' ? 'projects' : view;

  return (
    <aside className="sidebar">
      {ITEMS.map((it) => (
        <div
          key={it.key}
          className={`nav-item ${activeKey === it.key ? 'active' : ''}`}
          onClick={() => setView(it.key)}
        >
          <span className="ico">{it.ico}</span>
          {it.label}
        </div>
      ))}

      {currentProject && (
        <>
          <div className="nav-section">Open project</div>
          <div
            className={`nav-item ${view === 'project' ? 'active' : ''}`}
            onClick={() => setView('project')}
            title={currentProject.folderPath}
          >
            <span className="ico">●</span>
            {currentProject.name}
          </div>
        </>
      )}
    </aside>
  );
}
