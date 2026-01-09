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
