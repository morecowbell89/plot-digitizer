import type { Calibration, CompleteCalibration, ImagePoint } from '../types';
import { AXIS_KEYS, AXIS_LABELS } from '../types';

/**
 * Returns the calibration with markers placed and values parsed, or null if
 * anything is missing. All value extraction goes through this gate.
 */
export function completeCalibration(cal: Calibration): CompleteCalibration | null {
  const points: Partial<Record<string, ImagePoint>> = {};
  const values: Partial<Record<string, number>> = {};
  for (const key of AXIS_KEYS) {
    const point = cal.points[key];
    const raw = cal.values[key];
    if (!point || raw.trim() === '') return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    points[key] = point;
    values[key] = value;
  }
  return {
    points: points as CompleteCalibration['points'],
    values: values as CompleteCalibration['values'],
    xScale: cal.xScale,
    yScale: cal.yScale,
    rotationCorrection: cal.rotationCorrection,
  };
}

/** The axes still needed before digitizing can start, in fixed order. */
export function missingCalibration(cal: Calibration): string[] {
  const missing: string[] = [];
  for (const key of AXIS_KEYS) {
    if (!cal.points[key]) missing.push(`${AXIS_LABELS[key]} point`);
  }
  for (const key of AXIS_KEYS) {
    if (cal.values[key].trim() === '') missing.push(`${AXIS_LABELS[key]} value`);
  }
  return missing;
}

function interpolate(ratio: number, min: number, max: number, scale: 'linear' | 'log'): number {
  if (scale === 'log') {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    return Math.pow(10, logMin + ratio * (logMax - logMin));
  }
  return min + ratio * (max - min);
}

/**
 * Convert an image position to plot data values. With rotation correction on,
 * the image is first rotated about the xMin marker by the angle of the
 * xMin→xMax line, compensating for slightly rotated source images.
 */
export function extractDataPoint(pos: ImagePoint, cal: CompleteCalibration): { x: number; y: number } {
  const { points } = cal;
  let xRatio: number;
  let yRatio: number;

  if (cal.rotationCorrection) {
    const angle = Math.atan2(points.xMax.y - points.xMin.y, points.xMax.x - points.xMin.x);
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const align = (p: ImagePoint): ImagePoint => {
      const relX = p.x - points.xMin.x;
      const relY = p.y - points.xMin.y;
      return {
        x: relX * cos - relY * sin + points.xMin.x,
        y: relX * sin + relY * cos + points.xMin.y,
      };
    };

    const alignedPos = align(pos);
    const alignedXMax = align(points.xMax);
    const alignedYMin = align(points.yMin);
    const alignedYMax = align(points.yMax);

    xRatio = (alignedPos.x - points.xMin.x) / (alignedXMax.x - points.xMin.x);
    yRatio = (alignedYMin.y - alignedPos.y) / (alignedYMin.y - alignedYMax.y);
  } else {
    xRatio = (pos.x - points.xMin.x) / (points.xMax.x - points.xMin.x);
    yRatio = (points.yMin.y - pos.y) / (points.yMin.y - points.yMax.y);
  }

  return {
    x: interpolate(xRatio, cal.values.xMin, cal.values.xMax, cal.xScale),
    y: interpolate(yRatio, cal.values.yMin, cal.values.yMax, cal.yScale),
  };
}
