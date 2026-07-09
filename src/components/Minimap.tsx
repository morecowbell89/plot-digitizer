import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { ImagePoint, LoadedImage, Viewport } from '../types';

interface Props {
  image: LoadedImage;
  viewport: Viewport;
  viewerSize: { width: number; height: number };
  onNavigate: (point: ImagePoint) => void;
}

export function Minimap({ image, viewport, viewerSize, onNavigate }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Fully visible while the view is changing (and on hover via CSS),
  // ghosted otherwise so it doesn't cover the plot
  const [active, setActive] = useState(true);

  useEffect(() => {
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 1600);
    return () => window.clearTimeout(timer);
  }, [viewport]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The image is letterboxed into the minimap (object-fit: contain)
  const miniScale = Math.min(size.width / image.width, size.height / image.height);
  const offsetX = (size.width - image.width * miniScale) / 2;
  const offsetY = (size.height - image.height * miniScale) / 2;

  const indicatorX = (-viewport.translateX / viewport.scale) * miniScale + offsetX;
  const indicatorY = (-viewport.translateY / viewport.scale) * miniScale + offsetY;
  const indicatorW = (viewerSize.width / viewport.scale) * miniScale;
  const indicatorH = (viewerSize.height / viewport.scale) * miniScale;

  const onClick = (event: MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    onNavigate({
      x: (event.clientX - rect.left - offsetX) / miniScale,
      y: (event.clientY - rect.top - offsetY) / miniScale,
    });
  };

  return (
    <div className={`minimap${active ? ' visible' : ''}`} ref={ref} onClick={onClick}>
      <img className="minimap-image" src={image.url} alt="" draggable={false} />
      <div
        className="viewport-indicator"
        style={{
          left: Math.max(0, indicatorX),
          top: Math.max(0, indicatorY),
          width: Math.min(indicatorW, size.width - Math.max(0, indicatorX)),
          height: Math.min(indicatorH, size.height - Math.max(0, indicatorY)),
        }}
      />
    </div>
  );
}
