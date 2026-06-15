import React, { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';

export default function Home() {
  const setView = useStore((s) => s.setView);
  const connection = useStore((s) => s.connection);
  const projects = useStore((s) => s.projects);
  const openProject = useStore((s) => s.openProject);
  const [recentPrompts, setRecentPrompts] = useState([]);

  useEffect(() => {
    (async () => {
      if (!api.isElectron) return;
      const rows = await api.listPrompts({});
      setRecentPrompts(rows.slice(0, 5));
    })();
  }, []);

  const recentProjects = projects.slice(0, 4);

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="h1">PromptForge</h1>
      <p className="sub">
        A local prompt engineer for coding agents. Turn rough ideas into clean, structured prompts
        for Claude Code, Cursor, Windsurf, and more — powered by your local Ollama.
      </p>

      <div className="btn-group" style={{ marginBottom: 22 }}>
        <button className="btn primary" onClick={() => setView('oneoff')}>
          ✎ New One-Off Prompt
        </button>
        <button className="btn" onClick={() => setView('projects')}>
          ▣ Open a Project
        </button>
        <button className="btn" onClick={() => setView('settings')}>
          ⚙ Settings
        </button>
      </div>

      <div className="banner" style={{ marginBottom: 24 }}>
        {connection.state === 'ok' && <>Ollama connected · {connection.count} model(s) available.</>}
        {connection.state === 'down' && (
          <span style={{ color: 'var(--bad)' }}>
            Ollama is not running. Start Ollama and try again.
          </span>
        )}
        {connection.state === 'unknown' && <>Checking Ollama connection…</>}
      </div>

      <div className="split" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div className="section-title">Recent projects</div>
          {recentProjects.length === 0 ? (
            <p className="muted">No projects yet.</p>
          ) : (
            recentProjects.map((p) => (
              <div className="list-row" key={p.id} style={{ cursor: 'pointer' }} onClick={() => openProject(p.id)}>
                <div className="lr-title">{p.name}</div>
                <div className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                  {p.folderPath || 'no folder'} · {p.promptCount} prompts
                </div>
              </div>
            ))
          )}
        </div>
        <div>
          <div className="section-title">Recent prompts</div>
          {recentPrompts.length === 0 ? (
            <p className="muted">No saved prompts yet.</p>
          ) : (
            recentPrompts.map((p) => (
              <div className="list-row" key={p.id} style={{ cursor: 'pointer' }} onClick={() => setView('history')}>
                <div className="lr-title">{p.title}</div>
                <div className="muted">{p.promptType} · {p.targetAgent}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
