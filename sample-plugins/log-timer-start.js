const fs = require('fs');
const path = require('path');

/**
 * タイマー開始時にLogseq形式でログファイルに記録するプラグイン
 */

// 日時を JST フォーマットで取得
function getJSTTimeString() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒に変換
  const jstTime = new Date(now.getTime() + jstOffset);

  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  const hours = String(jstTime.getUTCHours()).padStart(2, '0');
  const minutes = String(jstTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jstTime.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 今日の日付を YYYY_MM_DD 形式で取得
function getTodayDateString() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒に変換
  const jstTime = new Date(now.getTime() + jstOffset);

  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');

  return `${year}_${month}_${day}`;
}

// ログエントリーを作成（Logseq形式）
function createLogEntry(data) {
  // Logseq形式: ## [#]([[id]]) content #taskcode
  let entry = '\n\n- ## ';
  entry += `[#]([[${data.id}]]) `;
  entry += data.text;
  if (data.taskcode) {
    entry += ` #${data.taskcode}`;
  }
  entry += '\n\t- \n';

  return entry;
}

// ファイルに同一IDのエントリが存在するかチェック
function isDuplicateEntry(filePath, id) {
  try {
    // ファイルが存在しない場合は重複なし
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // ファイルを読み込む
    const content = fs.readFileSync(filePath, 'utf-8');

    // 行ごとにチェック（前方一致で確認）
    const lines = content.split('\n');
    const searchPattern = `- ## [#]([[${id}]]) `;

    for (const line of lines) {
      if (line.startsWith(searchPattern)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // エラー時は重複なしとして扱う
    return false;
  }
}

module.exports = {
  name: 'log-timer-start',

  /**
   * タイマー開始時の処理
   * @param {Object} context - プラグインコンテキスト
   * @param {string} context.event - イベント名（'timer-start'）
   * @param {Object} context.data - ListItemのJSONデータ
   * @param {Object} context.settings - アプリケーション設定
   */
  onTimerStart: async (context) => {
    try {
      // settings.logFilePathからログファイルパスを取得
      if (!context.settings || !context.settings.logFilePath) {
        context.log('error', 'logFilePath is not configured in settings.json');
        return;
      }

      // {YYYY_MM_DD}プレースホルダーを置換
      let logFilePath = context.settings.logFilePath.replace('{YYYY_MM_DD}', getTodayDateString());

      // ~をホームディレクトリに展開
      if (logFilePath.startsWith('~')) {
        const os = require('os');
        logFilePath = path.join(os.homedir(), logFilePath.slice(1));
      }

      // 重複チェック
      if (isDuplicateEntry(logFilePath, context.data.id)) {
        context.log('info', `Entry with ID ${context.data.id} already exists, skipping`);
        return;
      }

      // Logseqエントリを生成
      const logEntry = createLogEntry(context.data);

      // ログファイルに追記（ディレクトリが存在しない場合は作成）
      const logDir = path.dirname(logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(logFilePath, logEntry, 'utf-8');

      context.log('info', `Log entry created: ${context.data.text}`);
    } catch (error) {
      context.log('error', `Error: ${error}`);
    }
  }
};
