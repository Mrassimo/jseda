/**
 * Main JavaScript for EDA App
 */

// Global variables
let currentDataId = null;
let currentChartInstance = null;
let modalChartInstance = null;
let correlationMatrixChart = null;
let currentDataColumns = [];

// DOM elements
const uploadForm = document.getElementById('uploadForm');
const csvFileInput = document.getElementById('csvFile');
const uploadSpinner = document.getElementById('uploadSpinner');
const datasetsList = document.getElementById('datasetsList');
const datasetsLoading = document.getElementById('datasetsLoading');
const noDatasets = document.getElementById('noDatasets');
const dataPanel = document.getElementById('dataPanel');
const datasetName = document.getElementById('datasetName');
const datasetInfo = document.getElementById('datasetInfo');
const dataPreview = document.getElementById('dataPreview');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const xColumnSelect = document.getElementById('xColumnSelect');
const yColumnSelect = document.getElementById('yColumnSelect');
const generateVisualizationBtn = document.getElementById('generateVisualizationBtn');
const vizSpinner = document.getElementById('vizSpinner');
const chartContainer = document.getElementById('chartContainer');
const chartCanvas = document.getElementById('chartCanvas');
const savedVisualizations = document.getElementById('savedVisualizations');
const analysisLoading = document.getElementById('analysisLoading');
const analysisContent = document.getElementById('analysisContent');
const summaryContent = document.getElementById('summaryContent');
const statsContent = document.getElementById('statsContent');
const correlationsContent = document.getElementById('correlationsContent');
const insightsContent = document.getElementById('insightsContent');
const correlationMatrixCanvas = document.getElementById('correlationMatrixCanvas');
const recommendationsList = document.getElementById('recommendationsList');
const newVisualizationBtn = document.getElementById('newVisualizationBtn');
const vizPanel = document.getElementById('vizPanel');
const modalChartCanvas = document.getElementById('modalChartCanvas');
const chartModalTitle = document.getElementById('chartModalTitle');
const chartModal = new bootstrap.Modal(document.getElementById('chartModal'));

// Load datasets on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDatasets();
  setupEventListeners();
  
  // Check URL for dataId parameter
  const urlParams = new URLSearchParams(window.location.search);
  const dataId = urlParams.get('data');
  if (dataId) {
    loadDataset(dataId);
  }
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Upload form submission
  uploadForm.addEventListener('submit', handleFileUpload);
  
  // Generate visualization button
  generateVisualizationBtn.addEventListener('click', generateVisualization);
  
  // Chart type change
  chartTypeSelect.addEventListener('change', updateColumnSelectors);
  
  // New visualization button
  newVisualizationBtn.addEventListener('click', showVisualizationPanel);
  
  // Setup tab activation events
  document.getElementById('visualize-tab').addEventListener('click', () => {
    if (currentDataId) {
      loadRecommendations(currentDataId);
      loadVisualizations(currentDataId);
    }
  });
  
  document.getElementById('analyze-tab').addEventListener('click', () => {
    if (currentDataId) {
      loadAnalysis(currentDataId);
    }
  });
}

/**
 * Handle file upload
 * @param {Event} event Form submission event
 */
async function handleFileUpload(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a CSV file');
    return;
  }
  
  // Show spinner
  uploadSpinner.style.display = 'inline-block';
  
  const formData = new FormData();
  formData.append('csvFile', file);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error uploading file');
    }
    
    const result = await response.json();
    
    // Load the new dataset
    loadDataset(result.dataId);
    
    // Refresh datasets list
    loadDatasets();
    
    // Reset file input
    fileInput.value = '';
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
  } finally {
    // Hide spinner
    uploadSpinner.style.display = 'none';
  }
}

/**
 * Load datasets list
 */
async function loadDatasets() {
  try {
    datasetsLoading.style.display = 'block';
    noDatasets.classList.add('hidden');
    datasetsList.innerHTML = '';
    
    const response = await fetch('/api/datasets');
    const datasets = await response.json();
    
    if (datasets.length === 0) {
      noDatasets.classList.remove('hidden');
    } else {
      const listHTML = datasets.map(dataset => `
        <button type="button" class="list-group-item list-group-item-action" data-id="${dataset.id}">
          <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1">${dataset.name}</h5>
            <small>${new Date(dataset.uploadDate).toLocaleString()}</small>
          </div>
          <p class="mb-1">
            Status: <span class="badge ${dataset.status === 'ready' ? 'bg-success' : (dataset.status === 'error' ? 'bg-danger' : 'bg-warning')}">${dataset.status}</span>
            ${dataset.rowCount ? `Rows: ${dataset.rowCount}` : ''}
            ${dataset.columnCount ? `Columns: ${dataset.columnCount}` : ''}
          </p>
        </button>
      `).join('');
      
      datasetsList.innerHTML = listHTML;
      
      // Add click event listeners
      document.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', () => {
          const dataId = item.getAttribute('data-id');
          loadDataset(dataId);
        });
      });
    }
  } catch (error) {
    console.error('Error loading datasets:', error);
    datasetsList.innerHTML = `<div class="alert alert-danger">Error loading datasets: ${error.message}</div>`;
  } finally {
    datasetsLoading.style.display = 'none';
  }
}

/**
 * Load a specific dataset
 * @param {string} dataId Dataset ID
 */
async function loadDataset(dataId) {
  try {
    // Show loading state
    datasetInfo.textContent = 'Loading dataset information...';
    dataPanel.classList.remove('hidden');
    
    // Get dataset information
    const response = await fetch(`/api/data/${dataId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load dataset');
    }
    
    const data = await response.json();
    
    // Update global variable
    currentDataId = dataId;
    
    // Update UI
    datasetName.textContent = data.name;
    
    if (data.status === 'ready') {
      const summary = data.summary;
      datasetInfo.innerHTML = `
        <strong>Status:</strong> <span class="badge bg-success">Ready</span>
        <strong>Rows:</strong> ${summary.rowCount.toLocaleString()}
        <strong>Columns:</strong> ${summary.columns.length}
      `;
      
      // Store columns for later use
      currentDataColumns = summary.columns;
      
      // Load data preview
      loadDataPreview(dataId);
      
      // Update column selectors
      populateColumnSelectors(summary.columns);
    } else if (data.status === 'error') {
      datasetInfo.innerHTML = `
        <strong>Status:</strong> <span class="badge bg-danger">Error</span>
        <div class="alert alert-danger mt-2">${data.error}</div>
      `;
    } else {
      datasetInfo.innerHTML = `
        <strong>Status:</strong> <span class="badge bg-warning">Processing</span>
        <div class="progress mt-2">
          <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
        </div>
      `;
      
      // Poll for status updates
      setTimeout(() => loadDataset(dataId), 2000);
    }
    
    // Activate the preview tab
    const previewTab = document.querySelector('#dataTabs button[data-bs-target="#preview-tab-pane"]');
    const bsTab = new bootstrap.Tab(previewTab);
    bsTab.show();
  } catch (error) {
    console.error('Error loading dataset:', error);
    datasetInfo.innerHTML = `<div class="alert alert-danger">Error loading dataset: ${error.message}</div>`;
  }
}

/**
 * Load data preview
 * @param {string} dataId Dataset ID
 */
async function loadDataPreview(dataId) {
  try {
    dataPreview.innerHTML = '<p class="text-center">Loading preview...</p>';
    
    const response = await fetch(`/api/data/${dataId}/sample?limit=100`);
    
    if (!response.ok) {
      throw new Error('Failed to load data preview');
    }
    
    const data = await response.json();
    const sample = data.sample;
    
    if (!sample || sample.length === 0) {
      dataPreview.innerHTML = '<p class="text-center">No data available</p>';
      return;
    }
    
    // Create table
    const columns = Object.keys(sample[0]);
    
    const tableHTML = `
      <div class="table-responsive">
        <table class="table table-striped table-sm">
          <thead>
            <tr>
              ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sample.map(row => `
              <tr>
                ${columns.map(col => `<td>${row[col] === null || row[col] === undefined ? '' : row[col]}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    dataPreview.innerHTML = tableHTML;
  } catch (error) {
    console.error('Error loading data preview:', error);
    dataPreview.innerHTML = `<div class="alert alert-danger">Error loading preview: ${error.message}</div>`;
  }
}

/**
 * Populate column selectors
 * @param {Array} columns Column names
 */
function populateColumnSelectors(columns) {
  if (!columns || columns.length === 0) return;
  
  // Clear existing options
  xColumnSelect.innerHTML = '';
  yColumnSelect.innerHTML = '';
  
  // Add options
  columns.forEach(column => {
    xColumnSelect.add(new Option(column, column));
    yColumnSelect.add(new Option(column, column));
  });
  
  // Select different columns by default if possible
  if (columns.length > 1) {
    yColumnSelect.selectedIndex = 1;
  }
  
  // Update based on chart type
  updateColumnSelectors();
}

/**
 * Update column selectors based on chart type
 */
function updateColumnSelectors() {
  // Different chart types require different columns
  const chartType = chartTypeSelect.value;
  
  // Simple heuristic for now, could be improved
  if (chartType === 'pie' || chartType === 'histogram') {
    // Hide Y axis selector for pie charts and histograms
    yColumnSelect.parentElement.style.display = 'none';
  } else {
    // Show Y axis selector for other chart types
    yColumnSelect.parentElement.style.display = 'block';
  }
}

/**
 * Show visualization panel
 */
function showVisualizationPanel() {
  vizPanel.classList.remove('hidden');
  chartContainer.classList.add('hidden');
}

/**
 * Generate visualization
 */
async function generateVisualization() {
  if (!currentDataId) return;
  
  try {
    // Show spinner
    vizSpinner.style.display = 'inline-block';
    
    // Get selected options
    const chartType = chartTypeSelect.value;
    const xColumn = xColumnSelect.value;
    const yColumn = chartType === 'pie' || chartType === 'histogram' ? null : yColumnSelect.value;
    
    // Prepare request
    const options = {
      chartType,
      xColumn,
      title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`
    };
    
    if (yColumn) {
      options.yColumn = yColumn;
    }
    
    // Send request
    const response = await fetch('/api/visualize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dataId: currentDataId,
        options
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating visualization');
    }
    
    const result = await response.json();
    
    // Display chart
    displayChart(result.spec);
    
    // Reload saved visualizations
    loadVisualizations(currentDataId);
  } catch (error) {
    console.error('Error generating visualization:', error);
    alert(`Error generating visualization: ${error.message}`);
  } finally {
    // Hide spinner
    vizSpinner.style.display = 'none';
  }
}

/**
 * Display chart
 * @param {Object} spec Chart specification
 */
function displayChart(spec) {
  // Show chart container
  chartContainer.classList.remove('hidden');
  
  // Clear previous chart if any
  if (currentChartInstance) {
    currentChartInstance.destroy();
  }
  
  // Get chart config based on spec
  const chartConfig = createChartConfig(spec);
  
  // Create new chart
  currentChartInstance = new Chart(chartCanvas, chartConfig);
}

/**
 * Create Chart.js configuration from chart specification
 * @param {Object} spec Chart specification
 * @returns {Object} Chart.js configuration
 */
function createChartConfig(spec) {
  const { type, data, config } = spec;
  
  // Default config
  const chartConfig = {
    type: mapChartType(type),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: config.title || 'Chart'
        },
        tooltip: {
          enabled: true
        }
      }
    }
  };
  
  // Map data based on chart type
  switch (type) {
    case 'bar':
    case 'horizontalBar':
      chartConfig.data = {
        labels: data.map(item => item[config.categoryColumn]),
        datasets: [{
          label: config.valueColumn,
          data: data.map(item => item[config.valueColumn]),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      };
      
      // For horizontal bar charts
      if (type === 'horizontalBar') {
        chartConfig.options.indexAxis = 'y';
      }
      break;
      
    case 'line':
      chartConfig.data = {
        labels: data.map(item => {
          // Format dates if this is a time series
          if (config.isTimeSeries) {
            return new Date(item[config.xAxisColumn]).toLocaleDateString();
          }
          return item[config.xAxisColumn];
        }),
        datasets: config.yAxisColumns.map((column, index) => ({
          label: column,
          data: data.map(item => item[column]),
          borderColor: getLineColor(index),
          backgroundColor: getLineColor(index, 0.1),
          tension: 0.1
        }))
      };
      
      // For time series
      if (config.isTimeSeries) {
        chartConfig.options.scales = {
          x: {
            title: {
              display: true,
              text: config.xAxisLabel
            }
          },
          y: {
            title: {
              display: true,
              text: config.yAxisLabel
            }
          }
        };
      }
      break;
      
    case 'scatter':
      chartConfig.data = {
        datasets: [{
          label: `${config.yAxisColumn} vs ${config.xAxisColumn}`,
          data: data.map(item => ({
            x: item[config.xAxisColumn],
            y: item[config.yAxisColumn]
          })),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      };
      
      chartConfig.options.scales = {
        x: {
          title: {
            display: true,
            text: config.xAxisLabel
          }
        },
        y: {
          title: {
            display: true,
            text: config.yAxisLabel
          }
        }
      };
      break;
      
    case 'pie':
      chartConfig.data = {
        labels: data.map(item => item[config.categoryColumn]),
        datasets: [{
          data: data.map(item => item[config.valueColumn]),
          backgroundColor: getPieColors(data.length)
        }]
      };
      break;
      
    case 'histogram':
      chartConfig.data = {
        labels: data.map(item => item.bin),
        datasets: [{
          label: 'Frequency',
          data: data.map(item => item.frequency),
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
          borderColor: 'rgb(153, 102, 255)',
          borderWidth: 1
        }]
      };
      
      chartConfig.options.scales = {
        x: {
          title: {
            display: true,
            text: config.xAxisLabel
          }
        },
        y: {
          title: {
            display: true,
            text: config.yAxisLabel
          }
        }
      };
      break;
      
    case 'heatmap':
      // Transform data for heatmap
      const uniqueRows = [...new Set(data.map(item => item[config.rowColumn]))];
      const uniqueCols = [...new Set(data.map(item => item[config.columnColumn]))];
      
      const heatmapData = [];
      uniqueRows.forEach((row, rowIndex) => {
        uniqueCols.forEach((col, colIndex) => {
          const item = data.find(d => 
            d[config.rowColumn] === row && 
            d[config.columnColumn] === col
          );
          
          if (item) {
            heatmapData.push({
              x: colIndex,
              y: rowIndex,
              v: item[config.valueColumn]
            });
          }
        });
      });
      
      chartConfig.type = 'scatter';
      chartConfig.data = {
        datasets: [{
          label: 'Heatmap',
          data: heatmapData.map(item => ({
            x: item.x,
            y: item.y
          })),
          backgroundColor: heatmapData.map(item => 
            getHeatmapColor(item.v, 
              Math.min(...heatmapData.map(d => d.v)),
              Math.max(...heatmapData.map(d => d.v))
            )
          ),
          pointRadius: 15,
          pointHoverRadius: 20
        }]
      };
      
      chartConfig.options.scales = {
        x: {
          type: 'category',
          labels: uniqueCols,
          title: {
            display: true,
            text: config.columnColumn
          }
        },
        y: {
          type: 'category',
          labels: uniqueRows,
          title: {
            display: true,
            text: config.rowColumn
          },
          reverse: true
        }
      };
      
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const value = heatmapData[index].v;
            return `Value: ${value}`;
          }
        }
      };
      break;
      
    default:
      // Fall back to basic display for other chart types
      chartConfig.data = {
        labels: data.map((_, index) => `Item ${index + 1}`),
        datasets: [{
          label: 'Data',
          data: data.map(item => Object.values(item)[0]),
          backgroundColor: 'rgba(75, 192, 192, 0.5)'
        }]
      };
  }
  
  return chartConfig;
}

/**
 * Map chart type to Chart.js type
 * @param {string} type Chart type from API
 * @returns {string} Chart.js chart type
 */
function mapChartType(type) {
  const typeMap = {
    'bar': 'bar',
    'horizontalBar': 'bar', // with indexAxis: 'y'
    'line': 'line',
    'scatter': 'scatter',
    'bubble': 'bubble',
    'pie': 'pie',
    'histogram': 'bar',
    'heatmap': 'scatter', // with custom rendering
    'boxplot': 'boxplot', // requires additional plugin
    'correlationMatrix': 'matrix', // custom rendering
    'treemap': 'treemap', // requires additional plugin
    'table': 'table' // not a chart, needs custom handling
  };
  
  return typeMap[type] || 'bar';
}

/**
 * Get color for line chart
 * @param {number} index Dataset index
 * @param {number} alpha Opacity (0-1)
 * @returns {string} Color string
 */
function getLineColor(index, alpha = 1) {
  const colors = [
    `rgba(54, 162, 235, ${alpha})`,
    `rgba(255, 99, 132, ${alpha})`,
    `rgba(75, 192, 192, ${alpha})`,
    `rgba(255, 159, 64, ${alpha})`,
    `rgba(153, 102, 255, ${alpha})`,
    `rgba(255, 205, 86, ${alpha})`,
    `rgba(201, 203, 207, ${alpha})`
  ];
  
  return colors[index % colors.length];
}

/**
 * Get colors for pie chart
 * @param {number} count Number of segments
 * @returns {Array} Array of color strings
 */
function getPieColors(count) {
  const baseColors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 205, 86, 0.8)',
    'rgba(201, 203, 207, 0.8)'
  ];
  
  // If we need more colors than in the base set, generate them
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  const colors = [...baseColors];
  
  // Generate additional colors
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137) % 360; // Use golden angle for nice distribution
    colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
  }
  
  return colors;
}

/**
 * Get color for heatmap based on value
 * @param {number} value Value
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @returns {string} Color string
 */
function getHeatmapColor(value, min, max) {
  // Normalize value between 0 and 1
  const normalized = (value - min) / (max - min || 1);
  
  // Get color based on normalized value (blue to red gradient)
  const r = Math.round(normalized * 255);
  const b = Math.round((1 - normalized) * 255);
  const g = Math.round(100 - Math.abs(normalized - 0.5) * 200);
  
  return `rgba(${r}, ${g}, ${b}, 0.7)`;
}

/**
 * Load saved visualizations
 * @param {string} dataId Dataset ID
 */
async function loadVisualizations(dataId) {
  try {
    savedVisualizations.innerHTML = '<p class="text-center">Loading visualizations...</p>';
    
    const response = await fetch(`/api/visualize/${dataId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load visualizations');
    }
    
    const data = await response.json();
    
    if (!data.visualizations || data.visualizations.length === 0) {
      savedVisualizations.innerHTML = '<p class="text-center">No saved visualizations</p>';
      return;
    }
    
    // Create list of visualizations
    const listHTML = data.visualizations.map(viz => `
      <button type="button" class="list-group-item list-group-item-action" data-id="${viz.id}">
        <div class="d-flex w-100 justify-content-between">
          <h5 class="mb-1">${viz.title}</h5>
          <small>${new Date(viz.createdAt).toLocaleString()}</small>
        </div>
        <p class="mb-1">Chart Type: ${viz.type}</p>
      </button>
    `).join('');
    
    savedVisualizations.innerHTML = listHTML;
    
    // Add click event listeners
    document.querySelectorAll('#savedVisualizations .list-group-item').forEach(item => {
      item.addEventListener('click', () => {
        const vizId = item.getAttribute('data-id');
        loadVisualization(dataId, vizId);
      });
    });
  } catch (error) {
    console.error('Error loading visualizations:', error);
    savedVisualizations.innerHTML = `<div class="alert alert-danger">Error loading visualizations: ${error.message}</div>`;
  }
}

/**
 * Load a specific visualization
 * @param {string} dataId Dataset ID
 * @param {string} vizId Visualization ID
 */
async function loadVisualization(dataId, vizId) {
  try {
    const response = await fetch(`/api/visualize/${dataId}/${vizId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load visualization');
    }
    
    const data = await response.json();
    
    // Display in modal
    displayModalChart(data.spec);
    
    // Show modal
    chartModalTitle.textContent = data.spec.config.title || 'Visualization';
    chartModal.show();
  } catch (error) {
    console.error('Error loading visualization:', error);
    alert(`Error loading visualization: ${error.message}`);
  }
}

/**
 * Display chart in modal
 * @param {Object} spec Chart specification
 */
function displayModalChart(spec) {
  // Clear previous chart if any
  if (modalChartInstance) {
    modalChartInstance.destroy();
  }
  
  // Get chart config based on spec
  const chartConfig = createChartConfig(spec);
  
  // Create new chart
  modalChartInstance = new Chart(modalChartCanvas, chartConfig);
}

/**
 * Load recommendations
 * @param {string} dataId Dataset ID
 */
async function loadRecommendations(dataId) {
  try {
    recommendationsList.innerHTML = '<p class="text-center">Loading recommendations...</p>';
    
    const response = await fetch(`/api/recommend/${dataId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load recommendations');
    }
    
    const data = await response.json();
    
    if (!data.recommendations || data.recommendations.length === 0) {
      recommendationsList.innerHTML = '<p class="text-center">No recommendations available</p>';
      return;
    }
    
    // Create cards for recommendations
    const cardsHTML = data.recommendations.map((rec, index) => `
      <div class="col-md-4 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${rec.config.title}</h5>
            <p class="card-text">
              <strong>Chart Type:</strong> ${rec.type}<br>
              <strong>Priority:</strong> <span class="badge ${rec.priority === 'high' ? 'bg-danger' : (rec.priority === 'medium' ? 'bg-warning' : 'bg-info')}">${rec.priority}</span>
            </p>
            <p class="card-text small">${rec.config.reason || ''}</p>
            <button class="btn btn-primary btn-sm use-recommendation" data-index="${index}">Use This</button>
          </div>
        </div>
      </div>
    `).join('');
    
    recommendationsList.innerHTML = cardsHTML;
    
    // Store recommendations for later use
    window.recommendations = data.recommendations;
    
    // Add click event listeners
    document.querySelectorAll('.use-recommendation').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-index'));
        useRecommendation(index);
      });
    });
  } catch (error) {
    console.error('Error loading recommendations:', error);
    recommendationsList.innerHTML = `<div class="alert alert-danger">Error loading recommendations: ${error.message}</div>`;
  }
}

/**
 * Use a recommendation
 * @param {number} index Recommendation index
 */
async function useRecommendation(index) {
  if (!window.recommendations || !window.recommendations[index]) return;
  
  try {
    // Get recommendation
    const rec = window.recommendations[index];
    
    // Send request
    const response = await fetch('/api/visualize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dataId: currentDataId,
        options: {
          chartType: rec.type,
          ...rec.config
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error generating visualization');
    }
    
    const result = await response.json();
    
    // Display chart
    displayChart(result.spec);
    
    // Hide recommendation panel
    vizPanel.classList.add('hidden');
    
    // Reload saved visualizations
    loadVisualizations(currentDataId);
  } catch (error) {
    console.error('Error using recommendation:', error);
    alert(`Error generating visualization: ${error.message}`);
  }
}

/**
 * Load dataset analysis
 * @param {string} dataId Dataset ID
 */
async function loadAnalysis(dataId) {
  try {
    // Show loading state
    analysisLoading.style.display = 'block';
    analysisContent.classList.add('hidden');
    
    const response = await fetch(`/api/analyze/${dataId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load analysis');
    }
    
    const analysis = await response.json();
    
    // Update UI
    displayAnalysis(analysis);
    
    // Hide loading, show content
    analysisLoading.style.display = 'none';
    analysisContent.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading analysis:', error);
    analysisLoading.style.display = 'none';
    analysisContent.innerHTML = `<div class="alert alert-danger">Error loading analysis: ${error.message}</div>`;
  }
}

/**
 * Display analysis results
 * @param {Object} analysis Analysis results
 */
function displayAnalysis(analysis) {
  // Display summary
  displaySummary(analysis);
  
  // Display statistics
  displayStatistics(analysis);
  
  // Display correlations
  displayCorrelations(analysis);
  
  // Display insights
  displayInsights(analysis);
}

/**
 * Display dataset summary
 * @param {Object} analysis Analysis results
 */
function displaySummary(analysis) {
  const summary = analysis.summary;
  const metadata = analysis.metadata;
  
  let html = `
    <div class="row">
      <div class="col-md-6">
        <h6>Dataset Overview</h6>
        <ul class="list-group list-group-flush">
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Records
            <span class="badge bg-primary rounded-pill">${summary.rowCount.toLocaleString()}</span>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Features
            <span class="badge bg-primary rounded-pill">${summary.columnCount}</span>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Numeric Features
            <span class="badge bg-info rounded-pill">${Object.values(summary.dataTypes).filter(type => type === 'numeric').length}</span>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Categorical Features
            <span class="badge bg-info rounded-pill">${Object.values(summary.dataTypes).filter(type => type === 'categorical').length}</span>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Temporal Features
            <span class="badge bg-info rounded-pill">${Object.values(summary.dataTypes).filter(type => type === 'temporal').length}</span>
          </li>
        </ul>
      </div>
      <div class="col-md-6">
        <h6>Feature Types</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
  `;
  
  // Add rows for each feature
  Object.entries(summary.dataTypes).forEach(([feature, type]) => {
    const typeClass = type === 'numeric' ? 'bg-info' :
                       type === 'categorical' ? 'bg-warning' :
                       type === 'temporal' ? 'bg-success' : 'bg-secondary';
    
    html += `
      <tr>
        <td>${feature}</td>
        <td><span class="badge ${typeClass}">${type}</span></td>
      </tr>
    `;
  });
  
  html += `
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  // Display summary insights if available
  if (metadata && metadata.insights && metadata.insights.summary) {
    html += `
      <div class="mt-4">
        <h6>Summary Insights</h6>
        <ul class="list-group">
          ${metadata.insights.summary.map(insight => `
            <li class="list-group-item">${insight}</li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  summaryContent.innerHTML = html;
}

/**
 * Display statistics
 * @param {Object} analysis Analysis results
 */
function displayStatistics(analysis) {
  const statistics = analysis.statistics;
  
  if (!statistics) {
    statsContent.innerHTML = '<p class="text-center">No statistics available</p>';
    return;
  }
  
  let html = `
    <ul class="nav nav-tabs" id="statsTypeTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="numeric-tab" data-bs-toggle="tab" data-bs-target="#numeric-content" type="button" role="tab">Numeric</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="categorical-tab" data-bs-toggle="tab" data-bs-target="#categorical-content" type="button" role="tab">Categorical</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="temporal-tab" data-bs-toggle="tab" data-bs-target="#temporal-content" type="button" role="tab">Temporal</button>
      </li>
    </ul>
    
    <div class="tab-content" id="statsTypeContent">
      <div class="tab-pane fade show active" id="numeric-content" role="tabpanel" tabindex="0">
        ${displayNumericStats(statistics)}
      </div>
      <div class="tab-pane fade" id="categorical-content" role="tabpanel" tabindex="0">
        ${displayCategoricalStats(statistics)}
      </div>
      <div class="tab-pane fade" id="temporal-content" role="tabpanel" tabindex="0">
        ${displayTemporalStats(statistics)}
      </div>
    </div>
  `;
  
  statsContent.innerHTML = html;
}

/**
 * Display numeric statistics
 * @param {Object} statistics Statistics object
 * @returns {string} HTML content
 */
function displayNumericStats(statistics) {
  // Find numeric columns
  const numericColumns = Object.keys(statistics).filter(col => 
    statistics[col].type === 'numeric'
  );
  
  if (numericColumns.length === 0) {
    return '<p class="text-center">No numeric features available</p>';
  }
  
  let html = '';
  
  numericColumns.forEach(column => {
    const stats = statistics[column];
    const basic = stats.basic;
    const advanced = stats.advanced;
    
    html += `
      <div class="card mb-3">
        <div class="card-header">${column}</div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h6>Basic Statistics</h6>
              <table class="table table-sm">
                <tbody>
                  <tr>
                    <td>Count</td>
                    <td>${basic.count.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Min</td>
                    <td>${basic.min.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                  </tr>
                  <tr>
                    <td>Max</td>
                    <td>${basic.max.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                  </tr>
                  <tr>
                    <td>Range</td>
                    <td>${basic.range.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                  </tr>
                  <tr>
                    <td>Mean</td>
                    <td>${basic.mean.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                  </tr>
                  <tr>
                    <td>Median</td>
                    <td>${basic.median.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                  </tr>
                  <tr>
                    <td>Standard Deviation</td>
                    <td>${basic.standard_deviation.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="col-md-6">
              <h6>Advanced Statistics</h6>
              <table class="table table-sm">
                <tbody>
                  <tr>
                    <td>Skewness</td>
                    <td>${advanced && advanced.skewness !== null ? advanced.skewness.toLocaleString(undefined, {maximumFractionDigits: 4}) : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Kurtosis</td>
                    <td>${advanced && advanced.kurtosis !== null ? advanced.kurtosis.toLocaleString(undefined, {maximumFractionDigits: 4}) : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Q1 (25th Percentile)</td>
                    <td>${advanced && advanced.quantiles ? advanced.quantiles.q1.toLocaleString(undefined, {maximumFractionDigits: 4}) : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Q3 (75th Percentile)</td>
                    <td>${advanced && advanced.quantiles ? advanced.quantiles.q3.toLocaleString(undefined, {maximumFractionDigits: 4}) : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Outliers Count</td>
                    <td>${advanced && advanced.outliers ? advanced.outliers.count.toLocaleString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Outliers Percentage</td>
                    <td>${advanced && advanced.outliers ? advanced.outliers.percentage + '%' : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Distribution Shape</td>
                    <td>${advanced && advanced.distribution ? advanced.distribution.shape : 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  return html;
}

/**
 * Display categorical statistics
 * @param {Object} statistics Statistics object
 * @returns {string} HTML content
 */
function displayCategoricalStats(statistics) {
  // Find categorical columns
  const categoricalColumns = Object.keys(statistics).filter(col => 
    statistics[col].type === 'categorical'
  );
  
  if (categoricalColumns.length === 0) {
    return '<p class="text-center">No categorical features available</p>';
  }
  
  let html = '';
  
  categoricalColumns.forEach(column => {
    const stats = statistics[column];
    const frequency = stats.frequency;
    
    if (!frequency) {
      return;
    }
    
    html += `
      <div class="card mb-3">
        <div class="card-header">${column}</div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h6>Basic Statistics</h6>
              <table class="table table-sm">
                <tbody>
                  <tr>
                    <td>Count</td>
                    <td>${frequency.count.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Unique Values</td>
                    <td>${frequency.unique_count.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Most Frequent</td>
                    <td>${frequency.most_frequent ? frequency.most_frequent.value + ' (' + frequency.most_frequent.count + ' times, ' + frequency.most_frequent.percentage + '%)' : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Least Frequent</td>
                    <td>${frequency.least_frequent ? frequency.least_frequent.value + ' (' + frequency.least_frequent.count + ' times, ' + frequency.least_frequent.percentage + '%)' : 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="col-md-6">
              <h6>Top Categories</h6>
              <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Value</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
    `;
    
    // Add rows for each category
    if (frequency.value_counts) {
      Object.entries(frequency.value_counts).forEach(([value, data]) => {
        html += `
          <tr>
            <td>${value === '__other__' ? '<i>Other</i>' : value}</td>
            <td>${data.count.toLocaleString()}</td>
            <td>${data.percentage}%</td>
          </tr>
        `;
      });
    }
    
    html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  return html;
}

/**
 * Display temporal statistics
 * @param {Object} statistics Statistics object
 * @returns {string} HTML content
 */
function displayTemporalStats(statistics) {
  // Find temporal columns
  const temporalColumns = Object.keys(statistics).filter(col => 
    statistics[col].type === 'temporal'
  );
  
  if (temporalColumns.length === 0) {
    return '<p class="text-center">No temporal features available</p>';
  }
  
  let html = '';
  
  temporalColumns.forEach(column => {
    const stats = statistics[column];
    const timeRange = stats.time_range;
    
    html += `
      <div class="card mb-3">
        <div class="card-header">${column}</div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-12">
              <h6>Time Range</h6>
              <table class="table table-sm">
                <tbody>
                  <tr>
                    <td>Earliest Date</td>
                    <td>${timeRange ? new Date(timeRange.min).toLocaleString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Latest Date</td>
                    <td>${timeRange ? new Date(timeRange.max).toLocaleString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Range (days)</td>
                    <td>${stats.basic && stats.basic.range ? (stats.basic.range / (1000 * 60 * 60 * 24)).toFixed(2) : 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  return html;
}

/**
 * Display correlations
 * @param {Object} analysis Analysis results
 */
function displayCorrelations(analysis) {
  if (!analysis.correlations) {
    correlationsContent.innerHTML = '<p class="text-center">No correlation data available</p>';
    return;
  }
  
  const { matrix, correlated_pairs } = analysis.correlations;
  
  let html = '';
  
  // Display highly correlated pairs
  if (correlated_pairs && correlated_pairs.length > 0) {
    html += `
      <div class="mb-4">
        <h6>Significant Correlations</h6>
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Feature 1</th>
                <th>Feature 2</th>
                <th>Correlation</th>
                <th>Strength</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    correlated_pairs.forEach(pair => {
      const correlationClass = Math.abs(pair.correlation) > 0.9 ? 'table-danger' :
                              Math.abs(pair.correlation) > 0.7 ? 'table-warning' : 'table-info';
      
      html += `
        <tr class="${correlationClass}">
          <td>${pair.feature1}</td>
          <td>${pair.feature2}</td>
          <td>${pair.correlation.toFixed(4)}</td>
          <td>${pair.strength} (${pair.magnitude})</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  // Add correlation matrix visualization
  html += `
    <div class="mb-4">
      <h6>Correlation Matrix</h6>
      <div class="correlation-matrix-container"></div>
    </div>
  `;
  
  correlationsContent.innerHTML = html;
  
  // Create correlation matrix visualization
  createCorrelationMatrix(matrix);
}

/**
 * Create correlation matrix visualization
 * @param {Object} matrix Correlation matrix
 */
function createCorrelationMatrix(matrix) {
  if (!matrix) return;
  
  // Convert matrix to Chart.js format
  const columns = Object.keys(matrix);
  
  if (columns.length === 0) return;
  
  // Create data array
  const data = [];
  
  columns.forEach((col1, i) => {
    columns.forEach((col2, j) => {
      data.push({
        x: j,
        y: i,
        correlation: matrix[col1][col2] || 0
      });
    });
  });
  
  // Clear previous chart if any
  if (correlationMatrixChart) {
    correlationMatrixChart.destroy();
  }
  
  // Create chart config
  const chartConfig = {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Correlation',
        data: data.map(item => ({
          x: item.x,
          y: item.y
        })),
        backgroundColor: data.map(item => getCorrelationColor(item.correlation)),
        pointRadius: 15,
        pointHoverRadius: 20
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category',
          labels: columns,
          title: {
            display: true,
            text: 'Features'
          }
        },
        y: {
          type: 'category',
          labels: columns,
          title: {
            display: true,
            text: 'Features'
          },
          reverse: true
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const index = context.dataIndex;
              const value = data[index].correlation;
              return `Correlation: ${value.toFixed(4)}`;
            }
          }
        }
      }
    }
  };
  
  // Create chart
  correlationMatrixChart = new Chart(correlationMatrixCanvas, chartConfig);
}

/**
 * Get color for correlation value
 * @param {number} correlation Correlation value (-1 to 1)
 * @returns {string} Color string
 */
function getCorrelationColor(correlation) {
  // Normalize between 0 and 1
  const normalized = (correlation + 1) / 2;
  
  // Get color (blue for negative, white for zero, red for positive)
  if (correlation < 0) {
    const intensity = Math.round(255 * (1 - Math.abs(correlation)));
    return `rgba(0, 0, 255, ${Math.abs(correlation)})`;
  } else if (correlation > 0) {
    const intensity = Math.round(255 * (1 - correlation));
    return `rgba(255, 0, 0, ${correlation})`;
  } else {
    return 'rgba(200, 200, 200, 0.5)';
  }
}

/**
 * Display insights
 * @param {Object} analysis Analysis results
 */
function displayInsights(analysis) {
  if (!analysis.metadata || !analysis.metadata.insights) {
    insightsContent.innerHTML = '<p class="text-center">No insights available</p>';
    return;
  }
  
  const insights = analysis.metadata.insights;
  
  let html = '';
  
  // Display quality issues
  if (insights.quality_issues && insights.quality_issues.length > 0) {
    html += `
      <div class="mb-4">
        <h6>Data Quality Issues</h6>
        <div class="list-group">
    `;
    
    insights.quality_issues.forEach(issue => {
      const severityClass = issue.severity === 'high' ? 'list-group-item-danger' :
                            issue.severity === 'medium' ? 'list-group-item-warning' :
                            'list-group-item-info';
      
      html += `
        <div class="list-group-item ${severityClass}">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${issue.feature}</h6>
            <small class="text-muted">${issue.issue.replace('_', ' ')}</small>
          </div>
          <p class="mb-1">${issue.description}</p>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // Display distribution insights
  if (insights.distribution_insights && insights.distribution_insights.length > 0) {
    html += `
      <div class="mb-4">
        <h6>Distribution Insights</h6>
        <div class="list-group">
    `;
    
    insights.distribution_insights.forEach(insight => {
      html += `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${insight.feature}</h6>
            <small class="text-muted">${insight.insight.replace('_', ' ')}</small>
          </div>
          <p class="mb-1">${insight.description}</p>
          ${insight.recommendation ? `<small class="text-muted">Recommendation: ${insight.recommendation}</small>` : ''}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // Display correlation insights
  if (insights.correlation_insights && insights.correlation_insights.length > 0) {
    html += `
      <div class="mb-4">
        <h6>Correlation Insights</h6>
        <div class="list-group">
    `;
    
    insights.correlation_insights.forEach(insight => {
      html += `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${insight.features.join(' & ')}</h6>
            <small class="text-muted">${insight.insight.replace('_', ' ')}</small>
          </div>
          <p class="mb-1">${insight.description}</p>
          ${insight.recommendation ? `<small class="text-muted">Recommendation: ${insight.recommendation}</small>` : ''}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // Display recommendations
  if (insights.recommendations && insights.recommendations.length > 0) {
    html += `
      <div class="mb-4">
        <h6>Key Recommendations</h6>
        <div class="list-group">
    `;
    
    insights.recommendations.forEach(rec => {
      const priorityClass = rec.priority === 'high' ? 'list-group-item-danger' :
                            rec.priority === 'medium' ? 'list-group-item-warning' :
                            'list-group-item-info';
      
      html += `
        <div class="list-group-item ${priorityClass}">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${rec.type.replace('_', ' ')}</h6>
            <small class="text-muted">Priority: ${rec.priority}</small>
          </div>
          <p class="mb-1">${rec.description}</p>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  insightsContent.innerHTML = html || '<p class="text-center">No insights available</p>';
}
