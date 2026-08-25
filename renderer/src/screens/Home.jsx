import React, { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';
import { SHOWCASE_PRESETS } from '../lib/showcase-presets.mjs';

export default function Home() {
  const setView = useStore((s) => s.setView);
  const connection = useStore((s) => s.connection);
  const projects = useStore((s) => s.projects);
  const openProject = useStore((s) => s.openProject);
  const setOneOff = useStore((s) => s.setOneOff);
  const [recentPrompts, setRecentPrompts] = useState([]);

  useEffect(() => {
    (async () => {
      const rows = await api.listPrompts({});
      setRecentPrompts(rows.slice(0, 5));
    })();
  }, []);

  const recentProjects = projects.slice(0, 4);

  function usePreset(preset) {
    setOneOff({
      input: preset.input,
      promptType: preset.promptType,
      targetAgent: preset.targetAgent,
      output: '',
      error: '',
      saved: false,
    });
    setView('oneoff');
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="h1">PromptForge</h1>
      <p className="sub">
        A prompt engineer for coding agents. Turn rough ideas into clean, structured prompts
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

      <div className="section-title">Starter prompts</div>
      <div className="preset-grid" style={{ marginBottom: 24 }}>
        {SHOWCASE_PRESETS.map((preset) => (
          <button className="preset-card" key={preset.title} onClick={() => usePreset(preset)}>
            <span>{preset.title}</span>
            <small>{preset.promptType} - {preset.targetAgent}</small>
          </button>
        ))}
      </div>

      <div className="banner" style={{ marginBottom: 24 }}>
        {connection.state === 'ok' && (
          <>{api.backendLabel} connected · {connection.count} model(s) available.</>
        )}
        {connection.state === 'down' && (
          <span style={{ color: 'var(--bad)' }}>
            {api.mode === 'electron'
              ? 'Ollama is not running. Start Ollama and try again.'
              : connection.error || 'Cannot reach Ollama. See Settings.'}
          </span>
        )}
        {connection.state === 'unknown' && <>Checking {api.backendLabel} connection…</>}
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
