/**
 * Data utility functions for EDA
 */

/**
 * Detect data types for columns in a dataset
 * @param {Array} data Sample data array
 * @returns {Object} Object mapping column names to data types
 */
function detectDataTypes(data) {
  if (!data || data.length === 0) return {};
  
  const sample = data[0];
  const types = {};
  
  Object.keys(sample).forEach(key => {
    const values = data.slice(0, Math.min(100, data.length))
                      .map(row => row[key])
                      .filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) {
      types[key] = 'unknown';
      return;
    }
    
    // Check for date
    const dateChecks = values.slice(0, 5).map(v => isDate(v));
    if (dateChecks.every(Boolean)) {
      types[key] = 'temporal';
      return;
    }
    
    // Check for numeric
    const numericChecks = values.slice(0, 10).map(v => !isNaN(parseFloat(v)));
    if (numericChecks.every(Boolean)) {
      types[key] = 'numeric';
      return;
    }
    
    // Default to categorical
    types[key] = 'categorical';
  });
  
  return types;
}

/**
 * Check if a value is a valid date
 * @param {any} value The value to check
 * @returns {boolean} True if the value is a date
 */
function isDate(value) {
  if (value instanceof Date) return true;
  
  if (typeof value === 'string') {
    // Try to parse the date
    const date = new Date(value);
    return !isNaN(date) && 
           // Additional checks to filter out numeric values that are valid dates
           (
             value.includes('-') || 
             value.includes('/') || 
             value.includes(':') ||
             value.toLowerCase().includes('jan') ||
             value.toLowerCase().includes('feb')
           );
  }
  
  return false;
}

/**
 * Count columns by type
 * @param {Object} types Object mapping column names to types
 * @param {string} type Type to count
 * @returns {number} Number of columns of the specified type
 */
function countByType(types, type) {
  return Object.values(types).filter(t => t === type).length;
}

/**
 * Calculate cardinality of categorical columns
 * @param {Array} data Data array
 * @param {Array} dimensions Array of categorical column names
 * @returns {Object} Object mapping column names to cardinality
 */
function calculateCardinality(data, dimensions) {
  const cardinality = {};
  
  dimensions.forEach(dim => {
    const uniqueValues = new Set();
    data.forEach(row => {
      if (row[dim] !== null && row[dim] !== undefined) {
        uniqueValues.add(row[dim]);
      }
    });
    cardinality[dim] = uniqueValues.size;
  });
  
  return cardinality;
}

/**
 * Detect dimensions (categorical columns) from data types
 * @param {Array} data Data array
 * @returns {Array} Array of categorical column names
 */
function detectDimensions(data) {
  const types = detectDataTypes(data);
  return Object.keys(types).filter(key => types[key] === 'categorical');
}

/**
 * Check if data is percentage data (values add up to ~100)
 * @param {Array} data Data array
 * @param {string} valueColumn Column with numeric values
 * @returns {boolean} True if the data represents percentages
 */
function isPercentageData(data, valueColumn) {
  if (!data || data.length === 0 || !valueColumn) return false;
  
  const sum = data.reduce((acc, row) => {
    const val = parseFloat(row[valueColumn]);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  
  // Check if sum is close to 100 or 1
  return Math.abs(sum - 100) < 5 || Math.abs(sum - 1) < 0.05;
}

/**
 * Determine if a numeric column has a continuous distribution
 * @param {Array} data Data array
 * @param {string} column Column name
 * @returns {boolean} True if the distribution appears continuous
 */
function isContinuousDistribution(data, column) {
  if (!data || data.length === 0) return false;
  
  // Extract numeric values
  const values = data
    .map(row => parseFloat(row[column]))
    .filter(v => !isNaN(v));
  
  if (values.length < 10) return false;
  
  // Count unique values
  const uniqueValues = new Set(values);
  
  // If more than 20% of values are unique, consider it continuous
  return uniqueValues.size > values.length * 0.2;
}

/**
 * Find outliers using IQR method
 * @param {Array} values Array of numeric values
 * @returns {Object} Object with outliers and bounds
 */
function detectOutliersIQR(values) {
  if (!values || values.length === 0) return { outliers: [], bounds: {} };
  
  // Sort values
  const sorted = [...values].sort((a, b) => a - b);
  
  // Calculate quartiles
  const q1Idx = Math.floor(sorted.length * 0.25);
  const q3Idx = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  
  // Calculate IQR and bounds
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // Find outliers
  const outliers = values.filter(v => v < lowerBound || v > upperBound);
  
  return {
    outliers,
    bounds: {
      lower: lowerBound,
      upper: upperBound,
      q1,
      q3,
      iqr
    }
  };
}

module.exports = {
  detectDataTypes,
  countByType,
  calculateCardinality,
  detectDimensions,
  isPercentageData,
  isContinuousDistribution,
  detectOutliersIQR,
  isDate
};
