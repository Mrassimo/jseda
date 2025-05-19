/**
 * Worker for generating visualizations
 */

const { workerData, parentPort } = require('worker_threads');
const { selectChartType } = require('../visualization/chart-selector');
const { generateChartSpec } = require('../visualization/chart-generator');

function generateVisualization() {
  try {
    const { dataId, filePath, sampleData, options } = workerData;
    
    // Validate sample data
    if (!sampleData || sampleData.length === 0) {
      throw new Error('No sample data available for visualization');
    }
    
    // If chart type is specified, use it; otherwise, select automatically
    const chartType = options.chartType || 
                     selectChartType(sampleData, options).type;
    
    // Generate chart specification
    const chartSpec = generateChartSpec(chartType, sampleData, {
      ...options,
      title: options.title || `${chartType.charAt(0).toUpperCase()}${chartType.slice(1)} Chart`
    });
    
    // Add metadata
    chartSpec.metadata = {
      dataId,
      generatedAt: new Date().toISOString(),
      dataSize: sampleData.length,
      originalFilePath: filePath
    };
    
    // Send results back to parent
    parentPort.postMessage(chartSpec);
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

// Start generating visualization
generateVisualization();
