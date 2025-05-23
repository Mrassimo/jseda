#!/bin/bash

# Fix for the correlation matrix in public/js/main.js
echo "Applying correlation matrix fix..."

# Find the displayCorrelations function content
START_LINE=$(grep -n "function displayCorrelations" public/js/main.js | cut -d':' -f1)

if [ -z "$START_LINE" ]; then
    echo "Error: Could not find displayCorrelations function in public/js/main.js"
    exit 1
fi

# Create a temporary file for edits
TEMP_FILE=$(mktemp)

# Step 1: Extract the column names from matrix.columns in createCorrelationMatrix function
grep -A50 "function createCorrelationMatrix" public/js/main.js > /dev/null
if [ $? -eq 0 ]; then
    echo "Updating createCorrelationMatrix function..."
    
    # Get the updated correlation matrix code from the patch file
    cat correlation-matrix-fix.patch > $TEMP_FILE
    
    # Look for call to the createCorrelationMatrix function
    CALL_LINE=$(grep -n "createCorrelationMatrix" public/js/main.js | head -1 | cut -d':' -f1)
    if [ -n "$CALL_LINE" ]; then
        # Check the argument pattern
        CALL_PATTERN=$(grep -A1 "createCorrelationMatrix" public/js/main.js | head -2 | tail -1)
        
        # Add to main.js - we'll use either sed or a simple find/replace approach
        createCorrelationMatrixLine="  createCorrelationMatrix(analysis.correlations);"
        
        MATRIX_CONTENT="
/**
 * Create correlation matrix visualization
 * @param {Object} correlationData Correlation matrix data
 */
function createCorrelationMatrix(correlationData) {
  if (!correlationData || !correlationData.matrix || !correlationData.columns) {
    console.error('Invalid correlation data format', correlationData);
    return;
  }
  
  const { matrix, columns } = correlationData;
  
  // Create data array for visualization
  const data = [];
  
  for (let i = 0; i < columns.length; i++) {
    for (let j = 0; j < columns.length; j++) {
      data.push({
        x: columns[i],
        y: columns[j],
        correlation: matrix[i][j]
      });
    }
  }
  
  // Render the matrix
  renderCorrelationMatrix(data, columns);
}

$(cat correlation-matrix-fix.patch)
"
        # Add the matrix content
        sed -i.backup -e '/function displayCorrelations/,/createCorrelationMatrix/ {
          s/createCorrelationMatrix.*/createCorrelationMatrix(analysis.correlations);/
        }' public/js/main.js
        
        # Look for an existing createCorrelationMatrix function
        EXISTING_FUNC=$(grep -n "function createCorrelationMatrix" public/js/main.js | cut -d':' -f1)
        if [ -n "$EXISTING_FUNC" ]; then
            # Replace the existing function
            START_REPLACE=$EXISTING_FUNC
            END_REPLACE=$(grep -n "function getCorrelationColor" public/js/main.js | cut -d':' -f1)
            if [ -z "$END_REPLACE" ]; then
                END_REPLACE=$(($START_REPLACE + 50))  # Just replace a bunch of lines if we can't find the end
            else
                END_REPLACE=$(($END_REPLACE - 1))
            fi
            
            # Replace the function
            sed -i.backup2 "${START_REPLACE},${END_REPLACE}c\\
${MATRIX_CONTENT}" public/js/main.js
        else
            # Append the function at the end of the file
            echo -e "\n${MATRIX_CONTENT}" >> public/js/main.js
        fi
    fi
fi

# Apply fix for empty sample data in routes.js
echo "Applying empty sample data fix..."

# First, check if the routes.js file exists
if [ ! -f "src/backend/api/routes.js" ]; then
    echo "Error: Could not find routes.js file"
    exit 1
fi

# Make a backup of routes.js first
cp src/backend/api/routes.js src/backend/api/routes.js.backup

# Look for the sample data handling section
SAMPLE_DATA_SECTION=$(grep -n "Get data sample" src/backend/api/routes.js | cut -d':' -f1)

if [ -z "$SAMPLE_DATA_SECTION" ]; then
    echo "Error: Could not find sample data section in routes.js"
    exit 1
fi

# Update the sample data handling with our improved version
cat << 'EOF' > sample-data-fix.patch
  console.log(\`Loading sample data for dataset \${dataId}, limit: \${limit}\`);
  
  // First, check if we have cached data
  const cachedSample = cacheManager.get('sampleData', dataId);
  if (cachedSample && Array.isArray(cachedSample) && cachedSample.length > 0) {
    console.log(\`Using cached sample data for \${dataId}, \${cachedSample.length} items\`);
    return res.json({
      dataId,
      sample: cachedSample.slice(0, limit),
      fromCache: true
    });
  }
  
  // If no valid cache, get the sample data from the data store
  const dataStoreSample = dataStore[dataId].sampleData || [];
  console.log(\`Data store sample length: \${dataStoreSample.length}\`);
  
  // Check if we have valid sample data
  if (dataStoreSample.length === 0) {
    console.warn(\`No sample data available for dataset \${dataId}. This will cause UI issues.\`);
    
    // Check if we can retrieve the file and process it again
    if (dataStore[dataId].filePath && fs.existsSync(dataStore[dataId].filePath)) {
      console.log(\`Attempting to re-process file for dataset \${dataId} to generate sample data\`);
      
      // Import the memory-efficient processor
      const { MemoryEfficientCSVProcessor } = require('../data/csv-parser');
      
      try {
        // Create a new processor instance
        const processor = new MemoryEfficientCSVProcessor({
          sampleSize: 1000,
          batchSize: 5000
        });
        
        // Process the file synchronously for immediate response
        const result = processor.processFile(dataStore[dataId].filePath);
        
        // Use the promise result when available
        result.then(processedData => {
          // Store the regenerated sample data in the data store
          dataStore[dataId].sampleData = processedData.sampleData;
          
          // Store in cache for future requests
          if (processedData.sampleData.length > 0) {
            cacheManager.set('sampleData', dataId, processedData.sampleData, 30 * 60 * 1000); // 30 minute TTL
            console.log(\`Regenerated and stored \${processedData.sampleData.length} sample items for dataset \${dataId}\`);
          }
        }).catch(err => {
          console.error(\`Error re-processing file for dataset \${dataId}:\`, err);
        });
        
        // For the current request, we'll still need to return an empty sample
        // since the regeneration is async, but future requests will have data
        return res.json({
          dataId,
          sample: [],
          fromCache: false,
          message: "Sample data is being regenerated. Please refresh in a few seconds."
        });
      } catch (error) {
        console.error(\`Failed to re-process file for dataset \${dataId}:\`, error);
      }
    }
  } else {
    // Store valid sample data in cache for future requests
    console.log(\`Storing \${dataStoreSample.length} items in cache for dataset \${dataId}\`);
    cacheManager.set('sampleData', dataId, dataStoreSample, 30 * 60 * 1000); // 30 minute TTL
  }
  
  res.json({
    dataId,
    sample: dataStoreSample.slice(0, limit),
    fromCache: false
  });
EOF

# Apply the patch - we need to find the right section to replace
START_SEARCH='console.log(`Loading sample data for dataset ${dataId}, limit: ${limit}`);'
START_LINE=$(grep -n "$START_SEARCH" src/backend/api/routes.js | cut -d':' -f1)

if [ -z "$START_LINE" ]; then
    echo "Could not find the start of sample data section. Trying alternative search..."
    START_SEARCH='Get data sample'
    START_LINE=$(grep -n "$START_SEARCH" src/backend/api/routes.js | cut -d':' -f1)
    
    # Find the actual handler function
    END_SAMPLE_SEARCH='fromCache: false'
    END_LINE=$(grep -n "$END_SAMPLE_SEARCH" src/backend/api/routes.js | cut -d':' -f1)
    
    if [ -n "$START_LINE" ] && [ -n "$END_LINE" ]; then
        # We found both the start and end, now find the actual section to replace
        START_LINE=$(grep -n "Loading sample data for dataset" src/backend/api/routes.js | cut -d':' -f1)
        if [ -z "$START_LINE" ]; then
            echo "Error: Could not locate the sample data handling code in routes.js"
            exit 1
        fi
    else
        echo "Error: Could not locate the sample data handler section in routes.js"
        exit 1
    fi
fi

# Find the end of the section
END_SEARCH='fromCache: false'
END_LINE=$(grep -n "$END_SEARCH" src/backend/api/routes.js | tail -1 | cut -d':' -f1)

if [ -z "$END_LINE" ]; then
    echo "Error: Could not find the end of sample data section"
    exit 1
fi

# Get the next line after END_LINE to include the closing bracket and semicolon
END_LINE=$(($END_LINE + 2))

# Replace the section
sed -i.sample_fix "s/\(.*Loading sample data for dataset.*\)/$(sed 's:/:\\/:g' sample-data-fix.patch)/" src/backend/api/routes.js

# Now, copy our data integrity utils
echo "Adding data integrity utilities..."

# Create data integrity file if it doesn't exist
if [ ! -f "src/backend/data/data-integrity.js" ]; then
    # Get the directory ready
    mkdir -p src/backend/data

    # Create the data integrity utility file
    cat << 'EOF' > src/backend/data/data-integrity.js
/**
 * Data integrity utility for checking and repairing sample data
 */

const fs = require('fs');
const path = require('path');
const { MemoryEfficientCSVProcessor } = require('./csv-parser');

/**
 * Diagnostic utility to check data store and cache integrity
 * @param {Object} dataStore The application data store
 * @param {Object} cacheManager The cache manager
 * @returns {Object} Diagnostic report
 */
async function checkDataIntegrity(dataStore, cacheManager) {
  // Initialize the diagnostic report
  const report = {
    timestamp: new Date().toISOString(),
    datasets: {
      total: 0,
      ready: 0,
      processing: 0,
      error: 0
    },
    sampleData: {
      missing: 0,
      empty: 0,
      present: 0,
      cached: 0
    },
    files: {
      missing: 0,
      present: 0,
      size: 0
    },
    cacheIntegrity: {
      mismatches: 0,
      orphaned: 0
    },
    issues: [],
    datasets: []
  };

  // Check each dataset
  for (const dataId of Object.keys(dataStore)) {
    const dataset = dataStore[dataId];
    report.datasets.total++;
    
    // Count datasets by status
    if (dataset.status === 'ready') {
      report.datasets.ready++;
    } else if (dataset.status === 'processing') {
      report.datasets.processing++;
    } else if (dataset.status === 'error') {
      report.datasets.error++;
    }
    
    // Check file existence
    const fileExists = dataset.filePath && fs.existsSync(dataset.filePath);
    if (!fileExists) {
      report.files.missing++;
      report.issues.push({
        dataId,
        severity: 'high',
        type: 'missing_file',
        description: `File not found: ${dataset.filePath || 'No file path'}`
      });
    } else {
      report.files.present++;
      
      // Count file size
      try {
        const stats = fs.statSync(dataset.filePath);
        report.files.size += stats.size;
      } catch (err) {
        report.issues.push({
          dataId,
          severity: 'medium',
          type: 'file_stat_error',
          description: `Failed to get file stats: ${err.message}`
        });
      }
    }
    
    // Check sample data
    if (!dataset.sampleData) {
      report.sampleData.missing++;
      
      // Add issue if dataset is ready but has no sample data
      if (dataset.status === 'ready') {
        report.issues.push({
          dataId,
          severity: 'high',
          type: 'missing_sample',
          description: 'Dataset is marked as ready but has no sample data',
          fileExists
        });
      }
    } else if (dataset.sampleData.length === 0) {
      report.sampleData.empty++;
      
      // Add issue if dataset is ready but has empty sample data
      if (dataset.status === 'ready') {
        report.issues.push({
          dataId,
          severity: 'high',
          type: 'empty_sample',
          description: 'Dataset is marked as ready but has empty sample data',
          fileExists
        });
      }
    } else {
      report.sampleData.present++;
    }
    
    // Check cache integrity
    const cachedSample = cacheManager.get('sampleData', dataId);
    if (cachedSample) {
      report.sampleData.cached++;
      
      // Check for mismatches between cache and data store
      if (dataset.sampleData && cachedSample.length !== dataset.sampleData.length) {
        report.cacheIntegrity.mismatches++;
        report.issues.push({
          dataId,
          severity: 'medium',
          type: 'cache_mismatch',
          description: `Cache sample size (${cachedSample.length}) doesn't match data store sample size (${dataset.sampleData.length})`,
          cacheSampleSize: cachedSample.length,
          dataStoreSampleSize: dataset.sampleData.length
        });
      }
    } else if (dataset.status === 'ready' && dataset.sampleData && dataset.sampleData.length > 0) {
      // Dataset is ready with sample data but not cached
      report.issues.push({
        dataId,
        severity: 'medium',
        type: 'missing_cache',
        description: 'Dataset has sample data but it is not cached',
        sampleSize: dataset.sampleData.length
      });
    }
    
    // Add dataset summary
    report.datasets.push({
      dataId,
      status: dataset.status,
      fileName: dataset.originalName,
      uploadDate: dataset.uploadDate,
      fileExists,
      hasSampleData: Boolean(dataset.sampleData && dataset.sampleData.length > 0),
      sampleSize: dataset.sampleData ? dataset.sampleData.length : 0,
      isCached: Boolean(cachedSample),
      hasAnalysis: Boolean(dataset.analysis),
      visualizationCount: dataset.visualizations ? dataset.visualizations.length : 0,
      hasErrors: Boolean(dataset.error || dataset.analysisError || (dataset.vizErrors && dataset.vizErrors.length > 0))
    });
  }
  
  // Check for orphaned cache entries (in cache but not in data store)
  let orphanedEntries = 0;
  const cacheKeys = [];
  dataCache.sampleData.forEach((value, key) => {
    if (!dataStore[key]) {
      orphanedEntries++;
      cacheKeys.push(key);
      report.issues.push({
        cacheKey: key,
        severity: 'low',
        type: 'orphaned_cache',
        description: 'Cache entry exists for dataset not in data store'
      });
    }
  });
  report.cacheIntegrity.orphaned = orphanedEntries;
  
  return report;
}

/**
 * Fix sample data issues by rebuilding samples as needed
 * @param {Object} dataStore The application data store
 * @param {Object} cacheManager The cache manager
 * @param {Object} options Options for repair
 * @returns {Object} Repair report
 */
async function repairSampleData(dataStore, cacheManager, options = {}) {
  const {
    fixMissingSamples = true,
    fixEmptySamples = true,
    fixCacheMismatches = true,
    clearOrphanedCache = true,
    sampleSize = 1000,
    cacheTimeToLive = 30 * 60 * 1000 // 30 minutes
  } = options;
  
  // Run diagnostic first
  const diagnostic = await checkDataIntegrity(dataStore, cacheManager);
  
  // Initialize repair report
  const report = {
    timestamp: new Date().toISOString(),
    diagnosticBefore: diagnostic,
    actions: [],
    results: {
      samplesRebuilt: 0,
      cacheEntryReplaced: 0,
      orphanedCacheCleared: 0,
      errors: 0
    }
  };
  
  // Process each issue
  for (const issue of diagnostic.issues) {
    try {
      switch (issue.type) {
        case 'missing_sample':
        case 'empty_sample':
          if ((issue.type === 'missing_sample' && fixMissingSamples) ||
              (issue.type === 'empty_sample' && fixEmptySamples)) {
            
            // Only attempt rebuild if file exists
            if (issue.fileExists !== false) {
              const dataId = issue.dataId;
              const dataset = dataStore[dataId];
              
              if (dataset && dataset.filePath && fs.existsSync(dataset.filePath)) {
                // Rebuild sample data
                report.actions.push({
                  dataId,
                  action: 'rebuild_sample',
                  description: `Rebuilding sample for dataset ${dataId}`,
                  issueType: issue.type
                });
                
                try {
                  // Create processor
                  const processor = new MemoryEfficientCSVProcessor({
                    sampleSize,
                    batchSize: 5000
                  });
                  
                  // Process file
                  const result = await processor.processFile(dataset.filePath);
                  
                  // Set sample data
                  dataset.sampleData = result.sampleData;
                  
                  // Update cache
                  if (result.sampleData.length > 0) {
                    cacheManager.set('sampleData', dataId, result.sampleData, cacheTimeToLive);
                    report.results.samplesRebuilt++;
                    report.results.cacheEntryReplaced++;
                    
                    report.actions.push({
                      dataId,
                      action: 'rebuild_success',
                      description: `Rebuilt sample with ${result.sampleData.length} rows for dataset ${dataId}`,
                      sampleSize: result.sampleData.length
                    });
                  } else {
                    report.actions.push({
                      dataId,
                      action: 'rebuild_warning',
                      description: `Rebuilt sample was empty for dataset ${dataId}`,
                      error: 'Generated sample has zero rows'
                    });
                  }
                } catch (err) {
                  report.results.errors++;
                  report.actions.push({
                    dataId,
                    action: 'rebuild_error',
                    description: `Failed to rebuild sample for dataset ${dataId}`,
                    error: err.message
                  });
                }
              }
            }
          }
          break;
          
        case 'cache_mismatch':
          if (fixCacheMismatches) {
            const dataId = issue.dataId;
            const dataset = dataStore[dataId];
            
            if (dataset && dataset.sampleData && dataset.sampleData.length > 0) {
              // Update cache to match data store
              cacheManager.set('sampleData', dataId, dataset.sampleData, cacheTimeToLive);
              report.results.cacheEntryReplaced++;
              
              report.actions.push({
                dataId,
                action: 'fix_cache_mismatch',
                description: `Updated cache to match data store sample (${dataset.sampleData.length} rows)`
              });
            }
          }
          break;
          
        case 'missing_cache':
          // Simple fix: add to cache
          const dataId = issue.dataId;
          const dataset = dataStore[dataId];
          
          if (dataset && dataset.sampleData && dataset.sampleData.length > 0) {
            cacheManager.set('sampleData', dataId, dataset.sampleData, cacheTimeToLive);
            report.results.cacheEntryReplaced++;
            
            report.actions.push({
              dataId,
              action: 'add_to_cache',
              description: `Added missing cache entry for dataset ${dataId}`
            });
          }
          break;
          
        case 'orphaned_cache':
          if (clearOrphanedCache) {
            const cacheKey = issue.cacheKey;
            cacheManager.invalidate('sampleData', cacheKey);
            report.results.orphanedCacheCleared++;
            
            report.actions.push({
              cacheKey,
              action: 'clear_orphaned_cache',
              description: `Removed orphaned cache entry for key ${cacheKey}`
            });
          }
          break;
      }
    } catch (err) {
      report.results.errors++;
      report.actions.push({
        dataId: issue.dataId,
        action: 'repair_error',
        description: `Unexpected error during repair: ${err.message}`,
        error: err.message,
        stack: err.stack
      });
    }
  }
  
  // Run diagnostic again to see if fixes worked
  const diagnosticAfter = await checkDataIntegrity(dataStore, cacheManager);
  report.diagnosticAfter = diagnosticAfter;
  
  return report;
}

/**
 * Simple validation function to check for common issues in a dataset
 * @param {Object} dataset Dataset to validate
 * @returns {Object} Validation result
 */
function validateDataset(dataset) {
  const validation = {
    isValid: true,
    issues: []
  };
  
  // Check required properties
  if (!dataset.id) {
    validation.isValid = false;
    validation.issues.push({
      severity: 'high',
      type: 'missing_property',
      description: 'Dataset is missing ID property'
    });
  }
  
  if (!dataset.filePath) {
    validation.isValid = false;
    validation.issues.push({
      severity: 'high',
      type: 'missing_property',
      description: 'Dataset is missing filePath property'
    });
  } else if (!fs.existsSync(dataset.filePath)) {
    validation.isValid = false;
    validation.issues.push({
      severity: 'high',
      type: 'missing_file',
      description: `File not found: ${dataset.filePath}`
    });
  }
  
  if (!dataset.status) {
    validation.isValid = false;
    validation.issues.push({
      severity: 'medium',
      type: 'missing_property',
      description: 'Dataset is missing status property'
    });
  } else if (!['ready', 'processing', 'error'].includes(dataset.status)) {
    validation.isValid = false;
    validation.issues.push({
      severity: 'medium',
      type: 'invalid_status',
      description: `Invalid status value: ${dataset.status}`
    });
  }
  
  // For ready datasets, check for required properties
  if (dataset.status === 'ready') {
    if (!dataset.sampleData) {
      validation.isValid = false;
      validation.issues.push({
        severity: 'high',
        type: 'missing_sample',
        description: 'Ready dataset has no sample data'
      });
    } else if (dataset.sampleData.length === 0) {
      validation.isValid = false;
      validation.issues.push({
        severity: 'high',
        type: 'empty_sample',
        description: 'Ready dataset has empty sample data'
      });
    }
    
    if (!dataset.summary) {
      validation.isValid = false;
      validation.issues.push({
        severity: 'medium',
        type: 'missing_summary',
        description: 'Ready dataset has no summary data'
      });
    } else {
      // Check summary properties
      if (!dataset.summary.columns || !Array.isArray(dataset.summary.columns)) {
        validation.isValid = false;
        validation.issues.push({
          severity: 'medium',
          type: 'invalid_summary',
          description: 'Summary is missing column data'
        });
      }
      
      if (typeof dataset.summary.rowCount !== 'number') {
        validation.isValid = false;
        validation.issues.push({
          severity: 'medium',
          type: 'invalid_summary',
          description: 'Summary is missing row count'
        });
      }
    }
  }
  
  return validation;
}

module.exports = {
  checkDataIntegrity,
  repairSampleData,
  validateDataset
};
EOF
fi

# Add diagnostics route to routes.js
if ! grep -q "Get diagnostic information for a dataset" src/backend/api/routes.js; then
    echo "Adding diagnostic endpoints to routes.js..."
    
    # Prepare diagnostic endpoints
    cat << 'EOF' > diagnostic-endpoints.patch
/**
 * Get diagnostic information for a dataset
 * GET /api/diagnostics/:dataId
 */
router.get('/diagnostics/:dataId', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  // Gather diagnostic information
  const diagnostics = {
    dataId,
    status: dataStore[dataId].status,
    fileName: dataStore[dataId].originalName,
    fileExists: dataStore[dataId].filePath ? fs.existsSync(dataStore[dataId].filePath) : false,
    uploadDate: dataStore[dataId].uploadDate,
    lastModified: dataStore[dataId].filePath ? 
      fs.existsSync(dataStore[dataId].filePath) ? 
        fs.statSync(dataStore[dataId].filePath).mtime.toISOString() : null 
      : null,
    fileSize: dataStore[dataId].filePath ? 
      fs.existsSync(dataStore[dataId].filePath) ? 
        fs.statSync(dataStore[dataId].filePath).size : null 
      : null,
    dataStoreSample: {
      exists: Boolean(dataStore[dataId].sampleData),
      length: dataStore[dataId].sampleData ? dataStore[dataId].sampleData.length : 0
    },
    cacheSample: {
      exists: Boolean(cacheManager.get('sampleData', dataId)),
      length: cacheManager.get('sampleData', dataId) ? 
        cacheManager.get('sampleData', dataId).length : 0
    },
    summary: dataStore[dataId].summary || null,
    progress: dataStore[dataId].progress || null,
    hasAnalysis: Boolean(dataStore[dataId].analysis),
    analysisProgress: dataStore[dataId].analysisProgress || null,
    vizCount: dataStore[dataId].visualizations ? dataStore[dataId].visualizations.length : 0,
    errors: {
      processingError: dataStore[dataId].error || null,
      analysisError: dataStore[dataId].analysisError || null,
      vizErrors: dataStore[dataId].vizErrors ? dataStore[dataId].vizErrors.length : 0
    }
  };

  res.json(diagnostics);
});

/**
 * Rebuild sample data for a dataset
 * POST /api/diagnostics/:dataId/rebuild-sample
 */
router.post('/diagnostics/:dataId/rebuild-sample', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  if (!dataStore[dataId].filePath || !fs.existsSync(dataStore[dataId].filePath)) {
    return res.status(400).json({ 
      error: 'Original file not available for rebuilding sample',
      dataId,
      filePath: dataStore[dataId].filePath || null,
      fileExists: dataStore[dataId].filePath ? fs.existsSync(dataStore[dataId].filePath) : false
    });
  }

  try {
    // Import the memory-efficient processor
    const { MemoryEfficientCSVProcessor } = require('../data/csv-parser');
    
    // Create a new processor instance with progress reporting
    const processor = new MemoryEfficientCSVProcessor({
      sampleSize: 1000,
      batchSize: 5000,
      progressCallback: (progressData) => {
        // Store progress in dataStore
        if (!dataStore[dataId].rebuildProgress) {
          dataStore[dataId].rebuildProgress = {};
        }
        dataStore[dataId].rebuildProgress = {
          ...progressData,
          updatedAt: Date.now()
        };
      }
    });
    
    // Start processing asynchronously
    console.log(`Rebuilding sample data for dataset ${dataId}`);
    
    // Store the rebuild operation status
    dataStore[dataId].rebuildInProgress = true;
    dataStore[dataId].rebuildStartTime = Date.now();
    
    // Return immediate response that rebuild has started
    res.json({
      success: true,
      message: "Sample data rebuild started. Check rebuild status with diagnostics endpoint.",
      dataId
    });
    
    // Process the file
    processor.processFile(dataStore[dataId].filePath)
      .then(processedData => {
        // Store the regenerated sample data in the data store
        dataStore[dataId].sampleData = processedData.sampleData;
        
        // Store in cache for future requests
        if (processedData.sampleData.length > 0) {
          cacheManager.set('sampleData', dataId, processedData.sampleData, 30 * 60 * 1000); // 30 minute TTL
          console.log(`Regenerated and stored ${processedData.sampleData.length} sample items for dataset ${dataId}`);
        }
        
        // Update rebuild status
        dataStore[dataId].rebuildInProgress = false;
        dataStore[dataId].rebuildCompleted = true;
        dataStore[dataId].rebuildEndTime = Date.now();
        dataStore[dataId].rebuildDuration = Date.now() - dataStore[dataId].rebuildStartTime;
        dataStore[dataId].rebuildSuccess = true;
        dataStore[dataId].rebuildResult = {
          sampleSize: processedData.sampleData.length,
          processingTime: processedData.summary.processingTime
        };
      })
      .catch(err => {
        console.error(`Error rebuilding sample data for dataset ${dataId}:`, err);
        
        // Update rebuild status with error
        dataStore[dataId].rebuildInProgress = false;
        dataStore[dataId].rebuildCompleted = true;
        dataStore[dataId].rebuildEndTime = Date.now();
        dataStore[dataId].rebuildDuration = Date.now() - dataStore[dataId].rebuildStartTime;
        dataStore[dataId].rebuildSuccess = false;
        dataStore[dataId].rebuildError = {
          message: err.message,
          stack: err.stack
        };
      });
  } catch (error) {
    console.error(`Failed to start rebuild for dataset ${dataId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      dataId
    });
  }
});
EOF

    # Find the position to insert - before cache stats
    CACHE_STATS_LINE=$(grep -n "Get cache statistics" src/backend/api/routes.js | cut -d':' -f1)
    
    if [ -n "$CACHE_STATS_LINE" ]; then
        # Insert diagnostics endpoints before cache stats
        sed -i.diag_fix "${CACHE_STATS_LINE}i\\
$(cat diagnostic-endpoints.patch)
" src/backend/api/routes.js
    else
        echo "Warning: Could not find cache stats section for insertion point"
        # Try alternative insertion point - at the end of the file
        echo "$(cat diagnostic-endpoints.patch)" >> src/backend/api/routes.js
    fi
fi

echo "All fixes applied successfully!"