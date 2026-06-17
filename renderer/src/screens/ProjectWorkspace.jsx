import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store.js';
import * as api from '../api.js';
import { PROMPT_TYPES } from '../constants.js';
import FileTree from '../components/FileTree.jsx';
import PromptEditor from '../components/PromptEditor.jsx';
import OutputActions from '../components/OutputActions.jsx';

const MAX_CONTEXT_FILES = 15;

export default function ProjectWorkspace() {
  const project = useStore((s) => s.currentProject);
  const setView = useStore((s) => s.setView);
  const refresh = useStore((s) => s.refreshCurrentProject);
  const loadProjects = useStore((s) => s.loadProjects);
  const settings = useStore((s) => s.settings);
  const connection = useStore((s) => s.connection);

  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [filter, setFilter] = useState('');

  const [request, setRequest] = useState('');
  const [promptType, setPromptType] = useState('Build Feature');
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const doScan = useCallback(async () => {
    if (!project?.folderPath) return;
    setScanning(true);
    setScanError('');
    const res = await api.scanFolder(project.folderPath, project.ignoredFolders || []);
    setScanning(false);
    if (res.ok) setScan(res.scan);
    else setScanError(res.error);
  }, [project?.folderPath, project?.ignoredFolders]);

  // Auto-scan when a connected project opens.
  useEffect(() => {
    setScan(null);
    setSelected(new Set());
    setOutput('');
    setRequest('');
    setError('');
    if (project?.folderPath) doScan();
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) {
    return <div className="empty">No project open. Go to Projects.</div>;
  }

  function toggleSelect(path) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  async function togglePin(path) {
    const cur = project.pinnedFiles || [];
    const next = cur.includes(path) ? cur.filter((p) => p !== path) : [...cur, path];
    await api.setPinnedFiles(project.id, next);
    await refresh();
  }

  async function connectFolder() {
    const dir = await api.pickFolder();
    if (!dir) return;
    await api.updateProject(project.id, { folderPath: dir });
    await refresh();
    await loadProjects();
  }

  async function gatherContextFiles() {
    const pinned = project.pinnedFiles || [];
    const chosen = [...new Set([...pinned, ...selected])].slice(0, MAX_CONTEXT_FILES);
    const out = [];
    for (const rel of chosen) {
      const full = `${project.folderPath}/${rel}`;
      const res = await api.readFile(full);
      if (res.ok) out.push({ path: rel, content: res.content, truncated: res.truncated });
      else out.push({ path: rel });
    }
    return out;
  }

  async function generate() {
    if (!request.trim() || streaming) return;
    setOutput('');
    setStreaming(true);
    setError('');
    setSaved(false);
    let acc = '';
    try {
      const files = await gatherContextFiles();
      await api.generate(
        {
          input: request,
          promptType,
          targetAgent: project.targetAgent,
          project: {
            name: project.name,
            description: project.description,
            techStack: project.techStack,
            framework: scan?.summary?.framework,
            memory: project.memory,
            rules: project.rules,
            restrictions: project.restrictions,
            importantSystems: project.importantSystems,
          },
          files,
        },
        { onToken: (t) => { acc += t; setOutput(acc); } }
      );
      setStreaming(false);
    } catch (err) {
      setStreaming(false);
      setError(err.message);
    }
  }

  async function runAction(action) {
    if (!output.trim() || streaming) return;
    const base = output;
    setOutput('');
    setStreaming(true);
    setError('');
    setSaved(false);
    let acc = '';
    try {
      await api.generateAction(
        { currentPrompt: base, action },
        { onToken: (t) => { acc += t; setOutput(acc); } }
      );
      setStreaming(false);
    } catch (err) {
      setStreaming(false);
      setError(err.message);
      setOutput(base);
    }
  }

  async function save() {
    if (!output.trim()) return;
    await api.savePrompt({
      projectId: project.id,
      promptText: output,
      inputText: request,
      targetAgent: project.targetAgent,
      promptType,
    });
    setSaved(true);
    await refresh();
    await loadProjects();
  }

  const pinned = project.pinnedFiles || [];
  const contextCount = new Set([...pinned, ...selected]).size;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 className="h1">{project.name}</h1>
          <p className="sub" style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12 }}>
            {project.folderPath || 'No folder connected'}
          </p>
        </div>
        <div className="row-actions">
          <button className="btn sm ghost" onClick={() => setView('projects')}>
            ← Projects
          </button>
          {project.folderPath ? (
            <button className="btn sm" onClick={doScan} disabled={scanning}>
              {scanning ? 'Scanning…' : '↻ Rescan'}
            </button>
          ) : (
            <button className="btn sm primary" onClick={connectFolder}>
              Connect Folder
            </button>
          )}
        </div>
      </div>

      {connection.state === 'down' && (
        <div className="banner bad">
          {api.mode === 'electron'
            ? 'Ollama is not running. Start Ollama and try again.'
            : `Backend offline. ${connection.error || 'Set your backend URL in Settings.'}`}
        </div>
      )}
      {scanError && <div className="banner bad">{scanError}</div>}

      <div className="split">
        <div className="col-files">
          <div className="section-title">
            Project files {scan ? `· ${scan.fileCount} files` : ''}
          </div>
          {scan && (
            <p className="muted" style={{ marginTop: 0 }}>
              {scan.summary.framework} · {scan.summary.language} · {scan.summary.packageManager}
            </p>
          )}
          <input
            type="text"
            placeholder="Filter files…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {scanning ? (
            <div className="empty">
              <span className="spin" /> scanning…
            </div>
          ) : (
            <FileTree
              nodes={scan?.tree}
              selected={selected}
              onToggleSelect={toggleSelect}
              pinned={pinned}
              onTogglePin={togglePin}
              filter={filter}
            />
          )}
          <p className="muted" style={{ marginTop: 8 }}>
            {contextCount} file{contextCount === 1 ? '' : 's'} in context (pinned + checked, max{' '}
            {MAX_CONTEXT_FILES}). ★ pins to project.
          </p>
        </div>

        <div>
          <div className="field">
            <label>What do you want to change?</label>
            <textarea
              rows={4}
              value={request}
              placeholder="e.g. the battle pass looks bad and shop isnt fullscreen and dont break saves"
              onChange={(e) => setRequest(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 14 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Prompt type</label>
              <select value={promptType} onChange={(e) => setPromptType(e.target.value)}>
                {PROMPT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              className="btn primary"
              onClick={generate}
              disabled={streaming || !request.trim() || !settings.model}
            >
              {streaming ? (
                <>
                  <span className="spin" /> Generating…
                </>
              ) : (
                'Generate Prompt'
              )}
            </button>
          </div>

          {!settings.model && <div className="banner bad">Select a model in Settings first.</div>}
          {error && <div className="banner bad">{error}</div>}

          <PromptEditor
            value={output}
            streaming={streaming}
            onChange={(v) => {
              setOutput(v);
              setSaved(false);
            }}
          />

          {output && (
            <div style={{ marginTop: 16 }}>
              <OutputActions
                disabled={streaming}
                saved={saved}
                onAction={runAction}
                onRegenerate={generate}
                onSave={save}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
