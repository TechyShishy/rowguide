import { app, BrowserWindow } from 'electron';
// tslint:disable-next-line:no-require-imports
const serve = require('electron-serve');

const loadURL = serve({
  directory: 'rowguide/browser',
  hostname: 'rowguide',
  scheme: 'app',
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  win.loadURL('app://rowguide/index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
