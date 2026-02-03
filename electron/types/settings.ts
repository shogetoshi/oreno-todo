/**
 * アプリケーション設定の型定義
 * プラグイン名をキーとして、各プラグインの設定を保持
 */
export interface AppSettings {
  [pluginName: string]: any;
}

/**
 * デフォルト設定（空オブジェクト）
 */
export const DEFAULT_SETTINGS: AppSettings = {};
