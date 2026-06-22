import React, { useState } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const models = useStore((s) => s.models);
  const saveSetting = useStore((s) => s.saveSetting);
  const refreshModels = useStore((s) => s.refreshModels);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // {ok, text}

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const res = await api.testConnection();
      if (res.ok) {
        setResult({ ok: true, text: `Connected. ${res.models.length} model(s) available.` });
        await refreshModels();
      } else {
        setResult({ ok: false, text: res.error });
      }
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setTesting(false);
    }
  }

  const web = api.mode === 'web';

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="h1">Settings</h1>
      <p className="sub">
        Connect to your local Ollama. Everything stays on your machine — prompts and history live in
        this browser, generation runs on your own Ollama.
      </p>

      <div className="field">
        <label>Ollama endpoint</label>
        <input
          type="text"
          value={settings.endpoint}
          onChange={(e) => saveSetting('endpoint', e.target.value)}
          placeholder="http://localhost:11434"
        />
        {web && (
          <div className="muted" style={{ marginTop: 6 }}>
            <p style={{ margin: '0 0 4px' }}>
              This site (HTTPS) must be allowed to reach your local Ollama. One-time setup:
            </p>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Install Ollama + pull a model: <code>ollama pull llama3.2</code></li>
              <li>
                Allow this origin, then restart Ollama:
                <br />
                <code>setx OLLAMA_ORIGINS "https://bouwles.github.io"</code> (Windows), or
                <br />
                <code>OLLAMA_ORIGINS="https://bouwles.github.io" ollama serve</code> (Mac/Linux)
              </li>
              <li>Use Chrome or Edge (Firefox/Safari block HTTPS→localhost).</li>
            </ol>
          </div>
        )}
      </div>

      <div className="field">
        <label>Default model</label>
        <select value={settings.model} onChange={(e) => saveSetting('model', e.target.value)}>
          {models.length === 0 && <option value="">No models found — test connection</option>}
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
              {m.remote ? '  (remote)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Temperature · {settings.temperature.toFixed(2)}</label>
        <div className="slider-row">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.temperature}
            onChange={(e) => saveSetting('temperature', Number(e.target.value))}
          />
          <span className="val">{settings.temperature.toFixed(2)}</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Lower = more deterministic prompts. 0.3–0.5 works well for prompt engineering.
        </p>
      </div>

      <div className="btn-group">
        <button className="btn" onClick={test} disabled={testing}>
          {testing ? (
            <>
              <span className="spin" /> Testing…
            </>
          ) : (
            'Test Connection'
          )}
        </button>
      </div>

      {result && (
        <div className={`banner ${result.ok ? 'ok' : 'bad'}`} style={{ marginTop: 14 }}>
          {result.text}
        </div>
      )}
    </div>
  );
}
