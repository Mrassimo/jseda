/**
 * Data sampling strategies for EDA
 */

/**
 * Perform reservoir sampling on a stream
 * @param {Readable} stream Data stream
 * @param {number} sampleSize Desired sample size
 * @returns {Promise<Array>} Sampled data
 */
function reservoirSample(stream, sampleSize) {
  const reservoir = new Array(sampleSize);
  let count = 0;
  
  return new Promise((resolve, reject) => {
    stream
      .on('data', (item) => {
        count++;
        if (count <= sampleSize) {
          // Fill reservoir until it's full
          reservoir[count-1] = item;
        } else {
          // Randomly replace elements with decreasing probability
          const r = Math.floor(Math.random() * count);
          if (r < sampleSize) {
            reservoir[r] = item;
          }
        }
      })
      .on('end', () => {
        resolve(reservoir.slice(0, Math.min(count, sampleSize)));
      })
      .on('error', reject);
  });
}

/**
 * Random sampling from an array
 * @param {Array} data Data array
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Sampled data
 */
function randomSample(data, sampleSize) {
  if (data.length <= sampleSize) return [...data];
  
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

/**
 * Stratified sampling to ensure representation across categories
 * @param {Array} dataset Data array
 * @param {number} sampleSize Desired sample size
 * @param {string} stratifyKey Key to stratify on
 * @returns {Array} Stratified sample
 */
function stratifiedSample(dataset, sampleSize, stratifyKey) {
  // Group data by stratification key
  const groups = {};
  dataset.forEach(item => {
    const key = item[stratifyKey];
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  
  // Calculate proportional sample sizes for each group
  const totalSize = dataset.length;
  const result = [];
  
  Object.keys(groups).forEach(key => {
    const groupSize = groups[key].length;
    const groupSampleSize = Math.max(1, Math.round((groupSize / totalSize) * sampleSize));
    
    // Sample from each group
    const groupSample = randomSample(groups[key], groupSampleSize);
    result.push(...groupSample);
  });
  
  // Adjust to desired sample size
  if (result.length > sampleSize) {
    return randomSample(result, sampleSize);
  }
  
  return result;
}

/**
 * Adaptive sampling based on data characteristics and error tolerance
 * @param {Array} data Data array
 * @param {number} initialSampleSize Initial sample size
 * @param {number} targetError Target error tolerance
 * @param {string} valueKey Key for the value to sample on
 * @returns {Array} Adaptive sample
 */
function adaptiveSample(data, initialSampleSize, targetError = 0.05, valueKey = 'value') {
  // Take initial sample
  let sample = randomSample(data, initialSampleSize);
  
  // Calculate statistics from sample
  const values = sample.map(item => {
    const val = item[valueKey];
    return typeof val === 'string' ? parseFloat(val) : val;
  }).filter(v => !isNaN(v));
  
  if (values.length === 0) return sample;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  // Calculate standard error
  const standardError = Math.sqrt(variance / values.length);
  const relativeError = Math.abs(standardError / mean);
  
  // If error exceeds target, increase sample size
  if (relativeError > targetError && mean !== 0) {
    const requiredSampleSize = Math.ceil(
      variance / Math.pow(targetError * Math.abs(mean), 2)
    );
    
    if (requiredSampleSize > initialSampleSize && requiredSampleSize < data.length) {
      // Get additional samples
      const additionalSample = randomSample(
        data, 
        requiredSampleSize - initialSampleSize
      );
      sample = [...sample, ...additionalSample];
    }
  }
  
  return sample;
}

/**
 * Systematic sampling (every nth item)
 * @param {Array} data Data array
 * @param {number} sampleSize Desired sample size
 * @returns {Array} Systematic sample
 */
function systematicSample(data, sampleSize) {
  if (data.length <= sampleSize) return [...data];
  
  const step = Math.floor(data.length / sampleSize);
  const result = [];
  
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
    if (result.length >= sampleSize) break;
  }
  
  return result;
}

/**
 * Time-based sampling for temporal data
 * @param {Array} data Data array in chronological order
 * @param {number} sampleSize Desired sample size
 * @param {string} timeKey Key for timestamp
 * @returns {Array} Time-based sample
 */
function timeBasedSample(data, sampleSize, timeKey = 'timestamp') {
  if (data.length <= sampleSize) return [...data];
  
  // Get time range
  const startTime = new Date(data[0][timeKey]).getTime();
  const endTime = new Date(data[data.length - 1][timeKey]).getTime();
  
  // Calculate time intervals
  const timeStep = (endTime - startTime) / sampleSize;
  const result = [];
  
  // Sample at regular time intervals
  for (let i = 0; i < sampleSize; i++) {
    const targetTime = startTime + (i * timeStep);
    
    // Find closest data point
    let closestIndex = 0;
    let closestDiff = Infinity;
    
    for (let j = 0; j < data.length; j++) {
      const time = new Date(data[j][timeKey]).getTime();
      const diff = Math.abs(time - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = j;
      }
    }
    
    result.push(data[closestIndex]);
  }
  
  return result;
}

module.exports = {
  reservoirSample,
  randomSample,
  stratifiedSample,
  adaptiveSample,
  systematicSample,
  timeBasedSample
};
