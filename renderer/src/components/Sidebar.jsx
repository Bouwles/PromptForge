import React from 'react';
import { useStore } from '../store.js';

const ITEMS = [
  { key: 'home', label: 'Home', ico: '⌂' },
  { key: 'oneoff', label: 'One-Off Prompt', ico: '✎' },
  { key: 'settings', label: 'Settings', ico: '⚙' },
];

const SOON = [
  { label: 'Projects', ico: '▣' },
  { label: 'History', ico: '≡' },
];

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  return (
    <aside className="sidebar">
      {ITEMS.map((it) => (
        <div
          key={it.key}
          className={`nav-item ${view === it.key ? 'active' : ''}`}
          onClick={() => setView(it.key)}
        >
          <span className="ico">{it.ico}</span>
          {it.label}
        </div>
      ))}

      <div className="nav-section">Coming in Phase 2</div>
      {SOON.map((it) => (
        <div key={it.label} className="nav-item disabled" title="Available in Phase 2">
          <span className="ico">{it.ico}</span>
          {it.label}
        </div>
      ))}
    </aside>
  );
}
