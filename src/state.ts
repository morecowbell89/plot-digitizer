import type {
  AxisKey,
  Calibration,
  ImagePoint,
  LoadedImage,
  Mode,
  Selection,
  Status,
  StatusType,
} from './types';
import { AXIS_KEYS, AXIS_LABELS } from './types';
import { completeCalibration } from './lib/calibration';

export interface DigitizerState {
  image: LoadedImage | null;
  mode: Mode;
  calibration: Calibration;
  /** Image positions only — data values are always derived from calibration. */
  dataPoints: ImagePoint[];
  selection: Selection;
  status: Status;
  panelOpen: boolean;
}

export const initialState: DigitizerState = {
  image: null,
  mode: 'idle',
  calibration: {
    points: { xMin: null, xMax: null, yMin: null, yMax: null },
    values: { xMin: '', xMax: '', yMin: '', yMax: '' },
    xScale: 'linear',
    yScale: 'linear',
    rotationCorrection: true,
  },
  dataPoints: [],
  selection: null,
  status: { message: 'Drag and drop an image or use the file picker to begin', type: 'info' },
  panelOpen: false,
};

export type Action =
  | { type: 'imageLoaded'; image: LoadedImage }
  | { type: 'reset' }
  | { type: 'enterMarkerMode'; axis: AxisKey }
  | { type: 'startDigitizing' }
  | { type: 'stopDigitizing' }
  | { type: 'placeMarker'; point: ImagePoint }
  | { type: 'setCalibrationValue'; axis: AxisKey; value: string }
  | { type: 'setScale'; axis: 'x' | 'y'; scale: 'linear' | 'log' }
  | { type: 'setRotationCorrection'; enabled: boolean }
  | { type: 'addDataPoint'; point: ImagePoint }
  | { type: 'togglePointSelected'; index: number }
  | { type: 'deletePoint'; index: number }
  | { type: 'undoLastPoint' }
  | { type: 'nudgeSelection'; dx: number; dy: number }
  | { type: 'deselect' }
  | { type: 'clearAll' }
  | { type: 'setStatus'; message: string; statusType: StatusType }
  | { type: 'setPanelOpen'; open: boolean };

export const isMarkerMode = (mode: Mode): mode is AxisKey => AXIS_KEYS.includes(mode as AxisKey);

function status(message: string, type: StatusType = 'info'): Status {
  return { message, type };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clearedPoints(state: DigitizerState): DigitizerState {
  return {
    ...state,
    mode: 'idle',
    calibration: {
      ...state.calibration,
      points: { xMin: null, xMax: null, yMin: null, yMax: null },
      values: { xMin: '', xMax: '', yMin: '', yMax: '' },
    },
    dataPoints: [],
    selection: null,
  };
}

export function reducer(state: DigitizerState, action: Action): DigitizerState {
  switch (action.type) {
    case 'imageLoaded':
      return {
        ...clearedPoints(state),
        image: action.image,
        status: status('Image loaded — set the four axis markers to calibrate'),
      };

    case 'reset':
      return {
        ...clearedPoints(state),
        image: null,
        status: initialState.status,
      };

    case 'enterMarkerMode': {
      // Re-select an existing marker so arrow keys can nudge it. Entering a
      // marker mode also cleanly exits digitize mode. The contextual hint
      // pill derives its message from mode/selection, so no status here.
      const existing = state.calibration.points[action.axis];
      return {
        ...state,
        mode: action.axis,
        selection: existing ? { kind: 'marker', axis: action.axis } : null,
      };
    }

    case 'startDigitizing':
      if (!completeCalibration(state.calibration)) return state;
      return { ...state, mode: 'digitizing', selection: null };

    case 'stopDigitizing':
      return { ...state, mode: 'idle' };

    case 'placeMarker': {
      if (!isMarkerMode(state.mode)) return state;
      const axis = state.mode;
      return {
        ...state,
        mode: 'idle',
        calibration: {
          ...state.calibration,
          points: { ...state.calibration.points, [axis]: action.point },
        },
        selection: { kind: 'marker', axis },
        status: status(
          `${AXIS_LABELS[axis]} marker set — fine-tune with arrow keys, then enter its value`,
          'success',
        ),
      };
    }

    case 'setCalibrationValue':
      return {
        ...state,
        calibration: {
          ...state.calibration,
          values: { ...state.calibration.values, [action.axis]: action.value },
        },
      };

    case 'setScale':
      return {
        ...state,
        calibration: {
          ...state.calibration,
          [action.axis === 'x' ? 'xScale' : 'yScale']: action.scale,
        },
      };

    case 'setRotationCorrection':
      return {
        ...state,
        calibration: { ...state.calibration, rotationCorrection: action.enabled },
      };

    case 'addDataPoint': {
      if (state.mode !== 'digitizing' || !completeCalibration(state.calibration)) return state;
      return { ...state, dataPoints: [...state.dataPoints, action.point] };
    }

    case 'togglePointSelected': {
      const alreadySelected =
        state.selection?.kind === 'point' && state.selection.index === action.index;
      if (alreadySelected) {
        return { ...state, selection: null };
      }
      // Selecting a row pulls focus back from marker adjustment, including
      // leaving an in-progress marker placement mode
      return {
        ...state,
        mode: isMarkerMode(state.mode) ? 'idle' : state.mode,
        selection: { kind: 'point', index: action.index },
      };
    }

    case 'deletePoint': {
      const dataPoints = state.dataPoints.filter((_, i) => i !== action.index);
      let selection = state.selection;
      if (selection?.kind === 'point') {
        if (selection.index === action.index) selection = null;
        else if (selection.index > action.index) selection = { kind: 'point', index: selection.index - 1 };
      }
      return {
        ...state,
        dataPoints,
        selection,
        status: status(`Point ${action.index + 1} deleted — ${dataPoints.length} points remaining`),
      };
    }

    case 'undoLastPoint': {
      if (state.dataPoints.length === 0) return state;
      const dataPoints = state.dataPoints.slice(0, -1);
      let selection = state.selection;
      if (selection?.kind === 'point' && selection.index >= dataPoints.length) selection = null;
      return {
        ...state,
        dataPoints,
        selection,
        status: dataPoints.length === 0 ? status('All data points removed') : state.status,
      };
    }

    case 'nudgeSelection': {
      if (!state.selection || !state.image) return state;
      const move = (p: ImagePoint): ImagePoint => ({
        x: clamp(p.x + action.dx, 0, state.image!.width),
        y: clamp(p.y + action.dy, 0, state.image!.height),
      });
      if (state.selection.kind === 'marker') {
        const axis = state.selection.axis;
        const point = state.calibration.points[axis];
        if (!point) return state;
        return {
          ...state,
          calibration: {
            ...state.calibration,
            points: { ...state.calibration.points, [axis]: move(point) },
          },
        };
      }
      const index = state.selection.index;
      return {
        ...state,
        dataPoints: state.dataPoints.map((p, i) => (i === index ? move(p) : p)),
      };
    }

    case 'deselect': {
      const leavingPlacement = isMarkerMode(state.mode);
      if (!state.selection && !leavingPlacement) return state;
      return {
        ...state,
        mode: leavingPlacement ? 'idle' : state.mode,
        selection: null,
      };
    }

    case 'clearAll':
      return {
        ...clearedPoints(state),
        status: status('All points and calibration cleared'),
      };

    case 'setStatus':
      return { ...state, status: status(action.message, action.statusType) };

    case 'setPanelOpen':
      return { ...state, panelOpen: action.open };
  }
}
