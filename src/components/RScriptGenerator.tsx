import React, { useState } from "react";
import { RPlotConfig } from "../types";
import { generateRPublicationScript } from "../data/rScriptTemplates";
import { Code, Copy, Check, Download, Settings, Sliders } from "lucide-react";

export const RScriptGenerator: React.FC = () => {
  const [config, setConfig] = useState<RPlotConfig>({
    journalStyle: "Nature",
    colorPalette: "Okabe-Ito",
    dpi: 300,
    figureWidth: 8.5,
    figureHeight: 6.5,
    fontSize: 10,
  });

  const [copied, setCopied] = useState(false);

  const rScriptCode = generateRPublicationScript(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(rScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([rScriptCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "generate_publication_figures.R";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Controls Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-sky-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              Publication R / ggplot2 Figure Generator Options
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied R Script!" : "Copy R Code"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .R File</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Journal Style</label>
            <select
              value={config.journalStyle}
              onChange={(e) => setConfig({ ...config, journalStyle: e.target.value as any })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            >
              <option value="Nature">Nature Biotechnology</option>
              <option value="Bioinformatics">Oxford Bioinformatics</option>
              <option value="Cell">Cell Press</option>
              <option value="NAR">Nucleic Acids Research</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Color Palette</label>
            <select
              value={config.colorPalette}
              onChange={(e) => setConfig({ ...config, colorPalette: e.target.value as any })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            >
              <option value="Okabe-Ito">Okabe-Ito (Colorblind Safe)</option>
              <option value="Viridis">Viridis Perceptual</option>
              <option value="Classic">Classic Journal Palette</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Resolution (DPI)</label>
            <select
              value={config.dpi}
              onChange={(e) => setConfig({ ...config, dpi: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            >
              <option value={300}>300 DPI (Standard Journal)</option>
              <option value={600}>600 DPI (High Resolution Vector)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Width (Inches)</label>
            <input
              type="number"
              step="0.5"
              value={config.figureWidth}
              onChange={(e) => setConfig({ ...config, figureWidth: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Height (Inches)</label>
            <input
              type="number"
              step="0.5"
              value={config.figureHeight}
              onChange={(e) => setConfig({ ...config, figureHeight: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Code Editor Window */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-rose-500"></div>
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-mono text-slate-400 ml-2">generate_publication_figures.R</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">R 4.3.1 + ggplot2 + cowplot + patchwork</span>
        </div>

        <pre className="p-4 text-slate-200 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed select-all">
          <code>{rScriptCode}</code>
        </pre>
      </div>
    </div>
  );
};
