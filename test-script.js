const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// The CSV file path
const csvFilePath = '/Users/massimoraso/Downloads/analytical_data_australia_final.csv.csv';

(async () => {
  console.log('Starting automated testing...');
  
  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1280,800']
  });
  
  const page = await browser.newPage();
  
  // Function to wait using setTimeout
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Navigate to the application
  console.log('Opening application...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Take screenshot of the initial page
  console.log('Taking screenshot of initial page...');
  await page.screenshot({ path: './screenshots/01-initial-page.png' });
  
  // Get the HTML structure for analysis
  const htmlStructure = await page.evaluate(() => {
    return document.documentElement.outerHTML;
  });
  
  fs.writeFileSync('./screenshots/html-structure.txt', htmlStructure);
  console.log('HTML structure saved for analysis');
  
  // Manual navigation through the app with simpler interaction
  
  // Try to find and click any visible buttons
  console.log('Looking for interactive elements...');
  const buttons = await page.$$('button');
  console.log(`Found ${buttons.length} buttons`);
  
  // Track button texts to identify functionality
  const buttonTexts = [];
  
  // Click each button and take a screenshot
  for (let i = 0; i < buttons.length; i++) {
    try {
      const buttonText = await page.evaluate(button => button.textContent.trim(), buttons[i]);
      buttonTexts.push(buttonText);
      console.log(`Clicking button: ${buttonText}`);
      await buttons[i].click().catch(e => console.log(`Click failed: ${e.message}`));
      await wait(1000);
      await page.screenshot({ path: `./screenshots/button-click-${i}-${buttonText.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
    } catch (error) {
      console.log(`Error with button ${i}: ${error.message}`);
    }
  }
  
  // Try to find file input for CSV upload
  console.log('Looking for file input...');
  const fileInputs = await page.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    try {
      console.log('Attempting to upload CSV file...');
      await fileInputs[0].uploadFile(csvFilePath);
      await wait(2000);
      await page.screenshot({ path: './screenshots/file-uploaded.png' });
    } catch (error) {
      console.log(`Error uploading file: ${error.message}`);
    }
  } else {
    console.log('No file input found');
  }
  
  // Look for select elements (chart type selectors)
  console.log('Looking for select elements...');
  const selects = await page.$$('select');
  console.log(`Found ${selects.length} select elements`);
  
  for (let i = 0; i < selects.length; i++) {
    try {
      const selectOptions = await page.evaluate(select => {
        const options = [];
        for (const option of select.options) {
          options.push(option.value);
        }
        return options;
      }, selects[i]);
      
      console.log(`Select ${i} options:`, selectOptions);
      
      // Try to select each option
      for (const option of selectOptions) {
        try {
          await page.evaluate((select, value) => {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }, selects[i], option);
          
          await wait(1000);
          await page.screenshot({ path: `./screenshots/select-${i}-option-${option}.png` });
        } catch (error) {
          console.log(`Error selecting option ${option}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`Error with select ${i}: ${error.message}`);
    }
  }
  
  // Final full page screenshot
  console.log('Taking final full page screenshot...');
  await page.screenshot({ path: './screenshots/final-state.png', fullPage: true });
  
  // Create a simplified analysis based on button texts
  const analysis = {
    foundDarkMode: buttonTexts.some(text => text.toLowerCase().includes('dark')),
    foundUpload: buttonTexts.some(text => text.toLowerCase().includes('upload')),
    foundPreview: buttonTexts.some(text => text.toLowerCase().includes('preview')),
    foundVisualize: buttonTexts.some(text => 
      text.toLowerCase().includes('visual') || 
      text.toLowerCase().includes('chart')
    ),
    foundAnalyse: buttonTexts.some(text => 
      text.toLowerCase().includes('analy') || 
      text.toLowerCase().includes('statistic')
    ),
    foundLLMExport: buttonTexts.some(text => 
      text.toLowerCase().includes('llm') || 
      text.toLowerCase().includes('export')
    ),
    allButtons: buttonTexts
  };
  
  fs.writeFileSync('./screenshots/app-analysis.json', JSON.stringify(analysis, null, 2));
  console.log('Application analysis:', JSON.stringify(analysis, null, 2));
  
  // Summarize test results
  console.log('\nTest Results Summary:');
  console.log('=====================');
  
  console.log('Features found:');
  if (analysis.foundDarkMode) console.log('✅ Dark mode toggle');
  else console.log('❌ Dark mode toggle not found');
  
  if (analysis.foundUpload) console.log('✅ File upload');
  else console.log('❌ File upload not found');
  
  if (analysis.foundPreview) console.log('✅ Data preview');
  else console.log('❌ Data preview not found');
  
  if (analysis.foundVisualize) console.log('✅ Visualization');
  else console.log('❌ Visualization not found');
  
  if (analysis.foundAnalyse) console.log('✅ Analysis');
  else console.log('❌ Analysis not found');
  
  if (analysis.foundLLMExport) console.log('✅ LLM Export');
  else console.log('❌ LLM Export not found');
  
  console.log('\nAll screenshots saved in the screenshots directory');
  console.log('Check screenshots to verify actual functionality');
  
  await browser.close();
})().catch(error => {
  console.error('Test failed with error:', error);
});