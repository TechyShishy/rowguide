import { app, BrowserWindow } from 'electron';
import serve from 'electron-serve';

const loadURL = serve({
  directory: 'rowguide/browser',
  hostname: 'rowguide',
  scheme: 'app',
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  win.loadURL('app://rowguide/index.html');

  // Only open DevTools in development mode
  if (!app.isPackaged || process.env['NODE_ENV'] === 'development') {
    win.webContents.openDevTools();
  } else {
    // Remove menu bar in production
    win.setMenuBarVisibility(false);
  }
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
