import React, { useState } from "react";
import { generateClusterBenchmarkBashScript } from "../data/cliScripts";
import { Terminal, Copy, Check, Download, Play } from "lucide-react";

export const CliPipelineGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const bashScript = generateClusterBenchmarkBashScript();

  const handleCopy = () => {
    navigator.clipboard.writeText(bashScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([bashScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "run_alignment_benchmark.sh";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-slate-800" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Linux Cluster Executable Benchmark Pipeline (.sh)
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Target Folder: /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied Script!" : "Copy Bash Script"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download run_benchmark.sh</span>
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2">
          <Play className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">How to execute directly on your Linux cluster terminal:</span>
            <pre className="mt-1 font-mono text-[11px] bg-amber-100/60 p-2 rounded text-amber-950 font-bold select-all">
              cd /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
              <br />
              chmod +x run_alignment_benchmark.sh
              <br />
              ./run_alignment_benchmark.sh
            </pre>
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
            <span className="text-xs font-mono text-slate-400 ml-2">run_alignment_benchmark.sh</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">Bash 5.0+ / Samtools / Mosdepth</span>
        </div>

        <pre className="p-4 text-emerald-300 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed select-all bg-slate-950">
          <code>{bashScript}</code>
        </pre>
      </div>
    </div>
  );
};
