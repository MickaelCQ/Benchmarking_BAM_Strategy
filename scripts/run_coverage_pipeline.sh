#!/usr/bin/env bash
# ===============================================================================
# NGS WES Alignment Benchmark Suite — Cluster Executable Shell Script
# ===============================================================================
# Author: Maxime Coquerelle
# Publication: Coquerelle M., Cabello-Aguilar H., Diseases (2025)
# Cluster Working Directory: /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
# ===============================================================================

set -euo pipefail

echo "========================================================================="
echo " NGS WES Alignment Benchmark Suite — Mosdepth & JSON Aggregator"
echo "========================================================================="

# 1. Environment Setup
BED_FILE="./bed/capture_panel.bed"
SAMPLES=("MF1284" "MF1358" "MF746")
THREADS=8

if [ ! -f "$BED_FILE" ]; then
    echo "⚠️ BED file $BED_FILE not found in working directory. Using default capture_panel.bed if available."
fi

# 2. Cleanup previous mosdepth temporary files
echo "[1/3] Cleaning up temporary mosdepth metrics..."
rm -f output_*.mosdepth.* output_*.regions.bed* output_*.thresholds.bed* output_*.summary.txt

# 3. Execute mosdepth on BAM alignments for all samples and aligners
echo "[2/3] Running mosdepth coverage calculations..."
for SAMPLE in "${SAMPLES[@]}"; do
    echo "  ---> Processing Sample: $SAMPLE"

    # DRAGEN v4.0
    if [ -f "${SAMPLE}_Dragen.bam" ]; then
        echo "       • DRAGEN v4.0 BAM..."
        mosdepth -t $THREADS -b "$BED_FILE" --thresholds 20,30,50 "output_${SAMPLE}_dragen" "${SAMPLE}_Dragen.bam"
    fi

    # NextGENe v2.4
    if [ -f "${SAMPLE}_nextgene.bam" ]; then
        echo "       • NextGENe v2.4 BAM..."
        mosdepth -t $THREADS -b "$BED_FILE" --thresholds 20,30,50 "output_${SAMPLE}_nextgene" "${SAMPLE}_nextgene.bam"
    fi

    # BWA-MEM + Picard
    if [ -f "${SAMPLE}.markdup.bam" ]; then
        echo "       • BWA-MEM + Markdup BAM..."
        mosdepth -t $THREADS -b "$BED_FILE" --thresholds 20,30,50 "output_${SAMPLE}_bwamarkdup" "${SAMPLE}.markdup.bam"
    fi
done

# 4. Generate JSON for Web UI
echo "[3/3] Aggregating coverage metrics into bench_coverage_metrics.json..."
python3 scripts/generate_benchmark_json.py \
    --bed "$BED_FILE" \
    --samples "${SAMPLES[@]}" \
    --aligners dragen,DRAGEN_v4.0 nextgene,NextGENe_v2.4 bwamarkdup,BWA_Picard \
    --output bench_coverage_metrics.json

echo "========================================================================="
echo " ✅ Pipeline execution completed successfully!"
echo "    Generated: bench_coverage_metrics.json"
echo "    You can drag and drop bench_coverage_metrics.json directly into the Web UI!"
echo "========================================================================="
