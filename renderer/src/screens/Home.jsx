import React from 'react';
import { useStore } from '../store.js';

export default function Home() {
  const setView = useStore((s) => s.setView);
  const connection = useStore((s) => s.connection);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h1">PromptForge</h1>
      <p className="sub">
        A local prompt engineer for coding agents. Turn rough ideas into clean, structured prompts
        for Claude Code, Cursor, Windsurf, and more — powered by your local Ollama.
      </p>

      <div className="btn-group" style={{ marginBottom: 26 }}>
        <button className="btn primary" onClick={() => setView('oneoff')}>
          ✎ New One-Off Prompt
        </button>
        <button className="btn" onClick={() => setView('settings')}>
          ⚙ Settings
        </button>
      </div>

      <div className="section-title">Status</div>
      <div className="banner" style={{ marginTop: 8 }}>
        {connection.state === 'ok' && (
          <>Ollama connected · {connection.count} model(s) available.</>
        )}
        {connection.state === 'down' && (
          <span style={{ color: 'var(--bad)' }}>
            Ollama is not running. Start Ollama and try again.
          </span>
        )}
        {connection.state === 'unknown' && <>Checking Ollama connection…</>}
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>
        How it works
      </div>
      <p className="muted" style={{ lineHeight: 1.6 }}>
        1. Pick a prompt type and target agent. 2. Paste your messy request. 3. Generate a polished
        prompt. 4. Refine it (shorter, more detailed, add tests, add "do not break", split into
        steps). 5. Copy or save it. Project-aware prompts with folder scanning arrive in Phase 2.
      </p>
    </div>
  );
}
