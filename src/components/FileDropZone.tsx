import React, { useState, useRef } from "react";
import { Upload, FileCode, FileJson, CheckCircle2, RefreshCw, Layers, AlertCircle, Info, Sparkles } from "lucide-react";
import { ParsedBedResult, parseBedFileText } from "../utils/bedParser";
import { DynamicAlignerMeta, detectAlignersFromData } from "../utils/dynamicAligners";

interface FileDropZoneProps {
  onBedParsed: (bedResult: ParsedBedResult | null, fileName: string | null) => void;
  onJsonParsed: (jsonData: any[] | null, aligners: DynamicAlignerMeta[], fileName: string | null) => void;
  activeBedFileName: string | null;
  activeJsonFileName: string | null;
  parsedBedStats: ParsedBedResult | null;
  detectedAligners: DynamicAlignerMeta[];
  onResetToDefaults: () => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onBedParsed,
  onJsonParsed,
  activeBedFileName,
  activeJsonFileName,
  parsedBedStats,
  detectedAligners,
  onResetToDefaults,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bedInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      if (lowerName.endsWith(".bed")) {
        try {
          const bedResult = parseBedFileText(text);
          if (bedResult.totalRegions === 0) {
            setErrorMsg(`Le fichier BED '${fileName}' ne contient aucune région valide.`);
          } else {
            setErrorMsg(null);
            onBedParsed(bedResult, fileName);
          }
        } catch (err) {
          setErrorMsg(`Erreur lors du parsing du fichier BED '${fileName}'.`);
        }
      } else if (lowerName.endsWith(".json")) {
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            const aligners = detectAlignersFromData(json);
            setErrorMsg(null);
            onJsonParsed(json, aligners, fileName);
          } else {
            setErrorMsg(`Le fichier JSON '${fileName}' doit contenir un tableau d'objets.`);
          }
        } catch (err) {
          setErrorMsg(`Format JSON invalide dans '${fileName}'.`);
        }
      } else {
        setErrorMsg(`Format de fichier non pris en charge ('${fileName}'). Utilisez .bed ou .json.`);
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        processFile(files[i]);
      }
    }
  };

  const handleBedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadConsolidatedDefault = () => {
    fetch("/benchmark_consolidated_data.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const aligners = detectAlignersFromData(data);
          setErrorMsg(null);
          onJsonParsed(data, aligners, "benchmark_consolidated_data.json");
        } else {
          setErrorMsg("Impossible de charger benchmark_consolidated_data.json.");
        }
      })
      .catch(() => {
        setErrorMsg("Erreur de chargement de benchmark_consolidated_data.json.");
      });
  };

  const isCustomLoaded = !!activeBedFileName || !!activeJsonFileName;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <span>Dynamic Data Import & Drag-and-Drop Zone</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                .BED & .JSON
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Glissez-déposez vos fichiers de capture (<code>.bed</code>) et sorties <code>mosdepth</code> (<code>.json</code>) pour actualiser dynamiquement l'application.
            </p>
          </div>
        </div>

        {isCustomLoaded && (
          <button
            onClick={onResetToDefaults}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Réinitialiser aux Données Démo</span>
          </button>
        )}
      </div>

      {/* Main Drag-and-Drop Canvas */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/70 scale-[1.01]"
            : isCustomLoaded
            ? "border-emerald-300 bg-emerald-50/20"
            : "border-slate-300 bg-slate-50/60 hover:bg-slate-100/50 hover:border-indigo-400"
        }`}
      >
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex justify-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shadow-sm">
              <FileCode className="h-6 w-6" />
            </div>
            <div className="h-11 w-11 rounded-2xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700 shadow-sm">
              <FileJson className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-800">
              Glissez vos fichiers <strong className="text-sky-700">.BED</strong> ou <strong className="text-indigo-700">.JSON</strong> ici
            </div>
            <div className="text-[11px] text-slate-500">
              ou sélectionnez manuellement le type de fichier à importer :
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {/* Hidden file inputs */}
            <input
              ref={bedInputRef}
              type="file"
              accept=".bed"
              onChange={handleBedFileChange}
              className="hidden"
            />
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonFileChange}
              className="hidden"
            />

            <button
              onClick={() => bedInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-sky-600" />
              <span>Importer Fichier BED (.bed)</span>
            </button>

            <button
              onClick={() => jsonInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileJson className="h-4 w-4 text-indigo-600" />
              <span>Importer Benchmark JSON (.json)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Loaded Files & Dynamic Metrics Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* BED Status */}
        <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${activeBedFileName ? "bg-sky-50/80 border-sky-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center space-x-1.5 text-sky-950">
              <FileCode className="h-4 w-4 text-sky-600" />
              <span>Fichier BED Actif</span>
            </div>
            {activeBedFileName ? (
              <span className="bg-sky-200 text-sky-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 text-sky-700" />
                <span>Custom</span>
              </span>
            ) : (
              <span className="text-slate-400 font-normal">Panel Démo UCSC</span>
            )}
          </div>
          <div className="text-slate-700 font-mono text-[11px] truncate">
            {activeBedFileName || "capture_panel_demo.bed"}
          </div>
          {parsedBedStats && (
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-0.5">
              <span><strong>{parsedBedStats.totalGenes}</strong> Gènes</span>
              <span>•</span>
              <span><strong>{parsedBedStats.totalRegions}</strong> Régions/Exons</span>
              <span>•</span>
              <span><strong>{(parsedBedStats.totalBp / 1000).toFixed(1)}</strong> kb cible</span>
            </div>
          )}
        </div>

        {/* JSON & Aligners Status */}
        <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${activeJsonFileName ? "bg-indigo-50/80 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center space-x-1.5 text-indigo-950">
              <FileJson className="h-4 w-4 text-indigo-600" />
              <span>Dataset & Aligneurs Détectés</span>
            </div>
            {activeJsonFileName ? (
              <span className="bg-indigo-200 text-indigo-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 text-indigo-700" />
                <span>Custom JSON</span>
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded text-[10px]">Benchmark Consolidé</span>
            )}
          </div>
          <div className="text-slate-700 font-mono text-[11px] truncate">
            {activeJsonFileName || "benchmark_consolidated_data.json"}
          </div>
          {/* Aligner Badges */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {detectedAligners.map((a) => (
              <span
                key={a.id}
                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                style={{ backgroundColor: a.color }}
              >
                {a.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
