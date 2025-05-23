/**
 * Automated test to verify the dataset loading fix
 * 
 * This script:
 * 1. Starts the server if not already running
 * 2. Uses the same sample-data loading mechanism as the app
 * 3. Verifies that the dataset is properly displayed
 *
 * Note: This script requires puppeteer to automate the browser
 * Install with: npm install puppeteer --save-dev
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

// Configuration
const PORT = 3030;
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_PATH = path.join(__dirname, 'server.js');
const TIMEOUT = 30000; // 30 seconds timeout

// Sample data to use for testing
const SAMPLE_FILE = path.join(__dirname, 'sample-data', 'employees.csv');

let serverProcess = null;
let browser = null;
let page = null;

// Check if server is already running
async function isServerRunning() {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}/welcome.html`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Start server if needed
async function ensureServerRunning() {
  const running = await isServerRunning();
  
  if (!running) {
    console.log('Starting server...');
    serverProcess = fork(SERVER_PATH);
    
    // Wait for server to start
    let attempts = 0;
    while (!(await isServerRunning()) && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (attempts >= 10) {
      throw new Error('Failed to start server');
    }
    
    console.log('Server started');
  } else {
    console.log('Server already running');
  }
}

// Load sample dataset
async function loadSampleDataset() {
  console.log('Loading sample dataset...');
  
  // Read the sample CSV file
  const fileContent = fs.readFileSync(SAMPLE_FILE);
  
  // Create form data for upload
  const formData = new FormData();
  formData.append('csvFile', new Blob([fileContent], { type: 'text/csv' }), 'employees.csv');
  
  // Upload the file
  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`Dataset uploaded with ID: ${result.dataId}`);
  
  return result.dataId;
}

// Test URL-based dataset loading
async function testUrlLoading(dataId) {
  console.log('Testing URL-based dataset loading...');
  
  // Launch browser
  browser = await puppeteer.launch({
    headless: true, // Set to false to see browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Navigate to the application with dataId parameter
  const url = `${BASE_URL}/index.html?data=${dataId}`;
  console.log(`Opening URL: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  
  // Check if dataset panel is visible
  const isPanelVisible = await page.evaluate(() => {
    const panel = document.getElementById('dataPanel');
    return panel && !panel.classList.contains('hidden');
  });
  
  if (!isPanelVisible) {
    throw new Error('Dataset panel is not visible, loading failed');
  }
  
  // Check if dataset name is populated
  const datasetName = await page.evaluate(() => {
    return document.getElementById('datasetName').textContent;
  });
  
  if (!datasetName || datasetName === 'Dataset Name') {
    throw new Error('Dataset name not populated, loading failed');
  }
  
  console.log(`Dataset loaded successfully: ${datasetName}`);
  
  // Check if data preview is loaded
  const isPreviewLoaded = await page.evaluate(() => {
    const preview = document.getElementById('dataPreview');
    return preview && preview.innerHTML.includes('<table');
  });
  
  if (!isPreviewLoaded) {
    throw new Error('Data preview not loaded');
  }
  
  console.log('Data preview loaded successfully');
  
  // Test localStorage state recovery
  console.log('Testing localStorage state recovery...');
  
  // Verify localStorage is set
  const storedDataId = await page.evaluate(() => {
    return localStorage.getItem('currentDataId');
  });
  
  if (storedDataId !== dataId) {
    throw new Error(`localStorage not set correctly. Expected ${dataId}, got ${storedDataId}`);
  }
  
  console.log('localStorage state correctly saved');
  
  // Reload the page without parameters to test recovery
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  
  // Check if dataset panel is still visible after reload
  const isPanelVisibleAfterReload = await page.evaluate(() => {
    const panel = document.getElementById('dataPanel');
    return panel && !panel.classList.contains('hidden');
  });
  
  if (!isPanelVisibleAfterReload) {
    throw new Error('Dataset panel not visible after reload, localStorage recovery failed');
  }
  
  // Check if dataset name is still populated
  const datasetNameAfterReload = await page.evaluate(() => {
    return document.getElementById('datasetName').textContent;
  });
  
  if (!datasetNameAfterReload || datasetNameAfterReload === 'Dataset Name') {
    throw new Error('Dataset name not populated after reload, localStorage recovery failed');
  }
  
  console.log('localStorage state recovery successful');
  console.log('All tests passed! The fix is working correctly.');
}

// Run the test
async function runTest() {
  try {
    await ensureServerRunning();
    const dataId = await loadSampleDataset();
    await testUrlLoading(dataId);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }
    
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runTest();