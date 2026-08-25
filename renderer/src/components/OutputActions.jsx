import React from 'react';
import { OUTPUT_ACTIONS } from '../constants.js';

export default function OutputActions({ disabled, onAction, onRegenerate, onSave, saved }) {
  return (
    <div>
      <div className="section-title">Refine</div>
      <div className="btn-group">
        <button className="btn sm" disabled={disabled} onClick={onRegenerate} title="Generate again">
          ↻ Regenerate
        </button>
        {OUTPUT_ACTIONS.map((a) => (
          <button key={a.key} className="btn sm" disabled={disabled} onClick={() => onAction(a.key)} title={a.label}>
            {a.label}
          </button>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 16 }}>
        Save
      </div>
      <div className="btn-group">
        <button className="btn sm primary" disabled={disabled} onClick={onSave}>
          {saved ? '✓ Saved' : 'Save Prompt'}
        </button>
      </div>
    </div>
  );
}
