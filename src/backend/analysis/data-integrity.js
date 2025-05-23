/**
 * Enhanced Data Integrity Analysis Module
 * Specialised for Australian healthcare and nutrition data
 * 
 * This module provides a comprehensive framework for analyzing data quality
 * and integrity with a focus on Australian healthcare datasets.
 */

// Import shared utilities
const { detectOutliersIQR } = require('../data/data-utils');

// Import configuration
const config = require('./integrity-config');

/**
 * Comprehensive data integrity analysis for dataset
 * @param {Array} dataset Data array
 * @param {Object} options Analysis options
 * @returns {Object} Data integrity assessment
 */
function analyzeDataIntegrity(dataset, options = {}) {
  if (!dataset || dataset.length === 0) {
    return {
      status: 'error',
      message: 'Empty dataset',
      score: 0,
      issues: []
    };
  }

  // Base results structure
  const results = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    score: 100, // Start with perfect score
    summary: {},
    issues: [],
    warnings: [],
    recommendations: [],
    format_recommendations: [] // New property for format recommendations
  };

  // Get dataset metadata
  const datasetMetadata = getDatasetMetadata(dataset);
  
  // Run all integrity checks (more modular approach)
  const checkResults = runIntegrityChecks(dataset, options, datasetMetadata);
  
  // Apply all results
  let totalDeductions = 0;
  Object.entries(checkResults).forEach(([checkName, result]) => {
    totalDeductions += applyIntegrityResults(results, result, checkName);
  });

  // Calculate final score
  results.score = Math.max(0, 100 - totalDeductions);
  
  // Set final status based on score
  results.status = getStatusFromScore(results.score);

  // Generate format recommendations
  results.format_recommendations = generateFormatRecommendations(dataset, datasetMetadata, results);

  // Generate summary
  results.summary = {
    total_records: dataset.length,
    total_columns: Object.keys(dataset[0] || {}).length,
    critical_issues: results.issues.filter(i => i.severity === 'critical').length,
    major_issues: results.issues.filter(i => i.severity === 'major').length,
    minor_issues: results.issues.filter(i => i.severity === 'minor').length,
    data_quality_score: results.score,
    data_quality_rating: results.status,
    optimal_visualizations: getSuggestedVisualizations(dataset, datasetMetadata, results)
  };

  return results;
}

/**
 * Get dataset metadata for integrity checks
 * @param {Array} dataset The dataset to analyze
 * @returns {Object} Basic metadata about the dataset
 */
function getDatasetMetadata(dataset) {
  if (!dataset || dataset.length === 0) return {};
  
  const columnTypes = {};
  const columns = Object.keys(dataset[0] || {});
  
  // Detect column types
  columns.forEach(col => {
    // Check the first 50 non-null values
    const sampleValues = dataset
      .map(row => row[col])
      .filter(v => v !== null && v !== undefined && v !== '')
      .slice(0, 50);
    
    if (sampleValues.length === 0) {
      columnTypes[col] = 'unknown';
      return;
    }
    
    // Check for date columns
    if (isDateColumn(sampleValues)) {
      columnTypes[col] = 'date';
      return;
    }
    
    // Check for numeric columns
    if (isNumericColumn(sampleValues)) {
      columnTypes[col] = 'numeric';
      return;
    }
    
    // Default to categorical
    columnTypes[col] = 'categorical';
  });
  
  return {
    columns,
    columnTypes,
    rowCount: dataset.length
  };
}

/**
 * Run all integrity checks on the dataset
 * @param {Array} dataset The dataset to check
 * @param {Object} options Options for the checks
 * @param {Object} metadata Dataset metadata
 * @returns {Object} Results from all checks
 */
function runIntegrityChecks(dataset, options, metadata) {
  return {
    'Completeness': checkCompleteness(dataset, metadata),
    'Consistency': checkConsistency(dataset, metadata),
    'Accuracy': checkAccuracy(dataset, metadata),
    'Validity': checkValidity(dataset, metadata),
    'Timeliness': checkTimeliness(dataset, options, metadata),
    'Australian Context': checkAustralianContext(dataset, metadata)
  };
}

/**
 * Get status text based on score
 * @param {number} score Integrity score (0-100)
 * @returns {string} Status label
 */
function getStatusFromScore(score) {
  if (score < 30) return 'critical';
  if (score < 60) return 'poor';
  if (score < 80) return 'fair';
  if (score < 95) return 'good';
  return 'excellent';
}

/**
 * Generate visualization format recommendations based on data
 * @param {Array} dataset The dataset
 * @param {Object} metadata Dataset metadata
 * @param {Object} results Integrity results
 * @returns {Array} Format recommendations
 */
function generateFormatRecommendations(dataset, metadata, results) {
  const recommendations = [];
  
  // Add general data formatting recommendations
  recommendations.push({
    type: 'data_structure',
    description: 'For better analysis, ensure consistent data types and formats across all records',
    priority: 'high'
  });
  
  // Recommend standardizing date formats if we have date columns
  const dateColumns = Object.entries(metadata.columnTypes)
    .filter(([_, type]) => type === 'date')
    .map(([col, _]) => col);
    
  if (dateColumns.length > 0) {
    recommendations.push({
      type: 'date_format',
      description: `Standardize date formats for columns: ${dateColumns.join(', ')}. Use ISO 8601 format (YYYY-MM-DD) for best compatibility.`,
      priority: 'medium',
      columns: dateColumns
    });
  }
  
  // Recommend handling missing values appropriately
  const missingValueIssues = results.issues.filter(i => i.type === 'missing_values');
  if (missingValueIssues.length > 0) {
    recommendations.push({
      type: 'missing_values',
      description: 'For visualization, consider either removing records with missing values or imputing them appropriately',
      priority: 'high',
      columns: missingValueIssues.map(i => i.column).filter(Boolean)
    });
  }
  
  // Recommend appropriate numeric formats for Australian context
  const numericColumns = Object.entries(metadata.columnTypes)
    .filter(([_, type]) => type === 'numeric')
    .map(([col, _]) => col);
    
  if (numericColumns.length > 0) {
    recommendations.push({
      type: 'numeric_format',
      description: 'Use Australian number formatting conventions: use decimal point for decimals, and space or comma for thousands separator',
      priority: 'medium',
      columns: numericColumns
    });
  }
  
  return recommendations;
}

/**
 * Determine optimal visualization types based on data
 * @param {Array} dataset The dataset
 * @param {Object} metadata Dataset metadata
 * @param {Object} results Integrity results
 * @returns {Array} Suggested visualizations in priority order
 */
function getSuggestedVisualizations(dataset, metadata, results) {
  const suggestions = [];
  
  // Check for time series data (at least one date column and numeric columns)
  const dateColumns = Object.entries(metadata.columnTypes)
    .filter(([_, type]) => type === 'date')
    .map(([col, _]) => col);
    
  const numericColumns = Object.entries(metadata.columnTypes)
    .filter(([_, type]) => type === 'numeric')
    .map(([col, _]) => col);
  
  // If we have date and numeric columns, suggest time series
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    suggestions.push({
      type: 'line',
      priority: 'high',
      xColumn: dateColumns[0],
      yColumn: numericColumns[0],
      title: `${numericColumns[0]} Over Time`,
      reason: 'Time series analysis of primary numeric variable'
    });
  }
  
  // If we have multiple numeric columns, suggest correlation visualization
  if (numericColumns.length >= 2) {
    suggestions.push({
      type: 'scatter',
      priority: 'high',
      xColumn: numericColumns[0],
      yColumn: numericColumns[1],
      title: `${numericColumns[1]} vs ${numericColumns[0]}`,
      reason: 'Exploring relationship between key numeric variables'
    });
    
    suggestions.push({
      type: 'heatmap',
      priority: 'medium',
      columns: numericColumns.slice(0, Math.min(numericColumns.length, 5)),
      title: 'Correlation Matrix',
      reason: 'Visualizing relationships between multiple numeric variables'
    });
  }
  
  // Add distribution visualization for key metrics
  if (numericColumns.length > 0) {
    suggestions.push({
      type: 'histogram',
      priority: 'medium',
      column: numericColumns[0],
      title: `Distribution of ${numericColumns[0]}`,
      reason: 'Understanding the distribution of the primary metric'
    });
  }
  
  // If categorical columns exist, suggest categorical analysis
  const categoricalColumns = Object.entries(metadata.columnTypes)
    .filter(([_, type]) => type === 'categorical')
    .map(([col, _]) => col);
    
  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    suggestions.push({
      type: 'bar',
      priority: 'medium',
      xColumn: categoricalColumns[0],
      yColumn: numericColumns[0],
      title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
      reason: 'Comparing numeric values across categories'
    });
  }
  
  return suggestions;
}

/**
 * Apply integrity check results to main results object
 * @param {Object} results Main results object (modified in place)
 * @param {Object} checkResults Results from specific check
 * @param {string} checkName Name of the check
 * @returns {number} Total score deductions
 */
function applyIntegrityResults(results, checkResults, checkName) {
  if (!checkResults) return 0;
  
  if (checkResults.issues && checkResults.issues.length > 0) {
    // Add category to each issue
    checkResults.issues.forEach(issue => {
      issue.category = checkName;
      results.issues.push(issue);
    });
  }
  
  if (checkResults.warnings && checkResults.warnings.length > 0) {
    checkResults.warnings.forEach(warning => {
      warning.category = checkName;
      results.warnings.push(warning);
    });
  }
  
  if (checkResults.recommendations && checkResults.recommendations.length > 0) {
    checkResults.recommendations.forEach(rec => {
      rec.category = checkName;
      results.recommendations.push(rec);
    });
  }
  
  return checkResults.score_deduction || 0;
}

/**
 * Check if a set of values are likely dates
 * @param {Array} values Array of values to check
 * @returns {boolean} True if likely dates
 */
function isDateColumn(values) {
  if (!values || values.length === 0) return false;
  
  // Count values that look like dates
  const dateCount = values.filter(v => {
    if (v instanceof Date) return true;
    
    // Try to parse as date
    const date = new Date(v);
    return !isNaN(date) && 
           // Filter out numeric values that can be parsed as dates
           (String(v).includes('-') || 
            String(v).includes('/') || 
            String(v).includes(':'));
  }).length;
  
  // If more than 80% are dates, consider it a date column
  return dateCount / values.length >= 0.8;
}

/**
 * Check if a set of values are likely numeric
 * @param {Array} values Array of values to check
 * @returns {boolean} True if likely numeric
 */
function isNumericColumn(values) {
  if (!values || values.length === 0) return false;
  
  // Count numeric values
  const numericCount = values.filter(v => {
    const num = parseFloat(v);
    return !isNaN(num);
  }).length;
  
  // If more than 80% are numeric, consider it a numeric column
  return numericCount / values.length >= 0.8;
}

/**
 * Check data completeness
 * @param {Array} dataset Data array
 * @returns {Object} Completeness assessment
 */
function checkCompleteness(dataset) {
  const results = {
    issues: [],
    warnings: [],
    recommendations: [],
    score_deduction: 0
  };
  
  if (!dataset || dataset.length === 0) return results;
  
  const columns = Object.keys(dataset[0] || {});
  
  // Calculate missing values by column
  const missingByColumn = {};
  
  columns.forEach(col => {
    const missing = dataset.filter(row => 
      row[col] === null || 
      row[col] === undefined || 
      row[col] === ''
    ).length;
    
    const missingPercentage = (missing / dataset.length) * 100;
    missingByColumn[col] = {
      missing_count: missing,
      missing_percentage: missingPercentage.toFixed(2)
    };
    
    // Set issues based on severity
    if (missingPercentage > 50) {
      results.issues.push({
        column: col,
        type: 'missing_values',
        description: `Column "${col}" has ${missingPercentage.toFixed(2)}% missing values (${missing} records)`,
        severity: 'critical'
      });
      results.score_deduction += 10;
    } else if (missingPercentage > 20) {
      results.issues.push({
        column: col,
        type: 'missing_values',
        description: `Column "${col}" has ${missingPercentage.toFixed(2)}% missing values (${missing} records)`,
        severity: 'major'
      });
      results.score_deduction += 5;
    } else if (missingPercentage > 5) {
      results.issues.push({
        column: col,
        type: 'missing_values',
        description: `Column "${col}" has ${missingPercentage.toFixed(2)}% missing values (${missing} records)`,
        severity: 'minor'
      });
      results.score_deduction += 2;
    }
  });
  
  // Check for rows with excessive missing values
  const rowsMissingValues = dataset.map(row => {
    const missingCount = columns.filter(col => 
      row[col] === null || 
      row[col] === undefined || 
      row[col] === ''
    ).length;
    return {
      missing_count: missingCount,
      missing_percentage: (missingCount / columns.length) * 100
    };
  });
  
  const rowsMissingMost = rowsMissingValues
    .filter(r => r.missing_percentage > 50)
    .length;
  
  if (rowsMissingMost > 0) {
    const percentage = (rowsMissingMost / dataset.length) * 100;
    
    if (percentage > 20) {
      results.issues.push({
        type: 'incomplete_rows',
        description: `${rowsMissingMost} rows (${percentage.toFixed(2)}%) are missing more than 50% of values`,
        severity: 'critical'
      });
      results.score_deduction += 10;
    } else if (percentage > 5) {
      results.issues.push({
        type: 'incomplete_rows',
        description: `${rowsMissingMost} rows (${percentage.toFixed(2)}%) are missing more than 50% of values`,
        severity: 'major'
      });
      results.score_deduction += 5;
    } else {
      results.issues.push({
        type: 'incomplete_rows',
        description: `${rowsMissingMost} rows (${percentage.toFixed(2)}%) are missing more than 50% of values`,
        severity: 'minor'
      });
      results.score_deduction += 2;
    }
  }
  
  // Recommendations for completeness issues
  if (results.issues.length > 0) {
    results.recommendations.push({
      type: 'missing_data_handling',
      description: 'Consider appropriate techniques for handling missing data (imputation, removal, etc.)',
      priority: 'high'
    });
  }
  
  return results;
}

/**
 * Check data consistency
 * @param {Array} dataset Data array
 * @returns {Object} Consistency assessment
 */
function checkConsistency(dataset) {
  const results = {
    issues: [],
    warnings: [],
    recommendations: [],
    score_deduction: 0
  };
  
  if (!dataset || dataset.length === 0) return results;
  
  const columns = Object.keys(dataset[0] || {});
  
  // Check for inconsistent data types within columns
  columns.forEach(col => {
    const typeCounts = {};
    
    dataset.forEach(row => {
      const value = row[col];
      
      if (value !== null && value !== undefined && value !== '') {
        const type = typeof value;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });
    
    const types = Object.keys(typeCounts);
    
    if (types.length > 1) {
      // If we have mixed types, flag as consistency issue
      results.issues.push({
        column: col,
        type: 'mixed_types',
        description: `Column "${col}" has inconsistent data types: ${types.join(', ')}`,
        severity: 'major'
      });
      results.score_deduction += 5;
    }
  });
  
  // Check for duplicate rows
  const duplicates = findDuplicateRows(dataset);
  
  if (duplicates.length > 0) {
    const percentage = (duplicates.length / dataset.length) * 100;
    
    if (percentage > 10) {
      results.issues.push({
        type: 'duplicate_rows',
        description: `${duplicates.length} rows (${percentage.toFixed(2)}%) are duplicates`,
        severity: 'critical'
      });
      results.score_deduction += 10;
    } else if (percentage > 2) {
      results.issues.push({
        type: 'duplicate_rows',
        description: `${duplicates.length} rows (${percentage.toFixed(2)}%) are duplicates`,
        severity: 'major'
      });
      results.score_deduction += 5;
    } else {
      results.issues.push({
        type: 'duplicate_rows',
        description: `${duplicates.length} rows (${percentage.toFixed(2)}%) are duplicates`,
        severity: 'minor'
      });
      results.score_deduction += 2;
    }
  }
  
  // Check for logical inconsistencies in Australian health data
  // (Specific to common Australian health data formats)
  
  // Example: Check if percentage columns exceed 100%
  columns.forEach(col => {
    if (col.toLowerCase().includes('percent') || 
        col.toLowerCase().includes('rate') || 
        col.toLowerCase().includes('ratio')) {
      
      const exceedingRows = dataset.filter(row => {
        const value = parseFloat(row[col]);
        return !isNaN(value) && value > 100;
      });
      
      if (exceedingRows.length > 0) {
        results.issues.push({
          column: col,
          type: 'logical_inconsistency',
          description: `Column "${col}" has ${exceedingRows.length} values exceeding 100%`,
          severity: 'major'
        });
        results.score_deduction += 5;
      }
    }
  });
  
  // If we have year-based data, check for chronological consistency
  if (columns.includes('Year')) {
    const expectedYears = [];
    let lastYear = null;
    let gaps = [];
    
    // Sort data by year
    const sortedData = [...dataset].sort((a, b) => {
      return parseInt(a.Year) - parseInt(b.Year);
    });
    
    // Check for gaps or duplicates in years
    sortedData.forEach(row => {
      const year = parseInt(row.Year);
      
      if (!isNaN(year)) {
        if (lastYear !== null) {
          // Check for gaps
          if (year > lastYear + 1) {
            gaps.push({ from: lastYear, to: year });
          }
        }
        
        lastYear = year;
      }
    });
    
    if (gaps.length > 0) {
      results.warnings.push({
        column: 'Year',
        type: 'chronological_gaps',
        description: `Time series has ${gaps.length} gaps in years: ${gaps.map(g => `${g.from}-${g.to}`).join(', ')}`,
        severity: 'minor'
      });
      results.score_deduction += 1;
    }
  }
  
  // Recommendations for consistency issues
  if (results.issues.filter(i => i.type === 'mixed_types').length > 0) {
    results.recommendations.push({
      type: 'data_type_standardisation',
      description: 'Standardise data types across all columns to ensure consistency',
      priority: 'high'
    });
  }
  
  if (results.issues.filter(i => i.type === 'duplicate_rows').length > 0) {
    results.recommendations.push({
      type: 'duplicate_removal',
      description: 'Remove duplicate rows to prevent biased analysis results',
      priority: 'high'
    });
  }
  
  return results;
}

/**
 * Check data accuracy
 * @param {Array} dataset Data array
 * @returns {Object} Accuracy assessment
 */
function checkAccuracy(dataset) {
  const results = {
    issues: [],
    warnings: [],
    recommendations: [],
    score_deduction: 0
  };
  
  if (!dataset || dataset.length === 0) return results;
  
  const columns = Object.keys(dataset[0] || {});
  
  // Check for numeric columns
  const numericColumns = columns.filter(col => {
    const sampleValues = dataset.slice(0, 20).map(row => row[col]);
    const numericValues = sampleValues.filter(v => {
      if (v === null || v === undefined || v === '') return false;
      const num = parseFloat(v);
      return !isNaN(num);
    });
    
    return numericValues.length > 0.8 * sampleValues.length;
  });
  
  // Check for outliers in numeric columns
  numericColumns.forEach(col => {
    const values = dataset.map(row => {
      if (row[col] === null || row[col] === undefined || row[col] === '') return null;
      return parseFloat(row[col]);
    }).filter(v => v !== null && !isNaN(v));
    
    if (values.length > 0) {
      const outliers = detectOutliers(values);
      
      if (outliers.percentage > 0) {
        if (outliers.percentage > 10) {
          results.issues.push({
            column: col,
            type: 'extreme_outliers',
            description: `Column "${col}" has ${outliers.count} extreme outliers (${outliers.percentage.toFixed(2)}%)`,
            severity: 'major'
          });
          results.score_deduction += 5;
        } else if (outliers.percentage > 2) {
          results.issues.push({
            column: col,
            type: 'outliers',
            description: `Column "${col}" has ${outliers.count} outliers (${outliers.percentage.toFixed(2)}%)`,
            severity: 'minor'
          });
          results.score_deduction += 2;
        }
      }
    }
  });
  
  // Check for Australian-specific accuracy issues in health data
  
  // Example: BMI values outside realistic range
  if (columns.includes('BMI') || columns.some(c => c.includes('BMI'))) {
    const bmiColumn = columns.find(c => c === 'BMI') || 
                     columns.find(c => c.includes('BMI'));
    
    if (bmiColumn) {
      const unrealisticBMIs = dataset.filter(row => {
        const bmi = parseFloat(row[bmiColumn]);
        return !isNaN(bmi) && (bmi < 12 || bmi > 60); // Extreme BMI values
      });
      
      if (unrealisticBMIs.length > 0) {
        results.issues.push({
          column: bmiColumn,
          type: 'unrealistic_values',
          description: `Column "${bmiColumn}" has ${unrealisticBMIs.length} unrealistic BMI values (<12 or >60)`,
          severity: 'major'
        });
        results.score_deduction += 5;
      }
    }
  }
  
  // Example: Check age distributions if available
  if (columns.includes('Age') || columns.some(c => c.includes('Age'))) {
    const ageColumn = columns.find(c => c === 'Age') || 
                     columns.find(c => c.includes('Age'));
    
    if (ageColumn) {
      const unrealisticAges = dataset.filter(row => {
        const age = parseFloat(row[ageColumn]);
        return !isNaN(age) && (age < 0 || age > 120); // Extreme age values
      });
      
      if (unrealisticAges.length > 0) {
        results.issues.push({
          column: ageColumn,
          type: 'unrealistic_values',
          description: `Column "${ageColumn}" has ${unrealisticAges.length} unrealistic age values (<0 or >120)`,
          severity: 'major'
        });
        results.score_deduction += 5;
      }
    }
  }
  
  // Recommendations for accuracy issues
  if (results.issues.filter(i => i.type.includes('outliers')).length > 0) {
    results.recommendations.push({
      type: 'outlier_treatment',
      description: 'Review and address potential outliers to improve data accuracy',
      priority: 'medium'
    });
  }
  
  if (results.issues.filter(i => i.type === 'unrealistic_values').length > 0) {
    results.recommendations.push({
      type: 'validate_range_consistency',
      description: 'Implement data validation rules for realistic value ranges',
      priority: 'high'
    });
  }
  
  return results;
}

/**
 * Check data validity
 * @param {Array} dataset Data array
 * @returns {Object} Validity assessment
 */
function checkValidity(dataset) {
  const results = {
    issues: [],
    warnings: [],
    recommendations: [],
    score_deduction: 0
  };
  
  if (!dataset || dataset.length === 0) return results;
  
  const columns = Object.keys(dataset[0] || {});
  
  // Check specific Australian health data patterns
  
  // Check for valid Australian postcode format if available
  if (columns.includes('Postcode') || columns.some(c => c.toLowerCase().includes('postcode'))) {
    const postcodeColumn = columns.find(c => c === 'Postcode') || 
                          columns.find(c => c.toLowerCase().includes('postcode'));
    
    if (postcodeColumn) {
      const invalidPostcodes = dataset.filter(row => {
        const postcode = row[postcodeColumn];
        if (postcode === null || postcode === undefined || postcode === '') return false;
        
        // Australian postcodes are 4 digits
        const regex = /^\d{4}$/;
        return !regex.test(String(postcode));
      });
      
      if (invalidPostcodes.length > 0) {
        const percentage = (invalidPostcodes.length / dataset.length) * 100;
        
        results.issues.push({
          column: postcodeColumn,
          type: 'invalid_format',
          description: `Column "${postcodeColumn}" has ${invalidPostcodes.length} invalid Australian postcodes (${percentage.toFixed(2)}%)`,
          severity: 'minor'
        });
        results.score_deduction += 2;
      }
    }
  }
  
  // Check for valid health measurement ranges
  const healthMeasurements = {
    'Cholesterol': { min: 2.0, max: 12.0 }, // mmol/L
    'Blood_Pressure_Systolic': { min: 70, max: 250 },
    'Blood_Pressure_Diastolic': { min: 40, max: 150 },
    'Heart_Rate': { min: 30, max: 220 },
    'Blood_Glucose': { min: 2.0, max: 30.0 }, // mmol/L
    'HbA1c': { min: 3.5, max: 20.0 }, // % 
    'Weight_kg': { min: 15, max: 300 }, // adult + children
  };
  
  // Map of common variations of column names
  const measurementPatterns = {
    'Cholesterol': ['cholesterol', 'chol', 'total_cholesterol'],
    'Blood_Pressure_Systolic': ['sbp', 'systolic', 'systolic_bp'],
    'Blood_Pressure_Diastolic': ['dbp', 'diastolic', 'diastolic_bp'],
    'Heart_Rate': ['hr', 'heart_rate', 'pulse'],
    'Blood_Glucose': ['glucose', 'blood_glucose', 'bgl'],
    'HbA1c': ['hba1c', 'a1c', 'glycated', 'glycated_haemoglobin'],
    'Weight_kg': ['weight', 'mass_kg', 'weight_kg']
  };
  
  // Check each health measurement type
  Object.keys(healthMeasurements).forEach(measurementType => {
    const patterns = measurementPatterns[measurementType];
    
    // Find matching columns for this measurement
    const matchingColumns = columns.filter(col => {
      const lowerCol = col.toLowerCase();
      return patterns.some(pattern => lowerCol.includes(pattern));
    });
    
    if (matchingColumns.length > 0) {
      matchingColumns.forEach(col => {
        const { min, max } = healthMeasurements[measurementType];
        
        const invalidValues = dataset.filter(row => {
          const value = parseFloat(row[col]);
          if (isNaN(value)) return false;
          return value < min || value > max;
        });
        
        if (invalidValues.length > 0) {
          const percentage = (invalidValues.length / dataset.length) * 100;
          
          if (percentage > 10) {
            results.issues.push({
              column: col,
              type: 'invalid_health_measurement',
              description: `Column "${col}" has ${invalidValues.length} values outside valid range (${min}-${max}) for ${measurementType} (${percentage.toFixed(2)}%)`,
              severity: 'major'
            });
            results.score_deduction += 5;
          } else {
            results.issues.push({
              column: col,
              type: 'invalid_health_measurement',
              description: `Column "${col}" has ${invalidValues.length} values outside valid range (${min}-${max}) for ${measurementType} (${percentage.toFixed(2)}%)`,
              severity: 'minor'
            });
            results.score_deduction += 2;
          }
        }
      });
    }
  });
  
  // Recommendations
  if (results.issues.filter(i => i.type === 'invalid_format').length > 0) {
    results.recommendations.push({
      type: 'data_validation',
      description: 'Implement format validation for Australian-specific data fields',
      priority: 'medium'
    });
  }
  
  if (results.issues.filter(i => i.type === 'invalid_health_measurement').length > 0) {
    results.recommendations.push({
      type: 'clinical_range_validation',
      description: 'Apply clinical range validation to health measurements',
      priority: 'high'
    });
  }
  
  return results;
}

/**
 * Check data timeliness
 * @param {Array} dataset Data array
 * @param {Object} options Analysis options
 * @returns {Object} Timeliness assessment
 */
function checkTimeliness(dataset, options = {}) {
  const results = {
    issues: [],
    warnings: [],
    recommendations: [],
    score_deduction: 0
  };
  
  if (!dataset || dataset.length === 0) return results;
  
  const columns = Object.keys(dataset[0] || {});
  
  // Check for year or date columns
  const dateColumns = columns.filter(col => 
    col === 'Year' || 
    col === 'Date' || 
    col.toLowerCase().includes('date') || 
    col.toLowerCase().includes('year')
  );
  
  if (dateColumns.length === 0) {
    results.warnings.push({
      type: 'no_temporal_columns',
      description: 'Dataset does not contain clear temporal columns (Year/Date)',
      severity: 'minor'
    });
    return results;
  }
  
  // Get the current year for reference
  const currentYear = new Date().getFullYear();
  
  // Check each date column
  dateColumns.forEach(col => {
    // Extract values
    const values = dataset
      .map(row => {
        if (row[col] === null || row[col] === undefined || row[col] === '') return null;
        
        const val = row[col];
        
        // If it's a year column (usually just numeric)
        if (col === 'Year' || col.toLowerCase().includes('year')) {
          const year = parseInt(val);
          return isNaN(year) ? null : year;
        }
        
        // Try to parse as date
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date.getFullYear();
      })
      .filter(v => v !== null);
    
    if (values.length > 0) {
      // Find most recent year
      const maxYear = Math.max(...values);
      const yearDifference = currentYear - maxYear;
      
      // Assess timeliness
      if (yearDifference > 10) {
        results.issues.push({
          column: col,
          type: 'outdated_data',
          description: `Most recent data is ${yearDifference} years old (${maxYear})`,
          severity: 'critical'
        });
        results.score_deduction += 10;
      } else if (yearDifference > 5) {
        results.issues.push({
          column: col,
          type: 'outdated_data',
          description: `Most recent data is ${yearDifference} years old (${maxYear})`,
          severity: 'major'
        });
        results.score_deduction += 5;
      } else if (yearDifference > 2) {
        results.warnings.push({
          column: col,
          type: 'outdated_data',
          description: `Most recent data is ${yearDifference} years old (${maxYear})`,
          severity: 'minor'
        });
        results.score_deduction += 2;
      }
    }
  });
  
  // Recommendations
  if (results.issues.filter(i => i.type === 'outdated_data').length > 0) {
    results.recommendations.push({
      type: 'acquire_recent_data',
      description: 'Consider obtaining more recent data for accurate analysis',
      priority: 'high'
    });
  }
  
  return results;
}

/**
 * Check Australian context-specific issues
 * @param {Array} dataset Data array
 * @returns {Object} Australian context assessment
 */
function checkAustralianContext(dataset) {
  const results = {
    issues: [],
    warnings: [],
    recommendations: [],
    score_deduction: 0
  };
  
  if (!dataset || dataset.length === 0) return results;
  
  const columns = Object.keys(dataset[0] || {});
  
  // Check for Australian state/territory representation
  const stateColumns = columns.filter(col => 
    col === 'State' ||
    col === 'Territory' ||
    col.toLowerCase().includes('state') ||
    col.toLowerCase().includes('territory')
  );
  
  if (stateColumns.length > 0) {
    // Standard Australian states and territories
    const australianStatesAndTerritories = [
      'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT',
      'New South Wales', 'Victoria', 'Queensland', 'South Australia',
      'Western Australia', 'Tasmania', 'Northern Territory', 
      'Australian Capital Territory'
    ];
    
    stateColumns.forEach(col => {
      // Get unique values
      const uniqueValues = [...new Set(dataset
        .map(row => row[col])
        .filter(v => v !== null && v !== undefined && v !== '')
      )];
      
      // Check for non-Australian values
      const nonAustralianValues = uniqueValues.filter(v => 
        !australianStatesAndTerritories.some(state => 
          v.toString().toLowerCase() === state.toLowerCase()
        )
      );
      
      if (nonAustralianValues.length > 0) {
        results.warnings.push({
          column: col,
          type: 'non_australian_states',
          description: `Column "${col}" contains non-Australian state/territory values: ${nonAustralianValues.join(', ')}`,
          severity: 'minor'
        });
        results.score_deduction += 2;
      }
      
      // Check for missing states/territories
      const representedStates = uniqueValues.filter(v => 
        australianStatesAndTerritories.some(state => 
          v.toString().toLowerCase() === state.toLowerCase()
        )
      );
      
      if (representedStates.length < 8 && representedStates.length > 0) {
        results.warnings.push({
          column: col,
          type: 'incomplete_state_coverage',
          description: `Data may not represent all Australian states and territories (found ${representedStates.length} of 8)`,
          severity: 'minor'
        });
        results.score_deduction += 1;
      }
    });
  }
  
  // Check for Australian measurement units in health data
  const columnPatterns = [
    { pattern: 'cholesterol', unit: 'mmol/L', nonAusUnit: 'mg/dL' },
    { pattern: 'glucose', unit: 'mmol/L', nonAusUnit: 'mg/dL' },
    { pattern: 'hba1c', unit: '%', nonAusUnit: 'mmol/mol' }, // Australia primarily uses % not mmol/mol
    { pattern: 'weight', unit: 'kg', nonAusUnit: 'lbs' }
  ];
  
  columnPatterns.forEach(({ pattern, unit, nonAusUnit }) => {
    const matchingColumns = columns.filter(col => 
      col.toLowerCase().includes(pattern)
    );
    
    if (matchingColumns.length > 0) {
      matchingColumns.forEach(col => {
        // Check if column name contains unit
        if (col.toLowerCase().includes(nonAusUnit.toLowerCase())) {
          results.warnings.push({
            column: col,
            type: 'non_australian_unit',
            description: `Column "${col}" may be using non-Australian unit ${nonAusUnit} instead of standard Australian unit ${unit}`,
            severity: 'minor'
          });
          results.score_deduction += 1;
        }
        
        // Check for values suggesting incorrect units
        if (pattern === 'cholesterol' || pattern === 'glucose') {
          // These should be mmol/L in Australia (typically <10), not mg/dL (typically >100)
          const highValues = dataset.filter(row => {
            const value = parseFloat(row[col]);
            return !isNaN(value) && value > 50; // Likely to be in mg/dL not mmol/L
          });
          
          if (highValues.length > dataset.length * 0.5) { // If most values are high
            results.issues.push({
              column: col,
              type: 'suspicious_unit',
              description: `Column "${col}" contains values suggesting non-Australian units (mg/dL instead of mmol/L)`,
              severity: 'major'
            });
            results.score_deduction += 5;
          }
        }
      });
    }
  });
  
  // Check for proper Australian classification systems
  const diagnosesCols = columns.filter(col => 
    col.toLowerCase().includes('diagnosis') || 
    col.toLowerCase().includes('condition') ||
    col.toLowerCase().includes('disease')
  );
  
  if (diagnosesCols.length > 0) {
    // Australia uses ICD-10-AM (Australian Modification)
    // Check for ICD-10 codes in correct format
    diagnosesCols.forEach(col => {
      // Sample some values
      const sampleValues = dataset
        .slice(0, Math.min(100, dataset.length))
        .map(row => row[col])
        .filter(v => v !== null && v !== undefined && v !== '');
      
      // Check if values follow ICD-10 format (letter followed by digits)
      const nonIcdFormat = sampleValues.filter(v => {
        // ICD-10 typically has format like A00.0
        return typeof v === 'string' && !v.match(/^[A-Z]\d\d(\.\d)?$/);
      });
      
      if (nonIcdFormat.length > sampleValues.length * 0.5 && sampleValues.length > 0) {
        results.warnings.push({
          column: col,
          type: 'non_standard_classification',
          description: `Column "${col}" may not use Australian ICD-10-AM coding system`,
          severity: 'minor'
        });
        results.score_deduction += 1;
      }
    });
  }
  
  // Recommendations
  if (results.issues.filter(i => i.type === 'suspicious_unit').length > 0) {
    results.recommendations.push({
      type: 'standardise_australian_units',
      description: 'Convert measurements to standard Australian units (mmol/L for cholesterol/glucose, kg for weight)',
      priority: 'high'
    });
  }
  
  if (results.warnings.filter(w => w.type === 'incomplete_state_coverage').length > 0) {
    results.recommendations.push({
      type: 'improve_geographical_representation',
      description: 'Consider collecting data from additional states/territories for national representation',
      priority: 'medium'
    });
  }
  
  return results;
}

/**
 * Detect outliers in array of values
 * @param {Array} values Array of numeric values
 * @returns {Object} Outlier statistics
 */
function detectOutliers(values) {
  if (!values || values.length === 0) {
    return { count: 0, percentage: 0 };
  }
  
  // Sort values
  const sorted = [...values].sort((a, b) => a - b);
  
  // Calculate quartiles
  const q1Idx = Math.floor(sorted.length * 0.25);
  const q3Idx = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  
  // Calculate IQR
  const iqr = q3 - q1;
  
  // Define outlier bounds
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // Count outliers
  const outliers = values.filter(v => v < lowerBound || v > upperBound);
  
  return {
    count: outliers.length,
    percentage: (outliers.length / values.length) * 100
  };
}

/**
 * Find duplicate rows in dataset
 * @param {Array} dataset Data array
 * @returns {Array} Array of duplicate rows
 */
function findDuplicateRows(dataset) {
  if (!dataset || dataset.length === 0) return [];
  
  const seen = new Set();
  const duplicates = [];
  
  dataset.forEach(row => {
    const serialized = JSON.stringify(row);
    if (seen.has(serialized)) {
      duplicates.push(row);
    } else {
      seen.add(serialized);
    }
  });
  
  return duplicates;
}

module.exports = {
  analyzeDataIntegrity,
  checkCompleteness,
  checkConsistency,
  checkAccuracy,
  checkValidity,
  checkTimeliness,
  checkAustralianContext
};