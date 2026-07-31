#!/bin/bash
# ==============================================================================
# Script Générique de Sous-Échantillonnage de Fichiers BAM (Subsampling)
# Calcul précis de la profondeur moyenne sur les régions d'un fichier BED
# ==============================================================================
# Usage:
#   ./subsample_bam.sh <TARGET_DEPTH_X> <BED_FILE> <BAM_FILE_1> [BAM_FILE_2 ...]
#
# Exemple:
#   ./subsample_bam.sh 40 ~/Explorations/Bench_Alignment/bed/capture_panel.bed *_Run1*.bam
# ==============================================================================

set -e

if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <TARGET_DEPTH_X> <BED_FILE> <BAM1> [BAM2 ...]"
    echo "Exemple: $0 40 /path/to/capture_panel.bed sample1_Run1.bam sample2_Run1.bam"
    exit 1
fi

TARGET_X="$1"
BED_FILE="$2"
shift 2
BAM_FILES=("$@")

if [ ! -f "$BED_FILE" ]; then
    echo "Erreur : Le fichier BED '$BED_FILE' n'existe pas."
    exit 1
fi

# Vérification des outils nécessaires
for cmd in mosdepth samtools python3; do
    if ! command -v $cmd &> /dev/null; then
        echo "Erreur : Commande '$cmd' introuvable dans votre PATH."
        exit 1
    fi
done

echo "========================================================================"
echo "   SUB-SAMPLING BAM VERS UN OBJECTIF DE ${TARGET_X}X SUR VOLET BED TARGET"
echo "   BED : $BED_FILE"
echo "   Fichiers BAM cibles (${#BAM_FILES[@]}) :"
for b in "${BAM_FILES[@]}"; do
    echo "     - $b"
done
echo "========================================================================"

SEED=100

for bam in "${BAM_FILES[@]}"; do
    if [ ! -f "$bam" ]; then
        echo "Attention : Fichier '$bam' non trouvé, étape ignorée."
        continue
    fi

    base=$(basename "$bam" .bam)
    
    # Remplacement automatique du motif de run (ex: _Run1 -> _Sub40x) ou ajout du suffixe
    if [[ "$base" =~ _Run1 ]]; then
        out_base="${base/_Run1/_Sub${TARGET_X}x}"
    else
        out_base="${base}_Sub${TARGET_X}x"
    fi
    
    out_bam="${out_base}.bam"
    tmp_prefix="tmp_sub_${base}_$$"

    echo ""
    echo "------------------------------------------------------------------------"
    echo "Traitement : $bam"

    # 1. Calcul rapide de la profondeur moyenne dans le BED cible via mosdepth
    echo "  [1/4] Mesure de la profondeur moyenne actuelle sur le BED..."
    
    # Détection de l'usage de 'chr' dans le BAM vs le BED
    bam_has_chr=$(samtools view -H "$bam" 2>/dev/null | grep -m 1 '^@SQ' | grep -c 'SN:chr' || true)
    bed_has_chr=$(grep -v '^#' "$BED_FILE" | grep -m 1 '^chr' -c || true)
    
    effective_bed="$BED_FILE"
    tmp_bed=""
    
    if [ "$bam_has_chr" -gt 0 ] && [ "$bed_has_chr" -eq 0 ]; then
        tmp_bed="${tmp_prefix}_matching.bed"
        awk -F'\t' 'BEGIN{OFS="\t"} {$1="chr"$1; print}' "$BED_FILE" > "$tmp_bed"
        effective_bed="$tmp_bed"
    elif [ "$bam_has_chr" -eq 0 ] && [ "$bed_has_chr" -gt 0 ]; then
        tmp_bed="${tmp_prefix}_matching.bed"
        sed 's/^chr//' "$BED_FILE" > "$tmp_bed"
        effective_bed="$tmp_bed"
    fi

    mosdepth -n -b "$effective_bed" "$tmp_prefix" "$bam" > /dev/null 2>&1

    summary_file="${tmp_prefix}.mosdepth.summary.txt"
    mean_dp=""
    
    if [ -f "$summary_file" ]; then
        # Récupération précise de la ligne total_region (ou total) dans le résumé mosdepth
        mean_dp=$(awk -F'\t' '$1 == "total_region" || $1 == "total" {dp=$4} END {print dp}' "$summary_file")
    fi

    # Fallback de secours si summary.txt n'a pas la ligne attendue
    if [ -z "$mean_dp" ] || [ "$mean_dp" == "0" ] || [ "$mean_dp" == "0.00" ]; then
        mean_dp=$(zcat "${tmp_prefix}.regions.bed.gz" 2>/dev/null | awk -F'\t' '{len=$3-$2; sum+=$4*len; total+=len} END {if (total>0) printf "%.2f", sum/total; else print "0"}')
    fi

    # Nettoyage des fichiers temporaires mosdepth et BED temporaire
    rm -f ${tmp_prefix}*

    echo "  -> Profondeur moyenne mesurée dans le BED = ${mean_dp}x"

    # 2. Calcul exact de la fraction et formattage samtools (-s SEED.DECIMAL)
    frac_tuple=$(python3 -c "
dp = float('$mean_dp')
target = float('$TARGET_X')
if dp <= target or dp <= 0:
    print('1.0 100.0')
else:
    f = target / dp
    frac_str = f'{f:.4f}'
    dec_part = frac_str.split('.')[1]
    print(f'{f} 100.{dec_part}')
")

    frac=$(echo "$frac_tuple" | awk '{print $1}')
    samtools_arg=$(echo "$frac_tuple" | awk '{print $2}')

    # 3. Application du subsampling ou copie simple
    if (( $(echo "$frac >= 1.0" | bc -l 2>/dev/null || python3 -c "print(int($frac >= 1.0))") )); then
        echo "  -> Profondeur actuelle (${mean_dp}x) <= Objectif (${TARGET_X}x). Pas de réduction nécessaire."
        echo "  -> Copie du fichier d'origine vers $out_bam ..."
        cp "$bam" "$out_bam"
    else
        echo "  -> Fraction retenue = $frac (${TARGET_X} / ${mean_dp}x) -> Option samtools: -s $samtools_arg"
        echo "  [2/4] Extraction des reads avec samtools view..."
        samtools view -@ 8 -b -s "$samtools_arg" "$bam" > "$out_bam"
    fi

    # 4. Indexation avec samtools
    echo "  [3/4] Indexation du fichier BAM généré..."
    samtools index -@ 4 "$out_bam"

    echo "  -> [OK] Généré avec succès : $out_bam"
done

echo ""
echo "========================================================================"
echo "   SUBSAMPLING TERMINÉ AVEC SUCCÈS !"
echo "========================================================================"
