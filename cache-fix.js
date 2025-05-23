/**
 * Cache and Data Store Diagnostic Utility
 * 
 * This script checks and fixes issues with the data store and cache,
 * particularly focusing on sample data that might be empty.
 */

const fs = require('fs');
const path = require('path');
const { processLargeCSV } = require('./src/backend/data/csv-parser');

// Global state from server (we need to load this dynamically)
let dataStore;
let cacheManager;

// Configuration
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DEFAULT_SAMPLE_SIZE = 1000;

/**
 * Initialize by importing cached data store from server
 */
async function initialize() {
  console.log('Initializing cache diagnostic utility...');
  
  try {
    // Directly access the data store from the running server
    const serverStatePath = path.join(__dirname, 'server-state.json');
    
    // Try to export current server state
    await exportServerState();
    
    if (fs.existsSync(serverStatePath)) {
      const state = JSON.parse(fs.readFileSync(serverStatePath, 'utf8'));
      dataStore = state.dataStore || {};
      
      console.log(`Loaded data store with ${Object.keys(dataStore).length} datasets`);
      return true;
    } else {
      console.error('Unable to load server state. Start diagnostic with server running.');
      return false;
    }
  } catch (err) {
    console.error('Failed to initialize:', err);
    return false;
  }
}

/**
 * Export server state to a file
 */
async function exportServerState() {
  console.log('Exporting server state...');
  
  const script = `
    const fs = require('fs');
    const path = require('path');
    
    // Serialize relevant server state
    const state = {
      dataStore: global.dataStore || {},
      timestamp: new Date().toISOString()
    };
    
    // Write to file
    fs.writeFileSync(
      path.join(__dirname, 'server-state.json'), 
      JSON.stringify(state, (key, value) => {
        // Handle circular references and functions
        if (typeof value === 'function') {
          return 'function';
        }
        return value;
      }, 2)
    );
    
    console.log('Server state exported successfully');
  `;
  
  const scriptPath = path.join(__dirname, 'export-state.js');
  fs.writeFileSync(scriptPath, script);
  
  return new Promise((resolve, reject) => {
    // Use a separate process to run the script
    const { exec } = require('child_process');
    
    console.log('Running state export script...');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      console.log('Export output:', stdout);
      
      if (error) {
        console.error('Export error:', stderr);
        reject(error);
        return;
      }
      
      // Clean up script
      fs.unlinkSync(scriptPath);
      resolve();
    });
  });
}

/**
 * Check sample data for each dataset
 */
async function checkSampleData() {
  console.log('\nChecking sample data for all datasets...');
  
  const datasets = Object.values(dataStore);
  
  if (datasets.length === 0) {
    console.log('No datasets found in data store.');
    return;
  }
  
  console.log(`Found ${datasets.length} datasets.`);
  
  const issues = [];
  
  for (const dataset of datasets) {
    console.log(`\nChecking dataset: ${dataset.originalName} (${dataset.id})`);
    
    if (dataset.status !== 'ready') {
      console.log(`- Status: ${dataset.status} - skipping check`);
      continue;
    }
    
    console.log(`- Status: ${dataset.status}`);
    
    // Check if sample data exists
    if (!dataset.sampleData || !Array.isArray(dataset.sampleData) || dataset.sampleData.length === 0) {
      console.log(`! ISSUE: Sample data is empty or missing`);
      
      issues.push({
        dataId: dataset.id,
        name: dataset.originalName,
        issue: 'Empty sample data',
        filePath: dataset.filePath
      });
    } else {
      console.log(`- Sample data: ${dataset.sampleData.length} rows`);
    }
  }
  
  return issues;
}

/**
 * Fix empty sample data issues
 */
async function fixEmptySampleData(issues) {
  if (!issues || issues.length === 0) {
    console.log('\nNo issues to fix.');
    return;
  }
  
  console.log(`\nFixing ${issues.length} datasets with empty sample data...`);
  
  for (const issue of issues) {
    console.log(`\nFixing dataset: ${issue.name} (${issue.dataId})`);
    
    if (!fs.existsSync(issue.filePath)) {
      console.log(`- Error: File not found: ${issue.filePath}`);
      continue;
    }
    
    try {
      console.log(`- Processing file to regenerate sample data...`);
      
      // Process the CSV file to regenerate sample data
      const result = await processLargeCSV(issue.filePath, DEFAULT_SAMPLE_SIZE, 
        (progress) => {
          if (progress.phase === 'complete') {
            console.log(`- Processing complete: ${progress.rowsProcessed} rows processed`);
          }
        }
      );
      
      if (result.sampleData && result.sampleData.length > 0) {
        console.log(`- Generated ${result.sampleData.length} sample rows`);
        
        // Update the data store with new sample data
        dataStore[issue.dataId].sampleData = result.sampleData;
        
        // Update server with new sample data
        await updateServerDataset(issue.dataId, result.sampleData);
      } else {
        console.log(`! Error: Failed to generate sample data`);
      }
    } catch (err) {
      console.error(`! Error processing file: ${err.message}`);
    }
  }
}

/**
 * Update server dataset with new sample data
 */
async function updateServerDataset(dataId, sampleData) {
  console.log(`Updating server dataset ${dataId} with new sample data...`);
  
  const script = `
    const fs = require('fs');
    const path = require('path');
    
    // Update dataset
    const dataId = '${dataId}';
    const sampleData = ${JSON.stringify(sampleData)};
    
    if (global.dataStore && global.dataStore[dataId]) {
      // Update sample data
      global.dataStore[dataId].sampleData = sampleData;
      
      // Clear cache for this dataset
      if (global.cacheManager && typeof global.cacheManager.invalidate === 'function') {
        global.cacheManager.invalidate('sampleData', dataId);
      }
      
      // Report success
      console.log('Dataset updated successfully');
    } else {
      console.log('Dataset not found in server data store');
    }
  `;
  
  const scriptPath = path.join(__dirname, 'update-dataset.js');
  fs.writeFileSync(scriptPath, script);
  
  return new Promise((resolve, reject) => {
    // Use a separate process to run the script
    const { exec } = require('child_process');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      console.log('Update output:', stdout);
      
      if (error) {
        console.error('Update error:', stderr);
        reject(error);
        return;
      }
      
      // Clean up script
      fs.unlinkSync(scriptPath);
      resolve();
    });
  });
}

/**
 * Create an API client script to diagnose issues from outside the server
 */
async function createApiDiagnosticScript() {
  console.log('\nCreating API diagnostic script...');
  
  const scriptContent = `/**
 * API Diagnostic Script 
 * 
 * Tests the sample data endpoint to verify if data is being returned correctly
 */

const http = require('http');
const fs = require('fs');

// Configuration
const HOST = 'localhost';
const PORT = 3030;
const OUTPUT_FILE = 'api-diagnostic-results.json';

/**
 * Make HTTP request to API
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (err) {
          reject(new Error(\`Failed to parse response: \${err.message}\`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

/**
 * Run diagnostics on API endpoints
 */
async function runDiagnostics() {
  console.log('Running API diagnostics...');
  
  const results = {
    datasets: [],
    timestamp: new Date().toISOString()
  };
  
  try {
    // Get datasets
    console.log('Fetching datasets...');
    const datasetsResponse = await makeRequest('/api/datasets');
    
    if (!datasetsResponse.data || !Array.isArray(datasetsResponse.data)) {
      throw new Error('Invalid datasets response');
    }
    
    const datasets = datasetsResponse.data;
    console.log(\`Found \${datasets.length} datasets\`);
    
    // Test each dataset
    for (const dataset of datasets) {
      console.log(\`Testing dataset: \${dataset.name} (\${dataset.id})\`);
      
      // Get dataset info
      const datasetResponse = await makeRequest(\`/api/data/\${dataset.id}\`);
      
      // Get sample data
      const sampleResponse = await makeRequest(\`/api/data/\${dataset.id}/sample?limit=5\`);
      
      const datasetResult = {
        id: dataset.id,
        name: dataset.name,
        status: dataset.status,
        datasetResponseStatus: datasetResponse.statusCode,
        sampleResponseStatus: sampleResponse.statusCode,
        hasSummary: !!(datasetResponse.data && datasetResponse.data.summary),
        sampleCount: sampleResponse.data && sampleResponse.data.sample ? sampleResponse.data.sample.length : 0,
        fromCache: sampleResponse.data ? sampleResponse.data.fromCache : false,
        sample: sampleResponse.data && sampleResponse.data.sample ? sampleResponse.data.sample.slice(0, 2) : []
      };
      
      results.datasets.push(datasetResult);
      
      console.log(\`  - Status: \${datasetResult.status}\`);
      console.log(\`  - Sample Count: \${datasetResult.sampleCount}\`);
      console.log(\`  - From Cache: \${datasetResult.fromCache}\`);
    }
    
    // Write results to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(\`Results written to \${OUTPUT_FILE}\`);
    
    return results;
  } catch (err) {
    console.error(\`Error during diagnostics: \${err.message}\`);
    throw err;
  }
}

// Run diagnostics
runDiagnostics()
  .then(() => {
    console.log('Diagnostics completed successfully');
  })
  .catch((err) => {
    console.error(\`Diagnostics failed: \${err.message}\`);
    process.exit(1);
  });
`;
  
  const scriptPath = path.join(__dirname, 'api-diagnostic.js');
  fs.writeFileSync(scriptPath, scriptContent);
  
  console.log(`API diagnostic script created: ${scriptPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Cache and Data Store Diagnostic Utility');
  console.log('======================================');
  
  const initialized = await initialize();
  
  if (!initialized) {
    console.log('\nFailed to initialize. Make sure the server is running.');
    process.exit(1);
  }
  
  // Check sample data
  const issues = await checkSampleData();
  
  // Create API diagnostic script
  await createApiDiagnosticScript();
  
  if (issues && issues.length > 0) {
    console.log(`\nFound ${issues.length} datasets with issues.`);
    
    // Ask if user wants to fix issues
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Do you want to fix these issues? (y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await fixEmptySampleData(issues);
        console.log('\nFix applied! Please restart the server to apply changes.');
      } else {
        console.log('\nNo changes made. You can fix issues later by running this script again.');
      }
      
      rl.close();
    });
  } else {
    console.log('\nNo issues found with sample data.');
  }
}

// Run the main function
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});