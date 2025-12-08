/**
 * Google Calendar API連携モジュール（Main Process用）
 *
 * 認証情報の設定:
 *   環境変数で設定:
 *     export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
 *     export GOOGLE_CLIENT_SECRET="your-client-secret"
 *
 *   または、設定ファイルで設定:
 *     ~/.google-calendar-credentials.json に以下の形式で保存:
 *     {
 *       "installed": {
 *         "client_id": "your-client-id",
 *         "client_secret": "your-client-secret",
 *         "redirect_uris": ["http://localhost:3456/oauth2callback"]
 *       }
 *     }
 */

import { google, calendar_v3 } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

// 設定
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = path.join(os.homedir(), '.google-calendar-token.json');
const CREDENTIALS_PATH = path.join(os.homedir(), '.google-calendar-credentials.json');
// HTTPサーバーが3000を使用しているため、別のポートを使用
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

interface Credentials {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
}

interface Token {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expiry_date?: number;
}

/**
 * 認証情報を読み込む
 */
async function loadCredentials(): Promise<Credentials> {
  // 1. 環境変数から読み込み
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Google Calendar: 環境変数から認証情報を読み込みました');
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
    };
  }

  // 2. ファイルから読み込み
  try {
    const content = await fsPromises.readFile(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    if (credentials.installed) {
      console.log('Google Calendar: 設定ファイルから認証情報を読み込みました');
      return credentials.installed;
    }
    console.log('Google Calendar: 設定ファイルから認証情報を読み込みました');
    return credentials;
  } catch {
    throw new Error(
      `Google Calendar認証情報が見つかりません。\n\n` +
        `以下のいずれかの方法で設定してください:\n\n` +
        `【方法1】環境変数で設定:\n` +
        `  export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"\n` +
        `  export GOOGLE_CLIENT_SECRET="your-client-secret"\n\n` +
        `【方法2】設定ファイル (${CREDENTIALS_PATH}) で設定:\n` +
        `  {\n` +
        `    "installed": {\n` +
        `      "client_id": "your-client-id",\n` +
        `      "client_secret": "your-client-secret",\n` +
        `      "redirect_uris": ["${REDIRECT_URI}"]\n` +
        `    }\n` +
        `  }\n`
    );
  }
}

/**
 * 保存されたトークンを読み込む
 */
async function loadToken(): Promise<Token | null> {
  try {
    const content = await fsPromises.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * トークンを保存する
 */
async function saveToken(token: Token): Promise<void> {
  await fsPromises.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log(`Google Calendar: トークンを保存しました: ${TOKEN_PATH}`);
}

/**
 * ブラウザを開く
 */
function openBrowser(url: string): void {
  const platform = os.platform();
  let command: string;

  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(
        `Google Calendar: ブラウザを自動で開けませんでした。以下のURLを手動で開いてください:\n${url}\n`
      );
    }
  });
}

/**
 * OAuth認証を実行
 */
function authenticate(
  oAuth2Client: InstanceType<typeof google.auth.OAuth2>
): Promise<Token> {
  return new Promise((resolve, reject) => {
    // 認証URLを生成
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    console.log(
      'Google Calendar: 認証が必要です。ブラウザで認証を行ってください...'
    );

    // ローカルサーバーを起動してコールバックを受け取る
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${REDIRECT_PORT}`);

        if (url.pathname === '/oauth2callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h1>認証エラー</h1><p>${error}</p>`);
            server.close();
            reject(new Error(`認証エラー: ${error}`));
            return;
          }

          if (code) {
            // 認証コードでトークンを取得
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            // トークンを保存
            await saveToken(tokens as Token);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>認証成功!</h1>
                  <p>このウィンドウを閉じて、アプリケーションに戻ってください。</p>
                </body>
              </html>
            `);

            server.close();
            resolve(tokens as Token);
          }
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<h1>エラー</h1><p>${err instanceof Error ? err.message : String(err)}</p>`
        );
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(
        `Google Calendar: 認証コールバックサーバーを起動しました (ポート: ${REDIRECT_PORT})`
      );
      openBrowser(authUrl);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `ポート ${REDIRECT_PORT} が使用中です。他のプロセスを終了してから再試行してください。`
          )
        );
      } else {
        reject(err);
      }
    });

    // タイムアウト (5分)
    setTimeout(() => {
      server.close();
      reject(new Error('認証がタイムアウトしました (5分)'));
    }, 5 * 60 * 1000);
  });
}

/**
 * OAuth2クライアントを初期化して認証済みクライアントを返す
 */
async function getAuthenticatedClient(): Promise<
  InstanceType<typeof google.auth.OAuth2>
> {
  const credentials = await loadCredentials();

  const oAuth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris?.[0] || REDIRECT_URI
  );

  // 保存されたトークンがあれば使用
  const token = await loadToken();
  if (token) {
    oAuth2Client.setCredentials(token);

    // トークンの有効性を確認
    try {
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      await calendar.calendarList.list({ maxResults: 1 });
      console.log('Google Calendar: 既存のトークンで認証しました');
      return oAuth2Client;
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 401 || err.code === 403) {
        console.log(
          'Google Calendar: トークンが期限切れです。再認証が必要です...'
        );
      } else {
        throw error;
      }
    }
  }

  // 新規認証
  await authenticate(oAuth2Client);
  return oAuth2Client;
}

/**
 * カレンダーイベントを取得
 */
async function fetchEvents(
  auth: InstanceType<typeof google.auth.OAuth2>,
  date: string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = google.calendar({ version: 'v3', auth });

  // 日付の範囲を設定（JST）
  const timeMin = new Date(`${date}T00:00:00+09:00`).toISOString();
  const timeMax = new Date(`${date}T23:59:59+09:00`).toISOString();

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  return response.data.items || [];
}

/**
 * Googleカレンダーイベントをアプリで使用する形式に変換
 */
function convertToCalendarEvent(
  event: calendar_v3.Schema$Event
): CalendarEventData {
  return {
    kind: event.kind || 'calendar#event',
    etag: event.etag || '',
    id: event.id || '',
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink || '',
    created: event.created || '',
    updated: event.updated || '',
    summary: event.summary || '',
    description: event.description,
    location: event.location,
    creator: {
      email: event.creator?.email || '',
      self: event.creator?.self,
    },
    organizer: {
      email: event.organizer?.email || '',
      self: event.organizer?.self,
    },
    start: {
      dateTime: event.start?.dateTime,
      date: event.start?.date,
      timeZone: event.start?.timeZone,
    },
    end: {
      dateTime: event.end?.dateTime,
      date: event.end?.date,
      timeZone: event.end?.timeZone,
    },
    iCalUID: event.iCalUID || '',
    sequence: event.sequence || 0,
    attendees: event.attendees?.map((a) => ({
      email: a.email || '',
      responseStatus: a.responseStatus || '',
      optional: a.optional ?? undefined,
    })),
    reminders: event.reminders
      ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map((o) => ({
            method: o.method || '',
            minutes: o.minutes || 0,
          })),
        }
      : undefined,
    transparency: event.transparency,
    eventType: event.eventType || 'default',
  };
}

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
 * 指定した日付のGoogleカレンダーイベントを取得する
 * @param date YYYY-MM-DD形式の日付文字列
 */
export async function fetchCalendarEvents(
  date: string
): Promise<FetchCalendarEventsResult> {
  try {
    const auth = await getAuthenticatedClient();
    const events = await fetchEvents(auth, date);
    const convertedEvents = events.map(convertToCalendarEvent);

    console.log(
      `Google Calendar: ${date} のイベントを ${convertedEvents.length} 件取得しました`
    );

    return {
      success: true,
      events: convertedEvents,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'カレンダーの取得に失敗しました';
    console.error('Google Calendar エラー:', error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}
