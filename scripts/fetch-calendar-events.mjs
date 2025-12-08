#!/usr/bin/env node
/**
 * Google Calendar イベント取得 CLI
 *
 * 使い方:
 *   node scripts/fetch-calendar-events.mjs [日付]
 *
 * 例:
 *   node scripts/fetch-calendar-events.mjs           # 今日の予定を取得
 *   node scripts/fetch-calendar-events.mjs 2025-01-15  # 指定日の予定を取得
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
 *
 * 出力:
 *   成功時: { "success": true, "events": [...] }
 *   失敗時: { "success": false, "error": "エラーメッセージ" }
 */

import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

// 設定
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = path.join(os.homedir(), '.google-calendar-token.json');
const CREDENTIALS_PATH = path.join(os.homedir(), '.google-calendar-credentials.json');
// HTTPサーバーが3000を使用しているため、別のポートを使用
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// stderrにログを出力（stdoutはJSONのみ）
function log(message) {
  console.error(message);
}

/**
 * 認証情報を読み込む
 */
async function loadCredentials() {
  // 1. 環境変数から読み込み
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    log('Google Calendar: 環境変数から認証情報を読み込みました');
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI]
    };
  }

  // 2. ファイルから読み込み
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    if (credentials.installed) {
      log('Google Calendar: 設定ファイルから認証情報を読み込みました');
      return credentials.installed;
    }
    log('Google Calendar: 設定ファイルから認証情報を読み込みました');
    return credentials;
  } catch (error) {
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
async function loadToken() {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * トークンを保存する
 */
async function saveToken(token) {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
  log(`Google Calendar: トークンを保存しました: ${TOKEN_PATH}`);
}

/**
 * ブラウザを開く
 */
function openBrowser(url) {
  const platform = os.platform();
  let command;

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
      log(`Google Calendar: ブラウザを自動で開けませんでした。以下のURLを手動で開いてください:\n${url}\n`);
    }
  });
}

/**
 * OAuth認証を実行
 */
async function authenticate(oAuth2Client) {
  return new Promise((resolve, reject) => {
    // 認証URLを生成
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    log('Google Calendar: 認証が必要です。ブラウザで認証を行ってください...');

    // ローカルサーバーを起動してコールバックを受け取る
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);

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
            await saveToken(tokens);

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
            resolve(tokens);
          }
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>エラー</h1><p>${err.message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      log(`Google Calendar: 認証コールバックサーバーを起動しました (ポート: ${REDIRECT_PORT})`);
      openBrowser(authUrl);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`ポート ${REDIRECT_PORT} が使用中です。他のプロセスを終了してから再試行してください。`));
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
 * OAuth2クライアントを初期化
 */
async function getAuthenticatedClient() {
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
      log('Google Calendar: 既存のトークンで認証しました');
      return oAuth2Client;
    } catch (error) {
      if (error.code === 401 || error.code === 403) {
        log('Google Calendar: トークンが期限切れです。再認証が必要です...');
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
async function fetchEvents(auth, date) {
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
    maxResults: 100
  });

  return response.data.items || [];
}

/**
 * イベントをアプリ形式に変換
 */
function convertEvent(event) {
  return {
    kind: event.kind || 'calendar#event',
    etag: event.etag || '',
    id: event.id || '',
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink || '',
    created: event.created || '',
    updated: event.updated || '',
    summary: event.summary || '',
    description: event.description || null,
    location: event.location || null,
    creator: {
      email: event.creator?.email || '',
      self: event.creator?.self
    },
    organizer: {
      email: event.organizer?.email || '',
      self: event.organizer?.self
    },
    start: {
      dateTime: event.start?.dateTime || null,
      date: event.start?.date || null,
      timeZone: event.start?.timeZone || null
    },
    end: {
      dateTime: event.end?.dateTime || null,
      date: event.end?.date || null,
      timeZone: event.end?.timeZone || null
    },
    iCalUID: event.iCalUID || '',
    sequence: event.sequence || 0,
    attendees: event.attendees?.map(a => ({
      email: a.email || '',
      responseStatus: a.responseStatus || '',
      optional: a.optional || undefined
    })),
    reminders: event.reminders ? {
      useDefault: event.reminders.useDefault || false,
      overrides: event.reminders.overrides?.map(o => ({
        method: o.method || '',
        minutes: o.minutes || 0
      }))
    } : undefined,
    transparency: event.transparency || null,
    eventType: event.eventType || 'default'
  };
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayDateString() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  const date = dateArg || getTodayDateString();

  try {
    const auth = await getAuthenticatedClient();
    const events = await fetchEvents(auth, date);
    const convertedEvents = events.map(convertEvent);

    log(`Google Calendar: ${date} のイベントを ${convertedEvents.length} 件取得しました`);

    // JSON出力（stdoutへ）
    console.log(JSON.stringify({
      success: true,
      events: convertedEvents
    }));

  } catch (error) {
    // エラー時もJSON出力
    console.log(JSON.stringify({
      success: false,
      error: error.message || 'カレンダーの取得に失敗しました'
    }));
    process.exit(1);
  }
}

// 実行
main();
