# Issue #0043: 完了ボタン押下時にタイマーを自動停止

## 概要

Todoの完了ボタンを押した際に、計測中のタイマーが動いていれば自動的に停止する機能を実装します。

## 現状の問題

- 完了ボタンを押してもタイマーが停止しない
- タスクを完了したのに計測が続いている状態になる可能性がある
- 「完了 = 作業終了」という意図に反する

## 実装内容

### 1. Model層: Todo.toggleCompleted()の修正

**ファイル**: `src/models/Todo.ts`

**変更内容**:
- `toggleCompleted()`メソッドを修正し、タイマーが実行中の場合は停止してから完了状態を切り替えるようにします
- 完了→未完了への切り替え時はタイマーに影響を与えません

**実装アプローチ**:
```typescript
toggleCompleted(): Todo {
  // 未完了→完了への切り替えの場合、タイマーを停止してから完了状態を設定
  if (!this.isCompleted() && this.isTimerRunning()) {
    return this.stopTimer().setCompleted(true);
  }
  // 完了→未完了への切り替え、またはタイマーが動いていない場合は通常通り
  return this.setCompleted(!this.isCompleted());
}
```

**理由**:
- `toggleCompleted()`は`setCompleted()`を使って実装されているため、`toggleCompleted()`のみを修正することで、すべての完了操作をカバーできます
- `stopTimer()`は既にイミュータブルな設計で、新しいインスタンスを返すため、メソッドチェーンで組み合わせられます

### 2. Model層: TodoRepository.toggleItem()の動作確認

**ファイル**: `src/models/TodoRepository.ts`

**変更内容**:
- 変更不要です
- `TodoRepository.toggleItem()`は内部で`item.toggleCompleted()`を呼び出しているため、Todo層の修正が自動的に反映されます

### 3. テストの追加

**ファイル**: `src/models/Todo.test.ts`

**追加テストケース**:
1. 計測中のTodoを完了にすると、タイマーが停止する
2. 計測中のTodoを完了にすると、`timeRanges`の最後のレコードに`end`が設定される
3. 計測していないTodoを完了にしても正常に動作する
4. 完了済みTodoを未完了に戻してもタイマーは開始しない
5. タイマーが停止済みの状態で完了にしても正常に動作する

**ファイル**: `src/models/TodoRepository.test.ts`

**追加テストケース**:
1. `toggleItem()`で計測中のTodoを完了にすると、タイマーが停止する
2. `toggleItem()`で完了済みTodoを未完了に戻してもタイマーは開始しない

### 4. Controller層・View層の動作確認

**ファイル**: `src/hooks/useTodos.ts`, `src/components/*.tsx`

**変更内容**:
- 変更不要です
- Controller層の`toggleTodo()`は`TodoRepository.toggleItem()`を呼び出しているため、Model層の変更が自動的に反映されます
- View層も同様に、`useTodos`フック経由で呼び出すため、変更不要です

## 受け入れ条件

- [x] 計測中のTodoを完了にすると、タイマーが停止する
- [x] 計測中のTodoを完了にすると、`timeRanges`の最後のレコードに`end`が設定される
- [x] 計測していないTodoを完了にしても正常に動作する
- [x] 完了済みTodoを未完了に戻してもタイマーは開始しない
- [x] 単体テストが追加されている

## 考慮事項

### イミュータブル設計の維持
- `stopTimer()`と`setCompleted()`は既にイミュータブルな実装になっているため、メソッドチェーンで安全に組み合わせられます

### 既存機能への影響
- `toggleCompleted()`の動作が変わるため、既存のテストが影響を受ける可能性があります
- ただし、「完了時にタイマーを停止する」は直感的な動作であり、破壊的変更とは言えません

### 関連Issue
- Issue #0009: 完了済みTodoに対する計測開始時の挙動改善（逆のケース）
  - 完了済みTodoに対して計測を開始すると未完了に戻す機能
  - 本実装は逆方向（未完了→完了時にタイマー停止）の動作
- Issue #0010: 実行中にするtodoは常に一つ
  - タイマーの排他制御
  - 本実装により、完了時に自動停止するため、排他制御がより確実になります

## 実装順序

1. `src/models/Todo.ts`の`toggleCompleted()`メソッドを修正
2. `src/models/Todo.test.ts`に単体テストを追加
3. `src/models/TodoRepository.test.ts`に統合テストを追加
4. すべてのテストが通ることを確認
5. 手動テストで動作確認
6. コミット・プッシュ

## 注意事項

- 完了→未完了への切り替え時は、タイマーに影響を与えないことを確認する
- タイマーが停止済みの状態で完了にしても、正常に動作することを確認する
- `setCompleted()`メソッドは直接呼び出される場合もあるが、Issue #0009の実装により、完了済みTodoに対する計測開始時に未完了に戻す処理が既に存在するため、整合性は保たれる
