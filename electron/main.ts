import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import express from 'express';
import { fetchCalendarEvents, getTodayDateString } from './googleCalendar';
import { TimecardRepository } from '../src/models/TimecardRepository';

const isDev = !app.isPackaged;
const dataPath = path.join(app.getPath('userData'), 'todos.json');
const timecardPath = path.join(app.getPath('userData'), 'timecard.json');
const projectDefinitionsPath = path.join(app.getPath('userData'), 'project-definitions.json');

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

// プロジェクト定義の読み込み
ipcMain.handle('load-project-definitions', async () => {
  try {
    const data = await fsPromises.readFile(projectDefinitionsPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    // ファイルが存在しない場合は空オブジェクトを返す
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    // JSON パースエラーの場合はバックアップを作成
    if (error instanceof SyntaxError) {
      console.error('Project definitions JSON parse error, creating backup');
      try {
        const backupPath = `${projectDefinitionsPath}.backup.${Date.now()}`;
        await fsPromises.copyFile(projectDefinitionsPath, backupPath);
        console.log(`Backup created at: ${backupPath}`);
      } catch (backupError) {
        console.error('Failed to create backup:', backupError);
      }
    }

    console.error('Failed to load project definitions:', error);
    return {};
  }
});

// プロジェクト定義の保存（アトミックな書き込み）
ipcMain.handle('save-project-definitions', async (_, data) => {
  const tempPath = `${projectDefinitionsPath}.tmp`;
  try {
    // 一時ファイルに完全に書き込み
    await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    // アトミックにリネーム（OSレベルでアトミック操作）
    await fsPromises.rename(tempPath, projectDefinitionsPath);
    return { success: true };
  } catch (error) {
    console.error('Failed to save project definitions:', error);
    // 一時ファイルのクリーンアップ
    try {
      await fsPromises.unlink(tempPath);
    } catch (unlinkError) {
      // クリーンアップ失敗は無視（既に存在しない可能性）
    }
    return { success: false, error: String(error) };
  }
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

  // 今日のタイムカード取得API
  httpApp.get('/api/timecard/today', async (req, res) => {
    try {
      // 1. クエリパラメータからdateを取得（省略時は getTodayDateString() を使用）
      const date = (req.query.date as string) || getTodayDateString();

      // 日付フォーマットの簡易検証（YYYY-MM-DD形式）
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Expected YYYY-MM-DD'
        });
      }

      // 2. タイムカードデータを読み込む
      let timecardDataJSON;
      try {
        const data = await fsPromises.readFile(timecardPath, 'utf-8');
        timecardDataJSON = JSON.parse(data);
      } catch (error) {
        // ファイルが存在しない場合は空オブジェクト
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          timecardDataJSON = {};
        } else {
          throw error;
        }
      }

      // 3. TimecardRepository.fromJSON() でデータ復元
      const timecardData = TimecardRepository.fromJSON(timecardDataJSON);

      // 4. TimecardRepository.getEntriesForDateAsJSON() で指定日付のエントリ取得
      const entries = TimecardRepository.getEntriesForDateAsJSON(timecardData, date);

      // 5. エントリ配列を直接返却
      res.json(entries);
    } catch (error) {
      console.error('Failed to get timecard entries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get timecard entries'
      });
    }
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
