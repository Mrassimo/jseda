#!/bin/bash

# Script to apply the upload fix
echo "Applying CSV upload fix..."

# Backup the original file
echo "Creating backup of the original main.js file..."
cp public/js/main.js public/js/main.js.backup

# Apply the fix
echo "Applying fix to public/js/main.js..."
patch -p1 < main-js-fix.patch || {
  echo "Failed to apply patch. Manual edit may be required."
  
  # Try direct file copy if available
  if [ -f "main-js-fixed.js" ]; then
    echo "Trying direct file replacement..."
    cp main-js-fixed.js public/js/main.js
  fi
}

# Restart the server if running
echo "Fix applied. Please restart the server for changes to take effect."
echo "Done."