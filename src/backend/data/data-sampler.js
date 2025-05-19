/**
 * Data sampling utilities
 */

/**
 * Create a random sample of data
 * @param {Array} data Original data array
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Sampled data array
 */
function randomSample(data, sampleSize) {
  if (!data || data.length === 0) return [];
  if (data.length <= sampleSize) return [...data];
  
  // Create a copy to avoid modifying the original
  const result = [];
  const indices = new Set();
  
  // Generate random indices
  while (indices.size < sampleSize) {
    const index = Math.floor(Math.random() * data.length);
    if (!indices.has(index)) {
      indices.add(index);
      result.push(data[index]);
    }
  }
  
  return result;
}

/**
 * Reservoir sampling for streaming data
 * @param {Array} data Data stream
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Sampled data array
 */
function reservoirSample(data, sampleSize) {
  if (!data || data.length === 0) return [];
  if (data.length <= sampleSize) return [...data];
  
  // Initialize reservoir with first k elements
  const reservoir = data.slice(0, sampleSize);
  
  // Replace elements with decreasing probability
  for (let i = sampleSize; i < data.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < sampleSize) {
      reservoir[j] = data[i];
    }
  }
  
  return reservoir;
}

/**
 * Stratified sampling based on a categorical column
 * @param {Array} data Original data array
 * @param {string} stratifyColumn Column to stratify by
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Stratified sample array
 */
function stratifiedSample(data, stratifyColumn, sampleSize) {
  if (!data || data.length === 0 || !stratifyColumn) return [];
  if (data.length <= sampleSize) return [...data];
  
  // Group data by the stratification column
  const strata = {};
  
  data.forEach(item => {
    const stratumValue = item[stratifyColumn];
    if (!strata[stratumValue]) {
      strata[stratumValue] = [];
    }
    strata[stratumValue].push(item);
  });
  
  // Calculate proportional sample sizes
  const totalCount = data.length;
  const result = [];
  
  Object.keys(strata).forEach(stratum => {
    const stratumCount = strata[stratum].length;
    const stratumProportion = stratumCount / totalCount;
    const stratumSampleSize = Math.max(1, Math.round(sampleSize * stratumProportion));
    
    // Sample from each stratum
    const stratumSample = randomSample(strata[stratum], stratumSampleSize);
    result.push(...stratumSample);
  });
  
  // If we have too many samples, trim randomly
  if (result.length > sampleSize) {
    return randomSample(result, sampleSize);
  }
  
  return result;
}

/**
 * Sample with adaptive strategy based on data characteristics
 * @param {Array} data Original data array
 * @param {Object} dataTypes Object mapping column names to data types
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Sampled data array
 */
function adaptiveSample(data, dataTypes, sampleSize) {
  if (!data || data.length === 0) return [];
  if (data.length <= sampleSize) return [...data];
  
  // Check for categorical columns
  const categoricalColumns = Object.keys(dataTypes)
    .filter(col => dataTypes[col] === 'categorical');
  
  // If we have categorical columns, use stratified sampling on the one with most categories
  if (categoricalColumns.length > 0) {
    // Select column with most categories
    const categoryCountMap = {};
    
    categoricalColumns.forEach(col => {
      const uniqueValues = new Set(data.map(item => item[col]));
      categoryCountMap[col] = uniqueValues.size;
    });
    
    // Find column with most categories
    const stratifyColumn = Object.keys(categoryCountMap)
      .sort((a, b) => categoryCountMap[b] - categoryCountMap[a])[0];
    
    return stratifiedSample(data, stratifyColumn, sampleSize);
  }
  
  // Otherwise use reservoir sampling
  return reservoirSample(data, sampleSize);
}

module.exports = {
  randomSample,
  reservoirSample,
  stratifiedSample,
  adaptiveSample
};