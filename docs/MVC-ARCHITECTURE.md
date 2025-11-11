# MVC アーキテクチャ設計書

## 概要

このアプリケーションはMVC（Model-View-Controller）パターンに従って設計されています。
各レイヤーは明確な責務を持ち、ビジネスロジックはModelレイヤーに集約されています。

## レイヤー構成

### Model Layer（ビジネスロジック層）

**責務**: ドメインロジック、データ構造、ビジネスルールの定義と実装

#### `src/models/Todo.ts`
- **役割**: TODOアイテムのドメインモデル（エンティティ）
- **内容**:
  - Todoエンティティクラスの定義
  - イミュータブルな設計（すべての更新メソッドは新しいインスタンスを返す）
  - 個別のビジネスロジック（完了状態切り替え、タイマー開始/停止など）
  - JSON変換機能（fromJSON/toJSON）

#### `src/models/TodoRepository.ts`
- **役割**: Todoエンティティの集合を管理するリポジトリパターン
- **内容**:
  - Todo作成、追加、削除、更新などのコレクション操作
  - 並び替えロジック
  - JSON配列との相互変換
  - バリデーションの呼び出し
- **設計方針**: すべてのビジネスロジックをここに集約し、単体テスト可能にする

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
- **設計方針**: ビジネスロジックは持たず、TodoRepositoryに委譲する

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
- `src/models/Todo.ts` - TODOエンティティ
- `src/models/TodoRepository.ts` - リポジトリパターン
- `src/utils/timeFormat.ts` - 時刻ユーティリティ
- `src/utils/validation.ts` - バリデーション

### Controller Layer
- `src/hooks/useTodos.ts` - メインコントローラー

### View Layer
- `src/App.tsx` - メインアプリケーション
- `src/components/TodoInput.tsx` - 入力フォーム
- `src/components/TodoList.tsx` - リスト表示
- `src/components/TodoItem.tsx` - アイテム表示

### Infrastructure Layer (MVC外)
- `electron/main.ts` - Electronメインプロセス（IPC, ファイルI/O）
- `electron/preload.ts` - プレロードスクリプト（IPC API公開）
- `src/types/electron.d.ts` - 型定義

---

## 変更履歴

### 2025-11-12: MVC明確化
- `TodoRepository.ts` を新規作成し、ビジネスロジックを集約
- `useTodos.ts` からビジネスロジックを除去し、Repositoryに委譲
- `TodoList.tsx` から並び替えロジックを除去
- `App.tsx` のJSON変換処理をRepositoryに委譲
- 各ファイルにレイヤー分類のコメントを追加
