/**
 * Plain notation with 5 significant digits for normal-range values,
 * exponential only where plain would be unreadable.
 */
export function formatValue(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e7 || abs < 1e-4) {
    return value.toExponential(4);
  }
  return String(Number(value.toPrecision(5)));
}
