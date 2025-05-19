const { app, BrowserWindow } = require('electron');
const path = require('path');
const server = require('./server');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Load the welcome page
  mainWindow.loadURL('http://localhost:3000/welcome.html');
  
  // Set Content-Security-Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' http://localhost:*; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:;"]
      }
    });
  });
  
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Log when page is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });
  
  // Log errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorDescription} (${errorCode})`);
  });
}

app.whenReady().then(() => {
  console.log('Electron app ready');
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
