# プラグインシステムの実装計画

## 処理フロー分析

### タスクの計測開始の処理フロー

1. **View層** (`src/App.tsx`等)
   - ユーザーがタイマー開始ボタンをクリック

2. **Controller層** (`src/hooks/useTodos.ts`)
   - `startTimer(id)` 関数が呼び出される（115-117行目）
   - `setTodosWithPersist`経由で`TodoRepository.startItemTimerExclusive(prev, id)`を実行
   - この関数は楽観的更新を行い、UI更新→IPC経由で保存を実行

3. **Model層** (`src/models/TodoRepository.ts`)
   - `startItemTimerExclusive(items, id)` メソッド（153-156行目）
     - `stopAllRunningItems(items)` で他の実行中タイマーを停止
     - `startItemTimer(itemsWithStoppedTimers, id)` で指定IDのタイマーを開始
   - `startItemTimer(items, id)` メソッド（108-112行目）
     - 指定IDのListItemの`startTimer()`メソッドを呼び出す

4. **Entity層** (`src/models/Todo.ts`, `src/models/CalendarEvent.ts`)
   - `Todo.startTimer()` メソッド（118-126行目）
     - 新しい`TimeRange`を追加（`start`に現在時刻、`end`はnull）
     - 新しいTodoインスタンスを返す（イミュータブル）

### プラグイン実行ポイント

**最適な実行ポイント**: `useTodos.ts`の`startTimer`関数内

理由:
- UI操作とHTTPエンドポイント経由の操作が合流する最初の地点
- Model層のビジネスロジック実行直前
- 実際にタイマーが開始される直前（楽観的更新の前）
- タイマー開始対象のListItemデータにアクセス可能

---

## 実装計画

### Phase 1: プラグインシステムの基盤実装

#### 1.1 プラグインマネージャーの作成

**新規ファイル**: `electron/pluginManager.ts`

```typescript
import * as path from 'path';
import * as fs from 'fs';
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
```

#### 1.2 Main Processでのプラグイン初期化

**変更ファイル**: `electron/main.ts`

変更箇所1: インポート追加（1-6行目付近）
```typescript
import { PluginManager } from './pluginManager';
```

変更箇所2: グローバル変数の追加（8行目付近）
```typescript
const isDev = !app.isPackaged;
const dataPath = path.join(app.getPath('userData'), 'todos.json');
const timecardPath = path.join(app.getPath('userData'), 'timecard.json');
const projectDefinitionsPath = path.join(app.getPath('userData'), 'project-definitions.json');

// プラグインマネージャー
let pluginManager: PluginManager;
```

変更箇所3: アプリ起動時にプラグインを読み込む（296-305行目付近）
```typescript
app.whenReady().then(async () => {
  // プラグインマネージャーを初期化
  pluginManager = new PluginManager();
  await pluginManager.loadPlugins();

  createWindow();
  startHttpServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
```

変更箇所4: 新しいIPCハンドラーの追加（136行目付近、`fetch-calendar-events`の後）
```typescript
// プラグインにタイマー開始を通知
ipcMain.handle('notify-timer-start', async (_, itemData) => {
  if (pluginManager) {
    await pluginManager.notifyTimerStart(itemData);
  }
  return { success: true };
});
```

#### 1.3 Preload ScriptでのAPI公開

**変更ファイル**: `electron/preload.ts`

変更箇所: APIメソッドの追加（4-24行目）
```typescript
const electronAPI: ElectronAPI = {
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  onAddTodoRequest: (callback) => {
    ipcRenderer.on('add-todo-request', (_event, taskcode, text) => callback(taskcode, text));
  },
  onStopRunningTodoRequest: (callback) => {
    ipcRenderer.on('stop-running-todo-request', () => callback());
  },
  loadTimecard: () => ipcRenderer.invoke('load-timecard'),
  saveTimecard: (data) => ipcRenderer.invoke('save-timecard', data),
  onCheckInRequest: (callback) => {
    ipcRenderer.on('check-in-request', () => callback());
  },
  onCheckOutRequest: (callback) => {
    ipcRenderer.on('check-out-request', () => callback());
  },
  fetchCalendarEvents: (date) => ipcRenderer.invoke('fetch-calendar-events', date),
  loadProjectDefinitions: () => ipcRenderer.invoke('load-project-definitions'),
  saveProjectDefinitions: (data) => ipcRenderer.invoke('save-project-definitions', data),
  // プラグイン通知用API
  notifyTimerStart: (itemData) => ipcRenderer.invoke('notify-timer-start', itemData),
};
```

#### 1.4 TypeScript型定義の追加

**変更ファイル**: `src/types/electron.d.ts`

変更箇所: ElectronAPIインターフェースにメソッド追加（13-25行目）
```typescript
export interface ElectronAPI {
  loadTodos: () => Promise<any[]>;
  saveTodos: (todos: any[]) => Promise<{ success: boolean; error?: string }>;
  onAddTodoRequest: (callback: (taskcode: string, text: string) => void) => void;
  onStopRunningTodoRequest: (callback: () => void) => void;
  loadTimecard: () => Promise<TimecardDataJSON>;
  saveTimecard: (data: TimecardDataJSON) => Promise<{ success: boolean; error?: string }>;
  onCheckInRequest: (callback: () => void) => void;
  onCheckOutRequest: (callback: () => void) => void;
  fetchCalendarEvents: (date?: string) => Promise<FetchCalendarEventsResult>;
  loadProjectDefinitions: () => Promise<any>;
  saveProjectDefinitions: (data: any) => Promise<{ success: boolean; error?: string }>;
  // プラグイン通知用API
  notifyTimerStart: (itemData: any) => Promise<{ success: boolean }>;
}
```

#### 1.5 Controller層でプラグイン通知を実行

**変更ファイル**: `src/hooks/useTodos.ts`

変更箇所: `startTimer`関数の修正（114-117行目）
```typescript
// タイマーを開始（他の実行中タイマーは自動停止）
const startTimer = useCallback(async (id: string) => {
  // プラグインに通知するために、開始前のListItemデータを取得
  const targetItem = todos.find(item => item.getId() === id);

  // タイマー開始処理を実行（楽観的更新）
  setTodosWithPersist((prev) => TodoRepository.startItemTimerExclusive(prev, id));

  // プラグインにタイマー開始を通知（非同期、エラーは無視）
  if (targetItem) {
    window.electronAPI.notifyTimerStart(targetItem.toJSON()).catch(error => {
      console.error('Failed to notify plugins:', error);
    });
  }
}, [setTodosWithPersist, todos]);
```

---

### Phase 2: サンプルプラグインの作成

#### 2.1 サンプルプラグインディレクトリの作成

**新規ディレクトリ**: `sample-plugins/`

#### 2.2 ログ出力プラグインの作成

**新規ファイル**: `sample-plugins/log-timer-start.js`

```javascript
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
```

#### 2.3 サンプルプラグインのREADME

**新規ファイル**: `sample-plugins/README.md`

```markdown
# サンプルプラグイン

このディレクトリにはプラグインのサンプルコードが含まれています。

## プラグインの配置場所

実際にプラグインを使用する場合は、以下のディレクトリに`.js`ファイルを配置してください。

- macOS: `~/Library/Application Support/oreno-todo/plugins/`
- Windows: `%APPDATA%/oreno-todo/plugins/`
- Linux: `~/.config/oreno-todo/plugins/`

**注意**: このリポジトリの`sample-plugins/`ディレクトリは参考用です。実際の実行には上記のディレクトリを使用してください。

## プラグインのインストール方法

1. プラグインディレクトリを作成（存在しない場合）

```bash
# macOS/Linux
mkdir -p ~/.config/oreno-todo/plugins/

# Windows（PowerShell）
New-Item -ItemType Directory -Force -Path "$env:APPDATA\oreno-todo\plugins"
```

2. プラグインファイルをコピー

```bash
# macOS/Linux
cp sample-plugins/log-timer-start.js ~/.config/oreno-todo/plugins/

# Windows（PowerShell）
Copy-Item sample-plugins\log-timer-start.js "$env:APPDATA\oreno-todo\plugins\"
```

3. アプリケーションを再起動

プラグインはアプリ起動時に読み込まれるため、再起動が必要です。

## log-timer-start.js

タイマー開始時に`/tmp/oreno-todo-log.txt`へタブ区切りでログを記録します。

**出力フォーマット**:
```
2026-01-09 10:30:00	TASK-001	タスク名
2026-01-09 11:00:00	TASK-002	別のタスク
```

## プラグインAPI仕様

### モジュール構造

```javascript
module.exports = {
  name: 'plugin-name',
  onTimerStart: async (context) => {
    // タイマー開始時の処理
  }
};
```

### コンテキストオブジェクト

```typescript
interface PluginContext {
  event: 'timer-start';
  data: {
    id: string;
    type: 'todo' | 'calendar_event';
    taskcode: string;
    text: string;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    timeRanges: Array<{
      start: string;
      end: string | null;
    }>;
    // calendar_eventの場合の追加フィールド
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
  };
}
```

### エラーハンドリング

プラグイン内で発生したエラーは自動的にキャッチされ、ログ出力されます。
メイン処理（タイマー開始）は中断されません。

### 将来の拡張

現在は`onTimerStart`のみサポートされていますが、将来的に以下のイベントが追加される予定です。

- `onTimerStop`: タイマー停止時
- `onTaskComplete`: タスク完了時
```

---

### Phase 3: ドキュメント更新

#### 3.1 CLAUDE.mdの更新

**変更ファイル**: `CLAUDE.md`

変更箇所: 「## プロジェクト概要」セクションの後に新しいセクションを追加

```markdown
## プラグインシステム

アプリケーションは、計測開始時などのイベントに対して任意の処理を実行できるプラグインシステムを提供しています。

### プラグイン配置場所

- macOS: `~/Library/Application Support/oreno-todo/plugins/`
- Windows: `%APPDATA%/oreno-todo/plugins/`
- Linux: `~/.config/oreno-todo/plugins/`

ディレクトリ内の`.js`ファイルが自動的に読み込まれます。

### プラグイン実行タイミング

- **アプリ起動時**: `electron/main.ts`の`app.whenReady()`でプラグインを読み込む
- **計測開始時**: `src/hooks/useTodos.ts`の`startTimer`関数内でプラグインに通知

### プラグインの実装

プラグインはCommonJS形式のJavaScriptモジュールとして実装します。

```javascript
module.exports = {
  name: 'my-plugin',
  onTimerStart: async (context) => {
    // context.data にListItemのJSONデータが格納されている
    console.log('Timer started for:', context.data.text);
  }
};
```

詳細は`sample-plugins/README.md`を参照してください。

### アーキテクチャ上の位置付け

プラグインシステムはController層（`useTodos`）からMain Process（`pluginManager`）への通知として実装されています。
プラグインはMain Processで実行され、Node.jsのフルアクセスを持ちます（ファイルI/O、HTTPリクエスト等）。

### 新しいイベントの追加方法

1. `electron/pluginManager.ts`に新しい`notifyXxx`メソッドを追加
2. `electron/main.ts`に対応するIPCハンドラーを追加
3. `electron/preload.ts`でAPIを公開
4. `src/types/electron.d.ts`に型定義を追加
5. Controller層（`useTodos`等）で適切なタイミングで通知を実行
```

---

## 実装の優先順位

### 必須（Phase 1）
1. `electron/pluginManager.ts` の作成
2. `electron/main.ts` の変更
3. `electron/preload.ts` の変更
4. `src/types/electron.d.ts` の変更
5. `src/hooks/useTodos.ts` の変更

### 推奨（Phase 2）
6. `sample-plugins/` ディレクトリの作成
7. `sample-plugins/log-timer-start.js` の作成
8. `sample-plugins/README.md` の作成

### 任意（Phase 3）
9. `CLAUDE.md` の更新

---

## テスト方法

### 手動テスト手順

1. アプリをビルドして起動
```bash
pnpm run electron:dev
```

2. ログでプラグイン読み込みを確認
```
Loading 0 plugin(s) from /Users/username/.config/oreno-todo/plugins
```

3. サンプルプラグインをコピー
```bash
mkdir -p ~/.config/oreno-todo/plugins/
cp sample-plugins/log-timer-start.js ~/.config/oreno-todo/plugins/
```

4. アプリを再起動

5. ログでプラグイン読み込みを確認
```
Loading 1 plugin(s) from /Users/username/.config/oreno-todo/plugins
Loaded plugin: log-timer-start (log-timer-start.js)
```

6. タスクのタイマーを開始

7. `/tmp/oreno-todo-log.txt`にログが記録されているか確認
```bash
cat /tmp/oreno-todo-log.txt
```

8. ログに以下の形式で記録されていることを確認
```
2026-01-09 10:30:00	TASK-001	タスク名
```

---

## エラーハンドリングの確認

### プラグイン読み込み失敗のテスト

1. 不正なJSファイルを配置
```bash
echo "invalid syntax{{{" > ~/.config/oreno-todo/plugins/broken.js
```

2. アプリを再起動

3. ログでエラーが記録され、アプリは正常に起動することを確認
```
Failed to load plugin broken.js: SyntaxError: Unexpected token '{'
```

### プラグイン実行時エラーのテスト

1. エラーを発生させるプラグインを作成
```javascript
module.exports = {
  name: 'error-plugin',
  onTimerStart: async (context) => {
    throw new Error('Test error');
  }
};
```

2. タイマーを開始

3. ログでエラーが記録され、タイマーは正常に開始されることを確認
```
Plugin error-plugin failed on timer-start: Error: Test error
```

---

## 注意事項

### セキュリティ上の考慮事項

- プラグインはMain Processで実行されるため、Node.jsのフル権限を持つ
- ユーザーは信頼できるプラグインのみを配置すべき
- 将来的にサンドボックス化を検討する可能性がある

### パフォーマンス上の考慮事項

- プラグインは非同期で実行されるが、タイマー開始処理自体は同期的に完了する
- プラグインのエラーはメイン処理に影響しない
- 複数のプラグインが存在する場合、順次実行される

### 後方互換性

- 既存のコードには影響しない
- プラグインが存在しない場合は何も実行されない
- プラグイン読み込み失敗はアプリ全体の動作を止めない

---

## 将来の拡張

### 追加予定のイベント

- `onTimerStop`: タイマー停止時
- `onTaskComplete`: タスク完了時
- `onTaskCreate`: タスク作成時
- `onTaskDelete`: タスク削除時

### プラグイン設定ファイル

将来的にプラグインごとの設定ファイル（JSON）をサポートする可能性:
```
~/.config/oreno-todo/plugins/
  ├── my-plugin.js
  └── my-plugin.config.json
```

### プラグインマーケットプレイス

将来的に公式プラグインリポジトリやマーケットプレイスを検討
