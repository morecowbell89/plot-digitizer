import type { CompleteCalibration, ImagePoint } from '../types';
import { extractDataPoint } from './calibration';
import { formatValue } from './format';

function dataValues(points: ImagePoint[], cal: CompleteCalibration) {
  return points.map((p) => extractDataPoint(p, cal));
}

export function toTabDelimited(points: ImagePoint[], cal: CompleteCalibration): string {
  let out = 'Index\tX\tY\n';
  dataValues(points, cal).forEach((v, i) => {
    out += `${i + 1}\t${formatValue(v.x)}\t${formatValue(v.y)}\n`;
  });
  return out;
}

export function toCsv(points: ImagePoint[], cal: CompleteCalibration): string {
  let out = 'X,Y\n';
  for (const v of dataValues(points, cal)) {
    out += `${formatValue(v.x)},${formatValue(v.y)}\n`;
  }
  return out;
}

export function toMatlab(points: ImagePoint[], cal: CompleteCalibration): string {
  const values = dataValues(points, cal);
  const xValues = values.map((v) => formatValue(v.x)).join(', ');
  const yValues = values.map((v) => formatValue(v.y)).join(', ');
  const plotFn =
    cal.xScale === 'log' && cal.yScale === 'log' ? 'loglog'
    : cal.xScale === 'log' ? 'semilogx'
    : cal.yScale === 'log' ? 'semilogy'
    : 'plot';

  return `% Extracted data from plot digitizer\n` +
    `% X-axis scale: ${cal.xScale}\n` +
    `% Y-axis scale: ${cal.yScale}\n` +
    `% Rotation correction: ${cal.rotationCorrection ? 'enabled' : 'disabled'}\n\n` +
    `x = [${xValues}];\n` +
    `y = [${yValues}];\n\n` +
    `% Plot the data\n` +
    `figure;\n` +
    `${plotFn}(x, y, 'o-');\n` +
    `xlabel('X');\n` +
    `ylabel('Y');\n` +
    `grid on;\n` +
    `title('Digitized Data');`;
}
