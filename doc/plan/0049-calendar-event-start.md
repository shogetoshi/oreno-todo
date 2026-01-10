# カレンダーイベントのstartボタン挙動拡張 実装計画書

## 作成日
2026-01-10

## Issue概要
カレンダーイベントのstartボタン（▶️ボタン）を押した時の挙動を以下のように変更する：
1. URLを開く（実装済み）
2. 他に実行中のタスクがあれば全て停止する
3. 完了ボタンを押した時と同じ処理（完了状態への切り替え + タイムレンジの記録）

## 現状分析

### 1. カレンダーイベントのstartボタン処理
**場所**: `src/components/TodoItem.tsx` (94-105行目)

```typescript
const handleTimerClick = () => {
  if (todo.getType() === ListItemType.CALENDAR_EVENT) {
    onOpenMeetingUrl(todoId);
  } else {
    if (isTimerRunning) {
      onStopTimer(todoId);
    } else {
      onStartTimer(todoId);
    }
  }
};
```

**現在の動作**: カレンダーイベントの場合、`onOpenMeetingUrl`を呼び出すのみ。

### 2. 実行中タスクの停止処理
**場所**: `src/models/TodoRepository.ts` (140-145行目)

```typescript
static stopAllRunningItems(items: ListItem[]): ListItem[] {
  return items.map((item) =>
    item.isTimerRunning() ? item.stopTimer() : item
  );
}
```

**場所**: `src/hooks/useTodos.ts` (135-138行目)

```typescript
const stopRunningTodo = useCallback(() => {
  setTodosWithPersist((prev) => TodoRepository.stopAllRunningItems(prev));
}, [setTodosWithPersist]);
```

**現状**: 既に実装済み。`TodoRepository.stopAllRunningItems`は全ての実行中アイテムを停止する。

### 3. 完了ボタンの処理
**場所**: `src/components/TodoItem.tsx` (241-243行目)

```typescript
<button onClick={() => onToggle(todoId)} className="complete-button">
  ✅
</button>
```

**場所**: `src/hooks/useTodos.ts` (65-68行目)

```typescript
const toggleTodo = useCallback((id: string) => {
  setTodosWithPersist((prev) => TodoRepository.toggleItem(prev, id));
}, [setTodosWithPersist]);
```

**場所**: `src/models/TodoRepository.ts` (46-50行目)

```typescript
static toggleItem(items: ListItem[], id: string): ListItem[] {
  return items.map((item) =>
    item.getId() === id ? item.toggleCompleted() : item
  );
}
```

**場所**: `src/models/CalendarEvent.ts` (134-182行目)

CalendarEventの`toggleCompleted()`メソッド:
- 完了時: `startTime`と`endTime`から`TimeRange`を生成して`timeRanges`に追加
- 完了解除時: `timeRanges`を空配列にリセット

### 4. CalendarEventのタイマー機能
**場所**: `src/models/CalendarEvent.ts` (184-206行目)

CalendarEventでは以下のメソッドが**no-op**として実装されている:
- `startTimer()`: 自身をそのまま返す
- `stopTimer()`: 自身をそのまま返す
- `isTimerRunning()`: 常に`false`を返す

**理由**: CalendarEventはタイマー機能を使用せず、`startTime`/`endTime`で処理時間を管理する設計。

## 実装方針

### アプローチ
カレンダーイベントのstartボタン押下時に以下の処理を実行する：
1. MTG URLを開く（既存処理）
2. 他の実行中タスクを全て停止する（新規）
3. カレンダーイベントを完了状態にする（新規）

### 実装する必要がある処理

#### Controller層（useTodos）
新しいメソッド `startCalendarEvent` を追加:
```typescript
const startCalendarEvent = useCallback(async (id: string) => {
  // 1. MTG URLを開く
  await openMeetingUrl(id);

  // 2. 他の実行中タスクを全て停止
  // 3. カレンダーイベントを完了状態にする
  setTodosWithPersist((prev) => {
    // まず全ての実行中タスクを停止
    const itemsWithStoppedTimers = TodoRepository.stopAllRunningItems(prev);
    // 次に指定IDのカレンダーイベントを完了状態にする
    return TodoRepository.toggleItem(itemsWithStoppedTimers, id);
  });
}, [openMeetingUrl, setTodosWithPersist]);
```

#### View層（TodoItem）
`handleTimerClick`を修正:
```typescript
const handleTimerClick = () => {
  if (todo.getType() === ListItemType.CALENDAR_EVENT) {
    onStartCalendarEvent(todoId);  // 新しいハンドラーを呼び出す
  } else {
    if (isTimerRunning) {
      onStopTimer(todoId);
    } else {
      onStartTimer(todoId);
    }
  }
};
```

### 変更箇所の詳細

#### 1. src/hooks/useTodos.ts
- 新しいメソッド `startCalendarEvent` を追加
- return文に `startCalendarEvent` を追加

#### 2. src/components/TodoItem.tsx
- propsに `onStartCalendarEvent: (id: string) => void` を追加
- `handleTimerClick`を修正してカレンダーイベントの場合に新しいハンドラーを呼び出す

#### 3. src/components/TodoList.tsx
- propsに `onStartCalendarEvent: (id: string) => void` を追加
- `TodoItem`に `onStartCalendarEvent` propを渡す

#### 4. src/App.tsx (または DateGroupedTodoList.tsx)
- `useTodos`から `startCalendarEvent` を取得
- `TodoList`に `onStartCalendarEvent` propを渡す

### Model層の変更
**不要**: 既存の`TodoRepository`のメソッド（`stopAllRunningItems`, `toggleItem`）を組み合わせて実装できる。

## 実装順序

1. **Controller層**: `src/hooks/useTodos.ts`に`startCalendarEvent`メソッドを追加
2. **View層**: `src/components/TodoItem.tsx`のpropsとハンドラーを修正
3. **View層**: `src/components/TodoList.tsx`にpropsを追加して渡す
4. **View層**: `src/App.tsx`（または使用している箇所）でpropsを接続
5. **テスト**: 動作確認
   - カレンダーイベントのstartボタンを押す
   - 他のタスクが実行中の場合、停止されることを確認
   - カレンダーイベントが完了状態になることを確認
   - MTG URLが開くことを確認

## 注意事項

### 1. 完了状態の切り替えについて
- カレンダーイベントが**既に完了状態**の場合、`toggleCompleted()`を呼ぶと完了が解除される
- これを防ぐために、完了状態でない場合のみ切り替えを実行するロジックが必要
- **対応方法**: `toggleItem`の代わりに、未完了の場合のみ完了状態にする処理を実装

### 2. エラーハンドリング
- `openMeetingUrl`が失敗した場合でも、タスク停止と完了処理は実行される
- MTG URLがない場合、`openMeetingUrl`は何もしないが、エラーは発生しない

### 3. プラグイン通知
- 通常のタスクの`startTimer`では、プラグインに`notifyTimerStart`を送信している
- カレンダーイベントではタイマーを使わないため、プラグイン通知は不要と判断
- ただし、将来的にカレンダーイベント開始時の通知が必要になる可能性あり

## 改善案

### 改善案1: 完了状態でない場合のみ完了する
現在の`toggleItem`は完了状態を反転するため、既に完了している場合は未完了に戻ってしまう。
以下のように、未完了の場合のみ完了させる専用メソッドを作成する:

**Model層**: `src/models/TodoRepository.ts`
```typescript
/**
 * 指定IDのListItemを完了状態にする（既に完了している場合は何もしない）
 */
static completeItem(items: ListItem[], id: string): ListItem[] {
  return items.map((item) => {
    if (item.getId() === id && !item.isCompleted()) {
      return item.toggleCompleted();
    }
    return item;
  });
}
```

**Controller層**: `src/hooks/useTodos.ts`の`startCalendarEvent`
```typescript
const startCalendarEvent = useCallback(async (id: string) => {
  await openMeetingUrl(id);

  setTodosWithPersist((prev) => {
    const itemsWithStoppedTimers = TodoRepository.stopAllRunningItems(prev);
    return TodoRepository.completeItem(itemsWithStoppedTimers, id);
  });
}, [openMeetingUrl, setTodosWithPersist]);
```

### 改善案2: UIの変更
カレンダーイベントが完了状態になった後、startボタン（▶️）をどう表示するか:
- **案A**: 完了後もstartボタンを表示し、押すと完了が解除される（現状のまま）
- **案B**: 完了後はstartボタンを無効化または非表示にする
- **案C**: 完了後はstartボタンの挙動を変更（再度押すと完了解除）

**推奨**: 案Aで進める（既存の完了ボタンの挙動と一貫性がある）

## 実装後のテストケース

### 1. 正常系
- [ ] カレンダーイベントのstartボタンを押すとMTG URLが開く
- [ ] カレンダーイベントのstartボタンを押すと、他の実行中タスクが停止される
- [ ] カレンダーイベントのstartボタンを押すと、カレンダーイベントが完了状態になる
- [ ] 完了状態のカレンダーイベントの`timeRanges`に`startTime`-`endTime`が記録される

### 2. 異常系
- [ ] MTG URLが空の場合、エラーにならず他の処理（停止・完了）は実行される
- [ ] 既に完了しているカレンダーイベントのstartボタンを押すと、完了が解除される（toggleの挙動）

### 3. エッジケース
- [ ] 複数のタスクが実行中の状態でカレンダーイベントを開始すると、全て停止される
- [ ] カレンダーイベントが実行中（ただしタイマーは使わない）の状態で他のTodoを開始しても競合しない

## 備考
- 今回の変更は**View層とController層のみ**で完結する
- Model層の既存メソッドを再利用することで、コードの重複を避けられる
- MVCアーキテクチャに準拠し、ビジネスロジックは`TodoRepository`に集約されている
