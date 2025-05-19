# Node.js Automated EDA Tool

A powerful, automated Exploratory Data Analysis (EDA) tool built with Node.js that efficiently processes large CSV files, generates intelligent visualizations, and creates comprehensive metadata suitable for LLMs.

## Features

- **Efficient CSV Processing**: Stream-based processing for large files with minimal memory usage
- **Smart Sampling Strategies**: Reservoir, stratified, and adaptive sampling for representative data analysis
- **Intelligent Visualization Selection**: Automatically chooses the most appropriate chart types based on data characteristics
- **Comprehensive Statistical Analysis**: Basic and advanced statistics with outlier detection and distribution analysis
- **Correlation Analysis**: Identifies relationships between variables with visual correlation matrix
- **Insights Generation**: Automatically generates actionable insights about data quality, distributions, and correlations
- **Metadata for LLMs**: Creates detailed, structured metadata suitable for Large Language Models
- **Interactive UI**: Web-based interface for exploring data, creating visualizations, and viewing analysis

## Architecture

The application follows a modular three-layer architecture:
1. **Data Processing Layer**: Handles CSV parsing, sampling, and statistical computations
2. **Analysis Layer**: Performs statistical calculations and generates metadata
3. **Visualization Layer**: Selects and renders appropriate charts based on data characteristics

It's implemented as a web application using Express.js for the backend and vanilla JavaScript with Chart.js for the frontend, packaged as a desktop application using Electron.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/eda-app.git
cd eda-app

# Install dependencies
npm install

# Start the development server
npm run dev

# Start the Electron app
npm start
```

## Usage

1. **Upload a CSV File**: Click the "Upload & Analyze" button to upload a CSV file.
2. **Explore Data**: View a preview of the data and basic statistics.
3. **Visualize**: Generate visualizations automatically or customize them based on your needs.
4. **Analyze**: View comprehensive statistical analysis, correlations, and insights.

## Technologies Used

- **Backend**: Node.js, Express.js, Worker Threads
- **CSV Processing**: csv-parser
- **Statistical Analysis**: simple-statistics, jStat
- **Visualization**: Chart.js
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Desktop Packaging**: Electron

## Project Structure

```
/eda-app
├── package.json             # Application metadata
├── main.js                  # Electron entry point
├── server.js                # Express server 
├── src/
│   ├── backend/             
│   │   ├── data/            # Data processing modules
│   │   │   ├── csv-parser.js   
│   │   │   ├── data-sampler.js  
│   │   │   └── data-utils.js   
│   │   ├── analysis/        # Statistical analysis
│   │   │   ├── descriptive.js  
│   │   │   ├── correlation.js 
│   │   │   └── metadata-generator.js      
│   │   ├── visualization/   
│   │   │   ├── chart-selector.js 
│   │   │   └── chart-generator.js 
│   │   ├── workers/         # Worker threads
│   │   │   ├── csv-processor.js
│   │   │   ├── analytics.js
│   │   │   └── visualization-generator.js
│   │   └── api/            
│   │       └── routes.js     
│   └── frontend/           
│       ├── components/     
│       ├── styles/        
│       └── index.html     
├── public/                 # Static files
│   ├── index.html
│   └── js/
│       └── main.js
└── uploads/                # Uploaded files directory
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

## License

MIT

## Acknowledgements

This project was inspired by various EDA tools like Exploratory, EDA by Jortilles, and Observable, with a focus on building a lightweight, efficient solution for Node.js.
