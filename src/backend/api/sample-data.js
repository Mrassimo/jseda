/**
 * Sample data router
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Serve sample data files
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../../sample-data', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sample file not found' });
  }
  
  // Send file
  res.setHeader('Content-Type', 'text/csv');
  res.sendFile(filePath);
});

// Get list of available sample files
router.get('/', (req, res) => {
  const sampleDir = path.join(__dirname, '../../../sample-data');
  
  try {
    const files = fs.readdirSync(sampleDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => ({
        name: file,
        path: `/sample-data/${file}`
      }));
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sample files' });
  }
});

module.exports = router;
