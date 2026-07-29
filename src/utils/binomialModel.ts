/**
 * Mathematical binomial model for variant detection probability in NGS analysis.
 * Based on Cabello-Aguilar, Vendrell, Solassol (Diseases 2025):
 * "Real-World Technical Hurdles of NGS Analysis: Lessons from Clinical Implementation"
 */

/**
 * Calculates the probability of detecting a variant supported by at least `minReads` unique reads
 * given Depth of Coverage D and Variant Allele Frequency p (VAF).
 *
 * P(X >= minReads) = 1 - sum_{k=0}^{minReads-1} [ C(D, k) * p^k * (1-p)^(D-k) ]
 * P(Loss / False Negative) = sum_{k=0}^{minReads-1} [ C(D, k) * p^k * (1-p)^(D-k) ]
 */
export function calculateVariantDetectionProb(
  depth: number,
  vaf: number, // e.g., 0.20 for 20%, 0.005 for 0.5%, 0.001 for 0.1%
  minReads: number = 3
): { pDetection: number; pLoss: number } {
  if (depth <= 0) return { pDetection: 0, pLoss: 1 };
  if (vaf <= 0) return { pDetection: 0, pLoss: 1 };
  if (vaf >= 1) return { pDetection: 1, pLoss: 0 };

  let pLoss = 0;
  // Calculate P(X < minReads)
  for (let k = 0; k < minReads; k++) {
    let combination = 1;
    for (let i = 0; i < k; i++) {
      combination *= (depth - i) / (i + 1);
    }
    const term = combination * Math.pow(vaf, k) * Math.pow(1 - vaf, depth - k);
    pLoss += term;
  }

  pLoss = Math.max(0, Math.min(1, pLoss));
  const pDetection = Math.max(0, Math.min(1, 1 - pLoss));

  return { pDetection, pLoss };
}

/**
 * Finds the minimum required Depth of Coverage (DoC) to reach a target detection probability
 * (e.g. 0.99 or 99%) at a given VAF and minReads threshold.
 */
export function findRequiredDepthForConfidence(
  vaf: number,
  confidenceTarget: number = 0.99,
  minReads: number = 3
): number {
  if (vaf <= 0) return Infinity;
  let low = 1;
  let high = 50000;
  let ans = high;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { pDetection } = calculateVariantDetectionProb(mid, vaf, minReads);
    if (pDetection >= confidenceTarget) {
      ans = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return ans;
}

/**
 * Generates data points for plotting Binomial Detection Probability vs Depth of Coverage
 * for multiple VAF values (like Figure 1A in Cabello-Aguilar et al. 2025).
 */
export interface BinomialCurvePoint {
  depth: number;
  [vafKey: string]: number; // e.g. "vaf_0.1": 0.45 (for 45% detection)
}

export function generateBinomialCurveData(
  vafs: number[] = [0.001, 0.002, 0.003, 0.005, 0.01, 0.05, 0.20],
  maxDepth: number = 10000,
  step: number = 200,
  minReads: number = 3
): BinomialCurvePoint[] {
  const points: BinomialCurvePoint[] = [];

  for (let d = 0; d <= maxDepth; d += step) {
    const depthVal = d === 0 ? 1 : d;
    const pt: BinomialCurvePoint = { depth: d };

    vafs.forEach((v) => {
      const { pDetection } = calculateVariantDetectionProb(depthVal, v, minReads);
      pt[`vaf_${(v * 100).toFixed(1)}%`] = Math.round(pDetection * 1000) / 10; // percentage
    });

    points.push(pt);
  }

  return points;
}
