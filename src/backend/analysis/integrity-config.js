/**
 * Configuration for data integrity analysis
 * Centralizes constants and configuration values for better maintainability
 */

module.exports = {
  // Data repair configuration for sample data issues
  repair: {
    // Default options for data integrity repairs
    options: {
      // Whether to fix datasets with missing sample data
      fixMissingSamples: true,
      
      // Whether to fix datasets with empty sample data arrays
      fixEmptySamples: true,
      
      // Whether to fix cache mismatches where the sizes don't match
      fixCacheMismatches: true,
      
      // Whether to clear cache entries for non-existent datasets
      clearOrphanedCache: true,
      
      // Size of sample to generate when rebuilding
      sampleSize: 1000,
      
      // Cache time to live in milliseconds (30 minutes)
      cacheTimeToLive: 30 * 60 * 1000
    },
    
    // Automated check configuration
    automatedChecks: {
      // Whether to enable automated integrity checks
      enabled: true,
      
      // How often to run the check (in milliseconds)
      // Default: Every 6 hours
      interval: 6 * 60 * 60 * 1000,
      
      // Whether to automatically repair issues
      autoRepair: true,
      
      // How long to keep diagnostic reports (in milliseconds)
      // Default: 7 days
      reportRetention: 7 * 24 * 60 * 60 * 1000,
      
      // Maximum number of reports to keep
      maxReports: 20
    }
  },
  // Australian specific configuration
  australia: {
    // Standard Australian states and territories
    states: [
      'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT',
      'New South Wales', 'Victoria', 'Queensland', 'South Australia',
      'Western Australia', 'Tasmania', 'Northern Territory', 
      'Australian Capital Territory'
    ],
    
    // Australian health measurement ranges
    healthMeasurements: {
      'Cholesterol': { min: 2.0, max: 12.0, unit: 'mmol/L' }, 
      'Blood_Pressure_Systolic': { min: 70, max: 250, unit: 'mmHg' },
      'Blood_Pressure_Diastolic': { min: 40, max: 150, unit: 'mmHg' },
      'Heart_Rate': { min: 30, max: 220, unit: 'bpm' },
      'Blood_Glucose': { min: 2.0, max: 30.0, unit: 'mmol/L' }, 
      'HbA1c': { min: 3.5, max: 20.0, unit: '%' }, 
      'Weight_kg': { min: 15, max: 300, unit: 'kg' },
      'BMI': { min: 12, max: 60, unit: 'kg/m²' }
    },
    
    // Common column name variations for health measurements
    measurementPatterns: {
      'Cholesterol': ['cholesterol', 'chol', 'total_cholesterol'],
      'Blood_Pressure_Systolic': ['sbp', 'systolic', 'systolic_bp'],
      'Blood_Pressure_Diastolic': ['dbp', 'diastolic', 'diastolic_bp'],
      'Heart_Rate': ['hr', 'heart_rate', 'pulse'],
      'Blood_Glucose': ['glucose', 'blood_glucose', 'bgl'],
      'HbA1c': ['hba1c', 'a1c', 'glycated', 'glycated_haemoglobin'],
      'Weight_kg': ['weight', 'mass_kg', 'weight_kg'],
      'BMI': ['bmi', 'body_mass_index']
    }
  },
  
  // General data integrity configuration
  general: {
    // Severity thresholds
    severityThresholds: {
      missing: {
        critical: 50, // % missing values for critical severity
        major: 20,    // % missing values for major severity
        minor: 5      // % missing values for minor severity
      },
      outliers: {
        critical: 20, // % outliers for critical severity
        major: 10,    // % outliers for major severity
        minor: 2      // % outliers for minor severity
      },
      duplicates: {
        critical: 10, // % duplicates for critical severity
        major: 2,     // % duplicates for major severity
        minor: 0.5    // % duplicates for minor severity
      },
      timeliness: {
        critical: 10, // years old for critical severity
        major: 5,     // years old for major severity
        minor: 2      // years old for minor severity
      }
    },
    
    // Score deductions
    scoreDeductions: {
      critical: 10,  // Points to deduct for each critical issue
      major: 5,      // Points to deduct for each major issue
      minor: 2,      // Points to deduct for each minor issue
      warning: 1     // Points to deduct for each warning
    },
    
    // Visualization recommendations
    visualizationsByDataType: {
      numeric: ['histogram', 'boxplot', 'violin'],
      categorical: ['bar', 'pie', 'donut'],
      temporal: ['line', 'area', 'calendar'],
      geospatial: ['map', 'heatmap'],
      binaryClassification: ['roc', 'precision-recall', 'confusion-matrix']
    }
  },
  
  // LLM-specific recommendations
  llm: {
    // Format instructions for LLMs
    formatInstructions: {
      dates: "Convert all dates to ISO format (YYYY-MM-DD) for standardization",
      numbers: "Format numeric values with appropriate precision and use Australian conventions",
      categorical: "Standardize category names for consistency across the dataset",
      missing: "Indicate missing values explicitly as NA or N/A rather than empty strings"
    },
    
    // Template fragments for LLM prompts
    promptFragments: {
      dataQuality: "Based on the data quality assessment score of {{SCORE}}/100 ({{RATING}}), consider the following data integrity issues: {{ISSUES}}",
      recommendations: "Consider implementing these recommendations to improve data quality: {{RECOMMENDATIONS}}",
      australianContext: "For Australian healthcare data, ensure all measurements follow Australian standards: {{STANDARDS}}"
    }
  }
};