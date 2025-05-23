/**
 * Worker for processing CSV files
 */

const { workerData, parentPort } = require('worker_threads');
const { processLargeCSV, MemoryEfficientCSVProcessor } = require('../data/csv-parser');
const { detectDataTypes } = require('../data/data-utils');
const path = require('path');
const fs = require('fs');

async function processCSV() {
  try {
    const { filePath, dataId } = workerData;
    
    console.log(`Processing CSV file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if file is empty
    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Set up progress reporting
    const reportProgress = (progressData) => {
      // Send progress updates to parent
      parentPort.postMessage({
        type: 'progress',
        dataId,
        ...progressData
      });
    };

    // Use memory-efficient processor for large files
    const processor = new MemoryEfficientCSVProcessor({
      sampleSize: 1000,
      batchSize: 5000,
      progressCallback: reportProgress,
      highWaterMark: 1024 * 1024 // 1MB buffer
    });
    
    // Process CSV file
    const result = await processor.processFile(filePath);
    
    console.log(`CSV processing complete. Rows: ${result.summary.rowCount}`);
    console.log(`Processing time: ${result.summary.processingTime}ms`);
    
    // Detect data types for columns if not already detected
    const dataTypes = result.sampleData.length > 0 && !result.summary.dataTypes
      ? detectDataTypes(result.sampleData) 
      : (result.summary.dataTypes || {});
    
    // Add data types to result
    result.dataTypes = dataTypes;
    
    // Send results back to parent
    parentPort.postMessage({
      type: 'complete',
      success: true,
      dataId,
      summary: result.summary,
      sampleData: result.sampleData,
      dataTypes: result.dataTypes
    });
  } catch (error) {
    console.error(`Error processing CSV: ${error.message}`);
    console.error(error.stack);
    
    parentPort.postMessage({
      type: 'error',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

// Start processing
processCSV().catch(err => {
  console.error(`Unhandled error in CSV processor: ${err.message}`);
  console.error(err.stack);
  
  parentPort.postMessage({
    type: 'error',
    success: false,
    error: err.message,
    stack: err.stack
  });
});