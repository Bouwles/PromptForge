import React, { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';

export default function ProjectContextPanel() {
  const project = useStore((s) => s.currentProject);
  const refresh = useStore((s) => s.refreshCurrentProject);
  const loadProjects = useStore((s) => s.loadProjects);
  const [tab, setTab] = useState('memory');

  const [memory, setMemory] = useState('');
  const [rules, setRules] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [systems, setSystems] = useState('');
  const [savedFlag, setSavedFlag] = useState('');

  useEffect(() => {
    if (!project) return;
    setMemory(project.memory || '');
    setRules(project.rules || '');
    setRestrictions(project.restrictions || '');
    setSystems(project.importantSystems || '');
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return <div className="block muted">No project open.</div>;

  async function save(patch, flag) {
    await api.updateProject(project.id, patch);
    await refresh();
    await loadProjects();
    setSavedFlag(flag);
    setTimeout(() => setSavedFlag(''), 1400);
  }

  function memoryTemplate() {
    const stack = (project.techStack || []).join(', ');
    return [
      `Project: ${project.name}`,
      project.description ? `Type: ${project.description}` : '',
      stack ? `Stack: ${stack}` : '',
      'Important systems:',
      '- ',
      'Do not break:',
      '- ',
    ]
      .filter(Boolean)
      .join('\n');
  }

  async function unpin(path) {
    const next = (project.pinnedFiles || []).filter((p) => p !== path);
    await api.setPinnedFiles(project.id, next);
    await refresh();
  }

  return (
    <div>
      <div className="tabs">
        <div className={`tab ${tab === 'memory' ? 'active' : ''}`} onClick={() => setTab('memory')}>
          Memory
        </div>
        <div className={`tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          Rules
        </div>
        <div className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
          Info
        </div>
      </div>

      {tab === 'memory' && (
        <div className="block">
          <div className="section-title">Project memory</div>
          <p>Editable summary the AI uses for every prompt.</p>
          <textarea rows={12} value={memory} onChange={(e) => setMemory(e.target.value)} />
          <div className="row-actions" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => setMemory(memoryTemplate())}>
              Insert template
            </button>
            <button className="btn sm primary" onClick={() => save({ memory }, 'memory')}>
              {savedFlag === 'memory' ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <>
          <div className="block">
            <div className="section-title">Important systems (do not break)</div>
            <textarea rows={4} value={systems} onChange={(e) => setSystems(e.target.value)} />
            <button
              className="btn sm primary"
              style={{ marginTop: 6 }}
              onClick={() => save({ importantSystems: systems }, 'sys')}
            >
              {savedFlag === 'sys' ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <div className="block">
            <div className="section-title">Rules (must follow)</div>
            <textarea rows={4} value={rules} onChange={(e) => setRules(e.target.value)} />
            <button
              className="btn sm primary"
              style={{ marginTop: 6 }}
              onClick={() => save({ rules }, 'rules')}
            >
              {savedFlag === 'rules' ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <div className="block">
            <div className="section-title">Restrictions (avoid)</div>
            <textarea
              rows={4}
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
            />
            <button
              className="btn sm primary"
              style={{ marginTop: 6 }}
              onClick={() => save({ restrictions }, 'restr')}
            >
              {savedFlag === 'restr' ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </>
      )}

      {tab === 'info' && (
        <>
          <div className="block">
            <div className="section-title">Folder</div>
            <p style={{ fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>
              {project.folderPath || 'Not connected'}
            </p>
          </div>
          <div className="block">
            <div className="section-title">Stack</div>
            <div className="meta">
              {(project.techStack || []).map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
              <span className="chip accent">{project.targetAgent}</span>
            </div>
          </div>
          <div className="block">
            <div className="section-title">Pinned files ({(project.pinnedFiles || []).length})</div>
            {(project.pinnedFiles || []).length === 0 ? (
              <p>Pin important files from the tree with the ★ icon.</p>
            ) : (
              (project.pinnedFiles || []).map((p) => (
                <div className="tree-row file" key={p} style={{ paddingLeft: 6 }}>
                  <span className="tname" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                    {p}
                  </span>
                  <span className="pin on" onClick={() => unpin(p)} title="Unpin">
                    ★
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="block">
            <div className="section-title">Saved prompts</div>
            <p>{project.promptCount} saved for this project.</p>
          </div>
        </>
      )}
    </div>
  );
}
