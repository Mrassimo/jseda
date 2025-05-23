const { app, BrowserWindow, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const server = require('./server');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Load the welcome page
  mainWindow.loadURL('http://localhost:3030/welcome.html');
  
  // Set Content-Security-Policy with stricter rules
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' http://localhost:* ws://localhost:*; style-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net;"]
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

// Set up IPC handlers
ipcMain.handle('save-file', async (event, { fileName, content }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!canceled && filePath) {
      fs.writeFileSync(filePath, content);
      return { success: true, path: filePath };
    } else {
      return { success: false, reason: 'Operation cancelled' };
    }
  } catch (err) {
    console.error('Error saving file:', err);
    return { success: false, reason: err.message };
  }
});

ipcMain.handle('clipboard-write', async (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (err) {
    console.error('Error writing to clipboard:', err);
    return { success: false, reason: err.message };
  }
});
