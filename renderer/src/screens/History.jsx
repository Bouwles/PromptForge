import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';

export default function History() {
  const projects = useStore((s) => s.projects);
  const [prompts, setPrompts] = useState([]);
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  const projName = useCallback(
    (pid) => (pid ? projects.find((p) => p.id === pid)?.name || 'Project' : 'One-off'),
    [projects]
  );

  const load = useCallback(async () => {
    if (!api.isElectron) return;
    const rows = await api.searchPrompts({ query });
    setPrompts(rows);
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = favOnly ? prompts.filter((p) => p.favorite) : prompts;

  async function copy(p) {
    try {
      await navigator.clipboard.writeText(p.promptText);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(''), 1200);
    } catch {
      /* ignore */
    }
  }
  async function fav(p) {
    await api.toggleFavorite(p.id);
    load();
  }
  async function dup(p) {
    await api.duplicatePrompt(p.id);
    load();
  }
  async function del(p) {
    if (!confirm('Delete this prompt?')) return;
    await api.deletePrompt(p.id);
    load();
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="h1">History</h1>
      <p className="sub">Every saved prompt — one-off and project.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search prompts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <label className="toggle" onClick={() => setFavOnly((v) => !v)}>
          <span className="star-btn on">★</span> Favorites only {favOnly ? '✓' : ''}
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="empty">No saved prompts{query ? ' match your search' : ' yet'}.</div>
      ) : (
        shown.map((p) => (
          <div className="list-row" key={p.id}>
            <div className="lr-head">
              <span
                className={`star-btn ${p.favorite ? 'on' : ''}`}
                onClick={() => fav(p)}
                title="Favorite"
              >
                ★
              </span>
              <span className="lr-title">{p.title}</span>
              <span className="chip">{projName(p.projectId)}</span>
              {p.promptType && <span className="chip">{p.promptType}</span>}
              <span className="chip accent">{p.targetAgent}</span>
            </div>
            <div className="lr-prev">{(p.promptText || '').slice(0, 240)}</div>
            <div className="row-actions" style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={() => copy(p)}>
                {copiedId === p.id ? '✓ Copied' : 'Copy'}
              </button>
              <button className="btn sm" onClick={() => setEditing(p)}>
                Edit
              </button>
              <button className="btn sm" onClick={() => dup(p)}>
                Duplicate
              </button>
              <button className="btn sm ghost" onClick={() => del(p)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}

      {editing && (
        <EditPromptModal
          prompt={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditPromptModal({ prompt, onClose, onSaved }) {
  const [title, setTitle] = useState(prompt.title || '');
  const [text, setText] = useState(prompt.promptText || '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await api.updatePrompt(prompt.id, { title, promptText: text });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 720 }}>
        <h2>Edit Prompt</h2>
        <div className="field">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Prompt</label>
          <textarea
            rows={16}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
          />
        </div>
        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
