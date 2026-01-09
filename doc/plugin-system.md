# プラグインシステム

## 概要

oreno-todoアプリケーションは、タイマー開始などのイベントに対して任意の処理を実行できるプラグインシステムを提供しています。プラグインはJavaScriptモジュール（CommonJS形式）として実装され、アプリ起動時に自動的に読み込まれます。

## アーキテクチャ

### 実行環境

プラグインはElectronのMain Processで実行されるため、以下の特性があります：

- Node.jsのフルAPIにアクセス可能（ファイルI/O、HTTPリクエストなど）
- Renderer Process（React UI）とは分離された環境で動作
- セキュリティ上の理由から、信頼できるプラグインのみを配置すべき

### データフロー

```
View層（UIでタイマー開始ボタンをクリック）
  ↓
Controller層（useTodos.ts の startTimer）
  ↓ IPC通信（notify-timer-start）
Main Process（pluginManager.ts）
  ↓
各プラグインの onTimerStart を順次実行
```

### 実装ファイル

- **`electron/pluginManager.ts`**: プラグインの読み込みと実行管理
- **`electron/main.ts`**: IPCハンドラーの登録、アプリ起動時のプラグイン読み込み
- **`electron/preload.ts`**: Renderer ProcessにプラグインAPI（`notifyTimerStart`）を公開
- **`src/types/electron.d.ts`**: TypeScript型定義
- **`src/hooks/useTodos.ts`**: タイマー開始時にプラグインへ通知

## プラグインの配置場所

プラグインは以下のディレクトリに`.js`ファイルとして配置します：

- **macOS**: `~/Library/Application Support/oreno-todo/plugins/`
- **Windows**: `%APPDATA%/oreno-todo/plugins/`
- **Linux**: `~/.config/oreno-todo/plugins/`

プラグインはアプリ起動時に自動的に読み込まれるため、追加・変更後はアプリの再起動が必要です。

## プラグインの実装方法

### 基本構造

```javascript
module.exports = {
  name: 'my-plugin',
  onTimerStart: async (context) => {
    // タイマー開始時の処理
    const item = context.data;
    console.log(`Timer started: ${item.text}`);
  }
};
```

### コンテキストオブジェクト

プラグインの各ハンドラーには`context`オブジェクトが渡されます：

```typescript
interface PluginContext {
  event: 'timer-start'; // イベント名
  data: {
    // ListItemのJSON表現
    id: string;
    type: 'todo' | 'calendar_event';
    taskcode: string;
    text: string;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    timeRanges: Array<{
      start: string; // ISO8601形式（JST）
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

プラグイン内で発生したエラーは自動的にキャッチされ、コンソールにログ出力されます。エラーが発生しても：

- メイン処理（タイマー開始）は中断されない
- 他のプラグインの実行は継続される
- アプリケーション全体の動作には影響しない

## サンプルプラグイン

リポジトリには`sample-plugins/`ディレクトリにサンプルプラグインが含まれています：

### log-timer-start.js

タイマー開始時に`/tmp/oreno-todo-log.txt`へタブ区切りでログを記録します。

**出力フォーマット**:
```
2026-01-09 10:30:00	TASK-001	タスク名
2026-01-09 11:00:00	TASK-002	別のタスク
```

**使用方法**:
```bash
# macOS/Linux
mkdir -p ~/.config/oreno-todo/plugins/
cp sample-plugins/log-timer-start.js ~/.config/oreno-todo/plugins/

# Windows（PowerShell）
New-Item -ItemType Directory -Force -Path "$env:APPDATA\oreno-todo\plugins"
Copy-Item sample-plugins\log-timer-start.js "$env:APPDATA\oreno-todo\plugins\"
```

アプリを再起動すると、プラグインが読み込まれたことを示すログがコンソールに表示されます：

```
Loading 1 plugin(s) from /path/to/plugins
Loaded plugin: log-timer-start (log-timer-start.js)
```

## 新しいイベントの追加方法

将来的にタイマー停止やタスク完了などのイベントを追加する場合の手順：

1. **`electron/pluginManager.ts`**: 新しい`notifyXxx`メソッドを追加
   ```typescript
   async notifyTimerStop(itemData: any): Promise<void> {
     const context: PluginContext = {
       event: 'timer-stop',
       data: itemData
     };
     // プラグインの onTimerStop を呼び出し
   }
   ```

2. **`electron/main.ts`**: IPCハンドラーを追加
   ```typescript
   ipcMain.handle('notify-timer-stop', async (_, itemData) => {
     if (pluginManager) {
       await pluginManager.notifyTimerStop(itemData);
     }
     return { success: true };
   });
   ```

3. **`electron/preload.ts`**: APIを公開
   ```typescript
   notifyTimerStop: (itemData) => ipcRenderer.invoke('notify-timer-stop', itemData),
   ```

4. **`src/types/electron.d.ts`**: 型定義を追加
   ```typescript
   notifyTimerStop: (itemData: any) => Promise<{ success: boolean }>;
   ```

5. **Controller層**: 適切なタイミングで通知を実行
   ```typescript
   const stopTimer = useCallback(async (id: string) => {
     const targetItem = todos.find(item => item.getId() === id);
     setTodosWithPersist((prev) => TodoRepository.stopItemTimer(prev, id));
     if (targetItem) {
       window.electronAPI.notifyTimerStop(targetItem.toJSON()).catch(error => {
         console.error('Failed to notify plugins:', error);
       });
     }
   }, [setTodosWithPersist, todos]);
   ```

## 将来の拡張案

### 追加予定のイベント

- `onTimerStop`: タイマー停止時
- `onTaskComplete`: タスク完了時
- `onTaskCreate`: タスク作成時
- `onTaskDelete`: タスク削除時

### プラグイン設定ファイル

プラグインごとの設定ファイル（JSON）をサポート：
```
~/.config/oreno-todo/plugins/
  ├── my-plugin.js
  └── my-plugin.config.json
```

### プラグインのサンドボックス化

現在プラグインはNode.jsのフル権限を持つため、セキュリティ向上のためにサンドボックス化を検討。

### プラグインマーケットプレイス

公式プラグインリポジトリやマーケットプレイスの提供。

## 注意事項

### セキュリティ

- プラグインはMain Processで実行されるため、Node.jsのフル権限を持つ
- 信頼できるプラグインのみを配置すること
- 出所不明なプラグインの使用は避ける

### パフォーマンス

- プラグインは非同期で実行されるが、タイマー開始処理自体は同期的に完了する
- 複数プラグインが存在する場合は順次実行される
- 重い処理を行うプラグインはアプリのレスポンスに影響する可能性がある

### 後方互換性

- 既存のコードには影響しない
- プラグインが存在しない場合は何も実行されない
- プラグイン読み込み失敗はアプリ全体の動作を止めない
