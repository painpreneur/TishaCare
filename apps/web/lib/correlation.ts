export interface CorrelationResult {
  r: number;
  n: number;
}

const MIN_PAIRS_FOR_CORRELATION = 3;

/** Pearson correlation coefficient. Returns null when there isn't enough data to be meaningful. */
export function pearsonCorrelation(pairs: [number, number][]): CorrelationResult | null {
  const n = pairs.length;
  if (n < MIN_PAIRS_FOR_CORRELATION) return null;

  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanX;
    const dy = y - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  return { r: denominator === 0 ? 0 : numerator / denominator, n };
}

export function describeCorrelation(r: number): string {
  const abs = Math.abs(r);
  const strength =
    abs < 0.1 ? "практически отсутствует" : abs < 0.3 ? "слабая" : abs < 0.5 ? "умеренная" : abs < 0.7 ? "заметная" : "сильная";
  if (abs < 0.1) return strength;
  return `${strength} ${r > 0 ? "положительная" : "отрицательная"}`;
}
