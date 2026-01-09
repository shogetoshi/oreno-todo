const fs = require('fs');
const path = require('path');

/**
 * タイマー開始時にログファイルに記録するプラグイン
 */
module.exports = {
  name: 'log-timer-start',

  /**
   * タイマー開始時の処理
   * @param {Object} context - プラグインコンテキスト
   * @param {string} context.event - イベント名（'timer-start'）
   * @param {Object} context.data - ListItemのJSONデータ
   */
  onTimerStart: async (context) => {
    try {
      const item = context.data;

      // タイムスタンプ（開始時刻）を取得
      // timeRangesの最後の要素のstartが開始時刻
      let timestamp = '';
      if (item.timeRanges && item.timeRanges.length > 0) {
        const lastRange = item.timeRanges[item.timeRanges.length - 1];
        timestamp = lastRange.start || '';
      }

      // タスクコードとテキストを取得
      const taskcode = item.taskcode || '';
      const text = item.text || '';

      // タブ区切りのログ行を生成
      const logLine = `${timestamp}\t${taskcode}\t${text}\n`;

      // ログファイルに追記
      const logPath = '/tmp/oreno-todo-log.txt';
      fs.appendFileSync(logPath, logLine, 'utf8');

      console.log(`[log-timer-start] Logged: ${logLine.trim()}`);
    } catch (error) {
      console.error('[log-timer-start] Error:', error);
      // エラーをスローしても他のプラグインやメイン処理には影響しない
    }
  }
};
