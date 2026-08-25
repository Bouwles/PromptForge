import React, { useState } from 'react';

export default function FileTree({ nodes, selected, onToggleSelect, pinned, onTogglePin, filter }) {
  if (!nodes || nodes.length === 0) {
    return <div className="empty">No files. Connect a folder and scan.</div>;
  }
  const f = (filter || '').trim().toLowerCase();
  return (
    <div className="filetree">
      {nodes.map((n) => (
        <TreeNode
          key={n.path}
          node={n}
          depth={0}
          selected={selected}
          onToggleSelect={onToggleSelect}
          pinned={pinned}
          onTogglePin={onTogglePin}
          filter={f}
        />
      ))}
    </div>
  );
}

function matchesFilter(node, filter) {
  if (!filter) return true;
  if (node.type === 'file') return node.path.toLowerCase().includes(filter);
  // dir: keep if any descendant matches
  return (node.children || []).some((c) => matchesFilter(c, filter));
}

function TreeNode({ node, depth, selected, onToggleSelect, pinned, onTogglePin, filter }) {
  const [open, setOpen] = useState(depth < 1 || Boolean(filter));
  if (!matchesFilter(node, filter)) return null;

  const pad = { paddingLeft: 6 + depth * 14 };

  if (node.type === 'dir') {
    const expanded = open || Boolean(filter);
    return (
      <div>
        <div className="tree-row dir" style={pad} onClick={() => setOpen((o) => !o)}>
          <span className="tw">{expanded ? '▾' : '▸'}</span>
          <span className="tname">{node.name}</span>
        </div>
        {expanded &&
          (node.children || []).map((c) => (
            <TreeNode
              key={c.path}
              node={c}
              depth={depth + 1}
              selected={selected}
              onToggleSelect={onToggleSelect}
              pinned={pinned}
              onTogglePin={onTogglePin}
              filter={filter}
            />
          ))}
      </div>
    );
  }

  const isSel = selected.has(node.path);
  const isPinned = pinned.includes(node.path);
  return (
    <div className="tree-row file" style={pad}>
      <input
        type="checkbox"
        checked={isSel}
        onChange={() => onToggleSelect(node.path)}
        title="Include this file as context"
        aria-label={`Include ${node.path} as prompt context`}
      />
      <span className="tname" onClick={() => onToggleSelect(node.path)}>
        {node.name}
      </span>
      <span
        className={`pin ${isPinned ? 'on' : ''}`}
        title={isPinned ? 'Unpin' : 'Pin important file'}
        onClick={() => onTogglePin(node.path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTogglePin(node.path);
          }
        }}
      >
        ★
      </span>
    </div>
  );
}
