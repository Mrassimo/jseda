# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js Automated Exploratory Data Analysis (EDA) tool that processes CSV files, generates visualizations, and creates metadata suitable for LLMs. The application supports efficient CSV processing with stream-based handling for large files, smart sampling strategies, intelligent visualization selection, and comprehensive statistical analysis.

## Architecture

The application follows a modular three-layer architecture:

1. **Data Processing Layer**: Handles CSV parsing, sampling, and statistical computations
   - Located in `src/backend/data/`
   - Key files: `csv-parser.js`, `data-sampler.js`, `data-utils.js`

2. **Analysis Layer**: Performs statistical calculations and generates metadata
   - Located in `src/backend/analysis/`
   - Key files: `descriptive.js`, `correlation.js`, `metadata-generator.js`

3. **Visualization Layer**: Selects and renders appropriate charts based on data characteristics
   - Located in `src/backend/visualization/`
   - Key files: `chart-selector.js`, `chart-generator.js`

The application uses worker threads for performance-intensive tasks:
- `src/backend/workers/csv-processor.js`: Handles CSV parsing and initial processing
- `src/backend/workers/analytics.js`: Performs statistical analysis
- `src/backend/workers/visualization-generator.js`: Creates visualizations

## Tech Stack

- **Backend**: Node.js, Express.js, Worker Threads
- **CSV Processing**: csv-parser
- **Statistical Analysis**: simple-statistics, jStat
- **Visualization**: Chart.js, D3.js
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Desktop Packaging**: Electron

## Key Commands

```bash
# Install dependencies
npm install

# Start Electron app
npm start

# Start Express server only
npm run server

# Start development server with auto-reload
npm run dev
```

## API Endpoints

- `POST /api/upload`: Upload a CSV file
- `GET /api/data/:dataId`: Get data summary
- `GET /api/data/:dataId/sample`: Get a sample of the data
- `POST /api/visualize`: Generate a visualization
- `GET /api/visualize/:dataId/:vizId`: Get a specific visualization
- `GET /api/analyze/:dataId`: Get comprehensive analysis and metadata
- `GET /api/recommend/:dataId`: Get visualization recommendations
- `GET /api/datasets`: Get available datasets

## Processing Flow

1. User uploads a CSV file or selects a sample dataset
2. The file is processed by the CSV parser, which reads the file in chunks
3. Data sampler creates a representative sample of the dataset
4. Statistical analysis is performed on the sample
5. Metadata is generated based on the analysis
6. Appropriate visualizations are recommended based on data characteristics
7. Results are returned to the frontend for display

## Sample Data

Sample CSV files are available in the `sample-data/` directory:
- `employees.csv`: Sample employee data
- `sales.csv`: Sample sales data