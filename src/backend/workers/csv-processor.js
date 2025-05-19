/**
 * Worker for processing CSV files
 */

const { workerData, parentPort } = require('worker_threads');
const { processLargeCSV } = require('../data/csv-parser');
const { detectDataTypes } = require('../data/data-utils');
const path = require('path');
const fs = require('fs');

async function processCSV() {
  try {
    const { filePath, dataId } = workerData;
    
    console.log(`Processing CSV file: ${filePath}`);
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Process CSV file
    const result = await processLargeCSV(filePath);
    
    console.log(`CSV processing complete. Rows: ${result.summary.rowCount}`);
    
    // Detect data types for columns
    const dataTypes = result.sampleData.length > 0 
      ? detectDataTypes(result.sampleData) 
      : {};
    
    // Add data types to result
    result.dataTypes = dataTypes;
    
    // Send results back to parent
    parentPort.postMessage({
      success: true,
      dataId,
      summary: result.summary,
      sampleData: result.sampleData,
      dataTypes: result.dataTypes
    });
  } catch (error) {
    console.error(`Error processing CSV: ${error.message}`);
    
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

// Start processing
processCSV().catch(err => {
  console.error(`Unhandled error in CSV processor: ${err.message}`);
  
  parentPort.postMessage({
    success: false,
    error: err.message
  });
});