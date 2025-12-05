const scatterCtx = document.getElementById('scatterChart').getContext('2d');
  let scatterChart;
  let fullData = [];
  let allConditions = [];
  let highlightedGenes = new Set();
  const fluoColors = [
  {hex:'#FF0000',name:'bright red'},
  {hex:'#F527CF',name:'magenta'},
  {hex:'#00FF00', name:'bright green'},
  {hex:'#27F5BE', name:'turquoise'},
  {hex:'#02540C',name: 'dark green'},
  {hex:'#57001E',name:'wine'},
  {hex:'#FF7F00', name:'bright orange'},
  {hex:'#FFFF00', name:'bright yellow'},
  {hex:'#A927F5',name:'purple'},
  {hex:'#A0522D', name:'sienna'}];


const geneColors = {};
let colorIndex = 0;

  window.addEventListener('DOMContentLoaded', () => {
    fetch('data/no_annot_data.json')
      .then(response => {
        if (!response.ok) throw new Error("JSON file not found or inaccessible");
        return response.json();
      })
      .then(jsonData => {
        fullData = validateJSON(jsonData);
        if (!fullData.length) {
          alert("Invalid JSON format — must have 'gene', 'log2fc', and 'condition' fields.");
          return;
        }

        allConditions = [...new Set(fullData.map(d => d.condition))];
        renderScatter(fullData);
      })
      .catch(err => {
        console.error("Error loading JSON:", err);
        alert("Failed to load or parse data.json.");
      });
  });

  function validateJSON(data) {
    if (!Array.isArray(data)) return [];
    return data.filter(item =>
      item.gene &&
      typeof item.log2fc === 'number' &&
      item.condition
    );
  }

  function extractCounts(geneName) {
  const entries = fullData.filter(d => d.gene === geneName);

  if (entries.length === 0) return { labels: [], values: [] };

  const sample = entries[0];
  const keys = Object.keys(sample);
  let idx = keys.indexOf("condition");

  const countKeys = keys.slice(idx + 1);
  const values = countKeys.map(k => sample[k]);

  return { labels: countKeys, values: values };
}

function getColorForLog2FC(value) {
  if (isNaN(value)) return '#999';
  if (value >= 2) {
    const t = Math.min((value - 2) / 8, 1);
    const r = Math.round(255 - 155 * t);
    const g = Math.round(182 - 182 * t);
    const b = Math.round(193 - 193 * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (value <= -2) {
    const t = Math.min((Math.abs(value) - 2) / 8, 1);
    const r = Math.round(173 * (1 - t));
    const g = Math.round(216 * (1 - t));
    const b = 230;
    return `rgb(${r}, ${g}, ${b})`;

  } else {
    return '#cccccc';
  }
}

  function addJitter(){ return (Math.random()-0.5)*0.8; }

  function renderScatter(data){
    if(scatterChart) scatterChart.destroy();
    const scatterData = data.map(d=>{
      const xIndex = allConditions.indexOf(d.condition);
      return {x:xIndex+addJitter(), y:d.log2fc, label:d.gene, condition:d.condition, backgroundColor:getColorForLog2FC(d.log2fc)};
    });

    scatterChart = new Chart(scatterCtx,{
      type:'scatter',
      data:{datasets:[{label:'Genes', data:scatterData, pointRadius:6, borderColor:'#333', borderWidth:1, backgroundColor:scatterData.map(d=>d.backgroundColor)}]},
      options:{
        responsive:true,
        maintainAspectRatio:false,
        onClick:(evt,elements)=>{
          if(elements.length>0){
            const idx = elements[0].index;
            const gene = scatterData[idx].label;
            toggleHighlightGene(gene);
          }
        },
        scales:{
          x:{
            type:'linear', min:-0.5, max:allConditions.length-0.5,
            ticks:{
              callback: (val, index) => {
                if (index % 2 === 0) return '';
                const conditionIndex = Math.floor((index - 1) / 2);
                return allConditions[conditionIndex] || '';
              }
            },
            title: { display: true, text: 'Condition' ,
              font: {
                size: 15,
                weight: 'bold'}}
          },
          y:{title:{display:true,text:'log₂FC',
            font: {
              size: 15,
              weight: 'bold'}}}
        },
        plugins: {
            legend:{display:false},
            tooltip:{
                callbacks:{
                    label:function(ctx){
                        const gene = ctx.raw.label;
                        const log2fc = ctx.raw.y;
                        const cond = allConditions[Math.round(ctx.raw.x)];
                        return `${gene} | ${cond}`;
                    }
                }
            },
            title:{
                display:true,
                text:'Gene Log₂FC distribution with respect to the condition',
                font:{ size:20, weight:'bold' }
            }
        }
      }
    });
  }

  function toggleHighlightGene(gene) {
    if (highlightedGenes.has(gene)) {
      highlightedGenes.delete(gene);
    } else {
      highlightedGenes.add(gene);
    }

    const dataset = scatterChart.data.datasets[0];
    dataset.data.sort((a, b) => (a.label === gene ? 1 : 0) - (b.label === gene ? 1 : 0));

    dataset.pointRadius = dataset.data.map(d =>
      highlightedGenes.has(d.label) ? 10 : 6
    );
    dataset.borderWidth = dataset.data.map(d =>
      highlightedGenes.has(d.label) ? 3 : 1
    );
    dataset.borderColor = dataset.data.map(d =>
      highlightedGenes.has(d.label) ? '#000' : '#333'
    );
    dataset.backgroundColor = dataset.data.map(d => {
  if (highlightedGenes.has(d.label)) {
    if (!geneColors[d.label]) {
      const color = fluoColors[colorIndex % fluoColors.length];
      geneColors[d.label] = color;
      colorIndex++;
    }
    return geneColors[d.label].hex;
  } else {
    return getColorForLog2FC(d.y);
  }
});

    scatterChart.update();
    updateSidePanel();
  }

  function unhighlightGene(gene) {
  highlightedGenes.delete(gene);
  delete geneColors[gene];

  const dataset = scatterChart.data.datasets[0];
  dataset.pointRadius = dataset.data.map(d =>
    highlightedGenes.has(d.label) ? 10 : 6
  );
  dataset.borderWidth = dataset.data.map(d =>
    highlightedGenes.has(d.label) ? 3 : 1
  );
  dataset.borderColor = dataset.data.map(d =>
    highlightedGenes.has(d.label) ? '#000' : '#333'
  );
  dataset.backgroundColor = dataset.data.map(d => {
      if (highlightedGenes.has(d.label)) {
        if (!geneColors[d.label]) {
          const color = fluoColors[colorIndex % fluoColors.length];
          geneColors[d.label] = color;
          colorIndex++;
        }
        return geneColors[d.label].hex;
      } else {
        return getColorForLog2FC(d.y ?? d.log2fc);
      }
    });

  scatterChart.update();
  updateSidePanel();
}

  function updateSidePanel() {
  const panel = document.getElementById('highlightPanel');
  const list = document.getElementById('highlightList');
  list.innerHTML = '';

  if (highlightedGenes.size === 0) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  const grouped = {};
  fullData.forEach(d => {
    if (highlightedGenes.has(d.gene)) {
      if (!grouped[d.gene]) grouped[d.gene] = [];
      grouped[d.gene].push({ condition: d.condition, log2fc: d.log2fc, FDR: d.FDR });
    }
  });

  const geneNames = Object.keys(grouped).sort();

  geneNames.forEach(gene => {
    const geneItem = document.createElement('li');
    geneItem.style.position = 'relative';
    geneItem.style.paddingRight = '25px';

    const title = document.createElement('strong');
    title.textContent = gene;
    title.style.color = geneColors[gene]?.hex || '#000';
    geneItem.appendChild(title);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.style.position = 'absolute';
    removeBtn.style.right = '6px';
    removeBtn.style.top = '6px';
    removeBtn.style.border = 'none';
    removeBtn.style.background = 'transparent';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontSize = '0.9em';
    removeBtn.style.color = '#888';
    removeBtn.title = 'Unhighlight this gene';
    removeBtn.addEventListener('mouseenter', () => removeBtn.style.color = '#c00');
    removeBtn.addEventListener('mouseleave', () => removeBtn.style.color = '#888');

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      unhighlightGene(gene);
    });

    geneItem.appendChild(removeBtn);

    const condList = document.createElement('ul');
    condList.style.listStyle = 'none';
    condList.style.paddingLeft = '10px';
    condList.style.marginTop = '4px';

    grouped[gene].forEach(entry => {
      const condItem = document.createElement('li');
      const log2fcValue = (entry.log2fc < -2 || entry.log2fc > 2)
        ? `<strong>${entry.log2fc}</strong>`
        : entry.log2fc;
      const fdrValue = (entry.FDR < 0.05)
        ? `<strong>${entry.FDR}</strong>`
        : entry.FDR;

      condItem.innerHTML = `${entry.condition}: log₂FC=${log2fcValue} and FDR=${fdrValue}`;
      condList.appendChild(condItem);
    });
    const { labels, values } = extractCounts(gene);

if (labels.length > 0) {
  const chartContainer = document.createElement("div");
  chartContainer.style.width = "230px";
  chartContainer.style.height = "90px";
  chartContainer.style.marginTop = "10px";

  const canvas2 = document.createElement("canvas");
  canvas2.classList.add("miniChart");
  canvas2.id = `chart_${gene}`;
  chartContainer.appendChild(canvas2);

  geneItem.appendChild(chartContainer);

  setTimeout(() => {
    new Chart(canvas2.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Counts",
          data: values,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
          ticks: { maxRotation: 0, minRotation: 0, font: { size: 8 },
          grid: { display: false }
        },
        grid: { display: false }
      },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 8 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: { enabled: false }
        },
        layout: {
          padding: 0
        }
      }
    });
  }, 10);
}

    geneItem.appendChild(condList);
    list.appendChild(geneItem);
  });
}

  const geneSearchInput = document.getElementById("geneSearch");
  const searchButton = document.getElementById("searchButton");

  geneSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleGeneSearch();
  });
  searchButton.addEventListener("click", handleGeneSearch);

  function handleGeneSearch() {
    const query = geneSearchInput.value.trim();
    if (!query) return;

    const geneExists = fullData.some(d => d.gene.toLowerCase() === query.toLowerCase());
    if (!geneExists) {
      alert(`Gene "${query}" not found in the current dataset.`);
      return;
    }

    document.getElementById("scatterChart").scrollIntoView({ behavior: "smooth" });
    toggleHighlightGene(query);
  }

  document.getElementById("dlCSV").addEventListener("click", () => {
    if (highlightedGenes.size === 0) {
      alert("No highlighted genes to download.");
      return;
    }

    const selected = fullData.filter(d => highlightedGenes.has(d.gene));
    const rows = [["gene", "condition", "log2fc"], ...selected.map(d => [d.gene, d.condition, d.log2fc])];
    const csvContent = rows.map(r => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "highlighted_genes.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("dlPNG").addEventListener("click", () => {
    if (!scatterChart) return;
    const link = document.createElement("a");
    link.href = scatterChart.toBase64Image();
    link.download = "scatter_plot.png";
    link.click();
  });
