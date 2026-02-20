const barCtx = document.getElementById('barChart').getContext('2d');
const scatterCtx = document.getElementById('scatterChart').getContext('2d');

let barChart, scatterChart;
let fullData = [];
let allConditions = [];
let activeGene = null;

window.addEventListener('DOMContentLoaded', () => {
  fetch('data/data.json')
    .then(response => {
      if (!response.ok) throw new Error("JSON file not found or inaccessible");
      return response.json();
    })
    .then(jsonData => {
      fullData = validateJSON(jsonData);
      if (!fullData.length) {
        alert("Invalid JSON format — must have 'gene', 'log2fc', 'condition', 'annotation', and 'category' fields.");
        return;
      }
      fullData = fullData.map(({ _row, ...rest }) => rest);
      allConditions = [...new Set(fullData.map(d => d.condition))];
      const categoryCounts = computeCategoryCounts(fullData);
      renderBarChart(categoryCounts);
      renderScatterPlot([]);
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
    item.condition &&
    item.annotation &&
    item.category
  );
}

function computeCategoryCounts(data) {
  const categoryGenes = {};

  for (const row of data) {
    if (row.category && row.gene) {
      if (!categoryGenes[row.category]) {
        categoryGenes[row.category] = new Set();
      }
      categoryGenes[row.category].add(row.gene);
    }
  }

  const counts = Object.entries(categoryGenes)
    .map(([category, genes]) => ({
      category,
      count: genes.size,
    }))
    .sort((a, b) => b.count - a.count);

  return counts;
}

function renderBarChart(categoryCounts) {
  const labels = categoryCounts.map(d => d.category);
  const counts = categoryCounts.map(d => d.count);

  if (barChart) barChart.destroy();

  const canvas = document.getElementById('barChart');
  const heightPerCategory = 40;
  canvas.height = Math.max(300, labels.length * heightPerCategory);

  const defaultColor = 'rgba(153, 102, 255, 0.6)';
  const highlightColor = 'rgba(255, 205, 86, 0.9)'; // yellow
  const backgroundColors = new Array(labels.length).fill(defaultColor);

  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Gene Count',
        data: counts,
        backgroundColor: backgroundColors,
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const selectedCategory = labels[idx];
          barChart.data.datasets[0].backgroundColor = backgroundColors.map(() => defaultColor);
          barChart.data.datasets[0].backgroundColor[idx] = highlightColor;
          barChart.update();

          updateScatterForCategory(selectedCategory);
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Genes',
            font: { size: 15, weight: 'bold' }
          }
        },
        y: {
          title: {
            display: true,
            text: 'Category',
            font: { size: 15, weight: 'bold' }
          }
        }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Gene Counts per Category (click to filter)',
          font: { size: 20, weight: 'bold' }
        }
      }
    }
  });
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


    function addJitter() {
      return (Math.random() - 0.5) * 0.5;
    }

    function renderScatterPlot(points, categoryName = '') {
      if (scatterChart) scatterChart.destroy();

      const scatterData = points.map(p => {
        const xIndex = allConditions.indexOf(p.condition);
        const isSignificant = p.FDR !== null && p.FDR < 0.05;
        return {
          x: xIndex + addJitter(),
              y: p.log2fc,
              backgroundColor: isSignificant
                ? getColorForLog2FC(p.log2fc)
                : "#D3D3D3",
              label: p.gene,
              annot: p.annotation,
              FDR: p.FDR
            };
      });

      scatterChart = new Chart(scatterCtx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Genes',
            data: scatterData,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 1,
            borderColor: '#333',
            backgroundColor: scatterData.map(p => p.backgroundColor)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              const gene = scatterData[idx].label;
              highlightGene(gene);
            }
          },
          scales: {
            x: {
              type: 'linear',
              min: -0.5,
              max: allConditions.length - 0.5,
              ticks: {
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
            y: {
              title: { display: true, text: 'Log₂FC' ,
                font: {
                  size: 15,
                  weight: 'bold'}}
            }
          },
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: categoryName
                ? `Genes in Category: ${categoryName}`
                : 'Select a Category from the Bar Chart',
                  font: {
                    size: 20,
                    weight: 'bold'}
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const gene = context.raw.label;
                  const log2fc = context.raw.y;
                  const annot = context.raw.annot;
                  const cond = allConditions[Math.round(context.raw.x)];
                  return `${gene} | ${annot}`;
                }

              }
            }
          }
        }
      });
    }

    function renderHeatmap(points, categoryName = '', selectedConditions = null) {
        const heatmapContainer = document.getElementById('heatmap');
        heatmapContainer.innerHTML = '';

        const allGenes = [...new Set(points.map(p => p.gene))];
        const allConditions = [...new Set(points.map(p => p.condition))];

        const conditionsToShow = selectedConditions || allConditions;
        const container = document.getElementById('condition-tags');

        container.innerHTML = '';
        allConditions.forEach(cond => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.textContent = cond;

            if (conditionsToShow.includes(cond)) tag.classList.add('selected');

            tag.onclick = () => {
                tag.classList.toggle('selected');

                const selected = Array.from(
                    container.querySelectorAll('.tag.selected')
                ).map(t => t.textContent);

                renderHeatmap(points, categoryName, selected);
            };

            container.appendChild(tag);
        });

        const lookup = {};
        points.forEach(p => {
            if (!lookup[p.gene]) lookup[p.gene] = {};
            lookup[p.gene][p.condition] = p;
        });

        const orderedheatData = [];
        for (const gene of allGenes) {
            const reference = points.find(p => p.gene === gene);
            for (const condition of conditionsToShow) {
                if (lookup[gene] && lookup[gene][condition]) {
                    orderedheatData.push(lookup[gene][condition]);
                } else {
                    orderedheatData.push({
                        gene,
                        condition,
                        log2fc: 0,
                        FDR: null,
                        annotation: reference.annotation,
                        category: reference.category
                    });
                }
            }
        }

        const geneHasValidValue = {};
        orderedheatData.forEach(d => {
            if (!geneHasValidValue[d.gene]) geneHasValidValue[d.gene] = false;

            if (d.log2fc !== 0) {
                geneHasValidValue[d.gene] = true;
            }
        });

        const filteredGenes = Object.keys(geneHasValidValue).filter(g => geneHasValidValue[g]);
        const filteredHeatData = orderedheatData.filter(d => filteredGenes.includes(d.gene));

        const myGroups = Array.from(new Set(filteredHeatData.map(d => d.condition)));
        const myVars = Array.from(new Set(filteredHeatData.map(d => d.gene)));

  const containerWidth = heatmapContainer.clientWidth || window.innerWidth - window.innerWidth/30;
  const containerHeight = 300;

  const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight + 200)
    .append("g")
    .attr("transform", "translate(100,60)");

  const x = d3.scaleBand()
    .range([0, containerWidth - 150])
    .domain(myVars)
    .padding(0.05);

  const y = d3.scaleBand()
    .range([containerHeight, 0])
    .domain(myGroups)
    .padding(0.05);


  svg.selectAll("rect.cell")
    .data(filteredHeatData, d => d.condition + ':' + d.gene)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.gene))
    .attr("y", d => y(d.condition))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", d => {
  const isSignificant = d.FDR !== null && d.FDR < 0.05;
  return isSignificant
    ? getColorForLog2FC(d.log2fc)
    : "#EEEEEE";
})
    .style("stroke-width", 2)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      highlightGene(event.gene);
    });

    function reorderHeatmap(order) {
      const sub = filteredHeatData.filter(obj => obj.condition === order[0]);
      sub.sort((a, b) => a.log2fc - b.log2fc);
      const geneorder = sub.map(obj => obj.gene);
      x.domain(geneorder);
      y.domain(order);

      svg.selectAll("rect")
        .transition()
        .duration(1000)
        .attr("x", d => x(d.gene))
        .attr("y", d => y(d.condition));

      svg.selectAll(".row-label")
        .transition()
        .duration(1000)
        .attr("y", d => y(d) + y.bandwidth() / 2);

      svg.selectAll(".col-label")
        .transition()
        .duration(1000)
        .attr("y", d => x(d) + x.bandwidth()/2);

        svg.selectAll(".annotation-label")
          .transition()
          .duration(1000)
          .attr("x", d => x(d) + x.bandwidth() / 2)
          .attr("transform", d => {
            const cx = x(d) + x.bandwidth() / 2;
            const cy = containerHeight + 5;
            return `rotate(-90, ${cx}, ${cy})`;
          });
    }
    svg.selectAll(".col-label")
      .data(myVars)
      .enter().append("text")
      .attr("class", "col-label")
      .attr("y", d => x(d) + x.bandwidth()/2)
      .attr("x", 3)
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "start")
      .style("font-size", 8)
      .style("font-family", "Montserrat, Arial")
      .style("cursor", "pointer")
      .text(d => d)
      .on("click", function(event, d) {
        highlightGene(event);
      });

  const geneAnnotations = {};
orderedheatData.forEach(d => {
  if (!geneAnnotations[d.gene]) {
    geneAnnotations[d.gene] = d.annotation;
  }
});
svg.selectAll(".annotation-label")
  .data(myVars)
  .enter()
  .append("text")
  .attr("class", "annotation-label")
  .attr("x", d => x(d) + x.bandwidth() / 2)
  .attr("y", containerHeight + 5)
  .attr("text-anchor", "end")
  .attr("dominant-baseline", "middle")
  .attr("transform", d => {
    const cx = x(d) + x.bandwidth() / 2;
    const cy = containerHeight + 5;
    return `rotate(-90, ${cx}, ${cy})`;
  })
  .style("font-size", 12)
  .style("font-family", "Montserrat, Arial")
  .style("fill", "#333")
  .text(d => geneAnnotations[d] || "")
  .append("title")
  .text(d => geneAnnotations[d] || "");


svg.selectAll(".row-label")
  .data(myGroups)
  .enter().append("text")
  .attr("class", "row-label")
  .attr("x", -100)
  .attr("y", d => y(d) + y.bandwidth()/2)
  .attr("dy", ".32em")
  .style("cursor", "pointer")
  .style("font-size", 12)
  .text(d => d)
  .on("click", function(d) {
    var currentOrder = myGroups.slice();
    var index = currentOrder.indexOf(d);
    if (index !== -1) {
      currentOrder.splice(index, 1);
      currentOrder.unshift(d);
    }
    reorderHeatmap(currentOrder);
  });


    }

    function updateScatterForCategory(category) {
      activeGene = null;
      updateSidePanel();
      const subset = fullData.filter(d => d.category === category);
      renderScatterPlot(subset, category);
      renderHeatmap(subset, category);
    }


    function highlightGeneInHeatmap(gene) {

    d3.select("#heatmap").selectAll("rect.cell")
        .style("stroke", d => d.value < 0.05 ? "#9E1F63" : "none")
        .style("stroke-width", 2)
        .style("opacity", 1);
      d3.select("#heatmap").selectAll(".col-label")
        .style("font-weight", "normal")
        .style("fill", "black");
      d3.select("#heatmap").selectAll("rect.cell")
        .filter(d => d.gene === gene)
        .style("stroke", "#000")
        .style("stroke-width", 3)
        .raise();

      d3.select("#heatmap").selectAll(".col-label")
        .filter(d => d === gene)
        .style("font-weight", "bold")
        .style("fill", "darkgreen");
    }


    function highlightGene(gene) {
      activeGene = gene;
      const dataset = scatterChart.data.datasets[0];
      dataset.data.sort((a, b) => (a.label === gene ? 1 : 0) - (b.label === gene ? 1 : 0));

      dataset.pointRadius = dataset.data.map(d => d.label === gene ? 12 : 6);
      dataset.borderWidth = dataset.data.map(d => d.label === gene ? 3 : 1);
      dataset.borderColor = dataset.data.map(d => d.label === gene ? '#000' : '#333');
      dataset.backgroundColor = dataset.data.map(d =>
        d.label === gene
          ? (d.FDR !== null && d.FDR < 0.05
              ? 'rgba(144, 238, 144, 1)'
              : '#A9A9A9')
          : (d.FDR !== null && d.FDR < 0.05
              ? getColorForLog2FC(d.y)
              : '#D3D3D3')
      );

        scatterChart.update();
        highlightGeneInHeatmap(gene);
        const geneData = fullData.find(d => d.gene === gene);
        const annotation = geneData ? geneData.annotation : 'N/A';
        updateSidePanel();
        updateAnnotation(gene);
}
function updateSidePanel() {
  const panel = document.getElementById('highlightPanel');
  const list  = document.getElementById('highlightList');
  list.innerHTML = '';

  if (!activeGene) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  const rows = fullData.filter(d => d.gene === activeGene);

  const item = document.createElement('li');
  item.style.position = 'relative';
  item.style.paddingRight = '25px';

  const title = document.createElement('strong');
  title.textContent = activeGene;
  title.style.color = 'darkgreen';
  item.appendChild(title);

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

  removeBtn.addEventListener('mouseenter', () => removeBtn.style.color = '#c00');
  removeBtn.addEventListener('mouseleave', () => removeBtn.style.color = '#888');

  removeBtn.addEventListener('click', e => {
    e.stopPropagation();
    clearHighlight();
  });

  item.appendChild(removeBtn);

  const condList = document.createElement('ul');
  condList.style.listStyle = 'none';
  condList.style.paddingLeft = '10px';
  condList.style.marginTop = '4px';

  rows.forEach(r => {
    const li = document.createElement('li');
    const log2fcValue = (r.log2fc < -2 || r.log2fc > 2)
      ? `<strong>${r.log2fc}</strong>`
      : r.log2fc;
    const fdrValue = (r.FDR < 0.05)
      ? `<strong>${r.FDR}</strong>`
      : r.FDR;

    li.innerHTML = `${r.condition}: log₂FC=${log2fcValue} and FDR=${fdrValue}`;
    condList.appendChild(li);
  });

  item.appendChild(condList);

  const { labels, values } = extractCounts(activeGene);

  if (labels.length > 0) {
    const chartContainer = document.createElement("div");
    chartContainer.style.width = "230px";
    chartContainer.style.height = "90px";
    chartContainer.style.marginTop = "10px";

    const canvas2 = document.createElement("canvas");
    canvas2.classList.add("miniChart");
    canvas2.id = `miniChart_${activeGene}`;

    chartContainer.appendChild(canvas2);
    item.insertBefore(chartContainer, condList);

    setTimeout(() => {
      new Chart(canvas2.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "log₂FC",
            data: values,
            borderWidth: 1,
            backgroundColor: 'rgba(153, 102, 255, 0.6)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { maxRotation: 0, minRotation: 0, font: { size: 8 } },
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
            tooltip: { enabled: false }
          },
          layout: { padding: 0 }
        }
      });
    }, 10);
  }

  list.appendChild(item);
}


function updateAnnotation(geneName) {
  const annBox = document.getElementById("annotationText");
  const entry = fullData.find(d => d.gene === geneName);

  if (!entry) {
    annBox.textContent = "No annotation found.";
    return;
  }

  annBox.textContent = entry.annotation && entry.annotation.trim() !== ""
    ? entry.annotation
    : "No annotation available.";
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

    function clearHighlight() {
  activeGene = null;

  if (scatterChart) {
    const dataset = scatterChart.data.datasets[0];
    dataset.pointRadius = dataset.data.map(() => 6);
    dataset.borderWidth = dataset.data.map(() => 1);
    dataset.borderColor = dataset.data.map(() => '#333');
    dataset.backgroundColor = dataset.data.map(d => getColorForLog2FC(d.y));
    scatterChart.update();
  }


  d3.select("#heatmap").selectAll("rect.cell")
    .style("stroke-width", 2)
    .style("stroke", d => d.value < 0.05 ? "#9E1F63" : "none");

  d3.select("#heatmap").selectAll(".col-label")
    .style("font-weight", "normal")
    .style("fill", "black");

  updateSidePanel();
}

    const geneSearchInput = document.getElementById("geneSearch");
    const searchButton = document.getElementById("searchButton");

    geneSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleGeneSearch();
      }
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
      document.getElementById("scatterContainer").scrollIntoView({ behavior: "smooth" });
      highlightGene(query);


    }


    window.addEventListener('load', () => {
      const popup = document.getElementById('popup');
      const closeBtn = document.querySelector('.close');
      const okButton = document.getElementById('okButton');

      popup.style.display = 'block';


      closeBtn.addEventListener('click', () => popup.style.display = 'none');
      okButton.addEventListener('click', () => popup.style.display = 'none');

      window.addEventListener('click', (e) => {
        if (e.target === popup) popup.style.display = 'none';
      });
    });
    function syncSidePanelHeight() {
      const scatter = document.getElementById("scatterContainer");
      const panel = document.getElementById("highlightPanel");
      panel.style.height = scatter.offsetHeight + "px";
    }

    setTimeout(syncSidePanelHeight, 300);
    window.addEventListener("resize", syncSidePanelHeight);
