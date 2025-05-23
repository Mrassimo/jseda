# EDA App - Browser-Based Data Analysis Tool

A powerful, modern exploratory data analysis tool that runs entirely in your browser. Upload CSV files, visualize data, and get insights instantly - no desktop installation required!

## 🚀 One-Line Install & Run

```bash
git clone https://github.com/yourusername/eda-app.git && cd eda-app && npm install && npm start
```

Then open http://localhost:3030 in your browser. That's it! 🎉

## ✨ Features

- **📊 Instant Analysis**: Upload CSV and get insights in seconds
- **🎨 Modern Dashboard**: Beautiful UI with dark mode support
- **📈 Smart Visualizations**: Auto-generated charts based on your data
- **🔍 Statistical Analysis**: Correlations, distributions, and outliers
- **💾 No Installation**: Runs entirely in your browser
- **🔒 Privacy First**: All processing happens locally - no data leaves your machine
- **📱 Responsive**: Works on desktop, tablet, and mobile

## 📋 Prerequisites

Just need:
- Node.js (v14+) - [Download](https://nodejs.org/)
- A modern web browser

## 🔧 Manual Installation

If the one-liner doesn't work:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/eda-app.git
cd eda-app

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open in browser
# Navigate to http://localhost:3030
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
