/** A position in image pixels (the plot image's natural resolution). */
export interface ImagePoint {
  x: number;
  y: number;
}

export type AxisKey = 'xMin' | 'xMax' | 'yMin' | 'yMax';

export const AXIS_KEYS: AxisKey[] = ['xMin', 'xMax', 'yMin', 'yMax'];

export const AXIS_LABELS: Record<AxisKey, string> = {
  xMin: 'X Min',
  xMax: 'X Max',
  yMin: 'Y Min',
  yMax: 'Y Max',
};

export type ScaleType = 'linear' | 'log';

/** 'idle', placing/adjusting one calibration marker, or placing data points. */
export type Mode = 'idle' | AxisKey | 'digitizing';

/**
 * At most one thing owns the selection at a time — a calibration marker or a
 * data point. Arrow keys, Delete, and the data-panel dim all key off this.
 */
export type Selection =
  | { kind: 'marker'; axis: AxisKey }
  | { kind: 'point'; index: number }
  | null;

export interface Calibration {
  points: Record<AxisKey, ImagePoint | null>;
  values: Record<AxisKey, string>;
  xScale: ScaleType;
  yScale: ScaleType;
  rotationCorrection: boolean;
}

/** Calibration with everything present, as produced by `completeCalibration`. */
export interface CompleteCalibration {
  points: Record<AxisKey, ImagePoint>;
  values: Record<AxisKey, number>;
  xScale: ScaleType;
  yScale: ScaleType;
  rotationCorrection: boolean;
}

export type StatusType = 'info' | 'success' | 'error';

export interface Status {
  message: string;
  type: StatusType;
}

export interface LoadedImage {
  url: string;
  width: number;
  height: number;
}

/** The viewer's pan/zoom transform: screen = image * scale + translate. */
export interface Viewport {
  scale: number;
  translateX: number;
  translateY: number;
}
