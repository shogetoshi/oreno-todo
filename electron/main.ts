import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { promises as fsPromises } from 'fs';

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
    const data = await fsPromises.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(data);

    // データ形式の検証
    if (!Array.isArray(parsed)) {
      console.error('Invalid data format: not an array');
      return [];
    }

    return parsed;
  } catch (error) {
    // ファイルが存在しない場合は空配列を返す
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    // JSON パースエラーの場合はバックアップを作成
    if (error instanceof SyntaxError) {
      console.error('JSON parse error, creating backup');
      try {
        const backupPath = `${dataPath}.backup.${Date.now()}`;
        await fsPromises.copyFile(dataPath, backupPath);
        console.log(`Backup created at: ${backupPath}`);
      } catch (backupError) {
        console.error('Failed to create backup:', backupError);
      }
    }

    console.error('Failed to load todos:', error);
    return [];
  }
});

// TODOデータの保存
ipcMain.handle('save-todos', async (_, todos) => {
  try {
    await fsPromises.writeFile(dataPath, JSON.stringify(todos, null, 2), 'utf-8');
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
