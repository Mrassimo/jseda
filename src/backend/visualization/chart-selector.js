/**
 * Chart selector for EDA visualization
 */

const { 
  detectDataTypes, 
  countByType, 
  calculateCardinality, 
  detectDimensions,
  isPercentageData,
  isContinuousDistribution
} = require('../data/data-utils');

/**
 * Select appropriate chart type based on data characteristics
 * @param {Array} data Data array
 * @param {Object} options Options for chart selection
 * @returns {Object} Selected chart type and configuration
 */
function selectChartType(data, options = {}) {
  if (!data || data.length === 0) {
    return { type: 'table', reason: 'No data available' };
  }
  
  // Detect data types and dimensions
  const dataTypes = options.dataTypes || detectDataTypes(data);
  const dimensions = options.dimensions || detectDimensions(data);
  
  // Count column types
  const numericCount = countByType(dataTypes, 'numeric');
  const categoricalCount = countByType(dataTypes, 'categorical');
  const temporalCount = countByType(dataTypes, 'temporal');
  
  // Get cardinality of categorical columns
  const cardinality = calculateCardinality(data, dimensions);
  
  // If specific columns are provided, use them for selection
  if (options.xColumn && options.yColumn) {
    return selectChartForColumns(
      data, 
      options.xColumn, 
      options.yColumn, 
      dataTypes,
      cardinality,
      options
    );
  }
  
  // Time series data
  if (temporalCount === 1 && numericCount >= 1) {
    const timeColumn = Object.keys(dataTypes).find(col => dataTypes[col] === 'temporal');
    const numericColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'numeric');
    
    return {
      type: 'line',
      config: {
        timeColumn,
        valueColumns: numericColumns,
        title: `Time Series of ${numericColumns.join(', ')}`,
        reason: 'Temporal data with numeric values'
      }
    };
  }
  
  // Categorical comparison with a single numeric value
  if (categoricalCount === 1 && numericCount === 1) {
    const categoryColumn = dimensions[0];
    const numericColumn = Object.keys(dataTypes).find(col => dataTypes[col] === 'numeric');
    
    if (cardinality[categoryColumn] > 10) {
      return {
        type: 'horizontalBar',
        config: {
          categoryColumn,
          valueColumn: numericColumn,
          title: `${numericColumn} by ${categoryColumn}`,
          reason: 'Categorical data with many categories and numeric values'
        }
      };
    } else {
      return {
        type: 'bar',
        config: {
          categoryColumn,
          valueColumn: numericColumn,
          title: `${numericColumn} by ${categoryColumn}`,
          reason: 'Categorical data with few categories and numeric values'
        }
      };
    }
  }
  
  // Part-to-whole relationships
  if (categoricalCount === 1 && numericCount === 1) {
    const categoryColumn = dimensions[0];
    const numericColumn = Object.keys(dataTypes).find(col => dataTypes[col] === 'numeric');
    
    if (isPercentageData(data, numericColumn)) {
      if (cardinality[categoryColumn] <= 7) {
        return {
          type: 'pie',
          config: {
            categoryColumn,
            valueColumn: numericColumn,
            title: `Distribution of ${numericColumn} by ${categoryColumn}`,
            reason: 'Percentage data with few categories'
          }
        };
      } else {
        return {
          type: 'treemap',
          config: {
            categoryColumn,
            valueColumn: numericColumn,
            title: `Distribution of ${numericColumn} by ${categoryColumn}`,
            reason: 'Percentage data with many categories'
          }
        };
      }
    }
  }
  
  // Relationships between numeric variables
  if (numericCount >= 2) {
    const numericColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'numeric');
    
    if (numericCount === 2) {
      return {
        type: 'scatter',
        config: {
          xColumn: numericColumns[0],
          yColumn: numericColumns[1],
          title: `${numericColumns[1]} vs ${numericColumns[0]}`,
          reason: 'Relationship between two numeric variables'
        }
      };
    } else if (numericCount >= 3) {
      return {
        type: 'bubble',
        config: {
          xColumn: numericColumns[0],
          yColumn: numericColumns[1],
          sizeColumn: numericColumns[2],
          title: `${numericColumns[1]} vs ${numericColumns[0]} (size: ${numericColumns[2]})`,
          reason: 'Relationship between three numeric variables'
        }
      };
    }
  }
  
  // Distribution of a single numeric variable
  if (numericCount === 1) {
    const numericColumn = Object.keys(dataTypes).find(col => dataTypes[col] === 'numeric');
    
    if (isContinuousDistribution(data, numericColumn)) {
      return {
        type: 'histogram',
        config: {
          valueColumn: numericColumn,
          title: `Distribution of ${numericColumn}`,
          reason: 'Distribution of a continuous numeric variable'
        }
      };
    }
  }
  
  // Two categorical variables
  if (categoricalCount >= 2) {
    const catColumns = dimensions.slice(0, 2);
    
    return {
      type: 'heatmap',
      config: {
        rowColumn: catColumns[0],
        columnColumn: catColumns[1],
        title: `Relationship between ${catColumns[0]} and ${catColumns[1]}`,
        reason: 'Relationship between two categorical variables'
      }
    };
  }
  
  // Default fallback
  return {
    type: 'table',
    config: {
      columns: Object.keys(data[0]),
      title: 'Data Table',
      reason: 'No specific chart type identified'
    }
  };
}

/**
 * Select chart type based on specific columns
 * @param {Array} data Data array
 * @param {string} xColumn X-axis column
 * @param {string} yColumn Y-axis column
 * @param {Object} dataTypes Data types
 * @param {Object} cardinality Cardinality of categorical columns
 * @param {Object} options Additional options
 * @returns {Object} Selected chart type and configuration
 */
function selectChartForColumns(data, xColumn, yColumn, dataTypes, cardinality, options = {}) {
  const xType = dataTypes[xColumn];
  const yType = dataTypes[yColumn];
  
  // Temporal x, numeric y
  if (xType === 'temporal' && yType === 'numeric') {
    return {
      type: 'line',
      config: {
        timeColumn: xColumn,
        valueColumns: [yColumn],
        title: `${yColumn} over Time`,
        reason: 'Temporal data with numeric values'
      }
    };
  }
  
  // Categorical x, numeric y
  if (xType === 'categorical' && yType === 'numeric') {
    if (cardinality[xColumn] > 10) {
      return {
        type: 'horizontalBar',
        config: {
          categoryColumn: xColumn,
          valueColumn: yColumn,
          title: `${yColumn} by ${xColumn}`,
          reason: 'Categorical data with many categories and numeric values'
        }
      };
    } else {
      return {
        type: 'bar',
        config: {
          categoryColumn: xColumn,
          valueColumn: yColumn,
          title: `${yColumn} by ${xColumn}`,
          reason: 'Categorical data with few categories and numeric values'
        }
      };
    }
  }
  
  // Numeric x, numeric y
  if (xType === 'numeric' && yType === 'numeric') {
    if (options.sizeColumn && dataTypes[options.sizeColumn] === 'numeric') {
      return {
        type: 'bubble',
        config: {
          xColumn,
          yColumn,
          sizeColumn: options.sizeColumn,
          title: `${yColumn} vs ${xColumn} (size: ${options.sizeColumn})`,
          reason: 'Relationship between three numeric variables'
        }
      };
    } else {
      return {
        type: 'scatter',
        config: {
          xColumn,
          yColumn,
          title: `${yColumn} vs ${xColumn}`,
          reason: 'Relationship between two numeric variables'
        }
      };
    }
  }
  
  // Categorical x, categorical y
  if (xType === 'categorical' && yType === 'categorical') {
    return {
      type: 'heatmap',
      config: {
        rowColumn: xColumn,
        columnColumn: yColumn,
        title: `Relationship between ${xColumn} and ${yColumn}`,
        reason: 'Relationship between two categorical variables'
      }
    };
  }
  
  // Numeric x, categorical y
  if (xType === 'numeric' && yType === 'categorical') {
    return {
      type: 'boxplot',
      config: {
        categoryColumn: yColumn,
        valueColumn: xColumn,
        title: `Distribution of ${xColumn} by ${yColumn}`,
        reason: 'Distribution of numeric values across categories'
      }
    };
  }
  
  // Default fallback
  return {
    type: 'table',
    config: {
      columns: [xColumn, yColumn],
      title: 'Data Table',
      reason: 'No specific chart type identified for these columns'
    }
  };
}

/**
 * Select appropriate rendering strategy based on data size and chart type
 * @param {number} dataSize Size of the dataset
 * @param {string} chartType Type of chart
 * @returns {string} 'svg' or 'canvas'
 */
function selectRenderingStrategy(dataSize, chartType) {
  // SVG is better for smaller datasets and more interactive needs
  // Canvas is better for larger datasets
  if (dataSize > 5000 || 
      (chartType === 'scatter' && dataSize > 1000) ||
      (chartType === 'line' && dataSize > 2000)) {
    return 'canvas';
  } else {
    return 'svg';
  }
}

/**
 * Recommend a set of visualizations for a dataset
 * @param {Array} data Data array
 * @param {Object} options Options for recommendations
 * @returns {Array} Array of recommended visualizations
 */
function recommendVisualizations(data, options = {}) {
  if (!data || data.length === 0) {
    return [];
  }
  
  const dataTypes = detectDataTypes(data);
  const dimensions = detectDimensions(data);
  const numericColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'numeric');
  const temporalColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'temporal');
  
  const recommendations = [];
  
  // Distribution of each numeric column
  numericColumns.forEach(column => {
    if (isContinuousDistribution(data, column)) {
      recommendations.push({
        type: 'histogram',
        priority: 'high',
        config: {
          valueColumn: column,
          title: `Distribution of ${column}`,
          reason: 'Understand the distribution of a numeric variable'
        }
      });
    }
  });
  
  // Time series for each numeric column with temporal data
  if (temporalColumns.length > 0) {
    numericColumns.forEach(numCol => {
      recommendations.push({
        type: 'line',
        priority: 'high',
        config: {
          timeColumn: temporalColumns[0],
          valueColumns: [numCol],
          title: `${numCol} over Time`,
          reason: 'Analyze trends over time'
        }
      });
    });
  }
  
  // Correlations between numeric variables
  if (numericColumns.length >= 2) {
    // Pairwise scatter plots (for top pairs)
    const pairs = [];
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        pairs.push([numericColumns[i], numericColumns[j]]);
      }
    }
    
    // Limit to top 5 pairs
    const topPairs = pairs.slice(0, 5);
    
    topPairs.forEach(([col1, col2]) => {
      recommendations.push({
        type: 'scatter',
        priority: 'medium',
        config: {
          xColumn: col1,
          yColumn: col2,
          title: `${col2} vs ${col1}`,
          reason: 'Explore relationships between numeric variables'
        }
      });
    });
    
    // Correlation matrix for all numeric variables
    if (numericColumns.length > 2) {
      recommendations.push({
        type: 'correlationMatrix',
        priority: 'high',
        config: {
          columns: numericColumns,
          title: 'Correlation Matrix',
          reason: 'Identify correlations between multiple numeric variables'
        }
      });
    }
  }
  
  // Categorical breakdowns
  dimensions.forEach(dim => {
    numericColumns.forEach(numCol => {
      recommendations.push({
        type: 'bar',
        priority: 'medium',
        config: {
          categoryColumn: dim,
          valueColumn: numCol,
          title: `${numCol} by ${dim}`,
          reason: 'Compare numeric values across categories'
        }
      });
    });
  });
  
  return recommendations;
}

module.exports = {
  selectChartType,
  selectRenderingStrategy,
  recommendVisualizations
};
