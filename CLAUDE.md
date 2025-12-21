# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Electron + React + TypeScriptで構築されたデスクトップTODO管理アプリケーション。JSONファイルによるローカルデータ永続化を実装。

## 開発コマンド

### 開発環境の起動
```bash
pnpm run electron:dev  # Vite開発サーバー + Electronを同時起動（ホットリロード有効）
```

### ビルド
```bash
pnpm run build         # TypeScriptコンパイル + Viteビルド + Electronコード生成
pnpm run electron:build  # 上記ビルド + electron-builderでパッケージング
```

ビルドスクリプト（推奨）:
```bash
./build.sh           # ビルド + パッケージング（リリース版作成）
./build.sh clean     # クリーンビルド + パッケージング
./build.sh dev       # 開発ビルドのみ（パッケージングなし）
```

## アーキテクチャ

### プロセス構造（Electron）

- **Main Process** (`electron/main.ts`): IPCハンドラーの登録、ウィンドウ管理、ファイルI/O処理
- **Preload Script** (`electron/preload.ts`): `contextBridge`経由で安全なAPIをレンダラーに公開
- **Renderer Process** (`src/`): React UIコンポーネント、状態管理

### MVCアーキテクチャ

このプロジェクトは**Repository Pattern**を採用したMVCアーキテクチャで設計されています。
詳細は`docs/MVC-ARCHITECTURE.md`を参照してください。

#### レイヤー構成

**Model層（ドメインロジック）**:
- `src/models/ListItem.ts`: TodoとCalendarEventの共通インターフェース
- `src/models/Todo.ts`: Todoエンティティ（単一のTodoに対する操作、ListItemを実装）
- `src/models/CalendarEvent.ts`: カレンダーイベントエンティティ（ListItemを実装）
- `src/models/TodoRepository.ts`: TodoとCalendarEventのコレクション管理（配列操作、ビジネスロジック）
- `src/utils/timeFormat.ts`: 時刻フォーマット処理
- `src/utils/validation.ts`: バリデーションロジック

**Controller層（状態管理・IPC通信）**:
- `src/hooks/useTodos.ts`: React状態管理、IPC通信、Model層への委譲

**View層（UI表示）**:
- `src/App.tsx`, `src/components/*.tsx`: UIコンポーネント、ユーザー操作の受付

#### Repository Pattern

- **ListItem（インターフェース）**: TodoとCalendarEventの共通インターフェース（`getId()`, `getType()`, `getText()`, `toggleCompleted()`など）
- **Todo（エンティティ）**: 1つのTodoに対する操作（`setText()`, `toggleCompleted()`, `startTimer()`など）、ListItemを実装
- **CalendarEvent（エンティティ）**: 1つのカレンダーイベントに対する操作、ListItemを実装。開始時刻、終了時刻、場所、詳細などの追加フィールドを持つ
- **TodoRepository（コレクション管理）**: TodoとCalendarEvent配列に対する操作
  - Todo専用メソッド: `addTodo()`, `deleteTodo()`, `toggleTodo()`, `reorderTodos()`など
  - ListItem汎用メソッド: `toggleItem()`, `deleteItem()`, `editItemText()`, `reorderItems()`など
  - CalendarEvent生成メソッド: `createCalendarEventFromGoogleEvent()`, `addCalendarEventsToItems()`など

すべてのビジネスロジックは`TodoRepository`に集約され、単体テスト可能な純粋関数として実装されています。

### データフロー

1. **初期化**: View → Controller (`useTodos`) → IPC (`loadTodos`) → Main Process → ファイル読み込み → `TodoRepository.fromJsonText()` → Todo配列
2. **更新**: View → Controller → `TodoRepository.xxxTodo()` → 新しいTodo配列 → 楽観的UI更新 + IPC (`saveTodos`) → Main Process → アトミック書き込み
3. **エラー処理**: 保存失敗時は自動ロールバック

### 重要な実装パターン

#### Repository Pattern（リポジトリパターン）
`TodoRepository`クラスがすべてのビジネスロジックを集約。イミュータブルな設計により副作用なく、単体テスト可能。

#### 楽観的更新 + ロールバック
`useTodos.ts`の`setTodosWithPersist`は、UIを即座に更新してから非同期で保存。失敗時は前の状態に戻す。

#### アトミックなファイル書き込み
`electron/main.ts`は一時ファイル経由で書き込み、`rename`でアトミックに上書き。データ破損を防ぐ。

#### データ破損時の自動バックアップ
`electron/main.ts`でJSONパースエラー時、タイムスタンプ付きバックアップを作成。

### データ保存場所

- macOS: `~/Library/Application Support/oreno-todo/todos.json`
- Windows: `%APPDATA%/oreno-todo/todos.json`
- Linux: `~/.config/oreno-todo/todos.json`

## コーディングガイドライン

### MVCレイヤーの遵守

**Model層（ビジネスロジック）**:
- すべてのビジネスロジックは`TodoRepository`に実装する
- 新しいTodo/CalendarEvent操作を追加する場合は`TodoRepository`に静的メソッドを追加
- 単一のTodo/CalendarEventに対する操作は各クラスのメソッドとして実装
- TodoとCalendarEventは`ListItem`インターフェースを実装し、共通のメソッドを提供
- イミュータブルな設計を維持（新しいインスタンス/配列を返す）
- フレームワーク（React、Electron）に依存しない純粋な関数として実装
- JSON出力には必ず`type`フィールドを含め、'todo'または'calendar_event'を設定

**Controller層（状態管理・IPC通信）**:
- `useTodos`フックですべてのTodo操作を提供
- ビジネスロジックは実装せず、`TodoRepository`に委譲する
- 状態管理、IPC通信、楽観的更新のみを担当
- `setTodosWithPersist`を使用して状態更新と永続化を同時実行

**View層（UI表示）**:
- UIの表示とユーザー操作の受付のみを担当
- ビジネスロジックや配列操作は実装しない
- すべての操作は`useTodos`フック経由で呼び出す
- ローカルUI状態（入力値、ドラッグ状態など）のみを管理

### IPC通信の追加
1. `src/types/electron.d.ts`にAPIメソッド定義を追加
2. `electron/preload.ts`で`ipcRenderer.invoke`呼び出しを実装
3. `electron/main.ts`に`ipcMain.handle`を登録
4. `src/hooks/useTodos.ts`でフックに統合

### 新機能の実装フロー
1. **Model層**: `TodoRepository`に新しいメソッドを追加（必要に応じて`Todo`にもメソッド追加）
2. **Controller層**: `useTodos`フックで`TodoRepository`のメソッドを呼び出す関数を追加
3. **View層**: `useTodos`から提供された関数を呼び出す

例：
```typescript
// 1. Model層
class TodoRepository {
  static archiveTodo(todos: Todo[], id: string): Todo[] {
    return todos.map(todo => todo.getId() === id ? todo.setArchived(true) : todo);
  }
}

// 2. Controller層
const useTodos = () => {
  const archiveTodo = (id: string) => {
    setTodosWithPersist(TodoRepository.archiveTodo(todos, id));
  };
  return { archiveTodo };
};

// 3. View層
<button onClick={() => archiveTodo(todo.id)}>Archive</button>
```

### TypeScript設定
- `tsconfig.json`: React UIコード（`src/`）
- `tsconfig.electron.json`: Electronプロセスコード（`electron/`）
- `tsconfig.node.json`: Node.js関連の設定

### pnpm設定（重要）

このプロジェクトではpnpmを使用していますが、electron-builderとの互換性のために`.npmrc`で特別な設定が必要です。

**`.npmrc`の内容:**
```
node-linker=hoisted
shamefully-hoist=true
```

**この設定が必要な理由:**

1. **pnpmのデフォルト動作**: pnpmはディスク容量節約のため、`node_modules/.pnpm/`に実際のパッケージを配置し、`node_modules/パッケージ名`はシンボリックリンクにします

2. **electron-builderの問題**: electron-builderがアプリをasarにパッケージングする際、pnpmのシンボリックリンク構造を正しく解決できず、依存関係（例: expressのbody-parser）が欠落してランタイムエラーになります

3. **解決策**: `node-linker=hoisted`と`shamefully-hoist=true`を設定することで、pnpmがnpmと同様のフラットなnode_modules構造を作成し、electron-builderが全ての依存関係を正しくバンドルできます

**注意**: この設定を削除すると、パッケージングしたアプリで`Cannot find module`エラーが発生します。npmを使用している場合はこの問題は発生しません。

## HTTP API

アプリケーションは`localhost:3000`でHTTP APIサーバーを起動します。

### Todo API

#### `POST /api/todos`
新しいTodoを追加します。

**リクエストボディ**:
```json
{
  "taskcode": "TASK-001",
  "text": "新しいタスク"
}
```

**レスポンス**:
```json
{
  "success": true
}
```

#### `POST /api/todos/stop-running`
現在進行中のTodoのタイマーを停止します。

**リクエストボディ**: なし

**レスポンス**:
```json
{
  "success": true
}
```

### Timecard API

#### `POST /api/timecard/check-in`
タイムカードにチェックインを記録します。

**リクエストボディ**: なし

**レスポンス**:
```json
{
  "success": true
}
```

#### `POST /api/timecard/check-out`
タイムカードにチェックアウトを記録します。

**リクエストボディ**: なし

**レスポンス**:
```json
{
  "success": true
}
```

#### `GET /api/timecard/today`
指定日付のタイムカードエントリを取得します。

**クエリパラメータ**:
- `date` (optional): YYYY-MM-DD形式の日付。省略時は今日の日付（JST）

**レスポンス**:
```json
{
  "type": "timecard",
  "date": "2024-12-21",
  "entries": [
    { "type": "start", "time": "2024-12-21 09:00:00" },
    { "type": "end", "time": "2024-12-21 12:00:00" }
  ]
}
```

**エラーレスポンス**:
- 400 Bad Request: 不正な日付フォーマット
- 500 Internal Server Error: タイムカードデータの読み込みに失敗

## Google Calendar連携

アプリケーションはGoogleカレンダーから予定を取得して、CalendarEventとして追加する機能を持っています。

### 認証設定

Google Calendar APIを使用するには、OAuth2.0の認証情報を設定する必要があります。

**方法1: 環境変数で設定**
```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
```

**方法2: 設定ファイルで設定**
`~/.google-calendar-credentials.json`に以下の形式で保存:
```json
{
  "installed": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost:3456/oauth2callback"]
  }
}
```

### 認証フロー

1. 初回使用時、ブラウザが自動的に開きGoogleの認証画面が表示されます
2. Googleアカウントでログインし、カレンダーへのアクセスを許可します
3. 認証成功後、トークンはOSのセキュアストレージ（キーチェイン）に暗号化して保存されます
   - macOS: Keychain Access
   - Windows: DPAPI (Data Protection API)
   - Linux: Secret Service API (gnome-libsecret, kwallet等)
4. 次回以降は保存されたトークンが自動的に使用されます

**注意**: 既存の`~/.google-calendar-token.json`ファイルは自動的にキーチェインに移行され、削除されます。

### アーキテクチャ

- **Main Process** (`electron/googleCalendar.ts`): Google Calendar API認証・取得ロジック
- **IPC通信** (`fetch-calendar-events`): Main ProcessからRenderer Processへの橋渡し
- **Controller層** (`useTodos.ts`): `importCalendarEvents()`関数がIPC経由でイベントを取得

## 注意事項

- ブラウザでは動作しない（Electron専用）
- `contextIsolation: true`, `nodeIntegration: false`によるセキュアな設定
- 開発時は`http://localhost:5173`、本番時は`dist/index.html`をロード
- HTTP APIサーバーは開発・本番ともに`localhost:3000`で起動
- Google Calendar認証のコールバックサーバーはポート`3456`で起動

## 特記事項
- ソースコードを変更した場合は、必ずそれに対応するテスト・ドキュメントを合わせて更新すること
- 現在の開発はリリース前の初期版を構築している段階であるため後方互換性を気にする必要はない
    - コードがシンプルで理解しやすくなることを目的に破壊的な変更を躊躇なく行うこと
- HTTPエンドポイントを経由した操作の実装については以下を必ず守ること
    - 可能な限り早くUI操作による操作と同じ処理フローに合流すること
    - UI操作による処理が存在しない場合、UI操作のボタンなどが仮にあると想定してロジックを組んだ上で、可能な限り早急にそのフローに合流すること
    - main.tsでの処理は、その命令をロジック側に橋渡しするだけの最低限にすること
