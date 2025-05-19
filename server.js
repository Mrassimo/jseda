const express = require('express');
const multer = require('multer');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Import routes
const apiRoutes = require('./src/backend/api/routes');
const sampleDataRoutes = require('./src/backend/api/sample-data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);
app.use('/sample-data', sampleDataRoutes);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start the server
app.listen(PORT, () => {
  console.log(`EDA server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}/welcome.html in your browser`);
});

module.exports = app;
