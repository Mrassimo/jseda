/**
 * Test script to verify URL parameter loading works correctly
 * 
 * This script makes a direct API call to the server to check available datasets
 * and then constructs a URL with the dataId parameter that can be used for testing.
 */

const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3030;
const API_PATH = '/api/datasets';

// Make the HTTP request
console.log(`Fetching datasets from http://${API_HOST}:${API_PORT}${API_PATH}`);

http.get({
  hostname: API_HOST,
  port: API_PORT,
  path: API_PATH,
  headers: {
    'Accept': 'application/json'
  }
}, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      // Parse the JSON response
      const datasets = JSON.parse(data);
      
      if (datasets.length === 0) {
        console.log('No datasets available. Please upload a dataset first.');
        return;
      }
      
      // Display information about each dataset
      console.log(`Found ${datasets.length} datasets:\n`);
      
      datasets.forEach((dataset, index) => {
        console.log(`${index + 1}. ID: ${dataset.id}`);
        console.log(`   Name: ${dataset.name}`);
        console.log(`   Status: ${dataset.status}`);
        console.log(`   Upload Date: ${dataset.uploadDate}`);
        
        if (dataset.rowCount) {
          console.log(`   Rows: ${dataset.rowCount}`);
        }
        
        if (dataset.columnCount) {
          console.log(`   Columns: ${dataset.columnCount}`);
        }
        
        console.log(`   URL for testing: http://${API_HOST}:${API_PORT}/index.html?data=${dataset.id}`);
        console.log();
      });
      
      // Print instruction
      console.log('To test, open one of the URLs above in your browser.');
      console.log('The dataset should load automatically.');
    } catch (error) {
      console.error('Error parsing JSON response:', error);
    }
  });
}).on('error', (err) => {
  console.error(`Error making API request: ${err.message}`);
  console.log('Make sure the server is running on the correct port.');
});