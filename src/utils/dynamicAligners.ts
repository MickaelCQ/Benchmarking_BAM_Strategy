export interface DynamicAlignerMeta {
  id: string;
  name: string;
  keyPrefix: string; // e.g. "dragen", "nextgene", "bwa", "bowtie2"
  color: string;
  bgLight: string;
  borderLight: string;
  textColor: string;
}

const COLOR_PALETTE = [
  { color: "#0284c7", bgLight: "bg-sky-50", borderLight: "border-sky-200", textColor: "text-sky-800" }, // Sky Blue
  { color: "#059669", bgLight: "bg-emerald-50", borderLight: "border-emerald-200", textColor: "text-emerald-800" }, // Emerald
  { color: "#d97706", bgLight: "bg-amber-50", borderLight: "border-amber-200", textColor: "text-amber-800" }, // Amber
  { color: "#8b5cf6", bgLight: "bg-purple-50", borderLight: "border-purple-200", textColor: "text-purple-800" }, // Purple
  { color: "#f43f5e", bgLight: "bg-rose-50", borderLight: "border-rose-200", textColor: "text-rose-800" }, // Rose
  { color: "#0d9488", bgLight: "bg-teal-50", borderLight: "border-teal-200", textColor: "text-teal-800" }, // Teal
  { color: "#6366f1", bgLight: "bg-indigo-50", borderLight: "border-indigo-200", textColor: "text-indigo-800" }, // Indigo
  { color: "#ea580c", bgLight: "bg-orange-50", borderLight: "border-orange-200", textColor: "text-orange-800" }, // Orange
  { color: "#65a30d", bgLight: "bg-lime-50", borderLight: "border-lime-200", textColor: "text-lime-800" }, // Lime
];

/**
 * Detects all aligners present in an uploaded JSON dataset or raw records array.
 * Looks for keys ending with 'Depth' (e.g., 'dragenDepth', 'nextgeneDepth', 'bwaDepth', 'bowtie2Depth')
 * or explicit 'aligner' property values.
 */
export function detectAlignersFromData(data: any[]): DynamicAlignerMeta[] {
  if (!Array.isArray(data) || data.length === 0) {
    return getDefaultAligners();
  }

  const detectedKeys = new Set<string>();

  // Strategy 1: Look for explicit 'aligner' key in items
  data.forEach((item) => {
    if (item.aligner && typeof item.aligner === "string") {
      detectedKeys.add(item.aligner.toLowerCase());
    }
  });

  // Strategy 2: Look for keys ending in 'Depth' (e.g. dragenDepth, nextgeneDepth)
  if (detectedKeys.size === 0) {
    data.forEach((item) => {
      Object.keys(item).forEach((k) => {
        if (k.endsWith("Depth") && k !== "meanDepth") {
          const prefix = k.replace("Depth", "").toLowerCase();
          detectedKeys.add(prefix);
        }
      });
    });
  }

  if (detectedKeys.size === 0) {
    return getDefaultAligners();
  }

  const alignerList = Array.from(detectedKeys);
  return alignerList.map((key, idx) => {
    const theme = COLOR_PALETTE[idx % COLOR_PALETTE.length];
    const name = formatAlignerName(key);
    return {
      id: key,
      name,
      keyPrefix: key,
      color: theme.color,
      bgLight: theme.bgLight,
      borderLight: theme.borderLight,
      textColor: theme.textColor,
    };
  });
}

export function getDefaultAligners(): DynamicAlignerMeta[] {
  return [
    {
      id: "dragen",
      name: "DRAGEN v4.0",
      keyPrefix: "dragen",
      color: "#0284c7",
      bgLight: "bg-sky-50",
      borderLight: "border-sky-200",
      textColor: "text-sky-800",
    },
    {
      id: "nextgene",
      name: "NextGENe v2.4",
      keyPrefix: "nextgene",
      color: "#059669",
      bgLight: "bg-emerald-50",
      borderLight: "border-emerald-200",
      textColor: "text-emerald-800",
    },
    {
      id: "bwa",
      name: "BWA-MEM + Markdup",
      keyPrefix: "bwa",
      color: "#d97706",
      bgLight: "bg-amber-50",
      borderLight: "border-amber-200",
      textColor: "text-amber-800",
    },
  ];
}

function formatAlignerName(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes("dragen")) return "DRAGEN v4.0";
  if (lower.includes("nextgene")) return "NextGENe v2.4";
  if (lower.includes("bwa") || lower.includes("markdup")) return "BWA-MEM + Markdup";
  if (lower.includes("bowtie")) return "Bowtie2";
  if (lower.includes("novalign")) return "NovoAlign";
  if (lower.includes("star")) return "STAR Aligner";
  if (lower.includes("hisat")) return "HISAT2";

  // Capitalize custom key
  return key.charAt(0).toUpperCase() + key.slice(1);
}
