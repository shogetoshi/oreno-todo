# Issue #0008: rawDataプロパティの削除とtimeRanges直接保持への設計変更

## 背景

現在、`Todo`クラスは`private rawData: any`というプロパティでJSONデータを保持しています。この設計には以下の問題があります：

1. **型安全性の欠如**: `any`型のため、TypeScriptの型チェックが効かない
2. **二重管理**: `id`, `taskcode`, `text`などは既にプロパティとして保持しているのに、rawDataにも重複して保存している
3. **コードの複雑さ**: timeRanges配列へのアクセスが`this.rawData.timeRanges`という間接的な方法になっている
4. **意図が不明瞭**: なぜrawDataが必要なのか、コードから理解しづらい

## 目的

- timeRanges配列をTodoクラスの直接のプロパティとして保持する
- rawDataプロパティを削除し、コードをシンプルで型安全にする
- 保守性と可読性を向上させる

## 実装内容

### 1. `src/models/Todo.ts` の変更

#### 1-1. プロパティの追加と削除

**変更前**:
```typescript
export class Todo {
  private rawData: any; // 削除対象

  constructor(
    public readonly id: string,
    public readonly taskcode: string,
    public readonly text: string,
    public readonly completedAt: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    rawData?: any
  ) {
    this.rawData = rawData || { id, taskcode, text, completedAt, createdAt, updatedAt, timeRanges: [] };
  }
```

**変更後**:
```typescript
export class Todo {
  constructor(
    public readonly id: string,
    public readonly taskcode: string,
    public readonly text: string,
    public readonly completedAt: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly timeRanges: TimeRange[] // 直接保持
  ) {}
```

#### 1-2. `setTaskcode()` メソッド (75-79行目)

**変更前**:
```typescript
setTaskcode(newTaskcode: string): Todo {
  const now = getCurrentJSTTime();
  const newRawData = { ...this.rawData, taskcode: newTaskcode, updatedAt: now };
  return new Todo(this.id, newTaskcode, this.text, this.completedAt, this.createdAt, now, newRawData);
}
```

**変更後**:
```typescript
setTaskcode(newTaskcode: string): Todo {
  const now = getCurrentJSTTime();
  return new Todo(this.id, newTaskcode, this.text, this.completedAt, this.createdAt, now, this.timeRanges);
}
```

#### 1-3. `setText()` メソッド (84-88行目)

**変更前**:
```typescript
setText(newText: string): Todo {
  const now = getCurrentJSTTime();
  const newRawData = { ...this.rawData, text: newText, updatedAt: now };
  return new Todo(this.id, this.taskcode, newText, this.completedAt, this.createdAt, now, newRawData);
}
```

**変更後**:
```typescript
setText(newText: string): Todo {
  const now = getCurrentJSTTime();
  return new Todo(this.id, this.taskcode, newText, this.completedAt, this.createdAt, now, this.timeRanges);
}
```

#### 1-4. `toggleCompleted()` メソッド (93-98行目)

**変更前**:
```typescript
toggleCompleted(): Todo {
  const now = getCurrentJSTTime();
  const newCompletedAt = this.completedAt === null ? now : null;
  const newRawData = { ...this.rawData, completedAt: newCompletedAt, updatedAt: now };
  return new Todo(this.id, this.taskcode, this.text, newCompletedAt, this.createdAt, now, newRawData);
}
```

**変更後**:
```typescript
toggleCompleted(): Todo {
  const now = getCurrentJSTTime();
  const newCompletedAt = this.completedAt === null ? now : null;
  return new Todo(this.id, this.taskcode, this.text, newCompletedAt, this.createdAt, now, this.timeRanges);
}
```

#### 1-5. `setCompleted()` メソッド (103-108行目)

**変更前**:
```typescript
setCompleted(completed: boolean): Todo {
  const now = getCurrentJSTTime();
  const newCompletedAt = completed ? now : null;
  const newRawData = { ...this.rawData, completedAt: newCompletedAt, updatedAt: now };
  return new Todo(this.id, this.taskcode, this.text, newCompletedAt, this.createdAt, now, newRawData);
}
```

**変更後**:
```typescript
setCompleted(completed: boolean): Todo {
  const now = getCurrentJSTTime();
  const newCompletedAt = completed ? now : null;
  return new Todo(this.id, this.taskcode, this.text, newCompletedAt, this.createdAt, now, this.timeRanges);
}
```

#### 1-6. `startTimer()` メソッド (114-127行目)

**変更前**:
```typescript
startTimer(): Todo {
  const now = getCurrentJSTTime();
  const existingRanges: TimeRange[] = this.rawData.timeRanges || [];
  const newRange: TimeRange = {
    start: now,
    end: null
  };
  const newRawData = {
    ...this.rawData,
    timeRanges: [...existingRanges, newRange],
    updatedAt: now
  };
  return new Todo(this.id, this.taskcode, this.text, this.completedAt, this.createdAt, now, newRawData);
}
```

**変更後**:
```typescript
startTimer(): Todo {
  const now = getCurrentJSTTime();
  const newRange: TimeRange = {
    start: now,
    end: null
  };
  const newTimeRanges = [...this.timeRanges, newRange];
  return new Todo(this.id, this.taskcode, this.text, this.completedAt, this.createdAt, now, newTimeRanges);
}
```

#### 1-7. `stopTimer()` メソッド (133-159行目)

**変更前**:
```typescript
stopTimer(): Todo {
  const existingRanges: TimeRange[] = this.rawData.timeRanges || [];
  if (existingRanges.length === 0) {
    return this;
  }

  const newRanges = [...existingRanges];
  const lastRange = newRanges[newRanges.length - 1];

  if (lastRange.end === null) {
    const now = getCurrentJSTTime();
    newRanges[newRanges.length - 1] = {
      ...lastRange,
      end: now
    };

    const newRawData = {
      ...this.rawData,
      timeRanges: newRanges,
      updatedAt: now
    };
    return new Todo(this.id, this.taskcode, this.text, this.completedAt, this.createdAt, now, newRawData);
  }

  return this;
}
```

**変更後**:
```typescript
stopTimer(): Todo {
  if (this.timeRanges.length === 0) {
    return this;
  }

  const newRanges = [...this.timeRanges];
  const lastRange = newRanges[newRanges.length - 1];

  if (lastRange.end === null) {
    const now = getCurrentJSTTime();
    newRanges[newRanges.length - 1] = {
      ...lastRange,
      end: now
    };
    return new Todo(this.id, this.taskcode, this.text, this.completedAt, this.createdAt, now, newRanges);
  }

  return this;
}
```

#### 1-8. `isTimerRunning()` メソッド (165-172行目)

**変更前**:
```typescript
isTimerRunning(): boolean {
  const timeRanges: TimeRange[] = this.rawData.timeRanges || [];
  if (timeRanges.length === 0) {
    return false;
  }
  const lastRange = timeRanges[timeRanges.length - 1];
  return lastRange.end === null;
}
```

**変更後**:
```typescript
isTimerRunning(): boolean {
  if (this.timeRanges.length === 0) {
    return false;
  }
  const lastRange = this.timeRanges[this.timeRanges.length - 1];
  return lastRange.end === null;
}
```

#### 1-9. `getTotalExecutionTimeInMinutes()` メソッド (179-195行目)

**変更前**:
```typescript
getTotalExecutionTimeInMinutes(): number {
  const timeRanges: TimeRange[] = this.rawData.timeRanges || [];
  if (timeRanges.length === 0) {
    return 0;
  }

  const totalSeconds = timeRanges.reduce((total, range) => {
    // ... 計算処理
  }, 0);

  return Math.round(totalSeconds / 60);
}
```

**変更後**:
```typescript
getTotalExecutionTimeInMinutes(): number {
  if (this.timeRanges.length === 0) {
    return 0;
  }

  const totalSeconds = this.timeRanges.reduce((total, range) => {
    // ... 計算処理（変更なし）
  }, 0);

  return Math.round(totalSeconds / 60);
}
```

#### 1-10. `fromJSON()` メソッド (200-224行目)

**変更前**:
```typescript
static fromJSON(json: any): Todo {
  const now = getCurrentJSTTime();
  const completedAt: string | null = json.completedAt || null;
  const createdAt = json.createdAt || now;
  const updatedAt = json.updatedAt || now;
  const taskcode = json.taskcode || '';

  const jsonWithDefaults = {
    ...json,
    taskcode,
    timeRanges: json.timeRanges || [],
    createdAt,
    updatedAt
  };

  return new Todo(json.id, taskcode, json.text, completedAt, createdAt, updatedAt, jsonWithDefaults);
}
```

**変更後**:
```typescript
static fromJSON(json: any): Todo {
  const now = getCurrentJSTTime();
  const completedAt: string | null = json.completedAt || null;
  const createdAt = json.createdAt || now;
  const updatedAt = json.updatedAt || now;
  const taskcode = json.taskcode || '';
  const timeRanges: TimeRange[] = json.timeRanges || [];

  return new Todo(json.id, taskcode, json.text, completedAt, createdAt, updatedAt, timeRanges);
}
```

#### 1-11. `toJSON()` メソッド (230-232行目)

**変更前**:
```typescript
toJSON() {
  return this.rawData;
}
```

**変更後**:
```typescript
toJSON() {
  return {
    id: this.id,
    taskcode: this.taskcode,
    text: this.text,
    completedAt: this.completedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    timeRanges: this.timeRanges
  };
}
```

### 2. `src/models/TodoRepository.ts` の変更

#### 2-1. `createTodo()` メソッド (17-30行目)

**変更前**:
```typescript
static createTodo(taskcode: string, text: string): Todo {
  const id = crypto.randomUUID();
  const now = getCurrentJSTTime();
  const rawData = {
    id,
    taskcode,
    text,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    timeRanges: []
  };
  return new Todo(id, taskcode, text, null, now, now, rawData);
}
```

**変更後**:
```typescript
static createTodo(taskcode: string, text: string): Todo {
  const id = crypto.randomUUID();
  const now = getCurrentJSTTime();
  const timeRanges: TimeRange[] = [];
  return new Todo(id, taskcode, text, null, now, now, timeRanges);
}
```

#### 2-2. `createTodoFromCalendarEvent()` メソッド (223-250行目)

**変更前**:
```typescript
static createTodoFromCalendarEvent(event: CalendarEvent): Todo {
  const id = this.getIdFromCalendarEvent();
  const taskcode = this.getTaskcodeFromCalendarEvent(event);
  const text = this.getTextFromCalendarEvent(event);
  const completedAt = null;
  const createdAt = this.getCreatedAtFromCalendarEvent(event);
  const updatedAt = this.getUpdatedAtFromCalendarEvent(event);

  const { id: calendarEventId, ...eventWithoutId } = event;

  const rawData = {
    id,
    taskcode,
    text,
    completedAt,
    createdAt,
    updatedAt,
    timeRanges: [],
    ...eventWithoutId,
    calendarEventId
  };

  return new Todo(id, taskcode, text, completedAt, createdAt, updatedAt, rawData);
}
```

**変更後**:
```typescript
static createTodoFromCalendarEvent(event: CalendarEvent): Todo {
  const id = this.getIdFromCalendarEvent();
  const taskcode = this.getTaskcodeFromCalendarEvent(event);
  const text = this.getTextFromCalendarEvent(event);
  const completedAt = null;
  const createdAt = this.getCreatedAtFromCalendarEvent(event);
  const updatedAt = this.getUpdatedAtFromCalendarEvent(event);
  const timeRanges: TimeRange[] = [];

  return new Todo(id, taskcode, text, completedAt, createdAt, updatedAt, timeRanges);
}
```

**注意**: この変更により、Googleカレンダーイベントの追加情報（`location`, `attendees`, `start`, `end`など）は保存されなくなります。

### 3. テストファイルの更新

#### 3-1. `src/models/Todo.test.ts`

- **34-47行目**: `rawData`を指定しないテストケース → timeRangesを直接テスト
- **49-74行目**: `rawData`を指定するテストケース → timeRangesを直接指定するように変更
- **141-148行目**: `setTaskcode()`のrawData確認 → 削除または簡略化
- **280-297行目**: `rawData`を使用する全てのテストケース → timeRangesを直接使用

#### 3-2. `src/models/TodoRepository.test.ts`

- **41-46行目**: `rawData`を使用するテストケース → timeRangesを直接テスト
- **280-297行目, 323-333行目, 370-391行目**: rawDataを使用する箇所 → timeRangesを直接使用
- **984-1050行目**: カレンダーイベントのrawData検証テストケース → 削除または単純化（追加情報が保存されないことを明記）

## 影響範囲

### ✅ 影響なし（正常に動作する）

- Todoの基本機能（作成、編集、削除、完了切り替え）
- タイマー機能（開始、停止、実行時間計算）
- JSON形式でのデータ永続化（todos.jsonファイル）
- 既存のUI実装

### ⚠️ 影響あり（機能が失われる）

- **Googleカレンダーイベントの追加情報保存**:
  - `location`, `attendees`, `start`, `end`, `description`などのメタデータ
  - 現在のテストでは検証されているが、実際のUI実装では使用されていない可能性が高い
  - カレンダー連携を将来的に拡張する場合は、別途設計が必要

## 検証方法

1. **単体テストの実行**
   ```bash
   npm test
   ```
   すべてのテストが通過することを確認

2. **アプリケーションの動作確認**
   ```bash
   npm run electron:dev
   ```
   以下の機能が正常に動作することを確認：
   - Todo追加
   - Todo編集（タスクコード、テキスト）
   - Todo削除
   - Todo完了切り替え
   - タイマー開始/停止
   - 実行時間表示
   - アプリ再起動後のデータ復元

3. **既存データとの互換性確認**
   - 既存の`todos.json`ファイルが正常に読み込めることを確認
   - 新規作成したTodoが正しく保存されることを確認

## チェックリスト

- [ ] `Todo.ts`の修正完了
- [ ] `TodoRepository.ts`の修正完了
- [ ] `Todo.test.ts`の修正完了
- [ ] `TodoRepository.test.ts`の修正完了
- [ ] 単体テストが全て通過
- [ ] アプリケーションの動作確認完了
- [ ] 既存データとの互換性確認完了
- [ ] ドキュメント（`CLAUDE.md`, `docs/MVC-ARCHITECTURE.md`）の更新（必要に応じて）

## 参考情報

- 関連コミット: （このissueに基づく実装後に記載）
- 議論: このissueはコード設計改善の一環として提案されました
