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
const optimizeBtn = document.getElementById('optimizeBtn'); // New: Optimize button
const vizPanel = document.getElementById('vizPanel');
const modalChartCanvas = document.getElementById('modalChartCanvas');
const chartModalTitle = document.getElementById('chartModalTitle');
const chartModal = new bootstrap.Modal(document.getElementById('chartModal'));

// Create tooltip container for visualization explanations
let tooltipContainer = document.createElement('div');
tooltipContainer.className = 'viz-tooltip';
tooltipContainer.setAttribute('role', 'tooltip');
tooltipContainer.id = 'viz-tooltip';
document.body.appendChild(tooltipContainer);

/**
 * Show visualization tooltip
 * @param {Event} event Mouse event
 * @param {Object} config Visualization config with tooltip information
 */
function showVizTooltip(event, config) {
  if (!config || !config.tooltip) return;
  
  const tooltip = document.getElementById('viz-tooltip');
  if (!tooltip) return;
  
  // Create tooltip content
  const tooltipContent = `
    <h5>${config.title || 'Visualization Information'}</h5>
    
    <div class="viz-tooltip-section">
      <h6>Purpose</h6>
      <p class="viz-tooltip-purpose">${config.tooltip.purpose || 'N/A'}</p>
    </div>
    
    <div class="viz-tooltip-section">
      <h6>Key Insights</h6>
      <p class="viz-tooltip-insights">${config.tooltip.insights || 'N/A'}</p>
    </div>
    
    <div class="viz-tooltip-section">
      <h6>Why This Visualization</h6>
      <p class="viz-tooltip-rationale">${config.tooltip.rationale || 'N/A'}</p>
    </div>
    
    <div class="viz-tooltip-section">
      <h6>Background</h6>
      <p class="viz-tooltip-background">${config.tooltip.background || 'N/A'}</p>
    </div>
  `;
  
  // Set tooltip content and position
  tooltip.innerHTML = tooltipContent;
  
  // Calculate position
  const target = event.target.closest('.info-icon') || event.target.closest('.info-btn') || event.target;
  const rect = target.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  // Position tooltip near the icon but not covering it
  tooltip.style.top = (rect.top + scrollTop - 10) + 'px';
  tooltip.style.left = (rect.right + scrollLeft + 10) + 'px';
  
  // Show tooltip
  tooltip.style.display = 'block';
}

// Function moved to top of file

// Load datasets on page load
document.addEventListener('DOMContentLoaded', () => {
  console.debug('DOMContentLoaded event fired');
  setupEventListeners();
  
  // First load available datasets
  loadDatasets().then(() => {
    console.debug('Datasets loaded, checking for dataId in URL or localStorage');
    
    // Check URL for dataId parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const dataId = urlParams.get('data');
    
    if (dataId) {
      console.debug(`Found dataId in URL parameters: ${dataId}`);
      // Small delay to ensure UI is ready
      setTimeout(() => loadDataset(dataId), 100);
    } else {
      // Check localStorage as fallback
      const savedDataId = localStorage.getItem('currentDataId');
      if (savedDataId) {
        console.debug(`No dataId in URL, using saved dataId from localStorage: ${savedDataId}`);
        setTimeout(() => loadDataset(savedDataId), 100);
      }
    }
  }).catch(err => {
    console.error('Error loading datasets:', err);
  });
  
  // Add stylesheet for tooltips if not already present
  if (!document.querySelector('link[href="css/style.css"]')) {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = 'css/style.css';
    document.head.appendChild(styleSheet);
  }
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  console.debug('Setting up event listeners');
  // Upload form submission
  uploadForm.addEventListener('submit', handleFileUpload);
  
  // Generate visualization button
  generateVisualizationBtn.addEventListener('click', generateVisualization);
  
  // Chart type change
  chartTypeSelect.addEventListener('change', updateColumnSelectors);
  
  // New visualization button
  newVisualizationBtn.addEventListener('click', showVisualizationPanel);
  
  // Optimize button (if it exists)
  if (optimizeBtn) {
    optimizeBtn.addEventListener('click', generateOptimalVisualizations);
  }
  
  // Setup tab activation events
  const visualizeTab = document.getElementById('visualize-tab');
  if (visualizeTab) {
    visualizeTab.addEventListener('click', () => {
      if (currentDataId) {
        console.debug(`visualize-tab clicked with currentDataId: ${currentDataId}`);
        loadRecommendations(currentDataId);
        loadVisualizations(currentDataId);
      } else {
        console.debug('visualize-tab clicked but no currentDataId is set');
      }
    });
  }
  
  const analyzeTab = document.getElementById('analyze-tab');
  if (analyzeTab) {
    analyzeTab.addEventListener('click', () => {
      if (currentDataId) {
        console.debug(`analyze-tab clicked with currentDataId: ${currentDataId}`);
        loadAnalysis(currentDataId);
      } else {
        console.debug('analyze-tab clicked but no currentDataId is set');
      }
    });
  }
  
  // Close tooltips when clicking elsewhere
  document.addEventListener('click', (e) => {
    const tooltip = document.getElementById('viz-tooltip');
    const isInfoIcon = e.target.closest('.info-icon') || e.target.closest('.info-btn');
    if (tooltip && !isInfoIcon && tooltip.style.display === 'block') {
      hideVizTooltip();
    }
  });
  
  // Add window beforeunload event to help with state persistence
  window.addEventListener('beforeunload', () => {
    if (currentDataId) {
      localStorage.setItem('currentDataId', currentDataId);
    }
  });
}

/**
 * Check application state and restore if needed
 * This helps with page refreshes and maintaining state
 */
function checkAndRestoreState() {
  console.debug('Checking and restoring application state');
  // Check URL first as it has highest priority
  const urlParams = new URLSearchParams(window.location.search);
  const dataId = urlParams.get('data');
  
  if (dataId) {
    console.debug(`Found dataId in URL: ${dataId}, loading dataset`);
    loadDataset(dataId);
    return;
  }
  
  // No URL param, check localStorage
  const savedDataId = localStorage.getItem('currentDataId');
  if (savedDataId) {
    console.debug(`Found saved dataId in localStorage: ${savedDataId}, loading dataset`);
    loadDataset(savedDataId);
    return;
  }
  
  console.debug('No saved state found, starting fresh');
}

/**
 * Handle file upload
 * @param {Event} event Form submission event
 */
async function handleFileUpload(event) {
  event.preventDefault();
  console.debug('File upload form submitted');
  
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a CSV file');
    return;
  }
  
  console.debug(`Uploading file: ${file.name}, size: ${file.size} bytes`);
  
  // Show spinner
  uploadSpinner.style.display = 'inline-block';
  
  const formData = new FormData();
  formData.append('csvFile', file);
  
  try {
    // Log request details for debugging
    console.log('Sending upload request to /api/upload');
    
    // Implement timeout and retry logic
    let response;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
      try {
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
        
        response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
      } catch (fetchError) {
        retries++;
        console.error(`Fetch attempt ${retries} failed:`, fetchError);
        
        if (fetchError.name === 'AbortError') {
          console.error('Request timed out');
        }
        
        if (retries > maxRetries) {
          throw fetchError; // Give up after max retries
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * retries));
      }
    }
    
    // Check for server response
    if (!response) {
      throw new Error('No response received from server');
    }
    
    console.log('Server response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Failed to parse error response as JSON
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
    
    // Parse response carefully
    let result;
    try {
      const text = await response.text();
      console.debug('Raw response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      
      // Try to parse as JSON
      try {
        result = JSON.parse(text);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error('Invalid response format from server');
      }
    } catch (textError) {
      console.error('Failed to read response text:', textError);
      throw new Error('Failed to read server response');
    }
    
    console.debug('Upload successful, received dataId:', result.dataId);
    
    // Update the URL with the dataId for easier sharing and state recovery
    const url = new URL(window.location.href);
    url.searchParams.set('data', result.dataId);
    window.history.pushState({dataId: result.dataId}, '', url.toString());
    
    // Store in localStorage for recovery
    localStorage.setItem('currentDataId', result.dataId);
    
    // Load the new dataset
    loadDataset(result.dataId);
    
    // Refresh datasets list
    loadDatasets();
    
    // Reset file input
    fileInput.value = '';
  } catch (error) {
    console.error('Upload failed:', error);
    alert(`Upload failed: ${error.message}`);
  } finally {
    // Hide spinner
    uploadSpinner.style.display = 'none';
  }
}

/**
 * Load datasets list
 * @returns {Promise} Promise that resolves when datasets are loaded
 */
async function loadDatasets() {
  console.debug('loadDatasets called');
  try {
    datasetsLoading.style.display = 'block';
    noDatasets.classList.add('hidden');
    datasetsList.innerHTML = '';
    
    const response = await fetch('/api/datasets');
    const datasets = await response.json();
    console.debug('Datasets fetched:', datasets);
    
    if (datasets.length === 0) {
      console.debug('No datasets available');
      noDatasets.classList.remove('hidden');
    } else {
      console.debug(`${datasets.length} datasets found, updating UI`);
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
          console.debug(`Dataset item clicked with dataId: ${dataId}`);
          loadDataset(dataId);
        });
      });
    }
    return datasets; // Return the datasets for promise chaining
  } catch (error) {
    console.error('Error loading datasets:', error);
    datasetsList.innerHTML = `<div class="alert alert-danger">Error loading datasets: ${error.message}</div>`;
    throw error; // Re-throw to propagate the error for promise chaining
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
    console.debug(`loadDataset called with dataId: ${dataId}`);
    
    // Store dataId in localStorage for recovery in case of refresh
    localStorage.setItem('currentDataId', dataId);
    
    // Show loading state
    datasetInfo.textContent = 'Loading dataset information...';
    dataPanel.classList.remove('hidden');
    
    // Get dataset information
    console.debug(`Fetching dataset from: /api/data/${dataId}`);
    const response = await fetch(`/api/data/${dataId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load dataset');
    }
    
    const data = await response.json();
    console.debug('Dataset data received:', data);
    
    // Update global variable
    currentDataId = dataId;
    
    // Update UI
    datasetName.textContent = data.name;
    
    if (data.status === 'ready') {
      const summary = data.summary;
      console.debug('Dataset is ready. Summary:', summary);
      
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
      console.debug('Dataset has error:', data.error);
      datasetInfo.innerHTML = `
        <strong>Status:</strong> <span class="badge bg-danger">Error</span>
        <div class="alert alert-danger mt-2">${data.error}</div>
      `;
    } else {
      console.debug('Dataset is still processing. Status:', data.status);
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
    console.debug('Activating preview tab');
    const previewTab = document.querySelector('#dataTabs button[data-bs-target="#preview-tab-pane"]');
    if (previewTab) {
      const bsTab = new bootstrap.Tab(previewTab);
      bsTab.show();
    } else {
      console.error('Preview tab element not found');
    }
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
  
  // Add info icon for detailed tooltips if we have tooltip data
  if (spec.config && spec.config.tooltip) {
    // Remove existing info icon if any
    const existingIcon = chartContainer.querySelector('.info-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    // Create info icon
    const infoIcon = document.createElement('div');
    infoIcon.className = 'info-icon';
    infoIcon.innerHTML = '<i class="bi bi-info-circle-fill"></i>';
    infoIcon.setAttribute('role', 'button');
    infoIcon.setAttribute('tabindex', '0');
    infoIcon.setAttribute('aria-label', 'Show visualization explanation');
    chartContainer.appendChild(infoIcon);
    
    // Add tooltip functionality
    infoIcon.addEventListener('mouseenter', (e) => showVizTooltip(e, spec.config));
    infoIcon.addEventListener('mouseleave', hideVizTooltip);
    infoIcon.addEventListener('focus', (e) => showVizTooltip(e, spec.config));
    infoIcon.addEventListener('blur', hideVizTooltip);
    infoIcon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showVizTooltip(e, spec.config);
      }
    });
  }
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
          enabled: true,
          callbacks: {
            // Custom tooltips with visualization information
            afterBody: function(context) {
              // Only add custom tooltip content if we have tooltip data
              if (!config.tooltip) return [];
              
              // Format tooltip content
              return [
                '',
                'Purpose: ' + (config.tooltip.purpose || ''),
                '',
                'Key insights: ' + (config.tooltip.insights || ''),
                '',
                'Why this visualization: ' + (config.tooltip.rationale || '')
              ];
            }
          }
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
    
    // Group visualizations by category
    const visualizationsByCategory = groupVisualizationsByCategory(data.visualizations);
    
    // Create the accordions for each category
    let accordionsHTML = '';
    let accordionIndex = 0;
    
    Object.entries(visualizationsByCategory).forEach(([category, vizList]) => {
      const categoryId = `category-${accordionIndex}`;
      const formattedCategory = formatCategoryName(category);
      
      accordionsHTML += `
        <div class="accordion-item">
          <h2 class="accordion-header" id="heading-${categoryId}">
            <button class="accordion-button ${accordionIndex === 0 ? '' : 'collapsed'}" type="button" 
                    data-bs-toggle="collapse" data-bs-target="#collapse-${categoryId}" 
                    aria-expanded="${accordionIndex === 0 ? 'true' : 'false'}" aria-controls="collapse-${categoryId}">
              ${formattedCategory} (${vizList.length})
            </button>
          </h2>
          <div id="collapse-${categoryId}" class="accordion-collapse collapse ${accordionIndex === 0 ? 'show' : ''}" 
               aria-labelledby="heading-${categoryId}">
            <div class="accordion-body">
              <div class="list-group">
                ${vizList.map(viz => `
                  <button type="button" class="list-group-item list-group-item-action" data-id="${viz.id}">
                    <div class="d-flex w-100 justify-content-between">
                      <h5 class="mb-1">${viz.title}</h5>
                      <small>${new Date(viz.createdAt).toLocaleString()}</small>
                    </div>
                    <p class="mb-1">Chart Type: ${viz.type}</p>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      
      accordionIndex++;
    });
    
    // Create the accordion container
    savedVisualizations.innerHTML = `
      <div class="accordion" id="visualizationsAccordion">
        ${accordionsHTML}
      </div>
    `;
    
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
 * Group visualizations by category
 * @param {Array} visualizations Array of visualization objects
 * @returns {Object} Object with categories as keys and arrays of visualizations as values
 */
function groupVisualizationsByCategory(visualizations) {
  const categories = {};
  
  visualizations.forEach(viz => {
    // Extract category from the visualization object
    // Check if category exists in config, or use a default based on chart type
    const category = viz.config && viz.config.category ? viz.config.category : getCategoryFromChartType(viz.type);
    
    // Initialize the category array if it doesn't exist
    if (!categories[category]) {
      categories[category] = [];
    }
    
    // Add the visualization to its category
    categories[category].push(viz);
  });
  
  return categories;
}

/**
 * Get category from chart type if not specified
 * @param {string} chartType Type of chart
 * @returns {string} Category for the chart
 */
function getCategoryFromChartType(chartType) {
  // Default categorization based on chart type
  const typeCategories = {
    'histogram': 'distributions',
    'boxplot': 'distributions',
    'line': 'time_series',
    'scatter': 'correlations',
    'bubble': 'correlations',
    'correlationMatrix': 'correlations',
    'bar': 'categorical_analysis',
    'horizontalBar': 'categorical_analysis',
    'pie': 'categorical_analysis',
    'treemap': 'categorical_analysis',
    'heatmap': 'categorical_analysis'
  };
  
  return typeCategories[chartType] || 'other';
}

/**
 * Format category name for display
 * @param {string} category Category name
 * @returns {string} Formatted category name
 */
function formatCategoryName(category) {
  // Map of category names to display names
  const categoryDisplayNames = {
    'distributions': 'Distributions',
    'time_series': 'Time Series',
    'correlations': 'Correlations',
    'categorical_analysis': 'Categorical Analysis',
    'overview': 'Data Overview',
    'anomaly_detection': 'Anomaly Detection',
    'other': 'Other Visualizations'
  };
  
  return categoryDisplayNames[category] || 
    category.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
  
  // Add info icon for detailed tooltips if we have tooltip data
  const modalChartContainer = document.querySelector('.modal-body');
  if (spec.config && spec.config.tooltip && modalChartContainer) {
    // Remove existing info icon if any
    const existingIcon = modalChartContainer.querySelector('.info-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    // Create info icon
    const infoIcon = document.createElement('div');
    infoIcon.className = 'info-icon';
    infoIcon.innerHTML = '<i class="bi bi-info-circle-fill"></i>';
    infoIcon.setAttribute('role', 'button');
    infoIcon.setAttribute('tabindex', '0');
    infoIcon.setAttribute('aria-label', 'Show visualization explanation');
    modalChartContainer.appendChild(infoIcon);
    
    // Add tooltip functionality
    infoIcon.addEventListener('mouseenter', (e) => showVizTooltip(e, spec.config));
    infoIcon.addEventListener('mouseleave', hideVizTooltip);
    infoIcon.addEventListener('focus', (e) => showVizTooltip(e, spec.config));
    infoIcon.addEventListener('blur', hideVizTooltip);
    infoIcon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showVizTooltip(e, spec.config);
      }
    });
  }
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
    
    // Store recommendations for later use
    window.recommendations = data.recommendations;
    
    // Group recommendations by category
    const recommendationsByCategory = groupVisualizationsByCategory(data.recommendations);
    
    // Create tabs for categories
    const categoryTabs = [];
    const categoryPanes = [];
    
    Object.entries(recommendationsByCategory).forEach(([category, recList], index) => {
      const categoryId = `rec-category-${index}`;
      const formattedCategory = formatCategoryName(category);
      
      // Create tab
      categoryTabs.push(`
        <li class="nav-item" role="presentation">
          <button class="nav-link ${index === 0 ? 'active' : ''}" 
                  id="${categoryId}-tab" 
                  data-bs-toggle="tab" 
                  data-bs-target="#${categoryId}-pane" 
                  type="button" 
                  role="tab" 
                  aria-controls="${categoryId}-pane" 
                  aria-selected="${index === 0 ? 'true' : 'false'}">
            ${formattedCategory} (${recList.length})
          </button>
        </li>
      `);
      
      // Create pane with cards
      categoryPanes.push(`
        <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" 
             id="${categoryId}-pane" 
             role="tabpanel" 
             aria-labelledby="${categoryId}-tab" 
             tabindex="0">
          <div class="row">
            ${recList.map((rec, recIndex) => {
              // Calculate the global index in the original recommendations array
              const globalIndex = data.recommendations.findIndex(r => 
                r.type === rec.type && 
                r.config.title === rec.config.title
              );
              
              return `
                <div class="col-md-4 mb-3">
                  <div class="card h-100 recommendation-card">
                    <div class="card-body">
                      <h5 class="card-title">${rec.config.title}</h5>
                      <div class="info-btn" role="button" tabindex="0" aria-label="Show visualization explanation" data-index="${globalIndex}">
                        <i class="bi bi-info-circle"></i>
                      </div>
                      <p class="card-text">
                        <strong>Chart Type:</strong> ${rec.type}<br>
                        <strong>Priority:</strong> <span class="badge ${rec.priority === 'high' ? 'bg-danger' : (rec.priority === 'medium' ? 'bg-warning' : 'bg-info')}">${rec.priority}</span>
                      </p>
                      <p class="card-text small">${rec.config.reason || ''}</p>
                      <button class="btn btn-primary btn-sm use-recommendation" data-index="${globalIndex}">Use This</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `);
    });
    
    // Create the tabs and content container with a "Generate All" button for each category
    recommendationsList.innerHTML = `
      <div class="mb-4">
        <ul class="nav nav-tabs" id="recommendationsTabList" role="tablist">
          ${categoryTabs.join('')}
        </ul>
        <div class="tab-content pt-3" id="recommendationsTabContent">
          ${categoryPanes.map((pane, index) => {
            const categoryKey = Object.keys(recommendationsByCategory)[index];
            const recList = recommendationsByCategory[categoryKey];
            
            // Add a "Generate All from Category" button at the top of each category pane
            return pane.replace('<div class="row">', `
              <div class="mb-3">
                <button class="btn btn-outline-primary generate-category" data-category="${categoryKey}">
                  <i class="bi bi-lightning-charge"></i> Generate All ${formatCategoryName(categoryKey)} Visualizations
                </button>
              </div>
              <div class="row">
            `);
          }).join('')}
        </div>
      </div>
    `;
    
    // Add click event listeners for recommendation buttons
    document.querySelectorAll('.use-recommendation').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-index'));
        useRecommendation(index);
      });
    });
    
    // Add click event listeners for generate-category buttons
    document.querySelectorAll('.generate-category').forEach(button => {
      button.addEventListener('click', () => {
        const category = button.getAttribute('data-category');
        generateCategoryVisualizations(category, dataId, recommendationsByCategory[category]);
      });
    });
    
    // Add tooltip functionality for info buttons
    document.querySelectorAll('.info-btn').forEach(button => {
      const index = parseInt(button.getAttribute('data-index'));
      const rec = data.recommendations[index];
      
      button.addEventListener('mouseenter', (e) => showVizTooltip(e, rec.config));
      button.addEventListener('mouseleave', hideVizTooltip);
      button.addEventListener('focus', (e) => showVizTooltip(e, rec.config));
      button.addEventListener('blur', hideVizTooltip);
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showVizTooltip(e, rec.config);
        }
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
 * Generate visualizations for a specific category
 * @param {string} category Category name
 * @param {string} dataId Dataset ID
 * @param {Array} recommendations Array of recommendations in the category
 */
function generateCategoryVisualizations(category, dataId, recommendations) {
  if (!recommendations || recommendations.length === 0 || !dataId) {
    alert('No recommendations available for this category');
    return;
  }
  
  // Show loading spinner
  if (vizSpinner) {
    vizSpinner.style.display = 'inline-block';
  }
  
  // Hide visualization panel and show chart container
  vizPanel.classList.add('hidden');
  chartContainer.classList.remove('hidden');
  
  // Create progress tracking container
  if (!document.getElementById('vizProgressContainer')) {
    const progressContainer = document.createElement('div');
    progressContainer.id = 'vizProgressContainer';
    progressContainer.className = 'mb-3';
    progressContainer.innerHTML = `
      <div class="d-flex justify-content-between mb-1">
        <span>Generating ${formatCategoryName(category)} visualizations...</span>
        <span id="vizProgressText">0/${recommendations.length}</span>
      </div>
      <div class="progress">
        <div id="vizProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" 
             role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    `;
    chartContainer.prepend(progressContainer);
  }
  
  // Track progress
  let completedCount = 0;
  const progressBar = document.getElementById('vizProgressBar');
  const progressText = document.getElementById('vizProgressText');
  
  // For each recommendation in the category, create a visualization
  const promises = recommendations.map(recommendation => {
    return fetch('/api/visualize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dataId,
        options: {
          chartType: recommendation.type,
          ...recommendation.config
        }
      })
    })
    .then(res => res.json())
    .then(result => {
      // Update progress
      completedCount++;
      const percentage = (completedCount / recommendations.length) * 100;
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
      progressText.textContent = `${completedCount}/${recommendations.length}`;
      
      // Display the first visualization if we haven't already
      if (completedCount === 1) {
        displayChart(result.spec);
      }
      
      return result;
    })
    .catch(err => {
      console.error(`Error generating "${recommendation.config.title}":`, err);
      
      // Still update progress even on error
      completedCount++;
      const percentage = (completedCount / recommendations.length) * 100;
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
      progressText.textContent = `${completedCount}/${recommendations.length}`;
    });
  });
  
  // Wait for all visualizations to be created
  Promise.all(promises)
    .then(() => {
      // Show completion message
      const progressContainer = document.getElementById('vizProgressContainer');
      if (progressContainer) {
        progressContainer.innerHTML = `
          <div class="alert alert-success">
            Successfully generated ${completedCount} ${formatCategoryName(category)} visualizations!
          </div>
        `;
        
        // Remove progress container after a delay
        setTimeout(() => {
          if (progressContainer && progressContainer.parentNode) {
            progressContainer.parentNode.removeChild(progressContainer);
          }
        }, 5000);
      }
      
      // Reload visualizations
      loadVisualizations(dataId);
      
      // Hide spinner
      if (vizSpinner) {
        vizSpinner.style.display = 'none';
      }
    })
    .catch(err => {
      console.error('Error generating category visualizations:', err);
      
      // Show error message
      const progressContainer = document.getElementById('vizProgressContainer');
      if (progressContainer) {
        progressContainer.innerHTML = `
          <div class="alert alert-danger">
            Error completing visualizations: ${err.message}
          </div>
        `;
      }
      
      // Hide spinner
      if (vizSpinner) {
        vizSpinner.style.display = 'none';
      }
    });
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
    
    // Auto-generate visualizations based on analysis
    if (analysis.dataIntegrity && analysis.dataIntegrity.summary && 
        analysis.dataIntegrity.summary.optimal_visualizations) {
      
      // Add a notification that we'll be generating visualizations
      const notification = document.createElement('div');
      notification.className = 'alert alert-info';
      notification.innerHTML = `
        <h6 class="alert-heading">Optimal Visualizations</h6>
        <p>Based on data analysis, we'll generate optimal visualizations.</p>
        <button class="btn btn-sm btn-primary" id="startOptimalVizBtn">Generate Now</button>
        <button class="btn btn-sm btn-secondary ms-2" id="skipOptimalVizBtn">Skip</button>
      `;
      
      // If analysisContent already has a notification, remove it first
      const existingNotification = analysisContent.querySelector('.alert-info');
      if (existingNotification) {
        existingNotification.remove();
      }
      
      // Add to top of analysis content
      analysisContent.prepend(notification);
      
      // Set up event listeners
      document.getElementById('startOptimalVizBtn').addEventListener('click', () => {
        notification.remove();
        // Switch to visualize tab
        const visualizeTab = document.getElementById('visualize-tab');
        const bootstrapTab = bootstrap.Tab.getInstance(visualizeTab) || new bootstrap.Tab(visualizeTab);
        bootstrapTab.show();
        
        // Use the progressive version
        generateOptimalVisualizations({type: 'click'});
      });
      
      document.getElementById('skipOptimalVizBtn').addEventListener('click', () => {
        notification.remove();
      });
    }
    
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
  createCorrelationMatrix(analysis.correlations);
}

/**
 * Create correlation matrix visualization
 * @param {Object} matrix Correlation matrix
 */
function createCorrelationMatrix(correlationData) {
  if (!correlationData || !correlationData.matrix || !correlationData.columns) {
    console.error('Invalid correlation data format', correlationData);
    return;
  }
  
  const { matrix, columns } = correlationData;
  
  // Create data array for visualization
  const data = [];
  
  for (let i = 0; i < columns.length; i++) {
    for (let j = 0; j < columns.length; j++) {
      data.push({
        x: columns[i],
        y: columns[j],
        correlation: matrix[i][j]
      });
    }
  }
  
  // Render the matrix
  renderCorrelationMatrix(data, columns);
}

/**
 * Render correlation matrix
 * @param {Array} data Correlation data array
 * @param {Array} labels Labels for matrix axes
 */
/**
 * Render correlation matrix
 * @param {Array} data Correlation data array
 * @param {Array} labels Labels for matrix axes
 */
function renderCorrelationMatrix(data, labels) {
  if (!correlationMatrixCanvas) {
    console.error('Correlation matrix canvas not found');
    return;
  }
  
  // Clear previous chart if any
  if (correlationMatrixChart) {
    correlationMatrixChart.destroy();
  }
  
  // Create chart config
  const chartConfig = {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Correlation Matrix',
        data: data.map(item => ({
          x: labels.indexOf(item.x),
          y: labels.indexOf(item.y),
          v: item.correlation
        })),
        backgroundColor: function(context) {
          const value = context.dataset.data[context.dataIndex].v;
          return getCorrelationColor(value);
        },
        width: ({ chart }) => (chart.chartArea.width / labels.length) - 1,
        height: ({ chart }) => (chart.chartArea.height / labels.length) - 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            title: function(context) {
              const dataIndex = context[0].dataIndex;
              const x = data[dataIndex].x;
              const y = data[dataIndex].y;
              return `${x} vs ${y}`;
            },
            label: function(context) {
              const value = data[context.dataIndex].correlation;
              return `Correlation: ${value.toFixed(2)}`;
            }
          }
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          type: 'category',
          labels: labels,
          offset: true,
          ticks: {
            display: true,
            autoSkip: false,
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'category',
          labels: labels,
          offset: true,
          reverse: true,
          ticks: {
            display: true
          },
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  // Register matrix controller if not registered
  if (!Chart.controllers.matrix) {
    Chart.register({
      id: 'matrix',
      defaults: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        width: function({ chart }) {
          return chart.chartArea.width / chart.scales.x.ticks.length;
        },
        height: function({ chart }) {
          return chart.chartArea.height / chart.scales.y.ticks.length;
        }
      },
      controller: class MatrixController extends Chart.DatasetController {
        constructor(chart, datasetIndex) {
          super(chart, datasetIndex);
        }
        
        // Required implementations
        parseObjectData(meta, data, start, count) {
          const parsed = [];
          let i, ilen, item;
          for (i = 0, ilen = data.length; i < ilen; ++i) {
            item = data[i];
            parsed.push({
              x: item.x,
              y: item.y,
              v: item.v
            });
          }
          return parsed;
        }
        
        getMaxOverflow() {
          return 0;
        }
        
        getLabelAndValue(index) {
          const me = this;
          const parsed = me._cachedMeta._parsed[index];
          const x = me._cachedMeta.xScale.getLabelForValue(parsed.x);
          const y = me._cachedMeta.yScale.getLabelForValue(parsed.y);
          return {
            label: `${x}, ${y}`,
            value: parsed.v
          };
        }
        
        updateElements(rectangles, start, count, mode) {
          const me = this;
          const vScale = me._cachedMeta.vScale;
          const dataset = me.getDataset();
          const xScale = me._cachedMeta.xScale;
          const yScale = me._cachedMeta.yScale;
          
          // Get a reasonable width and height
          let width = dataset.width || me.options.width;
          if (typeof width === 'function') {
            width = width({ chart: me.chart });
          }
          
          let height = dataset.height || me.options.height;
          if (typeof height === 'function') {
            height = height({ chart: me.chart });
          }
          
          for (let i = 0; i < count; ++i) {
            const index = start + i;
            const parsed = me._cachedMeta._parsed[index];
            const properties = {
              x: xScale.getPixelForValue(parsed.x),
              y: yScale.getPixelForValue(parsed.y),
              width,
              height
            };
            
            // Rectangle centers are at location, not corner
            properties.x -= width / 2;
            properties.y -= height / 2;
            
            properties.hidden = isNaN(parsed.v);
            rectangles[i].x = properties.x;
            rectangles[i].y = properties.y;
            rectangles[i].width = properties.width;
            rectangles[i].height = properties.height;
            rectangles[i].hidden = properties.hidden;
          }
        }
        
        draw() {
          const me = this;
          const { ctx } = me.chart;
          const meta = me._cachedMeta;
          const elements = meta.data || [];
          const dataset = me.getDataset();
          const backgroundColor = dataset.backgroundColor;
          
          for (let i = 0; i < elements.length; ++i) {
            const properties = elements[i];
            const parsed = meta._parsed[i];
            if (!properties.hidden) {
              ctx.fillStyle = typeof backgroundColor === 'function' ? 
                backgroundColor({ dataIndex: i, dataset, chart: me.chart }) : 
                backgroundColor;
                
              ctx.fillRect(
                properties.x,
                properties.y,
                properties.width,
                properties.height
              );
              
              if (me.options.borderWidth) {
                ctx.strokeStyle = me.options.borderColor;
                ctx.lineWidth = me.options.borderWidth;
                ctx.strokeRect(
                  properties.x,
                  properties.y,
                  properties.width,
                  properties.height
                );
              }
            }
          }
        }
      },
      
      // Element class for the rectangles
      defaults: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)'
      },
      elements: {
        matrix: class MatrixElement extends Chart.Element {
          constructor() {
            super();
            this.x = 0;
            this.y = 0;
            this.width = 0;
            this.height = 0;
            this.hidden = false;
          }
          
          draw(ctx) {
            // Drawing is handled in the controller
          }
          
          getRange() {
            return {
              min: {
                x: this.x,
                y: this.y
              },
              max: {
                x: this.x + this.width,
                y: this.y + this.height
              }
            };
          }
        }
      }
    });
  }
  
  // Create chart
  correlationMatrixChart = new Chart(correlationMatrixCanvas, chartConfig);
}

/**
 * Get color for correlation value
 * @param {number} correlation Correlation value (-1 to 1)
 * @returns {string} Color string
 */
function getCorrelationColor(correlation) {
  // Normalize correlation value for color mapping
  const normalized = (correlation + 1) / 2;
  
  // Get color (blue for negative, white for zero, red for positive)
  if (correlation < 0) {
    // Blue gradient for negative correlations
    return `rgba(0, 0, ${Math.round(255 * Math.abs(correlation))}, ${Math.abs(correlation)})`;
  } else if (correlation > 0) {
    // Red gradient for positive correlations
    return `rgba(${Math.round(255 * correlation)}, 0, 0, ${correlation})`;
  } else {
    // Neutral color for zero correlation
    return 'rgba(200, 200, 200, 0.5)';
  }
}

/**
 * Generate optimal visualizations
 * @param {Event} event Click event or trigger event
 */
async function generateOptimalVisualizations(event) {
  console.log('generateOptimalVisualizations called');
  
  if (!currentDataId) {
    alert('Please load a dataset first');
    return;
  }
  
  try {
    // Show loading state
    const vizContainer = document.querySelector('#savedVisualizations');
    if (vizContainer) {
      vizContainer.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Generating optimal visualizations...</p></div>';
    }
    
    // Fetch optimal visualizations
    const response = await fetch(`/api/optimal-visualizations/${currentDataId}?limit=5`);
    
    if (!response.ok) {
      throw new Error('Failed to generate optimal visualizations');
    }
    
    const result = await response.json();
    console.log('Optimal visualizations result:', result);
    
    // Display the visualizations
    if (result.visualizations && result.visualizations.length > 0) {
      displayOptimalVisualizations(result.visualizations);
    } else {
      if (vizContainer) {
        vizContainer.innerHTML = '<div class="alert alert-info">No visualizations could be generated for this dataset.</div>';
      }
    }
  } catch (error) {
    console.error('Error generating optimal visualizations:', error);
    const vizContainer = document.querySelector('#savedVisualizations');
    if (vizContainer) {
      vizContainer.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  }
}

/**
 * Display optimal visualizations
 * @param {Array} visualizations Array of visualization configurations
 */
function displayOptimalVisualizations(visualizations) {
  const vizContainer = document.querySelector('#savedVisualizations');
  if (!vizContainer) return;
  
  vizContainer.innerHTML = '';
  
  visualizations.forEach((viz, index) => {
    const vizCard = document.createElement('div');
    vizCard.className = 'card mb-3';
    vizCard.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${viz.config?.title || `Visualization ${index + 1}`}</h5>
        <canvas id="optimalChart${index}"></canvas>
      </div>
    `;
    vizContainer.appendChild(vizCard);
    
    // Create the chart
    setTimeout(() => {
      const canvas = document.getElementById(`optimalChart${index}`);
      if (canvas) {
        new Chart(canvas, viz);
      }
    }, 100);
  });
}