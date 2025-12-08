import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import express from 'express';
import { fetchCalendarEvents, getTodayDateString } from './googleCalendar';

const isDev = !app.isPackaged;
const dataPath = path.join(app.getPath('userData'), 'todos.json');
const timecardPath = path.join(app.getPath('userData'), 'timecard.json');

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
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

// TODOデータの読み込み
ipcMain.handle('load-todos', async () => {
  try {
    const data = await fsPromises.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(data);
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

// TODOデータの保存（アトミックな書き込み）
ipcMain.handle('save-todos', async (_, todos) => {
  const tempPath = `${dataPath}.tmp`;
  try {
    // 一時ファイルに完全に書き込み
    await fsPromises.writeFile(tempPath, JSON.stringify(todos, null, 2), 'utf-8');
    // アトミックにリネーム（OSレベルでアトミック操作）
    await fsPromises.rename(tempPath, dataPath);
    return { success: true };
  } catch (error) {
    console.error('Failed to save todos:', error);
    // 一時ファイルのクリーンアップ
    try {
      await fsPromises.unlink(tempPath);
    } catch (unlinkError) {
      // クリーンアップ失敗は無視（既に存在しない可能性）
    }
    return { success: false, error: String(error) };
  }
});

// タイムカードデータの読み込み
ipcMain.handle('load-timecard', async () => {
  try {
    const data = await fsPromises.readFile(timecardPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    // ファイルが存在しない場合は空オブジェクトを返す
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    // JSON パースエラーの場合はバックアップを作成
    if (error instanceof SyntaxError) {
      console.error('Timecard JSON parse error, creating backup');
      try {
        const backupPath = `${timecardPath}.backup.${Date.now()}`;
        await fsPromises.copyFile(timecardPath, backupPath);
        console.log(`Backup created at: ${backupPath}`);
      } catch (backupError) {
        console.error('Failed to create backup:', backupError);
      }
    }

    console.error('Failed to load timecard:', error);
    return {};
  }
});

// タイムカードデータの保存（アトミックな書き込み）
ipcMain.handle('save-timecard', async (_, data) => {
  const tempPath = `${timecardPath}.tmp`;
  try {
    // 一時ファイルに完全に書き込み
    await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    // アトミックにリネーム（OSレベルでアトミック操作）
    await fsPromises.rename(tempPath, timecardPath);
    return { success: true };
  } catch (error) {
    console.error('Failed to save timecard:', error);
    // 一時ファイルのクリーンアップ
    try {
      await fsPromises.unlink(tempPath);
    } catch (unlinkError) {
      // クリーンアップ失敗は無視（既に存在しない可能性）
    }
    return { success: false, error: String(error) };
  }
});

// Googleカレンダーからイベントを取得
ipcMain.handle('fetch-calendar-events', async (_, date?: string) => {
  const targetDate = date || getTodayDateString();
  return await fetchCalendarEvents(targetDate);
});

// HTTPサーバーの起動
function startHttpServer() {
  const httpApp = express();
  httpApp.use(express.json());

  httpApp.post('/api/todos', (req, res) => {
    const { taskcode, text } = req.body;

    // バリデーション
    // taskcodeは必須だが空文字列を許容
    if (typeof taskcode !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid taskcode' });
    }

    if (typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ success: false, error: 'Invalid text' });
    }

    // 全てのウィンドウにイベントを送信
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('add-todo-request', taskcode, text);
    });

    res.json({ success: true });
  });

  // 進行中のTodo停止API
  httpApp.post('/api/todos/stop-running', (_req, res) => {
    // 全てのウィンドウにイベントを送信
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('stop-running-todo-request');
    });
    res.json({ success: true });
  });

  // タイムカードチェックインAPI
  httpApp.post('/api/timecard/check-in', (_req, res) => {
    // 全てのウィンドウにイベントを送信
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('check-in-request');
    });
    res.json({ success: true });
  });

  // タイムカードチェックアウトAPI
  httpApp.post('/api/timecard/check-out', (_req, res) => {
    // 全てのウィンドウにイベントを送信
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('check-out-request');
    });
    res.json({ success: true });
  });

  const PORT = 3000;
  httpApp.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  startHttpServer();

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
