const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusmote', {
  onServerStart: (cb) => ipcRenderer.on('server:start', (_e, info) => cb(info)),
  onServerStatus: (cb) => ipcRenderer.on('server:status', (_e, status) => cb(status)),
  quit: () => ipcRenderer.send('app:quit'),
});