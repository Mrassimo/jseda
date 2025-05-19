/**
 * Correlation analysis for EDA
 */

const ss = require('simple-statistics');

/**
 * Calculate Pearson correlation coefficient between two numeric arrays
 * @param {Array} xValues First array of values
 * @param {Array} yValues Second array of values
 * @returns {number} Correlation coefficient
 */
function calculatePearsonCorrelation(xValues, yValues) {
  if (!xValues || !yValues || xValues.length === 0 || yValues.length === 0) {
    return null;
  }
  
  if (xValues.length !== yValues.length) {
    throw new Error('Arrays must have the same length');
  }
  
  // Filter out pairs with missing values
  const pairs = xValues.map((x, i) => [x, yValues[i]])
    .filter(([x, y]) => 
      x !== null && y !== null && 
      x !== undefined && y !== undefined && 
      !isNaN(parseFloat(x)) && !isNaN(parseFloat(y))
    )
    .map(([x, y]) => [parseFloat(x), parseFloat(y)]);
  
  if (pairs.length < 3) {
    return null;
  }
  
  const xFiltered = pairs.map(([x, _]) => x);
  const yFiltered = pairs.map(([_, y]) => y);
  
  try {
    return ss.sampleCorrelation(xFiltered, yFiltered);
  } catch (error) {
    return null;
  }
}

/**
 * Calculate Spearman rank correlation
 * @param {Array} xValues First array of values
 * @param {Array} yValues Second array of values
 * @returns {number} Spearman correlation coefficient
 */
function calculateSpearmanCorrelation(xValues, yValues) {
  if (!xValues || !yValues || xValues.length === 0 || yValues.length === 0) {
    return null;
  }
  
  if (xValues.length !== yValues.length) {
    throw new Error('Arrays must have the same length');
  }
  
  // Filter out pairs with missing values
  const pairs = xValues.map((x, i) => [x, yValues[i]])
    .filter(([x, y]) => 
      x !== null && y !== null && 
      x !== undefined && y !== undefined && 
      !isNaN(parseFloat(x)) && !isNaN(parseFloat(y))
    )
    .map(([x, y]) => [parseFloat(x), parseFloat(y)]);
  
  if (pairs.length < 3) {
    return null;
  }
  
  // Convert to ranks
  const xRanked = rankValues(pairs.map(([x, _]) => x));
  const yRanked = rankValues(pairs.map(([_, y]) => y));
  
  // Calculate Pearson correlation on ranks
  return calculatePearsonCorrelation(xRanked, yRanked);
}

/**
 * Convert values to ranks
 * @param {Array} values Array of numeric values
 * @returns {Array} Array of ranks
 */
function rankValues(values) {
  // Create array of [value, index]
  const indexed = values.map((v, i) => [v, i]);
  
  // Sort by value
  indexed.sort((a, b) => a[0] - b[0]);
  
  // Assign ranks, handling ties
  const ranks = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    const value = indexed[i][0];
    const startIndex = i;
    
    // Find end of ties
    while (i < indexed.length && indexed[i][0] === value) {
      i++;
    }
    
    // Calculate average rank for ties
    const endIndex = i;
    const avgRank = (startIndex + endIndex - 1) / 2 + 1;
    
    // Assign average rank to all tied values
    for (let j = startIndex; j < endIndex; j++) {
      const originalIndex = indexed[j][1];
      ranks[originalIndex] = avgRank;
    }
  }
  
  return ranks;
}

/**
 * Calculate correlation matrix for numeric columns
 * @param {Array} data Data array
 * @param {Array} columns Array of numeric column names
 * @param {string} method Correlation method ('pearson' or 'spearman')
 * @returns {Object} Correlation matrix
 */
function calculateCorrelationMatrix(data, columns, method = 'pearson') {
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return {
      columns: [],
      matrix: []
    };
  }
  
  // Extract numeric columns
  const numericColumns = columns.filter(column => {
    const values = data.map(row => row[column])
      .filter(v => v !== null && v !== undefined)
      .map(v => parseFloat(v));
    
    const nonNaN = values.filter(v => !isNaN(v));
    return nonNaN.length >= 3;
  });
  
  // Create empty matrix
  const matrix = Array.from({ length: numericColumns.length }, () => 
    Array(numericColumns.length).fill(null)
  );
  
  // Fill matrix
  for (let i = 0; i < numericColumns.length; i++) {
    const col1 = numericColumns[i];
    const values1 = data.map(row => row[col1]);
    
    // Diagonal is always 1
    matrix[i][i] = 1;
    
    for (let j = i + 1; j < numericColumns.length; j++) {
      const col2 = numericColumns[j];
      const values2 = data.map(row => row[col2]);
      
      // Calculate correlation
      const correlation = method === 'spearman' 
        ? calculateSpearmanCorrelation(values1, values2)
        : calculatePearsonCorrelation(values1, values2);
      
      // Fill both sides of the matrix
      matrix[i][j] = correlation;
      matrix[j][i] = correlation;
    }
  }
  
  return {
    columns: numericColumns,
    matrix
  };
}

/**
 * Identify strongly correlated pairs of variables
 * @param {Object} correlationMatrix Correlation matrix from calculateCorrelationMatrix
 * @param {number} threshold Correlation threshold (absolute value)
 * @returns {Array} Array of correlated pairs
 */
function findCorrelatedPairs(correlationMatrix, threshold = 0.7) {
  const { columns, matrix } = correlationMatrix;
  const pairs = [];
  
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const correlation = matrix[i][j];
      
      if (correlation !== null && Math.abs(correlation) >= threshold) {
        pairs.push({
          column1: columns[i],
          column2: columns[j],
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

module.exports = {
  calculatePearsonCorrelation,
  calculateSpearmanCorrelation,
  calculateCorrelationMatrix,
  findCorrelatedPairs
};
