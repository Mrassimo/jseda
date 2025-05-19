/**
 * Descriptive statistics for EDA
 */

// Use simple-statistics for calculations
const ss = require('simple-statistics');
const jStat = require('jstat');
const { detectOutliersIQR } = require('../data/data-utils');

/**
 * Calculate basic statistics for a numeric array
 * @param {Array} values Array of numeric values
 * @returns {Object} Object with statistics
 */
function calculateBasicStats(values) {
  if (!values || values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      range: null,
      mean: null,
      median: null,
      variance: null,
      standard_deviation: null
    };
  }
  
  // Filter out non-numeric values
  const numericValues = values
    .map(v => typeof v === 'string' ? parseFloat(v) : v)
    .filter(v => !isNaN(v));
  
  if (numericValues.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      range: null,
      mean: null,
      median: null,
      variance: null,
      standard_deviation: null
    };
  }
  
  const stats = {
    count: numericValues.length,
    min: ss.min(numericValues),
    max: ss.max(numericValues),
    range: ss.max(numericValues) - ss.min(numericValues),
    mean: ss.mean(numericValues),
    median: ss.median(numericValues),
    variance: numericValues.length > 1 ? ss.variance(numericValues) : 0,
    standard_deviation: numericValues.length > 1 ? ss.standardDeviation(numericValues) : 0
  };
  
  return stats;
}

/**
 * Calculate advanced statistics for a numeric array
 * @param {Array} values Array of numeric values
 * @returns {Object} Object with advanced statistics
 */
function calculateAdvancedStats(values) {
  if (!values || values.length === 0) {
    return {
      skewness: null,
      kurtosis: null,
      quantiles: { q1: null, q2: null, q3: null },
      outliers: { count: 0, percentage: 0, method: "IQR", bounds: {} }
    };
  }
  
  // Filter out non-numeric values
  const numericValues = values
    .map(v => typeof v === 'string' ? parseFloat(v) : v)
    .filter(v => !isNaN(v));
  
  if (numericValues.length < 4) {
    return {
      skewness: null,
      kurtosis: null,
      quantiles: { q1: null, q2: null, q3: null },
      outliers: { count: 0, percentage: 0, method: "IQR", bounds: {} }
    };
  }
  
  // Calculate statistics
  const stats = {
    skewness: jStat.skewness(numericValues),
    kurtosis: jStat.kurtosis(numericValues),
    quantiles: {
      q1: ss.quantile(numericValues, 0.25),
      q2: ss.quantile(numericValues, 0.5),
      q3: ss.quantile(numericValues, 0.75)
    }
  };
  
  // Detect outliers
  const outlierResult = detectOutliersIQR(numericValues);
  stats.outliers = {
    count: outlierResult.outliers.length,
    percentage: ((outlierResult.outliers.length / numericValues.length) * 100).toFixed(2),
    method: "IQR",
    bounds: outlierResult.bounds
  };
  
  // Determine distribution characteristics
  stats.distribution = {
    appears_normal: Math.abs(stats.skewness) < 0.5 && Math.abs(stats.kurtosis) < 0.5,
    shape: stats.skewness > 0.5 ? "right-skewed" : 
           stats.skewness < -0.5 ? "left-skewed" : "symmetric"
  };
  
  return stats;
}

/**
 * Calculate frequency distribution for categorical data
 * @param {Array} values Array of categorical values
 * @param {number} maxCategories Maximum number of categories to include
 * @returns {Object} Object with frequency distribution
 */
function calculateFrequencyDistribution(values, maxCategories = 20) {
  if (!values || values.length === 0) {
    return {
      count: 0,
      unique_count: 0,
      frequencies: {}
    };
  }
  
  // Filter out null/undefined
  const filteredValues = values.filter(v => v !== null && v !== undefined);
  
  // Count frequencies
  const frequencies = {};
  filteredValues.forEach(v => {
    const key = String(v);
    frequencies[key] = (frequencies[key] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedEntries = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1]);
  
  // Limit to max categories
  const topCategories = sortedEntries.slice(0, maxCategories);
  
  // Create "Other" category if necessary
  if (sortedEntries.length > maxCategories) {
    const otherCount = sortedEntries
      .slice(maxCategories)
      .reduce((sum, [_, count]) => sum + count, 0);
    
    if (otherCount > 0) {
      topCategories.push(['Other', otherCount]);
    }
  }
  
  // Convert back to object
  const limitedFrequencies = {};
  topCategories.forEach(([key, count]) => {
    limitedFrequencies[key] = count;
  });
  
  return {
    count: filteredValues.length,
    unique_count: sortedEntries.length,
    frequencies: limitedFrequencies
  };
}

/**
 * Create a histogram for numeric data
 * @param {Array} values Array of numeric values
 * @param {number} bins Number of bins
 * @returns {Object} Object with histogram data
 */
function createHistogram(values, bins = 10) {
  if (!values || values.length === 0) {
    return {
      bins: [],
      bin_edges: []
    };
  }
  
  // Filter out non-numeric values
  const numericValues = values
    .map(v => typeof v === 'string' ? parseFloat(v) : v)
    .filter(v => !isNaN(v));
  
  if (numericValues.length === 0) {
    return {
      bins: [],
      bin_edges: []
    };
  }
  
  // Calculate bin edges
  const min = ss.min(numericValues);
  const max = ss.max(numericValues);
  const range = max - min;
  const binWidth = range / bins;
  
  const binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * binWidth);
  
  // Count values in each bin
  const binCounts = Array(bins).fill(0);
  
  numericValues.forEach(value => {
    // Handle edge case for max value
    if (value === max) {
      binCounts[bins - 1]++;
      return;
    }
    
    const binIndex = Math.floor((value - min) / binWidth);
    if (binIndex >= 0 && binIndex < bins) {
      binCounts[binIndex]++;
    }
  });
  
  // Create histogram data
  const histogramData = binCounts.map((count, i) => ({
    bin_start: binEdges[i],
    bin_end: binEdges[i + 1],
    count,
    density: count / numericValues.length
  }));
  
  return {
    bins: histogramData,
    bin_edges: binEdges
  };
}

/**
 * Calculate summary statistics for all columns in a dataset
 * @param {Array} data Data array
 * @param {Object} dataTypes Object mapping column names to data types
 * @returns {Object} Object with statistics for each column
 */
function calculateDatasetStats(data, dataTypes) {
  if (!data || data.length === 0) {
    return {};
  }
  
  const columns = Object.keys(data[0]);
  const stats = {};
  
  columns.forEach(column => {
    const values = data.map(row => row[column]);
    const type = dataTypes[column] || 'unknown';
    
    if (type === 'numeric') {
      stats[column] = {
        type,
        basic: calculateBasicStats(values),
        advanced: calculateAdvancedStats(values),
        histogram: createHistogram(values)
      };
    } else if (type === 'temporal') {
      // Convert to timestamps for analysis
      const timestamps = values
        .map(v => v instanceof Date ? v : new Date(v))
        .filter(v => !isNaN(v))
        .map(v => v.getTime());
      
      stats[column] = {
        type,
        basic: calculateBasicStats(timestamps),
        time_range: {
          min: new Date(Math.min(...timestamps)).toISOString(),
          max: new Date(Math.max(...timestamps)).toISOString()
        }
      };
    } else {
      // Categorical
      stats[column] = {
        type,
        frequency: calculateFrequencyDistribution(values)
      };
    }
  });
  
  return stats;
}

module.exports = {
  calculateBasicStats,
  calculateAdvancedStats,
  calculateFrequencyDistribution,
  createHistogram,
  calculateDatasetStats
};
