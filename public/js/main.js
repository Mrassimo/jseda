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

// The rest of the code remains the same
