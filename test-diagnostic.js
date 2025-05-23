const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'diagnostic-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function testDiagnosticPage() {
  console.log('Starting diagnostic page tests...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set up console log capturing
  page.on('console', message => {
    console.log(`Browser console ${message.type()}: ${message.text()}`);
  });
  
  try {
    // Navigate to diagnostic page
    console.log('Navigating to diagnostic page...');
    await page.goto('http://localhost:3030/test-page.html', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-page.png') });
    
    // Define selectors for buttons with correct IDs
    const buttons = [
      {
        selector: "#testDatasetsBtn",
        name: 'api-datasets'
      },
      {
        selector: "#testDataByIdBtn",
        name: 'api-data-id'
      },
      {
        selector: "#testSampleDataBtn",
        name: 'sample-data'
      },
      {
        selector: "#testDOMElementsBtn",
        name: 'dom-elements'
      },
      {
        selector: "#testEventListenersBtn",
        name: 'event-listeners'
      }
    ];
    
    for (const [index, button] of buttons.entries()) {
      console.log(`Testing button: ${button.name}`);
      
      try {
        // Check if the button exists
        const exists = await page.$(button.selector);
        if (exists) {
          // Click the button
          console.log(`Clicking ${button.name}...`);
          await page.click(button.selector);
          
          // Wait a bit for any updates
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Capture screenshot
          await page.screenshot({ path: path.join(screenshotsDir, `0${index + 2}-${button.name}.png`) });
        } else {
          console.log(`Button ${button.name} not found with selector ${button.selector}`);
        }
      } catch (err) {
        console.error(`Error with button ${button.name}:`, err.message);
      }
      
      console.log('----------------------------');
    }
    
    // Capture result elements
    console.log("Checking for result elements...");
    
    const resultElements = [
      {
        selector: "#apiResponseDisplay",
        name: 'api-response'
      },
      {
        selector: "#domTestResults",
        name: 'dom-results'
      },
      {
        selector: "#consoleLog",
        name: 'console-log'
      }
    ];
    
    for (const [index, element] of resultElements.entries()) {
      try {
        const content = await page.$eval(element.selector, el => el.innerHTML);
        console.log(`${element.name} content:`, content.substring(0, 100) + (content.length > 100 ? '...' : ''));
      } catch (err) {
        console.log(`Couldn't get content for ${element.name}: ${err.message}`);
      }
    }
    
    // Final page state
    await page.screenshot({ path: path.join(screenshotsDir, '07-final-state.png') });
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'error-state.png') });
  } finally {
    await browser.close();
    console.log('Tests completed. Screenshots saved to:', screenshotsDir);
  }
}

testDiagnosticPage();