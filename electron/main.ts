import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = !app.isPackaged;
const dataPath = path.join(app.getPath('userData'), 'todos.json');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// TODOデータの読み込み
ipcMain.handle('load-todos', async () => {
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load todos:', error);
    return [];
  }
});

// TODOデータの保存
ipcMain.handle('save-todos', async (_, todos) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(todos, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save todos:', error);
    return { success: false, error: String(error) };
  }
});

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
