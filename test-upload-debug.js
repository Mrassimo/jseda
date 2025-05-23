const fs = require('fs');
const path = require('path');
const { MemoryEfficientCSVProcessor } = require('./src/backend/data/csv-parser');

// Path to sample CSV data
const csvPath = path.join(__dirname, 'sample-data', 'employees.csv');

// Set up a progress callback to log all progress events
const progressCallback = (progress) => {
  console.log(JSON.stringify(progress));
};

// Create a processor instance
const processor = new MemoryEfficientCSVProcessor({
  sampleSize: 1000,
  batchSize: 5000,
  progressCallback,
  highWaterMark: 1024 * 1024 // 1MB buffer
});

// Process the file
console.log(`Starting to process: ${csvPath}`);

processor.processFile(csvPath)
  .then(result => {
    console.log('Processing complete!');
    console.log(`Rows processed: ${result.summary.rowCount}`);
    console.log(`Sample size: ${result.sampleData.length}`);
    console.log(`Columns detected: ${result.summary.columns.join(', ')}`);
    console.log(`Processing time: ${result.summary.processingTime}ms`);
    
    // Output the first 3 sample rows as a preview
    console.log('Sample data preview:');
    console.log(JSON.stringify(result.sampleData.slice(0, 3), null, 2));
  })
  .catch(err => {
    console.error('Error processing CSV file:', err);
  });