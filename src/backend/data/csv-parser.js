const fs = require('fs');
const csv = require('csv-parser');
const { Transform } = require('stream');

/**
 * Process a large CSV file using streaming
 * @param {string} filePath Path to the CSV file
 * @param {number} sampleSize Number of rows to sample for preview
 * @returns {Promise<object>} Statistics and sample data
 */
function processLargeCSV(filePath, sampleSize = 1000, progressCallback = null) {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }
    
    console.log(`Starting to process CSV file: ${filePath}`);
    
    // Get file size for progress tracking
    let fileSize;
    try {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
    } catch (err) {
      console.warn(`Unable to get file size: ${err.message}`);
      fileSize = 0;
    }
    
    // Track statistics instead of storing all rows
    const stats = {
      rowCount: 0,
      columnStats: {},
      columns: [],
      fileSize
    };
    
    // Sample data for previews and chart generation
    const sampleData = [];
    
    // Create reservoir for sampling
    const reservoir = new Array(sampleSize);
    let count = 0;
    let bytesRead = 0;
    
    // Create read stream with high watermark for better performance with large files
    // This increases the internal buffer size for more efficient reading
    const stream = fs.createReadStream(filePath, { 
      highWaterMark: 1024 * 1024, // 1MB buffer size
      encoding: 'utf8' 
    });
    
    stream.on('error', (err) => {
      console.error(`Error reading file: ${err.message}`);
      reject(err);
    });
    
    // Track progress as data is read
    stream.on('data', (chunk) => {
      bytesRead += chunk.length;
      
      // Report progress if callback provided and file size is known
      if (progressCallback && fileSize > 0) {
        const progress = Math.min(Math.round((bytesRead / fileSize) * 100), 100);
        progressCallback({
          phase: 'reading',
          progress,
          bytesRead,
          totalBytes: fileSize
        });
      }
    });
    
    stream
      .pipe(csv())
      .on('headers', (headers) => {
        console.log(`CSV headers detected: ${headers.join(', ')}`);
        stats.columns = headers;
        
        // Initialize column stats
        headers.forEach(column => {
          stats.columnStats[column] = { 
            sum: 0, 
            min: Infinity, 
            max: -Infinity, 
            count: 0,
            nullCount: 0,
            numericCount: 0,
            textCount: 0,
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
        
        // Report progress for large files
        if (stats.rowCount % 100000 === 0) {
          console.log(`Processed ${stats.rowCount} rows...`);
          
          // Report row processing progress if callback provided
          if (progressCallback) {
            progressCallback({
              phase: 'processing',
              rowsProcessed: stats.rowCount,
              progress: fileSize > 0 ? Math.min(Math.round((bytesRead / fileSize) * 100), 100) : null
            });
          }
        }
      })
      .on('end', () => {
        console.log(`Finished processing CSV. Total rows: ${stats.rowCount}`);
        
        // Report completion if callback provided
        if (progressCallback) {
          progressCallback({
            phase: 'finalizing',
            rowsProcessed: stats.rowCount,
            progress: 100
          });
        }
        
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
        const sampleArray = reservoir.slice(0, Math.min(count, sampleSize)).filter(Boolean);
        
        console.log(`Sample size: ${sampleArray.length} rows`);
        
        // Final progress update
        if (progressCallback) {
          progressCallback({
            phase: 'complete',
            rowsProcessed: stats.rowCount,
            sampleSize: sampleArray.length,
            progress: 100
          });
        }
        
        // Clear large objects to help with garbage collection
        reservoir.length = 0;
        
        resolve({
          summary: stats,
          sampleData: sampleArray
        });
      })
      .on('error', (error) => {
        console.error(`Error parsing CSV: ${error.message}`);
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
        sum: 0, 
        min: Infinity, 
        max: -Infinity, 
        count: 0, 
        nullCount: 0,
        numericCount: 0,  // Track how many values are numeric
        textCount: 0      // Track how many values are text
      };
    }
    
    const colStats = stats.columnStats[column];
    
    // Handle null/empty values
    if (value === null || value === undefined || value === '') {
      colStats.nullCount++;
      return;
    }
    
    // Try to parse as number
    const trimmedValue = String(value).trim();
    const numValue = parseFloat(trimmedValue);
    
    // Check if it's truly a number (not just parseable)
    // This prevents "123abc" from being considered numeric
    if (!isNaN(numValue) && !isNaN(parseFloat(trimmedValue)) && isFinite(numValue)) {
      // Additional check: the parsed number string should match the original (ignoring whitespace)
      // This prevents dates like "2020-01-01" from being considered numeric
      const numStr = String(numValue);
      if (trimmedValue === numStr || trimmedValue === numValue.toString()) {
        colStats.sum += numValue;
        colStats.min = Math.min(colStats.min, numValue);
        colStats.max = Math.max(colStats.max, numValue);
        colStats.count++;
        colStats.numericCount++;
        return;
      }
    }
    
    // It's a text value
    colStats.count++;
    colStats.textCount++;
  });
}

/**
 * Infer data type from statistics
 * @param {object} colStats Column statistics
 * @returns {string} Inferred data type
 */
function inferDataType(colStats) {
  // If we have the new tracking fields, use them
  if (colStats.numericCount !== undefined && colStats.textCount !== undefined) {
    const totalNonNull = colStats.numericCount + colStats.textCount;
    
    // If more than 90% of non-null values are numeric, it's a numeric column
    if (totalNonNull > 0 && (colStats.numericCount / totalNonNull) > 0.9) {
      return 'numeric';
    }
    
    // If any numeric values exist but not dominant, it might be mixed
    if (colStats.numericCount > 0 && colStats.textCount > 0) {
      return 'mixed';
    }
    
    // Pure text column
    if (colStats.textCount > 0) {
      return 'categorical';
    }
  }
  
  // Fallback to old logic for backward compatibility
  if (colStats.count > 0 && 
      colStats.min !== null && 
      colStats.max !== null && 
      isFinite(colStats.min) && 
      isFinite(colStats.max)) {
    return 'numeric';
  }
  
  return 'categorical';
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

/**
 * Stream processor for memory-efficient CSV processing
 * Helps with reducing memory consumption for very large files
 */
class MemoryEfficientCSVProcessor {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 5000,
      sampleSize: options.sampleSize || 1000,
      progressCallback: options.progressCallback || null,
      highWaterMark: options.highWaterMark || (1024 * 1024), // 1MB buffer
      maxMemoryMB: options.maxMemoryMB || 100, // Maximum memory allocation (100MB default)
      progressInterval: options.progressInterval || 1000, // Progress update interval in ms
      adaptiveBatching: options.adaptiveBatching !== false // Adaptively adjust batch size based on memory usage
    };
    
    this.stats = {
      rowCount: 0,
      columnStats: {},
      columns: [],
      fileSize: 0,
      processingTime: 0,
      startTime: 0,
      memoryUsage: {
        max: 0,
        current: 0
      },
      estimatedTimeRemaining: null
    };
    
    this.reservoir = new Array(this.options.sampleSize);
    this.count = 0;
    this.bytesRead = 0;
    this.lastProgressUpdate = 0;
    this.processingRate = 0; // rows per second
    this.pauseThreshold = 0.9 * this.options.maxMemoryMB * 1024 * 1024; // 90% of max memory
    this.streamPaused = false;
  }
  
  /**
   * Process a large CSV file with memory efficiency
   * @param {string} filePath Path to CSV file
   * @returns {Promise<object>} Processing results
   */
  processFile(filePath) {
    return new Promise((resolve, reject) => {
      this.stats.startTime = Date.now();
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }
      
      // Get file size for progress tracking
      try {
        const stats = fs.statSync(filePath);
        this.stats.fileSize = stats.size;
      } catch (err) {
        console.warn(`Unable to get file size: ${err.message}`);
      }
      
      // Create read stream with custom buffer size
      const stream = fs.createReadStream(filePath, { 
        highWaterMark: this.options.highWaterMark,
        encoding: 'utf8'
      });
      
      let parser = csv();
      let batchBuffer = [];
      let headersParsed = false;
      
      // Set up periodic memory check and progress updates
      const memoryCheckInterval = setInterval(() => {
        this._checkMemoryUsage(stream);
        this._updateProcessingStats();
      }, 2000);
      
      stream.on('data', (chunk) => {
        this.bytesRead += chunk.length;
        
        // Report read progress if enough time has passed
        const now = Date.now();
        if (now - this.lastProgressUpdate >= this.options.progressInterval) {
          this._reportProgress('reading');
          this.lastProgressUpdate = now;
        }
      });
      
      parser.on('headers', (headers) => {
        headersParsed = true;
        this.stats.columns = headers;
        
        // Initialize column stats
        headers.forEach(column => {
          this.stats.columnStats[column] = { 
            sum: 0, 
            min: Infinity, 
            max: -Infinity, 
            count: 0,
            nullCount: 0,
            numericCount: 0,
            textCount: 0,
            dataType: null
          };
        });
        
        this._reportProgress('headers-detected', {
          message: `Detected ${headers.length} columns`,
          headers
        });
      });
      
      parser.on('data', (row) => {
        // Process in batches to reduce GC pressure
        batchBuffer.push(row);
        
        // Reservoir sampling for representative data
        this.count++;
        if (this.count <= this.options.sampleSize) {
          // Fill reservoir until it's full
          this.reservoir[this.count - 1] = { ...row }; // Clone to avoid reference issues
        } else {
          // Randomly replace elements with decreasing probability
          const r = Math.floor(Math.random() * this.count);
          if (r < this.options.sampleSize) {
            this.reservoir[r] = { ...row }; // Clone to avoid reference issues
          }
        }
        
        this.stats.rowCount++;
        
        // Process in batches to improve performance and reduce GC pressure
        if (batchBuffer.length >= this.options.batchSize) {
          // Process the batch
          this._processBatch(batchBuffer);
          
          // Clear the buffer, but keep the array instance to reduce allocations
          batchBuffer.length = 0;
          
          // Report progress after each batch
          const now = Date.now();
          if (now - this.lastProgressUpdate >= this.options.progressInterval) {
            this._reportProgress('processing-batch');
            this.lastProgressUpdate = now;
          }
          
          // Run garbage collection every 50 batches
          if (this.stats.rowCount % (this.options.batchSize * 50) === 0) {
            // Force a full garbage collection cycle (if supported)
            if (global.gc && typeof global.gc === 'function') {
              global.gc();
            }
          }
        }
      });
      
      parser.on('end', () => {
        // Process any remaining rows in the batch
        if (batchBuffer.length > 0) {
          this._processBatch(batchBuffer);
          batchBuffer.length = 0;
        }
        
        // Finalize statistics
        this._finalizeStats();
        
        // Calculate processing time
        this.stats.processingTime = Date.now() - this.stats.startTime;
        
        // Get sample data from reservoir
        const sampleArray = this.reservoir
          .slice(0, Math.min(this.count, this.options.sampleSize))
          .filter(Boolean);
        
        // Clear the memory check interval
        clearInterval(memoryCheckInterval);
        
        // Report completion
        this._reportProgress('complete', {
          message: `Processed ${this.stats.rowCount.toLocaleString()} rows in ${(this.stats.processingTime / 1000).toFixed(2)}s`,
          processingTime: this.stats.processingTime,
          sampleSize: sampleArray.length
        });
        
        // Help garbage collection by clearing large objects
        this.reservoir.length = 0;
        batchBuffer = null;
        
        // Explicitly run garbage collection if available
        if (global.gc && typeof global.gc === 'function') {
          global.gc();
        }
        
        // Resolve with results
        resolve({
          summary: this.stats,
          sampleData: sampleArray
        });
      });
      
      // Handle errors
      parser.on('error', (err) => {
        clearInterval(memoryCheckInterval);
        console.error(`Error parsing CSV: ${err.message}`);
        reject(err);
      });
      
      stream.on('error', (err) => {
        clearInterval(memoryCheckInterval);
        console.error(`Error reading file: ${err.message}`);
        reject(err);
      });
      
      // Connect the streams
      stream.pipe(parser);
    });
  }
  
  /**
   * Process a batch of rows to update statistics
   * @private
   * @param {Array} batch Batch of rows to process
   */
  _processBatch(batch) {
    // Process each row in the batch
    for (const row of batch) {
      // For each column, update running statistics
      Object.entries(row).forEach(([column, value]) => {
        if (!this.stats.columnStats[column]) {
          // Add missing column if headers were incomplete
          this.stats.columnStats[column] = { 
            sum: 0, 
            min: Infinity, 
            max: -Infinity, 
            count: 0, 
            nullCount: 0,
            numericCount: 0,
            textCount: 0
          };
        }
        
        const colStats = this.stats.columnStats[column];
        
        // Handle null/empty values
        if (value === null || value === undefined || value === '') {
          colStats.nullCount++;
          return;
        }
        
        // Try to parse as number
        const trimmedValue = String(value).trim();
        const numValue = parseFloat(trimmedValue);
        
        // Check if it's truly a number (not just parseable)
        if (!isNaN(numValue) && !isNaN(parseFloat(trimmedValue)) && isFinite(numValue)) {
          // Additional check: the parsed number string should match the original
          const numStr = String(numValue);
          if (trimmedValue === numStr || trimmedValue === numValue.toString()) {
            colStats.sum += numValue;
            colStats.min = Math.min(colStats.min, numValue);
            colStats.max = Math.max(colStats.max, numValue);
            colStats.count++;
            colStats.numericCount++;
            return;
          }
        }
        
        // It's a text value
        colStats.count++;
        colStats.textCount++;
      });
    }
  }
  
  /**
   * Finalize statistics after processing
   * @private
   */
  _finalizeStats() {
    Object.keys(this.stats.columnStats).forEach(column => {
      const colStats = this.stats.columnStats[column];
      if (colStats.count > 0) {
        colStats.mean = colStats.sum / colStats.count;
      }
      
      // Determine data type
      colStats.dataType = inferDataType(colStats);
      
      // Clean up infinity values for JSON serialization
      if (colStats.min === Infinity) colStats.min = null;
      if (colStats.max === -Infinity) colStats.max = null;
    });
  }
  
  /**
   * Check memory usage and pause stream if needed
   * @private
   * @param {ReadStream} stream The file read stream
   */
  _checkMemoryUsage(stream) {
    // Get current memory usage
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    
    // Update stats
    this.stats.memoryUsage.current = heapUsed;
    this.stats.memoryUsage.max = Math.max(this.stats.memoryUsage.max, heapUsed);
    
    // If using adaptive batching, adjust batch size based on memory pressure
    if (this.options.adaptiveBatching && this.stats.rowCount > 10000) {
      // If memory usage is high (over 70% of threshold), reduce batch size
      if (heapUsed > 0.7 * this.pauseThreshold && this.options.batchSize > 1000) {
        this.options.batchSize = Math.max(1000, Math.floor(this.options.batchSize * 0.8));
        console.log(`High memory usage (${(heapUsed / 1024 / 1024).toFixed(2)}MB), reducing batch size to ${this.options.batchSize}`);
      }
      // If memory usage is low (under 40% of threshold), increase batch size
      else if (heapUsed < 0.4 * this.pauseThreshold && this.options.batchSize < 20000) {
        this.options.batchSize = Math.min(20000, Math.floor(this.options.batchSize * 1.2));
      }
    }
    
    // If memory usage exceeds threshold, pause the stream until GC runs
    if (stream && stream.readable && !this.streamPaused && heapUsed > this.pauseThreshold) {
      console.log(`Memory usage exceeded threshold (${(heapUsed / 1024 / 1024).toFixed(2)}MB), pausing stream`);
      stream.pause();
      this.streamPaused = true;
      
      // Report high memory usage
      this._reportProgress('memory-pressure', {
        memoryUsage: (heapUsed / 1024 / 1024).toFixed(2),
        message: 'High memory usage detected, processing paused temporarily'
      });
      
      // Try to run garbage collection if available
      if (global.gc && typeof global.gc === 'function') {
        global.gc();
      }
      
      // Resume after a delay to allow GC to work
      setTimeout(() => {
        if (stream && stream.readable && this.streamPaused) {
          console.log('Resuming stream after memory pressure mitigation');
          stream.resume();
          this.streamPaused = false;
          
          this._reportProgress('processing-resumed', {
            message: 'Processing resumed after memory cleanup'
          });
        }
      }, 500);
    }
  }
  
  /**
   * Update processing statistics
   * @private
   */
  _updateProcessingStats() {
    // Calculate processing rate (rows per second)
    const elapsedSeconds = (Date.now() - this.stats.startTime) / 1000;
    if (elapsedSeconds > 0) {
      this.processingRate = this.stats.rowCount / elapsedSeconds;
    }
    
    // Estimate time remaining if we know the file size
    if (this.stats.fileSize > 0 && this.bytesRead > 0 && this.processingRate > 0) {
      const estimatedTotalRows = Math.round(this.stats.rowCount * (this.stats.fileSize / this.bytesRead));
      const remainingRows = estimatedTotalRows - this.stats.rowCount;
      const remainingSeconds = remainingRows / this.processingRate;
      
      this.stats.estimatedTimeRemaining = Math.round(remainingSeconds);
    }
  }
  
  /**
   * Report progress through callback if provided
   * @private
   * @param {string} phase Current processing phase
   * @param {object} additionalData Additional data to include in progress report
   */
  _reportProgress(phase, additionalData = {}) {
    if (!this.options.progressCallback) return;
    
    const progressData = {
      phase,
      rowsProcessed: this.stats.rowCount,
      bytesRead: this.bytesRead,
      totalBytes: this.stats.fileSize,
      processingRate: this.processingRate ? Math.round(this.processingRate) : null,
      estimatedTimeRemaining: this.stats.estimatedTimeRemaining,
      memoryUsage: Math.round(this.stats.memoryUsage.current / 1024 / 1024) // in MB
    };
    
    // Add progress percentage if file size is known
    if (this.stats.fileSize > 0) {
      progressData.progress = Math.min(Math.round((this.bytesRead / this.stats.fileSize) * 100), 100);
    }
    
    // Add any additional data
    Object.assign(progressData, additionalData);
    
    this.options.progressCallback(progressData);
  }
}

module.exports = {
  processLargeCSV,
  ChunkProcessor,
  MemoryEfficientCSVProcessor
};
