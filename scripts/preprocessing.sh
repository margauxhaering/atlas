if [ $# -ne 5 ]
then
    echo ""
    echo "Usage: $0 <path/to/dir> <path/to/Spis/genome> <path/to/Smic/genome> <output prefix> "
    echo ""
    exit -1
fi

THREADS=8
DIR=${1} #dir of the fq
SPGEN=${2} #Spis genome ref
SMGEN=${3} #Smic genome ref
OUT=${4} #final output prefix

cd $DIR
# Quality control :
mkdir -p QC/ && fastqc -o QC/*.fq
multiqc QC/*.zip
mkdir -p reports/ && mv QC/multiqc.html reports/fastQC.html

# Low quality reads trim ans adapters :
mkdir -p fastp

for fq1 in QC/*_1.gz; do
    fq2="${fq1/_1.gz/_2.gz}"
    [[ ! -f "$fq2" ]] && continue
    OUTP=$(basename "$fq1" _1.gz)

    fastp \
        -i "$fq1" \
        -I "$fq2" \
        -o "fastp/${OUTP}.1.fq.gz" \
        -O "fastp/${OUTP}.2.fq.gz" \
        -R "reports/${OUTP}.fastp"
done

# Mapping for all PE files against S. pis and S. mic :
mkdir -p Spis_star_out && mkdir -p Smic_star_out

for fq1 in fastp/*.1.gz; do
    fq2="${fq1/.1.gz/.2.gz}"
    [[ ! -f "$fq2" ]] && continue
    OUTP=$(basename "$fq1" .1.gz)

    STAR --runThreadN $THREADS \
        --genomeDir "$SPGEN" \
        --readFilesIn "$fq1" "$fq2" \
        --outFileNamePrefix "Spis_star_out/${OUTP}." \
        --sjdbGTFfile "$GEN/genes.gtf" \
        --outSAMstrandField intronMotif \
        --outSAMtype BAM SortedByCoordinate \
        --outReadsUnmapped Fastx \
        --outFilterMultimapNmax 1 \
        --alignEndsType EndToEnd

    STAR --runThreadN $THREADS \
        --genomeDir "$SMGEN" \
        --readFilesIn "$fq1" "$fq2" \
        --outFileNamePrefix "Smic_star_out/${OUTP}." \
        --sjdbGTFfile "$GEN/genes.gtf" \
        --outSAMstrandField intronMotif \
        --outSAMtype BAM SortedByCoordinate \
        --outReadsUnmapped Fastx \
        --outFilterMultimapNmax 1 \
        --alignEndsType EndToEnd
done

multiqc Smic_star_out/*Log.final.out && mv Smic_star_out/multiqc.html reports/star_smic.html
multiqc Spis_star_out/*Log.final.out && mv Spis_star_out/multiqc.html reports/star_spis.html

# Generation of the count matrix
featureCounts -p -B -T 5 -t exon -g gene_id -a ${SPGEN}/genes.gtf -o ${OUT}.spis.counts.txt  Spis_star_out/*.bam
featureCounts -p -B -T 5 -t exon -g gene_id -a ${SMGEN}/genes.gtf -o ${OUT}.smic.counts.txt  Smic_star_out/*.bam
