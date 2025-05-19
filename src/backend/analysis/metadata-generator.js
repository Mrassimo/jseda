/**
 * Metadata generator for LLM consumption
 */

const ss = require('simple-statistics');
const jStat = require('jstat');
const { detectOutliersIQR } = require('../data/data-utils');

/**
 * Generate comprehensive metadata for a dataset
 * @param {Array} dataset Data array
 * @param {Object} options Options for metadata generation
 * @returns {Object} Metadata object
 */
function generateDatasetMetadata(dataset, options = {}) {
  // Base metadata structure
  const metadata = {
    schema_version: "1.0",
    dataset_name: options.name || "Unnamed Dataset",
    creation_date: new Date().toISOString(),
    record_count: dataset.length,
    feature_count: Object.keys(dataset[0] || {}).length,
    features: []
  };
  
  // Process each feature/column
  if (dataset.length > 0) {
    const columns = Object.keys(dataset[0]);
    
    metadata.features = columns.map(column => {
      const values = dataset.map(row => row[column])
        .filter(v => v !== null && v !== undefined);
      
      const numericValues = values
        .map(v => typeof v === 'string' ? parseFloat(v) : v)
        .filter(v => !isNaN(v));
      
      // Determine data type
      let dataType = 'unknown';
      
      if (numericValues.length > values.length * 0.7) {
        dataType = 'numeric';
      } else if (isDateColumn(values)) {
        dataType = 'temporal';
      } else {
        dataType = 'categorical';
      }
      
      // Generate appropriate statistics based on data type
      if (dataType === 'numeric') {
        return generateNumericFeatureMetadata(column, values, numericValues);
      } else if (dataType === 'temporal') {
        return generateTemporalFeatureMetadata(column, values);
      } else {
        return generateCategoricalFeatureMetadata(column, values);
      }
    });
    
    // Calculate correlation matrix
    if (metadata.features.filter(f => f.type === 'numeric').length > 1) {
      metadata.correlations = calculateCorrelationMatrix(dataset, metadata.features);
    }
    
    // Add summary insights
    metadata.insights = generateInsights(dataset, metadata.features, metadata.correlations);
  }
  
  return metadata;
}

/**
 * Generate metadata for numeric features
 * @param {string} column Column name
 * @param {Array} values All values
 * @param {Array} numericValues Numeric values only
 * @returns {Object} Feature metadata
 */
function generateNumericFeatureMetadata(column, values, numericValues) {
  // Basic statistics
  const stats = {
    count: values.length,
    valid_count: numericValues.length,
    missing: values.length - numericValues.length,
    missing_percentage: ((values.length - numericValues.length) / values.length * 100).toFixed(2),
    min: ss.min(numericValues),
    max: ss.max(numericValues),
    range: ss.max(numericValues) - ss.min(numericValues),
    mean: ss.mean(numericValues),
    median: ss.median(numericValues),
    variance: numericValues.length > 1 ? ss.variance(numericValues) : 0,
    standard_deviation: numericValues.length > 1 ? ss.standardDeviation(numericValues) : 0,
    skewness: numericValues.length > 3 ? jStat.skewness(numericValues) : null,
    kurtosis: numericValues.length > 3 ? jStat.kurtosis(numericValues) : null,
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
    appears_normal: stats.skewness !== null && Math.abs(stats.skewness) < 0.5 && Math.abs(stats.kurtosis) < 0.5,
    shape: stats.skewness > 0.5 ? "right-skewed" : 
           stats.skewness < -0.5 ? "left-skewed" : "symmetric",
    histogram_bins: generateHistogramBins(numericValues, 10)
  };
  
  return {
    name: column,
    type: 'numeric',
    statistics: stats
  };
}

/**
 * Generate metadata for temporal features
 * @param {string} column Column name
 * @param {Array} values All values
 * @returns {Object} Feature metadata
 */
function generateTemporalFeatureMetadata(column, values) {
  // Convert to Date objects
  const dateValues = values
    .map(v => v instanceof Date ? v : new Date(v))
    .filter(v => !isNaN(v.getTime()));
  
  // Extract timestamps for analysis
  const timestamps = dateValues.map(d => d.getTime());
  
  if (timestamps.length === 0) {
    return {
      name: column,
      type: 'temporal',
      statistics: {
        count: values.length,
        valid_count: 0,
        missing: values.length,
        missing_percentage: '100.00'
      }
    };
  }
  
  // Calculate statistics
  const stats = {
    count: values.length,
    valid_count: timestamps.length,
    missing: values.length - timestamps.length,
    missing_percentage: ((values.length - timestamps.length) / values.length * 100).toFixed(2),
    min_date: new Date(Math.min(...timestamps)).toISOString(),
    max_date: new Date(Math.max(...timestamps)).toISOString(),
    range_days: (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24),
    patterns: detectDatePatterns(dateValues)
  };
  
  return {
    name: column,
    type: 'temporal',
    statistics: stats
  };
}

/**
 * Generate metadata for categorical features
 * @param {string} column Column name
 * @param {Array} values All values
 * @returns {Object} Feature metadata
 */
function generateCategoricalFeatureMetadata(column, values) {
  // Filter out null values
  const filteredValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  // Count frequencies
  const valueCounts = {};
  filteredValues.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  // Sort by frequency (descending)
  const sortedCounts = Object.entries(valueCounts)
    .sort((a, b) => b[1] - a[1]);
  
  // Calculate statistics
  const stats = {
    count: values.length,
    valid_count: filteredValues.length,
    missing: values.length - filteredValues.length,
    missing_percentage: ((values.length - filteredValues.length) / values.length * 100).toFixed(2),
    unique_values: Object.keys(valueCounts).length,
    most_frequent: sortedCounts.length > 0 ? {
      value: sortedCounts[0][0],
      count: sortedCounts[0][1],
      percentage: ((sortedCounts[0][1] / filteredValues.length) * 100).toFixed(2)
    } : null,
    least_frequent: sortedCounts.length > 0 ? {
      value: sortedCounts[sortedCounts.length - 1][0],
      count: sortedCounts[sortedCounts.length - 1][1],
      percentage: ((sortedCounts[sortedCounts.length - 1][1] / filteredValues.length) * 100).toFixed(2)
    } : null,
    value_counts: {}
  };
  
  // Limit value counts to top N
  const maxCategories = 20;
  const topCategories = sortedCounts.slice(0, maxCategories);
  
  topCategories.forEach(([value, count]) => {
    stats.value_counts[value] = {
      count,
      percentage: ((count / filteredValues.length) * 100).toFixed(2)
    };
  });
  
  // Add "Other" category if needed
  if (sortedCounts.length > maxCategories) {
    const otherCount = sortedCounts
      .slice(maxCategories)
      .reduce((sum, [_, count]) => sum + count, 0);
    
    stats.value_counts['__other__'] = {
      count: otherCount,
      percentage: ((otherCount / filteredValues.length) * 100).toFixed(2)
    };
  }
  
  return {
    name: column,
    type: 'categorical',
    statistics: stats
  };
}

/**
 * Check if a column contains date values
 * @param {Array} values Column values
 * @returns {boolean} True if the column contains dates
 */
function isDateColumn(values) {
  // Sample the first 100 non-empty values
  const sample = values
    .filter(v => v !== null && v !== undefined && v !== '')
    .slice(0, 100);
  
  if (sample.length === 0) {
    return false;
  }
  
  // Check if most values can be parsed as dates
  const dateChecks = sample.map(v => {
    if (v instanceof Date) return true;
    
    // Try to parse as date
    const date = new Date(v);
    return !isNaN(date) && 
           // Filter out pure numbers that can be parsed as dates
           (String(v).includes('-') || 
            String(v).includes('/') || 
            String(v).includes(':'));
  });
  
  // If more than 80% of values are dates, consider it a date column
  return dateChecks.filter(Boolean).length / dateChecks.length > 0.8;
}

/**
 * Detect patterns in date values
 * @param {Array} dates Array of Date objects
 * @returns {Object} Date patterns
 */
function detectDatePatterns(dates) {
  if (dates.length < 2) {
    return { frequency: 'unknown' };
  }
  
  // Sort dates
  const sortedDates = [...dates].sort((a, b) => a - b);
  
  // Calculate time differences
  const timeDiffs = [];
  for (let i = 1; i < sortedDates.length; i++) {
    timeDiffs.push(sortedDates[i] - sortedDates[i - 1]);
  }
  
  // Calculate median time difference
  const medianDiff = ss.median(timeDiffs);
  
  // Determine frequency pattern
  let frequency = 'irregular';
  
  // Convert to days
  const daysDiff = medianDiff / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0.042) { // Less than ~1 hour
    frequency = 'sub-hourly';
  } else if (daysDiff < 0.125) { // ~3 hours
    frequency = 'hourly';
  } else if (daysDiff < 0.75) { // Less than 18 hours
    frequency = 'daily';
  } else if (daysDiff < 2.5) { // ~2 days
    frequency = 'daily';
  } else if (daysDiff < 9) { // ~Weekly
    frequency = 'weekly';
  } else if (daysDiff < 15) { // ~Bi-weekly
    frequency = 'bi-weekly';
  } else if (daysDiff < 45) { // ~Monthly
    frequency = 'monthly';
  } else if (daysDiff < 135) { // ~Quarterly
    frequency = 'quarterly';
  } else if (daysDiff < 270) { // ~6 months
    frequency = 'semi-annual';
  } else if (daysDiff < 450) { // ~Yearly
    frequency = 'annual';
  }
  
  // Get day of week distribution
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
  sortedDates.forEach(date => {
    dayOfWeekCounts[date.getDay()]++;
  });
  
  const dayOfWeekDistribution = {
    sunday: (dayOfWeekCounts[0] / sortedDates.length * 100).toFixed(2),
    monday: (dayOfWeekCounts[1] / sortedDates.length * 100).toFixed(2),
    tuesday: (dayOfWeekCounts[2] / sortedDates.length * 100).toFixed(2),
    wednesday: (dayOfWeekCounts[3] / sortedDates.length * 100).toFixed(2),
    thursday: (dayOfWeekCounts[4] / sortedDates.length * 100).toFixed(2),
    friday: (dayOfWeekCounts[5] / sortedDates.length * 100).toFixed(2),
    saturday: (dayOfWeekCounts[6] / sortedDates.length * 100).toFixed(2)
  };
  
  // Get month distribution
  const monthCounts = Array(12).fill(0); // Jan to Dec
  sortedDates.forEach(date => {
    monthCounts[date.getMonth()]++;
  });
  
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const monthDistribution = {};
  monthNames.forEach((month, i) => {
    monthDistribution[month] = (monthCounts[i] / sortedDates.length * 100).toFixed(2);
  });
  
  return {
    frequency,
    median_days_between_dates: daysDiff.toFixed(2),
    day_of_week_distribution: dayOfWeekDistribution,
    month_distribution: monthDistribution
  };
}

/**
 * Generate histogram bins for numeric data
 * @param {Array} values Numeric values
 * @param {number} bins Number of bins
 * @returns {Array} Histogram bins
 */
function generateHistogramBins(values, bins = 10) {
  if (values.length === 0) {
    return [];
  }
  
  const min = ss.min(values);
  const max = ss.max(values);
  const range = max - min;
  const binWidth = range / bins;
  
  // Create bin edges
  const binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * binWidth);
  
  // Count values in each bin
  const binCounts = Array(bins).fill(0);
  
  values.forEach(value => {
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
  return binCounts.map((count, i) => ({
    bin_start: binEdges[i],
    bin_end: binEdges[i + 1],
    count,
    percentage: (count / values.length * 100).toFixed(2)
  }));
}

/**
 * Calculate correlation matrix for numeric features
 * @param {Array} dataset Data array
 * @param {Array} features Feature metadata
 * @returns {Object} Correlation matrix
 */
function calculateCorrelationMatrix(dataset, features) {
  // Get numeric features
  const numericFeatures = features.filter(f => f.type === 'numeric');
  
  if (numericFeatures.length < 2) {
    return null;
  }
  
  const columns = numericFeatures.map(f => f.name);
  const matrix = {};
  
  // Initialize matrix
  columns.forEach(col1 => {
    matrix[col1] = {};
    columns.forEach(col2 => {
      matrix[col1][col2] = col1 === col2 ? 1 : null; // Diagonal is always 1
    });
  });
  
  // Calculate correlations
  for (let i = 0; i < columns.length; i++) {
    const col1 = columns[i];
    
    for (let j = i + 1; j < columns.length; j++) {
      const col2 = columns[j];
      
      // Extract values
      const pairs = dataset.map(row => [
        typeof row[col1] === 'string' ? parseFloat(row[col1]) : row[col1],
        typeof row[col2] === 'string' ? parseFloat(row[col2]) : row[col2]
      ]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
      
      if (pairs.length > 2) {
        // Calculate Pearson correlation
        const correlation = calculatePearsonCorrelation(
          pairs.map(p => p[0]),
          pairs.map(p => p[1])
        );
        
        // Set correlation in matrix
        matrix[col1][col2] = correlation;
        matrix[col2][col1] = correlation; // Symmetric
      }
    }
  }
  
  // Find highly correlated pairs
  const correlatedPairs = findCorrelatedPairs(matrix, columns, 0.7);
  
  return {
    matrix,
    correlated_pairs: correlatedPairs
  };
}

/**
 * Calculate Pearson correlation coefficient
 * @param {Array} xValues X values
 * @param {Array} yValues Y values
 * @returns {number} Correlation coefficient
 */
function calculatePearsonCorrelation(xValues, yValues) {
  // Calculate means
  const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
  
  // Calculate covariance and variances
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  
  for (let i = 0; i < xValues.length; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }
  
  // Guard against division by zero
  if (xVariance === 0 || yVariance === 0) {
    return 0;
  }
  
  // Calculate correlation
  return covariance / Math.sqrt(xVariance * yVariance);
}

/**
 * Find highly correlated pairs of features
 * @param {Object} matrix Correlation matrix
 * @param {Array} columns Column names
 * @param {number} threshold Correlation threshold
 * @returns {Array} Correlated pairs
 */
function findCorrelatedPairs(matrix, columns, threshold = 0.7) {
  const pairs = [];
  
  for (let i = 0; i < columns.length; i++) {
    const col1 = columns[i];
    
    for (let j = i + 1; j < columns.length; j++) {
      const col2 = columns[j];
      const correlation = matrix[col1][col2];
      
      if (correlation !== null && Math.abs(correlation) >= threshold) {
        pairs.push({
          feature1: col1,
          feature2: col2,
          correlation: correlation,
          strength: correlation > 0 ? 'positive' : 'negative',
          magnitude: Math.abs(correlation) > 0.9 ? 'very strong' :
                     Math.abs(correlation) > 0.7 ? 'strong' :
                     'moderate'
        });
      }
    }
  }
  
  // Sort by absolute correlation (descending)
  pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  
  return pairs;
}

/**
 * Generate insights from dataset metadata
 * @param {Array} dataset Data array
 * @param {Array} features Feature metadata
 * @param {Object} correlations Correlation matrix
 * @returns {Object} Insights
 */
function generateInsights(dataset, features, correlations) {
  const insights = {
    summary: [],
    quality_issues: [],
    distribution_insights: [],
    correlation_insights: [],
    recommendations: []
  };
  
  // Dataset summary
  insights.summary.push(`Dataset contains ${dataset.length} records with ${features.length} features.`);
  
  const numericFeatures = features.filter(f => f.type === 'numeric');
  const categoricalFeatures = features.filter(f => f.type === 'categorical');
  const temporalFeatures = features.filter(f => f.type === 'temporal');
  
  insights.summary.push(`Dataset has ${numericFeatures.length} numeric, ${categoricalFeatures.length} categorical, and ${temporalFeatures.length} temporal features.`);
  
  // Quality issues
  features.forEach(feature => {
    const stats = feature.statistics;
    
    // Missing values
    if (stats.missing > 0) {
      const severity = stats.missing_percentage > 20 ? 'high' :
                       stats.missing_percentage > 5 ? 'medium' : 'low';
      
      insights.quality_issues.push({
        feature: feature.name,
        issue: 'missing_values',
        description: `Feature "${feature.name}" has ${stats.missing} missing values (${stats.missing_percentage}%).`,
        severity
      });
    }
    
    // Outliers in numeric features
    if (feature.type === 'numeric' && stats.outliers && stats.outliers.count > 0) {
      const severity = stats.outliers.percentage > 10 ? 'high' :
                       stats.outliers.percentage > 2 ? 'medium' : 'low';
      
      insights.quality_issues.push({
        feature: feature.name,
        issue: 'outliers',
        description: `Feature "${feature.name}" has ${stats.outliers.count} outliers (${stats.outliers.percentage}%).`,
        severity
      });
    }
    
    // Highly skewed distributions
    if (feature.type === 'numeric' && stats.skewness !== null && Math.abs(stats.skewness) > 1) {
      insights.distribution_insights.push({
        feature: feature.name,
        insight: 'skewed_distribution',
        description: `Feature "${feature.name}" has a ${stats.skewness > 0 ? 'right-skewed' : 'left-skewed'} distribution (skewness: ${stats.skewness.toFixed(2)}).`,
        recommendation: stats.skewness > 1 ? 'Consider log transformation.' : ''
      });
    }
    
    // Low variance in numeric features
    if (feature.type === 'numeric' && stats.variance !== null && stats.variance < 0.01) {
      insights.distribution_insights.push({
        feature: feature.name,
        insight: 'low_variance',
        description: `Feature "${feature.name}" has very low variance (${stats.variance.toFixed(6)}).`,
        recommendation: 'This feature may not be useful for prediction.'
      });
    }
    
    // High cardinality in categorical features
    if (feature.type === 'categorical' && stats.unique_values > 100) {
      insights.distribution_insights.push({
        feature: feature.name,
        insight: 'high_cardinality',
        description: `Categorical feature "${feature.name}" has ${stats.unique_values} unique values.`,
        recommendation: 'Consider grouping rare categories.'
      });
    }
    
    // Imbalanced categories
    if (feature.type === 'categorical' && stats.most_frequent && stats.most_frequent.percentage > 80) {
      insights.distribution_insights.push({
        feature: feature.name,
        insight: 'imbalanced_categories',
        description: `Feature "${feature.name}" is dominated by "${stats.most_frequent.value}" (${stats.most_frequent.percentage}%).`,
        recommendation: 'Consider balancing techniques for modeling.'
      });
    }
  });
  
  // Correlation insights
  if (correlations && correlations.correlated_pairs && correlations.correlated_pairs.length > 0) {
    // Strong correlations
    correlations.correlated_pairs.forEach(pair => {
      if (Math.abs(pair.correlation) > 0.9) {
        insights.correlation_insights.push({
          features: [pair.feature1, pair.feature2],
          insight: 'strong_correlation',
          description: `Features "${pair.feature1}" and "${pair.feature2}" are ${pair.strength}ly correlated (${pair.correlation.toFixed(2)}).`,
          recommendation: 'Consider removing one of these features.'
        });
      } else if (Math.abs(pair.correlation) > 0.7) {
        insights.correlation_insights.push({
          features: [pair.feature1, pair.feature2],
          insight: 'moderate_correlation',
          description: `Features "${pair.feature1}" and "${pair.feature2}" are ${pair.strength}ly correlated (${pair.correlation.toFixed(2)}).`,
          recommendation: 'Watch for multicollinearity in modeling.'
        });
      }
    });
  }
  
  // Generate recommendations
  if (insights.quality_issues.filter(i => i.severity === 'high').length > 0) {
    insights.recommendations.push({
      type: 'data_cleaning',
      description: 'Address high-severity data quality issues.',
      priority: 'high'
    });
  }
  
  if (insights.correlation_insights.filter(i => i.insight === 'strong_correlation').length > 0) {
    insights.recommendations.push({
      type: 'feature_selection',
      description: 'Consider removing highly correlated features.',
      priority: 'medium'
    });
  }
  
  if (insights.distribution_insights.filter(i => i.insight === 'skewed_distribution').length > 0) {
    insights.recommendations.push({
      type: 'transformation',
      description: 'Apply transformations to skewed numeric features.',
      priority: 'medium'
    });
  }
  
  if (insights.distribution_insights.filter(i => i.insight === 'high_cardinality').length > 0) {
    insights.recommendations.push({
      type: 'feature_engineering',
      description: 'Group rare categories in high-cardinality features.',
      priority: 'medium'
    });
  }
  
  return insights;
}

module.exports = {
  generateDatasetMetadata
};
