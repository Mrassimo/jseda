/**
 * API routes for EDA application
 */

const express = require('express');
const multer = require('multer');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 100 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' ||
      file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  }
});

// Data storage (In a production app, use a proper database)
const dataStore = {};

/**
 * Upload a CSV file
 * POST /api/upload
 */
router.post('/upload', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const dataId = uuidv4();

  // Store file info
  dataStore[dataId] = {
    id: dataId,
    filePath,
    originalName: req.file.originalname,
    status: 'processing',
    uploadDate: new Date().toISOString()
  };

  // Process file in a worker thread
  const worker = new Worker(path.join(__dirname, '../workers/csv-processor.js'), {
    workerData: { filePath, dataId }
  });

  worker.on('message', (result) => {
    if (result.success) {
      // Update data store with processed results
      dataStore[dataId] = {
        ...dataStore[dataId],
        ...result,
        status: 'ready'
      };

      res.json({
        success: true,
        dataId,
        summary: result.summary
      });
    } else {
      dataStore[dataId].status = 'error';
      dataStore[dataId].error = result.error;

      res.status(500).json({
        error: result.error,
        dataId
      });
    }
  });

  worker.on('error', (err) => {
    dataStore[dataId].status = 'error';
    dataStore[dataId].error = err.message;

    res.status(500).json({
      error: err.message,
      dataId
    });
  });
});

/**
 * Get data summary
 * GET /api/data/:dataId
 */
router.get('/data/:dataId', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  res.json({
    dataId,
    status: dataStore[dataId].status,
    name: dataStore[dataId].originalName,
    summary: dataStore[dataId].summary || null,
    error: dataStore[dataId].error || null
  });
});

/**
 * Get data sample
 * GET /api/data/:dataId/sample
 */
router.get('/data/:dataId/sample', (req, res) => {
  const { dataId } = req.params;
  const limit = parseInt(req.query.limit) || 100;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  if (dataStore[dataId].status !== 'ready') {
    return res.status(400).json({
      error: 'Data is not ready',
      status: dataStore[dataId].status
    });
  }

  // Return a sample of the data
  const sample = dataStore[dataId].sampleData || [];
  res.json({
    dataId,
    sample: sample.slice(0, limit)
  });
});

/**
 * Generate visualization
 * POST /api/visualize
 */
router.post('/visualize', express.json(), (req, res) => {
  const { dataId, options } = req.body;

  if (!dataId) {
    return res.status(400).json({ error: 'Data ID is required' });
  }

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  if (dataStore[dataId].status !== 'ready') {
    return res.status(400).json({
      error: 'Data is not ready for visualization',
      status: dataStore[dataId].status
    });
  }

  // Generate visualization specs
  const visualizationWorker = new Worker(path.join(__dirname, '../workers/visualization-generator.js'), {
    workerData: {
      dataId,
      filePath: dataStore[dataId].filePath,
      sampleData: dataStore[dataId].sampleData,
      options: options || {}
    }
  });

  visualizationWorker.on('message', (vizSpec) => {
    if (vizSpec.error) {
      return res.status(500).json({ error: vizSpec.error });
    }

    // Store the visualization
    if (!dataStore[dataId].visualizations) {
      dataStore[dataId].visualizations = [];
    }

    const vizId = uuidv4();
    dataStore[dataId].visualizations.push({
      id: vizId,
      spec: vizSpec,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      dataId,
      vizId,
      spec: vizSpec
    });
  });

  visualizationWorker.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

/**
 * Get a specific visualization
 * GET /api/visualize/:dataId/:vizId
 */
router.get('/visualize/:dataId/:vizId', (req, res) => {
  const { dataId, vizId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  if (!dataStore[dataId].visualizations) {
    return res.status(404).json({ error: 'No visualizations available' });
  }

  const viz = dataStore[dataId].visualizations.find(v => v.id === vizId);

  if (!viz) {
    return res.status(404).json({ error: 'Visualization not found' });
  }

  res.json(viz);
});

/**
 * Get all visualizations for a dataset
 * GET /api/visualize/:dataId
 */
router.get('/visualize/:dataId', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  const visualizations = dataStore[dataId].visualizations || [];

  res.json({
    dataId,
    count: visualizations.length,
    visualizations: visualizations.map(v => ({
      id: v.id,
      type: v.spec.type,
      title: v.spec.config.title,
      createdAt: v.createdAt
    }))
  });
});

/**
 * Generate analytics and metadata
 * GET /api/analyze/:dataId
 */
router.get('/analyze/:dataId', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  if (dataStore[dataId].status !== 'ready') {
    return res.status(400).json({
      error: 'Data is not ready for analysis',
      status: dataStore[dataId].status
    });
  }

  // Check if we already have analysis
  if (dataStore[dataId].analysis) {
    return res.json(dataStore[dataId].analysis);
  }

  // Generate analytics in worker thread
  const analyticsWorker = new Worker(path.join(__dirname, '../workers/analytics.js'), {
    workerData: {
      dataId,
      filePath: dataStore[dataId].filePath,
      summary: dataStore[dataId].summary,
      dataTypes: dataStore[dataId].dataTypes
    }
  });

  analyticsWorker.on('message', (analysis) => {
    if (analysis.error) {
      return res.status(500).json({ error: analysis.error });
    }

    // Store the analysis
    dataStore[dataId].analysis = analysis;

    res.json(analysis);
  });

  analyticsWorker.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

/**
 * Get available datasets
 * GET /api/datasets
 */
router.get('/datasets', (req, res) => {
  const datasets = Object.values(dataStore).map(dataset => ({
    id: dataset.id,
    name: dataset.originalName,
    status: dataset.status,
    uploadDate: dataset.uploadDate,
    rowCount: dataset.summary ? dataset.summary.rowCount : null,
    columnCount: dataset.summary ? dataset.summary.columns.length : null,
    visualizationCount: dataset.visualizations ? dataset.visualizations.length : 0,
    hasAnalysis: Boolean(dataset.analysis)
  }));

  res.json(datasets);
});

/**
 * Delete a dataset
 * DELETE /api/datasets/:dataId
 */
router.delete('/datasets/:dataId', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  // Delete the file
  const filePath = dataStore[dataId].filePath;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove from data store
  delete dataStore[dataId];

  res.json({ success: true });
});

/**
 * Get recommendations for visualizations
 * GET /api/recommend/:dataId
 */
router.get('/recommend/:dataId', (req, res) => {
  const { dataId } = req.params;

  if (!dataStore[dataId]) {
    return res.status(404).json({ error: 'Data not found' });
  }

  if (dataStore[dataId].status !== 'ready') {
    return res.status(400).json({
      error: 'Data is not ready',
      status: dataStore[dataId].status
    });
  }

  // Import here to avoid circular dependencies
  const { recommendVisualizations } = require('../visualization/chart-selector');

  // Generate recommendations
  const recommendations = recommendVisualizations(
    dataStore[dataId].sampleData,
    {
      dataTypes: dataStore[dataId].dataTypes
    }
  );

  res.json({
    dataId,
    recommendations
  });
});

module.exports = router;
