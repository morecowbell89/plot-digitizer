import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Check, CircleAlert, Info, Minus, Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Viewer } from './components/Viewer';
import { Minimap } from './components/Minimap';
import { DataPanel } from './components/DataPanel';
import { HelpPopover } from './components/HelpPopover';
import { initialState, isMarkerMode, reducer } from './state';
import { completeCalibration } from './lib/calibration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AXIS_LABELS } from './types';
import type { ImagePoint, StatusType, Viewport } from './types';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;

interface Toast {
  id: number;
  message: string;
  type: StatusType;
}

let toastSeq = 0;

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, translateX: 0, translateY: 0 });
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [smoothPan, setSmoothPan] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  const smoothPanTimer = useRef<number | undefined>(undefined);

  const { image, calibration, dataPoints, selection, mode } = state;
  const calibrated = useMemo(() => completeCalibration(calibration), [calibration]);

  useKeyboardShortcuts(selection, viewport.scale, dispatch);

  // Track the viewer's size for fit-to-view and the minimap indicator
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setViewerSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Notable events (success/error/info set by the reducer) surface as toasts
  const lastStatus = useRef(state.status);
  useEffect(() => {
    if (state.status === lastStatus.current) return;
    lastStatus.current = state.status;
    if (state.status.message === initialState.status.message) return;
    const id = ++toastSeq;
    setToasts((ts) => [...ts.slice(-3), { id, message: state.status.message, type: state.status.type }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3800);
  }, [state.status]);

  /** Brief transform transition for programmatic view changes. */
  const beginSmooth = useCallback(() => {
    setSmoothPan(true);
    window.clearTimeout(smoothPanTimer.current);
    smoothPanTimer.current = window.setTimeout(() => setSmoothPan(false), 300);
  }, []);

  const fitView = useCallback(() => {
    const el = viewerRef.current;
    if (!el || !image) return;
    const scale = Math.min(el.clientWidth / image.width, el.clientHeight / image.height, 1);
    setViewport({
      scale,
      translateX: (el.clientWidth - image.width * scale) / 2,
      translateY: (el.clientHeight - image.height * scale) / 2,
    });
  }, [image]);

  // Fit whenever a new image arrives
  useEffect(() => {
    fitView();
  }, [fitView]);

  // Announce calibration completion once
  const wasCalibrated = useRef(false);
  useEffect(() => {
    const isCalibrated = calibrated !== null;
    if (isCalibrated && !wasCalibrated.current) {
      dispatch({
        type: 'setStatus',
        message: 'Calibration complete — hit Digitize to start extracting points',
        statusType: 'success',
      });
    }
    wasCalibrated.current = isCalibrated;
  }, [calibrated]);

  const zoomBy = useCallback(
    (factor: number, center?: { x: number; y: number }, smooth = false) => {
      if (smooth) beginSmooth();
      setViewport((vp) => {
        const newScale = vp.scale * factor;
        if (newScale < MIN_SCALE || newScale > MAX_SCALE) return vp;
        const cx = center?.x ?? viewerSize.width / 2;
        const cy = center?.y ?? viewerSize.height / 2;
        return {
          scale: newScale,
          translateX: cx - (cx - vp.translateX) * factor,
          translateY: cy - (cy - vp.translateY) * factor,
        };
      });
    },
    [viewerSize, beginSmooth],
  );

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((vp) => ({ ...vp, translateX: vp.translateX + dx, translateY: vp.translateY + dy }));
  }, []);

  /** Center the view on an image position, with a brief smooth transition. */
  const centerOn = useCallback(
    (point: ImagePoint) => {
      setViewport((vp) => ({
        ...vp,
        translateX: viewerSize.width / 2 - point.x * vp.scale,
        translateY: viewerSize.height / 2 - point.y * vp.scale,
      }));
      beginSmooth();
    },
    [viewerSize, beginSmooth],
  );

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      dispatch({ type: 'setStatus', message: 'Please upload an image file', statusType: 'error' });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      dispatch({ type: 'imageLoaded', image: { url, width: img.naturalWidth, height: img.naturalHeight } });
    };
    img.src = url;
  }, []);

  // Paste a screenshot from the clipboard
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          if (image && !confirm('Replace current image with pasted screenshot?')) return;
          loadImageFile(new File([blob], 'pasted-screenshot.png', { type: blob.type }));
          dispatch({ type: 'setStatus', message: 'Screenshot pasted successfully!', statusType: 'success' });
          return;
        }
      }
      dispatch({
        type: 'setStatus',
        message: 'No image found in clipboard. Copy a screenshot and try again.',
        statusType: 'error',
      });
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [image, loadImageFile]);

  const selectPoint = useCallback(
    (index: number) => {
      const alreadySelected = selection?.kind === 'point' && selection.index === index;
      dispatch({ type: 'togglePointSelected', index });
      if (alreadySelected) return;
      // Bring an off-screen (or near-edge) point into view
      const point = dataPoints[index];
      const margin = 40;
      const screenX = point.x * viewport.scale + viewport.translateX;
      const screenY = point.y * viewport.scale + viewport.translateY;
      if (
        screenX < margin || screenX > viewerSize.width - margin ||
        screenY < margin || screenY > viewerSize.height - margin
      ) {
        centerOn(point);
      }
    },
    [selection, dataPoints, viewport, viewerSize, centerOn],
  );

  // What the user can do right now, shown in the floating hint pill
  const hint = useMemo(() => {
    if (!image) return null;
    if (selection?.kind === 'marker') {
      return `${AXIS_LABELS[selection.axis]} marker selected — arrows nudge (Shift ×10), click to re-place, Esc when done`;
    }
    if (isMarkerMode(mode)) {
      return `Click the ${AXIS_LABELS[mode]} reference point on the plot`;
    }
    if (mode === 'digitizing') {
      return 'Click along the curve to place points — right-drag pans, scroll zooms';
    }
    if (selection?.kind === 'point') {
      return `Point ${selection.index + 1} selected — arrows nudge, Del deletes, Esc deselects`;
    }
    return null;
  }, [image, selection, mode]);

  // Debug/automation handle
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__digitizer = { state, viewport };
  });

  return (
    <div className="app">
      <Sidebar state={state} dispatch={dispatch} calibrated={calibrated !== null} onFileSelected={loadImageFile} />
      <div className="workspace" ref={viewerRef}>
        <Viewer
          state={state}
          dispatch={dispatch}
          viewport={viewport}
          smoothPan={smoothPan}
          onPanBy={panBy}
          onZoomBy={zoomBy}
          onFileDropped={loadImageFile}
        />
        {image && (
          <Minimap image={image} viewport={viewport} viewerSize={viewerSize} onNavigate={centerOn} />
        )}
        {image && state.panelOpen && (
          <DataPanel state={state} dispatch={dispatch} calibrated={calibrated} onSelectPoint={selectPoint} />
        )}
        {hint && <div className="hint-pill">{hint}</div>}
        {image && (
          <div className="zoom-controls">
            <button aria-label="Zoom out" onClick={() => zoomBy(0.8, undefined, true)}>
              <Minus size={14} />
            </button>
            <div className="zoom-level">{Math.round(viewport.scale * 100)}%</div>
            <button aria-label="Zoom in" onClick={() => zoomBy(1.2, undefined, true)}>
              <Plus size={14} />
            </button>
            <button
              onClick={() => {
                beginSmooth();
                fitView();
              }}
            >
              Fit
            </button>
          </div>
        )}
        <HelpPopover />
        <div className="toasts">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? <Check size={14} /> : toast.type === 'error' ? <CircleAlert size={14} /> : <Info size={14} />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
