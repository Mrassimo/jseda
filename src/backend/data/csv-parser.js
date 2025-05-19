const fs = require('fs');
const csv = require('csv-parser');
const { Transform } = require('stream');

/**
 * Process a large CSV file using streaming
 * @param {string} filePath Path to the CSV file
 * @param {number} sampleSize Number of rows to sample for preview
 * @returns {Promise<object>} Statistics and sample data
 */
function processLargeCSV(filePath, sampleSize = 1000) {
  return new Promise((resolve, reject) => {
    // Track statistics instead of storing all rows
    const stats = {
      rowCount: 0,
      columnStats: {},
      columns: []
    };
    
    // Sample data for previews and chart generation
    const sampleData = [];
    
    // Create reservoir for sampling
    const reservoir = new Array(sampleSize);
    let count = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        stats.columns = headers;
        
        // Initialize column stats
        headers.forEach(column => {
          stats.columnStats[column] = { 
            sum: 0, 
            min: Infinity, 
            max: -Infinity, 
            count: 0,
            nullCount: 0,
            dataType: null
          };
        });
      })
      .on('data', (row) => {
        // Update statistics
        processRowStreamingly(row, stats);
        
        // Reservoir sampling for representative data
        count++;
        if (count <= sampleSize) {
          // Fill reservoir until it's full
          reservoir[count-1] = row;
        } else {
          // Randomly replace elements with decreasing probability
          const r = Math.floor(Math.random() * count);
          if (r < sampleSize) {
            reservoir[r] = row;
          }
        }
        
        stats.rowCount++;
      })
      .on('end', () => {
        // Finalize statistics
        Object.keys(stats.columnStats).forEach(column => {
          const colStats = stats.columnStats[column];
          if (colStats.count > 0) {
            colStats.mean = colStats.sum / colStats.count;
          }
          
          // Determine data type
          colStats.dataType = inferDataType(colStats);
          
          // Clean up infinity values for JSON serialization
          if (colStats.min === Infinity) colStats.min = null;
          if (colStats.max === -Infinity) colStats.max = null;
        });
        
        // Set the sample data from reservoir
        const sampleArray = reservoir.slice(0, Math.min(count, sampleSize));
        
        resolve({
          summary: stats,
          sampleData: sampleArray
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Process a single row to update running statistics
 * @param {object} row The CSV row
 * @param {object} stats Statistics object to update
 */
function processRowStreamingly(row, stats) {
  // For each column, update running statistics
  Object.entries(row).forEach(([column, value]) => {
    if (!stats.columnStats[column]) {
      // Add missing column if headers were incomplete
      stats.columnStats[column] = { 
        sum: 0, min: Infinity, max: -Infinity, count: 0, nullCount: 0
      };
    }
    
    const colStats = stats.columnStats[column];
    
    // Handle null/empty values
    if (value === null || value === undefined || value === '') {
      colStats.nullCount++;
      return;
    }
    
    // Try to parse as number
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      colStats.sum += numValue;
      colStats.min = Math.min(colStats.min, numValue);
      colStats.max = Math.max(colStats.max, numValue);
      colStats.count++;
    } else {
      // For non-numeric values, just count them
      colStats.count++;
    }
  });
}

/**
 * Infer data type from statistics
 * @param {object} colStats Column statistics
 * @returns {string} Inferred data type
 */
function inferDataType(colStats) {
  // If mostly numeric values
  if (colStats.count > 0 && colStats.sum !== undefined) {
    return 'numeric';
  }
  
  // For now, default to string (could be enhanced to detect dates, etc.)
  return 'string';
}

/**
 * Chunk processor for batched CSV processing
 */
class ChunkProcessor extends Transform {
  constructor(processFn, options = {}) {
    options.objectMode = true;
    super(options);
    this.processFn = processFn;
    this.batchSize = options.batchSize || 1000;
    this.batch = [];
  }
  
  _transform(chunk, encoding, callback) {
    this.batch.push(chunk);
    
    if (this.batch.length >= this.batchSize) {
      this._processBatch(callback);
    } else {
      callback();
    }
  }
  
  _flush(callback) {
    if (this.batch.length > 0) {
      this._processBatch(callback);
    } else {
      callback();
    }
  }
  
  _processBatch(callback) {
    try {
      const results = this.processFn(this.batch);
      this.push(results);
      this.batch = [];
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = {
  processLargeCSV,
  ChunkProcessor
};
