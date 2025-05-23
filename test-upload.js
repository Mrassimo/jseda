const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

const takeScreenshot = async (page, name) => {
  const screenshotPath = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
};

(async () => {
  console.log('Starting CSV upload test...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  // Create a new page
  const page = await browser.newPage();
  
  // Collect console logs
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  // Collect errors
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
  });
  
  // Enable request and response logging
  page.on('request', request => {
    console.log(`REQUEST: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    console.log(`RESPONSE: ${response.status()} ${response.url()}`);
  });
  
  // Navigate to application
  console.log('Navigating to application...');
  try {
    await page.goto('http://localhost:3030/index.html', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Navigation successful');
  } catch (error) {
    console.error('Navigation failed:', error.message);
    console.log('Is the server running? Try running: npm run server');
    await browser.close();
    process.exit(1);
  }
  
  // Take initial screenshot
  await takeScreenshot(page, '01-initial-state');
  
  // Check if datasets list is populated
  console.log('Checking datasets list...');
  const datasetsExist = await page.evaluate(() => {
    const datasetElements = document.querySelectorAll('#datasetList li');
    return {
      count: datasetElements.length,
      items: Array.from(datasetElements).map(el => el.textContent)
    };
  });
  
  console.log(`Found ${datasetsExist.count} datasets:`, datasetsExist.items);
  
  // Prepare for file upload
  console.log('Setting up file upload...');
  
  // Path to sample CSV
  const csvFilePath = path.join(__dirname, 'sample-data', 'employees.csv');
  
  // Upload file
  console.log('Uploading CSV file:', csvFilePath);
  
  try {
    // Get the file input element
    const inputUploadHandle = await page.$('#fileInput');
    
    if (!inputUploadHandle) {
      console.error('Could not find file input element with selector #fileInput');
      console.log('Available input elements:');
      const inputs = await page.$$eval('input', inputs => inputs.map(i => ({
        id: i.id,
        type: i.type,
        name: i.name,
        class: i.className
      })));
      console.log(inputs);
      
      await takeScreenshot(page, '02-input-not-found');
    } else {
      // Set up file
      await inputUploadHandle.uploadFile(csvFilePath);
      console.log('File selected for upload');
      await takeScreenshot(page, '03-file-selected');
      
      // Check if there's a separate upload button or if file selection triggers upload
      const uploadButton = await page.$('#uploadBtn');
      if (uploadButton) {
        console.log('Clicking upload button...');
        await uploadButton.click();
        console.log('Upload button clicked');
      } else {
        console.log('No separate upload button found, assuming file selection triggers upload');
      }
      
      // Wait a moment to see any change in UI
      console.log('Waiting for UI to update...');
      await page.waitForTimeout(3000);
      await takeScreenshot(page, '04-after-upload');
      
      // Check if there's any visual confirmation of upload
      const uploadConfirmation = await page.evaluate(() => {
        // Look for various indicators of successful upload
        const dataPreviewVisible = !!document.querySelector('#dataPreview')?.offsetParent;
        const statusElement = document.querySelector('#uploadStatus, .status-message, .alert');
        const statusText = statusElement ? statusElement.textContent : null;
        
        return {
          dataPreviewVisible,
          statusText,
          documentState: {
            title: document.title,
            url: window.location.href
          }
        };
      });
      
      console.log('Upload confirmation check:', uploadConfirmation);
      
      // Check DOM for any changes related to the uploaded file
      const postUploadState = await page.evaluate(() => {
        return {
          bodyClasses: document.body.className,
          dataElements: document.querySelectorAll('[data-file], [data-filename]').length,
          activeButtons: Array.from(document.querySelectorAll('button:not([disabled])')).map(b => b.textContent || b.id)
        };
      });
      
      console.log('Post-upload DOM state:', postUploadState);
    }
  } catch (error) {
    console.error('Error during file upload:', error);
    await takeScreenshot(page, '05-upload-error');
  }
  
  // Try clicking UI elements that might be available after upload
  console.log('Testing post-upload interactions...');
  const buttonsToTry = ['#analyzeBtn', '#visualizeBtn', '#dataPreviewBtn', '.analyse-btn', '.visualize-btn'];
  
  for (const selector of buttonsToTry) {
    try {
      const button = await page.$(selector);
      if (button) {
        console.log(`Found button ${selector}, clicking...`);
        await button.click();
        console.log(`Clicked ${selector}`);
        await page.waitForTimeout(1000);
        await takeScreenshot(page, `06-after-clicking-${selector.replace(/[#.]/g, '')}`);
      }
    } catch (error) {
      console.log(`Button ${selector} not found or not clickable`);
    }
  }
  
  // Final screenshot
  await takeScreenshot(page, '07-final-state');
  
  // Check local storage and session storage
  const localStorage = await page.evaluate(() => Object.keys(window.localStorage));
  const sessionStorage = await page.evaluate(() => Object.keys(window.sessionStorage));
  
  console.log('LocalStorage keys:', localStorage);
  console.log('SessionStorage keys:', sessionStorage);
  
  // Wait a bit before closing
  await page.waitForTimeout(2000);
  
  // Close browser
  console.log('Test completed, closing browser...');
  await browser.close();
})();