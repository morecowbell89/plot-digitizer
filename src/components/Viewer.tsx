import { useEffect, useRef, useState } from 'react';
import type { Dispatch, DragEvent, MouseEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import type { Action, DigitizerState } from '../state';
import { drawHairlineOverlay, drawOverlay } from '../lib/overlay';
import type { ImagePoint, Viewport } from '../types';

interface Props {
  state: DigitizerState;
  dispatch: Dispatch<Action>;
  viewport: Viewport;
  viewerSize: { width: number; height: number };
  smoothPan: boolean;
  onPanBy: (dx: number, dy: number) => void;
  onZoomBy: (factor: number, center: { x: number; y: number }) => void;
  onFileDropped: (file: File) => void;
}

const LOUPE_SIZE = 128;

export function Viewer({ state, dispatch, viewport, viewerSize, smoothPan, onPanBy, onZoomBy, onFileDropped }: Props) {
  const { image, mode, calibration, dataPoints, selection } = state;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hairlineRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Cursor position in image coordinates while placing, for the loupe
  const [cursor, setCursor] = useState<ImagePoint | null>(null);
  const [pulses, setPulses] = useState<{ id: number; x: number; y: number }[]>([]);
  const prevPointCount = useRef(dataPoints.length);

  // Repaint markers and points whenever anything they reflect changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    if (canvas.width !== image.width || canvas.height !== image.height) {
      canvas.width = image.width;
      canvas.height = image.height;
    }
    drawOverlay(canvas, calibration.points, dataPoints, selection);
  }, [image, calibration.points, dataPoints, selection]);

  // The center hairlines live on a screen-space canvas so they stay one
  // device pixel wide at any zoom; pan/zoom therefore needs a repaint
  useEffect(() => {
    const canvas = hairlineRef.current;
    if (!canvas || !image) return;
    drawHairlineOverlay(
      canvas,
      calibration.points,
      dataPoints,
      viewport,
      viewerSize.width,
      viewerSize.height,
      window.devicePixelRatio || 1,
    );
  }, [image, calibration.points, dataPoints, viewport, viewerSize]);

  // A freshly placed point gets a one-shot pulse ring at its screen position
  useEffect(() => {
    if (dataPoints.length > prevPointCount.current) {
      const point = dataPoints[dataPoints.length - 1];
      const id = Date.now();
      setPulses((ps) => [
        ...ps,
        {
          id,
          x: point.x * viewport.scale + viewport.translateX,
          y: point.y * viewport.scale + viewport.translateY,
        },
      ]);
      window.setTimeout(() => setPulses((ps) => ps.filter((p) => p.id !== id)), 600);
    }
    prevPointCount.current = dataPoints.length;
    // viewport is deliberately not a dependency: pulses spawn where the
    // point landed and don't follow later pans
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPoints]);

  // Wheel zoom about the cursor; native listener because React's is passive
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      if (!image) return;
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      onZoomBy(event.deltaY > 0 ? 0.9 : 1.1, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [image, onZoomBy]);

  const toImagePoint = (event: MouseEvent): ImagePoint => {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - viewport.translateX) / viewport.scale,
      y: (event.clientY - rect.top - viewport.translateY) / viewport.scale,
    };
  };

  const inBounds = (p: ImagePoint) =>
    image !== null && p.x >= 0 && p.x <= image.width && p.y >= 0 && p.y <= image.height;

  const onMouseDown = (event: MouseEvent) => {
    // Only right-click drags pan, leaving left-click free for placement
    if (!image || event.button !== 2) return;
    event.preventDefault();
    dragState.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (dragState.current) {
      onPanBy(event.clientX - dragState.current.x, event.clientY - dragState.current.y);
      dragState.current = { x: event.clientX, y: event.clientY };
      return;
    }
    // Track the cursor for the loupe only while placing something
    if (image && mode !== 'idle') {
      const point = toImagePoint(event);
      setCursor(inBounds(point) ? point : null);
    } else if (cursor) {
      setCursor(null);
    }
  };

  const endDrag = () => {
    dragState.current = null;
    setDragging(false);
  };

  const onClick = (event: MouseEvent) => {
    if (!image || event.button !== 0) return;

    if (mode === 'idle') {
      dispatch({ type: 'deselect' });
      return;
    }

    const point = toImagePoint(event);
    if (!inBounds(point)) return;

    if (mode === 'digitizing') {
      dispatch({ type: 'addDataPoint', point });
    } else {
      dispatch({ type: 'placeMarker', point });
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFileDropped(file);
  };

  // Loupe geometry: screen position (flipped near the top edge) plus the
  // background offset that centers the cursor's image position, magnified
  const loupe = (() => {
    if (!image || !cursor || dragging) return null;
    const zoom = Math.max(viewport.scale * 2, 2);
    const screenX = cursor.x * viewport.scale + viewport.translateX;
    const screenY = cursor.y * viewport.scale + viewport.translateY;
    const half = LOUPE_SIZE / 2;
    const above = screenY - LOUPE_SIZE - 18 > 0;
    return {
      left: screenX - half,
      top: above ? screenY - LOUPE_SIZE - 18 : screenY + 18,
      backgroundImage: `url(${image.url})`,
      backgroundSize: `${image.width * zoom}px ${image.height * zoom}px`,
      backgroundPosition: `${half - cursor.x * zoom}px ${half - cursor.y * zoom}px`,
    };
  })();

  return (
    <div
      ref={surfaceRef}
      className={`viewer-surface${dragging ? ' dragging' : ''}${mode !== 'idle' ? ' placing' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={() => {
        endDrag();
        setCursor(null);
      }}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!image && (
        <div
          className={`drop-zone${dragOver ? ' dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <ImagePlus size={36} strokeWidth={1.5} />
          <p className="title">Drop your plot image here</p>
          <p className="subtitle">
            or use <strong>Load image</strong> in the sidebar, or paste with <kbd>Ctrl+V</kbd>
          </p>
          <p className="formats">JPG · PNG · GIF · BMP · WebP</p>
        </div>
      )}
      {image && (
        <div
          className="canvas-container"
          style={{
            transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
            transition: smoothPan ? 'transform 0.3s ease-out' : undefined,
          }}
        >
          <img className="main-image" src={image.url} alt="Plot being digitized" draggable={false} />
          <canvas className="overlay-canvas" ref={canvasRef} />
        </div>
      )}
      {image && <canvas className="hairline-canvas" ref={hairlineRef} />}
      {pulses.map((pulse) => (
        <div key={pulse.id} className="pulse" style={{ left: pulse.x, top: pulse.y }} />
      ))}
      {loupe && <div className="loupe" style={loupe} />}
    </div>
  );
}
