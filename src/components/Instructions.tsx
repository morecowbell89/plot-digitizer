export function Instructions() {
  return (
    <div className="instructions">
      <strong>Controls:</strong><br />
      <span className="shortcut">Right-click + drag</span>: Pan image<span className="divider">•</span>
      <span className="shortcut">Mouse wheel</span>: Zoom<span className="divider">•</span>
      <span className="shortcut">Left-click</span>: Place points<br />
      <span className="shortcut">Minimap click</span>: Jump to location<span className="divider">•</span>
      <span className="shortcut">+/- buttons</span>: Precise zoom<br />
      <span className="shortcut">Arrow keys</span>: Nudge selection<span className="divider">•</span>
      <span className="shortcut">Shift+Arrow</span>: Larger step<span className="divider">•</span>
      <span className="shortcut">Esc</span>: Deselect<br />
      <span className="shortcut">Data row click</span>: Select point<span className="divider">•</span>
      <span className="shortcut">Del</span>: Remove selected point
    </div>
  );
}
