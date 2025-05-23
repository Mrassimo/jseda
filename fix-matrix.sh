#!/bin/bash

# This script applies the correlation matrix fix by directly patching main.js

echo "Applying correlation matrix fix..."

# Make a backup of main.js
cp public/js/main.js public/js/main.js.backup

# Find the start of the first renderCorrelationMatrix function
START_LINE=$(grep -n "function renderCorrelationMatrix" public/js/main.js | head -1 | cut -d':' -f1)
if [ -z "$START_LINE" ]; then
    echo "Error: Could not find renderCorrelationMatrix function"
    exit 1
fi

# Find the end of the second getCorrelationColor function
END_LINE=$(grep -n "function getCorrelationColor" public/js/main.js | tail -1 | cut -d':' -f1)
if [ -z "$END_LINE" ]; then
    echo "Error: Could not find getCorrelationColor function"
    exit 1
fi

# Find where the second getCorrelationColor function ends (next function or end of file)
END_LINE2=$(tail -n +$END_LINE public/js/main.js | grep -n "function" | head -1 | cut -d':' -f1)
if [ -z "$END_LINE2" ]; then
    END_LINE2=$(wc -l < public/js/main.js)
else
    END_LINE2=$(($END_LINE + $END_LINE2 - 1))
fi

echo "Function block to replace: $START_LINE to $END_LINE2"

# Verify file exists
if [ ! -f "correlation-matrix-fix.patch" ]; then
    echo "Error: correlation-matrix-fix.patch not found"
    exit 1
fi

# Create a temporary file for the edited content
TEMP_FILE=$(mktemp)

# Copy the file up to the first renderCorrelationMatrix function
head -n $(($START_LINE - 1)) public/js/main.js > $TEMP_FILE

# Append the correlation matrix fix patch
cat correlation-matrix-fix.patch >> $TEMP_FILE

# Append the remainder of the file after the second getCorrelationColor block
tail -n +$(($END_LINE2 + 1)) public/js/main.js >> $TEMP_FILE

# Replace the original file
mv $TEMP_FILE public/js/main.js

echo "Correlation matrix fix applied successfully!"