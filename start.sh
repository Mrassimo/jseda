#!/bin/bash

# EDA App - Browser Launcher Script

echo "🚀 Starting EDA App..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "🌐 Starting server on http://localhost:3030"
echo ""

# Try to open browser automatically based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    (sleep 2 && open http://localhost:3030) &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    (sleep 2 && xdg-open http://localhost:3030) &
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    (sleep 2 && start http://localhost:3030) &
fi

# Start the Node.js server
node server.js