import { GeneCoverageProfile, ExonCoverage } from "../data/geneCoverageData";
import { KNOWN_GENE_STRANDS, GENE_DISEASE_DESCRIPTIONS } from "../data/captureBedData";

export interface ParsedBedResult {
  profiles: GeneCoverageProfile[];
  allExons: ExonCoverage[];
  totalGenes: number;
  totalRegions: number;
  totalBp: number;
}

/**
 * Parses a standard UCSC BED file (chr \t start \t end [\t geneSymbol/regionId])
 * into dynamic GeneCoverageProfile and ExonCoverage structures.
 */
export function parseBedFileText(bedText: string): ParsedBedResult {
  const lines = bedText.trim().split("\n");
  const geneExonsMap: Record<string, { chr: string; start: number; end: number; geneSymbol: string; lineIdx: number }[]> = {};
  let totalRegions = 0;
  let totalBp = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("track") || trimmed.startsWith("browser")) {
      return;
    }

    const parts = trimmed.split(/[\t\s]+/);
    if (parts.length >= 3) {
      const chr = parts[0];
      const start = parseInt(parts[1], 10);
      const end = parseInt(parts[2], 10);

      if (isNaN(start) || isNaN(end) || end <= start) return;

      const geneSymbol = (parts[3] || `Region_${idx + 1}`).trim().toUpperCase();
      const len = end - start;

      totalRegions++;
      totalBp += len;

      if (!geneExonsMap[geneSymbol]) {
        geneExonsMap[geneSymbol] = [];
      }

      geneExonsMap[geneSymbol].push({
        chr,
        start,
        end,
        geneSymbol,
        lineIdx: idx,
      });
    }
  });

  const profiles: GeneCoverageProfile[] = [];
  const allExons: ExonCoverage[] = [];

  Object.entries(geneExonsMap).forEach(([symbol, rawExons]) => {
    const chr = rawExons[0].chr;
    const strand = KNOWN_GENE_STRANDS[symbol] || "-";

    // Sort raw exons by start position
    const sortedExons = [...rawExons].sort((a, b) => a.start - b.start);

    // Calculate biological exon numbering based on strand
    const totalExonsInGene = sortedExons.length;

    const exons: ExonCoverage[] = sortedExons.map((raw, idx) => {
      // If minus strand, Exon 1 is at highest genomic position (reverse order)
      const exonNum = strand === "-" ? totalExonsInGene - idx : idx + 1;
      const len = raw.end - raw.start;

      // Estimate GC content based on region properties or pseudo-random hash
      const gcContent = Math.round((42 + (Math.abs(Math.sin(raw.start * 13)) * 32)) * 10) / 10;
      const isGcRich = gcContent > 60;

      // Default baseline depths with GC bias response
      const baseDepth = 125 + Math.floor(Math.sin(raw.start) * 30);
      const dragenD = Math.round((isGcRich ? baseDepth * 0.94 : baseDepth) * 10) / 10;
      const nextgeneD = Math.round((isGcRich ? baseDepth * 0.58 : baseDepth * 0.88) * 10) / 10;
      const bwaD = Math.round((isGcRich ? baseDepth * 0.81 : baseDepth * 0.95) * 10) / 10;

      const exonObj: ExonCoverage = {
        exonId: `Exon ${exonNum} (${symbol})`,
        exonNumber: exonNum,
        chr: raw.chr,
        start: raw.start,
        end: raw.end,
        lengthBp: len,
        gcContentPct: gcContent,
        dragenDepth: dragenD,
        nextgeneDepth: nextgeneD,
        bwaDepth: bwaD,
        dragen20xPct: isGcRich ? 98.5 : 100.0,
        nextgene20xPct: isGcRich ? 74.5 : 97.8,
        bwa20xPct: isGcRich ? 88.0 : 99.4,
        dragen30xPct: isGcRich ? 96.8 : 99.7,
        nextgene30xPct: isGcRich ? 61.2 : 95.5,
        bwa30xPct: isGcRich ? 81.0 : 98.6,
        dragen50xPct: isGcRich ? 91.5 : 98.2,
        nextgene50xPct: isGcRich ? 42.0 : 87.5,
        bwa50xPct: isGcRich ? 70.5 : 93.8,
        isGcRich,
        notes: isGcRich ? "Région riche en GC (>60%). Drop-off NextGENe modélisé." : undefined,
      };

      allExons.push(exonObj);
      return exonObj;
    });

    const totalGeneBp = exons.reduce((acc, e) => acc + e.lengthBp, 0);
    const diseaseAssoc = GENE_DISEASE_DESCRIPTIONS[symbol] || "Custom Target BED Region";

    profiles.push({
      geneSymbol: symbol,
      fullName: `${symbol} Target Gene`,
      diseaseAssociation: diseaseAssoc,
      chr,
      strand,
      totalExons: totalExonsInGene,
      totalLengthBp: totalGeneBp,
      exons,
    });
  });

  return {
    profiles,
    allExons,
    totalGenes: profiles.length,
    totalRegions,
    totalBp,
  };
}
