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

  constructor() {
    // プラグインディレクトリのパス: ~/.oreno-todo/plugins/
    const userDataDir = app.getPath('userData');
    const orenoTodoDir = path.join(path.dirname(userDataDir), 'oreno-todo');
    this.pluginDir = path.join(orenoTodoDir, 'plugins');
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

      console.log(`Loading ${jsFiles.length} plugin(s) from ${this.pluginDir}`);

      for (const file of jsFiles) {
        const pluginPath = path.join(this.pluginDir, file);
        try {
          // require()でプラグインを動的に読み込む
          // ESMではなくCommonJS形式を想定
          const plugin = require(pluginPath) as Plugin;

          // 最低限のバリデーション
          if (!plugin.name) {
            console.error(`Plugin ${file} does not have a name property. Skipping.`);
            continue;
          }

          this.plugins.push(plugin);
          console.log(`Loaded plugin: ${plugin.name} (${file})`);
        } catch (error) {
          console.error(`Failed to load plugin ${file}:`, error);
          // エラーが起きても他のプラグインの読み込みは継続
        }
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
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
          console.error(`Plugin ${plugin.name} failed on timer-start:`, error);
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
          console.error(`Plugin ${plugin.name} failed on timer-stop:`, error);
        }
      }
    }
  }
}
