import React from "react";
import { Dna, FileText, Download, Code, Sparkles, Terminal, Cpu, FileSpreadsheet, Activity, Calculator } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSample: string;
  setSelectedSample: (sample: string) => void;
  selectedRun: string;
  setSelectedRun: (run: string) => void;
  onExportAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedSample,
  setSelectedSample,
  selectedRun,
  setSelectedRun,
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
                  Stratégie de Design Expérimental Exome
                </h1>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Auteurs : Coquerelle M. & Cabello-Aguilar S.
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
              </p>
            </div>
          </div>

          {/* Run & Sample Switchers */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Run / Condition Selector */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700">
              <span className="text-[11px] font-bold uppercase text-slate-400 px-2">Run:</span>
              <button
                onClick={() => setSelectedRun("ALL")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedRun === "ALL"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Tous Runs
              </button>
              <button
                onClick={() => setSelectedRun("Run1")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedRun === "Run1"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Run1 Brut (~1200x)
              </button>
              <button
                onClick={() => setSelectedRun("Run1_Sub200x")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedRun === "Run1_Sub200x"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Sub 200x
              </button>
              <button
                onClick={() => setSelectedRun("Run1_Sub100x")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedRun === "Run1_Sub100x"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Sub 100x
              </button>
              <button
                onClick={() => setSelectedRun("Run1_Sub40x")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedRun === "Run1_Sub40x"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Sub 40x
              </button>
            </div>

            {/* Sample Selector */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700">
              <span className="text-[11px] font-bold uppercase text-slate-400 px-2">Échantillon:</span>
              <button
                onClick={() => setSelectedSample("ALL")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedSample === "ALL"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                Moyenne Cohorte
              </button>
              {["MF1284", "MF1358", "MF746"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSample(s)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    selectedSample === s
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
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
            { id: "gene-region-coverage", label: "Gene Region Coverage", icon: Dna },
            { id: "variant-loss-prob", label: "Probabilité de Perte de Variant", icon: Activity },
            { id: "cost-simulation", label: "Simulation Coût Mutualisé", icon: Calculator },
            { id: "r-scripts", label: "R Publication Figures", icon: Code },
            { id: "cli", label: "Cluster Bash Pipeline", icon: Terminal },
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
