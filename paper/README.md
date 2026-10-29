# MediChain paper package
- main.tex  - manuscript (IEEEtran journal). Needs IEEEtran.cls (in any full TeX Live / Overleaf).
- figures/  - 7 diagrams as PDF + PNG (regenerate: python3 scripts/make_figures.py)
- figures_snippets.tex - ready \includegraphics blocks for the diagrams
- data/exp1..exp4.csv - header-only templates; the pgfplots result figures
  in main.tex draw only once you fill them with MEASURED values.
- Every [TBD] in main.tex is a result you still must measure. Nothing is invented.
Compile: latexmk -pdf main.tex
