/**
 * Modern Dashboard JavaScript for EDA App
 */

// Global state
let currentDataId = null;
let currentData = null;
let currentCharts = new Map();
let currentAnalysis = null;

// DOM Elements
const elements = {
  uploadForm: document.getElementById('uploadForm'),
  csvFile: document.getElementById('csvFile'),
  dataPanel: document.getElementById('dataPanel'),
  datasetName: document.getElementById('datasetName'),
  datasetInfo: document.getElementById('datasetInfo'),
  dataPreview: document.getElementById('dataPreview'),
  statsGrid: document.getElementById('statsGrid'),
  chartTypeSelect: document.getElementById('chartTypeSelect'),
  xColumnSelect: document.getElementById('xColumnSelect'),
  yColumnSelect: document.getElementById('yColumnSelect'),
  generateVisualizationBtn: document.getElementById('generateVisualizationBtn'),
  chartCanvas: document.getElementById('chartCanvas'),
  savedVisualizations: document.getElementById('savedVisualizations'),
  summaryContent: document.getElementById('summaryContent'),
  statsContent: document.getElementById('statsContent'),
  correlationsContent: document.getElementById('correlationsContent'),
  insightsContent: document.getElementById('insightsContent'),
  correlationMatrixCanvas: document.getElementById('correlationMatrixCanvas'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingMessage: document.getElementById('loadingMessage')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard initialized');
  setupEventListeners();
  loadDatasets();
  checkUrlParams();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Upload form
  elements.uploadForm.addEventListener('submit', handleFileUpload);
  
  // Generate visualization
  elements.generateVisualizationBtn.addEventListener('click', generateVisualization);
  
  // Chart type change
  elements.chartTypeSelect.addEventListener('change', updateAxisSelectors);
  
  // Tab navigation
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });
  
  // Sample data buttons
  document.querySelectorAll('.sample-data-btn').forEach(btn => {
    btn.addEventListener('click', () => loadSampleData(btn.dataset.file));
  });
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
  // Update nav
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update content
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('hidden', pane.id !== tabName);
    pane.classList.toggle('active', pane.id === tabName);
  });
  
  // Load tab-specific content
  if (tabName === 'analyze' && currentDataId) {
    loadAnalysis();
  }
}

/**
 * Show loading overlay
 */
function showLoading(message = 'Processing...') {
  elements.loadingMessage.textContent = message;
  elements.loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type} fade-in`;
  notification.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i>
    <span>${message}</span>
    <button class="btn-close btn-sm" onclick="this.parentElement.remove()"></button>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 5000);
}

/**
 * Check URL parameters
 */
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataId = urlParams.get('data');
  if (dataId) {
    loadDataset(dataId);
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload(e) {
  e.preventDefault();
  
  const file = elements.csvFile.files[0];
  if (!file) return;
  
  showLoading('Uploading file...');
  
  const formData = new FormData();
  formData.append('csvFile', file);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const result = await response.json();
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('data', result.dataId);
    window.history.pushState({}, '', url);
    
    // Load the dataset
    await loadDataset(result.dataId);
    
    // Refresh datasets list
    loadDatasets();
    
    showNotification('File uploaded successfully!', 'success');
    elements.csvFile.value = '';
  } catch (error) {
    console.error('Upload error:', error);
    showNotification(`Upload failed: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Load sample data
 */
async function loadSampleData(filename) {
  showLoading('Loading sample data...');
  
  try {
    // Fetch the sample file
    const response = await fetch(`/sample-data/${filename}`);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: 'text/csv' });
    
    // Upload it
    const formData = new FormData();
    formData.append('csvFile', file);
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) throw new Error('Failed to load sample data');
    
    const result = await uploadResponse.json();
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('data', result.dataId);
    window.history.pushState({}, '', url);
    
    // Load the dataset
    await loadDataset(result.dataId);
    
    showNotification('Sample data loaded!', 'success');
  } catch (error) {
    console.error('Error loading sample data:', error);
    showNotification('Failed to load sample data', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Load datasets list
 */
async function loadDatasets() {
  try {
    const response = await fetch('/api/datasets');
    const datasets = await response.json();
    
    const datasetsList = document.getElementById('datasetsList');
    const noDatasets = document.getElementById('noDatasets');
    const datasetsLoading = document.getElementById('datasetsLoading');
    
    datasetsLoading.classList.add('hidden');
    
    if (datasets.length === 0) {
      noDatasets.classList.remove('hidden');
      datasetsList.innerHTML = '';
    } else {
      noDatasets.classList.add('hidden');
      datasetsList.innerHTML = datasets.map(dataset => `
        <div class="dataset-item" onclick="loadDataset('${dataset.id}')">
          <div class="d-flex justify-between align-center">
            <div>
              <div class="fw-bold">${dataset.name}</div>
              <small class="text-muted">${new Date(dataset.uploadDate).toLocaleDateString()}</small>
            </div>
            <span class="badge bg-${dataset.status === 'ready' ? 'success' : 'warning'}">
              ${dataset.status}
            </span>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading datasets:', error);
  }
}

/**
 * Load a specific dataset
 */
async function loadDataset(dataId) {
  showLoading('Loading dataset...');
  
  try {
    const response = await fetch(`/api/data/${dataId}`);
    if (!response.ok) throw new Error('Failed to load dataset');
    
    const data = await response.json();
    
    if (data.status === 'processing') {
      // Poll for completion
      setTimeout(() => loadDataset(dataId), 2000);
      return;
    }
    
    if (data.status !== 'ready') {
      throw new Error(data.error || 'Dataset not ready');
    }
    
    currentDataId = dataId;
    currentData = data;
    
    // Update UI
    elements.datasetName.textContent = data.name;
    elements.datasetInfo.innerHTML = `
      <span class="badge bg-success me-2">Ready</span>
      <span>${data.summary.rowCount.toLocaleString()} rows</span>
      <span class="mx-2">•</span>
      <span>${data.summary.columns.length} columns</span>
    `;
    
    // Show data panel
    elements.dataPanel.classList.remove('hidden');
    
    // Update stats
    updateStatsGrid(data.summary);
    
    // Load data preview
    await loadDataPreview();
    
    // Update column selectors
    updateColumnSelectors(data.summary.columns);
    
    hideLoading();
  } catch (error) {
    console.error('Error loading dataset:', error);
    showNotification(`Failed to load dataset: ${error.message}`, 'error');
    hideLoading();
  }
}

/**
 * Update stats grid
 */
function updateStatsGrid(summary) {
  const stats = [
    {
      label: 'Total Rows',
      value: summary.rowCount.toLocaleString(),
      icon: 'bi-table',
      class: 'info'
    },
    {
      label: 'Columns',
      value: summary.columns.length,
      icon: 'bi-columns',
      class: 'primary'
    },
    {
      label: 'Numeric Columns',
      value: Object.values(summary.columnStats).filter(s => s.dataType === 'numeric').length,
      icon: 'bi-123',
      class: 'success'
    },
    {
      label: 'Text Columns',
      value: Object.values(summary.columnStats).filter(s => s.dataType === 'categorical').length,
      icon: 'bi-fonts',
      class: 'warning'
    }
  ];
  
  elements.statsGrid.innerHTML = stats.map(stat => `
    <div class="stat-card ${stat.class} fade-in">
      <div class="d-flex justify-between align-center">
        <div>
          <div class="stat-label">${stat.label}</div>
          <div class="stat-value">${stat.value}</div>
        </div>
        <i class="bi ${stat.icon} display-6 text-muted"></i>
      </div>
    </div>
  `).join('');
}

/**
 * Load data preview
 */
async function loadDataPreview() {
  try {
    const response = await fetch(`/api/data/${currentDataId}/sample?limit=50`);
    const data = await response.json();
    
    if (!data.sample || data.sample.length === 0) {
      elements.dataPreview.innerHTML = '<p class="text-center text-muted">No data available</p>';
      return;
    }
    
    const columns = Object.keys(data.sample[0]);
    const tableHTML = `
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.sample.slice(0, 20).map(row => `
            <tr>
              ${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    elements.dataPreview.innerHTML = tableHTML;
  } catch (error) {
    console.error('Error loading preview:', error);
    elements.dataPreview.innerHTML = '<p class="text-center text-danger">Error loading preview</p>';
  }
}

/**
 * Update column selectors
 */
function updateColumnSelectors(columns) {
  elements.xColumnSelect.innerHTML = columns.map(col => 
    `<option value="${col}">${col}</option>`
  ).join('');
  
  elements.yColumnSelect.innerHTML = columns.map(col => 
    `<option value="${col}">${col}</option>`
  ).join('');
  
  if (columns.length > 1) {
    elements.yColumnSelect.selectedIndex = 1;
  }
  
  updateAxisSelectors();
}

/**
 * Update axis selectors based on chart type
 */
function updateAxisSelectors() {
  const chartType = elements.chartTypeSelect.value;
  const yAxisGroup = document.getElementById('yAxisGroup');
  
  if (chartType === 'pie' || chartType === 'histogram') {
    yAxisGroup.classList.add('hidden');
  } else {
    yAxisGroup.classList.remove('hidden');
  }
}

/**
 * Generate visualization
 */
async function generateVisualization() {
  const chartType = elements.chartTypeSelect.value;
  const xColumn = elements.xColumnSelect.value;
  const yColumn = elements.yColumnSelect.value;
  
  if (!xColumn || (chartType !== 'pie' && chartType !== 'histogram' && !yColumn)) {
    showNotification('Please select columns for visualization', 'warning');
    return;
  }
  
  showLoading('Generating visualization...');
  
  try {
    const response = await fetch('/api/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataId: currentDataId,
        options: {
          type: chartType,
          xColumn,
          yColumn
        }
      })
    });
    
    if (!response.ok) throw new Error('Failed to generate visualization');
    
    const result = await response.json();
    
    // Render the chart
    renderChart(result.spec);
    
    // Add to saved visualizations
    addSavedVisualization(result.vizId, result.spec);
    
    showNotification('Visualization generated!', 'success');
  } catch (error) {
    console.error('Error generating visualization:', error);
    showNotification('Failed to generate visualization', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Render chart
 */
function renderChart(spec) {
  if (currentCharts.has('main')) {
    currentCharts.get('main').destroy();
  }
  
  const chart = new Chart(elements.chartCanvas, spec);
  currentCharts.set('main', chart);
}

/**
 * Add saved visualization
 */
function addSavedVisualization(vizId, spec) {
  const vizCard = document.createElement('div');
  vizCard.className = 'col-md-6 mb-3';
  vizCard.innerHTML = `
    <div class="modern-card">
      <canvas id="viz-${vizId}"></canvas>
      <div class="mt-2 text-center">
        <button class="btn-modern btn-ghost btn-sm" onclick="viewFullscreen('${vizId}')">
          <i class="bi bi-fullscreen"></i>
        </button>
        <button class="btn-modern btn-ghost btn-sm" onclick="downloadChart('${vizId}')">
          <i class="bi bi-download"></i>
        </button>
      </div>
    </div>
  `;
  
  elements.savedVisualizations.appendChild(vizCard);
  
  // Render the chart
  setTimeout(() => {
    const canvas = document.getElementById(`viz-${vizId}`);
    if (canvas) {
      const chart = new Chart(canvas, spec);
      currentCharts.set(vizId, chart);
    }
  }, 100);
}

/**
 * Load analysis
 */
async function loadAnalysis() {
  if (!currentDataId) return;
  
  showLoading('Running analysis...');
  
  try {
    const response = await fetch(`/api/analyze/${currentDataId}`);
    
    if (response.status === 202) {
      // Analysis in progress, poll for completion
      setTimeout(loadAnalysis, 2000);
      return;
    }
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const analysis = await response.json();
    currentAnalysis = analysis;
    
    displayAnalysis(analysis);
    hideLoading();
  } catch (error) {
    console.error('Error loading analysis:', error);
    showNotification('Failed to load analysis', 'error');
    hideLoading();
  }
}

/**
 * Display analysis results
 */
function displayAnalysis(analysis) {
  // Summary
  elements.summaryContent.innerHTML = `
    <div class="stats-list">
      ${Object.entries(analysis.summary || {}).map(([key, value]) => `
        <div class="stat-item">
          <span class="stat-label">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
          <span class="stat-value">${typeof value === 'number' ? value.toLocaleString() : value}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  // Detailed statistics
  if (analysis.statistics) {
    const statsHTML = Object.entries(analysis.statistics).map(([column, stats]) => `
      <div class="col-md-6 mb-3">
        <div class="modern-card">
          <h6 class="card-title">${column}</h6>
          <div class="stats-list small">
            ${Object.entries(stats).filter(([key]) => key !== 'values').map(([key, value]) => `
              <div class="stat-item">
                <span class="text-muted">${key}</span>
                <span>${typeof value === 'number' ? value.toFixed(2) : value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
    
    elements.statsContent.innerHTML = `<div class="row">${statsHTML}</div>`;
  }
  
  // Correlations
  if (analysis.correlations && analysis.correlations.matrix) {
    renderCorrelationMatrix(analysis.correlations.matrix);
  }
}

/**
 * Render correlation matrix
 */
function renderCorrelationMatrix(correlations) {
  const features = correlations.map(c => c.feature1 || c.column1).filter((v, i, a) => a.indexOf(v) === i);
  
  // Create a heatmap using scatter plot as Chart.js doesn't have native matrix support
  const data = [];
  const backgroundColors = [];
  
  features.forEach((f1, i) => {
    features.forEach((f2, j) => {
      const corr = correlations.find(c => 
        (c.feature1 === f1 && c.feature2 === f2) ||
        (c.column1 === f1 && c.column2 === f2)
      );
      if (corr) {
        data.push({
          x: j,
          y: i,
          v: corr.correlation
        });
        backgroundColors.push(getCorrelationColor(corr.correlation));
      }
    });
  });
  
  // Destroy existing chart if present
  if (currentCharts.has('correlation')) {
    currentCharts.get('correlation').destroy();
  }
  
  const chart = new Chart(elements.correlationMatrixCanvas, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Correlation Matrix',
        data: data,
        backgroundColor: backgroundColors,
        pointRadius: 20,
        pointHoverRadius: 22,
        pointStyle: 'rect'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: () => '',
            label: (ctx) => {
              const point = ctx.parsed;
              return `${features[point.y]} × ${features[point.x]}: ${data[ctx.dataIndex].v.toFixed(3)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: -0.5,
          max: features.length - 0.5,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return features[value] || '';
            },
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          min: -0.5,
          max: features.length - 0.5,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return features[value] || '';
            },
            autoSkip: false
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
  
  currentCharts.set('correlation', chart);
}

/**
 * Get correlation color
 */
function getCorrelationColor(value) {
  if (value < 0) {
    return `rgba(59, 130, 246, ${Math.abs(value)})`;
  } else if (value > 0) {
    return `rgba(239, 68, 68, ${value})`;
  }
  return 'rgba(200, 200, 200, 0.5)';
}

/**
 * Generate optimal visualizations
 */
window.generateOptimalVisualizations = async function() {
  if (!currentDataId) {
    showNotification('Please load a dataset first', 'warning');
    return;
  }
  
  showLoading('Generating optimal visualizations...');
  
  try {
    const response = await fetch(`/api/optimal-visualizations/${currentDataId}?limit=4`);
    if (!response.ok) throw new Error('Failed to generate visualizations');
    
    const result = await response.json();
    
    if (result.visualizations && result.visualizations.length > 0) {
      elements.savedVisualizations.innerHTML = '';
      result.visualizations.forEach((viz, i) => {
        addSavedVisualization(`optimal-${i}`, viz);
      });
      showNotification(`Generated ${result.visualizations.length} optimal visualizations!`, 'success');
    } else {
      showNotification('No visualizations could be generated', 'info');
    }
  } catch (error) {
    console.error('Error generating visualizations:', error);
    showNotification('Failed to generate visualizations', 'error');
  } finally {
    hideLoading();
  }
};

/**
 * Generate insights
 */
window.generateInsights = async function() {
  if (!currentAnalysis) {
    showNotification('Please run analysis first', 'warning');
    switchTab('analyze');
    return;
  }
  
  const template = document.getElementById('promptTemplateSelect').value;
  const promptTemplate = window.promptTemplates?.[template];
  
  if (!promptTemplate) {
    showNotification('Template not found', 'error');
    return;
  }
  
  showLoading('Generating insights...');
  
  try {
    // Format the analysis for the prompt
    const prompt = promptTemplate
      .replace('{analysis}', JSON.stringify(currentAnalysis, null, 2))
      .replace('{datasetName}', currentData.name);
    
    // Display the insights
    elements.insightsContent.innerHTML = `
      <div class="modern-card">
        <h5>${template.replace(/([A-Z])/g, ' $1').trim()}</h5>
        <div class="insights-text">
          <pre>${prompt}</pre>
        </div>
        <div class="mt-3">
          <button class="btn-modern btn-primary" onclick="copyToClipboard(\`${prompt.replace(/`/g, '\\`')}\`)">
            <i class="bi bi-clipboard"></i> Copy to Clipboard
          </button>
        </div>
      </div>
    `;
    
    showNotification('Insights generated! Copy the prompt for your LLM.', 'success');
  } catch (error) {
    console.error('Error generating insights:', error);
    showNotification('Failed to generate insights', 'error');
  } finally {
    hideLoading();
  }
};

/**
 * Copy to clipboard
 */
window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied to clipboard!', 'success');
  }).catch(() => {
    showNotification('Failed to copy to clipboard', 'error');
  });
};

/**
 * Export functions
 */
window.exportToExcel = function() {
  showNotification('Excel export coming soon!', 'info');
};

window.exportToJSON = async function() {
  if (!currentDataId || !currentAnalysis) {
    showNotification('Please load and analyze data first', 'warning');
    return;
  }
  
  const exportData = {
    dataset: currentData,
    analysis: currentAnalysis,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentData.name.replace('.csv', '')}_analysis.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('JSON exported successfully!', 'success');
};

window.exportToPDF = function() {
  showNotification('PDF export coming soon!', 'info');
};

/**
 * Download chart
 */
window.downloadChart = function(chartId = 'main') {
  const chart = currentCharts.get(chartId);
  if (!chart) return;
  
  const url = chart.toBase64Image();
  const a = document.createElement('a');
  a.href = url;
  a.download = `chart_${chartId}_${Date.now()}.png`;
  a.click();
  
  showNotification('Chart downloaded!', 'success');
};

/**
 * View chart in fullscreen
 */
window.viewFullscreen = function(chartId) {
  const chart = currentCharts.get(chartId);
  if (!chart) return;
  
  const modal = new bootstrap.Modal(document.getElementById('chartModal'));
  document.getElementById('chartModalTitle').textContent = chart.options.plugins?.title?.text || 'Chart';
  
  // Clone the chart for modal
  const modalCanvas = document.getElementById('modalChartCanvas');
  const modalChart = new Chart(modalCanvas, chart.config);
  
  modal.show();
  
  // Clean up on hide
  document.getElementById('chartModal').addEventListener('hidden.bs.modal', () => {
    modalChart.destroy();
  }, { once: true });
};

/**
 * Refresh data preview
 */
window.refreshDataPreview = function() {
  if (currentDataId) {
    loadDataPreview();
    showNotification('Preview refreshed', 'success');
  }
};

/**
 * Export table as CSV
 */
window.exportTableAsCSV = function() {
  const table = elements.dataPreview.querySelector('table');
  if (!table) return;
  
  let csv = [];
  
  // Headers
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
  csv.push(headers.join(','));
  
  // Rows
  table.querySelectorAll('tbody tr').forEach(tr => {
    const row = Array.from(tr.querySelectorAll('td')).map(td => `"${td.textContent}"`);
    csv.push(row.join(','));
  });
  
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentData?.name || 'data'}_preview.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Preview exported!', 'success');
};