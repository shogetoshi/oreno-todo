# Issue #0038: クイックタスクボタン 実装計画書

## 要件

1. クイックタスクボタンを追加する
   - taskcodeも内容も設定せず、すぐに新たなタスクを作成して開始する
   - taskcodeは空文字列
   - タスク名は現在時刻（JST形式: "YYYY-MM-DD HH:MI:SS"）
   - 作成と同時にそのタスクを開始する
   - 既存のタスク開始関数（`startTimer`）を利用すること
2. ボタンは先頭のボタン群に追加する

## 現状分析

### 既存のTodo作成フロー

#### Model層
- `TodoRepository.createTodo(taskcode: string, text: string): Todo`
  - 新しいTodoエンティティを生成
  - UUID生成、タイムスタンプ設定、空のtimeRanges配列を初期化
- `Todo.startTimer(): Todo`
  - タイマーを開始し、新しいTimeRangeを追加
  - `{ start: 現在時刻, end: null }` の形式でtimeRangesに追加

#### Controller層
- `useTodos.addTodo(taskcode: string, text: string): void`
  - `TodoRepository.createTodo()`を呼び出し
  - 新しいTodoをリストに追加
  - 永続化処理（IPC経由で保存）
- `useTodos.startTimer(id: string): void`
  - `TodoRepository.startItemTimer(items, id)`を呼び出し
  - 指定IDのTodoのタイマーを開始

#### View層
- `App.tsx`: メインアプリケーションコンポーネント
  - ヘッダーコントロール部分（160-180行目）にボタン群が配置
  - チェックイン（🟢）、チェックアウト（⚪）、JSON編集ボタンが存在
- `TodoInput.tsx`: 新規Todo入力フォーム
  - taskcodeとtextの入力フィールド
  - 「追加」ボタンで`onAdd(taskcode, text)`を呼び出し

### 時刻フォーマット機能
- `src/utils/timeFormat.ts`
  - `getCurrentJSTTime(): string`: 現在時刻をJST形式（"YYYY-MM-DD HH:MI:SS"）で取得

## 実装設計

### 1. Controller層の拡張

**ファイル**: `src/hooks/useTodos.ts`

**追加関数**:
```typescript
/**
 * クイックタスクを作成して即座に開始する
 * - taskcodeは空文字列
 * - textは現在時刻（JST）
 * - 作成後すぐにタイマーを開始
 */
const addQuickTask = useCallback(() => {
  setTodosWithPersist((prev) => {
    // 現在時刻をタスク名とする
    const currentTime = getCurrentJSTTime();
    const taskcode = '';
    const text = currentTime;

    // 新しいTodoを作成
    const newTodo = TodoRepository.createTodo(taskcode, text);

    // タイマーを開始した状態のTodoを作成
    const todoWithTimer = newTodo.startTimer();

    return [...prev, todoWithTimer];
  });
}, [setTodosWithPersist]);
```

**返り値の更新**:
```typescript
return {
  todos,
  isLoading,
  addTodo,
  addQuickTask,  // 追加
  toggleTodo,
  deleteTodo,
  // ... 以下省略
};
```

### 2. View層の拡張

**ファイル**: `src/App.tsx`

**更新箇所**: `addQuickTask`関数をフックから取得
```typescript
// 19行目を修正
const { todos, isLoading, addTodo, addQuickTask, toggleTodo, deleteTodo, editTodo, editTaskcode, reorderTodos, replaceFromJson, editSingleItemFromJson, replaceItemsForDate, startTimer, stopTimer, importCalendarEvents } = useTodos();
```

**UIの追加**: ヘッダーコントロール部分にクイックタスクボタンを追加
```typescript
// 161-169行目の部分を修正
<div className="app-header-controls">
  <TodoInput onAdd={addTodo} />
  <div className="control-buttons">
    <button className="quick-task-button" onClick={addQuickTask} title="クイックタスク作成">
      ⚡
    </button>
    <button className="check-in-button" onClick={checkIn}>
      🟢
    </button>
    <button className="check-out-button" onClick={checkOut}>
      ⚪
    </button>
    {/* ... 以下既存のボタン */}
  </div>
</div>
```

**CSS追加**: `src/App.css`に以下を追加
```css
.quick-task-button {
  padding: 8px 12px;
  background-color: #FFD700;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  transition: background-color 0.2s;
}

.quick-task-button:hover {
  background-color: #FFC700;
}

.quick-task-button:active {
  background-color: #FFB700;
}
```

## 実装ステップ

### Step 1: Controller層の実装
1. `src/hooks/useTodos.ts`に`addQuickTask`関数を追加
2. `getCurrentJSTTime`をインポート（`import { getCurrentJSTTime } from '../utils/timeFormat';`）
3. 返り値に`addQuickTask`を追加

### Step 2: View層の実装
1. `src/App.tsx`で`addQuickTask`をフックから取得
2. ヘッダーコントロール部分にクイックタスクボタンを追加（⚡絵文字使用）
3. ボタンの位置: チェックインボタン（🟢）の前に配置

### Step 3: スタイリング
1. `src/App.css`にクイックタスクボタンのスタイルを追加
2. 黄色系の目立つ配色（⚡と調和）

### Step 4: 動作確認
1. クイックタスクボタンをクリック
2. 現在時刻をタスク名とするTodoが作成され、リストに追加される
3. 作成されたTodoのタイマーが開始されている（緑の停止ボタンが表示される）
4. タスクコードは空文字列である

## データフロー

```
ユーザーがクイックタスクボタンをクリック
  ↓
App.tsx: addQuickTask()呼び出し
  ↓
useTodos.ts: addQuickTask()
  ↓
getCurrentJSTTime()で現在時刻を取得
  ↓
TodoRepository.createTodo('', currentTime)
  ↓
newTodo.startTimer()でタイマー開始
  ↓
setTodosWithPersist()でリストに追加
  ↓
IPC経由で永続化（楽観的更新）
  ↓
UI更新: 新しいTodoが表示され、タイマーが実行中の状態
```

## MVCアーキテクチャの遵守

### Model層
- **再利用**: 既存の`TodoRepository.createTodo()`と`Todo.startTimer()`を使用
- **変更なし**: Model層への変更は不要（既存メソッドで要件を満たせる）

### Controller層
- **責務**: Todo作成とタイマー開始のロジックを組み合わせる
- **新規関数**: `addQuickTask()`を追加し、既存のModel層メソッドを組み合わせる
- **状態管理**: `setTodosWithPersist`を使用して楽観的更新を実施

### View層
- **責務**: UIの表示とユーザー操作の受付のみ
- **ローカル状態なし**: ボタンクリックをControllerに委譲するだけ
- **ビジネスロジックなし**: タスク生成ロジックはControllerに実装

## テスト戦略

### 手動テスト
1. **基本機能**:
   - クイックタスクボタンをクリック
   - 現在時刻をタスク名とするTodoが作成される
   - taskcodeが空であることを確認
   - タイマーが開始されている（緑の停止ボタンが表示）

2. **連続実行**:
   - クイックタスクボタンを複数回クリック
   - それぞれ異なる時刻のタスクが作成される
   - すべてのタスクでタイマーが開始されている

3. **永続化**:
   - クイックタスクを作成
   - アプリを再起動
   - タスクが保存されていることを確認

4. **既存機能の動作確認**:
   - クイックタスク作成後、通常のタスク追加が正常に動作する
   - タイマーの停止が正常に動作する
   - タスクの編集、削除が正常に動作する

### 単体テスト（省略）
- `addQuickTask`は既存の`createTodo`と`startTimer`を組み合わせているだけなので、新規の単体テストは不要
- 既存のテストでカバー済み

## 注意事項

1. **タイムゾーン**: `getCurrentJSTTime()`を使用してJST時刻を取得する
2. **既存機能の再利用**: `TodoRepository.createTodo()`と`Todo.startTimer()`を組み合わせる
3. **後方互換性**: 既存のTodo作成フローに影響を与えない（新機能追加のみ）
4. **破壊的変更なし**: Model層、既存のController層メソッド、View層コンポーネントの変更なし

## 実装順序

1. Controller層の実装（`useTodos.ts`）
2. View層の実装（`App.tsx`）
3. スタイリング（`App.css`）
4. 動作確認（手動テスト）

## 見積もり

- Controller層の実装: 15分
- View層の実装: 10分
- スタイリング: 5分
- 動作確認: 10分

**合計**: 約40分

## 補足: 設計の根拠

### なぜModel層を変更しないのか
- 既存の`TodoRepository.createTodo()`と`Todo.startTimer()`で要件を満たせる
- 「クイックタスク」は単に「taskcodeが空で、textが現在時刻のTodo」という特別なTodoではなく、通常のTodoとして扱える
- ビジネスロジックの複雑性を増やさない

### なぜController層で組み合わせるのか
- Controller層の責務は「ViewとModelの仲介」
- UI操作（クイックタスクボタンクリック）をModel層のメソッド呼び出しに変換するのはControllerの役割
- `addQuickTask`は既存メソッドの組み合わせであり、新しいビジネスルールではない

### ボタン配置の理由
- チェックイン/チェックアウトボタンと同じ「素早い操作」のカテゴリ
- 先頭に配置することで視認性と操作性を向上
- ⚡絵文字は「クイック」「素早い」を視覚的に表現
