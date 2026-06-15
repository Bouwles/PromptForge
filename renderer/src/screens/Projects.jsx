import React, { useState } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';
import { TARGET_AGENTS } from '../constants.js';

export default function Projects() {
  const projects = useStore((s) => s.projects);
  const loadProjects = useStore((s) => s.loadProjects);
  const openProject = useStore((s) => s.openProject);
  const [editing, setEditing] = useState(null); // null | {} (new) | project (edit)

  async function remove(p, e) {
    e.stopPropagation();
    if (!confirm(`Delete project "${p.name}"? Saved prompts for it are removed too.`)) return;
    await api.deleteProject(p.id);
    await loadProjects();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h1 className="h1">Projects</h1>
          <p className="sub" style={{ margin: 0 }}>
            Connect a folder so prompts know your stack, systems, and files.
          </p>
        </div>
        <button className="btn primary" onClick={() => setEditing({})}>
          + Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">No projects yet. Create one to get started.</div>
      ) : (
        <div className="cards">
          {projects.map((p) => (
            <div className="card" key={p.id} onClick={() => openProject(p.id)}>
              <div className="name">{p.name}</div>
              <div className="path">{p.folderPath || 'No folder connected'}</div>
              <div className="meta">
                {p.techStack.slice(0, 4).map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
                <span className="chip accent">{p.targetAgent}</span>
              </div>
              <div className="foot">
                <span>{p.promptCount} saved prompt{p.promptCount === 1 ? '' : 's'}</span>
                <span className="row-actions">
                  <span
                    className="btn sm ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                    }}
                  >
                    Edit
                  </span>
                  <span className="btn sm ghost" onClick={(e) => remove(p, e)}>
                    Delete
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProjectForm
          project={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={async (id) => {
            setEditing(null);
            await loadProjects();
            if (id) openProject(id);
          }}
        />
      )}
    </div>
  );
}

function ProjectForm({ project, onClose, onSaved }) {
  const isEdit = Boolean(project);
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [folderPath, setFolderPath] = useState(project?.folderPath || '');
  const [techStack, setTechStack] = useState((project?.techStack || []).join(', '));
  const [targetAgent, setTargetAgent] = useState(project?.targetAgent || 'Claude Code');
  const [busy, setBusy] = useState(false);

  async function pick() {
    const dir = await api.pickFolder();
    if (dir) {
      setFolderPath(dir);
      if (!name) setName(dir.split(/[\\/]/).pop());
    }
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const data = {
      name: name.trim(),
      description,
      folderPath,
      techStack: techStack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      targetAgent,
    };
    let result;
    if (isEdit) {
      result = await api.updateProject(project.id, data);
    } else {
      result = await api.createProject(data);
    }
    setBusy(false);
    onSaved(result?.id);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Edit Project' : 'Create Project'}</h2>

        <div className="field">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="RAJIS" />
        </div>

        <div className="field">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="browser 3D missile interception game"
          />
        </div>

        <div className="field">
          <label>Project folder</label>
          <div className="row">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="C:\path\to\project"
            />
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={pick}>
              Browse…
            </button>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label>Tech stack (comma-separated)</label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="React, Three.js, Firebase"
            />
          </div>
          <div className="field">
            <label>Default target agent</label>
            <select value={targetAgent} onChange={(e) => setTargetAgent(e.target.value)}>
              {TARGET_AGENTS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row-actions" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
