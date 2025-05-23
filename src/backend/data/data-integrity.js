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