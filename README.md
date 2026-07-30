# NGS WES Alignment Benchmark Suite & Clinical Coverage Platform

> **Publication Reference**: Coquerelle M., Cabello-Aguilar H., et al. *Benchmarking Next-Generation Whole-Exome Alignment Pipelines in Clinical Diagnostics*. **Diseases** (2025).  
> **Target Cluster Directory**: `/NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment`

An interactive, high-performance web application and CLI toolkit designed to evaluate, visualize, and benchmark Next-Generation Sequencing (NGS) Whole-Exome (WES) alignment engines (**DRAGEN v4.0**, **NextGENe v2.4**, **BWA-MEM + Picard**) and calculate binomial variant detection probabilities ($P(\text{Loss})$) for ctDNA and germline diagnostic panels.

---

## Step-by-Step Quick Start (Local Laptop / Linux Workstation)

You can clone this repository locally and run the entire suite offline on any Linux, macOS, or Windows machine in under 2 minutes.

### Prerequisites

- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm** (included with Node.js) or **yarn** / **pnpm** / **bun**
- **Python**: v3.8+ (optional, required only if generating new `.json` benchmark files from local BAM files)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/MickaeCQ/ngs-wes-alignment-benchmark.git
cd ngs-wes-alignment-benchmark
```

---

### Step 2: Install Dependencies

```bash
npm install
```

---

### Step 3: Launch the Application

```bash
npm run dev
```

The application will start on port `3000`. Open your web browser and navigate to:

**[http://localhost:3000](http://localhost:3000)**

---

## Project Architecture & Directory Structure

```
ngs-wes-alignment-benchmark/
├── public/
│   └── bench_coverage_metrics.json    # Auto-loaded real cluster coverage JSON
├── src/
│   ├── components/
│   │   ├── FileDropZone.tsx            # Drag & drop importer for custom BED & JSON
│   │   ├── GeneCoverageAnalyzer.tsx    # Exon & Whole-gene coverage visualizer
│   │   ├── MetricsDashboard.tsx        # High-level technical/clinical metrics
│   │   ├── CtDnaLodCalculator.tsx      # Binomial VAF variant loss probability
│   │   ├── RScriptGenerator.tsx        # Publication R / ggplot2 generator
│   │   └── LaTeXReportGenerator.tsx    # Journal submission manuscript compiler
│   ├── utils/
│   │   ├── bedParser.ts                # Dynamic UCSC BED file parser
│   │   ├── dynamicAligners.ts          # N-aligner dynamic detection & color palette
│   │   └── binomialModel.ts            # Mathematical binomial loss engine
│   ├── data/
│   │   ├── captureBedData.ts           # UCSC BED capture panel dataset
│   │   ├── geneCoverageData.ts         # Clinical gene profiles & exon maps
│   │   └── benchmarkData.ts            # Clinical benchmark dataset (3 samples)
│   ├── App.tsx                         # Main application entry container
│   └── types.ts                        # TypeScript interfaces & definitions
├── scripts/
│   ├── run_coverage_pipeline.sh        # Cluster executable bash script
│   └── generate_benchmark_json.py      # Python mosdepth JSON aggregator
├── package.json                        # Node dependencies & scripts
└── README.md                           # Documentation
```

---

## Dynamic Data Import (Drag & Drop .BED and .JSON)

The application includes an **interactive Drag-and-Drop Zone** that allows you to load custom capture panels and benchmark datasets dynamically without modifying code or restart servers.

### 1. Custom Capture BED Files (`.bed`)
- **Drag & drop any standard UCSC `.bed` file** (`chr \t start \t end \t geneSymbol`).
- **Dynamic Updating**: Automatically parses all target regions, detects gene strands (`+` / `-`), orders exons biologically ($5' \to 3'$), and updates the gene selection dropdowns across both **Gene BED Region Coverage** and **Gene Region Coverage** tabs immediately!

### 2. Custom Benchmark JSON Datasets (`.json`)
- **N-Aligner Support**: The JSON parser dynamically discovers **any number of aligners** ($1, 2, 3, 4, 5+$ aligners) present in the JSON payload!
- **Dynamic Styling**: Assigns color-coded badges, chart bars, line graphs, and table columns dynamically for each detected aligner (e.g., DRAGEN, NextGENe, BWA, Bowtie2, NovoAlign).

---

## Processing Local BAM Files with Python & Mosdepth

To benchmark your own BAM files locally on a workstation or HPC cluster:

### Step 1: Execute Mosdepth on BAM Files

```bash
# Clean previous output
rm -f output_*.mosdepth.* output_*.regions.bed* output_*.thresholds.bed*

# Run mosdepth with 20x, 30x, 50x thresholds
mosdepth -t 8 -b ./bed/capture_panel.bed --thresholds 20,30,50 "output_MF1284_dragen" "MF1284_Dragen.bam"
mosdepth -t 8 -b ./bed/capture_panel.bed --thresholds 20,30,50 "output_MF1284_nextgene" "MF1284_nextgene.bam"
mosdepth -t 8 -b ./bed/capture_panel.bed --thresholds 20,30,50 "output_MF1284_bwamarkdup" "MF1284.markdup.bam"
```

### Step 2: Convert Mosdepth Outputs to JSON

```bash
python3 scripts/generate_benchmark_json.py \
  --bed ./bed/capture_panel.bed \
  --samples MF1284 MF1358 MF746 \
  --aligners dragen,DRAGEN_v4.0 nextgene,NextGENe_v2.4 bwamarkdup,BWA_Picard \
  --output bench_coverage_metrics.json
```

Move `bench_coverage_metrics.json` to `public/` or drag & drop it into the web interface.

---

## Mathematical Model: Binomial Variant Loss & LOD Probability

To calculate the probability $P(\text{Loss})$ of failing to detect a somatic or germline variant at a given deduplicated depth ($D_{\text{dedup}}$) and Variant Allele Fraction ($p = \text{VAF}$):

$$P(\text{Loss}) = P(X < n) = \sum_{k=0}^{n-1} \binom{D_{\text{dedup}}}{k} \, p^k \, (1-p)^{D_{\text{dedup}} - k}$$

Where:
- $D_{\text{dedup}}$: Deduplicated read depth at the target genomic locus ($X$).
- $p$: Expected Variant Allele Fraction (VAF) ($p = 0.005$ for 0.5% ctDNA, $p = 0.50$ for germline heterozygous).
- $k$: Number of mutated reads observed ($k \ge n$).
- $n$: Variant caller threshold ($n = 3$ variant reads required).
- $\binom{D_{\text{dedup}}}{k}$: Binomial coefficient $\frac{D_{\text{dedup}}!}{k! \, (D_{\text{dedup}}-k)!}$.

---

## Publication Package Export

Click **"Export Benchmark Package"** in the top navigation bar to download:
1. `alignment_benchmark_paper.tex`: Complete LaTeX manuscript ready for *Diseases* or *Oxford Bioinformatics* submission.
2. `generate_publication_figures.R`: Publication-ready R script (`ggplot2` + `cowplot`).
3. `run_alignment_benchmark.sh`: Executable bash script for Linux cluster scheduling.

---

## License & Citation

When using this suite in scientific publications, please cite:
> Coquerelle M., Cabello-Aguilar H., et al. *Benchmarking Next-Generation Whole-Exome Alignment Pipelines in Clinical Diagnostics*. **Diseases** (2025).
