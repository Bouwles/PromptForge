import React from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';
import { PROMPT_TYPES, TARGET_AGENTS } from '../constants.js';
import PromptEditor from '../components/PromptEditor.jsx';
import OutputActions from '../components/OutputActions.jsx';

export default function OneOff() {
  const oneOff = useStore((s) => s.oneOff);
  const setOneOff = useStore((s) => s.setOneOff);
  const settings = useStore((s) => s.settings);
  const connection = useStore((s) => s.connection);

  const busy = oneOff.streaming;

  async function generate() {
    if (!oneOff.input.trim() || busy) return;
    setOneOff({ output: '', streaming: true, error: '', saved: false });
    let acc = '';
    try {
      await api.generate(
        {
          input: oneOff.input,
          promptType: oneOff.promptType,
          targetAgent: oneOff.targetAgent,
          clarify: oneOff.clarify,
        },
        {
          onToken: (t) => {
            acc += t;
            setOneOff({ output: acc });
          },
        }
      );
      setOneOff({ streaming: false });
    } catch (err) {
      setOneOff({ streaming: false, error: err.message });
    }
  }

  async function runAction(action) {
    if (!oneOff.output.trim() || busy) return;
    const base = oneOff.output;
    setOneOff({ output: '', streaming: true, error: '', saved: false });
    let acc = '';
    try {
      await api.generateAction(
        { currentPrompt: base, action },
        {
          onToken: (t) => {
            acc += t;
            setOneOff({ output: acc });
          },
        }
      );
      setOneOff({ streaming: false });
    } catch (err) {
      setOneOff({ streaming: false, error: err.message, output: base });
    }
  }

  async function save() {
    if (!oneOff.output.trim()) return;
    await api.savePrompt({
      projectId: null,
      promptText: oneOff.output,
      inputText: oneOff.input,
      targetAgent: oneOff.targetAgent,
      promptType: oneOff.promptType,
    });
    setOneOff({ saved: true });
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="h1">One-Off Prompt</h1>
      <p className="sub">Turn a messy coding idea into a clean, copy-paste-ready prompt.</p>

      {connection.state === 'down' && (
        <div className="banner bad">
          {api.mode === 'electron'
            ? 'Ollama is not running. Start Ollama and try again.'
            : connection.error || 'Cannot reach Ollama. See Settings.'}
        </div>
      )}

      <div className="field">
        <label>Your messy request</label>
        <textarea
          rows={5}
          value={oneOff.input}
          placeholder="e.g. the battle pass looks bad and shop isnt fullscreen and dont break saves"
          onChange={(e) => setOneOff({ input: e.target.value })}
        />
      </div>

      <div className="row">
        <div className="field">
          <label>Prompt type</label>
          <select
            value={oneOff.promptType}
            onChange={(e) => setOneOff({ promptType: e.target.value })}
          >
            {PROMPT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Target agent</label>
          <select
            value={oneOff.targetAgent}
            onChange={(e) => setOneOff({ targetAgent: e.target.value })}
          >
            {TARGET_AGENTS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <button
          className="btn primary"
          onClick={generate}
          disabled={busy || !oneOff.input.trim() || !settings.model}
        >
          {busy ? (
            <>
              <span className="spin" /> Generating…
            </>
          ) : (
            'Generate Prompt'
          )}
        </button>

        <Toggle
          on={oneOff.clarify}
          onChange={(v) => setOneOff({ clarify: v })}
          label="Clarify before generating"
        />

        {!settings.model && (
          <span className="muted">Select a model in Settings first.</span>
        )}
      </div>

      {oneOff.error && <div className="banner bad">{oneOff.error}</div>}

      <PromptEditor
        value={oneOff.output}
        streaming={oneOff.streaming}
        onChange={(v) => setOneOff({ output: v, saved: false })}
      />

      {oneOff.output && (
        <div style={{ marginTop: 16 }}>
          <OutputActions
            disabled={busy}
            saved={oneOff.saved}
            onAction={runAction}
            onRegenerate={generate}
            onSave={save}
          />
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <div className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="track">
        <span className="knob" />
      </span>
      {label}
    </div>
  );
}
