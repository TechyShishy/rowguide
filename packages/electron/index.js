const { app, BrowserWindow } = require("electron/main");
const path = require("node:path");
const serve = require("electron-serve");

const loadURL = serve({ directory: "../rowguide/dist/rowguide/browser" });

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });
  loadURL(win);
  //win.loadURL("http://localhost:4200");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
