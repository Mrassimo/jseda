/**
 * Chart generator for EDA visualization
 */

/**
 * Generate chart specifications for front-end rendering
 * @param {string} chartType Type of chart
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification for rendering
 */
function generateChartSpec(chartType, data, config = {}) {
  try {
    // Validate inputs
    if (!chartType) {
      return {
        type: 'error',
        error: 'Chart type is required',
        errorType: 'MISSING_CHART_TYPE',
        recoverable: false
      };
    }
    
    if (!data) {
      return {
        type: 'error',
        error: 'No data provided',
        errorType: 'MISSING_DATA',
        recoverable: false
      };
    }
    
    if (!Array.isArray(data)) {
      return {
        type: 'error',
        error: 'Data must be an array',
        errorType: 'INVALID_DATA_FORMAT',
        recoverable: false
      };
    }
    
    if (data.length === 0) {
      return {
        type: 'table',
        error: 'Empty dataset',
        errorType: 'EMPTY_DATASET',
        recoverable: true,
        data: [],
        config: {
          title: config.title || 'Empty Dataset',
          message: 'The dataset contains no rows. Please upload a dataset with data.'
        }
      };
    }
    
    // Check for valid data object structure
    if (typeof data[0] !== 'object' || data[0] === null) {
      return {
        type: 'error',
        error: 'Invalid data format: data items must be objects',
        errorType: 'INVALID_DATA_ITEMS',
        recoverable: false
      };
    }
    
    // Generate chart spec based on type
    switch (chartType) {
      case 'bar':
        return generateBarChartSpec(data, config);
      case 'horizontalBar':
        return generateHorizontalBarChartSpec(data, config);
      case 'line':
        return generateLineChartSpec(data, config);
      case 'scatter':
        return generateScatterChartSpec(data, config);
      case 'bubble':
        return generateBubbleChartSpec(data, config);
      case 'pie':
        return generatePieChartSpec(data, config);
      case 'histogram':
        return generateHistogramSpec(data, config);
      case 'heatmap':
        return generateHeatmapSpec(data, config);
      case 'boxplot':
        return generateBoxplotSpec(data, config);
      case 'correlationMatrix':
        return generateCorrelationMatrixSpec(data, config);
      case 'treemap':
        return generateTreemapSpec(data, config);
      case 'table':
        return generateTableSpec(data, config);
      default:
        return {
          type: 'table',
          error: `Unsupported chart type: ${chartType}`,
          errorType: 'UNSUPPORTED_CHART_TYPE',
          recoverable: true,
          data: data,
          config: {
            title: config.title || 'Data Table (Fallback)',
            message: `The requested chart type "${chartType}" is not supported. Showing data as table instead.`
          }
        };
    }
  } catch (err) {
    console.error('Error generating chart spec:', err);
    return {
      type: 'error',
      error: `Failed to generate chart: ${err.message}`,
      errorType: 'CHART_GENERATION_ERROR',
      recoverable: false,
      details: err.stack
    };
  }
}

/**
 * Generate bar chart specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateBarChartSpec(data, config) {
  try {
    const { categoryColumn, valueColumn, title } = config;
    
    // Validate required configuration
    if (!categoryColumn || !valueColumn) {
      return { 
        type: 'error', 
        error: 'Missing required configuration for bar chart', 
        errorType: 'MISSING_REQUIRED_CONFIG',
        recoverable: false,
        details: {
          required: ['categoryColumn', 'valueColumn'],
          provided: Object.keys(config)
        }
      };
    }
    
    // Check if columns exist in data
    const sampleRow = data[0];
    if (!sampleRow.hasOwnProperty(categoryColumn)) {
      return {
        type: 'error',
        error: `Category column "${categoryColumn}" not found in data`,
        errorType: 'COLUMN_NOT_FOUND',
        recoverable: false,
        details: {
          missingColumn: categoryColumn,
          availableColumns: Object.keys(sampleRow)
        }
      };
    }
    
    if (!sampleRow.hasOwnProperty(valueColumn)) {
      return {
        type: 'error',
        error: `Value column "${valueColumn}" not found in data`,
        errorType: 'COLUMN_NOT_FOUND',
        recoverable: false,
        details: {
          missingColumn: valueColumn,
          availableColumns: Object.keys(sampleRow)
        }
      };
    }
    
    // Check if we have valid categorical data
    const categories = new Set();
    let hasInvalidValues = false;
    
    for (const row of data) {
      const categoryValue = row[categoryColumn];
      if (categoryValue !== null && categoryValue !== undefined && categoryValue !== '') {
        categories.add(categoryValue);
      } else {
        hasInvalidValues = true;
      }
      
      // Check if value column has numeric data
      const value = row[valueColumn];
      if (value !== null && value !== undefined && isNaN(parseFloat(value)) && typeof value !== 'number') {
        hasInvalidValues = true;
      }
    }
    
    // If no categories found
    if (categories.size === 0) {
      return {
        type: 'error',
        error: `No valid category values found in column "${categoryColumn}"`,
        errorType: 'NO_CATEGORICAL_DATA',
        recoverable: false
      };
    }
    
    // Warn about invalid values but continue
    let warning = null;
    if (hasInvalidValues) {
      warning = 'Some rows contain invalid or missing values that will be excluded';
    }
    
    // Aggregate data if needed
    let chartData = data;
    try {
      if (data.length > 25) {
        // Group by category and average values
        chartData = aggregateByCategory(data, categoryColumn, valueColumn);
        
        // Limit to top categories
        chartData = limitCategories(chartData, 25);
      }
      
      // Make sure we have data after filtering
      if (chartData.length === 0) {
        return {
          type: 'error',
          error: 'No valid data points after filtering',
          errorType: 'NO_VALID_DATA',
          recoverable: false
        };
      }
    } catch (aggError) {
      return {
        type: 'error',
        error: `Error processing chart data: ${aggError.message}`,
        errorType: 'DATA_PROCESSING_ERROR',
        recoverable: false,
        details: aggError.stack
      };
    }
    
    return {
      type: 'bar',
      data: chartData,
      config: {
        title: title || `${valueColumn} by ${categoryColumn}`,
        xAxisColumn: categoryColumn,
        yAxisColumn: valueColumn,
        xAxisLabel: categoryColumn,
        yAxisLabel: valueColumn
      },
      warning
    };
  } catch (err) {
    console.error('Error generating bar chart spec:', err);
    return {
      type: 'error',
      error: `Failed to generate bar chart: ${err.message}`,
      errorType: 'CHART_GENERATION_ERROR',
      recoverable: false,
      details: err.stack
    };
  }
}

/**
 * Generate horizontal bar chart specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateHorizontalBarChartSpec(data, config) {
  const { categoryColumn, valueColumn, title } = config;
  
  if (!categoryColumn || !valueColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Aggregate data if needed
  let chartData = data;
  if (data.length > 30) {
    // Group by category and average values
    chartData = aggregateByCategory(data, categoryColumn, valueColumn);
    
    // Limit to top categories
    chartData = limitCategories(chartData, 30);
  }
  
  return {
    type: 'horizontalBar',
    data: chartData,
    config: {
      title: title || `${valueColumn} by ${categoryColumn}`,
      xAxisColumn: valueColumn,
      yAxisColumn: categoryColumn,
      xAxisLabel: valueColumn,
      yAxisLabel: categoryColumn
    }
  };
}

/**
 * Generate line chart specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateLineChartSpec(data, config) {
  const { timeColumn, valueColumns, title } = config;
  
  if (!timeColumn || !valueColumns || valueColumns.length === 0) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Sort by time
  const sortedData = [...data].sort((a, b) => {
    const aTime = new Date(a[timeColumn]).getTime();
    const bTime = new Date(b[timeColumn]).getTime();
    return aTime - bTime;
  });
  
  // Downsample if needed
  let chartData = sortedData;
  if (sortedData.length > 1000) {
    chartData = downsampleTimeSeries(sortedData, timeColumn, valueColumns[0], 1000);
  }
  
  return {
    type: 'line',
    data: chartData,
    config: {
      title: title || `${valueColumns.join(', ')} over Time`,
      xAxisColumn: timeColumn,
      yAxisColumns: valueColumns,
      xAxisLabel: timeColumn,
      yAxisLabel: valueColumns.length === 1 ? valueColumns[0] : 'Values',
      isTimeSeries: true
    }
  };
}

/**
 * Generate scatter chart specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateScatterChartSpec(data, config) {
  const { xColumn, yColumn, title } = config;
  
  if (!xColumn || !yColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Downsample if needed
  let chartData = data;
  if (data.length > 2000) {
    chartData = randomSample(data, 2000);
  }
  
  return {
    type: 'scatter',
    data: chartData,
    config: {
      title: title || `${yColumn} vs ${xColumn}`,
      xAxisColumn: xColumn,
      yAxisColumn: yColumn,
      xAxisLabel: xColumn,
      yAxisLabel: yColumn
    }
  };
}

/**
 * Generate bubble chart specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateBubbleChartSpec(data, config) {
  const { xColumn, yColumn, sizeColumn, title } = config;
  
  if (!xColumn || !yColumn || !sizeColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Downsample if needed
  let chartData = data;
  if (data.length > 1000) {
    chartData = randomSample(data, 1000);
  }
  
  return {
    type: 'bubble',
    data: chartData,
    config: {
      title: title || `${yColumn} vs ${xColumn} (size: ${sizeColumn})`,
      xAxisColumn: xColumn,
      yAxisColumn: yColumn,
      sizeColumn: sizeColumn,
      xAxisLabel: xColumn,
      yAxisLabel: yColumn
    }
  };
}

/**
 * Generate pie chart specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generatePieChartSpec(data, config) {
  const { categoryColumn, valueColumn, title } = config;
  
  if (!categoryColumn || !valueColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Aggregate data
  let chartData = aggregateByCategory(data, categoryColumn, valueColumn);
  
  // Limit to top categories
  if (chartData.length > 10) {
    chartData = limitCategories(chartData, 7);
  }
  
  return {
    type: 'pie',
    data: chartData,
    config: {
      title: title || `Distribution of ${valueColumn} by ${categoryColumn}`,
      categoryColumn: categoryColumn,
      valueColumn: valueColumn
    }
  };
}

/**
 * Generate histogram specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateHistogramSpec(data, config) {
  const { valueColumn, title, bins = 20 } = config;
  
  if (!valueColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Extract numeric values
  const values = data
    .map(row => {
      const val = row[valueColumn];
      return typeof val === 'string' ? parseFloat(val) : val;
    })
    .filter(v => !isNaN(v));
  
  if (values.length === 0) {
    return { type: 'none', error: 'No numeric values available' };
  }
  
  // Calculate bin edges
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const binWidth = range / bins;
  
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
  const histogramData = binCounts.map((count, i) => ({
    bin: `${binEdges[i].toFixed(2)} - ${binEdges[i + 1].toFixed(2)}`,
    binStart: binEdges[i],
    binEnd: binEdges[i + 1],
    count,
    frequency: count
  }));
  
  return {
    type: 'histogram',
    data: histogramData,
    config: {
      title: title || `Distribution of ${valueColumn}`,
      valueColumn: 'frequency',
      categoryColumn: 'bin',
      xAxisLabel: valueColumn,
      yAxisLabel: 'Frequency'
    }
  };
}

/**
 * Generate heatmap specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateHeatmapSpec(data, config) {
  const { rowColumn, columnColumn, title } = config;
  
  if (!rowColumn || !columnColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Get unique values for rows and columns
  const rowValues = [...new Set(data.map(d => d[rowColumn]))];
  const columnValues = [...new Set(data.map(d => d[columnColumn]))];
  
  // Limit rows and columns if too many
  const limitedRowValues = rowValues.length > 20 ? rowValues.slice(0, 20) : rowValues;
  const limitedColumnValues = columnValues.length > 20 ? columnValues.slice(0, 20) : columnValues;
  
  // Create count matrix
  const countMatrix = [];
  
  limitedRowValues.forEach(row => {
    const rowData = [];
    
    limitedColumnValues.forEach(col => {
      const count = data.filter(d => 
        d[rowColumn] === row && d[columnColumn] === col
      ).length;
      
      rowData.push(count);
    });
    
    countMatrix.push(rowData);
  });
  
  // Convert to heatmap data format
  const heatmapData = [];
  
  limitedRowValues.forEach((row, rowIndex) => {
    limitedColumnValues.forEach((col, colIndex) => {
      heatmapData.push({
        [rowColumn]: row,
        [columnColumn]: col,
        value: countMatrix[rowIndex][colIndex]
      });
    });
  });
  
  return {
    type: 'heatmap',
    data: heatmapData,
    config: {
      title: title || `Relationship between ${rowColumn} and ${columnColumn}`,
      rowColumn,
      columnColumn,
      valueColumn: 'value',
      rowLabels: limitedRowValues,
      columnLabels: limitedColumnValues
    }
  };
}

/**
 * Generate boxplot specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateBoxplotSpec(data, config) {
  const { categoryColumn, valueColumn, title } = config;
  
  if (!categoryColumn || !valueColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Get unique categories
  const categories = [...new Set(data.map(d => d[categoryColumn]))];
  
  // Limit categories if too many
  const limitedCategories = categories.length > 15 ? categories.slice(0, 15) : categories;
  
  // Calculate stats for each category
  const boxplotData = limitedCategories.map(category => {
    const categoryValues = data
      .filter(d => d[categoryColumn] === category)
      .map(d => {
        const val = d[valueColumn];
        return typeof val === 'string' ? parseFloat(val) : val;
      })
      .filter(v => !isNaN(v));
    
    if (categoryValues.length === 0) {
      return {
        category,
        min: null,
        q1: null,
        median: null,
        q3: null,
        max: null,
        outliers: []
      };
    }
    
    // Sort values
    categoryValues.sort((a, b) => a - b);
    
    // Calculate quartiles
    const q1Idx = Math.floor(categoryValues.length * 0.25);
    const medianIdx = Math.floor(categoryValues.length * 0.5);
    const q3Idx = Math.floor(categoryValues.length * 0.75);
    
    const q1 = categoryValues[q1Idx];
    const median = categoryValues[medianIdx];
    const q3 = categoryValues[q3Idx];
    
    // Calculate IQR and whiskers
    const iqr = q3 - q1;
    const lowerWhisker = Math.max(categoryValues[0], q1 - 1.5 * iqr);
    const upperWhisker = Math.min(categoryValues[categoryValues.length - 1], q3 + 1.5 * iqr);
    
    // Find outliers
    const outliers = categoryValues.filter(v => v < lowerWhisker || v > upperWhisker);
    
    return {
      category,
      min: lowerWhisker,
      q1,
      median,
      q3,
      max: upperWhisker,
      outliers
    };
  });
  
  return {
    type: 'boxplot',
    data: boxplotData,
    config: {
      title: title || `Distribution of ${valueColumn} by ${categoryColumn}`,
      categoryColumn: 'category',
      xAxisLabel: categoryColumn,
      yAxisLabel: valueColumn
    }
  };
}

/**
 * Generate correlation matrix specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateCorrelationMatrixSpec(data, config) {
  const { columns, title } = config;
  
  if (!columns || columns.length === 0) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Calculate correlation matrix
  const correlationData = [];
  
  for (let i = 0; i < columns.length; i++) {
    for (let j = 0; j < columns.length; j++) {
      const col1 = columns[i];
      const col2 = columns[j];
      
      // Extract numeric values
      const values1 = data
        .map(row => {
          const val = row[col1];
          return typeof val === 'string' ? parseFloat(val) : val;
        })
        .filter(v => !isNaN(v));
      
      const values2 = data
        .map(row => {
          const val = row[col2];
          return typeof val === 'string' ? parseFloat(val) : val;
        })
        .filter(v => !isNaN(v));
      
      // Calculate correlation
      let correlation = 0;
      
      if (col1 === col2) {
        correlation = 1; // Perfect correlation on diagonal
      } else if (values1.length > 2 && values2.length > 2) {
        correlation = calculateCorrelation(values1, values2);
      }
      
      correlationData.push({
        x: col1,
        y: col2,
        correlation
      });
    }
  }
  
  return {
    type: 'correlationMatrix',
    data: correlationData,
    config: {
      title: title || 'Correlation Matrix',
      columns
    }
  };
}

/**
 * Generate treemap specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateTreemapSpec(data, config) {
  const { categoryColumn, valueColumn, title } = config;
  
  if (!categoryColumn || !valueColumn) {
    return { type: 'none', error: 'Missing required configuration' };
  }
  
  // Aggregate data
  let chartData = aggregateByCategory(data, categoryColumn, valueColumn);
  
  // Limit to top categories
  if (chartData.length > 20) {
    chartData = limitCategories(chartData, 20);
  }
  
  // Ensure all values are positive
  chartData = chartData.map(d => ({
    ...d,
    [valueColumn]: Math.max(0, d[valueColumn])
  }));
  
  return {
    type: 'treemap',
    data: chartData,
    config: {
      title: title || `Distribution of ${valueColumn} by ${categoryColumn}`,
      categoryColumn,
      valueColumn
    }
  };
}

/**
 * Generate table specification
 * @param {Array} data Data array
 * @param {Object} config Chart configuration
 * @returns {Object} Chart specification
 */
function generateTableSpec(data, config) {
  const { columns, title } = config;
  
  const tableColumns = columns || Object.keys(data[0]);
  
  // Limit data if too many rows
  let tableData = data;
  if (data.length > 100) {
    tableData = data.slice(0, 100);
  }
  
  return {
    type: 'table',
    data: tableData,
    config: {
      title: title || 'Data Table',
      columns: tableColumns
    }
  };
}

// Helper functions

/**
 * Aggregate data by category
 * @param {Array} data Data array
 * @param {string} categoryColumn Category column
 * @param {string} valueColumn Value column
 * @returns {Array} Aggregated data
 */
function aggregateByCategory(data, categoryColumn, valueColumn) {
  const categories = {};
  
  data.forEach(row => {
    const category = row[categoryColumn];
    const value = parseFloat(row[valueColumn]);
    
    if (!isNaN(value)) {
      if (!categories[category]) {
        categories[category] = {
          sum: 0,
          count: 0
        };
      }
      
      categories[category].sum += value;
      categories[category].count++;
    }
  });
  
  return Object.entries(categories).map(([category, stats]) => ({
    [categoryColumn]: category,
    [valueColumn]: stats.sum / stats.count
  }));
}

/**
 * Limit data to top categories by value
 * @param {Array} data Aggregated data
 * @param {number} limit Maximum number of categories
 * @returns {Array} Limited data
 */
function limitCategories(data, limit) {
  if (data.length <= limit) {
    return data;
  }
  
  // Sort by value (descending)
  const sorted = [...data].sort((a, b) => {
    const valueColumn = Object.keys(a).find(key => key !== Object.keys(a)[0]);
    return b[valueColumn] - a[valueColumn];
  });
  
  return sorted.slice(0, limit);
}

/**
 * Calculate Pearson correlation between two arrays
 * @param {Array} xValues X values
 * @param {Array} yValues Y values
 * @returns {number} Correlation coefficient
 */
function calculateCorrelation(xValues, yValues) {
  // Create pairs of values
  const pairs = [];
  for (let i = 0; i < Math.min(xValues.length, yValues.length); i++) {
    pairs.push([xValues[i], yValues[i]]);
  }
  
  // Calculate means
  const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
  
  // Calculate sums
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  
  pairs.forEach(([x, y]) => {
    const xDiff = x - xMean;
    const yDiff = y - yMean;
    
    sumXY += xDiff * yDiff;
    sumX2 += xDiff * xDiff;
    sumY2 += yDiff * yDiff;
  });
  
  // Calculate correlation
  if (sumX2 === 0 || sumY2 === 0) {
    return 0;
  }
  
  return sumXY / Math.sqrt(sumX2 * sumY2);
}

/**
 * Downsample time series data
 * @param {Array} data Sorted time series data
 * @param {string} timeColumn Time column
 * @param {string} valueColumn Value column
 * @param {number} maxPoints Maximum number of points
 * @returns {Array} Downsampled data
 */
function downsampleTimeSeries(data, timeColumn, valueColumn, maxPoints = 1000) {
  if (data.length <= maxPoints) {
    return data;
  }
  
  // Simple sampling approach - pick evenly spaced points
  const step = Math.max(1, Math.floor(data.length / maxPoints));
  const result = [];
  
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  
  // Always include the last point
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }
  
  return result;
}

/**
 * Random sampling from an array
 * @param {Array} data Data array
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Sampled data
 */
function randomSample(data, sampleSize) {
  if (data.length <= sampleSize) {
    return [...data];
  }
  
  const result = [];
  const indices = new Set();
  
  while (indices.size < sampleSize) {
    const index = Math.floor(Math.random() * data.length);
    if (!indices.has(index)) {
      indices.add(index);
      result.push(data[index]);
    }
  }
  
  return result;
}

module.exports = {
  generateChartSpec
};
