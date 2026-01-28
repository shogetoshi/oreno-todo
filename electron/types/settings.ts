/**
 * アプリケーション設定の型定義
 */
export interface AppSettings {
  config: {
    logFilePath: string;
  };
}

/**
 * デフォルト設定
 */
export const DEFAULT_SETTINGS: AppSettings = {
  config: {
    logFilePath: '~/oreno-todo-logs/{YYYY_MM_DD}.md'
  }
};
