# サンプルプラグイン

このディレクトリにはプラグインのサンプルコードが含まれています。

## プラグインの配置場所

実際にプラグインを使用する場合は、以下のディレクトリに`.js`ファイルを配置してください。

- macOS: `~/Library/Application Support/oreno-todo/plugins/`
- Windows: `%APPDATA%/oreno-todo/plugins/`
- Linux: `~/.config/oreno-todo/plugins/`

**注意**: このリポジトリの`sample-plugins/`ディレクトリは参考用です。実際の実行には上記のディレクトリを使用してください。

## 設定ファイル（settings.json）

プラグインの動作をカスタマイズするために、設定ファイル`settings.json`をプラグインディレクトリ内に配置できます。

### 配置場所

- macOS: `~/Library/Application Support/oreno-todo/plugins/settings.json`
- Windows: `%APPDATA%/oreno-todo/plugins/settings.json`
- Linux: `~/.config/oreno-todo/plugins/settings.json`

### 設定構造

プラグイン名をキーとして、各プラグインの設定を記述します。

```json
{
  "log-timer-start": {
    "logFilePath": "~/Documents/logseq-notes/journals/{YYYY_MM_DD}.md"
  }
}
```

- `log-timer-start.logFilePath`: ログファイルのパス
  - プレースホルダー `{YYYY_MM_DD}` は今日の日付（JST）に自動置換されます
  - 例: `{YYYY_MM_DD}` → `2026_01_28`

### サンプル設定

`sample-plugins/settings.example.json`にサンプル設定があります。必要に応じてコピーして使用してください。

```bash
# macOS/Linux
cp sample-plugins/settings.example.json ~/.config/oreno-todo/plugins/settings.json

# Windows（PowerShell）
Copy-Item sample-plugins\settings.example.json "$env:APPDATA\oreno-todo\plugins\settings.json"
```

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

タイマー開始時にLogseq形式でログファイルに記録します。

**設定要件**:
- `settings.json`に`log-timer-start.logFilePath`が設定されている必要があります
- 設定がない場合、プラグインはエラーをログに記録し、処理をスキップします

**出力フォーマット（Logseq形式）**:
```markdown

- ## [#]([[task-id-123]]) タスク名 #TASK-001
	-


- ## [#]([[task-id-456]]) 別のタスク #TASK-002
	-

```

**機能**:
- 重複チェック: 同一IDのエントリがファイル内に既に存在する場合、スキップします
- 日付プレースホルダー: `{YYYY_MM_DD}`が自動的に今日の日付（JST）に置換されます
- taskcodeの条件付き出力: taskcodeがある場合のみ`#taskcode`を付与します

## プラグインAPI仕様

### モジュール構造

```javascript
module.exports = {
  name: 'plugin-name',
  onTimerStart: async (context) => {
    context.log('info', 'タイマーが開始されました');
    // タイマー開始時の処理
  }
};
```

### コンテキストオブジェクト

```typescript
interface PluginContext {
  event: 'timer-start';
  log: (level: 'info' | 'warning' | 'error', message: string) => void;
  settings: any; // プラグイン固有の設定（プラグイン名でフィルタ済み）
  // 例: log-timer-start プラグインの場合
  // settings = { logFilePath: "~/Documents/logseq-notes/journals/{YYYY_MM_DD}.md" }
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
