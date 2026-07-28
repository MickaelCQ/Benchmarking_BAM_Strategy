import React from "react";
import { RAW_CLUSTER_FILES, ALIGNERS_INFO } from "../data/benchmarkData";
import { FolderCheck, Cpu, BarChart3, Stethoscope, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

interface OverviewSectionProps {
  onNavigateTab: (tab: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-6 md:p-8 shadow-xl text-white">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full">
            <FolderCheck className="h-3.5 w-3.5" />
            <span>Cluster Path: /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            High-Rigor Scientific Strategy for NGS WES Alignment Benchmarking
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Comparative evaluation of <span className="text-sky-400 font-semibold">Illumina DRAGEN v4.0</span> (FPGA hardware hash-table),{" "}
            <span className="text-emerald-400 font-semibold">SoftGenetics NextGENe</span> (Local anchor engine), and{" "}
            <span className="text-amber-400 font-semibold font-mono">BWA-MEM + Picard MarkDup</span> across clinical Whole-Exome Sequencing (WES) samples{" "}
            <span className="font-semibold text-white">MF1284</span>, <span className="font-semibold text-white">MF1358</span>, and{" "}
            <span className="font-semibold text-white">MF746</span>.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab("dashboard")}
              className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-md transition-all"
            >
              <span>Explore Interactive Metrics</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigateTab("latex")}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs px-4 py-2.5 rounded-lg transition-all"
            >
              <span>Preview LaTeX Journal Article</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cluster File Inventory & Pipeline Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.values(ALIGNERS_INFO).map((aligner) => (
          <div
            key={aligner.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-xs"
                style={{ backgroundColor: aligner.color }}
              >
                {aligner.id}
              </span>
              <span className="text-xs text-slate-600 font-mono font-medium">{aligner.vendor}</span>
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">{aligner.name}</h3>
            <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-100 mb-3">
              {aligner.algorithm}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">{aligner.description}</p>
          </div>
        ))}
      </div>

      {/* 4 Pillars of Benchmark Rigor */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-sky-600" />
          <span>Scientific Strategy: 4 Multi-Dimensional Evaluation Axes</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-4 rounded-lg bg-sky-50/60 border border-sky-100 space-y-2">
            <div className="flex items-center space-x-2 text-sky-700 font-bold text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>1. Technical Bioinformatic</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>Mapping & Properly paired rate %</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>PCR Duplicate marking precision</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>Soft-clipping % & MAPQ 60 distribution</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>GC bias & Insert size stability</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
              <Stethoscope className="h-4 w-4" />
              <span>2. Clinical & Diagnostic</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Mean Target Depth & Fold-80 penalty</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>ACMG v3.2 SF genes ≥20x coverage %</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Homopolymer Indel error rate</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>SNV/Indel sensitivity & Ti/Tv ratio</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-purple-50/60 border border-purple-100 space-y-2">
            <div className="flex items-center space-x-2 text-purple-700 font-bold text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>3. Statistical Rigor</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>Bland-Altman VAF agreement & 95% LOA</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>Jaccard Index across callsets</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>Paired Wilcoxon & Friedman ANOVA</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>VAF correlation coefficient (R²)</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-100 space-y-2">
            <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
              <Cpu className="h-4 w-4" />
              <span>4. Technical & Compute</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>Wall-clock time (min / sample)</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>CPU Core-Hours efficiency</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>Peak RAM footprint (GB)</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>BAM file storage size on disk</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verified Cluster Files Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>Cluster BAM Files Table (15 Files Detected)</span>
          <span className="text-xs text-slate-600 font-mono font-normal">
            Path: /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Sample</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Aligner Pipeline</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">BAM File Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Index (.bai) File</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono">
              {RAW_CLUSTER_FILES.map((file, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-800">{file.sample}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-white ${
                        file.aligner === "Dragen"
                          ? "bg-sky-600"
                          : file.aligner === "NextGENe"
                          ? "bg-emerald-600"
                          : "bg-amber-600"
                      }`}
                    >
                      {file.aligner}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{file.bam}</td>
                  <td className="px-4 py-2.5 text-slate-600">{file.bai}</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-sans font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
