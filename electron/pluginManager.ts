import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { app } from 'electron';
import { AppSettings, DEFAULT_SETTINGS } from './types/settings';

/**
 * プラグインのコンテキスト（プラグインに渡すデータ）
 */
export interface PluginContext {
  event: 'timer-start';
  data: any; // ListItemのJSON表現
  log: (level: 'info' | 'warning' | 'error', message: string) => void;
  settings: AppSettings; // アプリケーション設定
}

/**
 * プラグインの定義
 */
export interface Plugin {
  name: string;
  onTimerStart?: (context: PluginContext) => Promise<void> | void;
  // 将来の拡張用
  onTimerStop?: (context: PluginContext) => Promise<void> | void;
  onTaskComplete?: (context: PluginContext) => Promise<void> | void;
}

/**
 * プラグインマネージャー
 * アプリ起動時にプラグインを読み込み、イベント発火時に実行する
 */
export class PluginManager {
  private plugins: Plugin[] = [];
  private pluginDir: string;
  private settingsPath: string;
  private settings: AppSettings;
  private onLogMessage?: (level: string, source: string, message: string) => void;

  constructor(onLogMessage?: (level: string, source: string, message: string) => void) {
    // プラグインディレクトリのパス: ~/.oreno-todo/plugins/
    const userDataDir = app.getPath('userData');
    const orenoTodoDir = path.join(path.dirname(userDataDir), 'oreno-todo');
    this.pluginDir = path.join(orenoTodoDir, 'plugins');
    this.settingsPath = path.join(orenoTodoDir, 'settings.json');
    this.settings = DEFAULT_SETTINGS;
    this.onLogMessage = onLogMessage;
  }

  /**
   * ログメッセージを記録
   */
  private log(level: string, source: string, message: string): void {
    console.log(`[${level.toUpperCase()}] ${source}: ${message}`);
    if (this.onLogMessage) {
      this.onLogMessage(level, source, message);
    }
  }

  /**
   * settings.jsonを読み込む
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsData = await fsPromises.readFile(this.settingsPath, 'utf-8');
      this.settings = JSON.parse(settingsData);
      this.log('info', 'plugin-system', `Settings loaded from ${this.settingsPath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // ファイルが存在しない場合はデフォルト設定を使用
        this.settings = DEFAULT_SETTINGS;
        this.log('info', 'plugin-system', 'settings.json not found, using default settings');
      } else {
        // パースエラーなど、その他のエラー
        this.settings = DEFAULT_SETTINGS;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log('warning', 'plugin-system', `Failed to load settings.json: ${errorMessage}, using default settings`);
      }
    }
  }

  /**
   * プラグインディレクトリから全ての.jsファイルを読み込む
   */
  async loadPlugins(): Promise<void> {
    try {
      // settings.jsonを読み込む
      await this.loadSettings();

      // 既存のプラグインをクリア（再読み込み時の重複を防ぐ）
      this.plugins = [];

      // ディレクトリが存在しない場合は作成
      await fsPromises.mkdir(this.pluginDir, { recursive: true });

      // .jsファイルを検索
      const files = await fsPromises.readdir(this.pluginDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));

      this.log('info', 'plugin-system', `Loading ${jsFiles.length} plugin(s)`);

      for (const file of jsFiles) {
        const pluginPath = path.join(this.pluginDir, file);
        try {
          // require()でプラグインを動的に読み込む
          // ESMではなくCommonJS形式を想定
          const plugin = require(pluginPath) as Plugin;

          // 最低限のバリデーション
          if (!plugin.name) {
            this.log('error', 'plugin-system', `Plugin ${file} does not have a name property`);
            continue;
          }

          this.plugins.push(plugin);
          this.log('info', 'plugin-system', `Loaded plugin: ${plugin.name}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log('error', file, `Failed to load: ${errorMessage}`);
          // エラーが起きても他のプラグインの読み込みは継続
        }
      }

      // プラグイン読み込み完了を報告（0個の場合も含めて必ず表示）
      this.log('info', 'plugin-system', `Successfully loaded ${this.plugins.length} plugin(s)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', 'plugin-system', `Failed to load plugins: ${errorMessage}`);
      // プラグイン読み込み失敗はアプリ全体の動作を止めない
    }
  }

  /**
   * タイマー開始イベントを全てのプラグインに通知
   */
  async notifyTimerStart(itemData: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onTimerStart) {
        const context: PluginContext = {
          event: 'timer-start',
          data: itemData,
          log: (level, message) => this.log(level, plugin.name, message),
          settings: this.settings,
        };
        try {
          await Promise.resolve(plugin.onTimerStart(context));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log('error', plugin.name, `Failed on timer-start: ${errorMessage}`);
          // エラーが起きても他のプラグインの実行は継続
        }
      }
    }
  }

  /**
   * タイマー停止イベントを全てのプラグインに通知（将来の拡張用）
   */
  async notifyTimerStop(itemData: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onTimerStop) {
        const context: PluginContext = {
          event: 'timer-start', // TODO: 'timer-stop'に修正
          data: itemData,
          log: (level, message) => this.log(level, plugin.name, message),
          settings: this.settings,
        };
        try {
          await Promise.resolve(plugin.onTimerStop(context));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log('error', plugin.name, `Failed on timer-stop: ${errorMessage}`);
        }
      }
    }
  }
}
