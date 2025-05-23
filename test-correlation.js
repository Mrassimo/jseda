/**
 * Test script for EDA app correlation matrix
 * This script tests the correlation matrix generation and other analysis components
 */

const fs = require('fs');
const path = require('path');
const { calculateCorrelationMatrix, findCorrelatedPairs } = require('./src/backend/analysis/correlation');
const { analyzeDataIntegrity } = require('./src/backend/analysis/data-integrity');
const { generateDatasetMetadata } = require('./src/backend/analysis/metadata-generator');

// Test data - a small CSV sample
const sampleData = [
  { age: 30, income: 50000, experience: 8, satisfaction: 4 },
  { age: 25, income: 42000, experience: 3, satisfaction: 3 },
  { age: 40, income: 65000, experience: 15, satisfaction: 5 },
  { age: 35, income: 55000, experience: 10, satisfaction: 4 },
  { age: 28, income: 45000, experience: 5, satisfaction: 3 },
];

// Data types
const dataTypes = {
  age: 'numeric',
  income: 'numeric',
  experience: 'numeric',
  satisfaction: 'numeric'
};

// Test correlation matrix
console.log('Testing correlation matrix generation...');
const numericColumns = Object.keys(dataTypes).filter(col => dataTypes[col] === 'numeric');
const correlations = calculateCorrelationMatrix(sampleData, numericColumns);

console.log('Correlation matrix structure:');
console.log('- Columns:', correlations.columns);
console.log('- Matrix dimensions:', correlations.matrix.length, 'x', 
            correlations.matrix[0] ? correlations.matrix[0].length : 0);

// Test correlated pairs
console.log('\nTesting correlated pairs detection...');
const correlatedPairs = findCorrelatedPairs(correlations, 0.7);
console.log('Found correlated pairs:', correlatedPairs.length);
console.log('Correlated pairs sample:', JSON.stringify(correlatedPairs.slice(0, 2), null, 2));

// Check for feature1/column1 naming inconsistency
if (correlatedPairs.length > 0) {
  const pair = correlatedPairs[0];
  console.log('\nChecking field naming (critical for frontend)...');
  console.log('- Has column1:', pair.hasOwnProperty('column1'));
  console.log('- Has column2:', pair.hasOwnProperty('column2'));
  console.log('- Has feature1:', pair.hasOwnProperty('feature1'));
  console.log('- Has feature2:', pair.hasOwnProperty('feature2'));
  
  if (!pair.hasOwnProperty('feature1') || !pair.hasOwnProperty('feature2')) {
    console.error('CRITICAL: Missing feature1/feature2 - frontend compatibility issue!');
  }
}

// Test data integrity analysis
console.log('\nTesting data integrity analysis...');
const dataIntegrity = analyzeDataIntegrity(sampleData, { dataTypes });
console.log('Data integrity score:', dataIntegrity.score);
console.log('Issues found:', dataIntegrity.issues ? dataIntegrity.issues.length : 0);

// Test metadata generation
console.log('\nTesting metadata generation...');
const metadata = generateDatasetMetadata(sampleData, { name: 'Test Dataset' });
console.log('Metadata summary:', Object.keys(metadata));

console.log('\nTest completed successfully!');