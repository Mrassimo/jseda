#!/bin/bash

# Script to install and run the EDA App

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to run this application."
    exit 1
fi

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the project directory
cd "$DIR"

# Check if logs directory exists, create if not
if [ ! -d "logs" ]; then
  mkdir -p logs
fi

# Choose run mode
if [ "$1" == "server" ]; then
    # Run server only mode
    echo "Starting EDA application in server-only mode..."
    
    # Kill any previous server instances
    if [ -f "logs/server.pid" ]; then
        OLD_PID=$(cat logs/server.pid)
        if ps -p $OLD_PID > /dev/null; then
            echo "Stopping previous server instance (PID: $OLD_PID)..."
            kill $OLD_PID
        fi
        rm logs/server.pid
    fi
    
    # Start server and log output
    node server.js > logs/server_log.txt 2>&1 &
    
    # Save PID
    echo $! > logs/server.pid
    
    echo "Server started with PID: $(cat logs/server.pid)"
    echo "Server logs will be written to logs/server_log.txt"
    echo "To stop the server, run: ./run.sh stop"
    echo ""
    echo "Open http://localhost:3030 in your browser"
elif [ "$1" == "stop" ]; then
    # Stop server
    if [ -f "logs/server.pid" ]; then
        PID=$(cat logs/server.pid)
        if ps -p $PID > /dev/null; then
            echo "Stopping server (PID: $PID)..."
            kill $PID
            rm logs/server.pid
            echo "Server stopped"
        else
            echo "No running server found with PID: $PID"
            rm logs/server.pid
        fi
    else
        echo "No server PID file found"
    fi
elif [ "$1" == "dev" ]; then
    # Install dependencies
    echo "Installing dependencies..."
    npm install
    
    # Start in development mode
    echo "Starting EDA application in development mode..."
    npm run dev
else
    # Install dependencies
    echo "Installing dependencies..."
    npm install
    
    # Start the full Electron application
    echo "Starting EDA application..."
    npm start
fi
