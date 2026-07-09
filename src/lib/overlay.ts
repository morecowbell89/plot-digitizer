import type { AxisKey, ImagePoint, Selection, Viewport } from '../types';

const MARKER_COLORS: Record<AxisKey, string> = {
  xMin: '#ff4444',
  xMax: '#ff8844',
  yMin: '#4444ff',
  yMax: '#8844ff',
};

/**
 * Dashed ring around the marker/point the arrow keys will nudge; black
 * underlay keeps the white dashes visible on light backgrounds.
 */
function drawSelectionRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, 2 * Math.PI);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** X-shaped marker for the X axis, +-shaped for the Y axis. */
function drawCalibrationPoint(
  ctx: CanvasRenderingContext2D,
  axis: AxisKey,
  point: ImagePoint,
  selected: boolean,
) {
  ctx.save();

  if (selected) {
    drawSelectionRing(ctx, point.x, point.y);
  }

  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = MARKER_COLORS[axis];
  ctx.lineWidth = 4;

  const size = 15;
  ctx.beginPath();
  if (axis === 'xMin' || axis === 'xMax') {
    ctx.moveTo(point.x - size, point.y - size);
    ctx.lineTo(point.x + size, point.y + size);
    ctx.moveTo(point.x + size, point.y - size);
    ctx.lineTo(point.x - size, point.y + size);
  } else {
    ctx.moveTo(point.x - size, point.y);
    ctx.lineTo(point.x + size, point.y);
    ctx.moveTo(point.x, point.y - size);
    ctx.lineTo(point.x, point.y + size);
  }
  ctx.stroke();

  ctx.fillStyle = MARKER_COLORS[axis];
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

/**
 * Crosshair with heavy outer arms for findability and an open center so the
 * curve stays visible; the screen-space hairline overlay marks the exact
 * pixel through the hole.
 */
function drawDataPoint(ctx: CanvasRenderingContext2D, { x, y }: ImagePoint, selected: boolean) {
  const arm = 14;
  const hole = 5;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.lineCap = 'round';

  // Black underlay then green, so the hairlines read on any background
  for (const [color, width] of [['black', 4], ['#00ff00', 2]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x - arm, y); ctx.lineTo(x - hole, y);
    ctx.moveTo(x + hole, y); ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm); ctx.lineTo(x, y - hole);
    ctx.moveTo(x, y + hole); ctx.lineTo(x, y + arm);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, hole, 0, 2 * Math.PI);
    ctx.stroke();
  }

  if (selected) {
    drawSelectionRing(ctx, x, y);
  }

  ctx.restore();
}

export function drawOverlay(
  canvas: HTMLCanvasElement,
  calibrationPoints: Record<AxisKey, ImagePoint | null>,
  dataPoints: ImagePoint[],
  selection: Selection,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const axis of Object.keys(MARKER_COLORS) as AxisKey[]) {
    const point = calibrationPoints[axis];
    if (point) {
      const selected = selection?.kind === 'marker' && selection.axis === axis;
      drawCalibrationPoint(ctx, axis, point, selected);
    }
  }

  dataPoints.forEach((point, index) => {
    const selected = selection?.kind === 'point' && selection.index === index;
    drawDataPoint(ctx, point, selected);
  });
}

/**
 * Whisker-thin crosses through each marker/point center — the precise pixel
 * that was selected. Drawn on a separate canvas in *screen* coordinates
 * (never scaled with the image), so the hairline is one crisp device pixel
 * at any zoom, while its span grows with the marker it cuts through. A faint
 * black outline keeps the white core readable on any plot background.
 */
export function drawHairlineOverlay(
  canvas: HTMLCanvasElement,
  calibrationPoints: Record<AxisKey, ImagePoint | null>,
  dataPoints: ImagePoint[],
  viewport: Viewport,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
) {
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cross = (point: ImagePoint, imageSpan: number) => {
    // Snap to the pixel grid (+0.5) so a 1px stroke fills exactly one pixel
    const x = Math.round(point.x * viewport.scale + viewport.translateX) + 0.5;
    const y = Math.round(point.y * viewport.scale + viewport.translateY) + 0.5;
    const span = Math.max(imageSpan * viewport.scale, 9);
    if (x < -span || x > cssWidth + span || y < -span || y > cssHeight + span) return;
    for (const [color, width] of [['rgba(0, 0, 0, 0.6)', 3], ['#ffffff', 1]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x - span, y);
      ctx.lineTo(x + span, y);
      ctx.moveTo(x, y - span);
      ctx.lineTo(x, y + span);
      ctx.stroke();
    }
  };

  for (const axis of Object.keys(MARKER_COLORS) as AxisKey[]) {
    const point = calibrationPoints[axis];
    if (point) cross(point, 15);
  }
  for (const point of dataPoints) cross(point, 14);
}
