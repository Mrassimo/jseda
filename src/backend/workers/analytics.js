/**
 * Worker for generating analytics and metadata
 */

const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const csv = require('csv-parser');
const { generateDatasetMetadata } = require('../analysis/metadata-generator');
const { calculateDatasetStats } = require('../analysis/descriptive');
const { calculateCorrelationMatrix, findCorrelatedPairs } = require('../analysis/correlation');
const { analyzeDataIntegrity } = require('../analysis/data-integrity');
const { detectDataTypes } = require('../data/data-utils');
const { randomSample } = require('../data/data-sampler');
const path = require('path');

// Progress reporting function
function reportProgress(phase, progress, message, details = {}) {
  parentPort.postMessage({
    type: 'progress',
    phase,
    progress,
    message,
    ...details
  });
}

async function generateAnalytics() {
  try {
    const { dataId, filePath, summary } = workerData;
    
    // Report initial progress
    reportProgress('initializing', 0, 'Initializing analytics');
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../../logs/app');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // For large files, we need to use sampling
    const fullSampleSize = 10000; // Use a larger sample for comprehensive analysis
    
    // Report progress
    reportProgress('sampling', 10, `Loading sample data (${fullSampleSize} rows)`);
    
    // Load a sample of the data with memory efficiency
    const sampleData = await loadSampleDataEfficiently(filePath, fullSampleSize, (progress) => {
      reportProgress('sampling', 10 + Math.round(progress * 20), 
                   `Loading sample data: ${Math.round(progress * 100)}%`);
    });
    
    // Report progress
    reportProgress('analyzing', 30, 'Detecting data types');
    
    // Detect data types
    const dataTypes = detectDataTypes(sampleData);
    
    // Report progress
    reportProgress('calculating', 40, 'Calculating statistics');
    
    // Calculate comprehensive statistics
    const stats = calculateDatasetStats(sampleData, dataTypes);
    
    // Report progress
    reportProgress('correlating', 60, 'Analyzing correlations');
    
    // Calculate correlations between numeric columns
    const numericColumns = Object.keys(dataTypes)
      .filter(col => dataTypes[col] === 'numeric');
    
    let correlations = null;
    if (numericColumns.length >= 2) {
      correlations = calculateCorrelationMatrix(sampleData, numericColumns);
      
      // Make sure we format the correlations properly for frontend
      let formattedPairs = [];
      if (correlations && correlations.columns && correlations.matrix) {
        const { columns, matrix } = correlations;
        
        // Create the correlation pairs with both column and feature naming for compatibility
        formattedPairs = findCorrelatedPairs(correlations, 0.7);
        
        // Add the pairs to the correlations object
        correlations.correlated_pairs = formattedPairs;
      } else {
        console.error('Unexpected correlation matrix format:', correlations);
        // Create a default structure if we have an issue
        correlations = {
          columns: numericColumns,
          matrix: [],
          correlated_pairs: []
        };
      }
    }
    
    // Report progress
    reportProgress('metadata', 75, 'Generating metadata');
    
    // Generate comprehensive metadata for LLMs
    const metadata = generateDatasetMetadata(sampleData, {
      name: summary ? (summary.fileName || `Dataset_${dataId}`) : `Dataset_${dataId}`
    });
    
    // Report progress
    reportProgress('integrity', 85, 'Analyzing data integrity');
    
    // Generate data integrity analysis
    const dataIntegrity = analyzeDataIntegrity(sampleData, {
      australian: true, // Enable Australian-specific checks
      dataTypes
    });
    
    // Report progress
    reportProgress('finalizing', 95, 'Finalizing analysis results');
    
    // Add timestamps and detailed logging
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Data integrity analysis completed for ${dataId}. Integrity score: ${dataIntegrity.score}`);
    
    // Log data integrity issues to file
    try {
      const logFilePath = path.join(__dirname, '../../../logs/integrity', `${dataId}.json`);
      const logDir = path.dirname(logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.writeFileSync(logFilePath, JSON.stringify(dataIntegrity, null, 2));
    } catch (logError) {
      console.error(`Error writing integrity logs: ${logError.message}`);
    }
    
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
      dataIntegrity, // Add the data integrity analysis
      generatedAt: timestamp
    };
    
    // Report completion
    reportProgress('complete', 100, 'Analysis completed successfully');
    
    // Help GC by clearing large objects
    sampleData.length = 0;
    
    // Send results back to parent
    parentPort.postMessage({
      type: 'complete',
      ...analysis
    });
  } catch (error) {
    console.error(`Analytics error: ${error.message}`);
    console.error(error.stack);
    
    parentPort.postMessage({
      type: 'error',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Load a sample of data from a CSV file with memory efficiency
 * @param {string} filePath File path
 * @param {number} sampleSize Sample size
 * @param {Function} progressCallback Progress callback function
 * @returns {Promise<Array>} Sample data
 */
async function loadSampleDataEfficiently(filePath, sampleSize, progressCallback = null) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }
    
    // Get file size for progress reporting
    let fileSize = 0;
    try {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
    } catch (err) {
      console.warn(`Unable to get file size: ${err.message}`);
    }
    
    // Reservoir for sampling
    const reservoir = new Array(sampleSize);
    let count = 0;
    let bytesRead = 0;
    
    // Create stream with optimized buffer size
    const stream = fs.createReadStream(filePath, {
      highWaterMark: 1024 * 1024, // 1MB buffer
      encoding: 'utf8'
    });
    
    // Track progress
    stream.on('data', (chunk) => {
      bytesRead += chunk.length;
      
      // Report progress
      if (progressCallback && fileSize > 0) {
        progressCallback(Math.min(bytesRead / fileSize, 1));
      }
    });
    
    stream.pipe(csv())
      .on('data', (data) => {
        // Reservoir sampling for representative data
        count++;
        if (count <= sampleSize) {
          // Fill reservoir until it's full
          reservoir[count-1] = data;
        } else {
          // Randomly replace elements with decreasing probability
          const r = Math.floor(Math.random() * count);
          if (r < sampleSize) {
            reservoir[r] = data;
          }
        }
        
        // Don't let the stream process too much at once
        if (count % 10000 === 0) {
          stream.pause();
          setImmediate(() => stream.resume());
        }
      })
      .on('end', () => {
        // Get the final sample from reservoir
        const finalSample = reservoir.slice(0, Math.min(count, sampleSize)).filter(Boolean);
        
        // Report final progress
        if (progressCallback) {
          progressCallback(1);
        }
        
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
    type: 'error',
    success: false,
    error: err.message,
    stack: err.stack
  });
});