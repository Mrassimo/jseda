/**
 * Worker for processing CSV files
 */

const { workerData, parentPort } = require('worker_threads');
const { processLargeCSV } = require('../data/csv-parser');
const { detectDataTypes } = require('../data/data-utils');

async function processCSV() {
  try {
    const { filePath, dataId } = workerData;
    
    // Process CSV file
    const result = await processLargeCSV(filePath);
    
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
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

// Start processing
processCSV().catch(err => {
  parentPort.postMessage({
    success: false,
    error: err.message
  });
});
