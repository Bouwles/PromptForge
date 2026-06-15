import React, { useState } from 'react';

export default function PromptEditor({ value, onChange, streaming }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  const chars = value ? value.length : 0;

  return (
    <div className="editor-wrap">
      <div className="editor-head">
        <span>
          {streaming ? (
            <>
              <span className="spin" /> generating…
            </>
          ) : (
            <>generated prompt · {chars} chars</>
          )}
        </span>
        <button className="btn sm" onClick={copy} disabled={!value}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <textarea
        className="editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="The generated prompt will appear here. You can edit it before copying."
        spellCheck={false}
      />
    </div>
  );
}
