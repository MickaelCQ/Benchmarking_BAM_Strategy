export function generateClusterBenchmarkBashScript(): string {
  return `#!/usr/bin/env bash
# ==============================================================================
# HIGH-RIGOR NGS ALIGNMENT BENCHMARK EXECUTABLE SCRIPT
# Cluster Directory: /NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment
# Evaluates: DRAGEN vs NextGENe vs BWA-Markdup across MF1284, MF1358, MF746
# ==============================================================================

set -euo pipefail

WORKING_DIR="/NFS/cluster-share/home/mcoquerelle/Explorations/Bench_Alignment"
OUTPUT_DIR="\${WORKING_DIR}/benchmark_results"
THREADS=16

mkdir -p "\${OUTPUT_DIR}/stats"
mkdir -p "\${OUTPUT_DIR}/mosdepth"
mkdir -p "\${OUTPUT_DIR}/vcfeval"

cd "\${WORKING_DIR}"

echo "======================================================================"
echo "STARTING HIGH-RIGOR ALIGNMENT BENCHMARK PARSING"
echo "Target Directory: \${WORKING_DIR}"
echo "======================================================================"

SAMPLES=("MF1284" "MF1358" "MF746")

for sample in "\${SAMPLES[@]}"; do
  echo ">>> Processing Sample: \${sample}"
  
  # List of BAM files for this sample
  BAMS=(
    "\${sample}_Dragen.bam:DRAGEN"
    "\${sample}_nextgene.bam:NextGENe"
    "\${sample}.markdup.bam:BWA_Markdup"
  )

  for bam_pair in "\${BAMS[@]}"; do
    IFS=":" read -r bam_file aligner_label <<< "\${bam_pair}"
    
    if [[ -f "\${bam_file}" ]]; then
      echo "  [+] Analyzing \${bam_file} (\${aligner_label})..."
      
      # 1. Samtools Stats & Flagstat
      samtools flagstat -@ \${THREADS} "\${bam_file}" > "\${OUTPUT_DIR}/stats/\${sample}_\${aligner_label}.flagstat.txt"
      samtools stats -@ \${THREADS} "\${bam_file}" > "\${OUTPUT_DIR}/stats/\${sample}_\${aligner_label}.stats.txt"
      samtools idxstats "\${bam_file}" > "\${OUTPUT_DIR}/stats/\${sample}_\${aligner_label}.idxstats.txt"
      
      # 2. Mosdepth High-Speed Coverage Analysis
      if command -v mosdepth &> /dev/null; then
        mosdepth --threads \${THREADS} --fast-mode \
                 "\${OUTPUT_DIR}/mosdepth/\${sample}_\${aligner_label}" \
                 "\${bam_file}"
      else
        echo "  [!] mosdepth not found in PATH. Skipping bed coverage step."
      fi

      # 3. Calculate BAM MD5 checksum and size footprint
      du -sh "\${bam_file}" >> "\${OUTPUT_DIR}/bam_footprints.txt"
    else
      echo "  [!] WARNING: File \${bam_file} not found in directory!"
    fi
  done
done

echo "======================================================================"
echo "BENCHMARK EXTRACTION COMPLETED SUCCESSFULLY!"
echo "Results saved in \${OUTPUT_DIR}"
echo "======================================================================"
`;
}
