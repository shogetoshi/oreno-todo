import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { app } from 'electron';

/**
 * プラグインのコンテキスト（プラグインに渡すデータ）
 */
export interface PluginContext {
  event: 'timer-start';
  data: any; // ListItemのJSON表現
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
  private onLogMessage?: (level: string, source: string, message: string) => void;

  constructor(onLogMessage?: (level: string, source: string, message: string) => void) {
    // プラグインディレクトリのパス: ~/.oreno-todo/plugins/
    const userDataDir = app.getPath('userData');
    const orenoTodoDir = path.join(path.dirname(userDataDir), 'oreno-todo');
    this.pluginDir = path.join(orenoTodoDir, 'plugins');
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
   * プラグインディレクトリから全ての.jsファイルを読み込む
   */
  async loadPlugins(): Promise<void> {
    try {
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
    const context: PluginContext = {
      event: 'timer-start',
      data: itemData
    };

    for (const plugin of this.plugins) {
      if (plugin.onTimerStart) {
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
    const context: PluginContext = {
      event: 'timer-start', // TODO: 'timer-stop'に修正
      data: itemData
    };

    for (const plugin of this.plugins) {
      if (plugin.onTimerStop) {
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
