/**
 * Worker for generating analytics and metadata
 */

const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const csv = require('csv-parser');
const { generateDatasetMetadata } = require('../analysis/metadata-generator');
const { calculateDatasetStats } = require('../analysis/descriptive');
const { calculateCorrelationMatrix, findCorrelatedPairs } = require('../analysis/correlation');
const { detectDataTypes } = require('../data/data-utils');
const { randomSample } = require('../data/data-sampler');
const path = require('path');

async function generateAnalytics() {
  try {
    const { dataId, filePath, summary } = workerData;
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../../logs/app');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // For large files, we need to use sampling
    const fullSampleSize = 10000; // Use a larger sample for comprehensive analysis
    
    // Load a sample of the data
    const sampleData = await loadSampleData(filePath, fullSampleSize);
    
    // Detect data types
    const dataTypes = detectDataTypes(sampleData);
    
    // Calculate comprehensive statistics
    const stats = calculateDatasetStats(sampleData, dataTypes);
    
    // Calculate correlations between numeric columns
    const numericColumns = Object.keys(dataTypes)
      .filter(col => dataTypes[col] === 'numeric');
    
    let correlations = null;
    if (numericColumns.length >= 2) {
      correlations = calculateCorrelationMatrix(sampleData, numericColumns);
      // Find correlated pairs
      const correlatedPairs = findCorrelatedPairs(correlations, 0.7);
      correlations.correlated_pairs = correlatedPairs;
    }
    
    // Generate comprehensive metadata for LLMs
    const metadata = generateDatasetMetadata(sampleData, {
      name: summary ? (summary.fileName || `Dataset_${dataId}`) : `Dataset_${dataId}`
    });
    
    // Build the complete analysis object
    const analysis = {
      dataId,
      summary: {
        ...(summary || {}),
        rowCount: summary ? (summary.rowCount || sampleData.length) : sampleData.length,
        columnCount: Object.keys(dataTypes).length,
        dataTypes
      },
      statistics: stats,
      correlations,
      metadata,
      generatedAt: new Date().toISOString()
    };
    
    // Send results back to parent
    parentPort.postMessage(analysis);
  } catch (error) {
    console.error(`Analytics error: ${error.message}`);
    console.error(error.stack);
    
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

/**
 * Load a sample of data from a CSV file
 * @param {string} filePath File path
 * @param {number} sampleSize Sample size
 * @returns {Promise<Array>} Sample data
 */
async function loadSampleData(filePath, sampleSize) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }
    
    const results = [];
    let count = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
        count++;
        
        // Basic sampling - take the first N rows
        // For a more sophisticated approach, use reservoir sampling
        if (count >= sampleSize) {
          // Stop reading the file
          this.destroy();
        }
      })
      .on('end', () => {
        // If we have more data than needed, apply random sampling
        const finalSample = results.length > sampleSize 
          ? randomSample(results, sampleSize) 
          : results;
          
        resolve(finalSample);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Start generating analytics
generateAnalytics().catch(err => {
  console.error(`Unhandled analytics error: ${err.message}`);
  console.error(err.stack);
  
  parentPort.postMessage({
    success: false,
    error: err.message
  });
});