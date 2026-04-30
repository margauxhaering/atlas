# Spatial-Diel Dynamics of Gene Expression across Regions of Flat Coral Microcolonies with Contrasting Symbiont Densities 
#### Haering Margaux, Ganot Philippe, Zoccola Didier, Tambutté Eric & Venn Alex
---

Scripts and supplementaries for the paper [blabla](). 
</br>Supplementary atlas available at : https://margauxhaering.github.io/atlas/atlas
</br>

---

**ORGANISATION**


This repository contains several folders : 
  - **scripts** for preprocessing scripts 
  - **suppl** for supplementary figures and tables
  - **atlas** for scripts of the atlas

---

**PREPROCESSING**

Raw fastq files accessible at [GEOblabla]() were preprocessed with [fastqc](https://www.bioinformatics.babraham.ac.uk/projects/fastqc/), [fastp](https://pmc.ncbi.nlm.nih.gov/articles/PMC6129281/), [STAR](https://pmc.ncbi.nlm.nih.gov/articles/PMC4631051/) and [featureCounts](https://pubmed.ncbi.nlm.nih.gov/24227677/).

---

**ANALYSIS**

Raw count table was processed using [RNfuzzyApp](https://pubmed.ncbi.nlm.nih.gov/35186266/) (Haering, 2021) using TCC, DESeq2 with |log2FC| > 2 and FDR < 0.05.  

---

**EXPLORATION**

Atlas was developed with JavaScript.
  - ***OVERVIEW*** show the PCA
  - ***EXPLORE*** offers the main tool for exploring DEGs across the pairwise comparisons
  - ***DISCOVER*** suggests a discovery alternative for unknown DEGs to potentially lead new investigations

---
