# Issue #0025: TodoとCalendarEventの消費時間表示の改善

## Issue概要

各todoに表示されている消費時間の数値を`xx/yy`という表記に変更する。

### 要求仕様

**通常のTodoの場合:**
- `xx`: その表示されている日付枠における消費時間（横棒グラフで利用する数値と一致）
- `yy`: そのTodoでの通算の消費時間（現在の実装で表示されている数値のまま）

**スケジュールイベント（CalendarEvent）の場合:**
- `xx`: `timeRanges`から算出される消費時間（日付枠における消費時間）
- `yy`: `startTime`と`endTime`から算出される時間（イベント全体の予定時間）

## 現状分析

### 現在の実装

1. **時間表示の箇所**: `src/components/TodoItem.tsx`の147-149行目
   ```tsx
   <span className="execution-time">
     {executionTimeMinutes}
   </span>
   ```
   - `executionTimeMinutes`は37行目で`todo.getTotalExecutionTimeInMinutes()`から取得

2. **Todo.getTotalExecutionTimeInMinutes()**: `src/models/Todo.ts`の164-179行目
   - `timeRanges`の全ての時間範囲を合計して分単位で返す
   - 現在の実装では全期間の合計時間を返している（yyに相当）

3. **CalendarEvent.getTotalExecutionTimeInMinutes()**: `src/models/CalendarEvent.ts`の200-214行目
   - `startTime`と`endTime`から処理時間を算出（yyに相当）

4. **日付ごとの消費時間計算**: `src/utils/taskExecutionTime.ts`の10-38行目
   - `calculateExecutionTimeForDate()`関数で特定日付のtimeRangesの合計を計算
   - 横棒グラフで使用されている（xxに相当）

### 問題点

- 現在の表示は`getTotalExecutionTimeInMinutes()`のみを使用しており、全期間の合計時間（yy）しか表示していない
- 日付枠における消費時間（xx）を表示する機能がない

## 実装方針

MVCアーキテクチャとRepository Patternに従い、以下の順序で実装を行う。

### 1. Model層の拡張

#### 1.1 ListItemインターフェースに新しいメソッドを追加

`src/models/ListItem.ts`に以下のメソッドを追加:
- `getExecutionTimeForDate(date: string): number`
  - 指定日付における消費時間を分単位で返す
  - Todoの場合: その日付のtimeRangesの合計
  - CalendarEventの場合: その日付のtimeRangesの合計

#### 1.2 Todoクラスにメソッドを実装

`src/models/Todo.ts`に`getExecutionTimeForDate()`メソッドを実装:
- `calculateExecutionTimeForDate()`と同じロジックを使用
- ただし、utilから直接呼び出すのではなく、Todoクラス自身がロジックを持つ
- timeRangesを日付でフィルタリングして合計を計算

#### 1.3 CalendarEventクラスにメソッドを実装

`src/models/CalendarEvent.ts`に`getExecutionTimeForDate()`メソッドを実装:
- Todoと同様に、timeRangesを日付でフィルタリングして合計を計算

#### 1.4 CalendarEventの通算時間（yy）の定義を明確化

CalendarEventの`getTotalExecutionTimeInMinutes()`の実装を見直す:
- 現在は`startTime`と`endTime`から算出（イベント全体の予定時間）
- この実装をそのまま維持（yyとして使用）

### 2. View層の変更

#### 2.1 TodoItemコンポーネントの変更

`src/components/TodoItem.tsx`を変更:
- propsに`currentDate`を追加（日付グループから渡される）
- `xx`の計算: `todo.getExecutionTimeForDate(currentDate)`を呼び出し
- `yy`の計算: 既存の`todo.getTotalExecutionTimeInMinutes()`を使用
- 表示形式を`{xx}/{yy}`に変更

#### 2.2 DateGroupedTodoListコンポーネントの変更

`src/components/DateGroupedTodoList.tsx`を変更:
- `TodoItem`コンポーネントに`currentDate={group.date}`を渡す

### 3. テストの追加

#### 3.1 Model層のテスト

新規ファイル`src/models/ListItem.test.ts`を作成:
- `Todo.getExecutionTimeForDate()`のテスト
  - 指定日付のtimeRangesのみを集計することを確認
  - 複数日のtimeRangesがある場合、正しくフィルタリングされることを確認
- `CalendarEvent.getExecutionTimeForDate()`のテスト
  - 同様のテストケース

#### 3.2 View層のテスト

`src/components/TodoItem.test.tsx`を作成または更新:
- `xx/yy`形式で表示されることを確認
- Todoの場合: 日付ごとの時間/通算時間が正しく表示される
- CalendarEventの場合: 日付ごとの時間/予定時間が正しく表示される

### 4. ドキュメントの更新

以下のドキュメントを更新:
- `docs/MVC-ARCHITECTURE.md`: `ListItem`インターフェースの新しいメソッドを記載
- `CLAUDE.md`: 必要に応じて更新

## 実装手順の詳細

### ステップ1: ListItemインターフェースの拡張

1. `src/models/ListItem.ts`を編集
2. `getExecutionTimeForDate(date: string): number`メソッドを追加

### ステップ2: Todoクラスへの実装

1. `src/models/Todo.ts`を編集
2. `getExecutionTimeForDate(date: string)`メソッドを実装
   - `src/utils/timeFormat.ts`から`parseJSTString`, `extractDateFromJST`をインポート
   - timeRangesをループし、指定日付のものだけを集計

### ステップ3: CalendarEventクラスへの実装

1. `src/models/CalendarEvent.ts`を編集
2. `getExecutionTimeForDate(date: string)`メソッドを実装
   - Todoと同じロジック

### ステップ4: TodoItemコンポーネントの変更

1. `src/components/TodoItem.tsx`を編集
2. `TodoItemProps`に`currentDate: string`を追加
3. コンポーネント内で以下を計算:
   - `const executionTimeForDate = todo.getExecutionTimeForDate(currentDate);`
   - `const totalExecutionTime = todo.getTotalExecutionTimeInMinutes();`
4. 表示を変更:
   ```tsx
   <span className="execution-time">
     {executionTimeForDate}/{totalExecutionTime}
   </span>
   ```

### ステップ5: DateGroupedTodoListコンポーネントの変更

1. `src/components/DateGroupedTodoList.tsx`を編集
2. `TodoItem`に`currentDate={group.date}`を渡す

### ステップ6: テストの作成・更新

1. `src/models/Todo.test.ts`（新規または既存）にテストを追加
2. `src/models/CalendarEvent.test.ts`（新規または既存）にテストを追加
3. `src/components/TodoItem.test.tsx`（新規）を作成

### ステップ7: 動作確認

1. 開発サーバーを起動: `pnpm run electron:dev`
2. 複数日にまたがるTodoを作成し、各日付枠で`xx/yy`が正しく表示されることを確認
3. CalendarEventが正しく`timeRanges時間/予定時間`を表示することを確認

### ステップ8: テスト実行

1. ユニットテストを実行: `pnpm test`
2. すべてのテストが通過することを確認

### ステップ9: ドキュメント更新

1. `docs/MVC-ARCHITECTURE.md`を更新
2. 必要に応じて`CLAUDE.md`を更新

## 考慮事項

### 破壊的変更

- `ListItem`インターフェースに新しいメソッドを追加するため、実装クラス（Todo、CalendarEvent）での実装が必須
- プロジェクトは初期版開発段階のため、後方互換性を気にする必要はない

### パフォーマンス

- `getExecutionTimeForDate()`は毎回timeRangesをループするため、パフォーマンスへの影響は最小限
- 日付グループごとに1回の呼び出しのみなので問題なし

### エッジケース

- timeRangesが空の場合: 0を返す
- CalendarEventでstartTimeまたはendTimeがnullの場合:
  - `getExecutionTimeForDate()`は0を返す
  - `getTotalExecutionTimeInMinutes()`は既存の実装（0を返す）を維持

### スタイリング

- `xx/yy`形式の表示に合わせてCSSの調整が必要な場合がある
- 数値が大きくなった場合のレイアウト崩れに注意

## 実装完了条件

- [ ] ListItemインターフェースに`getExecutionTimeForDate()`メソッドが追加されている
- [ ] TodoクラスとCalendarEventクラスに`getExecutionTimeForDate()`が実装されている
- [ ] TodoItemコンポーネントが`xx/yy`形式で時間を表示している
- [ ] DateGroupedTodoListが各TodoItemに日付を渡している
- [ ] すべてのユニットテストが通過している
- [ ] 開発環境で実際に動作確認ができている
- [ ] ドキュメントが更新されている

## 補足

### Issueで要求されている内容との対応

- **通常のTodo**: `xx`は日付ごとの消費時間（横棒グラフと一致）、`yy`は通算の消費時間
  → `getExecutionTimeForDate(date)`と`getTotalExecutionTimeInMinutes()`で実現

- **CalendarEvent**: `xx`はtimeRangesから算出、`yy`はstartTime/endTimeから算出
  → `getExecutionTimeForDate(date)`と`getTotalExecutionTimeInMinutes()`（既存実装）で実現

### 実装における注意点

- Model層のロジックには直接的な実装の詳細は記載しない（関数レベルの役割と受け渡し構造を明確化）
- View層はロジックを持たず、Model層のメソッドを呼び出すのみ
- テストは必ずソースコードと同時に更新する
