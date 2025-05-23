/**
 * Worker for generating visualizations
 */

const { workerData, parentPort } = require('worker_threads');
const { selectChartType, generateOptimalVisualizations } = require('../visualization/chart-selector');
const { generateChartSpec } = require('../visualization/chart-generator');

async function generateVisualization() {
  try {
    const { dataId, filePath, sampleData, options, mode = 'single' } = workerData;
    
    // Validate sample data
    if (!sampleData || sampleData.length === 0) {
      throw new Error('No sample data available for visualization');
    }
    
    // Report progress
    function reportProgress(phase, progress, message) {
      parentPort.postMessage({
        type: 'progress',
        phase,
        progress,
        message
      });
    }
    
    // Report initial progress
    reportProgress('initializing', 10, 'Initializing visualization generation');
    
    // Check if we're generating a single visualization or multiple optimal ones
    if (mode === 'optimal') {
      // Report progress
      reportProgress('analyzing', 30, 'Analyzing data for optimal visualizations');
      
      // Generate optimal visualizations
      const visualizations = await generateOptimalVisualizations(
        sampleData,
        options.metadata,
        { limit: options.limit || 10 }
      );
      
      // Report progress
      reportProgress('enhancing', 70, 'Enhancing visualizations with metadata');
      
      // Add metadata to each
      const enhancedVisualizations = visualizations.map((viz, index) => {
        // Report incremental progress for each visualization
        reportProgress('enhancing', 70 + Math.round((index / visualizations.length) * 20), 
                       `Enhancing visualization ${index + 1} of ${visualizations.length}`);
        
        return {
          ...viz,
          metadata: {
            dataId,
            generatedAt: new Date().toISOString(),
            dataSize: sampleData.length,
            originalFilePath: filePath,
            isOptimal: true
          }
        };
      });
      
      // Report completion
      reportProgress('complete', 100, 'Visualizations generated successfully');
      
      // Send results back to parent
      parentPort.postMessage({
        type: 'complete',
        success: true,
        visualizations: enhancedVisualizations
      });
      
    } else if (mode === 'optimal-progressive') {
      // Progressive visualization generation for SSE with improved performance
      try {
        // Report progress
        reportProgress('initializing', 10, 'Initializing progressive visualization generator');
        
        // Track operation start time for performance tracking
        const operationStartTime = Date.now();
        
        // Create a unique ID for this operation to track progress
        const operationId = require('crypto').randomBytes(16).toString('hex');
        
        // First, calculate the optimal visualization types rather than full visualizations
        reportProgress('analyzing', 20, 'Analyzing data patterns and structure for optimal visualization types');
        
        // Prepare data for analysis
        const dataStats = {
          rowCount: sampleData.length,
          columnTypes: options.metadata?.dataTypes || {},
          hasTemporalData: false,
          categoricalColumns: [],
          numericColumns: [],
          temporalColumns: []
        };
        
        // Identify column types if not already provided
        if (Object.keys(dataStats.columnTypes).length === 0) {
          reportProgress('analyzing', 22, 'Detecting column data types');
          
          // Get the first row to extract column names
          const firstRow = sampleData[0] || {};
          const columns = Object.keys(firstRow);
          
          // Basic type detection for each column
          columns.forEach(col => {
            // Sample the first few values
            const sampleValues = sampleData.slice(0, 100).map(row => row[col]);
            
            // Determine type based on sample values
            let numericCount = 0;
            let dateCount = 0;
            let nullCount = 0;
            
            sampleValues.forEach(val => {
              if (val === null || val === undefined || val === '') {
                nullCount++;
              } else if (!isNaN(Number(val))) {
                numericCount++;
              } else if (!isNaN(Date.parse(val))) {
                dateCount++;
                dataStats.hasTemporalData = true;
              }
            });
            
            // Determine the most likely type
            const validValueCount = sampleValues.length - nullCount;
            if (validValueCount > 0) {
              if (dateCount / validValueCount > 0.8) {
                dataStats.columnTypes[col] = 'temporal';
                dataStats.temporalColumns.push(col);
              } else if (numericCount / validValueCount > 0.8) {
                dataStats.columnTypes[col] = 'numeric';
                dataStats.numericColumns.push(col);
              } else {
                dataStats.columnTypes[col] = 'categorical';
                dataStats.categoricalColumns.push(col);
              }
            }
          });
        } else {
          // Use provided column types to categorize columns
          Object.entries(dataStats.columnTypes).forEach(([col, type]) => {
            if (type === 'temporal' || type === 'date') {
              dataStats.temporalColumns.push(col);
              dataStats.hasTemporalData = true;
            } else if (type === 'numeric' || type === 'number') {
              dataStats.numericColumns.push(col);
            } else {
              dataStats.categoricalColumns.push(col);
            }
          });
        }
        
        // Report progress
        reportProgress('planning', 30, 'Planning optimal visualization sequence');
        
        // Determine which visualizations to generate and in what order
        // This creates a "plan" of visualizations to generate progressively
        const vizPlan = [];
        
        // Add visualization plans based on data characteristics
        
        // 1. If we have temporal data, add time series visualizations first
        if (dataStats.hasTemporalData && dataStats.temporalColumns.length > 0) {
          const timeColumn = dataStats.temporalColumns[0];
          
          // For each numeric column, create a time series viz with the first temporal column
          dataStats.numericColumns.slice(0, 3).forEach(numericCol => {
            vizPlan.push({
              type: 'line',
              priority: 'high',
              config: {
                title: `${numericCol} over time`,
                category: 'time_series',
                xAxisColumn: timeColumn,
                yAxisColumns: [numericCol],
                isTimeSeries: true,
                xAxisLabel: timeColumn,
                yAxisLabel: numericCol
              }
            });
          });
        }
        
        // 2. Add correlation visualizations for numeric columns
        if (dataStats.numericColumns.length >= 2) {
          // Create scatter plots for pairs of numeric columns (limit to first few)
          for (let i = 0; i < Math.min(dataStats.numericColumns.length, 3); i++) {
            for (let j = i + 1; j < Math.min(dataStats.numericColumns.length, 4); j++) {
              const col1 = dataStats.numericColumns[i];
              const col2 = dataStats.numericColumns[j];
              
              vizPlan.push({
                type: 'scatter',
                priority: 'medium',
                config: {
                  title: `${col1} vs ${col2}`,
                  category: 'correlations',
                  xAxisColumn: col1,
                  yAxisColumn: col2,
                  xAxisLabel: col1,
                  yAxisLabel: col2
                }
              });
            }
          }
        }
        
        // 3. Add distribution visualizations
        dataStats.numericColumns.slice(0, 5).forEach(numericCol => {
          vizPlan.push({
            type: 'histogram',
            priority: 'medium',
            config: {
              title: `Distribution of ${numericCol}`,
              category: 'distributions',
              column: numericCol,
              bins: 10,
              xAxisLabel: numericCol,
              yAxisLabel: 'Frequency'
            }
          });
        });
        
        // 4. Add categorical visualizations
        dataStats.categoricalColumns.slice(0, 3).forEach(catCol => {
          vizPlan.push({
            type: 'bar',
            priority: 'medium',
            config: {
              title: `${catCol} Distribution`,
              category: 'categorical_analysis',
              categoryColumn: catCol,
              valueColumn: 'count',
              xAxisLabel: catCol,
              yAxisLabel: 'Count'
            }
          });
          
          // If we have numeric columns, add categorical breakdown
          if (dataStats.numericColumns.length > 0) {
            const numericCol = dataStats.numericColumns[0];
            vizPlan.push({
              type: 'bar',
              priority: 'medium',
              config: {
                title: `${numericCol} by ${catCol}`,
                category: 'categorical_analysis',
                categoryColumn: catCol,
                valueColumn: numericCol,
                xAxisLabel: catCol,
                yAxisLabel: numericCol
              }
            });
          }
        });
        
        // If we don't have enough visualizations, add extras from generateOptimalVisualizations
        if (vizPlan.length < (options.limit || 10)) {
          reportProgress('additional-planning', 40, 'Generating additional visualization recommendations');
          
          try {
            const additionalViz = await generateOptimalVisualizations(
              sampleData,
              options.metadata,
              { limit: (options.limit || 10) - vizPlan.length }
            );
            
            // Add any new visualizations not already in our plan
            if (additionalViz && Array.isArray(additionalViz)) {
              // Map existing visualizations to a simple format for comparison
              const existingVizKeys = vizPlan.map(viz => 
                `${viz.type}:${viz.config.title || ''}:${viz.config.xAxisColumn || ''}:${viz.config.yAxisColumn || ''}`
              );
              
              // Add only unique visualizations
              additionalViz.forEach(viz => {
                const vizKey = `${viz.type}:${viz.config.title || ''}:${viz.config.xAxisColumn || ''}:${viz.config.yAxisColumn || ''}`;
                if (!existingVizKeys.includes(vizKey)) {
                  vizPlan.push(viz);
                  existingVizKeys.push(vizKey);
                }
              });
            }
          } catch (error) {
            // If there's an error, just continue with what we have
            console.warn('Error generating additional visualizations:', error.message);
          }
        }
        
        // Limit to requested number
        const finalPlan = vizPlan.slice(0, options.limit || 10);
        
        // Report progress
        reportProgress('generating', 50, `Preparing to generate ${finalPlan.length} visualizations`);
        
        // Determine dynamic delay based on client needs
        // Start with a small delay and increase if we see performance issues
        let generationDelay = options.delay || 100; // ms between visualization sends
        
        // Report plan to caller if requested
        if (options.reportPlan) {
          parentPort.postMessage({
            type: 'plan',
            plan: finalPlan.map(viz => ({
              type: viz.type,
              title: viz.config.title,
              priority: viz.priority
            }))
          });
        }
        
        // Generate and send each visualization progressively
        for (let i = 0; i < finalPlan.length; i++) {
          const vizConfig = finalPlan[i];
          
          try {
            // Report individual visualization progress
            reportProgress('generating', 50 + Math.round((i / finalPlan.length) * 45), 
                           `Generating ${vizConfig.type} visualization (${i+1}/${finalPlan.length})`);
            
            // Generate the chart spec
            const startTime = Date.now();
            const chartSpec = await generateChartSpec(vizConfig.type, sampleData, vizConfig.config);
            const endTime = Date.now();
            
            // Adaptive delay - if generation was slow, reduce delay
            if (endTime - startTime > 500) {
              generationDelay = Math.max(50, generationDelay - 25);
            }
            
            // Add metadata and tracking information
            const enhancedViz = {
              ...chartSpec,
              type: vizConfig.type,
              config: {
                ...vizConfig.config,
                ...chartSpec.config,
                generatedAt: new Date().toISOString(),
                priority: vizConfig.priority,
                operationId
              },
              metadata: {
                dataId,
                generatedAt: new Date().toISOString(),
                dataSize: sampleData.length,
                operationId,
                originalFilePath: filePath,
                isOptimal: true,
                generationTime: endTime - startTime
              }
            };
            
            // Add informative tooltip if not already present
            if (!enhancedViz.config.tooltip) {
              enhancedViz.config.tooltip = {
                purpose: `Shows the relationship between ${vizConfig.config.xAxisColumn || ''} and ${vizConfig.config.yAxisColumn || ''}`,
                insights: `This visualization helps identify patterns in your data.`,
                rationale: `${vizConfig.type} charts are effective for visualizing this type of data.`,
                background: `This chart was automatically generated based on your data characteristics.`
              };
            }
            
            // Send individual visualization with progress info
            parentPort.postMessage({
              type: 'visualization',
              visualization: enhancedViz,
              progress: Math.round(((i + 1) / finalPlan.length) * 100),
              current: i + 1,
              total: finalPlan.length,
              operationId,
              remainingTime: (finalPlan.length - (i + 1)) * (generationDelay + 100) // Estimated remaining time
            });
            
            // Adaptive delay between visualizations
            if (i < finalPlan.length - 1) {
              await new Promise(resolve => setTimeout(resolve, generationDelay));
            }
          } catch (error) {
            console.error(`Error generating visualization ${i+1}/${finalPlan.length}:`, error);
            // Report error but continue with other visualizations
            parentPort.postMessage({
              type: 'visualization-error',
              error: error.message,
              visualizationType: vizConfig.type,
              visualizationConfig: vizConfig.config,
              index: i,
              total: finalPlan.length,
              recoverable: true
            });
            
            // Add a bit more delay after an error
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        // Report completion
        const totalTime = Date.now() - operationStartTime;
        reportProgress('complete', 100, `Completed all visualizations in ${Math.round(totalTime/1000)}s`);
        
        // Signal completion
        parentPort.postMessage({
          type: 'complete',
          count: finalPlan.length,
          operationId,
          totalTime,
          avgGenerationTime: finalPlan.length > 0 ? Math.round(totalTime / finalPlan.length) : 0
        });
      } catch (error) {
        console.error('Error in progressive visualization generation:', error);
        parentPort.postMessage({
          type: 'error',
          error: error.message,
          errorType: 'PROGRESSIVE_GENERATION_ERROR',
          recoverable: false,
          stack: error.stack
        });
      }
    } else {
      // Single visualization generation
      
      // Report progress
      reportProgress('analyzing', 30, 'Analyzing data for visualization');
      
      // If chart type is specified, use it; otherwise, select automatically
      const chartType = options.chartType || 
                       selectChartType(sampleData, options).type;
      
      // Report progress
      reportProgress('generating', 60, `Generating ${chartType} chart`);
      
      // Generate chart specification
      const chartSpec = await generateChartSpec(chartType, sampleData, {
        ...options,
        title: options.title || `${chartType.charAt(0).toUpperCase()}${chartType.slice(1)} Chart`
      });
      
      // Report progress
      reportProgress('finalizing', 90, 'Finalizing visualization');
      
      // Add metadata
      chartSpec.metadata = {
        dataId,
        generatedAt: new Date().toISOString(),
        dataSize: sampleData.length,
        originalFilePath: filePath
      };
      
      // Report completion
      reportProgress('complete', 100, 'Visualization generated successfully');
      
      // Send results back to parent
      parentPort.postMessage({
        type: 'complete',
        success: true,
        vizSpec: chartSpec
      });
    }
  } catch (error) {
    console.error('Error in visualization generator:', error);
    parentPort.postMessage({
      type: 'error',
      success: false,
      error: error.message,
      errorType: 'VISUALIZATION_GENERATION_ERROR',
      recoverable: true,
      details: {
        stack: error.stack,
        context: { 
          dataId: workerData.dataId, 
          mode: workerData.mode || 'single',
          options: workerData.options || {}
        }
      }
    });
  }
}

// Start generating visualization
generateVisualization().catch(error => {
  console.error('Unhandled error in visualization generator:', error);
  parentPort.postMessage({
    type: 'error',
    success: false,
    error: error.message,
    errorType: 'UNHANDLED_ERROR',
    recoverable: false,
    stack: error.stack
  });
});