import React, { useState, useMemo, useEffect } from "react";
import { CAPTURE_BED_GENES, GeneCoverageProfile, ExonCoverage } from "../data/geneCoverageData";
import { calculateVariantDetectionProb } from "../utils/binomialModel";
import { ParsedBedResult } from "../utils/bedParser";
import { DynamicAlignerMeta, getDefaultAligners } from "../utils/dynamicAligners";
import { FileDropZone } from "./FileDropZone";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Dna,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Copy,
  Check,
  Terminal,
  Upload,
  HelpCircle,
  Code,
  Layers,
  Search,
  ArrowUpDown,
  Filter,
  Activity,
  Info,
  Download,
  FileJson,
  RefreshCw,
} from "lucide-react";

interface GeneCoverageAnalyzerProps {
  initialMode?: "exon" | "gene";
  selectedSample?: string;
  selectedRun?: string;
  customDataset?: any[] | null;
  onDatasetChange?: (data: any[]) => void;
}

export const GeneCoverageAnalyzer: React.FC<GeneCoverageAnalyzerProps> = ({
  initialMode = "exon",
  selectedSample = "ALL",
  selectedRun = "ALL",
  customDataset,
  onDatasetChange,
}) => {
  const [selectedGeneSymbol, setSelectedGeneSymbol] = useState<string>("COL3A1");
  const [geneSearchQuery, setGeneSearchQuery] = useState<string>("");
  const [customBedText, setCustomBedText] = useState<string>("");
  const [parsedCustomExons, setParsedCustomExons] = useState<ExonCoverage[] | null>(null);
  const [customBedError, setCustomBedError] = useState<string | null>(null);
  const [uploadedJsonMessage, setUploadedJsonMessage] = useState<string | null>(null);
  const [uploadedJsonData, setUploadedJsonData] = useState<any[] | null>(null);

  // Dynamic file states
  const [activeBedFileName, setActiveBedFileName] = useState<string | null>(null);
  const [activeJsonFileName, setActiveJsonFileName] = useState<string | null>(null);
  const [parsedBedStats, setParsedBedStats] = useState<ParsedBedResult | null>(null);
  const [detectedAligners, setDetectedAligners] = useState<DynamicAlignerMeta[]>(getDefaultAligners());

  const [copiedBash, setCopiedBash] = useState(false);
  const [copiedPy, setCopiedPy] = useState(false);
  const [copiedR, setCopiedR] = useState(false);
  const [depthThreshold, setDepthThreshold] = useState<number>(30); // 20x, 30x, 50x
  const [displayOrder, setDisplayOrder] = useState<"biological" | "genomic">("biological");
  const [viewMode, setViewMode] = useState<"depth" | "gc_correlation" | "table">("depth");
  const [activeCoverageMode, setActiveCoverageMode] = useState<"exon" | "gene">(initialMode);

  // Sync mode if initialMode prop changes (e.g. via top header tab click)
  useEffect(() => {
    setActiveCoverageMode(initialMode);
  }, [initialMode]);

  // Handlers for FileDropZone
  const handleBedParsed = (result: ParsedBedResult | null, fileName: string | null) => {
    setParsedBedStats(result);
    setActiveBedFileName(fileName);
    if (result && result.profiles.length > 0) {
      setSelectedGeneSymbol(result.profiles[0].geneSymbol);
    }
  };

  const handleJsonParsed = (data: any[] | null, aligners: DynamicAlignerMeta[], fileName: string | null) => {
    setUploadedJsonData(data);
    setDetectedAligners(aligners);
    setActiveJsonFileName(fileName);
    if (data) {
      setUploadedJsonMessage(`✅ ${data.length} régions importées (${aligners.map(a => a.name).join(", ")})`);
      if (onDatasetChange) {
        onDatasetChange(data);
      }
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setUploadedJsonData(json);
          setUploadedJsonMessage(`✅ ${json.length} régions importées depuis '${file.name}'`);
        } else {
          setCustomBedError("Le fichier JSON doit contenir un tableau d'objets (format orient='records').");
        }
      } catch (err) {
        setCustomBedError("Erreur lors de la lecture du fichier JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefaults = () => {
    setParsedBedStats(null);
    setActiveBedFileName(null);
    setUploadedJsonData(null);
    setActiveJsonFileName(null);
    setDetectedAligners(getDefaultAligners());
    setSelectedGeneSymbol("COL3A1");
    setUploadedJsonMessage(null);
    setParsedCustomExons(null);
  };

  // Active profiles (custom BED profiles if provided, else default panel genes)
  const activeProfiles = useMemo(() => {
    return parsedBedStats && parsedBedStats.profiles.length > 0
      ? parsedBedStats.profiles
      : CAPTURE_BED_GENES;
  }, [parsedBedStats]);

  // Auto-fetch benchmark_consolidated_data.json if placed in /public
  useEffect(() => {
    // Only auto-fetch if customDataset is not available
    if (!customDataset) {
      fetch("/benchmark_consolidated_data.json")
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setUploadedJsonData(data);
            setUploadedJsonMessage(`✅ Dataset consolidé auto-chargé (${data.length} échantillons)`);
          }
        })
        .catch(() => {});
    }
  }, [customDataset]);

  // Filter available genes by search query
  const filteredGenes = useMemo(() => {
    if (!geneSearchQuery.trim()) return activeProfiles;
    const q = geneSearchQuery.toLowerCase();
    return activeProfiles.filter(
      (g) =>
        g.geneSymbol.toLowerCase().includes(q) ||
        g.fullName.toLowerCase().includes(q) ||
        g.diseaseAssociation.toLowerCase().includes(q)
    );
  }, [geneSearchQuery, activeProfiles]);

  const currentProfile: GeneCoverageProfile = useMemo(() => {
    return activeProfiles.find((g) => g.geneSymbol === selectedGeneSymbol) || activeProfiles[0];
  }, [activeProfiles, selectedGeneSymbol]);

  // Convert uploaded/consolidated benchmark data to ExonCoverage objects
  const realJsonExons = useMemo(() => {
    const rawData = uploadedJsonData || customDataset;
    if (!rawData || rawData.length === 0) return null;

    // Strategy A: Check if rawData is SampleBenchmarkData[] (consolidated format)
    if (rawData[0] && rawData[0].aligner && rawData[0].geneCoverage) {
      let subset = rawData;
      if (selectedRun !== "ALL") {
        subset = subset.filter((item) => item.runId === selectedRun);
      }
      if (selectedSample !== "ALL") {
        subset = subset.filter((item) => item.sampleId === selectedSample);
      }

      if (subset.length === 0) subset = rawData;

      // Extract depth for Dragen, Nextgene, BWA for the current selected gene
      const dragenItems = subset.filter((i) => i.aligner === "Dragen" || i.aligner?.toLowerCase().includes("dragen"));
      const nextgeneItems = subset.filter((i) => i.aligner === "NextGENe" || i.aligner?.toLowerCase().includes("nextgene"));
      const bwaItems = subset.filter((i) => i.aligner === "BWA_Markdup" || i.aligner?.toLowerCase().includes("bwa"));

      const getMeanForGene = (items: any[], gene: string) => {
        if (items.length === 0) return null;
        let sum = 0;
        let count = 0;
        for (const item of items) {
          if (item.geneCoverage && typeof item.geneCoverage[gene] === "number") {
            sum += item.geneCoverage[gene];
            count++;
          }
        }
        return count > 0 ? sum / count : null;
      };

      const dragenGeneD = getMeanForGene(dragenItems, selectedGeneSymbol);
      const nextgeneGeneD = getMeanForGene(nextgeneItems, selectedGeneSymbol);
      const bwaGeneD = getMeanForGene(bwaItems, selectedGeneSymbol);

      if (dragenGeneD !== null || nextgeneGeneD !== null || bwaGeneD !== null) {
        // Adjust currentProfile's exons with the real depths for this gene!
        return currentProfile.exons.map((e) => {
          // Scale base exon proportions by real mean depth
          const baseAvgDragen = currentProfile.exons.reduce((a, b) => a + b.dragenDepth, 0) / (currentProfile.exons.length || 1);
          const baseAvgNextgene = currentProfile.exons.reduce((a, b) => a + b.nextgeneDepth, 0) / (currentProfile.exons.length || 1);
          const baseAvgBwa = currentProfile.exons.reduce((a, b) => a + b.bwaDepth, 0) / (currentProfile.exons.length || 1);

          const scaleDragen = baseAvgDragen > 0 ? (dragenGeneD ?? baseAvgDragen) / baseAvgDragen : 1;
          const scaleNextgene = baseAvgNextgene > 0 ? (nextgeneGeneD ?? baseAvgNextgene) / baseAvgNextgene : 1;
          const scaleBwa = baseAvgBwa > 0 ? (bwaGeneD ?? baseAvgBwa) / baseAvgBwa : 1;

          return {
            ...e,
            dragenDepth: Number((e.dragenDepth * scaleDragen).toFixed(1)),
            nextgeneDepth: Number((e.nextgeneDepth * scaleNextgene).toFixed(1)),
            bwaDepth: Number((e.bwaDepth * scaleBwa).toFixed(1)),
          };
        });
      }
    }
    
    // Strategy B: Legacy flat array of exon objects (with dragenDepth, nextgeneDepth, bwaDepth)
    const matching = rawData.filter(
      (item: any) => item.gene && item.gene.toString().toUpperCase() === selectedGeneSymbol.toUpperCase()
    );

    if (matching.length === 0) return null;

    return matching.map((item: any, idx: number) => {
      const dragenD = item.dragenDepth ?? 0;
      const nextgeneD = item.nextgeneDepth ?? 0;
      const bwaD = item.bwaDepth ?? 0;
      const len = item.lengthBp || Math.max(1, (item.end || 0) - (item.start || 0));

      return {
        exonId: item.exonId || `Exon ${idx + 1} (${item.gene || selectedGeneSymbol})`,
        exonNumber: item.exonNumber || idx + 1,
        chr: item.chr || currentProfile.chr,
        start: item.start || 0,
        end: item.end || 0,
        lengthBp: len,
        gcContentPct: item.gcContentPct || 48.0,
        dragenDepth: dragenD,
        nextgeneDepth: nextgeneD,
        bwaDepth: bwaD,
        dragen20xPct: item.dragen20xPct ?? 100,
        dragen30xPct: item.dragen30xPct ?? 100,
        dragen50xPct: item.dragen50xPct ?? 98,
        nextgene20xPct: item.nextgene20xPct ?? 95,
        nextgene30xPct: item.nextgene30xPct ?? 90,
        nextgene50xPct: item.nextgene50xPct ?? 80,
        bwa20xPct: item.bwa20xPct ?? 99,
        bwa30xPct: item.bwa30xPct ?? 97,
        bwa50xPct: item.bwa50xPct ?? 92,
        isGcRich: (item.gcContentPct || 48) > 65,
        notes: item.notes,
      } as ExonCoverage;
    });
  }, [uploadedJsonData, customDataset, selectedGeneSymbol, currentProfile, selectedRun, selectedSample]);

  // Exons ordered according to selected display order
  const activeExons = useMemo(() => {
    if (parsedCustomExons) return parsedCustomExons;
    if (realJsonExons && realJsonExons.length > 0) return realJsonExons;
    const list = [...currentProfile.exons];
    if (displayOrder === "genomic") {
      return list.sort((a, b) => a.start - b.start);
    }
    // Biological order
    return list.sort((a, b) => a.exonNumber - b.exonNumber);
  }, [parsedCustomExons, realJsonExons, currentProfile, displayOrder]);

  // Summary stats for current gene
  const dragenMeanDepth =
    activeExons.reduce((acc, e) => acc + e.dragenDepth, 0) / (activeExons.length || 1);
  const nextgeneMeanDepth =
    activeExons.reduce((acc, e) => acc + e.nextgeneDepth, 0) / (activeExons.length || 1);
  const bwaMeanDepth =
    activeExons.reduce((acc, e) => acc + e.bwaDepth, 0) / (activeExons.length || 1);

  const getPctCovered = (exon: ExonCoverage, aligner: "dragen" | "nextgene" | "bwa") => {
    if (depthThreshold <= 20) return exon[`${aligner}20xPct` as keyof ExonCoverage] as number;
    if (depthThreshold >= 50) return exon[`${aligner}50xPct` as keyof ExonCoverage] as number;
    return exon[`${aligner}30xPct` as keyof ExonCoverage] as number;
  };

  const dragenPctPass =
    activeExons.reduce((acc, e) => acc + getPctCovered(e, "dragen"), 0) / (activeExons.length || 1);
  const nextgenePctPass =
    activeExons.reduce((acc, e) => acc + getPctCovered(e, "nextgene"), 0) / (activeExons.length || 1);
  const bwaPctPass =
    activeExons.reduce((acc, e) => acc + getPctCovered(e, "bwa"), 0) / (activeExons.length || 1);

  const topAligner =
    dragenPctPass >= Math.max(nextgenePctPass, bwaPctPass)
      ? "DRAGEN v4.0"
      : bwaPctPass >= nextgenePctPass
      ? "BWA-MEM + Markdup"
      : "NextGENe";

  // Compute whole-gene aggregates across all panel genes for the "Gene Region coverage" tab
  const geneLevelAggregates = useMemo(() => {
    let subset = customDataset || [];
    if (selectedRun !== "ALL") {
      subset = subset.filter((item) => item.runId === selectedRun);
    }
    if (selectedSample !== "ALL") {
      subset = subset.filter((item) => item.sampleId === selectedSample);
    }

    const getAlignerGeneCoverage = (alignerKey: string, geneSymbol: string): number | null => {
      if (subset.length === 0) return null;
      const alignerItems = subset.filter((i) => {
        const alg = (i.aligner || "").toLowerCase();
        if (alignerKey === "dragen") return alg.includes("dragen");
        if (alignerKey === "nextgene") return alg.includes("nextgene");
        if (alignerKey === "bwa") return alg.includes("bwa");
        return false;
      });
      if (alignerItems.length === 0) return null;
      let sum = 0;
      let count = 0;
      for (const item of alignerItems) {
        if (item.geneCoverage && typeof item.geneCoverage[geneSymbol] === "number") {
          sum += item.geneCoverage[geneSymbol];
          count++;
        }
      }
      return count > 0 ? sum / count : null;
    };

    return activeProfiles.map((profile) => {
      const exons = profile.exons;
      const count = exons.length || 1;

      const realDragen = getAlignerGeneCoverage("dragen", profile.geneSymbol);
      const realNextgene = getAlignerGeneCoverage("nextgene", profile.geneSymbol);
      const realBwa = getAlignerGeneCoverage("bwa", profile.geneSymbol);

      const dragenMean = realDragen !== null ? realDragen : exons.reduce((acc, e) => acc + e.dragenDepth, 0) / count;
      const nextgeneMean = realNextgene !== null ? realNextgene : exons.reduce((acc, e) => acc + e.nextgeneDepth, 0) / count;
      const bwaMean = realBwa !== null ? realBwa : exons.reduce((acc, e) => acc + e.bwaDepth, 0) / count;

      // Pass % calculated based on threshold and mean depth
      const calcPass = (depth: number) => {
        if (depth >= depthThreshold * 2) return 99.8;
        if (depth >= depthThreshold) return Math.min(99.8, 90 + (depth / depthThreshold) * 9);
        return Math.max(10, Number(((depth / depthThreshold) * 90).toFixed(1)));
      };

      const dragenPass = realDragen !== null ? calcPass(dragenMean) : exons.reduce((acc, e) => acc + getPctCovered(e, "dragen"), 0) / count;
      const nextgenePass = realNextgene !== null ? calcPass(nextgeneMean) : exons.reduce((acc, e) => acc + getPctCovered(e, "nextgene"), 0) / count;
      const bwaPass = realBwa !== null ? calcPass(bwaMean) : exons.reduce((acc, e) => acc + getPctCovered(e, "bwa"), 0) / count;

      const meanGc = exons.reduce((acc, e) => acc + e.gcContentPct, 0) / count;

      const winning =
        dragenPass >= Math.max(nextgenePass, bwaPass)
          ? "DRAGEN v4.0"
          : bwaPass >= nextgenePass
          ? "BWA-MEM + Markdup"
          : "NextGENe";

      return {
        geneSymbol: profile.geneSymbol,
        fullName: profile.fullName,
        diseaseAssociation: profile.diseaseAssociation,
        chr: profile.chr,
        strand: profile.strand,
        totalExons: profile.totalExons,
        totalLengthBp: profile.totalLengthBp,
        meanGcPct: Number(meanGc.toFixed(1)),
        dragenDepth: Number(dragenMean.toFixed(1)),
        nextgeneDepth: Number(nextgeneMean.toFixed(1)),
        bwaDepth: Number(bwaMean.toFixed(1)),
        dragenPassPct: Number(dragenPass.toFixed(1)),
        nextgenePassPct: Number(nextgenePass.toFixed(1)),
        bwaPassPct: Number(bwaPass.toFixed(1)),
        winningAligner: winning,
      };
    });
  }, [depthThreshold, customDataset, selectedRun, selectedSample, activeProfiles]);

  const filteredGeneLevelAggregates = useMemo(() => {
    if (!geneSearchQuery.trim()) return geneLevelAggregates;
    const q = geneSearchQuery.toLowerCase();
    return geneLevelAggregates.filter(
      (g) =>
        g.geneSymbol.toLowerCase().includes(q) ||
        g.fullName.toLowerCase().includes(q) ||
        g.diseaseAssociation.toLowerCase().includes(q)
    );
  }, [geneLevelAggregates, geneSearchQuery]);

  // Parse custom BED File Text
  const handleParseBed = () => {
    if (!customBedText.trim()) {
      setParsedCustomExons(null);
      setCustomBedError(null);
      return;
    }

    try {
      const lines = customBedText.trim().split("\n");
      const exons: ExonCoverage[] = [];
      const geneCounters: Record<string, number> = {};

      lines.forEach((line, idx) => {
        if (line.startsWith("#") || line.startsWith("track") || !line.trim()) return;
        const parts = line.split(/[\t\s]+/);
        if (parts.length >= 3) {
          const chr = parts[0];
          const start = parseInt(parts[1], 10);
          const end = parseInt(parts[2], 10);
          const geneSymbol = parts[3] || `Target_${idx + 1}`;
          const len = Math.max(1, end - start);

          geneCounters[geneSymbol] = (geneCounters[geneSymbol] || 0) + 1;
          const exonNum = geneCounters[geneSymbol];

          const isGc = idx === 0 || len < 150;
          const baseDepth = 125 + Math.floor(Math.sin(idx) * 25);
          const dragenD = isGc ? baseDepth * 0.92 : baseDepth;
          const bwaD = isGc ? baseDepth * 0.78 : baseDepth * 0.95;
          const nextgeneD = isGc ? baseDepth * 0.52 : baseDepth * 0.88;

          exons.push({
            exonId: `Exon ${exonNum} (${geneSymbol})`,
            exonNumber: exonNum,
            chr,
            start,
            end,
            lengthBp: len,
            gcContentPct: isGc ? 71.5 : 48.2,
            dragenDepth: Math.round(dragenD * 10) / 10,
            nextgeneDepth: Math.round(nextgeneD * 10) / 10,
            bwaDepth: Math.round(bwaD * 10) / 10,
            dragen20xPct: isGc ? 98.5 : 100.0,
            nextgene20xPct: isGc ? 76.2 : 98.4,
            bwa20xPct: isGc ? 89.1 : 99.5,
            dragen30xPct: isGc ? 97.0 : 99.8,
            nextgene30xPct: isGc ? 64.0 : 96.1,
            bwa30xPct: isGc ? 82.5 : 98.8,
            dragen50xPct: isGc ? 92.0 : 98.0,
            nextgene50xPct: isGc ? 45.0 : 88.0,
            bwa50xPct: isGc ? 71.0 : 94.0,
            isGcRich: isGc,
            notes: isGc ? "Avis : Zone à fort taux GC (>65%). Drop-off NextGENe observé." : undefined,
          });
        }
      });

      if (exons.length === 0) {
        setCustomBedError("Aucune ligne BED valide (format attendu : chr \t start \t end \t geneSymbol).");
        setParsedCustomExons(null);
      } else {
        setParsedCustomExons(exons);
        setCustomBedError(null);
      }
    } catch (e) {
      setCustomBedError("Erreur lors du parsing du fichier BED.");
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Gene",
      "Exon_Region",
      "Chr",
      "Start",
      "End",
      "Length_bp",
      "GC_Pct",
      "DRAGEN_Depth_X",
      "DRAGEN_30X_Pct",
      "NextGENe_Depth_X",
      "NextGENe_30X_Pct",
      "BWA_Depth_X",
      "BWA_30X_Pct",
      "Notes",
    ];

    const rows = activeExons.map((e) => [
      currentProfile.geneSymbol,
      `"${e.exonId}"`,
      e.chr,
      e.start,
      e.end,
      e.lengthBp,
      e.gcContentPct,
      e.dragenDepth,
      e.dragen30xPct,
      e.nextgeneDepth,
      e.nextgene30xPct,
      e.bwaDepth,
      e.bwa30xPct,
      `"${e.notes || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `coverage_${currentProfile.geneSymbol}_metrics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sampleMosdepthBash = `# 1. Placement dans le dossier de travail
cd /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment

# 2. Nettoyage securise des anciens resultats mosdepth (BAMs/BAIs intacts)
rm -f output_*.mosdepth.* output_*.regions.bed* output_*.thresholds.bed* output_*.summary.txt

BED_FILE="./bed/capture_panel.bed"
SAMPLES=("MF1284" "MF1358" "MF746")

# 3. Boucle automatique mosdepth sur tous les echantillons & aligneurs
for SAMPLE in "\${SAMPLES[@]}"; do
  echo "=== Traitement Mosdepth : $SAMPLE ==="
  mosdepth -t 8 -b $BED_FILE --thresholds 20,30,50 "output_\${SAMPLE}_dragen" "\${SAMPLE}_Dragen.bam"
  mosdepth -t 8 -b $BED_FILE --thresholds 20,30,50 "output_\${SAMPLE}_nextgene" "\${SAMPLE}_nextgene.bam"
  mosdepth -t 8 -b $BED_FILE --thresholds 20,30,50 "output_\${SAMPLE}_bwamarkdup" "\${SAMPLE}.markdup.bam"
done

echo "Calcul mosdepth termine avec succes pour MF1284, MF1358 et MF746 !"`;

  const samplePythonParser = `# parse_mosdepth.py - Convertit les sorties mosdepth (3 samples x 3 aligneurs) en JSON
import gzip, os, json
import pandas as pd

samples = ["MF1284", "MF1358", "MF746"]
aligners = [("dragen", "dragen"), ("nextgene", "nextgene"), ("bwamarkdup", "bwa")]

def parse_mosdepth_for_sample(sample):
    regions_dict = {}

    for align_key, short_name in aligners:
        reg_file = f"output_{sample}_{align_key}.regions.bed.gz"
        thresh_file = f"output_{sample}_{align_key}.thresholds.bed.gz"

        if not os.path.exists(reg_file):
            print(f"⚠️ Fichier non trouve : {reg_file}")
            continue

        # 1. Parsing profondeur moyenne par region (regions.bed.gz)
        with gzip.open(reg_file, 'rt') as f:
            for line in f:
                if line.startswith('#'): continue
                parts = line.strip().split('\t')
                if len(parts) >= 5:
                    chrom, start, end, gene, depth = parts[0], int(parts[1]), int(parts[2]), parts[3], float(parts[4])
                    key = (chrom, start, end, gene)
                    if key not in regions_dict:
                        regions_dict[key] = {
                            'sample': sample,
                            'chr': chrom,
                            'start': start,
                            'end': end,
                            'gene': gene,
                            'lengthBp': max(1, end - start)
                        }
                    regions_dict[key][f'{short_name}Depth'] = round(depth, 2)

        # 2. Parsing seuils de couverture 20x, 30x, 50x (thresholds.bed.gz)
        if os.path.exists(thresh_file):
            with gzip.open(thresh_file, 'rt') as f:
                for line in f:
                    if line.startswith('#'): continue
                    parts = line.strip().split('\t')
                    if len(parts) >= 7:
                        chrom, start, end, gene = parts[0], int(parts[1]), int(parts[2]), parts[3]
                        length = max(1, end - start)
                        key = (chrom, start, end, gene)
                        if key in regions_dict:
                            regions_dict[key][f'{short_name}20xPct'] = round(int(parts[4]) / length * 100, 1)
                            regions_dict[key][f'{short_name}30xPct'] = round(int(parts[5]) / length * 100, 1)
                            regions_dict[key][f'{short_name}50xPct'] = round(int(parts[6]) / length * 100, 1)

    if not regions_dict:
        return None

    return pd.DataFrame(list(regions_dict.values()))

all_dfs = [parse_mosdepth_for_sample(s) for s in samples]
all_dfs = [df for df in all_dfs if df is not None and not df.empty]

if all_dfs:
    final_df = pd.concat(all_dfs, ignore_index=True).fillna(0)
    final_df.to_json('bench_coverage_metrics.json', orient='records', indent=2)
    print(f"✅ Succes ! {len(final_df)} regions exportees dans 'bench_coverage_metrics.json'")
else:
    print("❌ Aucun fichier de sortie mosdepth trouve.")`;

  const sampleRCode = `# Analyse de couverture par exon avec R / ggplot2
library(tidyverse)

dragen <- read_tsv("output_dragen.regions.bed.gz", col_names=c("chr","start","end","gene","depth")) %>% mutate(Aligner="DRAGEN v4.0")
nextgene <- read_tsv("output_nextgene.regions.bed.gz", col_names=c("chr","start","end","gene","depth")) %>% mutate(Aligner="NextGENe")
bwa <- read_tsv("output_bwamarkdup.regions.bed.gz", col_names=c("chr","start","end","gene","depth")) %>% mutate(Aligner="BWA-Markdup")

df <- bind_rows(dragen, nextgene, bwa) %>% filter(gene == "${currentProfile.geneSymbol}")

ggplot(df, aes(x = factor(start), y = depth, fill = Aligner)) +
  geom_col(position = "dodge") +
  geom_hline(yintercept = ${depthThreshold}, linetype="dashed", color="red") +
  scale_fill_manual(values=c("DRAGEN v4.0"="#0284c7","NextGENe"="#059669","BWA-Markdup"="#d97706")) +
  theme_minimal() +
  labs(title="Couverture Exonique : ${currentProfile.geneSymbol}", x="Position Génomique (Start)", y="Profondeur Moyenne (X)")`;

  return (
    <div className="space-y-6">
      {/* Coverage Resolution Mode Navigation Bar (2 Main Tabs) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCoverageMode("exon")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeCoverageMode === "exon"
                ? "bg-slate-900 text-sky-400 shadow-md ring-2 ring-sky-400/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4 text-sky-400" />
            <span>Gene / BED Region Coverage (Résolution Exonique)</span>
          </button>

          <button
            onClick={() => setActiveCoverageMode("gene")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeCoverageMode === "gene"
                ? "bg-slate-900 text-indigo-400 shadow-md ring-2 ring-indigo-400/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Dna className="h-4 w-4 text-indigo-400" />
            <span>Gene Region Coverage (Échelle Globale du Gène)</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>
            {activeCoverageMode === "exon"
              ? "Résolution fine : analyse individuelle exon par exon pour le gène sélectionné"
              : "Résolution synthétique : métriques agrégées à l'échelle du gène entier"}
          </span>
        </div>
      </div>

      {/* Drag & Drop File Importer */}
      <FileDropZone
        onBedParsed={handleBedParsed}
        onJsonParsed={handleJsonParsed}
        activeBedFileName={activeBedFileName}
        activeJsonFileName={activeJsonFileName}
        parsedBedStats={parsedBedStats}
        detectedAligners={detectedAligners}
        onResetToDefaults={handleResetToDefaults}
      />

      {activeCoverageMode === "gene" && (
        <div className="space-y-6">
          {/* Gene Scale Overview Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-800 shadow-md space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
                  <Dna className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-indigo-200">
                    Vue Synthétique à l'Échelle du Gène Entier ({filteredGeneLevelAggregates.length} Gènes du Panel)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Facilite l'interprétation en résumant chaque gène globalement, avec sélecteur dynamique par gène et métriques d'alignement.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={geneSearchQuery}
                    onChange={(e) => setGeneSearchQuery(e.target.value)}
                    placeholder="Filtrer un gène (ex: COL3A1)..."
                    className="bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Threshold Selector */}
                <select
                  value={depthThreshold}
                  onChange={(e) => setDepthThreshold(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-indigo-200 outline-none"
                >
                  <option value={20}>Seuil ≥ 20x (Standard WES)</option>
                  <option value={30}>Seuil ≥ 30x (ACMG Diagnostique)</option>
                  <option value={50}>Seuil ≥ 50x (Haute Sensibilité)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gene Selector Toolbar for Gene Region Coverage */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
                <Filter className="h-4 w-4 text-indigo-600" />
                <span>Sélecteur de Gène du Panel de Capture ({filteredGenes.length} gènes disponibles)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Sélection rapide :</span>
                <select
                  value={selectedGeneSymbol}
                  onChange={(e) => setSelectedGeneSymbol(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {activeProfiles.map((g) => (
                    <option key={g.geneSymbol} value={g.geneSymbol}>
                      {g.geneSymbol} — {g.fullName} ({g.totalExons} exons)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Gene Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50/80 rounded-lg border border-slate-200/80">
              {filteredGenes.map((g) => (
                <button
                  key={g.geneSymbol}
                  onClick={() => setSelectedGeneSymbol(g.geneSymbol)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center space-x-1 ${
                    selectedGeneSymbol === g.geneSymbol
                      ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                      : "bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200"
                  }`}
                >
                  <span>{g.geneSymbol}</span>
                  <span className="text-[10px] opacity-70">({g.totalExons}ex)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Focus Card for Currently Selected Gene */}
          {(() => {
            const selectedAgg = geneLevelAggregates.find((g) => g.geneSymbol === selectedGeneSymbol);
            if (!selectedAgg) return null;
            return (
              <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm bg-gradient-to-r from-indigo-50/40 via-white to-sky-50/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1 border-r border-indigo-100 pr-4 space-y-1">
                  <div className="flex items-center space-x-2 text-indigo-600">
                    <Trophy className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Gène Actif : {selectedAgg.geneSymbol}
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">{selectedAgg.fullName}</div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>
                      Coordonnées : <strong className="font-mono text-slate-800">{selectedAgg.chr} ({selectedAgg.strand})</strong>
                    </div>
                    <div>
                      Taille & Exons : <strong>{selectedAgg.totalLengthBp.toLocaleString()} bp</strong> ({selectedAgg.totalExons} exons) | GC: <strong>{selectedAgg.meanGcPct}%</strong>
                    </div>
                    <div>
                      Meilleur Aligneur : <strong className="text-indigo-700 font-bold">{selectedAgg.winningAligner}</strong>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setParsedCustomExons(null);
                        setActiveCoverageMode("exon");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center space-x-1.5"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Examiner Exons de {selectedAgg.geneSymbol} 🔍</span>
                    </button>
                  </div>
                </div>

                {/* DRAGEN Metrics */}
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                  <div className="font-bold text-sky-900 flex items-center justify-between">
                    <span>DRAGEN v4.0</span>
                    <span className="bg-sky-200 text-sky-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                      {selectedAgg.dragenDepth}x moy
                    </span>
                  </div>
                  <div className="text-slate-700 font-semibold">
                    Couverture ≥ {depthThreshold}x : <span className="text-sky-700 font-bold">{selectedAgg.dragenPassPct}%</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Accélération matérielle & réalignement GPU
                  </div>
                </div>

                {/* NextGENe Metrics */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center justify-between">
                    <span>NextGENe v2.4</span>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                      {selectedAgg.nextgeneDepth}x moy
                    </span>
                  </div>
                  <div className="text-slate-700 font-semibold">
                    Couverture ≥ {depthThreshold}x : <span className={`font-bold ${selectedAgg.nextgenePassPct < 85 ? "text-rose-600" : "text-emerald-700"}`}>{selectedAgg.nextgenePassPct}%</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    K-mer matching (Chute de couverture sur GC%)
                  </div>
                </div>

                {/* BWA Metrics */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center justify-between">
                    <span>BWA-MEM + Markdup</span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                      {selectedAgg.bwaDepth}x moy
                    </span>
                  </div>
                  <div className="text-slate-700 font-semibold">
                    Couverture ≥ {depthThreshold}x : <span className="text-amber-800 font-bold">{selectedAgg.bwaPassPct}%</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Standard GATK (Perte modérée sur GC-rich)
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Gene-Level Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Mean Whole-Gene Depth */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                  <Dna className="h-4 w-4 text-indigo-600" />
                  <span>Profondeur Moyenne du Gène Entier (Depth in X)</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Moyenne globale par gène
                </span>
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredGeneLevelAggregates} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="geneSymbol"
                      tick={{ fontSize: 10, fill: "#334155", fontWeight: "bold" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                      labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                      itemStyle={{ fontSize: "11px", color: "#e2e8f0" }}
                      formatter={(val: any) => [`${val} x`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "30x Target", fill: "#ef4444", fontSize: 10 }} />
                    <Bar dataKey="dragenDepth" name="DRAGEN v4.0" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bwaDepth" name="BWA-MEM + Markdup" fill="#d97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="nextgeneDepth" name="NextGENe" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Whole-Gene Percentage Coverage >= Threshold */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>% du Gène Entier Couvert (≥ {depthThreshold}x)</span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Seuil Clinique {depthThreshold}X
                </span>
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredGeneLevelAggregates} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="geneSymbol"
                      tick={{ fontSize: 10, fill: "#334155", fontWeight: "bold" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                      labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                      itemStyle={{ fontSize: "11px", color: "#e2e8f0" }}
                      formatter={(val: any) => [`${val}%`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <ReferenceLine y={98} stroke="#10b981" strokeDasharray="3 3" label={{ value: "98% Target", fill: "#10b981", fontSize: 10 }} />
                    <Bar dataKey="dragenPassPct" name="DRAGEN v4.0" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bwaPassPct" name="BWA-MEM + Markdup" fill="#d97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="nextgenePassPct" name="NextGENe" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Whole-Gene Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
                <Dna className="h-4 w-4 text-indigo-400" />
                <span>
                  Tableau de Couverture à l'Échelle du Gène Entier ({filteredGeneLevelAggregates.length} Gènes)
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Seuil actif : <strong className="text-emerald-400">≥ {depthThreshold}x</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Gène & Nom</th>
                    <th className="py-2.5 px-3">Chr / Brin</th>
                    <th className="py-2.5 px-3 text-center">Exons</th>
                    <th className="py-2.5 px-3 font-mono">Taille Total</th>
                    <th className="py-2.5 px-3">% GC Moy.</th>
                    <th className="py-2.5 px-3 text-sky-800 bg-sky-50/70">DRAGEN Moy.</th>
                    <th className="py-2.5 px-3 text-sky-800 bg-sky-50/70">DRAGEN ≥ {depthThreshold}x</th>
                    <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/70">NextGENe Moy.</th>
                    <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/70">NextGENe ≥ {depthThreshold}x</th>
                    <th className="py-2.5 px-3 text-amber-800 bg-amber-50/70">BWA-MEM Moy.</th>
                    <th className="py-2.5 px-3 text-amber-800 bg-amber-50/70">BWA-MEM ≥ {depthThreshold}x</th>
                    <th className="py-2.5 px-3">Gagnant</th>
                    <th className="py-2.5 px-3 text-center">Action Exons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredGeneLevelAggregates.map((g) => (
                    <tr key={g.geneSymbol} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        <div className="text-slate-900 font-extrabold text-xs">{g.geneSymbol}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{g.fullName}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                        {g.chr} ({g.strand})
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{g.totalExons}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{g.totalLengthBp.toLocaleString()} bp</td>
                      <td className="py-2.5 px-3 font-medium">
                        <span className={g.meanGcPct >= 60 ? "text-rose-600 font-bold" : "text-slate-700"}>
                          {g.meanGcPct}%
                        </span>
                      </td>
                      {/* DRAGEN */}
                      <td className="py-2.5 px-3 font-bold text-sky-700 bg-sky-50/30">{g.dragenDepth}x</td>
                      <td className="py-2.5 px-3 font-semibold text-sky-800 bg-sky-50/30">{g.dragenPassPct}%</td>
                      {/* NextGENe */}
                      <td className="py-2.5 px-3 font-bold text-emerald-700 bg-emerald-50/30">{g.nextgeneDepth}x</td>
                      <td className={`py-2.5 px-3 font-semibold bg-emerald-50/30 ${g.nextgenePassPct < 85 ? "text-rose-600 font-bold" : "text-emerald-800"}`}>
                        {g.nextgenePassPct}%
                      </td>
                      {/* BWA */}
                      <td className="py-2.5 px-3 font-bold text-amber-700 bg-amber-50/30">{g.bwaDepth}x</td>
                      <td className="py-2.5 px-3 font-semibold text-amber-800 bg-amber-50/30">{g.bwaPassPct}%</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">{g.winningAligner}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedGeneSymbol(g.geneSymbol);
                            setParsedCustomExons(null);
                            setActiveCoverageMode("exon");
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all shadow-2xs"
                        >
                          Exons 🔍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeCoverageMode === "exon" && (
        <div className="space-y-6">
          {/* Pedagogical Header Explanation Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800/50 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-indigo-200">
              Analyse de Couverture par Position & Exon — Panel de Capture Diagnostic ({activeProfiles.length} Gènes)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Prise en compte des spécificités génomiques : orientation du brin (Brin + vs Brin -), numérotation biologique des exons (5' → 3'), et sensibilité aux régions riches en GC.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          {/* Item 1 */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="font-bold text-sky-300 flex items-center space-x-2">
              <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-[10px] font-mono">1</span>
              <span>Orientation du Brin (Strand +/-) & Numérotation Exonique</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Dans un fichier BED, les positions sont ordonnées par coordonnées génomiques croissantes. Pour les gènes sur le <strong className="text-sky-300">brin moins (-)</strong> (ex: <em>COL3A1</em>, <em>FBN1</em>, <em>COL1A1</em>, <em>FLNA</em>), l'Exon 1 (5' UTR / Promoteur) se trouve à la coordonnée la plus élevée. Notre analyse inverse automatiquement la numérotation pour respecter l'ordre biologique de transcription.
            </p>
          </div>

          {/* Item 2 */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="font-bold text-emerald-300 flex items-center space-x-2">
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-mono">2</span>
              <span>Origine des Données (BED Réel vs Profondeurs Modélisées)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-emerald-300">Coordonnées BED & Intervalles : 100% Réels</strong> (extraits directement de votre fichier de capture).<br />
              <strong className="text-amber-300">Métriques de Profondeur : Profils Modélisés</strong> (simulations réalistes basées sur la réponse aux GC% et au soft-clipping). Vous pouvez importer vos sorties réelles <code>mosdepth</code> ci-dessous pour afficher les mesures réelles de vos BAMs.
            </p>
          </div>
        </div>
      </div>

      {/* Gene Search & Selection Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-sky-600" />
              <span>Sélecteur de Gène du Panel de Capture ({filteredGenes.length} gènes disponibles)</span>
            </h3>
            <div className="text-xs text-slate-500">
              Gène actif : <strong className="text-sky-700 font-bold">{currentProfile.geneSymbol}</strong> ({currentProfile.fullName}) — {currentProfile.diseaseAssociation}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Display Order Toggle */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setDisplayOrder("biological")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  displayOrder === "biological" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Ordre biologique de transcription 5' vers 3'"
              >
                Ordre Biologique (5' → 3')
              </button>
              <button
                onClick={() => setDisplayOrder("genomic")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  displayOrder === "genomic" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Ordre par coordonnées génomiques (Start croissant)"
              >
                Ordre Génomique (Chr:Start)
              </button>
            </div>

            {/* Depth Threshold Selector */}
            <select
              value={depthThreshold}
              onChange={(e) => setDepthThreshold(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value={20}>Seuil ≥ 20x (Standard WES)</option>
              <option value={30}>Seuil ≥ 30x (ACMG Diagnostique)</option>
              <option value={50}>Seuil ≥ 50x (Haute Sensibilité)</option>
            </select>
          </div>
        </div>

        {/* Quick Search & Filter Bar for Panel Genes */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={geneSearchQuery}
              onChange={(e) => setGeneSearchQuery(e.target.value)}
              placeholder="Rechercher un gène (ex: COL3A1, FBN1, COL1A1, FLNA, TGFB2, NOTCH1, Marfan, EDS)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>

          {/* Gene Chips */}
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50/80 rounded-lg border border-slate-200/80">
            {filteredGenes.map((g) => (
              <button
                key={g.geneSymbol}
                onClick={() => {
                  setSelectedGeneSymbol(g.geneSymbol);
                  setParsedCustomExons(null);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center space-x-1 ${
                  selectedGeneSymbol === g.geneSymbol && !parsedCustomExons
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <span>{g.geneSymbol}</span>
                <span className="text-[10px] opacity-70">({g.totalExons}ex)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Direct JSON Import (bench_coverage_metrics.json) */}
        <div className="bg-sky-50/80 p-3.5 rounded-xl border border-sky-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-sky-950">
            <span className="flex items-center space-x-1.5">
              <FileJson className="h-4 w-4 text-sky-600" />
              <span>Charger votre fichier JSON mosdepth réel (<code className="font-mono bg-sky-100 px-1 py-0.5 rounded text-sky-900">bench_coverage_metrics.json</code>) :</span>
            </span>
            {uploadedJsonMessage && (
              <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                {uploadedJsonMessage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all shadow-sm flex items-center space-x-2">
              <Upload className="h-3.5 w-3.5" />
              <span>Importer bench_coverage_metrics.json</span>
              <input type="file" accept=".json" onChange={handleJsonFileUpload} className="hidden" />
            </label>
            <span className="text-[11px] text-slate-500 italic">
              (Généré par <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">parse_mosdepth.py</code> sur le serveur HPC. Si copié dans le dossier <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">public/</code>, il est chargé automatiquement !)
            </span>
          </div>
        </div>

        {/* Custom BED Collapsible Area */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center space-x-1.5">
              <Upload className="h-4 w-4 text-indigo-600" />
              <span>Coller votre propre fichier BED pour évaluer d'autres positions :</span>
            </span>
            {parsedCustomExons && (
              <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                BED Personnalisé Chargé ({parsedCustomExons.length} intervalles)
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <textarea
              rows={2}
              value={customBedText}
              onChange={(e) => setCustomBedText(e.target.value)}
              placeholder="chr2&#9;188974462&#9;188974584&#9;COL3A1&#010;chr2&#9;188984735&#9;188984978&#9;COL3A1"
              className="flex-1 bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleParseBed}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-sm"
              >
                Analyse BED
              </button>
              {parsedCustomExons && (
                <button
                  onClick={() => {
                    setParsedCustomExons(null);
                    setCustomBedText("");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg transition-colors shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          {customBedError && <div className="text-xs text-rose-600 font-semibold">{customBedError}</div>}
        </div>
      </div>

      {/* Gene Profile Overview Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Gene Card Summary */}
        <div className="md:col-span-1 border-r border-slate-100 pr-4 space-y-1">
          <div className="flex items-center space-x-2 text-amber-500">
            <Trophy className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Aligneur Gagnant sur {currentProfile.geneSymbol}
            </span>
          </div>
          <div className="text-lg font-extrabold text-slate-900">{topAligner}</div>
          <div className="text-xs text-slate-600 space-y-0.5">
            <div>
              Chr: <strong className="font-mono text-slate-800">{currentProfile.chr}</strong> | Brin :{" "}
              <strong className="text-indigo-600">{currentProfile.strand}</strong>
            </div>
            <div>
              Taille Totale : <strong>{currentProfile.totalLengthBp.toLocaleString()} bp</strong> ({activeExons.length} exons)
            </div>
          </div>
        </div>

        {/* DRAGEN Box */}
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
          <div className="font-bold text-sky-900 flex items-center justify-between">
            <span>DRAGEN v4.0</span>
            <span className="bg-sky-200 text-sky-900 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {dragenMeanDepth.toFixed(1)}x moy
            </span>
          </div>
          <div className="text-slate-700 font-semibold">
            Couverture ≥ {depthThreshold}x : <span className="text-sky-700 font-bold">{dragenPctPass.toFixed(1)}%</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Réalignement matériel GPU : <span className="font-bold text-emerald-700">99.8% couverture</span>
          </div>
        </div>

        {/* NextGENe Box */}
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
          <div className="font-bold text-emerald-900 flex items-center justify-between">
            <span>NextGENe v2.4</span>
            <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {nextgeneMeanDepth.toFixed(1)}x moy
            </span>
          </div>
          <div className="text-slate-700 font-semibold">
            Couverture ≥ {depthThreshold}x : <span className="text-emerald-700 font-bold">{nextgenePctPass.toFixed(1)}%</span>
          </div>
          <div className="text-[11px] text-slate-500">
            K-mer hashing : <span className="font-bold text-rose-600">Sensible aux régions GC</span>
          </div>
        </div>

        {/* BWA Box */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
          <div className="font-bold text-amber-900 flex items-center justify-between">
            <span>BWA-MEM + Markdup</span>
            <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {bwaMeanDepth.toFixed(1)}x moy
            </span>
          </div>
          <div className="text-slate-700 font-semibold">
            Couverture ≥ {depthThreshold}x : <span className="text-amber-800 font-bold">{bwaPctPass.toFixed(1)}%</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Standard GATK : <span className="font-bold text-amber-700">Régulier, perte modérée GC</span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Depth per Exon Interval */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
              <Dna className="h-4 w-4 text-sky-600" />
              <span>Profondeur de Couverture par Intervalle BED (Depth in X)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {currentProfile.geneSymbol} ({displayOrder === "biological" ? "Ordre 5'→3'" : "Ordre Génomique"})
            </span>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={activeExons} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="exonId"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                  itemStyle={{ fontSize: "11px", color: "#e2e8f0" }}
                  formatter={(val: any) => [`${val} x`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "30x Min Target", fill: "#ef4444", fontSize: 10 }} />
                <Bar dataKey="dragenDepth" name="DRAGEN v4.0" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bwaDepth" name="BWA-MEM + Markdup" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nextgeneDepth" name="NextGENe" fill="#059669" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Percentage Target Coverage >= Threshold */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Pourcentage de Bases Couvertes (≥ {depthThreshold}x)</span>
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Seuil Clinique {depthThreshold}X
            </span>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeExons.map((e) => ({
                  exonId: e.exonId,
                  DRAGEN: getPctCovered(e, "dragen"),
                  NextGENe: getPctCovered(e, "nextgene"),
                  BWA: getPctCovered(e, "bwa"),
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="exonId" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-30} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                  itemStyle={{ fontSize: "11px", color: "#e2e8f0" }}
                  formatter={(val: any) => [`${val}%`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                <ReferenceLine y={98} stroke="#10b981" strokeDasharray="3 3" label={{ value: "98% Target", fill: "#10b981", fontSize: 10 }} />
                <Bar dataKey="DRAGEN" name="DRAGEN v4.0" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="BWA" name="BWA-MEM + Markdup" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NextGENe" name="NextGENe" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Exon Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <span>
              Tableau des Intervalles BED du Gène {currentProfile.geneSymbol} ({activeExons.length} Exons)
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {currentProfile.chr} (Brin {currentProfile.strand})
            </span>
            <button
              onClick={handleExportCSV}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exporter CSV ({currentProfile.geneSymbol})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Exon / Région</th>
                <th className="py-2.5 px-3 font-mono">Coordonnées BED (Chr:Start-End)</th>
                <th className="py-2.5 px-3">Taille (bp)</th>
                <th className="py-2.5 px-3">% GC</th>
                <th className="py-2.5 px-3 text-sky-800 bg-sky-50/70">DRAGEN Moy.</th>
                <th className="py-2.5 px-3 text-sky-800 bg-sky-50/70">DRAGEN Perte (20% VAF)</th>
                <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/70">NextGENe Moy.</th>
                <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/70">NextGENe Perte (20% VAF)</th>
                <th className="py-2.5 px-3 text-amber-800 bg-amber-50/70">BWA-MEM Moy.</th>
                <th className="py-2.5 px-3 text-amber-800 bg-amber-50/70">BWA Perte (20% VAF)</th>
                <th className="py-2.5 px-3">Remarques Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeExons.map((exon, idx) => {
                const dragenLoss = (calculateVariantDetectionProb(exon.dragenDepth, 0.20, 3).pLoss * 100).toFixed(2);
                const nextgeneLossNum = calculateVariantDetectionProb(exon.nextgeneDepth, 0.20, 3).pLoss * 100;
                const nextgeneLoss = nextgeneLossNum.toFixed(2);
                const bwaLoss = (calculateVariantDetectionProb(exon.bwaDepth, 0.20, 3).pLoss * 100).toFixed(2);

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                      <span>{exon.exonId}</span>
                      {exon.isGcRich && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-medium border border-amber-300">
                          High-GC
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {exon.chr}:{exon.start.toLocaleString()}-{exon.end.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{exon.lengthBp} bp</td>
                    <td className="py-2.5 px-3 font-medium">
                      <span className={exon.gcContentPct >= 65 ? "text-rose-600 font-bold" : "text-slate-700"}>
                        {exon.gcContentPct}%
                      </span>
                    </td>
                    {/* DRAGEN */}
                    <td className="py-2.5 px-3 font-bold text-sky-700 bg-sky-50/30">{exon.dragenDepth}x</td>
                    <td className="py-2.5 px-3 font-semibold text-sky-800 bg-sky-50/30">
                      {parseFloat(dragenLoss) < 0.01 ? "< 0.01%" : `${dragenLoss}%`}
                    </td>
                    {/* NextGENe */}
                    <td className="py-2.5 px-3 font-bold text-emerald-700 bg-emerald-50/30">{exon.nextgeneDepth}x</td>
                    <td className={`py-2.5 px-3 font-semibold bg-emerald-50/30 ${nextgeneLossNum > 1.0 ? "text-rose-600 font-bold" : "text-emerald-800"}`}>
                      {parseFloat(nextgeneLoss) < 0.01 ? "< 0.01%" : `${nextgeneLoss}%`}
                    </td>
                    {/* BWA */}
                    <td className="py-2.5 px-3 font-bold text-amber-700 bg-amber-50/30">{exon.bwaDepth}x</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-800 bg-amber-50/30">
                      {parseFloat(bwaLoss) < 0.01 ? "< 0.01%" : `${bwaLoss}%`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{exon.notes || "Standard exon coverage"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cluster Code Snippets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bash Pipeline Box */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Terminal className="h-4 w-4" />
              <span className="font-bold text-xs">1. Execution Mosdepth (Bash)</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sampleMosdepthBash);
                setCopiedBash(true);
                setTimeout(() => setCopiedBash(false), 2000);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded font-semibold border border-slate-700 flex items-center space-x-1"
            >
              {copiedBash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedBash ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed select-all max-h-52">
            <code>{sampleMosdepthBash}</code>
          </pre>
        </div>

        {/* Python Exporter Box */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-amber-400">
              <Code className="h-4 w-4" />
              <span className="font-bold text-xs">2. Convertisseur JSON (Python)</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(samplePythonParser);
                setCopiedPy(true);
                setTimeout(() => setCopiedPy(false), 2000);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded font-semibold border border-slate-700 flex items-center space-x-1"
            >
              {copiedPy ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedPy ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-950 text-amber-300 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed select-all max-h-52">
            <code>{samplePythonParser}</code>
          </pre>
        </div>

        {/* R Plotting Box */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-sky-400">
              <Code className="h-4 w-4" />
              <span className="font-bold text-xs">3. Figure R ggplot2 (Article/Poster)</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sampleRCode);
                setCopiedR(true);
                setTimeout(() => setCopiedR(false), 2000);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded font-semibold border border-slate-700 flex items-center space-x-1"
            >
              {copiedR ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedR ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-950 text-sky-300 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed select-all max-h-52">
            <code>{sampleRCode}</code>
          </pre>
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
