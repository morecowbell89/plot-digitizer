import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const SHORTCUTS: [string, string][] = [
  ['Right-drag', 'Pan the image'],
  ['Scroll', 'Zoom at cursor'],
  ['Click', 'Place point / marker'],
  ['← ↑ → ↓', 'Nudge selection'],
  ['Shift + arrows', 'Nudge ×10'],
  ['Del', 'Delete selected point'],
  ['Esc', 'Deselect / cancel'],
  ['Ctrl+V', 'Paste a screenshot'],
];

export function HelpPopover() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="help-button" title="Keyboard shortcuts" onClick={() => setOpen((o) => !o)}>
        <HelpCircle size={17} />
      </button>
      {open && (
        <div className="help-popover">
          <strong>Shortcuts</strong>
          {SHORTCUTS.map(([keys, action]) => (
            <div className="help-row" key={keys}>
              <span>{action}</span>
              <kbd>{keys}</kbd>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
