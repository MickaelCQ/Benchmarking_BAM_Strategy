export type AlignerId = "Dragen" | "NextGENe" | "BWA_Markdup";

export type SampleId = "MF1284" | "MF1358" | "MF746";

export type RunId = "Run1" | "Run2" | "Run1_Sub200x" | "Run1_Sub100x" | "Run1_Sub40x" | string;

export interface AlignerInfo {
  id: AlignerId;
  name: string;
  vendor: string;
  version: string;
  algorithm: string;
  color: string;
  description: string;
}

export interface TechnicalMetrics {
  totalReads: number; // e.g., 85,000,000
  mappedReadsPct: number; // e.g., 99.85 %
  properlyPairedPct: number; // e.g., 98.92 %
  duplicateRatePct: number; // e.g., 8.45 %
  softClippedReadsPct: number; // e.g., 2.15 %
  meanInsertSize: number; // e.g., 210 bp
  stdDevInsertSize: number; // e.g., 42 bp
  offTargetPct: number; // e.g., 11.2 %
  mapq0Pct: number; // e.g., 0.85 %
  mapq30PlusPct: number; // e.g., 96.40 %
  mapq60Pct: number; // e.g., 92.10 %
  gcBiasSlope: number; // Normalized slope across 20-80% GC
  mismatchRatePct: number; // e.g., 0.42 %
}

export interface ClinicalMetrics {
  meanTargetDepth: number; // e.g., 124.5 x
  target10xPct: number; // e.g., 99.4 %
  target20xPct: number; // e.g., 98.6 %
  target50xPct: number; // e.g., 94.2 %
  target100xPct: number; // e.g., 78.5 %
  fold80Penalty: number; // Fold 80 base penalty uniformity (closer to 1.0 is ideal)
  snvSensitivityPct: number; // e.g., 99.45 % vs GiaB / Consensus
  snvPrecisionPct: number; // e.g., 99.62 %
  indelSensitivityPct: number; // e.g., 96.20 %
  indelPrecisionPct: number; // e.g., 95.80 %
  tiTvRatio: number; // e.g., 2.62 for WES
  acmgGeneCoverage20x: number; // % of ACMG SF v3.2 81 genes >= 20x
  homopolymerIndelErrorRate: number; // Indel error rate in >6bp homopolymers
}

export interface StatisticalMetrics {
  vafCorrelationWithConsensus: number; // R^2 coefficient
  blandAltmanMeanBias: number; // Mean difference in VAF (%)
  blandAltmanLimitsOfAgreementUpper: number; // Upper LOA (+1.96 SD)
  blandAltmanLimitsOfAgreementLower: number; // Lower LOA (-1.96 SD)
  jaccardSimilarityIndex: number; // Jaccard index for variant set comparison
  mcnemarPValueVsBWA: number; // p-value of discordance test vs BWA-Markdup baseline
}

export interface ComputationalMetrics {
  wallClockTimeMinutes: number; // Minutes per sample WES
  cpuHours: number; // CPU core-hours
  peakRamGB: number; // Peak memory (GB)
  bamFileSizeBytesGB: number; // Disk size of BAM (GB)
  readWriteIops: number; // Peak IOPS
}

export interface SampleBenchmarkData {
  sampleId: SampleId;
  runId: RunId;
  aligner: AlignerId;
  bamFilename: string;
  technical: TechnicalMetrics;
  clinical: ClinicalMetrics;
  statistical: StatisticalMetrics;
  computational: ComputationalMetrics;
}

export interface CustomMetricEntry {
  sampleId: SampleId;
  aligner: AlignerId;
  metricCategory: "technical" | "clinical" | "computational";
  metricName: string;
  value: number;
  unit: string;
}

export interface RPlotConfig {
  journalStyle: "Nature" | "Bioinformatics" | "Cell" | "NAR";
  colorPalette: "Okabe-Ito" | "Viridis" | "Classic" | "HighContrast";
  dpi: number;
  figureWidth: number; // in inches
  figureHeight: number; // in inches
  fontSize: number; // in pt
}

export interface LaTeXConfig {
  title: string;
  authors: string;
  affiliation: string;
  journal: string;
  includeRawTables: boolean;
  includeRCodeAppendix: boolean;
  includeCliCommands: boolean;
}
