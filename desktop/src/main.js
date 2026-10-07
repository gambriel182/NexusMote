const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, screen } = require('electron');
const path = require('path');
const { startServer } = require('./server');
const { getLocalIp } = require('./utils');

let mainWindow = null;
let tray = null;
let serverInstance = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    x: width - 440,
    y: height - 600,
    resizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: false,
    vibrancy: 'under-window',
    title: 'NexusMote',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'resources', 'icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('NexusMote');
}

async function startDesktopServer() {
  const ip = getLocalIp();
  const result = await startServer({
    host: '0.0.0.0',
    port: 8080,
    onStatusChange: (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server:status', status);
      }
    },
  });

  serverInstance = result;
  return { ip, port: 8080, ...result };
}

app.whenReady().then(async () => {
  createWindow();
  createTray();

  const info = await startDesktopServer();
  mainWindow.webContents.send('server:start', info);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) serverInstance.close();
    app.quit();
  }
});

ipcMain.on('app:quit', () => app.quit());

module.exports = { createWindow };