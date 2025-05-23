// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld('api', {
  // Expose app information
  appInfo: {
    versions: {
      chrome: process.versions.chrome,
      node: process.versions.node,
      electron: process.versions.electron
    }
  },
  
  // File system operations
  saveFile: (fileName, content) => {
    return ipcRenderer.invoke('save-file', { fileName, content });
  },
  
  // Clipboard operations
  writeToClipboard: (text) => {
    return ipcRenderer.invoke('clipboard-write', text);
  }
});

// DOM content loaded event
window.addEventListener('DOMContentLoaded', () => {
  console.log('preload.js: DOM fully loaded');
});
