const { contextBridge, ipcRenderer } = require('electron');

const apiBaseUrl = process.env.TOKOBERSAMA_API_BASE_URL || `http://${process.env.TOKOBERSAMA_API_HOST || '127.0.0.1'}:${process.env.TOKOBERSAMA_API_PORT || 8731}`;

contextBridge.exposeInMainWorld('tokobersama', {
  apiBaseUrl,
  openExternal: (url) => ipcRenderer.invoke('tokobersama:open-external', url),
});
