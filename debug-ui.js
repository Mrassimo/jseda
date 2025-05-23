/**
 * Debug script for EDA App UI issues
 * 
 * This script checks:
 * 1. If the server is running
 * 2. If the API endpoints are working
 * 3. If static assets are being served correctly
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3030;
const HOST = 'localhost';
const ENDPOINTS = [
  '/welcome.html',
  '/index.html',
  '/js/main.js',
  '/js/theme.js',
  '/css/style.css',
  '/api/datasets'
];

console.log(`Diagnosing EDA App UI issues on http://${HOST}:${PORT}`);
console.log('=============================================');

// Function to make HTTP request
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://${HOST}:${PORT}${endpoint}`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          dataLength: data.length,
          data: endpoint === '/api/datasets' ? JSON.parse(data) : null
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function diagnose() {
  try {
    console.log('1. Checking if server is running...');
    const welcomeResult = await makeRequest('/welcome.html');
    console.log(`   Server is running (${welcomeResult.statusCode})`);
    
    // Check for Content-Security-Policy
    console.log('\n2. Checking API endpoints...');
    const datasetsResult = await makeRequest('/api/datasets');
    console.log(`   /api/datasets: ${datasetsResult.statusCode}, found ${datasetsResult.data.length} datasets`);
    
    // Print datasets details
    if (datasetsResult.data.length > 0) {
      console.log('\n   Available datasets:');
      datasetsResult.data.forEach((dataset, i) => {
        console.log(`   ${i+1}. ${dataset.name} (ID: ${dataset.id.substring(0, 8)}...), Status: ${dataset.status}`);
      });
    }
    
    // Check static files
    console.log('\n3. Checking static assets...');
    for (const endpoint of ENDPOINTS.filter(e => e !== '/api/datasets')) {
      const result = await makeRequest(endpoint);
      console.log(`   ${endpoint}: ${result.statusCode}, Content-Type: ${result.contentType}, Size: ${result.dataLength} bytes`);
    }
    
    // Check for script errors
    console.log('\n4. Checking for potential script issues...');
    
    // Create script to inject console logger
    const debugScript = `
    <script>
      // Override console methods to report to backend
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug
      };
      
      // Log to console and to backend
      console.log = function() {
        originalConsole.log.apply(console, arguments);
        logToBackend('log', Array.from(arguments).join(' '));
      };
      
      console.warn = function() {
        originalConsole.warn.apply(console, arguments);
        logToBackend('warn', Array.from(arguments).join(' '));
      };
      
      console.error = function() {
        originalConsole.error.apply(console, arguments);
        logToBackend('error', Array.from(arguments).join(' '));
      };
      
      console.debug = function() {
        originalConsole.debug.apply(console, arguments);
        logToBackend('debug', Array.from(arguments).join(' '));
      };
      
      // Send logs to backend endpoint
      function logToBackend(level, message) {
        fetch('/debug-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ level, message, timestamp: new Date().toISOString() })
        }).catch(err => originalConsole.error('Failed to send log:', err));
      }
      
      // Add window error handler
      window.addEventListener('error', function(event) {
        logToBackend('error', 'JS Error: ' + event.message + ' in ' + event.filename + ':' + event.lineno);
      });
      
      // Add unhandled promise rejection handler
      window.addEventListener('unhandledrejection', function(event) {
        logToBackend('error', 'Unhandled Promise Rejection: ' + event.reason);
      });
      
      // Log when page is done loading
      window.addEventListener('load', function() {
        logToBackend('log', 'Page fully loaded');
      });
      
      // Log when DOM is ready
      document.addEventListener('DOMContentLoaded', function() {
        logToBackend('log', 'DOM Content Loaded');
      });
      
      // Log initial message
      logToBackend('log', 'Debug script injected at ' + new Date().toISOString());
    </script>
    `;
    
    console.log('   To debug the UI issues, you need to add debug logging.');
    console.log('   Add the following script tag just before the closing </head> tag in index.html and welcome.html:');
    console.log('\n' + debugScript);
    
    console.log('\n5. Recommendations:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Add console.debug statements to loadDatasets() and loadDataset() functions');
    console.log('   3. Verify that DOM elements exist before accessing them');
    console.log('   4. Check Content-Security-Policy headers for script restrictions');
    console.log('   5. Inspect network requests during upload to see if they complete');
    
  } catch (error) {
    console.error(`Error during diagnosis: ${error.message}`);
  }
}

// Run diagnosis
diagnose();