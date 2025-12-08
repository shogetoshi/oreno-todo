/**
 * Google Calendar API連携モジュール（Main Process用）
 * CLIスクリプトをサブプロセスとして実行し、結果を取得する
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { app } from 'electron';

// アプリで使用するカレンダーイベントの型
export interface CalendarEventData {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  creator: {
    email: string;
    self?: boolean;
  };
  organizer: {
    email: string;
    self?: boolean;
  };
  start: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  iCalUID: string;
  sequence: number;
  attendees?: Array<{
    email: string;
    responseStatus: string;
    optional?: boolean;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  transparency?: string | null;
  eventType: string;
}

export interface FetchCalendarEventsResult {
  success: boolean;
  events?: CalendarEventData[];
  error?: string;
}

/**
 * CLIスクリプトのパスを取得
 */
function getScriptPath(): string {
  const isDev = !app.isPackaged;

  if (isDev) {
    // 開発時: プロジェクトルートのscriptsディレクトリ
    return path.join(__dirname, '..', '..', 'scripts', 'fetch-calendar-events.mjs');
  } else {
    // パッケージ時: app.asarの外のscriptsディレクトリ
    // electron-builderでextraResourcesとしてコピーされる前提
    return path.join(process.resourcesPath, 'scripts', 'fetch-calendar-events.mjs');
  }
}

/**
 * 指定した日付のGoogleカレンダーイベントを取得する
 * @param date YYYY-MM-DD形式の日付文字列
 */
export async function fetchCalendarEvents(
  date: string
): Promise<FetchCalendarEventsResult> {
  return new Promise((resolve) => {
    const scriptPath = getScriptPath();
    console.log(`Google Calendar: スクリプト実行: ${scriptPath} ${date}`);

    const child = spawn('node', [scriptPath, date], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Node.jsのパスを引き継ぐ
        PATH: process.env.PATH,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      // stderrはログとしてコンソールに出力
      console.log(`Google Calendar: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`Google Calendar: プロセス終了 (code: ${code})`);

      if (stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (parseError) {
          console.error('Google Calendar: JSON解析エラー:', parseError);
          console.error('stdout:', stdout);
          resolve({
            success: false,
            error: 'カレンダーデータの解析に失敗しました',
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr.trim() || 'カレンダーの取得に失敗しました',
        });
      }
    });

    child.on('error', (err) => {
      console.error('Google Calendar: プロセスエラー:', err);
      resolve({
        success: false,
        error: `プロセスの実行に失敗しました: ${err.message}`,
      });
    });
  });
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}
