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

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the application
echo "Starting EDA application..."
npm start
