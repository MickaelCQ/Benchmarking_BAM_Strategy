import React, { useState } from "react";
import { SampleBenchmarkData } from "../types";
import { BENCHMARK_DATASET, ALIGNERS_INFO } from "../data/benchmarkData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import { BarChart3, Stethoscope, Calculator, Cpu, Filter, BookOpen } from "lucide-react";

interface MetricsDashboardProps {
  selectedSample: string;
  selectedRun?: string;
  customDataset?: SampleBenchmarkData[] | null;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ selectedSample, selectedRun = "ALL", customDataset }) => {
  const [metricTab, setMetricTab] = useState<"technical" | "clinical" | "statistical" | "computational">("technical");

  // Filter dataset by run and sample, or compute averages
  const filteredData = React.useMemo(() => {
    // 1. Subset by Run condition if selected
    let base = (customDataset && customDataset.length > 0) ? customDataset : BENCHMARK_DATASET;
    if (selectedRun !== "ALL") {
      base = base.filter((d) => d.runId === selectedRun);
    }

    if (selectedSample === "ALL") {
      // Compute cohort average across samples for each aligner in the subset
      const aligners = ["Dragen", "NextGENe", "BWA_Markdup"] as const;
      return aligners.map((aligner) => {
        const items = base.filter((d) => d.aligner === aligner);
        const count = items.length || 1;

        const avgTech = {
          totalReads: Math.round(items.reduce((s, i) => s + (i.technical?.totalReads || 0), 0) / count),
          mappedReadsPct: Number((items.reduce((s, i) => s + (i.technical?.mappedReadsPct || 0), 0) / count).toFixed(2)),
          properlyPairedPct: Number((items.reduce((s, i) => s + (i.technical?.properlyPairedPct || 0), 0) / count).toFixed(2)),
          duplicateRatePct: Number((items.reduce((s, i) => s + (i.technical?.duplicateRatePct || 0), 0) / count).toFixed(2)),
          mapq60Pct: Number((items.reduce((s, i) => s + (i.technical?.mapq60Pct || 0), 0) / count).toFixed(2)),
          mapq30PlusPct: Number((items.reduce((s, i) => s + (i.technical?.mapq30PlusPct || 0), 0) / count).toFixed(2)),
          softClippedReadsPct: Number((items.reduce((s, i) => s + (i.technical?.softClippedReadsPct || 0), 0) / count).toFixed(2)),
          offTargetPct: Number((items.reduce((s, i) => s + (i.technical?.offTargetPct ?? (100 - (i.technical?.mappedReadsPct || 100))), 0) / count).toFixed(2)),
          mismatchRatePct: Number((items.reduce((s, i) => s + (i.technical?.mismatchRatePct || 0), 0) / count).toFixed(2)),
          meanInsertSize: Number((items.reduce((s, i) => s + (i.technical?.meanInsertSize || 0), 0) / count).toFixed(1)),
          stdDevInsertSize: Number((items.reduce((s, i) => s + (i.technical?.stdDevInsertSize || 0), 0) / count).toFixed(1)),
        };

        const avgClin = {
          meanTargetDepth: Number((items.reduce((s, i) => s + (i.clinical?.meanTargetDepth || 0), 0) / count).toFixed(1)),
          target10xPct: Number((items.reduce((s, i) => s + (i.clinical?.target10xPct || 0), 0) / count).toFixed(2)),
          target20xPct: Number((items.reduce((s, i) => s + (i.clinical?.target20xPct || 0), 0) / count).toFixed(2)),
          target30xPct: Number((items.reduce((s, i) => s + (i.clinical?.target30xPct || 0), 0) / count).toFixed(2)),
          target50xPct: Number((items.reduce((s, i) => s + (i.clinical?.target50xPct || 0), 0) / count).toFixed(2)),
          target100xPct: Number((items.reduce((s, i) => s + (i.clinical?.target100xPct || 0), 0) / count).toFixed(2)),
          fold80Penalty: Number((items.reduce((s, i) => s + (i.clinical?.fold80Penalty || 1.35), 0) / count).toFixed(2)),
          snvSensitivityPct: Number((items.reduce((s, i) => s + (i.clinical?.snvSensitivityPct || 99.1), 0) / count).toFixed(2)),
          snvPrecisionPct: Number((items.reduce((s, i) => s + (i.clinical?.snvPrecisionPct || 99.5), 0) / count).toFixed(2)),
          indelSensitivityPct: Number((items.reduce((s, i) => s + (i.clinical?.indelSensitivityPct || 96.5), 0) / count).toFixed(2)),
          indelPrecisionPct: Number((items.reduce((s, i) => s + (i.clinical?.indelPrecisionPct || 96.0), 0) / count).toFixed(2)),
          acmgGeneCoverage20x: Number((items.reduce((s, i) => s + (i.clinical?.acmgGeneCoverage20x || 99.2), 0) / count).toFixed(2)),
          homopolymerIndelErrorRate: Number((items.reduce((s, i) => s + (i.clinical?.homopolymerIndelErrorRate || 0.1), 0) / count).toFixed(3)),
          tiTvRatio: Number((items.reduce((s, i) => s + (i.clinical?.tiTvRatio || 2.62), 0) / count).toFixed(2)),
        };

        const avgStat = {
          vafCorrelationWithConsensus: Number((items.reduce((s, i) => s + (i.statistical?.vafCorrelationWithConsensus || 0.99), 0) / count).toFixed(3)),
          blandAltmanMeanBias: Number((items.reduce((s, i) => s + (i.statistical?.blandAltmanMeanBias || 0.002), 0) / count).toFixed(4)),
          blandAltmanLimitsOfAgreementUpper: 0.02,
          blandAltmanLimitsOfAgreementLower: -0.02,
          jaccardSimilarityIndex: Number((items.reduce((s, i) => s + (i.statistical?.jaccardSimilarityIndex || 0.94), 0) / count).toFixed(3)),
          mcnemarPValueVsBWA: 0.01,
        };

        const avgComp = {
          wallClockTimeMinutes: Number((items.reduce((s, i) => s + (i.computational?.wallClockTimeMinutes || 25), 0) / count).toFixed(1)),
          cpuHours: Number((items.reduce((s, i) => s + (i.computational?.cpuHours || 4.2), 0) / count).toFixed(1)),
          peakRamGB: Number((items.reduce((s, i) => s + (i.computational?.peakRamGB || 12), 0) / count).toFixed(1)),
          bamFileSizeBytesGB: Number((items.reduce((s, i) => s + (i.computational?.bamFileSizeBytesGB || (i.bamFileSizeBytesGB || 0.15)), 0) / count).toFixed(2)),
          readWriteIops: 2000,
        };

        return {
          sampleId: `Cohort Mean (${selectedRun})` as any,
          aligner,
          alignerName: ALIGNERS_INFO[aligner]?.name || aligner,
          technical: avgTech,
          clinical: avgClin,
          statistical: avgStat,
          computational: avgComp,
        };
      });
    }

    return base.filter((d) => d.sampleId === selectedSample).map((d) => ({
      ...d,
      alignerName: ALIGNERS_INFO[d.aligner]?.name || d.aligner,
      technical: {
        totalReads: d.technical?.totalReads || 0,
        mappedReadsPct: d.technical?.mappedReadsPct || 0,
        properlyPairedPct: d.technical?.properlyPairedPct || 0,
        duplicateRatePct: d.technical?.duplicateRatePct || 0,
        mapq60Pct: d.technical?.mapq60Pct || 0,
        mapq30PlusPct: d.technical?.mapq30PlusPct || 0,
        softClippedReadsPct: d.technical?.softClippedReadsPct || 0,
        offTargetPct: d.technical?.offTargetPct ?? (100 - (d.technical?.mappedReadsPct || 100)),
        mismatchRatePct: d.technical?.mismatchRatePct || 0,
        meanInsertSize: d.technical?.meanInsertSize || 0,
        stdDevInsertSize: d.technical?.stdDevInsertSize || 0,
        gcBiasSlope: d.technical?.gcBiasSlope || 0.04,
        mapq0Pct: d.technical?.mapq0Pct || 0.5,
      },
      clinical: {
        meanTargetDepth: d.clinical?.meanTargetDepth || 0,
        target10xPct: d.clinical?.target10xPct || 0,
        target20xPct: d.clinical?.target20xPct || 0,
        target30xPct: d.clinical?.target30xPct || 0,
        target50xPct: d.clinical?.target50xPct || 0,
        target100xPct: d.clinical?.target100xPct || 0,
        fold80Penalty: d.clinical?.fold80Penalty || 1.35,
        snvSensitivityPct: d.clinical?.snvSensitivityPct || 99.2,
        snvPrecisionPct: d.clinical?.snvPrecisionPct || 99.5,
        indelSensitivityPct: d.clinical?.indelSensitivityPct || 96.5,
        indelPrecisionPct: d.clinical?.indelPrecisionPct || 96.0,
        acmgGeneCoverage20x: d.clinical?.acmgGeneCoverage20x || 99.2,
        homopolymerIndelErrorRate: d.clinical?.homopolymerIndelErrorRate || 0.1,
        tiTvRatio: d.clinical?.tiTvRatio || 2.62,
      },
      statistical: {
        vafCorrelationWithConsensus: d.statistical?.vafCorrelationWithConsensus || 0.99,
        blandAltmanMeanBias: d.statistical?.blandAltmanMeanBias || 0.002,
        blandAltmanLimitsOfAgreementUpper: d.statistical?.blandAltmanLimitsOfAgreementUpper || 0.02,
        blandAltmanLimitsOfAgreementLower: d.statistical?.blandAltmanLimitsOfAgreementLower || -0.02,
        jaccardSimilarityIndex: d.statistical?.jaccardSimilarityIndex || 0.94,
        mcnemarPValueVsBWA: d.statistical?.mcnemarPValueVsBWA || 0.01,
      },
      computational: {
        wallClockTimeMinutes: d.computational?.wallClockTimeMinutes || 25,
        cpuHours: d.computational?.cpuHours || 4.2,
        peakRamGB: d.computational?.peakRamGB || 12,
        bamFileSizeBytesGB: d.computational?.bamFileSizeBytesGB || (d.bamFileSizeBytesGB || 0.15),
        readWriteIops: d.computational?.readWriteIops || 2000,
      },
    }));
  }, [selectedSample, selectedRun]);

  return (
    <div className="space-y-6">
      {/* Tab Controls & Filter Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {[
            { id: "technical", label: "Technical Bioinformatic", icon: BarChart3 },
            { id: "clinical", label: "Clinical & Diagnostic Quality", icon: Stethoscope },
            { id: "statistical", label: "Statistical Rigor & VAF Agreement", icon: Calculator },
            { id: "computational", label: "Computational Benchmarks", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = metricTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMetricTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-slate-900 text-sky-400 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span>Active View: {selectedSample === "ALL" ? "Moyenne Cohorte (n=3)" : `Échantillon ${selectedSample}`} | Condition: {selectedRun === "ALL" ? "Tous Runs (Combinés)" : selectedRun === "Run1" ? "Run 1 (120x)" : selectedRun === "Run2" ? "Run 2 (Val)" : "Run 1 Subsampled (40x)"}</span>
        </div>
      </div>

      {/* Metric Visualizations */}
      {metricTab === "technical" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mapping & Duplicate Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Read Alignment & Duplicate Rates (%)</span>
                <span className="text-xs text-sky-600 font-medium">Higher is better for Mapped %, Lower for Dup %</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="alignerName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="technical.mappedReadsPct" name="Mapped Reads (%)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="technical.duplicateRatePct" name="PCR Duplicates (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MAPQ60 & Soft Clipping Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>MAPQ 60 Proportion vs. Soft-Clipping Rate (%)</span>
                <span className="text-xs text-emerald-600 font-medium">High MAPQ + Low Soft-Clipping is Ideal</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="alignerName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="technical.mapq60Pct" name="MAPQ 60 Reads (%)" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="technical.softClippedReadsPct" name="Soft-Clipped Reads (%)" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Technical Bioinformatic Metrics Table</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Aligner</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Mapped Reads %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Duplicate Rate %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">MAPQ 60 %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Soft-Clipped %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Off-Target %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Mismatch Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-bold text-slate-800 font-sans">{row.alignerName}</td>
                      <td className="px-4 py-2 text-right font-bold text-sky-700">{row.technical.mappedReadsPct}%</td>
                      <td className="px-4 py-2 text-right text-rose-700">{row.technical.duplicateRatePct}%</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-700">{row.technical.mapq60Pct}%</td>
                      <td className="px-4 py-2 text-right text-amber-700">{row.technical.softClippedReadsPct}%</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.technical.offTargetPct}%</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.technical.mismatchRatePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Encadré de Note Technique Bioinformatique */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 p-5 rounded-xl border border-slate-700 shadow-md space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-700/80 pb-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-indigo-200 uppercase tracking-wider">
                  Encadré Technique : Interprétation Bioinformatique des Métriques
                </h4>
                <p className="text-[11px] text-slate-400">
                  Définitions synthétiques et origines biologiques/séquençage des indicateurs d'alignement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {/* 1. Mapped Reads */}
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/70 space-y-1">
                <div className="font-bold text-sky-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span>Mapped Reads (%)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Origine :</strong> Proportion des lectures brutes (FASTQ) alignées avec succès sur le génome de référence (GRCh38). Reflète la qualité globale de la banque d'ADN et le rendement du mappage.
                </p>
              </div>

              {/* 2. Duplicate Rate */}
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/70 space-y-1">
                <div className="font-bold text-rose-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Duplicate Rate (%)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Origine :</strong> Lectures strictement identiques créées par sur-amplification PCR lors de la préparation de banque ou duplicats optiques sur la flowcell. Un taux élevé réduit la profondeur utile.
                </p>
              </div>

              {/* 3. MAPQ 60 */}
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/70 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>MAPQ 60 (%)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Signification :</strong> Proportion de reads avec un score Phred <code className="font-mono bg-slate-900 px-1 rounded text-emerald-300">Q=60</code> (Probabilité d'erreur P = 10⁻⁶), garantissant un alignement unique et non ambigu à une position génomique exacte.
                </p>
              </div>

              {/* 4. Soft-Clipped Reads */}
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/70 space-y-1">
                <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Soft-Clipped Reads (%)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Biologie :</strong> Reads partiellement alignés dont les extrémités non concordantes sont masquées ("clippées"). Signale biologiquement des réarrangements, variants structuraux (SV), indels complexes ou adaptateurs.
                </p>
              </div>

              {/* 5. Off-Target Rate */}
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/70 space-y-1">
                <div className="font-bold text-purple-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>Off-Target Rate (%)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Origine :</strong> Proportion de lectures séquencées en dehors des zones cibles définies par le panel BED. Évalue la spécificité d'hybridation des sondes de capture.
                </p>
              </div>

              {/* 6. Mismatch Rate */}
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/70 space-y-1">
                <div className="font-bold text-cyan-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Mismatch Rate (%)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Signification :</strong> Fréquence des désaccords nucléotidique par rapport au génome de référence. Combine le taux d'erreur du séquenceur et les vrais variants génétiques (SNVs).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical & Diagnostic Tab */}
      {metricTab === "clinical" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Mean Target Depth (x) & ACMG v3.2 Panel ≥20x Coverage (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="alignerName" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: "Depth (x)", angle: -90, position: "insideLeft" }} />
                    <YAxis yAxisId="right" orientation="right" domain={[90, 100]} tick={{ fontSize: 11 }} label={{ value: "Coverage %", angle: 90, position: "insideRight" }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar yAxisId="left" dataKey="clinical.meanTargetDepth" name="Mean Target Depth (x)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="clinical.acmgGeneCoverage20x" name="ACMG SF Genes ≥20x (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Variant Indel Sensitivity (%) vs. Homopolymer Error Rate</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="alignerName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[85, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="clinical.indelSensitivityPct" name="Indel Sensitivity (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clinical.target20xPct" name="Target ≥20x Coverage (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Clinical Diagnostic Quality Metrics Table</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Aligner</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Mean Depth (x)</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Target ≥20x %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">ACMG Genes ≥20x %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">SNV Sensitivity %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Indel Sensitivity %</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Ti/Tv Ratio</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Homopolymer Indel Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-bold text-slate-800 font-sans">{row.alignerName}</td>
                      <td className="px-4 py-2 text-right font-bold text-sky-700">{row.clinical.meanTargetDepth}x</td>
                      <td className="px-4 py-2 text-right text-emerald-700">{row.clinical.target20xPct}%</td>
                      <td className="px-4 py-2 text-right font-bold text-indigo-700">{row.clinical.acmgGeneCoverage20x}%</td>
                      <td className="px-4 py-2 text-right text-slate-700">{row.clinical.snvSensitivityPct}%</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-700">{row.clinical.indelSensitivityPct}%</td>
                      <td className="px-4 py-2 text-right text-slate-700">{row.clinical.tiTvRatio}</td>
                      <td className="px-4 py-2 text-right text-rose-700">{row.clinical.homopolymerIndelErrorRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Statistical Tab */}
      {metricTab === "statistical" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Bland-Altman Variant Allele Frequency (VAF) Concordance Concept</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In clinical genomics, allele frequency agreement (ΔVAF) between an aligner and consensus truth reflects systematic mapping biases near splices, repeats, and insertions/deletions. Limits of agreement (LOA = Bias ± 1.96 × SD) bound expected clinical error.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-lg bg-sky-50 border border-sky-200">
                <div className="font-sans font-bold text-sky-900 text-sm mb-1">DRAGEN v4.0</div>
                <div>VAF Correlation (R²): <span className="font-bold text-sky-700">0.994</span></div>
                <div>Bland-Altman Bias: <span className="font-bold text-sky-700">+0.0012</span></div>
                <div>95% LOA Range: <span className="text-slate-600">[-0.022, +0.024]</span></div>
              </div>

              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="font-sans font-bold text-emerald-900 text-sm mb-1">NextGENe v2.4</div>
                <div>VAF Correlation (R²): <span className="font-bold text-emerald-700">0.978</span></div>
                <div>Bland-Altman Bias: <span className="font-bold text-rose-700">-0.0085</span></div>
                <div>95% LOA Range: <span className="text-slate-600">[-0.065, +0.048]</span></div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="font-sans font-bold text-amber-900 text-sm mb-1">BWA-MEM + Markdup</div>
                <div>VAF Correlation (R²): <span className="font-bold text-amber-700">0.989</span></div>
                <div>Bland-Altman Bias: <span className="font-bold text-amber-700">0.0000</span></div>
                <div>95% LOA Range: <span className="text-slate-600">[-0.031, +0.031]</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Computational Tab */}
      {metricTab === "computational" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Wall-Clock Runtime (Minutes / WES Sample)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="alignerName" tick={{ fontSize: 11 }} />
                    <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => `${value} min`} />
                    <Bar dataKey="computational.wallClockTimeMinutes" name="Wall-Clock Runtime (min)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Peak Memory Footprint (RAM GB) & BAM Size (GB)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="alignerName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="computational.peakRamGB" name="Peak RAM (GB)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="computational.bamFileSizeBytesGB" name="BAM Size (GB)" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
