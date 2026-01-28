# Issue #0052: ログ形式の変更

## Issue概要

サンプルプラグイン`log-timer-start.js`の出力フォーマットを、タブ区切り形式からLogseq形式に変更する。また、ログファイルパスをハードコードではなく、設定ファイル（settings.json）から取得するようにする。

**参考プラグインコードから採用する要素:**
- ログファイルパス: settings.jsonの`config.logFilePath`から取得し、`{YYYY_MM_DD}`プレースホルダーを今日の日付(JST)で置換
- ログエントリ形式（Logseq形式）:
  ```
  \n\n- ## [#]([[{id}]]) {content} #{taskcode}\n\t- \n
  ```
  - taskcodeがある場合のみ`#{taskcode}`を付与
- 重複チェック: ファイル内に同一IDのエントリがあればスキップ
- 日時フォーマット: JST (`YYYY-MM-DD HH:mm:ss`)

**参考にしない要素:**
- イベント種別の分岐（task:start/task:complete）
- context.api.file.read/appendなどのAPI（プラグインは直接fs moduleを使用）
- 複雑なイベントシステム

## 実装内容

### 1. settings.jsonのスキーマ定義とロード機能の追加

**目的**: プラグインが設定ファイルから`config.logFilePath`を取得できるようにする

#### 1.1 設定ファイルの配置場所と構造

- **配置場所**: `~/Library/Application Support/oreno-todo/settings.json` (macOS)
- **構造**:
  ```json
  {
    "config": {
      "logFilePath": "/path/to/log/{YYYY_MM_DD}.md"
    }
  }
  ```

#### 1.2 PluginManagerの拡張

**ファイル**: `electron/pluginManager.ts`

- `loadSettings()`: settings.jsonを読み込む関数を追加
- `PluginContext`に`settings`フィールドを追加し、プラグインに設定を渡す
- コンストラクタでsettings.jsonをロード、存在しない場合はデフォルト設定を作成

**変更点**:
- `PluginContext`インターフェースに`settings: any`フィールドを追加
- `PluginManager`に`private settings: any`フィールドを追加
- `constructor`で`loadSettings()`を呼び出し
- `notifyTimerStart()`でコンテキストに`settings`を含める

#### 1.3 型定義の追加

**ファイル**: 新規作成 `electron/types/settings.ts`

```typescript
export interface AppSettings {
  config: {
    logFilePath: string;
  };
}
```

### 2. sample-plugins/log-timer-start.jsの書き換え

**目的**: Logseq形式でログを出力し、設定ファイルからパスを取得する

#### 2.1 日時フォーマット関数の追加

- `getJSTTimeString()`: YYYY-MM-DD HH:mm:ss形式のJST日時を返す
- `getTodayDateString()`: YYYY_MM_DD形式のJST日付を返す

#### 2.2 ログエントリ作成関数の追加

- `createLogEntry(data)`: Logseq形式のエントリを生成
  - フォーマット: `\n\n- ## [#]([[{id}]]) {content} #{taskcode}\n\t- \n`
  - taskcodeがある場合のみ`#{taskcode}`を付与

#### 2.3 重複チェック関数の追加

- `isDuplicateEntry(filePath, id)`: ファイル内に同一IDのエントリが存在するかチェック
  - ファイルを読み込み、`- ## [#]([[{id}]])`パターンを検索

#### 2.4 onTimerStart()の書き換え

- `context.settings.config.logFilePath`からログファイルパスを取得
- `{YYYY_MM_DD}`プレースホルダーを`getTodayDateString()`で置換
- `isDuplicateEntry()`で重複チェック
- 重複していなければ`createLogEntry()`でエントリを生成し、`fs.appendFileSync()`で追記

### 3. サンプルsettings.jsonの作成

**目的**: ユーザーがすぐに使えるサンプル設定を提供

**ファイル**: 新規作成 `sample-plugins/settings.example.json`

```json
{
  "config": {
    "logFilePath": "~/Documents/logseq-notes/journals/{YYYY_MM_DD}.md"
  }
}
```

### 4. sample-plugins/README.mdの更新

**目的**: 新しい設定方法とログ形式を説明

#### 4.1 設定ファイルのセクションを追加

- settings.jsonの配置場所
- 設定項目の説明（`config.logFilePath`）
- プレースホルダー（`{YYYY_MM_DD}`）の説明

#### 4.2 log-timer-startプラグインの説明を更新

- 新しいLogseq形式の出力例を記載
- 重複チェック機能の説明を追加

### 5. 実装の順序

1. `electron/types/settings.ts`を作成（型定義）
2. `electron/pluginManager.ts`を拡張（settings.jsonロード機能）
3. `sample-plugins/log-timer-start.js`を書き換え（Logseq形式出力）
4. `sample-plugins/settings.example.json`を作成
5. `sample-plugins/README.md`を更新

## 考慮事項と注意点

### セキュリティ
- settings.jsonはユーザーデータディレクトリに配置し、プラグインからのアクセスはPluginManager経由で行う
- ファイルパスのバリデーションは行わない（ユーザーの責任）

### 後方互換性
- 既存の`log-timer-start.js`を使用しているユーザーは、新しい形式に手動で更新する必要がある
- settings.jsonが存在しない場合、プラグインはエラーをログに記録するが、アプリケーション全体は動作を継続

### エラーハンドリング
- settings.jsonが存在しない、または不正なJSON形式の場合、デフォルト設定を使用
- ログファイルへの書き込みに失敗した場合、プラグインはエラーをログに記録するが、他のプラグインやメイン処理には影響しない

### テスト
- PluginManagerの単体テストは不要（プラグインシステムは開発段階）
- 手動テストで動作確認を行う

### ドキュメント
- sample-plugins/README.mdに詳細な使用方法を記載
- CLAUDE.mdのプラグインシステムセクションも更新

## 実装後の確認ポイント

- [ ] settings.jsonが正しく読み込まれるか
- [ ] `{YYYY_MM_DD}`プレースホルダーが今日の日付(JST)で置換されるか
- [ ] Logseq形式のエントリが正しく生成されるか
- [ ] 重複チェックが正しく動作するか（同一IDのエントリはスキップされる）
- [ ] taskcodeがない場合、`#taskcode`が出力されないか
- [ ] settings.jsonが存在しない場合、エラーメッセージが表示されるか
- [ ] ログファイルへの書き込みに失敗した場合、他の処理に影響しないか
