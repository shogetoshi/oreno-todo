# Issue #0010: 実行中にするtodoは常に一つ

## Issue概要

現在の実装では、複数のTodoのタイマーを同時に開始できてしまいます。このIssueでは、あるTodoのタイマーを開始した際に、他に実行中のTodoがあれば自動的に停止するように変更します。

## 現状分析

### タイマー開始の現在のフロー

1. **View層**: `TodoItem.tsx`の`handleTimerClick`が呼び出される
2. **Controller層**: `useTodos.ts`の`startTimer`関数が呼び出される
3. **Model層**: `TodoRepository.startItemTimer`が呼び出される

現在の`startTimer`は以下のように実装されています:

```typescript
// useTodos.ts (行115-117)
const startTimer = useCallback((id: string) => {
  setTodosWithPersist((prev) => TodoRepository.startItemTimer(prev, id));
}, [setTodosWithPersist]);
```

```typescript
// TodoRepository.ts (行108-112)
static startItemTimer(items: ListItem[], id: string): ListItem[] {
  return items.map((item) =>
    item.getId() === id ? item.startTimer() : item
  );
}
```

この実装では、指定されたIDのアイテムのタイマーを開始するだけで、他の実行中のタイマーを停止していません。

### 既存の停止機能

`TodoRepository`には既に以下の便利なメソッドが実装されています:

- `findRunningItem(items)`: 現在進行中のアイテムを検索
- `stopAllRunningItems(items)`: すべての進行中アイテムのタイマーを停止

## 実装計画

### 1. Model層: TodoRepository.tsに新しいメソッドを追加

`TodoRepository.startItemTimer`の動作を変更するのではなく、新しいメソッド`startItemTimerExclusive`を追加します。これにより既存のメソッドは変更せず、テストの修正も不要です。

**追加メソッド**: `TodoRepository.startItemTimerExclusive`
- 役割: 指定IDのアイテムのタイマーを開始する前に、すべての進行中アイテムのタイマーを停止する
- 処理フロー:
  1. `stopAllRunningItems`で全ての実行中アイテムを停止
  2. `startItemTimer`で指定IDのアイテムのタイマーを開始

実装イメージ:
```typescript
static startItemTimerExclusive(items: ListItem[], id: string): ListItem[] {
  // 実装内容は省略（仮実装で作成）
}
```

### 2. Controller層: useTodos.tsのstartTimer関数を修正

`startTimer`関数が`TodoRepository.startItemTimer`の代わりに`TodoRepository.startItemTimerExclusive`を呼び出すように変更します。

変更箇所: `src/hooks/useTodos.ts` 行115-117

変更前:
```typescript
const startTimer = useCallback((id: string) => {
  setTodosWithPersist((prev) => TodoRepository.startItemTimer(prev, id));
}, [setTodosWithPersist]);
```

変更後:
```typescript
const startTimer = useCallback((id: string) => {
  setTodosWithPersist((prev) => TodoRepository.startItemTimerExclusive(prev, id));
}, [setTodosWithPersist]);
```

### 3. View層: 変更なし

View層は`useTodos`フックの`startTimer`を呼び出すだけなので、変更は不要です。

## テストの追加

`TodoRepository.test.ts`に`startItemTimerExclusive`のテストケースを追加します:

- 他に実行中のアイテムがない場合、正常にタイマーが開始されること
- 他に実行中のアイテムがある場合、そのアイテムのタイマーが停止され、指定アイテムのタイマーが開始されること
- 複数の実行中アイテムがある場合、すべてのアイテムのタイマーが停止されること

## 影響範囲

### 変更されるファイル

- `src/models/TodoRepository.ts`: 新メソッド`startItemTimerExclusive`の追加
- `src/hooks/useTodos.ts`: `startTimer`関数の1行修正
- `src/models/TodoRepository.test.ts`: テストケースの追加

### 変更されないファイル

- View層のコンポーネント（`TodoItem.tsx`, `App.tsx`など）
- `Todo.ts`, `CalendarEvent.ts`などのエンティティクラス
- 既存の`TodoRepository.startItemTimer`メソッド（後方互換性のため残す）

## 考慮事項

### 後方互換性

既存の`startItemTimer`メソッドは変更せず、新しいメソッド`startItemTimerExclusive`を追加します。これにより:
- 既存のテストが壊れない
- 将来的に排他的でない動作が必要になった場合に対応できる

### HTTPエンドポイント経由の操作

現在、HTTP APIから直接タイマーを開始するエンドポイントは存在しませんが、将来追加される場合は`useTodos`の`startTimer`を使用するため、自動的に排他的動作が適用されます。

### パフォーマンス

`stopAllRunningItems`と`startItemTimer`は両方とも配列の`map`を使用するため、2回のイテレーションが発生します。ただし、通常のTodoリストのサイズを考えると、パフォーマンスへの影響は無視できるレベルです。

### ユーザー体験

タイマーを開始すると、他の実行中タイマーが自動的に停止するため:
- ユーザーは手動で停止する手間が省ける
- 複数タスクが同時進行しているという誤解がなくなる
- より正確な時間計測が可能になる

## まとめ

この実装では、Issue #0010で要求されている「実行中にするtodoは常に一つ」という要件を、MVCアーキテクチャに従い、既存のコードを最小限変更することで実現します。

変更箇所:
1. Model層: `TodoRepository.startItemTimerExclusive`メソッドの追加
2. Controller層: `useTodos.startTimer`の1行修正
3. Test層: テストケースの追加

View層は変更不要で、既存のUIがそのまま動作します。
