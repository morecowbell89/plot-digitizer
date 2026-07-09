import { useMemo } from 'react';
import type { Dispatch, MouseEvent } from 'react';
import { Copy, Download, FileCode2, X } from 'lucide-react';
import type { Action, DigitizerState } from '../state';
import { isMarkerMode } from '../state';
import { extractDataPoint } from '../lib/calibration';
import { formatValue } from '../lib/format';
import { toCsv, toMatlab, toTabDelimited } from '../lib/exporters';
import { AXIS_LABELS } from '../types';
import type { CompleteCalibration } from '../types';

interface Props {
  state: DigitizerState;
  dispatch: Dispatch<Action>;
  calibrated: CompleteCalibration | null;
  onSelectPoint: (index: number) => void;
}

export function DataPanel({ state, dispatch, calibrated, onSelectPoint }: Props) {
  const { dataPoints, selection, mode } = state;

  // Values are derived from image positions on every render, so the table
  // can never drift from the current calibration
  const rows = useMemo(
    () =>
      dataPoints.map((point) =>
        calibrated ? extractDataPoint(point, calibrated) : null,
      ),
    [dataPoints, calibrated],
  );

  const focusedMarker =
    selection?.kind === 'marker' ? selection.axis : isMarkerMode(mode) ? mode : null;

  const setStatus = (message: string, statusType: 'info' | 'success' | 'error') =>
    dispatch({ type: 'setStatus', message, statusType });

  const requireData = (): boolean => {
    if (dataPoints.length === 0 || !calibrated) {
      setStatus('No data points to export', 'error');
      return false;
    }
    return true;
  };

  const copyText = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text).then(
      () => setStatus(successMessage, 'success'),
      () => setStatus('Failed to copy. Data is displayed in panel.', 'error'),
    );
  };

  const exportCopy = () => {
    if (requireData()) copyText(toTabDelimited(dataPoints, calibrated!), 'Data copied to clipboard!');
  };

  const exportMatlab = () => {
    if (requireData()) copyText(toMatlab(dataPoints, calibrated!), 'MATLAB code copied to clipboard!');
  };

  const exportCsv = () => {
    if (!requireData()) return;
    const blob = new Blob([toCsv(dataPoints, calibrated!)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digitized_data.csv';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('CSV file downloaded!', 'success');
  };

  const onDelete = (event: MouseEvent, index: number) => {
    event.stopPropagation();
    dispatch({ type: 'deletePoint', index });
  };

  return (
    <div className={`data-panel${focusedMarker ? ' marker-focus' : ''}`}>
      <div className="data-panel-header">
        <h4>
          Extracted data
          {dataPoints.length > 0 && <span className="badge">{dataPoints.length}</span>}
        </h4>
        <button
          className="icon-btn"
          title="Close panel"
          onClick={() => dispatch({ type: 'setPanelOpen', open: false })}
        >
          <X size={14} />
        </button>
      </div>
      <div className="data-panel-notice">
        {focusedMarker &&
          `Adjusting ${AXIS_LABELS[focusedMarker]} marker — press Digitize to place points, or click a data row to edit them`}
      </div>
      <div className="data-panel-content">
        <div className="data-output">
          {dataPoints.length === 0 ? (
            <div className="empty">No data points yet. Click on the plot to extract values.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Index</th>
                  <th>X</th>
                  <th>Y</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((value, index) => (
                  <tr
                    key={index}
                    className={selection?.kind === 'point' && selection.index === index ? 'selected' : ''}
                    onClick={() => onSelectPoint(index)}
                  >
                    <td>{index + 1}</td>
                    <td>{value ? formatValue(value.x) : '—'}</td>
                    <td>{value ? formatValue(value.y) : '—'}</td>
                    <td>
                      <button className="row-delete" title="Delete this point" onClick={(e) => onDelete(e, index)}>
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="export-buttons">
          <button className="btn" onClick={exportCopy}>
            <Copy size={12} />
            Copy
          </button>
          <button className="btn" onClick={exportMatlab}>
            <FileCode2 size={12} />
            MATLAB
          </button>
          <button className="btn" onClick={exportCsv}>
            <Download size={12} />
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}
