import React, { useState } from "react";
import { LaTeXConfig } from "../types";
import { generateLaTeXManuscript } from "../data/latexTemplates";
import { FileText, Copy, Check, Download, Sliders, Layers } from "lucide-react";

export const LaTeXReportGenerator: React.FC = () => {
  const [config, setConfig] = useState<LaTeXConfig>({
    title: "Benchmarking Next-Generation Whole-Exome Sequencing Alignments: DRAGEN v4.0 vs NextGENe vs BWA-MEM + Picard",
    authors: "Maxime Coquerelle, S. Cabello-Aguilar, et al.",
    affiliation: "Bioinformatics Core, Cluster Share Unit (/NFS/cluster-share/home/mcoquerelle)",
    journal: "Oxford Bioinformatics",
    includeRawTables: true,
    includeRCodeAppendix: true,
    includeCliCommands: true,
  });

  const [copied, setCopied] = useState(false);

  const latexCode = generateLaTeXManuscript(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([latexCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alignment_benchmark_paper.tex";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Options Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              LaTeX Journal Article Generator Configuration
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied LaTeX Code!" : "Copy LaTeX Source"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .tex File</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Paper Title</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Lead Author & Co-Authors</label>
            <input
              type="text"
              value={config.authors}
              onChange={(e) => setConfig({ ...config, authors: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Journal</label>
            <select
              value={config.journal}
              onChange={(e) => setConfig({ ...config, journal: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            >
              <option value="Oxford Bioinformatics">Oxford Bioinformatics</option>
              <option value="Nature Methods">Nature Methods</option>
              <option value="Genome Biology">Genome Biology</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 md:col-span-2 pt-2">
            <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeRawTables}
                onChange={(e) => setConfig({ ...config, includeRawTables: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Full Results Table (\begin{'{table*}'})</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeCliCommands}
                onChange={(e) => setConfig({ ...config, includeCliCommands: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Bash Pipeline Appendix (\begin{'{lstlisting}'})</span>
            </label>
          </div>
        </div>
      </div>

      {/* Code Editor Preview Window */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-rose-500"></div>
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-mono text-slate-400 ml-2">alignment_benchmark_paper.tex</span>
          </div>
          <span className="text-[11px] font-mono text-indigo-400">PDFLaTeX / XeLaTeX Ready</span>
        </div>

        <pre className="p-4 text-slate-200 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed select-all">
          <code>{latexCode}</code>
        </pre>
      </div>
    </div>
  );
};
