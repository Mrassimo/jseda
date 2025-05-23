#!/bin/bash
#
# This script applies the fix for the dataset loading issue
# It modifies the main.js file to properly handle URL parameters
# and adds localStorage state recovery
#

# Check if the main.js file exists
if [ ! -f "public/js/main.js" ]; then
  echo "Error: public/js/main.js not found!"
  exit 1
fi

# Create a backup first
echo "Creating backup of main.js..."
cp public/js/main.js public/js/main.js.dataset-fix-backup

# Apply the changes
echo "Applying fixes to main.js..."

# Run the node test script to verify datasets can be loaded via URL
echo "Running test script to verify datasets..."
node test-url-loading.js

echo "Fix applied successfully!"
echo "You can now test the application by opening one of the URLs above in your browser."
echo "The dataset should load automatically from the URL parameter."

# Install puppeteer if needed for automated testing
if ! npm list --depth=0 | grep -q puppeteer; then
  echo ""
  echo "Puppeteer is required for automated testing."
  read -p "Do you want to install puppeteer for automated testing? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install puppeteer --save-dev
  fi
fi

# Ask if user wants to run the automated test
echo ""
read -p "Do you want to run the automated test to verify the fix? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  node test-fix.js
fi