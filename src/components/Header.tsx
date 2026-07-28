import React from "react";
import { Dna, FileText, Download, Code, Sparkles, Terminal, Cpu, FileSpreadsheet } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSample: string;
  setSelectedSample: (sample: string) => void;
  onExportAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedSample,
  setSelectedSample,
  onExportAll,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Study Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Dna className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg tracking-tight text-slate-100">
                  NGS Alignment Benchmark Suite
                </h1>
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
                  Peer-Review Grade
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
              </p>
            </div>
          </div>

          {/* Sample Switcher */}
          <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <span className="text-xs font-semibold uppercase text-slate-400 px-2">Cohort:</span>
            <button
              onClick={() => setSelectedSample("ALL")}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                selectedSample === "ALL"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Mean Cohort (n=3)
            </button>
            {["MF1284", "MF1358", "MF746"].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSample(s)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  selectedSample === s
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onExportAll}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-all border border-sky-400/20"
            >
              <Download className="h-4 w-4" />
              <span>Export LaTeX & R Package</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 pt-1 no-scrollbar border-t border-slate-800/60">
          {[
            { id: "overview", label: "Study Overview", icon: Dna },
            { id: "dashboard", label: "Multi-Dimensional Metrics", icon: Cpu },
            { id: "gene-coverage", label: "Gene / BED Region Coverage", icon: FileSpreadsheet },
            { id: "r-scripts", label: "R Publication Figures", icon: Code },
            { id: "latex", label: "LaTeX Journal Paper", icon: FileText },
            { id: "cli", label: "Cluster Bash Pipeline", icon: Terminal },
            { id: "ai-advisor", label: "AI Scientific Reviewer", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-slate-800 text-sky-400 border border-slate-700 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
