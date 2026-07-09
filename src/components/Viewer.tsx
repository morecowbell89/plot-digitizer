import { useEffect, useRef, useState } from 'react';
import type { Dispatch, DragEvent, MouseEvent } from 'react';
import type { Action, DigitizerState } from '../state';
import { drawOverlay } from '../lib/overlay';
import type { Viewport } from '../types';

interface Props {
  state: DigitizerState;
  dispatch: Dispatch<Action>;
  viewport: Viewport;
  smoothPan: boolean;
  onPanBy: (dx: number, dy: number) => void;
  onZoomBy: (factor: number, center: { x: number; y: number }) => void;
  onFileDropped: (file: File) => void;
}

export function Viewer({ state, dispatch, viewport, smoothPan, onPanBy, onZoomBy, onFileDropped }: Props) {
  const { image, mode, calibration, dataPoints, selection } = state;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  const onMouseDown = (event: MouseEvent) => {
    // Only right-click drags pan, leaving left-click free for placement
    if (!image || event.button !== 2) return;
    event.preventDefault();
    dragState.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!dragState.current) return;
    onPanBy(event.clientX - dragState.current.x, event.clientY - dragState.current.y);
    dragState.current = { x: event.clientX, y: event.clientY };
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

    const rect = surfaceRef.current!.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left - viewport.translateX) / viewport.scale,
      y: (event.clientY - rect.top - viewport.translateY) / viewport.scale,
    };
    if (point.x < 0 || point.x > image.width || point.y < 0 || point.y > image.height) return;

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

  return (
    <div
      ref={surfaceRef}
      className={`viewer-surface${dragging ? ' dragging' : ''}${mode !== 'idle' ? ' placing' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
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
          <p><strong>Drag and drop your plot image here</strong></p>
          <p>or use the file picker above</p>
          <p>or press <span className="shortcut">Ctrl+V</span> to paste a screenshot</p>
          <p className="formats">Supports: JPG, PNG, GIF, BMP, WebP</p>
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
    </div>
  );
}
