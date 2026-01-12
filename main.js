const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getSaveDirectory() {
  let basePath;
  try {
    basePath = app.getPath('pictures');
  } catch (err) {
    basePath = app.getPath('documents');
  }
  const saveDir = path.join(basePath, 'Snappyman');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  return saveDir;
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setIgnoreMouseEvents(false);
  
  getSaveDirectory();
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.webContents.send('trigger-snap');
  });
  
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    mainWindow.webContents.send('trigger-reset');
  });
});

ipcMain.on('set-ignore-mouse', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.setIgnoreMouseEvents(ignore, options);
});

ipcMain.handle('open-folder', async () => {
  const dir = getSaveDirectory();
  await shell.openPath(dir);
});

// NEW: Robustly get scale factor from Main process
ipcMain.handle('get-scale-factor', () => {
  const display = screen.getPrimaryDisplay();
  return { 
    scale: display.scaleFactor, 
    bounds: display.bounds 
  };
});

ipcMain.handle('save-snapshot', async (event, { buffer }) => {
  try {
    const saveDir = getSaveDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snap_${timestamp}.png`;
    const filePath = path.join(saveDir, filename);

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  } catch (error) {
    console.error(error);
    return null;
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
