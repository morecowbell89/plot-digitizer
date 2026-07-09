import { useRef } from 'react';
import type { ChangeEvent, Dispatch } from 'react';
import { Check, Crosshair, ImagePlus, Square, Table2, Trash2, Undo2 } from 'lucide-react';
import type { Action, DigitizerState } from '../state';
import { missingCalibration } from '../lib/calibration';
import { AXIS_KEYS, AXIS_LABELS } from '../types';
import type { AxisKey, ScaleType } from '../types';

interface Props {
  state: DigitizerState;
  dispatch: Dispatch<Action>;
  calibrated: boolean;
  onFileSelected: (file: File) => void;
}

/** Sidebar chip colors, brightened versions of the canvas marker colors. */
const DOT_COLORS: Record<AxisKey, string> = {
  xMin: '#ff5c5c',
  xMax: '#ffa04d',
  yMin: '#6d8aff',
  yMax: '#b06dff',
};

function calibrationStatusText(state: DigitizerState, calibrated: boolean): string {
  if (!state.image) return 'Load image to begin';
  if (calibrated) return 'Calibrated ✓';
  const missing = missingCalibration(state.calibration);
  if (missing.length === AXIS_KEYS.length * 2) return 'Ready for calibration';
  if (missing.length > 0 && missing.length <= 4) {
    return `Missing: ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? '...' : ''}`;
  }
  return 'Calibration needed';
}

function Segmented({ value, onChange }: { value: ScaleType; onChange: (v: ScaleType) => void }) {
  return (
    <div className="segmented">
      {(['linear', 'log'] as const).map((option) => (
        <button
          key={option}
          className={value === option ? 'active' : ''}
          onClick={() => onChange(option)}
        >
          {option === 'linear' ? 'Linear' : 'Log'}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ state, dispatch, calibrated, onFileSelected }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { image, mode, calibration, dataPoints, panelOpen } = state;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
  };

  const openPicker = () => {
    // Loading (or re-loading) an image starts over, and clearing the value
    // lets the same file be re-selected
    dispatch({ type: 'reset' });
    const input = fileRef.current!;
    input.value = '';
    input.click();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <Crosshair size={16} />
        <h1>Plot Digitizer</h1>
      </div>

      <section>
        <h2>Image</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={onFileChange}
        />
        <button className="btn wide" onClick={openPicker}>
          <ImagePlus size={14} />
          {image ? 'Replace image' : 'Load image'}
        </button>
        {!image && <p className="side-hint">Drop an image anywhere, or paste a screenshot with Ctrl+V.</p>}
      </section>

      <section>
        <div className="section-head">
          <h2>Calibration</h2>
          <span className={`calibration-status${calibrated ? ' ok' : ''}`}>
            {calibrationStatusText(state, calibrated)}
          </span>
        </div>
        {AXIS_KEYS.map((axis) => (
          <div className="cal-row" key={axis}>
            <button
              id={`set${axis[0].toUpperCase()}${axis.slice(1)}`}
              disabled={!image}
              className={`marker-chip${mode === axis ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'enterMarkerMode', axis })}
            >
              <span className="marker-dot" style={{ background: DOT_COLORS[axis] }} />
              {AXIS_LABELS[axis]}
              {calibration.points[axis] && <Check size={12} className="placed" />}
            </button>
            <input
              type="number"
              placeholder="Value"
              step="any"
              value={calibration.values[axis]}
              onChange={(e) => dispatch({ type: 'setCalibrationValue', axis, value: e.target.value })}
            />
          </div>
        ))}
        <div className="cal-row-mini">
          <span>X scale</span>
          <Segmented
            value={calibration.xScale}
            onChange={(scale) => dispatch({ type: 'setScale', axis: 'x', scale })}
          />
        </div>
        <div className="cal-row-mini">
          <span>Y scale</span>
          <Segmented
            value={calibration.yScale}
            onChange={(scale) => dispatch({ type: 'setScale', axis: 'y', scale })}
          />
        </div>
        <div className="cal-row-mini">
          <span>Rotation correction</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={calibration.rotationCorrection}
              onChange={(e) => dispatch({ type: 'setRotationCorrection', enabled: e.target.checked })}
            />
            <span className="switch-track"><span className="switch-thumb" /></span>
          </label>
        </div>
      </section>

      <section>
        <h2>Digitize</h2>
        {mode === 'digitizing' ? (
          <button id="stopDigitizing" className="btn danger wide" onClick={() => dispatch({ type: 'stopDigitizing' })}>
            <Square size={12} />
            Stop
          </button>
        ) : (
          <button
            id="startDigitizing"
            className="btn primary wide"
            disabled={!calibrated}
            onClick={() => dispatch({ type: 'startDigitizing' })}
          >
            <Crosshair size={14} />
            Digitize
          </button>
        )}
        <div className="btn-row">
          <button className="btn" disabled={dataPoints.length === 0} onClick={() => dispatch({ type: 'undoLastPoint' })}>
            <Undo2 size={13} />
            Undo
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'clearAll' })}>
            <Trash2 size={13} />
            Clear
          </button>
          <button
            id="toggleDataPanel"
            className={`btn${panelOpen ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'setPanelOpen', open: !panelOpen })}
          >
            <Table2 size={13} />
            {panelOpen ? 'Hide' : 'Data'}
            {dataPoints.length > 0 && <span className="badge">{dataPoints.length}</span>}
          </button>
        </div>
      </section>
    </aside>
  );
}
