/**
 * Chart selector for EDA visualization
 */

const { 
  detectDataTypes, 
  countByType, 
  calculateCardinality, 
  detectDimensions,
  isPercentageData,
  isContinuousDistribution,
  detectOutliersIQR
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
        reason: 'Temporal data with numeric values',
        tooltip: {
          purpose: 'Shows how numeric values change over time',
          insights: 'Look for trends, seasonality, or unusual spikes',
          rationale: 'Line charts are ideal for showing changes in numeric values over time periods',
          background: 'Time series analysis helps identify patterns and make predictions'
        }
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
          reason: 'Categorical data with many categories and numeric values',
          tooltip: {
            purpose: 'Compares numeric values across many categories',
            insights: 'Look for highest/lowest categories and outliers',
            rationale: 'Horizontal bar charts work best with many categories as labels remain readable',
            background: 'Horizontal orientation provides more space for category names when there are many categories'
          }
        }
      };
    } else {
      return {
        type: 'bar',
        config: {
          categoryColumn,
          valueColumn: numericColumn,
          title: `${numericColumn} by ${categoryColumn}`,
          reason: 'Categorical data with few categories and numeric values',
          tooltip: {
            purpose: 'Compares numeric values across categories',
            insights: 'Look for patterns, outliers, or significant differences between categories',
            rationale: 'Bar charts are ideal for comparing discrete categories when there are few categories',
            background: 'Vertical bars work well with fewer categories and emphasize quantity comparison'
          }
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
            reason: 'Percentage data with few categories',
            tooltip: {
              purpose: 'Shows proportional contribution of each category to the whole',
              insights: 'Look for dominant categories and relative proportions',
              rationale: 'Pie charts work best with few categories (≤7) showing part-to-whole relationships',
              background: 'Effective for percentage data where values sum to 100% or close to it'
            }
          }
        };
      } else {
        return {
          type: 'treemap',
          config: {
            categoryColumn,
            valueColumn: numericColumn,
            title: `Distribution of ${numericColumn} by ${categoryColumn}`,
            reason: 'Percentage data with many categories',
            tooltip: {
              purpose: 'Shows proportional distribution across many categories',
              insights: 'Look for hierarchical patterns and dominant segments',
              rationale: 'Treemaps work better than pie charts when there are many categories',
              background: 'The size of each rectangle represents the proportion of the whole'
            }
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
          reason: 'Relationship between two numeric variables',
          tooltip: {
            purpose: 'Visualizes relationship between two numeric variables',
            insights: 'Look for correlations, clusters, or outliers',
            rationale: 'Scatter plots are ideal for showing how two variables relate to each other',
            background: 'Each point represents an observation with x and y coordinates'
          }
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
          reason: 'Relationship between three numeric variables',
          tooltip: {
            purpose: 'Displays relationships between three numeric variables simultaneously',
            insights: 'Look for patterns in all three dimensions',
            rationale: 'Bubble charts add a third dimension (bubble size) to a scatter plot',
            background: 'Useful when you need to visualize an additional numeric variable beyond x and y coordinates'
          }
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
          reason: 'Distribution of a continuous numeric variable',
          tooltip: {
            purpose: 'Shows the frequency distribution of a numeric variable',
            insights: 'Look for the shape of distribution, central tendency, and spread',
            rationale: 'Histograms are ideal for showing how data is distributed across ranges',
            background: 'Helps identify if data is normally distributed, skewed, or has multiple modes'
          }
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
        reason: 'Relationship between two categorical variables',
        tooltip: {
          purpose: 'Shows the frequency or intensity of combinations between two categorical variables',
          insights: 'Look for patterns, concentrations, or unusual combinations',
          rationale: 'Heatmaps effectively show the relationship between two categorical variables',
          background: 'Color intensity represents the frequency or value at each category intersection'
        }
      }
    };
  }
  
  // Default fallback
  return {
    type: 'table',
    config: {
      columns: Object.keys(data[0]),
      title: 'Data Table',
      reason: 'No specific chart type identified',
      tooltip: {
        purpose: 'Displays raw data in tabular format',
        insights: 'Examine actual values and look for patterns or outliers',
        rationale: 'Tables are used when no specific visualization type is better suited',
        background: 'Best for detailed inspection of individual data points and exact values'
      }
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
        reason: 'Temporal data with numeric values',
        tooltip: {
          purpose: 'Shows how a numeric value changes over time',
          insights: 'Look for trends, seasonality, cycles, or unusual events',
          rationale: 'Line charts effectively show changes and patterns over time periods',
          background: 'Temporal visualizations help identify when changes occur and their magnitude'
        }
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
          reason: 'Categorical data with many categories and numeric values',
          tooltip: {
            purpose: 'Compares numeric values across many categories',
            insights: 'Look for highest/lowest categories and ranges of values',
            rationale: 'Horizontal bar charts work best with many categories as labels remain readable',
            background: 'Category names are on the y-axis to provide more space for long labels'
          }
        }
      };
    } else {
      return {
        type: 'bar',
        config: {
          categoryColumn: xColumn,
          valueColumn: yColumn,
          title: `${yColumn} by ${xColumn}`,
          reason: 'Categorical data with few categories and numeric values',
          tooltip: {
            purpose: 'Compares numeric values across categories',
            insights: 'Look for patterns or significant differences between categories',
            rationale: 'Vertical bar charts work well with fewer categories',
            background: 'Effective for comparing quantities across distinct groups'
          }
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
          reason: 'Relationship between three numeric variables',
          tooltip: {
            purpose: 'Displays relationships between three numeric variables simultaneously',
            insights: 'Look for patterns, clusters, outliers, and correlations in multiple dimensions',
            rationale: 'Bubble charts extend scatter plots by adding a third dimension (size)',
            background: 'Each point represents one observation with three measurements'
          }
        }
      };
    } else {
      return {
        type: 'scatter',
        config: {
          xColumn,
          yColumn,
          title: `${yColumn} vs ${xColumn}`,
          reason: 'Relationship between two numeric variables',
          tooltip: {
            purpose: 'Visualizes relationship between two numeric variables',
            insights: 'Look for correlations, patterns, clusters, or outliers',
            rationale: 'Scatter plots best show relationships between continuous variables',
            background: 'The pattern of points can reveal correlation strength and direction'
          }
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
        reason: 'Relationship between two categorical variables',
        tooltip: {
          purpose: 'Shows the frequency or intensity of combinations between two categorical variables',
          insights: 'Look for patterns, concentrations, or unusual combinations',
          rationale: 'Heatmaps are ideal for showing relationships between categorical variables',
          background: 'Color intensity shows the strength or frequency of each combination'
        }
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
        reason: 'Distribution of numeric values across categories',
        tooltip: {
          purpose: 'Shows the distribution of numeric values within each category',
          insights: 'Look for differences in medians, spreads, and outliers between categories',
          rationale: 'Box plots show the statistical summary and distribution for each category',
          background: 'Each box shows median, quartiles, and outliers, making it easy to compare distributions'
        }
      }
    };
  }
  
  // Default fallback
  return {
    type: 'table',
    config: {
      columns: [xColumn, yColumn],
      title: 'Data Table',
      reason: 'No specific chart type identified for these columns',
      tooltip: {
        purpose: 'Displays the raw data in tabular format',
        insights: 'Examine actual values to better understand the data',
        rationale: 'Tables are useful when no specific visualization type is clearly better',
        background: 'Shows exact values when a graphical representation isn\'t optimal'
      }
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
  try {
    if (!data || data.length === 0) {
      return [];
    }
    
    // Use provided dataTypes or detect them
    const dataTypes = options.dataTypes && Object.keys(options.dataTypes).length > 0 ? 
      options.dataTypes : detectDataTypes(data);
    
    // Detect dimensions safely
    let dimensions;
    try {
      dimensions = detectDimensions(data);
    } catch (err) {
      console.error("Error detecting dimensions:", err);
      dimensions = {};
    }
    
    // Get column types safely
    const numericColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'numeric');
    const temporalColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'temporal' || dataTypes[col] === 'date');
    
    const recommendations = [];
    
    // Distribution of each numeric column
    numericColumns.forEach(column => {
      if (isContinuousDistribution(data, column)) {
        recommendations.push({
          type: 'histogram',
          priority: 'high',
          category: 'distributions', // Add category
          config: {
            valueColumn: column,
            title: `Distribution of ${column}`,
            reason: 'Understand the distribution of a numeric variable',
            category: 'distributions', // Add category in config for frontend access
            tooltip: {
              purpose: 'Shows the frequency distribution of a numeric variable',
              insights: 'Look for the shape of distribution, central tendency, and spread',
              rationale: 'Histograms are best for understanding how values are distributed',
              background: 'Helps identify normal distributions, skewness, outliers, and multimodal patterns'
            }
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
          category: 'time_series', // Add category
          config: {
            timeColumn: temporalColumns[0],
            valueColumns: [numCol],
            title: `${numCol} over Time`,
            reason: 'Analyze trends over time',
            category: 'time_series', // Add category in config for frontend access
            tooltip: {
              purpose: 'Shows how numeric values change over time',
              insights: 'Look for trends, seasonality, cycles, or anomalies',
              rationale: 'Line charts are optimal for visualizing temporal patterns',
              background: 'Time series analysis helps identify when changes occur and forecast future values'
            }
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
          category: 'correlations', // Add category
          config: {
            xColumn: col1,
            yColumn: col2,
            title: `${col2} vs ${col1}`,
            reason: 'Explore relationships between numeric variables',
            category: 'correlations', // Add category in config for frontend access
            tooltip: {
              purpose: 'Visualizes relationship between two numeric variables',
              insights: 'Look for correlations, clusters, patterns, and outliers',
              rationale: 'Scatter plots clearly show how two variables relate to each other',
              background: 'Point patterns reveal correlation strength, direction, and potential non-linear relationships'
            }
          }
        });
      });
      
      // Correlation matrix for all numeric variables
      if (numericColumns.length > 2) {
        recommendations.push({
          type: 'correlationMatrix',
          priority: 'high',
          category: 'correlations', // Add category
          config: {
            columns: numericColumns,
            title: 'Correlation Matrix',
            reason: 'Identify correlations between multiple numeric variables',
            category: 'correlations', // Add category in config for frontend access
            tooltip: {
              purpose: 'Shows correlation strength between all pairs of numeric variables',
              insights: 'Look for strong positive/negative correlations and variable clusters',
              rationale: 'Correlation matrices efficiently display relationships among many variables at once',
              background: 'Color intensity indicates correlation strength from -1 (negative) to +1 (positive)'
            }
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
          category: 'categorical_analysis', // Add category
          config: {
            categoryColumn: dim,
            valueColumn: numCol,
            title: `${numCol} by ${dim}`,
            reason: 'Compare numeric values across categories',
            category: 'categorical_analysis', // Add category in config for frontend access
            tooltip: {
              purpose: 'Compares a numeric measure across different categories',
              insights: 'Look for patterns, highest/lowest categories, and outliers',
              rationale: 'Bar charts effectively show comparisons across discrete categories',
              background: 'Bar length encodes the numeric value, making differences easy to perceive'
            }
          }
        });
      });
    });
    
    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

/**
 * Generate optimal visualizations based on data analysis and metadata
 * @param {Array} data Data array
 * @param {Object} metadata Dataset metadata (optional)
 * @param {Object} options Additional options
 * @returns {Array} Array of visualization specifications or error object
 */
function generateOptimalVisualizations(data, metadata = null, options = {}) {
  try {
    // Validate input data
    if (!data) {
      return {
        error: 'No data provided',
        errorType: 'MISSING_DATA',
        recoverable: false
      };
    }
    
    if (!Array.isArray(data)) {
      return {
        error: 'Data must be an array',
        errorType: 'INVALID_DATA_FORMAT',
        recoverable: false
      };
    }
    
    if (data.length === 0) {
      return {
        error: 'Dataset is empty',
        errorType: 'EMPTY_DATASET',
        recoverable: false
      };
    }
    
    // Validate data structure
    if (typeof data[0] !== 'object' || data[0] === null) {
      return {
        error: 'Invalid data structure: data items must be objects',
        errorType: 'INVALID_DATA_STRUCTURE',
        recoverable: false
      };
    }
    
    // Check minimum data requirements
    if (Object.keys(data[0]).length === 0) {
      return {
        error: 'Data has no columns',
        errorType: 'NO_COLUMNS',
        recoverable: false
      };
    }
    
    // Initialize visualization array
    const visualizations = [];
    
    // Try to detect data types safely
    let dataTypes, dimensions, numericColumns, categoricalColumns, temporalColumns, cardinality;
    
    try {
      dataTypes = metadata?.dataTypes || detectDataTypes(data);
      dimensions = metadata?.dimensions || detectDimensions(data);
      numericColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'numeric');
      categoricalColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'categorical');
      temporalColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'temporal');
      cardinality = metadata?.cardinality || calculateCardinality(data, dimensions);
      
      // Check if we have enough data for meaningful visualizations
      if (numericColumns.length === 0 && categoricalColumns.length === 0 && temporalColumns.length === 0) {
        return {
          error: 'No usable data columns found (need numeric, categorical, or temporal columns)',
          errorType: 'NO_USABLE_COLUMNS',
          recoverable: false,
          details: {
            detectedTypes: dataTypes
          }
        };
      }
    } catch (typeError) {
      console.error('Error in data type detection:', typeError);
      return {
        error: `Failed to analyze data types: ${typeError.message}`,
        errorType: 'TYPE_DETECTION_ERROR',
        recoverable: false,
        details: typeError.stack
      };
    }
    
    // Store warnings that don't prevent visualization but should be reported
    const warnings = [];
    
    // Check for potential data quality issues
    if (numericColumns.length > 0) {
      let hasInvalidNumericValues = false;
      for (const col of numericColumns) {
        const nullCount = data.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
        const nullPercentage = (nullCount / data.length) * 100;
        
        if (nullPercentage > 20) { // More than 20% null/missing values
          warnings.push({
            type: 'DATA_QUALITY',
            message: `Column "${col}" has ${nullPercentage.toFixed(1)}% missing values`,
            column: col,
            missingPercentage: nullPercentage
          });
        }
      }
    }
    
    // Track visualization generation errors
    const vizErrors = [];

  // 1. Start with overview visualizations
  // 1.1 Summary tables for small datasets
  if (data.length < 50) {
    visualizations.push({
      type: 'table',
      priority: 'high',
      category: 'overview', // Add category
      config: {
        columns: Object.keys(data[0]),
        title: 'Data Overview',
        reason: 'Small dataset can be viewed directly as a table',
        category: 'overview', // Also add to config for frontend access
        tooltip: {
          purpose: 'Displays raw data in tabular format for direct inspection',
          insights: 'Examine actual values and relationships between variables',
          rationale: 'Tables work well for small datasets where every data point matters',
          background: 'With fewer than 50 records, it's possible to view all data points directly'
        }
      }
    });
  }

  // 1.2 Distribution overview for numeric variables
  if (numericColumns.length > 0) {
    numericColumns.forEach(column => {
      // Extract numeric values
      const values = data
        .map(row => {
          const val = row[column];
          return typeof val === 'string' ? parseFloat(val) : val;
        })
        .filter(v => !isNaN(v));

      // Check for skewness in distribution
      let skewed = false;
      if (values.length > 20) {
        // Calculate simple skewness heuristic
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
        skewed = Math.abs(mean - median) > (Math.abs(mean) * 0.2); // Skewed if mean and median differ by >20%
      }

      // Detect outliers
      const outliersResult = detectOutliersIQR(values);
      const hasOutliers = outliersResult.outliers.length > (values.length * 0.05); // More than 5% outliers

      // Histogram for all numeric columns
      if (isContinuousDistribution(data, column)) {
        visualizations.push({
          type: 'histogram',
          priority: 'high',
          category: 'distributions', // Add category
          config: {
            valueColumn: column,
            title: `Distribution of ${column}`,
            reason: 'Key insight: distribution pattern of numeric variable',
            category: 'distributions', // Also add to config for frontend access
            bins: 20, // More bins for detailed analysis
            tooltip: {
              purpose: 'Shows frequency distribution of values for a numeric variable',
              insights: 'Look for the shape (normal, skewed, bimodal), central tendency, and spread',
              rationale: 'Histograms are essential for understanding how values are distributed',
              background: 'The shape of the histogram reveals important statistical properties of the data'
            }
          }
        });
      }

      // If skewed, suggest boxplot
      if (skewed || hasOutliers) {
        visualizations.push({
          type: 'boxplot',
          priority: 'high',
          category: 'distributions', // Add category
          config: {
            valueColumn: column,
            title: `Boxplot of ${column}`,
            reason: `${skewed ? 'Skewed distribution' : ''} ${hasOutliers ? 'Contains outliers' : ''}`,
            category: 'distributions', // Also add to config for frontend access
            tooltip: {
              purpose: 'Shows the statistical summary of a numeric variable's distribution',
              insights: `Look for ${skewed ? 'skewness direction' : ''} ${hasOutliers ? 'outlier values' : ''} and central tendency`,
              rationale: `Chosen because this variable has ${skewed ? 'a skewed distribution' : ''} ${(skewed && hasOutliers) ? 'and' : ''} ${hasOutliers ? 'significant outliers' : ''}`,
              background: 'Boxplots show median, quartiles, range, and outliers in a single visualization'
            }
          }
        });
      }
    });
  }

  // 2. Time-based visualizations
  if (temporalColumns.length > 0) {
    // For each time column, create line charts with most important numeric columns
    temporalColumns.forEach(timeCol => {
      // For time series, limit to top 3 most important numeric columns to avoid cluttering
      const topNumericColumns = numericColumns.slice(0, Math.min(3, numericColumns.length));
      
      if (topNumericColumns.length > 0) {
        visualizations.push({
          type: 'line',
          priority: 'high',
          category: 'time_series', // Add category
          config: {
            timeColumn: timeCol,
            valueColumns: topNumericColumns,
            title: `Time Series Analysis`,
            reason: 'Temporal patterns and trends analysis',
            category: 'time_series', // Also add to config for frontend access
            isTimeSeries: true,
            tooltip: {
              purpose: 'Shows how multiple numeric variables change over time',
              insights: 'Look for trends, seasonal patterns, correlations between variables, and unusual events',
              rationale: 'Line charts are optimal for visualizing multiple time series simultaneously',
              background: 'Temporal analysis helps identify when changes occur and how variables interact over time'
            }
          }
        });
        
        // Individual line charts for each numeric column if there are many
        if (numericColumns.length > 3) {
          numericColumns.slice(3).forEach(numCol => {
            visualizations.push({
              type: 'line',
              priority: 'medium',
              category: 'time_series', // Add category
              config: {
                timeColumn: timeCol,
                valueColumns: [numCol],
                title: `${numCol} over Time`,
                reason: 'Individual time series analysis',
                category: 'time_series', // Also add to config for frontend access
                isTimeSeries: true,
                tooltip: {
                  purpose: 'Shows how a specific variable changes over time',
                  insights: 'Look for trends, cycles, anomalies, and rate of change',
                  rationale: 'Dedicated chart provides clearer view of this variable's temporal patterns',
                  background: 'Isolated time series analysis helps focus on specific variable behavior'
                }
              }
            });
          });
        }
      }
    });
  }

  // 3. Correlation and relationship analysis
  if (numericColumns.length >= 2) {
    // Correlation matrix for a comprehensive overview
    visualizations.push({
      type: 'correlationMatrix',
      priority: 'high', 
      category: 'correlations', // Add category
      config: {
        columns: numericColumns,
        title: 'Correlation Matrix',
        reason: 'Identify relationships between variables',
        category: 'correlations', // Also add to config for frontend access
        tooltip: {
          purpose: 'Shows the strength and direction of relationships between all numeric variables',
          insights: 'Look for strong positive/negative correlations and clusters of related variables',
          rationale: 'Correlation matrices efficiently display all pairwise relationships at once',
          background: 'Color intensity represents correlation strength from -1 (negative) to +1 (positive)'
        }
      }
    });
    
    // Add scatter plots for highly correlated pairs (if we had that data)
    // For now, add top pairs based on column order
    const pairs = [];
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        pairs.push([numericColumns[i], numericColumns[j]]);
      }
    }
    
    // Limit to top pairs
    const topPairs = pairs.slice(0, Math.min(3, pairs.length));
    
    topPairs.forEach(([col1, col2]) => {
      visualizations.push({
        type: 'scatter',
        priority: 'medium',
        category: 'correlations', // Add category
        config: {
          xColumn: col1,
          yColumn: col2,
          title: `${col2} vs ${col1}`,
          reason: 'Explore relationship between variables',
          category: 'correlations', // Also add to config for frontend access
          tooltip: {
            purpose: 'Visualizes the relationship between two numeric variables',
            insights: 'Look for correlation patterns, clusters, outliers, and potential causality',
            rationale: 'Scatter plots reveal the exact nature of relationships between variables',
            background: 'Each point represents one observation with both measurements'
          }
        }
      });
    });
    
    // If we have a third numeric column, add a bubble chart
    if (numericColumns.length >= 3) {
      visualizations.push({
        type: 'bubble',
        priority: 'medium',
        category: 'correlations', // Add category
        config: {
          xColumn: numericColumns[0],
          yColumn: numericColumns[1],
          sizeColumn: numericColumns[2],
          title: `${numericColumns[1]} vs ${numericColumns[0]} (size: ${numericColumns[2]})`,
          reason: '3D relationship visualization',
          category: 'correlations', // Also add to config for frontend access
          tooltip: {
            purpose: 'Displays relationships between three numeric variables simultaneously',
            insights: 'Look for patterns across all three dimensions and complex relationships',
            rationale: 'Bubble charts add a third dimension (size) to reveal additional patterns',
            background: 'Useful when three variables may interact or have combined effects'
          }
        }
      });
    }
  }

  // 4. Categorical analysis
  if (categoricalColumns.length > 0) {
    // For each categorical column
    categoricalColumns.forEach(catCol => {
      // Count frequencies
      const frequencies = {};
      data.forEach(row => {
        const val = row[catCol];
        if (val !== null && val !== undefined && val !== '') {
          frequencies[val] = (frequencies[val] || 0) + 1;
        }
      });
      
      // Check cardinality for visualization type
      const uniqueValues = Object.keys(frequencies);
      
      // If numeric columns exist, generate bar charts
      if (numericColumns.length > 0) {
        // Choose the most important numeric column for the bar chart
        const numCol = numericColumns[0];
        
        if (uniqueValues.length <= 10) {
          // Bar chart for few categories
          visualizations.push({
            type: 'bar',
            priority: 'high',
            category: 'categorical_analysis', // Add category
            config: {
              categoryColumn: catCol,
              valueColumn: numCol,
              title: `${numCol} by ${catCol}`,
              reason: 'Categorical comparison',
              category: 'categorical_analysis', // Also add to config for frontend access
              tooltip: {
                purpose: 'Compares numeric values across different categories',
                insights: 'Look for highest/lowest categories, patterns, and outliers',
                rationale: 'Bar charts work well with fewer categories (≤10) for clear comparison',
                background: 'Vertical orientation emphasizes value comparison between categories'
              }
            }
          });
        } else {
          // Horizontal bar for many categories (easier to read)
          visualizations.push({
            type: 'horizontalBar',
            priority: 'high',
            category: 'categorical_analysis', // Add category
            config: {
              categoryColumn: catCol,
              valueColumn: numCol,
              title: `${numCol} by ${catCol}`,
              reason: 'Categorical comparison with many categories',
              category: 'categorical_analysis', // Also add to config for frontend access
              tooltip: {
                purpose: 'Compares numeric values across many categories',
                insights: 'Look for patterns, outliers, and distribution across categories',
                rationale: 'Horizontal bars work better when there are many categories',
                background: 'Horizontal orientation provides more space for category labels'
              }
            }
          });
        }
      }
      
      // Pie/donut chart for categorical distribution
      if (uniqueValues.length <= 7) {
        visualizations.push({
          type: 'pie',
          priority: 'medium',
          category: 'categorical_analysis', // Add category
          config: {
            categoryColumn: catCol,
            valueColumn: 'count', // This would be calculated during visualization
            title: `Distribution of ${catCol}`,
            reason: 'Part-to-whole relationship',
            category: 'categorical_analysis', // Also add to config for frontend access
            tooltip: {
              purpose: 'Shows the proportional distribution across categories',
              insights: 'Look for dominant categories and relative proportions',
              rationale: 'Pie charts work well with few categories (≤7) showing proportions',
              background: 'Each slice represents a category's proportion of the whole'
            }
          }
        });
      } else if (uniqueValues.length > 7 && uniqueValues.length <= 20) {
        // Treemap for more categories
        visualizations.push({
          type: 'treemap',
          priority: 'medium',
          category: 'categorical_analysis', // Add category
          config: {
            categoryColumn: catCol,
            valueColumn: 'count', // This would be calculated during visualization
            title: `Distribution of ${catCol}`,
            reason: 'Part-to-whole relationship with many categories',
            category: 'categorical_analysis', // Also add to config for frontend access
            tooltip: {
              purpose: 'Shows proportional distribution across many categories',
              insights: 'Look for dominant categories and hierarchical patterns',
              rationale: 'Treemaps work better than pie charts when there are many categories',
              background: 'Rectangle size represents proportion, making it easier to compare many categories'
            }
          }
        });
      }
    });
    
    // 5. Cross-categorical analysis - heatmaps
    if (categoricalColumns.length >= 2) {
      // Take top two categorical columns
      const catCol1 = categoricalColumns[0];
      const catCol2 = categoricalColumns[1];
      
      if (cardinality[catCol1] <= 20 && cardinality[catCol2] <= 20) {
        visualizations.push({
          type: 'heatmap',
          priority: 'medium',
          category: 'categorical_analysis', // Add category
          config: {
            rowColumn: catCol1,
            columnColumn: catCol2,
            title: `Relationship between ${catCol1} and ${catCol2}`,
            reason: 'Two-way categorical relationship analysis',
            category: 'categorical_analysis', // Also add to config for frontend access
            tooltip: {
              purpose: 'Shows frequency or strength of relationships between categorical variables',
              insights: 'Look for patterns, clusters, and unusual combinations',
              rationale: 'Heatmaps effectively show relationships between two categorical variables',
              background: 'Color intensity indicates frequency or strength of each combination'
            }
          }
        });
      }
    }
  }

  // 6. Special case: multivariate outlier visualization
  if (numericColumns.length >= 2) {
    visualizations.push({
      type: 'scatter',
      priority: 'low',
      category: 'anomaly_detection', // Add category
      config: {
        xColumn: numericColumns[0],
        yColumn: numericColumns[1],
        highlightOutliers: true, // This would be a custom feature in the frontend
        title: `Outlier Detection`,
        reason: 'Identify multivariate outliers',
        category: 'anomaly_detection', // Also add to config for frontend access
        tooltip: {
          purpose: 'Identifies observations that are unusual in multiple dimensions',
          insights: 'Look for points that are far from the main cluster of data',
          rationale: 'Scatter plots with outlier highlighting help identify unusual observations',
          background: 'Multivariate outliers may not be visible when looking at single variables'
        }
      }
    });
  }

  // 7. Special analytics visualizations based on domain
  // Add domain-specific visualizations here if needed

  // 8. Sort by priority and limit
  try {
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    visualizations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    // Return top visualizations (limit to prevent overwhelming)
    const limit = options.limit || 10;
    
    // Check if we have any visualizations
    if (visualizations.length === 0) {
      if (vizErrors.length > 0) {
        // Return with errors if we have them
        return {
          error: 'Failed to generate any valid visualizations',
          errorType: 'NO_VISUALIZATIONS_GENERATED',
          recoverable: false,
          details: {
            errors: vizErrors,
            warnings: warnings
          }
        };
      } else {
        // No errors but still no visualizations
        return {
          error: 'No suitable visualizations could be generated for this dataset',
          errorType: 'NO_SUITABLE_VISUALIZATIONS',
          recoverable: false,
          details: {
            numericColumns,
            categoricalColumns,
            temporalColumns,
            warnings
          }
        };
      }
    }
    
    // Return with warnings if we have them
    const result = visualizations.slice(0, limit);
    if (warnings.length > 0) {
      return {
        visualizations: result,
        warnings: warnings,
        errorCount: vizErrors.length,
        totalGenerated: visualizations.length
      };
    }
    
    return result;
  } catch (err) {
    console.error('Error in final visualization processing:', err);
    return {
      error: `Failed to process visualizations: ${err.message}`,
      errorType: 'VISUALIZATION_PROCESSING_ERROR',
      recoverable: false,
      details: err.stack,
      partialResults: visualizations.length > 0 ? visualizations.slice(0, Math.min(visualizations.length, 5)) : null
    };
  }
}

module.exports = {
  selectChartType,
  selectRenderingStrategy,
  recommendVisualizations,
  generateOptimalVisualizations
};