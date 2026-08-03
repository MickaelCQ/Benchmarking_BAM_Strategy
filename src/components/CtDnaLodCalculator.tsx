import React, { useState, useMemo, useEffect } from "react";
import { CAPTURE_BED_GENES, GeneCoverageProfile } from "../data/geneCoverageData";
import {
  calculateVariantDetectionProb,
  findRequiredDepthForConfidence,
  generateBinomialCurveData,
} from "../utils/binomialModel";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Dna,
  Filter,
  Info,
  Layers,
  TrendingUp,
  ShieldAlert,
  Zap,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";

interface VariantLossCalculatorProps {
  selectedSample?: string;
  selectedRun?: string;
  customDataset?: any[] | null;
  onDatasetChange?: (data: any[]) => void;
}

export const VariantLossCalculator: React.FC<VariantLossCalculatorProps> = ({
  selectedSample = "ALL",
  selectedRun = "ALL",
  customDataset: parentCustomDataset,
  onDatasetChange,
}) => {
  const [selectedGeneSymbol, setSelectedGeneSymbol] = useState<string>("COL3A1");
  const [targetVafPct, setTargetVafPct] = useState<number>(20.0); // 20% VAF as default requested
  const [minReadsThreshold, setMinReadsThreshold] = useState<number>(3); // n=3 haute sensibilite, n=5 standard
  const [targetConfidence, setTargetConfidence] = useState<number>(0.99); // 99% detection target
  const [showMethodologyBox, setShowMethodologyBox] = useState<boolean>(true); // Encadre des modalites de calcul
  const [localCustomDataset, setLocalCustomDataset] = useState<any[] | null>(null);

  useEffect(() => {
    if (!parentCustomDataset && !localCustomDataset) {
      fetch("/benchmark_consolidated_data.json")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalCustomDataset(data);
          }
        })
        .catch(() => {});
    }
  }, [parentCustomDataset, localCustomDataset]);

  const customDataset = localCustomDataset || parentCustomDataset;

  const currentGene: GeneCoverageProfile =
    CAPTURE_BED_GENES.find((g) => g.geneSymbol === selectedGeneSymbol) || CAPTURE_BED_GENES[0];

  const targetVafDecimal = targetVafPct / 100;

  const formattedConfidence =
    targetConfidence === 0.999 ? "99.9%" : targetConfidence === 0.99 ? "99%" : `${(targetConfidence * 100).toFixed(0)}%`;

  // Dynamic scaled activeExons based on selected run, sample, and uploaded dataset
  const activeExons = useMemo(() => {
    if (!customDataset || customDataset.length === 0) {
      return currentGene.exons;
    }

    // Strategy A: Benchmark Dataset with aligner & clinical.meanTargetDepth or geneCoverage
    if (customDataset[0] && (customDataset[0].aligner || customDataset[0].clinical)) {
      let subset = customDataset;
      if (selectedRun !== "ALL") {
        subset = subset.filter((item) => item.runId === selectedRun);
      }
      if (selectedSample !== "ALL") {
        subset = subset.filter((item) => item.sampleId === selectedSample);
      }
      if (subset.length === 0) subset = customDataset;

      const dragenItems = subset.filter((i) => (i.aligner || "").toLowerCase().includes("dragen"));
      const nextgeneItems = subset.filter((i) => (i.aligner || "").toLowerCase().includes("nextgene"));
      const bwaItems = subset.filter((i) => (i.aligner || "").toLowerCase().includes("bwa"));

      const getMeanForAligner = (items: any[]) => {
        if (items.length === 0) return null;
        let sum = 0;
        let count = 0;
        for (const item of items) {
          if (item.geneCoverage && typeof item.geneCoverage[selectedGeneSymbol] === "number") {
            sum += item.geneCoverage[selectedGeneSymbol];
            count++;
          } else if (item.clinical && typeof item.clinical.meanTargetDepth === "number") {
            sum += item.clinical.meanTargetDepth;
            count++;
          }
        }
        return count > 0 ? sum / count : null;
      };

      const dragenGeneD = getMeanForAligner(dragenItems);
      const nextgeneGeneD = getMeanForAligner(nextgeneItems);
      const bwaGeneD = getMeanForAligner(bwaItems);

      if (dragenGeneD !== null || nextgeneGeneD !== null || bwaGeneD !== null) {
        const baseAvgDragen = currentGene.exons.reduce((a, b) => a + b.dragenDepth, 0) / (currentGene.exons.length || 1);
        const baseAvgNextgene = currentGene.exons.reduce((a, b) => a + b.nextgeneDepth, 0) / (currentGene.exons.length || 1);
        const baseAvgBwa = currentGene.exons.reduce((a, b) => a + b.bwaDepth, 0) / (currentGene.exons.length || 1);

        const scaleDragen = dragenGeneD !== null && baseAvgDragen > 0 ? dragenGeneD / baseAvgDragen : 1;
        const scaleNextgene = nextgeneGeneD !== null && baseAvgNextgene > 0 ? nextgeneGeneD / baseAvgNextgene : 1;
        const scaleBwa = bwaGeneD !== null && baseAvgBwa > 0 ? bwaGeneD / baseAvgBwa : 1;

        return currentGene.exons.map((e) => ({
          ...e,
          dragenDepth: Math.max(1, Math.round(e.dragenDepth * scaleDragen)),
          nextgeneDepth: Math.max(1, Math.round(e.nextgeneDepth * scaleNextgene)),
          bwaDepth: Math.max(1, Math.round(e.bwaDepth * scaleBwa)),
        }));
      }
    }

    // Strategy B: Legacy flat array of exon objects (uploaded json with dragenDepth, nextgeneDepth, bwaDepth)
    const matching = customDataset.filter(
      (item: any) => item.gene && item.gene.toString().toUpperCase() === selectedGeneSymbol.toUpperCase()
    );
    if (matching.length > 0) {
      return matching.map((item: any, idx: number) => ({
        exonId: item.exonId || `Exon ${idx + 1}`,
        exonNumber: item.exonNumber || idx + 1,
        chr: item.chr || currentGene.exons[0]?.chr || "chr12",
        start: item.start || 0,
        end: item.end || 0,
        lengthBp: item.lengthBp || 150,
        gcContentPct: item.gcContentPct || 45,
        dragenDepth: item.dragenDepth ?? 0,
        nextgeneDepth: item.nextgeneDepth ?? 0,
        bwaDepth: item.bwaDepth ?? 0,
      }));
    }

    return currentGene.exons;
  }, [customDataset, selectedGeneSymbol, selectedRun, selectedSample, currentGene]);

  // Minimum required depth to achieve targetConfidence (e.g. 99.9%, 99%, 95%) at targetVaf
  const requiredDepth = useMemo(() => {
    return findRequiredDepthForConfidence(targetVafDecimal, targetConfidence, minReadsThreshold);
  }, [targetVafDecimal, targetConfidence, minReadsThreshold]);

  // Overall gene mean depths
  const geneDragenDepth = Math.round(
    activeExons.reduce((acc, e) => acc + e.dragenDepth, 0) / (activeExons.length || 1)
  );
  const geneNextgeneDepth = Math.round(
    activeExons.reduce((acc, e) => acc + e.nextgeneDepth, 0) / (activeExons.length || 1)
  );
  const geneBwaDepth = Math.round(
    activeExons.reduce((acc, e) => acc + e.bwaDepth, 0) / (activeExons.length || 1)
  );

  // Overall gene loss probabilities
  const dragenGeneProb = calculateVariantDetectionProb(geneDragenDepth, targetVafDecimal, minReadsThreshold);
  const nextgeneGeneProb = calculateVariantDetectionProb(geneNextgeneDepth, targetVafDecimal, minReadsThreshold);
  const bwaGeneProb = calculateVariantDetectionProb(geneBwaDepth, targetVafDecimal, minReadsThreshold);

  // Binomial curve data generation for plotting
  const curveData = useMemo(() => {
    const vafList = [0.01, 0.05, 0.10, 0.20, 0.50]; // 1%, 5%, 10%, 20%, 50%
    if (!vafList.includes(targetVafDecimal)) {
      vafList.push(targetVafDecimal);
      vafList.sort((a, b) => a - b);
    }
    const maxD = targetVafPct < 1 ? 2000 : targetVafPct < 5 ? 500 : 200;
    const step = Math.max(1, Math.floor(maxD / 80));
    return generateBinomialCurveData(vafList, maxD, step, minReadsThreshold);
  }, [targetVafDecimal, targetVafPct, minReadsThreshold]);

  // Exon-level calculations
  const exonLossData = useMemo(() => {
    return activeExons.map((exon) => {
      const dragenRes = calculateVariantDetectionProb(exon.dragenDepth, targetVafDecimal, minReadsThreshold);
      const nextgeneRes = calculateVariantDetectionProb(exon.nextgeneDepth, targetVafDecimal, minReadsThreshold);
      const bwaRes = calculateVariantDetectionProb(exon.bwaDepth, targetVafDecimal, minReadsThreshold);

      return {
        exonId: exon.exonId,
        exonNumber: exon.exonNumber,
        chr: exon.chr,
        start: exon.start,
        end: exon.end,
        lengthBp: exon.lengthBp,
        gcContentPct: exon.gcContentPct,
        dragenDepth: exon.dragenDepth,
        nextgeneDepth: exon.nextgeneDepth,
        bwaDepth: exon.bwaDepth,
        dragenLossPct: Math.round(dragenRes.pLoss * 10000) / 100, // e.g. 0.02%
        nextgeneLossPct: Math.round(nextgeneRes.pLoss * 10000) / 100,
        bwaLossPct: Math.round(bwaRes.pLoss * 10000) / 100,
        dragenDetectPct: Math.round(dragenRes.pDetection * 10000) / 100,
        nextgeneDetectPct: Math.round(nextgeneRes.pDetection * 10000) / 100,
        bwaDetectPct: Math.round(bwaRes.pDetection * 10000) / 100,
      };
    });
  }, [activeExons, targetVafDecimal, minReadsThreshold]);

  return (
    <div className="space-y-8">
      {/* Banner / Paper Context */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-4">
          <Dna className="w-96 h-96 text-indigo-300" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Conception & Développement : Coquerelle M. & Cabello-Aguilar S.</span>
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
              Modèle Probabiliste B(D_dedup, VAF) — Diseases 2025
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Simulation de la Probabilité de Perte de Variant Constitutionnel selon la Profondeur (D)
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
            Calcul probabiliste basé sur la loi binomiale P(X &ge; n) pour déterminer la profondeur de couverture minimale D requise afin d'éliminer le risque de faux négatif (non-détection d'un variant constitutionnel) à une fréquence allélique (VAF) donnée.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
            <div>
              • Seuil de lecture unique : <strong className="text-sky-300">n = {minReadsThreshold} reads</strong> ({minReadsThreshold === 3 ? "Haute Sensibilité" : minReadsThreshold === 10 ? "Ultra-Spécifique / Profond" : "Seuil Personnalisé"})
            </div>
            <div>
              • Citation : <span className="text-slate-300 italic">Diseases 2025, 13(10), 312; doi:10.3390/diseases13100312</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-sky-50/80 p-5 rounded-2xl border border-indigo-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowMethodologyBox(!showMethodologyBox)}>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <span>Modalités de Calcul & Méthodologie Stochastique de la Simulation</span>
              </h3>
              <p className="text-xs text-slate-600">
                Spécifications mathématiques du modèle binomial de sensibilité NGS Constitutionnel
              </p>
            </div>
          </div>
          <button className="flex items-center space-x-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
            <span>{showMethodologyBox ? "Masquer le détail" : "Afficher les formules"}</span>
            {showMethodologyBox ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showMethodologyBox && (
          <div className="pt-3 border-t border-indigo-100 text-xs text-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Box 1: Contexte NGS Constitutionnel */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-indigo-950 text-xs">
                  <Dna className="w-4 h-4 text-indigo-600" />
                  <span>1. Cadre d'Analyse (NGS Constitutionnel)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Modélise la probabilité de couverture d'un variant constitutionnel (germline) ou de mosaïque constitutionnelle sur les cibles BED d'un panel de capture.
                </p>
              </div>

              {/* Box 2: Loi Binomiale sur Profondeur Dé-dupliquée */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-indigo-950 text-xs">
                  <Activity className="w-4 h-4 text-sky-600" />
                  <span>2. Loi Binomiale X ~ B(D_dedup, VAF)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Soit <strong>D (D_dedup)</strong> la profondeur <i>après dé-duplication</i> (Picard MarkDuplicates ou dé-duplication UMIs / DRAGEN) et VAF la fréquence allélique.
                </p>
              </div>

              {/* Box 3: Seuil de Validation n */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-indigo-950 text-xs">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>3. Seuil de Confirmation (n reads)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Un variant est considéré comme <strong>détecté et validé</strong> si et seulement si $X \ge n$ (seuil actif $n = {minReadsThreshold}$ lectures uniques mutées).
                </p>
              </div>
            </div>

            {/* Formules détaillées */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono space-y-3">
              <div className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider">
                Formules Mathématiques de la Simulation
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
                  <div className="text-amber-400 font-bold">A. Probabilité de Perte (Faux-Négatif)</div>
                  <div className="text-[12px] text-white">
                    P(Perte) = &sum;<sub>k=0</sub><sup>n-1</sup> [ C(D, k) &middot; p<sup>k</sup> &middot; (1-p)<sup>D-k</sup> ]
                  </div>
                  <div className="text-[10px] text-slate-400">avec p = VAF et D = profondeur de couverture</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
                  <div className="text-emerald-400 font-bold">B. Sensibilité (Probabilité de Détection)</div>
                  <div className="text-[12px] text-white">
                    P(Détection) = 1 - P(Perte) = P(X &ge; n)
                  </div>
                  <div className="text-[10px] text-slate-400">Garantie diagnostique de couverture</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
                  <div className="text-sky-400 font-bold">C. Seuil de Profondeur Requis (D)</div>
                  <div className="text-[12px] text-white">
                    D<sub>min</sub> = min D tel que P(X &ge; n | D, p) &ge; Confiance
                  </div>
                  <div className="text-[10px] text-slate-400">Ex: D<sub>99%</sub> pour 99% de détection</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel / Interactive Parameters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Gene Quick Selection Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Sélection Rapide du Gène Candidat ({CAPTURE_BED_GENES.length} gènes BED)
              </h3>
            </div>
            {/* Gene Picker Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600 hidden sm:inline">Choix :</label>
              <select
                value={selectedGeneSymbol}
                onChange={(e) => setSelectedGeneSymbol(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                {CAPTURE_BED_GENES.map((g) => (
                  <option key={g.geneSymbol} value={g.geneSymbol}>
                    {g.geneSymbol} — {g.fullName} ({g.totalExons} exons)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {CAPTURE_BED_GENES.map((g) => {
              const isSelected = g.geneSymbol === selectedGeneSymbol;
              return (
                <button
                  key={g.geneSymbol}
                  onClick={() => setSelectedGeneSymbol(g.geneSymbol)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {g.geneSymbol} ({g.totalExons} exons)
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders and Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
          {/* Target VAF Slider + Presets */}
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Fréquence Allélique Cible (VAF) :</span>
              <span className="bg-indigo-600 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded shadow-xs">
                {targetVafPct}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="50"
              step="0.5"
              value={targetVafPct}
              onChange={(e) => setTargetVafPct(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            {/* Quick VAF Presets */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[50, 20, 10, 5, 2, 1].map((val) => (
                <button
                  key={val}
                  onClick={() => setTargetVafPct(val)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                    targetVafPct === val
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {val === 50 ? "50% (Hétérozygote)" : val === 20 ? "20% (Mosaïque)" : `${val}%`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Modélise le risque de manquer une mutation présente à <strong>{targetVafPct}% VAF</strong>.
            </p>
          </div>

          {/* Min Reads Threshold n */}
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Nombre de Reads Cibles (n) :</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 font-bold">n =</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={minReadsThreshold}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) {
                      setMinReadsThreshold(val);
                    } else if (e.target.value === "") {
                      setMinReadsThreshold(1);
                    }
                  }}
                  className="w-16 bg-white border border-sky-400 font-mono font-extrabold text-xs text-sky-900 px-2 py-0.5 rounded text-center focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Presets Grid including n=2, n=3, n=5, n=10 */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {[
                { n: 2, label: "n = 2 (Sensibilité Max)" },
                { n: 3, label: "n = 3 (Haute Sensibilité)" },
                { n: 5, label: "n = 5 (Standard Tissu)" },
                { n: 10, label: "n = 10 (Ultra-Spécifique)" },
              ].map((item) => (
                <button
                  key={item.n}
                  onClick={() => setMinReadsThreshold(item.n)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all truncate ${
                    minReadsThreshold === item.n
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs ring-1 ring-sky-300"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 leading-snug">
              Sélectionnez ou renseignez librement le nombre de lectures mutées requises.
            </p>
          </div>

          {/* Target Confidence % */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Niveau de Confiance Cible :</span>
              <span className="bg-emerald-600 text-white font-mono font-extrabold text-xs px-2 py-0.5 rounded">
                {formattedConfidence}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => setTargetConfidence(0.999)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                  targetConfidence === 0.999
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                99.9% (Perte ≤ 0.1%)
              </button>
              <button
                onClick={() => setTargetConfidence(0.99)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                  targetConfidence === 0.99
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                99% (Perte ≤ 1%)
              </button>
              <button
                onClick={() => setTargetConfidence(0.95)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                  targetConfidence === 0.95
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                95% (Perte ≤ 5%)
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Détermine le seuil de profondeur minimum requis D<sub>{formattedConfidence}</sub>.
            </p>
          </div>
        </div>

        {/* Dataset Provenance Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono shadow-xs border border-slate-800">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>
              Profondeurs mesurées en temps réel sur <strong className="text-emerald-300">benchmark_consolidated_data.json</strong>
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>
              Gène : <strong className="text-amber-300">{selectedGeneSymbol}</strong>
            </span>
            <span>|</span>
            <span>
              Échantillon : <strong className="text-sky-300">{selectedSample}</strong>
            </span>
            <span>|</span>
            <span>
              Run : <strong className="text-indigo-300">{selectedRun}</strong>
            </span>
          </div>
        </div>

        {/* Key Benchmark Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Required Depth Metric */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md border border-indigo-700 space-y-1">
            <div className="flex items-center justify-between text-indigo-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">Profondeur Requise (D_dedup)</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {requiredDepth === Infinity ? "N/A" : `${requiredDepth.toLocaleString()}x`}
            </div>
            <div className="text-[11px] text-indigo-200">
              Pour une détection à <strong>{formattedConfidence}</strong> à <strong>{targetVafPct}% VAF</strong>
            </div>
          </div>

          {/* DRAGEN Status */}
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-sky-900">
              <span className="font-bold text-xs">DRAGEN v4.0</span>
              <span className="text-[10px] font-mono bg-sky-200 text-sky-900 font-bold px-1.5 py-0.5 rounded">
                GPU
              </span>
            </div>
            <div className="text-xs font-bold font-mono text-sky-800">
              Profondeur moyenne : <span className="text-sm text-sky-950 font-black">{geneDragenDepth}x</span>
            </div>
            <div className="text-sm font-extrabold text-sky-950 font-mono pt-1">
              Proba Perte: {dragenGeneProb.pLoss < 0.0001 ? "< 0.01%" : `${(dragenGeneProb.pLoss * 100).toFixed(2)}%`}
            </div>
            <div className="text-[11px] text-slate-600">
              Sensibilité détection : <strong className="text-sky-700">{(dragenGeneProb.pDetection * 100).toFixed(2)}%</strong>
            </div>
          </div>

          {/* NextGENe Status */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-900">
              <span className="font-bold text-xs">NextGENe v2.4</span>
              <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                K-mer
              </span>
            </div>
            <div className="text-xs font-bold font-mono text-emerald-800">
              Profondeur moyenne : <span className="text-sm text-emerald-950 font-black">{geneNextgeneDepth}x</span>
            </div>
            <div className={`text-sm font-extrabold font-mono pt-1 ${nextgeneGeneProb.pLoss > 0.05 ? "text-rose-600" : "text-emerald-950"}`}>
              Proba Perte: {nextgeneGeneProb.pLoss < 0.0001 ? "< 0.01%" : `${(nextgeneGeneProb.pLoss * 100).toFixed(2)}%`}
            </div>
            <div className="text-[11px] text-slate-600">
              Sensibilité détection : <strong className="text-emerald-700">{(nextgeneGeneProb.pDetection * 100).toFixed(2)}%</strong>
            </div>
          </div>

          {/* BWA Status */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-900">
              <span className="font-bold text-xs">BWA-MEM</span>
              <span className="text-[10px] font-mono bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                GATK
              </span>
            </div>
            <div className="text-xs font-bold font-mono text-amber-800">
              Profondeur moyenne : <span className="text-sm text-amber-950 font-black">{geneBwaDepth}x</span>
            </div>
            <div className="text-sm font-extrabold text-amber-950 font-mono pt-1">
              Proba Perte: {bwaGeneProb.pLoss < 0.0001 ? "< 0.01%" : `${(bwaGeneProb.pLoss * 100).toFixed(2)}%`}
            </div>
            <div className="text-[11px] text-slate-600">
              Sensibilité détection : <strong className="text-amber-800">{(bwaGeneProb.pDetection * 100).toFixed(2)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Binomial Model Curve Plot (Publication Fig 1A Equivalent) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <span>Courbes de Détection Binomiale $P(X \ge n)$ en fonction de la Profondeur $D$</span>
            </h3>
            <p className="text-xs text-slate-500">
              Représentation probabiliste basée sur Cabello-Aguilar et al. (Diseases 2025). Montre la probabilité de détection pour différentes fréquences alléliques.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-500">Seuil visuel :</span>
            <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded">
              Ligne pointillée = Target {formattedConfidence}
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="depth"
                tick={{ fontSize: 11, fill: "#64748b" }}
                label={{ value: "Profondeur de Couverture (X)", position: "insideBottom", offset: -10, fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                unit="%"
                label={{ value: "Probabilité de Détection (%)", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                formatter={(val: any, name: any) => [`${val}%`, name]}
                labelFormatter={(label) => `Profondeur D = ${label}x`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
              <ReferenceLine y={targetConfidence * 100} stroke="#4f46e5" strokeDasharray="5 5" label={{ value: `Seuil ${formattedConfidence}`, fill: "#4f46e5", fontSize: 11 }} />

              <Line type="monotone" dataKey="vaf_1.0%" name="VAF 1.0%" stroke="#e11d48" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vaf_5.0%" name="VAF 5.0%" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vaf_10.0%" name="VAF 10.0%" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vaf_20.0%" name="VAF 20.0%" stroke="#06b6d4" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="vaf_50.0%" name="VAF 50.0% (Het)" stroke="#6366f1" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exon-Level Risk of Missing Variant Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <span>Probabilité de Perte par Exon pour {currentGene.geneSymbol} (VAF {targetVafPct}%)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Mesure directe du risque de faux-négatif exon par exon pour les aligneurs DRAGEN, NextGENe et BWA-MEM.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Plus la barre est basse (proche de 0%), plus la sécurité diagnostique est élevée.
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exonLossData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="exonId"
                tick={{ fontSize: 10, fill: "#475569" }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#475569" }}
                unit="%"
                label={{ value: "Probabilité de Perte (%)", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                formatter={(val: any, name: any) => [`${val}%`, name]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
              <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Seuil Risque 1%", fill: "#ef4444", fontSize: 10 }} />

              <Bar dataKey="dragenLossPct" name="DRAGEN v4.0 - Perte (%)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nextgeneLossPct" name="NextGENe v2.4 - Perte (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bwaLossPct" name="BWA-MEM - Perte (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Exon BED Table with Loss Probabilities */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Tableau des Exons & Probabilités de Perte de Variant ({currentGene.geneSymbol})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Calculé à la fréquence allélique cible VAF = <strong>{targetVafPct}%</strong> (n = {minReadsThreshold} reads).
            </p>
          </div>
          <span className="bg-indigo-50 text-indigo-800 text-xs px-3 py-1 rounded-full font-bold border border-indigo-200">
            {exonLossData.length} Exons Analysés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="p-3">Exon / Région BED</th>
                <th className="p-3">Coordonnées</th>
                <th className="p-3 text-center">GC %</th>
                <th className="p-3 text-center bg-sky-950 text-sky-200">DRAGEN (x)</th>
                <th className="p-3 text-center bg-sky-950 text-sky-200">DRAGEN Perte %</th>
                <th className="p-3 text-center bg-emerald-950 text-emerald-200">NextGENe (x)</th>
                <th className="p-3 text-center bg-emerald-950 text-emerald-200">NextGENe Perte %</th>
                <th className="p-3 text-center bg-amber-950 text-amber-200">BWA-MEM (x)</th>
                <th className="p-3 text-center bg-amber-950 text-amber-200">BWA Perte %</th>
                <th className="p-3 text-center">Alerte Clinique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {exonLossData.map((ex) => {
                const maxLoss = Math.max(ex.dragenLossPct, ex.nextgeneLossPct, ex.bwaLossPct);
                const hasHighRisk = maxLoss > 1.0;

                return (
                  <tr key={ex.exonId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{ex.exonId}</td>
                    <td className="p-3 text-slate-600">
                      {ex.chr}:{ex.start.toLocaleString()}-{ex.end.toLocaleString()} ({ex.lengthBp} bp)
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{ex.gcContentPct}%</td>

                    {/* DRAGEN */}
                    <td className="p-3 text-center font-bold text-sky-900 bg-sky-50/50">{ex.dragenDepth}x</td>
                    <td className="p-3 text-center font-bold text-sky-700 bg-sky-50/50">
                      {ex.dragenLossPct < 0.01 ? "< 0.01%" : `${ex.dragenLossPct}%`}
                    </td>

                    {/* NextGENe */}
                    <td className="p-3 text-center font-bold text-emerald-900 bg-emerald-50/50">{ex.nextgeneDepth}x</td>
                    <td className={`p-3 text-center font-bold bg-emerald-50/50 ${ex.nextgeneLossPct > 1.0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {ex.nextgeneLossPct < 0.01 ? "< 0.01%" : `${ex.nextgeneLossPct}%`}
                    </td>

                    {/* BWA */}
                    <td className="p-3 text-center font-bold text-amber-900 bg-amber-50/50">{ex.bwaDepth}x</td>
                    <td className="p-3 text-center font-bold text-amber-800 bg-amber-50/50">
                      {ex.bwaLossPct < 0.01 ? "< 0.01%" : `${ex.bwaLossPct}%`}
                    </td>

                    {/* Clinical Alert */}
                    <td className="p-3 text-center">
                      {hasHighRisk ? (
                        <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Risque &gt; 1%</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Sécurisé</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Backwards compatibility alias
export const CtDnaLodCalculator = VariantLossCalculator;
