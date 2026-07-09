import type { ChangeEvent, Dispatch } from 'react';
import type { Action, DigitizerState } from '../state';
import { missingCalibration } from '../lib/calibration';
import { AXIS_KEYS, AXIS_LABELS } from '../types';
import type { ScaleType } from '../types';

interface Props {
  state: DigitizerState;
  dispatch: Dispatch<Action>;
  calibrated: boolean;
  scale: number;
  onZoomBy: (factor: number) => void;
  onFit: () => void;
  onFileSelected: (file: File) => void;
}

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

export function TopControls({ state, dispatch, calibrated, scale, onZoomBy, onFit, onFileSelected }: Props) {
  const { image, mode, calibration, dataPoints, panelOpen } = state;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="top-controls">
      <div className="control-group">
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          onClick={(e) => {
            // Clicking the picker starts over, and clearing the value lets
            // the same file be re-selected
            dispatch({ type: 'reset' });
            e.currentTarget.value = '';
          }}
        />
      </div>

      <div className="control-group">
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => onZoomBy(0.8)}>-</button>
          <div className="zoom-level">{Math.round(scale * 100)}%</div>
          <button className="zoom-btn" onClick={() => onZoomBy(1.2)}>+</button>
          <button className="zoom-btn" onClick={onFit}>Fit</button>
        </div>
      </div>

      <div className="control-group">
        <label>X Scale:</label>
        <select
          value={calibration.xScale}
          onChange={(e) => dispatch({ type: 'setScale', axis: 'x', scale: e.target.value as ScaleType })}
        >
          <option value="linear">Linear</option>
          <option value="log">Log</option>
        </select>
        <label>Y Scale:</label>
        <select
          value={calibration.yScale}
          onChange={(e) => dispatch({ type: 'setScale', axis: 'y', scale: e.target.value as ScaleType })}
        >
          <option value="linear">Linear</option>
          <option value="log">Log</option>
        </select>
      </div>

      {(['x', 'y'] as const).map((axisGroup) => (
        <div className="control-group" key={axisGroup}>
          {AXIS_KEYS.filter((k) => k.startsWith(axisGroup)).map((axis) => (
            <span key={axis} style={{ display: 'contents' }}>
              <button
                id={`set${axis[0].toUpperCase()}${axis.slice(1)}`}
                disabled={!image}
                className={mode === axis ? 'active' : ''}
                onClick={() => dispatch({ type: 'enterMarkerMode', axis })}
              >
                {AXIS_LABELS[axis]}
              </button>
              <input
                type="number"
                placeholder="Value"
                step="any"
                value={calibration.values[axis]}
                onChange={(e) => dispatch({ type: 'setCalibrationValue', axis, value: e.target.value })}
              />
            </span>
          ))}
        </div>
      ))}

      <div className="control-group">
        {mode === 'digitizing' ? (
          <button
            id="stopDigitizing"
            style={{ background: '#dc3545' }}
            onClick={() => dispatch({ type: 'stopDigitizing' })}
          >
            Stop
          </button>
        ) : (
          <button
            id="startDigitizing"
            disabled={!calibrated}
            onClick={() => dispatch({ type: 'startDigitizing' })}
          >
            Digitize
          </button>
        )}
        <button onClick={() => dispatch({ type: 'clearAll' })}>Clear</button>
        <button disabled={dataPoints.length === 0} onClick={() => dispatch({ type: 'undoLastPoint' })}>
          Undo
        </button>
        <button id="toggleDataPanel" onClick={() => dispatch({ type: 'setPanelOpen', open: !panelOpen })}>
          {panelOpen ? 'Hide' : 'Data'}
        </button>
      </div>

      <div className="control-group">
        <input
          type="checkbox"
          id="rotationCorrection"
          checked={calibration.rotationCorrection}
          onChange={(e) => dispatch({ type: 'setRotationCorrection', enabled: e.target.checked })}
        />
        <label htmlFor="rotationCorrection">Rotation Correction</label>
      </div>

      <span className="calibration-status">{calibrationStatusText(state, calibrated)}</span>
    </div>
  );
}
