import React, { useState } from "react";
import { Header } from "./components/Header";
import { OverviewSection } from "./components/OverviewSection";
import { MetricsDashboard } from "./components/MetricsDashboard";
import { GeneCoverageAnalyzer } from "./components/GeneCoverageAnalyzer";
import { CtDnaLodCalculator } from "./components/CtDnaLodCalculator";
import { RScriptGenerator } from "./components/RScriptGenerator";
import { LaTeXReportGenerator } from "./components/LaTeXReportGenerator";
import { CliPipelineGuide } from "./components/CliPipelineGuide";
import { AiAdvisor } from "./components/AiAdvisor";
import { generateRPublicationScript } from "./data/rScriptTemplates";
import { generateLaTeXManuscript } from "./data/latexTemplates";
import { generateClusterBenchmarkBashScript } from "./data/cliScripts";
import { Download, CheckCircle2, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedSample, setSelectedSample] = useState<string>("ALL");
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportAll = () => {
    setShowExportModal(true);
  };

  const handleDownloadLaTeX = () => {
    const code = generateLaTeXManuscript({
      title: "Benchmarking Next-Generation Whole-Exome Sequencing Alignments: DRAGEN v4.0 vs NextGENe vs BWA-MEM + Picard",
      authors: "Maxime Coquerelle, et al.",
      affiliation: "Bioinformatics Core, Cluster Share Unit (/NFS/cluster-share/home/mcoquerelle)",
      journal: "Oxford Bioinformatics",
      includeRawTables: true,
      includeRCodeAppendix: true,
      includeCliCommands: true,
    });
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alignment_benchmark_paper.tex";
    link.click();
    URL.revokeObjectURL(url);
    triggerNotice("Downloaded alignment_benchmark_paper.tex");
  };

  const handleDownloadRScript = () => {
    const code = generateRPublicationScript({
      journalStyle: "Nature",
      colorPalette: "Okabe-Ito",
      dpi: 300,
      figureWidth: 8.5,
      figureHeight: 6.5,
      fontSize: 10,
    });
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "generate_publication_figures.R";
    link.click();
    URL.revokeObjectURL(url);
    triggerNotice("Downloaded generate_publication_figures.R");
  };

  const handleDownloadBashScript = () => {
    const code = generateClusterBenchmarkBashScript();
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "run_alignment_benchmark.sh";
    link.click();
    URL.revokeObjectURL(url);
    triggerNotice("Downloaded run_alignment_benchmark.sh");
  };

  const triggerNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedSample={selectedSample}
        setSelectedSample={setSelectedSample}
        onExportAll={handleExportAll}
      />

      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{exportNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && <OverviewSection onNavigateTab={setActiveTab} />}
        {activeTab === "dashboard" && <MetricsDashboard selectedSample={selectedSample} />}
        {activeTab === "gene-coverage" && <GeneCoverageAnalyzer initialMode="exon" />}
        {activeTab === "gene-region-coverage" && <GeneCoverageAnalyzer initialMode="gene" />}
        {(activeTab === "variant-loss-prob" || activeTab === "ctdna-lod") && <CtDnaLodCalculator />}
        {activeTab === "r-scripts" && <RScriptGenerator />}
        {activeTab === "latex" && <LaTeXReportGenerator />}
        {activeTab === "cli" && <CliPipelineGuide />}
        {activeTab === "ai-advisor" && <AiAdvisor />}
      </main>

      {/* Export All Package Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Download className="h-5 w-5 text-sky-600" />
                <span>Export Publication Benchmark Package</span>
              </h3>
              <p className="text-xs text-slate-500">
                Download ready-to-run files for your Linux cluster and LaTeX journal submission.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleDownloadLaTeX}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-indigo-950">LaTeX Journal Manuscript (.tex)</div>
                  <div className="text-[11px] text-slate-500">Nature / Oxford Bioinformatics publication template</div>
                </div>
                <Download className="h-4 w-4 text-indigo-600" />
              </button>

              <button
                onClick={handleDownloadRScript}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/50 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-sky-950">Publication R Graphics Script (.R)</div>
                  <div className="text-[11px] text-slate-500">ggplot2 + cowplot vector plot generator</div>
                </div>
                <Download className="h-4 w-4 text-sky-600" />
              </button>

              <button
                onClick={handleDownloadBashScript}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/50 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-emerald-950">Cluster Executable Script (.sh)</div>
                  <div className="text-[11px] text-slate-500">Automates samtools and mosdepth on /NFS/cluster-share</div>
                </div>
                <Download className="h-4 w-4 text-emerald-600" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowExportModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 font-mono">
          NGS WES Alignment Benchmark Suite • Cluster: /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
        </div>
      </footer>
    </div>
  );
}
