# MVC アーキテクチャ設計書

## 概要

このアプリケーションはMVC（Model-View-Controller）パターンに従って設計されています。
各レイヤーは明確な責務を持ち、ビジネスロジックはModelレイヤーに集約されています。

## レイヤー構成

### Model Layer（ビジネスロジック層）

**責務**: ドメインロジック、データ構造、ビジネスルールの定義と実装

#### `src/models/ListItem.ts`
- **役割**: TodoとCalendarEventの共通インターフェース
- **内容**:
  - リストアイテムの共通メソッド定義（getId, getType, getText, toggleCompletedなど）
  - ListItemTypeEnum（TODO / CALENDAR_EVENT）
- **設計方針**: TodoとCalendarEventを統一的に扱えるようにする

#### `src/models/Todo.ts`
- **役割**: TODOアイテムのドメインモデル（エンティティ）
- **内容**:
  - Todoエンティティクラスの定義（ListItemを実装）
  - イミュータブルな設計（すべての更新メソッドは新しいインスタンスを返す）
  - 個別のビジネスロジック（完了状態切り替え、タイマー開始/停止など）
  - JSON変換機能（fromJSON/toJSON）
  - type: 'todo'を含むJSON出力

#### `src/models/CalendarEvent.ts`
- **役割**: カレンダーイベントのドメインモデル（エンティティ）
- **内容**:
  - CalendarEventエンティティクラスの定義（ListItemを実装）
  - イミュータブルな設計
  - Googleカレンダーイベントからの変換機能
  - 開始時刻、終了時刻、場所、詳細などの追加フィールド
  - JSON変換機能（fromJSON/toJSON）
  - type: 'calendar_event'を含むJSON出力

#### `src/models/TodoRepository.ts`
- **役割**: TodoおよびCalendarEventエンティティの集合を管理するリポジトリパターン
- **内容**:
  - Todo作成、追加、削除、更新などのコレクション操作
  - ListItem配列を扱う汎用メソッド（toggleItem, deleteItem, editItemTextなど）
  - 並び替えロジック
  - JSON配列との相互変換（typeフィールドによる型判別）
  - バリデーションの呼び出し
  - GoogleカレンダーイベントからCalendarEvent生成
  - 後方互換性のためのTodo専用メソッドを維持
- **設計方針**: すべてのビジネスロジックをここに集約し、単体テスト可能にする

#### `src/models/TimecardEntry.ts`
- **役割**: タイムカードエントリのドメインモデル（エンティティ）
- **内容**:
  - TimecardEntryエンティティクラスの定義
  - イミュータブルな設計（すべての更新メソッドは新しいインスタンスを返す）
  - チェックイン（start）/チェックアウト（end）の2つのタイプ
  - JSON変換機能（fromJSON/toJSON）
  - 時刻とタイプの変更メソッド

#### `src/models/TimecardRepository.ts`
- **役割**: TimecardEntryエンティティの集合を管理するリポジトリパターン
- **内容**:
  - チェックイン/チェックアウトエントリの作成
  - エントリの追加、削除、更新などのコレクション操作
  - 日付別の管理（{[date: string]: TimecardEntry[]}）
  - JSON配列との相互変換
  - 日付のソート機能
- **設計方針**: すべてのタイムカードビジネスロジックをここに集約し、単体テスト可能にする

#### `src/utils/timeFormat.ts`
- **役割**: JST時刻フォーマット用ユーティリティ
- **内容**:
  - 現在時刻の取得
  - DateオブジェクトとJST文字列の相互変換
- **レイヤー分類**: ビジネスロジックで使用するため、Model層に分類

#### `src/utils/validation.ts`
- **役割**: データバリデーション
- **内容**:
  - TodoオブジェクトとTodo配列のバリデーション
  - TimeRangeのバリデーション
- **レイヤー分類**: ビジネスルールの一部であり、Model層に分類

---

### Controller Layer（制御層）

**責務**: ViewとModelの仲介、状態管理、外部システムとの通信

#### `src/hooks/useTodos.ts`
- **役割**: Reactカスタムフック（Controllerパターン）
- **内容**:
  - Todoリストのグローバル状態管理
  - ViewからのイベントをModel層のメソッドに委譲
  - IPC通信（Electron API経由でのデータ永続化）
  - 楽観的更新とロールバック処理
  - HTTPサーバー経由のイベント受信
  - カレンダーイベントのインポート処理
- **設計方針**: ビジネスロジックは持たず、TodoRepositoryに委譲する

#### `src/hooks/useTimecard.ts`
- **役割**: タイムカード用Reactカスタムフック（Controllerパターン）
- **内容**:
  - タイムカードデータのグローバル状態管理
  - ViewからのイベントをModel層のメソッドに委譲
  - IPC通信（Electron API経由での独立したデータ永続化）
  - 楽観的更新とロールバック処理
- **設計方針**: ビジネスロジックは持たず、TimecardRepositoryに委譲する

---

### View Layer（プレゼンテーション層）

**責務**: UIの表示、ユーザー操作の受付、ローカルなUI状態の管理

#### `src/App.tsx`
- **役割**: アプリケーションのメインコンポーネント
- **内容**:
  - 全体のレイアウト
  - JSON編集モーダルのUI状態管理
  - Controllerからの状態を受け取り、子コンポーネントに分配
- **ローカル状態**: JSON編集モーダルの開閉状態、エラーメッセージ

#### `src/components/TodoInput.tsx`
- **役割**: 新しいTodoを入力するフォーム
- **内容**:
  - タスクコードとテキストの入力フィールド
  - バリデーション（空文字チェック）
  - Controllerへのイベント通知
- **ローカル状態**: フォームの入力値のみ

#### `src/components/TodoList.tsx`
- **役割**: Todoリストの表示
- **内容**:
  - Todoアイテムのリスト表示
  - ドラッグ&ドロップのUI状態管理
  - 並び替えイベントのControllerへの通知
- **ローカル状態**: ドラッグ中のインデックスのみ

#### `src/components/TodoItem.tsx`
- **役割**: 個別のTodoアイテムの表示と編集
- **内容**:
  - Todoアイテムの表示
  - インライン編集（テキスト、タスクコード）のUI
  - 完了ボタン、削除ボタン、タイマーボタン
  - Controllerへのイベント通知
- **ローカル状態**: 編集中のテキスト、編集モードフラグのみ

#### `src/components/TimecardPanel.tsx`
- **役割**: タイムカードパネルの表示
- **内容**:
  - チェックイン/チェックアウトボタン
  - タイムカード履歴の表示（日付別グループ化）
  - JSON編集ボタン
  - 履歴の折りたたみ/展開
  - Controllerへのイベント通知
- **ローカル状態**: 履歴の展開状態のみ

---

## データフロー

```
User Action (View)
  ↓
Event Handler (View)
  ↓
Controller Method (useTodos)
  ↓
Repository/Entity Method (Model)
  ↓
New State (immutable)
  ↓
Controller State Update
  ↓
IPC Communication (Persistence)
  ↓
View Re-render
```

### 具体例: Todoの追加

1. **View**: `TodoInput` コンポーネントでユーザーがフォーム送信
2. **View → Controller**: `onAdd(taskcode, text)` を呼び出し
3. **Controller**: `useTodos.addTodo()` が実行される
4. **Controller → Model**: `TodoRepository.addTodo(prev, taskcode, text)` を呼び出し
5. **Model**: `TodoRepository.createTodo()` で新しいTodoエンティティを作成
6. **Model**: 新しいTodoリストを返す（イミュータブル）
7. **Controller**: 状態を更新し、IPC経由で永続化
8. **Controller → View**: 新しい状態がpropsとして渡される
9. **View**: リストが再レンダリングされる

---

## MVC分離の原則

### Model層
- ✅ ビジネスロジックのみを実装
- ✅ Reactや外部ライブラリに依存しない
- ✅ 純粋関数またはイミュータブルなクラス
- ✅ 単体テスト可能な設計
- ❌ UIやイベントハンドリングの知識を持たない

### Controller層
- ✅ ViewとModelを接続する
- ✅ 状態管理（useState, useCallback）
- ✅ 外部システムとの通信（IPC, HTTP）
- ✅ ビジネスロジックはModelに委譲
- ❌ UI構造やスタイルの知識を持たない
- ❌ 複雑なビジネスロジックを実装しない

### View層
- ✅ UIの表示とユーザー操作の受付のみ
- ✅ ローカルなUI状態の管理（編集中フラグなど）
- ✅ Controllerからの状態を表示
- ✅ ユーザー操作をControllerに通知
- ❌ ビジネスロジックを持たない
- ❌ 直接データを永続化しない
- ❌ グローバル状態を直接操作しない

---

## 単体テスト戦略

### Model層のテスト
- `Todo.ts`: エンティティメソッドのテスト（toggleCompleted, startTimer など）
- `TodoRepository.ts`: リポジトリメソッドのテスト（addTodo, reorderTodos など）
- `validation.ts`: バリデーションロジックのテスト
- `timeFormat.ts`: 時刻フォーマットのテスト

### Controller層のテスト
- `useTodos.ts`: React Testing Libraryでのフックテスト
- IPC通信のモック化
- 楽観的更新とロールバックの検証

### View層のテスト
- 各コンポーネントのスナップショットテスト
- ユーザー操作のシミュレーション
- Controllerメソッドの呼び出し検証

---

## ファイル一覧とレイヤー分類

### Model Layer
- `src/models/ListItem.ts` - TodoとCalendarEventの共通インターフェース
- `src/models/Todo.ts` - TODOエンティティ
- `src/models/CalendarEvent.ts` - カレンダーイベントエンティティ
- `src/models/TodoRepository.ts` - リポジトリパターン
- `src/models/TimecardEntry.ts` - タイムカードエントリエンティティ
- `src/models/TimecardRepository.ts` - タイムカードリポジトリパターン
- `src/utils/timeFormat.ts` - 時刻ユーティリティ
- `src/utils/validation.ts` - バリデーション
- `src/utils/calendarSample.ts` - カレンダーイベントサンプルデータ
- `src/types/calendar.ts` - Googleカレンダーイベント型定義

### Controller Layer
- `src/hooks/useTodos.ts` - Todoコントローラー
- `src/hooks/useTimecard.ts` - タイムカードコントローラー

### View Layer
- `src/App.tsx` - メインアプリケーション
- `src/components/TodoInput.tsx` - 入力フォーム
- `src/components/TodoList.tsx` - リスト表示
- `src/components/TodoItem.tsx` - アイテム表示
- `src/components/TimecardPanel.tsx` - タイムカードパネル

### Infrastructure Layer (MVC外)
- `electron/main.ts` - Electronメインプロセス（IPC, ファイルI/O）
- `electron/preload.ts` - プレロードスクリプト（IPC API公開）
- `src/types/electron.d.ts` - 型定義

---

## 変更履歴

### 2025-11-30: タイムカード機能の追加（Issue #0018）
- `src/models/TimecardEntry.ts` を新規作成
  - タイムカードエントリのエンティティクラス
  - チェックイン（start）/チェックアウト（end）の2タイプ
  - イミュータブルな設計
- `src/models/TimecardRepository.ts` を新規作成
  - タイムカードデータのリポジトリパターン
  - 日付別管理（{[date: string]: TimecardEntry[]}）
  - チェックイン/チェックアウトエントリの作成・追加・削除・更新
  - JSON変換機能、日付ソート機能
- `src/hooks/useTimecard.ts` を新規作成
  - タイムカード専用のコントローラー
  - 独立した状態管理とIPC通信
  - 楽観的更新とロールバック処理
- `src/components/TimecardPanel.tsx` を新規作成
  - タイムカードUIコンポーネント
  - チェックイン/チェックアウトボタン
  - 履歴表示（日付別グループ化、折りたたみ可能）
  - JSON編集機能
- `electron/main.ts` にタイムカード用IPC追加
  - `load-timecard`, `save-timecard` ハンドラー
  - 独立したファイル（timecard.json）で管理
  - アトミックな書き込みとエラーハンドリング
- 単体テスト追加（22テスト全て成功）
- 設計文書を更新

### 2025-11-23: TodoとCalendarEventの分離（Issue #0015）
- `src/models/ListItem.ts` を新規作成し、共通インターフェースを定義
  - TodoとCalendarEventが実装するべきメソッドを定義
  - ListItemType列挙型（TODO / CALENDAR_EVENT）を追加
- `src/models/CalendarEvent.ts` を新規作成
  - カレンダーイベント専用のエンティティクラス
  - 開始時刻、終了時刻、場所、詳細などの追加フィールド
  - GoogleカレンダーイベントからのCalendarEvent生成機能
- `Todo.ts` を更新し、ListItemインターフェースを実装
  - JSON出力にtype: 'todo'を追加
  - getType()メソッドを追加
- `TodoRepository.ts` にListItem配列を扱うメソッドを追加
  - toggleItem, deleteItem, editItemText, editItemTaskcode, reorderItems
  - startItemTimer, stopItemTimer
  - fromJsonArrayToItems, itemsToJsonArray
  - createCalendarEventFromGoogleEvent, addCalendarEventsToItems
  - 既存のTodo専用メソッドは後方互換性のため維持
- 全テストを更新（224テスト全て成功）
- 設計文書を更新

### 2025-11-20: カレンダー連携機能の追加
- `src/types/calendar.ts` を新規作成し、Googleカレンダーイベントの型定義を追加
- `src/utils/calendarSample.ts` を新規作成し、サンプルデータ提供関数を追加
- `TodoRepository.ts` にカレンダーイベントからTodo生成メソッドを追加
  - `createTodoFromCalendarEvent()`: 単一イベントからTodo生成
  - `createTodosFromCalendarEvents()`: イベント配列からTodoリスト生成
  - `addTodosFromCalendarEvents()`: 既存リストにイベントを追加
- `useTodos.ts` に `importCalendarEvents()` 関数を追加
- `App.tsx` にカレンダー取得ボタンを配置
- 単体テストを追加（84テスト全て成功）

### 2025-11-12: MVC明確化
- `TodoRepository.ts` を新規作成し、ビジネスロジックを集約
- `useTodos.ts` からビジネスロジックを除去し、Repositoryに委譲
- `TodoList.tsx` から並び替えロジックを除去
- `App.tsx` のJSON変換処理をRepositoryに委譲
- 各ファイルにレイヤー分類のコメントを追加
