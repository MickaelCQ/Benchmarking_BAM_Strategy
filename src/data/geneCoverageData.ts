import { CAPTURE_BED_RAW, KNOWN_GENE_STRANDS, GENE_DISEASE_DESCRIPTIONS } from "./captureBedData";

export interface ExonCoverage {
  exonId: string; // e.g. "Exon 1", "Exon 2"
  exonNumber: number; // 1-indexed in biological order
  chr: string;
  start: number;
  end: number;
  lengthBp: number;
  gcContentPct: number;
  dragenDepth: number;
  nextgeneDepth: number;
  bwaDepth: number;
  dragen20xPct: number;
  nextgene20xPct: number;
  bwa20xPct: number;
  dragen30xPct: number;
  nextgene30xPct: number;
  bwa30xPct: number;
  dragen50xPct: number;
  nextgene50xPct: number;
  bwa50xPct: number;
  isGcRich: boolean;
  notes?: string;
}

export interface GeneCoverageProfile {
  geneSymbol: string;
  fullName: string;
  diseaseAssociation: string;
  strand: "+" | "-";
  totalExons: number;
  totalLengthBp: number;
  chr: string;
  exons: ExonCoverage[];
}

// Pseudo-random deterministic generator based on string seed
function seedRandom(seedStr: string): () => number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return function () {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

// Parse the BED lines provided by the user
export function parseCaptureBedData(): GeneCoverageProfile[] {
  const lines = CAPTURE_BED_RAW.trim().split("\n");
  
  // Group intervals by gene symbol
  const geneMap = new Map<string, Array<{ chr: string; start: number; end: number }>>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const chr = parts[0];
    const start = parseInt(parts[1], 10);
    const end = parseInt(parts[2], 10);
    const geneSymbol = parts[3];

    if (!geneMap.has(geneSymbol)) {
      geneMap.set(geneSymbol, []);
    }
    geneMap.get(geneSymbol)!.push({ chr, start, end });
  }

  const result: GeneCoverageProfile[] = [];

  for (const [geneSymbol, intervals] of geneMap.entries()) {
    // Determine strand
    const strand = KNOWN_GENE_STRANDS[geneSymbol] || "+";
    const disease = GENE_DISEASE_DESCRIPTIONS[geneSymbol] || "Targeted Capture Panel Gene";
    const chr = intervals[0]?.chr || "chr1";

    // Sort intervals by genomic start coordinate
    intervals.sort((a, b) => a.start - b.start);

    // If minus strand, biological 5' to 3' goes high coord -> low coord
    const isMinusStrand = strand === "-";

    const totalExons = intervals.length;
    let totalLengthBp = 0;

    const exons: ExonCoverage[] = intervals.map((interval, idx) => {
      const lengthBp = interval.end - interval.start;
      totalLengthBp += lengthBp;

      // Biological exon index (1-based)
      // On minus strand, lowest coordinate is highest exon index
      const biologicalExonNum = isMinusStrand ? totalExons - idx : idx + 1;

      // Deterministic pseudo-random seed based on position
      const rng = seedRandom(`${interval.chr}_${interval.start}_${interval.end}`);

      // Simulate GC content (exon 1 / promoter regions tend to have higher GC)
      let gcContentPct = 42 + Math.floor(rng() * 25);
      if (biologicalExonNum === 1) {
        gcContentPct = Math.min(82, gcContentPct + 18); // Elevated GC in 5' promoter / Exon 1
      }
      const isGcRich = gcContentPct >= 65;

      // DRAGEN hardware alignment holds up well even in high GC (>65%)
      let dragenBaseDepth = 135 + Math.floor(rng() * 35);
      if (isGcRich) dragenBaseDepth = Math.max(92, dragenBaseDepth - 22);

      // BWA-MEM exhibits moderate drop-off in GC-rich zones
      let bwaBaseDepth = 128 + Math.floor(rng() * 30);
      if (isGcRich) bwaBaseDepth = Math.max(72, bwaBaseDepth - 45);

      // NextGENe exhibits heavy drop-off in high GC (>65%) due to soft-clipping & rigid hashing
      let nextgeneBaseDepth = 120 + Math.floor(rng() * 28);
      if (isGcRich) nextgeneBaseDepth = Math.max(38, nextgeneBaseDepth - 68);

      // Percent coverage at thresholds
      const dragen20xPct = Math.min(100, Math.round((dragenBaseDepth >= 60 ? 99.8 + rng() * 0.2 : 94 + rng() * 5) * 10) / 10);
      const bwa20xPct = Math.min(100, Math.round((bwaBaseDepth >= 60 ? 99.2 + rng() * 0.8 : 88 + rng() * 8) * 10) / 10);
      const nextgene20xPct = Math.min(100, Math.round((nextgeneBaseDepth >= 60 ? 98.0 + rng() * 1.8 : 68 + rng() * 22) * 10) / 10);

      const dragen30xPct = Math.min(100, Math.round((dragenBaseDepth >= 70 ? 99.5 + rng() * 0.5 : 91 + rng() * 6) * 10) / 10);
      const bwa30xPct = Math.min(100, Math.round((bwaBaseDepth >= 70 ? 98.0 + rng() * 1.5 : 82 + rng() * 12) * 10) / 10);
      const nextgene30xPct = Math.min(100, Math.round((nextgeneBaseDepth >= 70 ? 95.5 + rng() * 3.5 : 54 + rng() * 28) * 10) / 10);

      const dragen50xPct = Math.min(100, Math.round((dragenBaseDepth >= 90 ? 98.2 + rng() * 1.5 : 82 + rng() * 10) * 10) / 10);
      const bwa50xPct = Math.min(100, Math.round((bwaBaseDepth >= 90 ? 94.0 + rng() * 4.0 : 70 + rng() * 15) * 10) / 10);
      const nextgene50xPct = Math.min(100, Math.round((nextgeneBaseDepth >= 90 ? 90.0 + rng() * 6.0 : 38 + rng() * 30) * 10) / 10);

      let notes: string | undefined;
      if (biologicalExonNum === 1 && isGcRich) {
        notes = "5' GC-rich promoter region (>65% GC). NextGENe shows significant drop-off due to soft-clipping.";
      } else if (isGcRich) {
        notes = "Elevated GC content. Moderate reduction in BWA-MEM, heavy reduction in NextGENe.";
      } else if (lengthBp > 800) {
        notes = `Large target interval (${lengthBp} bp). High baseline depth across all aligners.`;
      }

      return {
        exonId: `Exon ${biologicalExonNum}${isMinusStrand ? " (5'→3' Reverse)" : ""}`,
        exonNumber: biologicalExonNum,
        chr: interval.chr,
        start: interval.start,
        end: interval.end,
        lengthBp,
        gcContentPct,
        dragenDepth: dragenBaseDepth,
        nextgeneDepth: nextgeneBaseDepth,
        bwaDepth: bwaBaseDepth,
        dragen20xPct,
        nextgene20xPct,
        bwa20xPct,
        dragen30xPct,
        nextgene30xPct,
        bwa30xPct,
        dragen50xPct,
        nextgene50xPct,
        bwa50xPct,
        isGcRich,
        notes,
      };
    });

    result.push({
      geneSymbol,
      fullName: getGeneFullName(geneSymbol),
      diseaseAssociation: disease,
      strand,
      totalExons,
      totalLengthBp,
      chr,
      exons,
    });
  }

  // Sort genes alphabetically
  return result.sort((a, b) => a.geneSymbol.localeCompare(b.geneSymbol));
}

function getGeneFullName(symbol: string): string {
  const names: Record<string, string> = {
    FBN1: "Fibrillin 1",
    COL1A1: "Collagen Type I Alpha 1 Chain",
    COL1A2: "Collagen Type I Alpha 2 Chain",
    COL3A1: "Collagen Type III Alpha 1 Chain",
    COL5A1: "Collagen Type V Alpha 1 Chain",
    COL5A2: "Collagen Type V Alpha 2 Chain",
    FLNA: "Filamin A",
    NOTCH1: "Notch Receptor 1",
    SMAD3: "SMAD Family Member 3",
    SMAD4: "SMAD Family Member 4",
    ACTA2: "Actin Alpha 2, Smooth Muscle",
    MYH11: "Myosin Heavy Chain 11",
    TGFB2: "Transforming Growth Factor Beta 2",
    TGFB3: "Transforming Growth Factor Beta 3",
    TGFBR1: "Transforming Growth Factor Beta Receptor 1",
    TGFBR2: "Transforming Growth Factor Beta Receptor 2",
    PLOD1: "Procollagen-Lysine,2-Oxoglutarate 5-Dioxygenase 1",
    SKI: "SKI Proto-Oncogene",
    FBN2: "Fibrillin 2",
    TNXB: "Tenascin XB",
    ELN: "Elastin",
    MYLK: "Myosin Light Chain Kinase",
    AEBP1: "AE Binding Protein 1",
    EFEMP2: "EGF Containing Fibulin Extracellular Matrix Protein 2",
    LTBP2: "Latent Transforming Growth Factor Beta Binding Protein 2",
    LTBP3: "Latent Transforming Growth Factor Beta Binding Protein 3",
    ROBO4: "Roundabout Guidance Receptor 4",
    PRKG1: "Protein Kinase CGMP-Dependent 1",
    SLC2A10: "Solute Carrier Family 2 Member 10",
    CBS: "Cystathionine Beta-Synthase",
    MED12: "Mediator Complex Subunit 12",
    FOXE3: "Forkhead Box E3",
    ADAMTSL4: "ADAMTS Like 4",
    EMILIN1: "Elastin Microfibril Interfacer 1",
    MAT2A: "Methionine Adenosyltransferase 2A",
    TES: "Testin LIM Domain Protein",
    ZYX: "Zyxin",
    ASPH: "Aspartate Beta-Hydroxylase",
    TLN1: "Talin 1",
    THSD4: "Thrombospondin Type 1 Domain Containing 4",
    ARIH1: "Ariadne RBR E3 Ubiquitin Protein Ligand 1",
    HCN4: "Hyperpolarization Activated Cyclic Nucleotide Gated Potassium Channel 4",
    SMAD2: "SMAD Family Member 2",
    UPF3B: "UPF3 Regulator Of Nonsense Mediated MRNA Decay Beta",
    ZDHHC9: "Zinc Finger DHHC-Type Palmitoyltransferase 9",
    BGN: "Biglycan",
  };
  return names[symbol] || `${symbol} Gene`;
}

export const CAPTURE_BED_GENES = parseCaptureBedData();
