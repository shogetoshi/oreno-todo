# Issue 0022: タスク実行時間の積み上げ棒グラフ表示機能の実装解説

## 概要

本ドキュメントは、Issue 0022「タスク実行の内訳を積み上げ棒グラフで表示したい」の要件に基づき、`b65eeab`から`aa5745c`までの差分で実装された機能について詳細に解説します。

この実装は2つのフェーズで構成されています：
1. **初期実装** (コミット `34ace37`): 機能の完全な実装
2. **MVCリファクタリング** (コミット `aa5745c`): アーキテクチャ準拠への改善

## Issue要件の整理

### 要件サマリー

Issue 0022では以下の7つの要件が定義されています：

| # | 要件 | 重要度 |
|---|------|--------|
| 1 | 日付の横に横長の積み上げ棒グラフを表示 | 必須 |
| 2 | 各todoごとにどれくらいの時間を使用したのかを積み上げ棒グラフで表示 | 必須 |
| 3 | どの日に時間を使用したかはきちんとtimeRangesの日付を見て考慮する | **最重要** |
| 4 | グラフには1時間ごとの目盛を表示 | 必須 |
| 5 | 各タスクごとに色を分けることで視覚的に分かるようにして | 必須 |
| 6 | 棒グラフは12時間までなら累積の作業時間の大小によって縮尺が変わらないように固定。12時間を過ぎた場合は横幅は変えず、密度を上げて表示 | 必須 |
| 7 | その日の実行時間が0だった時などでも、必ず全ての日付に一律にグラフを表示すること | 必須 |

### 要件3の詳細解説

要件3は本実装の核心であり、特に注意が必要な仕様です：

> どの日に時間を使用したかはきちんとtimeRangesの日付を見て考慮してください。例えば2025-11-28に時間を使ったとしても、完了しなければ2025-11-29の枠の中にも**表示**されることに注意してください。それでも時間を費やしたとカウントするのは2025-11-28だけです。

**具体例**：
- 2025-11-28にタスクAを2時間実行したが未完了
- タスクAは期日が2025-11-29のため、2025-11-29の日付グループに**表示される**
- しかし、積み上げ棒グラフでは：
  - 2025-11-28: タスクAの2時間を**カウント**
  - 2025-11-29: タスクAの実行時間は0時間（**カウントしない**）

**実装への影響**：
- **日付グルーピング**: `DateGroupedTodoList`が担当（既存ロジック）
- **実行時間計算**: `calculateExecutionTimeForDate`が`timeRanges`の`start`日付のみを見てカウント

---

## フェーズ1: 初期実装 (コミット 34ace37)

### 1.1 新規追加ファイル

#### 1.1.1 `src/utils/taskExecutionTime.ts`

**役割**: タスク実行時間の計算ロジックを担当するModel層のユーティリティ

**関数1: `calculateExecutionTimeForDate`**

```typescript
export function calculateExecutionTimeForDate(todo: Todo, date: string): number {
  if (todo.timeRanges.length === 0) {
    return 0;
  }

  let totalMinutes = 0;

  for (const range of todo.timeRanges) {
    const startTime = parseJSTString(range.start);
    const startDate = extractDateFromJST(range.start);

    // このtimeRangeが指定日付に該当しない場合はスキップ
    if (startDate !== date) {
      continue;
    }

    // 終了時刻を取得（endがnullの場合は現在時刻）
    const endTime = range.end ? parseJSTString(range.end) : new Date();

    // 時間差を分に変換
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    totalMinutes += durationMinutes;
  }

  return totalMinutes;
}
```

**実装のポイント**:

1. **日付フィルタリング（要件3への対応）**:
   ```typescript
   const startDate = extractDateFromJST(range.start);
   if (startDate !== date) {
     continue;
   }
   ```
   - `timeRanges`の各エントリーについて、`start`フィールドから日付を抽出
   - 指定された日付と一致する`timeRange`のみを集計対象とする
   - これにより「どの日に時間を使用したか」を正確に判定

2. **実行中タスクへの対応**:
   ```typescript
   const endTime = range.end ? parseJSTString(range.end) : new Date();
   ```
   - `end`が`null`の場合（タイマー実行中）は現在時刻を使用
   - リアルタイムで実行時間が増加する

3. **複数セッションの合計**:
   - 同じ日に複数回作業した場合、全ての`timeRange`を合計
   - 例: 午前1時間、午後2時間 → 合計3時間

**関数2: `calculateExecutionTimesForDate`**

```typescript
export function calculateExecutionTimesForDate(
  todos: Todo[],
  date: string
): Map<string, number> {
  const executionTimes = new Map<string, number>();

  for (const todo of todos) {
    const minutes = calculateExecutionTimeForDate(todo, date);
    if (minutes > 0) {
      executionTimes.set(todo.getId(), minutes);
    }
  }

  return executionTimes;
}
```

**実装のポイント**:

1. **効率的なデータ構造**:
   - `Map<string, number>`を使用し、O(1)でTodo IDから実行時間を取得可能
   - View層での描画時に高速なルックアップを実現

2. **実行時間0の除外**:
   - `if (minutes > 0)`により、その日に作業していないTodoは結果に含まれない
   - View層での条件分岐を削減

**関数3: `assignColorToTodo`**

```typescript
export function assignColorToTodo(todoId: string): string {
  // IDをハッシュ化して色を生成
  let hash = 0;
  for (let i = 0; i < todoId.length; i++) {
    hash = todoId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // HSL色空間で色相を分散させ、彩度と明度を固定
  const hue = Math.abs(hash) % 360;
  const saturation = 70;
  const lightness = 60;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
```

**実装のポイント**:

1. **決定論的な色生成**:
   - 同じTodo IDに対して常に同じ色を返す
   - ページリロード時にも色が変わらず、ユーザー体験が向上

2. **HSL色空間の活用**:
   - **色相（Hue）**: 0-360度の範囲でハッシュ値から計算し、色の分散を最大化
   - **彩度（Saturation）**: 70%固定で適度な鮮やかさ
   - **明度（Lightness）**: 60%固定で視認性を確保

3. **Issue要件への対応**:
   - Issueでは「ランダムに色を決める」とあったが、決定論的な実装を採用
   - より良いユーザー体験のための判断

#### 1.1.2 `src/utils/taskExecutionTime.test.ts`

**役割**: `taskExecutionTime.ts`の包括的な単体テスト

**テストケース構成**:

| 関数 | テストケース数 | カバレッジ内容 |
|------|--------------|--------------|
| `calculateExecutionTimeForDate` | 5 | 実行時間なし、単一セッション、複数セッション、**日付フィルタリング**、実行中タスク |
| `calculateExecutionTimesForDate` | 2 | 複数Todo処理、実行時間0除外 |
| `assignColorToTodo` | 3 | 一貫性、分散性、フォーマット |

**重要なテストケース: 日付フィルタリング**

```typescript
it('異なる日付のtimeRangesは除外する', () => {
  const todo = new Todo(
    'test-id',
    'TASK001',
    'Test task',
    null,
    '2025-11-28 10:00:00',
    '2025-11-28 10:00:00',
    [
      {
        start: '2025-11-28 10:00:00',
        end: '2025-11-28 11:00:00' // 60分（2025-11-28）
      },
      {
        start: '2025-11-29 14:00:00',
        end: '2025-11-29 15:00:00' // 60分（2025-11-29）
      }
    ]
  );

  const result = calculateExecutionTimeForDate(todo, '2025-11-28');
  expect(result).toBe(60);

  const result2 = calculateExecutionTimeForDate(todo, '2025-11-29');
  expect(result2).toBe(60);
});
```

このテストは**要件3の核心部分を検証**しており、最も重要なテストケースです。

#### 1.1.3 `src/components/TaskExecutionStackBar.tsx` (初期版)

**役割**: 積み上げ棒グラフを表示するViewコンポーネント

**初期実装の構造**:

```typescript
export const TaskExecutionStackBar = ({ todos, date }: TaskExecutionStackBarProps) => {
  // その日のTodoごとの実行時間を計算
  const executionTimes = calculateExecutionTimesForDate(todos, date);

  // ===== ここからビジネスロジック（後にModel層に移動） =====
  // 合計実行時間を計算
  let totalMinutes = 0;
  for (const minutes of executionTimes.values()) {
    totalMinutes += minutes;
  }

  // 12時間基準の判定
  const BASE_HOURS = 12;
  const BASE_MINUTES = BASE_HOURS * 60;
  const displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES);

  // 目盛の生成
  const totalHours = Math.ceil(displayMaxMinutes / 60);
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => i);
  // ===== ビジネスロジックここまで =====

  return (
    <div className="task-execution-stackbar">
      {/* グラフ本体 */}
      <div className="stackbar-bar">
        {executionTimes.size === 0 ? (
          <div className="stackbar-empty"></div>
        ) : (
          Array.from(executionTimes.entries()).map(([todoId, minutes]) => {
            const widthPercent = (minutes / displayMaxMinutes) * 100;
            const todo = todos.find((t) => t.getId() === todoId);
            const todoText = todo ? todo.getText() : '';
            const color = assignColorToTodo(todoId);
            const hours = (minutes / 60).toFixed(1);

            return (
              <div
                key={todoId}
                className="stackbar-segment"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: color
                }}
                title={`${todoText}: ${hours}h`}
              />
            );
          })
        )}
      </div>

      {/* 時間目盛 */}
      <div className="stackbar-scale">
        {hourMarkers.map((hour) => {
          const positionPercent = (hour * 60 / displayMaxMinutes) * 100;
          return (
            <div
              key={hour}
              className="stackbar-scale-marker"
              style={{ left: `${positionPercent}%` }}
            >
              <div className="stackbar-scale-line"></div>
              <div className="stackbar-scale-label">{hour}h</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**初期実装の問題点**:

1. **ビジネスロジックがView層に存在**:
   - 合計時間の計算
   - 12時間基準の判定
   - 目盛の生成
   - これらは本来Model層の責務

2. **テストが困難**:
   - ビジネスロジックがReactコンポーネント内にあるため、単体テスト不可
   - UIテスト（Playwright等）でしか検証できない

3. **MVCアーキテクチャ違反**:
   - `CLAUDE.md`で定義されたアーキテクチャに準拠していない

**初期実装の利点**:

1. **機能は完全に動作**:
   - 全てのIssue要件を満たしている
   - ユーザーから見れば問題ない

2. **シンプルな構造**:
   - 1つのコンポーネントで完結
   - 理解しやすい

#### 1.1.4 `src/components/TaskExecutionStackBar.css`

**役割**: グラフのスタイル定義

**主要スタイルの解説**:

```css
.stackbar-bar {
  display: flex;              /* 子要素を横並びに配置 */
  height: 24px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;           /* border-radiusを適用するために必要 */
  background-color: #f9f9f9; /* 実行時間0の場合の背景色 */
}
```

```css
.stackbar-segment {
  height: 100%;
  transition: opacity 0.2s;
  cursor: pointer;
  border-right: 1px solid rgba(255, 255, 255, 0.3); /* セグメント間の境界線 */
}

.stackbar-segment:hover {
  opacity: 0.8; /* ホバー時のフィードバック */
}
```

```css
.stackbar-scale-marker {
  position: absolute;
  top: 0;
  transform: translateX(-50%); /* 目盛を中央揃え */
}
```

**要件への対応**:

- **要件7（実行時間0でも表示）**: `background-color: #f9f9f9`で空のグラフも可視化
- **要件5（色分け）**: セグメントごとに`backgroundColor`を動的に設定
- **ユーザビリティ**: ホバー時の透明度変更でインタラクティブ性を向上

### 1.2 既存ファイルの変更

#### 1.2.1 `src/components/DateGroupedTodoList.tsx`

**変更内容**:

```typescript
// インポート追加
import { Todo } from '../models/Todo';
import { TaskExecutionStackBar } from './TaskExecutionStackBar';

// コンポーネント内で Todo型のフィルタリング
const todoItems = todos.filter((item): item is Todo => item.getType() === 'todo');

// 日付グループごとにグラフを配置
<div key={group.date} className="date-group">
  <h2 className="date-group-header">{group.displayDate}</h2>
  {/* タスク実行時間の積み上げ棒グラフ */}
  <TaskExecutionStackBar todos={todoItems} date={group.date} />
  <ul className="todo-list">
    {/* 既存のTodoリスト */}
  </ul>
</div>
```

**実装のポイント**:

1. **Todo型のフィルタリング**:
   ```typescript
   const todoItems = todos.filter((item): item is Todo => item.getType() === 'todo');
   ```
   - `ListItem`配列から`Todo`型のみを抽出
   - `CalendarEvent`は実行時間の概念がないため除外
   - TypeScriptの型述語（`item is Todo`）で型安全性を確保

2. **グラフの配置**:
   - 日付ヘッダーの直後、Todoリストの直前に配置
   - 視覚的な流れ: 「その日のタスク実行状況 → 個別のTodoリスト」

3. **要件への対応**:
   - **要件1（日付の横に表示）**: 日付グループ内に配置
   - **要件3（日付ごとの計算）**: `date={group.date}`を渡すことで正確な計算を実現

---

## フェーズ2: MVCリファクタリング (コミット aa5745c)

### 2.1 リファクタリングの動機

初期実装は機能的には完全でしたが、以下の理由からリファクタリングが必要と判断されました：

1. **MVCアーキテクチャ違反**:
   - `CLAUDE.md`で定義された「ビジネスロジックはModel層に集約する」という原則に違反
   - View層にビジネスロジックが存在

2. **テスト困難性**:
   - ビジネスロジックがReactコンポーネント内にあるため単体テスト不可
   - バグ混入のリスクが高い

3. **保守性の低下**:
   - ビジネスロジックとUIロジックが混在し、変更時の影響範囲が不明確

4. **再利用性の欠如**:
   - グラフ表示の計算ロジックを他のコンポーネントで再利用できない

### 2.2 リファクタリング内容

#### 2.2.1 `src/utils/taskExecutionTime.ts`への追加

**新規インターフェース1: `TaskExecutionSegment`**

```typescript
export interface TaskExecutionSegment {
  todoId: string;
  todoText: string;
  minutes: number;
  color: string;
}
```

**目的**: 積み上げ棒グラフの1セグメント（1つのTodo）の表示情報を型安全に表現

**新規インターフェース2: `StackBarDisplayConfig`**

```typescript
export interface StackBarDisplayConfig {
  segments: TaskExecutionSegment[];
  totalMinutes: number;
  displayMaxMinutes: number;
  hourMarkers: number[];
}
```

**目的**: 積み上げ棒グラフの表示に必要な全ての情報を1つのオブジェクトにまとめる

**新規関数: `calculateStackBarDisplay`**

```typescript
export function calculateStackBarDisplay(
  todos: Todo[],
  date: string
): StackBarDisplayConfig {
  const segments: TaskExecutionSegment[] = [];
  let totalMinutes = 0;

  // 各Todoの実行時間を計算してセグメント情報を作成
  for (const todo of todos) {
    const minutes = calculateExecutionTimeForDate(todo, date);
    if (minutes > 0) {
      segments.push({
        todoId: todo.getId(),
        todoText: todo.getText(),
        minutes,
        color: assignColorToTodo(todo.getId())
      });
      totalMinutes += minutes;
    }
  }

  // 12時間（720分）を基準値とする
  const BASE_MINUTES = 12 * 60;

  // 表示する最大時間（12時間以上の場合は実際の時間、未満の場合は12時間）
  const displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES);

  // 1時間ごとの目盛を生成
  const totalHours = Math.ceil(displayMaxMinutes / 60);
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => i);

  return {
    segments,
    totalMinutes,
    displayMaxMinutes,
    hourMarkers
  };
}
```

**この関数の責務**:

1. **セグメント情報の生成**:
   - 各Todoの実行時間を計算
   - Todoテキスト、色を取得
   - `TaskExecutionSegment`配列を構築

2. **12時間基準の判定（要件6）**:
   ```typescript
   const displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES);
   ```
   - 合計時間が12時間未満の場合は720分（12時間）を使用
   - 12時間以上の場合は実際の合計時間を使用

3. **目盛の生成（要件4）**:
   ```typescript
   const totalHours = Math.ceil(displayMaxMinutes / 60);
   const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => i);
   ```
   - `displayMaxMinutes`に基づいて必要な目盛数を計算
   - 0時間から最大時間まで1時間刻みの配列を生成

4. **View層が必要とする全ての情報を返す**:
   - `segments`: 描画する各セグメントの情報
   - `totalMinutes`: 合計実行時間（表示用）
   - `displayMaxMinutes`: グラフの横幅の基準値
   - `hourMarkers`: 目盛の位置配列

#### 2.2.2 `src/components/TaskExecutionStackBar.tsx`のリファクタリング

**リファクタリング後の実装**:

```typescript
export const TaskExecutionStackBar = ({ todos, date }: TaskExecutionStackBarProps) => {
  // すべての計算をModel層に委譲
  const displayConfig = calculateStackBarDisplay(todos, date);

  return (
    <div className="task-execution-stackbar">
      <div className="stackbar-container">
        {/* 積み上げ棒グラフ本体 */}
        <div className="stackbar-bar">
          {displayConfig.segments.length === 0 ? (
            <div className="stackbar-empty"></div>
          ) : (
            displayConfig.segments.map(({ todoId, todoText, minutes, color }) => {
              const widthPercent = (minutes / displayConfig.displayMaxMinutes) * 100;
              const hours = (minutes / 60).toFixed(1);

              return (
                <div
                  key={todoId}
                  className="stackbar-segment"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: color
                  }}
                  title={`${todoText}: ${hours}h`}
                />
              );
            })
          )}
        </div>

        {/* 時間目盛 */}
        <div className="stackbar-scale">
          {displayConfig.hourMarkers.map((hour) => {
            const positionPercent = (hour * 60 / displayConfig.displayMaxMinutes) * 100;
            return (
              <div
                key={hour}
                className="stackbar-scale-marker"
                style={{ left: `${positionPercent}%` }}
              >
                <div className="stackbar-scale-line"></div>
                <div className="stackbar-scale-label">{hour}h</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

**変更のポイント**:

1. **ビジネスロジックの完全な削除**:
   - 合計時間の計算: 削除（Model層に移動）
   - 12時間基準の判定: 削除（Model層に移動）
   - 目盛の生成: 削除（Model層に移動）
   - Todoテキストの取得: 削除（Model層が提供）
   - 色の割り当て: 削除（Model層が提供）

2. **View層の責務のみに専念**:
   - `displayConfig`を受け取る
   - セグメントをイテレートしてDOM要素を生成
   - スタイルを適用
   - ツールチップを設定

3. **コード行数の削減**:
   - 初期実装: 約80行
   - リファクタリング後: 約70行（ビジネスロジックを除外したため実質的にはさらに少ない）

4. **可読性の向上**:
   - コンポーネントがシンプルになり、何を表示しているのか一目瞭然
   - ビジネスロジックとUIロジックの混在がない

#### 2.2.3 `src/utils/taskExecutionTime.test.ts`への追加

**新規テストケース（7個追加）**:

```typescript
describe('calculateStackBarDisplay', () => {
  it('12時間未満の場合は12時間を基準にする', () => {
    const todos = [
      new Todo(/* 60分のtimeRange */)
    ];

    const result = calculateStackBarDisplay(todos, '2025-11-28');

    expect(result.totalMinutes).toBe(60);
    expect(result.displayMaxMinutes).toBe(720); // 12時間 = 720分
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].todoId).toBe('test-id-1');
    expect(result.segments[0].todoText).toBe('Task 1');
    expect(result.segments[0].minutes).toBe(60);
  });

  it('12時間を超える場合は実際の時間を使用する', () => {
    const todos = [
      new Todo(/* 13時間 = 780分のtimeRange */)
    ];

    const result = calculateStackBarDisplay(todos, '2025-11-28');

    expect(result.totalMinutes).toBe(780);
    expect(result.displayMaxMinutes).toBe(780); // 実際の時間を使用
    expect(result.segments.length).toBe(1);
  });

  it('実行時間が0の場合は空のセグメント配列を返す', () => {
    const todos = [
      new Todo(/* timeRangesが空 */)
    ];

    const result = calculateStackBarDisplay(todos, '2025-11-28');

    expect(result.totalMinutes).toBe(0);
    expect(result.displayMaxMinutes).toBe(720); // 12時間基準
    expect(result.segments.length).toBe(0);
  });

  // 他4つのテストケース（複数Todo、hourMarkers検証など）
});
```

**テストカバレッジの向上**:

- **初期実装**: 10テストケース（Model層の基本関数のみ）
- **リファクタリング後**: 17テストケース（統合的な計算ロジックもカバー）

**テストの意義**:

1. **ビジネスロジックの正確性保証**:
   - 12時間基準の判定が正しく動作することを検証
   - 目盛生成のロジックが正しいことを検証

2. **リグレッション防止**:
   - 将来の変更時にバグ混入を防ぐ

3. **ドキュメントとしての役割**:
   - テストコードが仕様書として機能
   - `calculateStackBarDisplay`の挙動が明確に

### 2.3 リファクタリングの効果

#### 2.3.1 MVCアーキテクチャへの準拠

**Before（初期実装）**:

| レイヤー | 責務 | 問題点 |
|---------|------|--------|
| Model | 基本的な実行時間計算 | ✅ 正しい |
| View | 実行時間計算 + 12時間基準判定 + 目盛生成 + UI表示 | ❌ ビジネスロジックを含む |
| Controller | なし | ✅ 読み取り専用機能のため不要 |

**After（リファクタリング後）**:

| レイヤー | 責務 | 状態 |
|---------|------|------|
| Model | 実行時間計算 + 12時間基準判定 + 目盛生成 + セグメント情報構築 | ✅ 全てのビジネスロジックを集約 |
| View | UI表示のみ | ✅ 表示のみに専念 |
| Controller | なし | ✅ 読み取り専用機能のため不要 |

#### 2.3.2 テスタビリティの向上

| 項目 | Before | After |
|------|--------|-------|
| ビジネスロジックの単体テスト | ❌ 不可能（Reactコンポーネント内） | ✅ 可能（純粋関数） |
| テスト実行速度 | 遅い（UIテスト必要） | 速い（純粋関数のテスト） |
| テストコードの保守性 | 低い | 高い |
| テストカバレッジ | 部分的 | 包括的（17テストケース） |

#### 2.3.3 保守性の向上

**変更シナリオ1: 「18時間基準に変更したい」**

- **Before**: `TaskExecutionStackBar.tsx`を変更 → UIとロジックが混在しているため慎重な変更が必要
- **After**: `taskExecutionTime.ts`の`BASE_MINUTES`を変更するのみ → テストで動作を保証

**変更シナリオ2: 「セグメントの並び順を変更したい」**

- **Before**: `TaskExecutionStackBar.tsx`を変更 → ループ処理を変更
- **After**: `calculateStackBarDisplay`内でソート処理を追加 → Viewは変更不要

**変更シナリオ3: 「別の画面でも同じグラフを表示したい」**

- **Before**: `TaskExecutionStackBar.tsx`をコピー → DRY原則違反
- **After**: `calculateStackBarDisplay`を再利用 → 新しいViewコンポーネントを作成するのみ

#### 2.3.4 コード品質の向上

**定量的指標**:

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| View層のビジネスロジック行数 | 15行 | 0行 | -100% |
| テストケース数 | 10 | 17 | +70% |
| 関数の責務の明確性 | 低い | 高い | 主観的 |

**定性的評価**:

1. **単一責任原則（SRP）の遵守**:
   - `TaskExecutionStackBar`: UI表示のみ
   - `calculateStackBarDisplay`: ビジネスロジックのみ

2. **依存性逆転原則（DIP）の遵守**:
   - ViewがModelに依存（正しい方向）
   - ModelはViewに依存しない

3. **開放閉鎖原則（OCP）への近接**:
   - 新しい計算ロジックを追加する際、既存コードの変更を最小化可能

---

## MVCアーキテクチャとの完全な対応

### Model層

**ファイル**:
- `src/utils/taskExecutionTime.ts`

**責務**:
- Todoの実行時間計算（`calculateExecutionTimeForDate`）
- 複数Todoの実行時間計算（`calculateExecutionTimesForDate`）
- 色割り当てロジック（`assignColorToTodo`）
- グラフ表示情報の統合計算（`calculateStackBarDisplay`）

**特徴**:
- React、Electronに依存しない純粋関数
- イミュータブルな設計（元のTodoを変更しない）
- 包括的な単体テスト（17テストケース）
- 型安全性（TypeScript）

### View層

**ファイル**:
- `src/components/TaskExecutionStackBar.tsx`
- `src/components/TaskExecutionStackBar.css`
- `src/components/DateGroupedTodoList.tsx`（変更部分）

**責務**:
- グラフの視覚的表現
- ユーザーインタラクション（ホバー時のツールチップ）
- Model層から受け取ったデータの表示

**特徴**:
- ビジネスロジックを含まない
- Model層の関数を呼び出すのみ
- ステートレス（ローカル状態なし）

### Controller層

**本実装では不要**

理由:
- グラフ表示は読み取り専用の機能
- 既存のTodoデータ（`timeRanges`）を使用するのみ
- 新しい状態管理や副作用（IPC通信、ファイルI/Oなど）は不要
- View層が直接Model層を呼び出す形で十分

---

## Issue要件とのマッピング

| Issue要件 | 実装箇所 | 実装方法 | フェーズ |
|----------|---------|---------|---------|
| 1. 日付の横に横長の積み上げ棒グラフを表示 | `DateGroupedTodoList.tsx` | 日付ヘッダー直後に`TaskExecutionStackBar`を配置 | フェーズ1 |
| 2. 各todoごとにどれくらいの時間を使用したのかを積み上げ棒グラフで表示 | `TaskExecutionStackBar.tsx` | `displayConfig.segments`をイテレートしてセグメント生成 | フェーズ1→2 |
| 3. どの日に時間を使用したかはきちんとtimeRangesの日付を見て考慮 | `taskExecutionTime.ts`の`calculateExecutionTimeForDate` | `extractDateFromJST(range.start)`で日付を抽出し、指定日付とマッチする`timeRange`のみを集計 | フェーズ1 |
| 4. グラフには1時間ごとの目盛を表示 | `taskExecutionTime.ts`の`calculateStackBarDisplay` | `hourMarkers`配列を生成し、View層が表示 | フェーズ1→2 |
| 5. 各タスクごとに色を分けることで視覚的に分かるようにして | `taskExecutionTime.ts`の`assignColorToTodo` | Todo IDからハッシュ値を計算し、HSL色空間で色を生成 | フェーズ1 |
| 6. 棒グラフは12時間までなら累積の作業時間の大小によって縮尺が変わらないように固定。12時間を過ぎた場合は横幅は変えず、密度を上げて表示 | `taskExecutionTime.ts`の`calculateStackBarDisplay` | `displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES)`で基準値を設定 | フェーズ1→2 |
| 7. その日の実行時間が0だった時などでも、必ず全ての日付に一律にグラフを表示すること | `TaskExecutionStackBar.tsx` | `displayConfig.segments.length === 0`の場合に`stackbar-empty`要素を表示 | フェーズ1 |

**フェーズ1→2**の意味:
- フェーズ1で機能実装
- フェーズ2でビジネスロジックをModel層に移動（機能は不変）

---

## 実装の工夫点

### 1. 決定論的な色生成

**Issue要件**: 「ランダムに色を決める」

**実装**: ハッシュベースの決定論的な色生成

**理由**:
- 同じTodoに対して常に同じ色を表示
- ページリロード時にも色が変わらない
- ユーザーが色でTodoを識別できるようになる

### 2. HSL色空間の活用

**RGB色空間の問題点**:
- ランダムなRGB値は視認性が低い色を生成する可能性
- 色の分散が不均一

**HSL色空間の利点**:
- 色相（Hue）を分散させることで色の違いを最大化
- 彩度と明度を固定することで視認性を保証
- 背景色との調和を維持

### 3. 12時間基準の固定縮尺

**目的**: 異なる日付間でのグラフの視覚的比較を容易にする

**実装**:
```typescript
const displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES);
```

**効果**:
- 0-12時間の範囲では全ての日付で同じ縮尺
- 「今日は昨日より作業時間が多い/少ない」を一目で判断可能
- 12時間を超える場合は自動的に拡大

### 4. イミュータブルな設計

**実装箇所**: Model層の全関数

**特徴**:
- 引数のTodoオブジェクトを変更しない
- 常に新しい値を返す
- 副作用がない

**利点**:
- バグ混入のリスクが低い
- テストが容易
- 並行処理に安全

### 5. TypeScriptの型システムの活用

**型述語の使用**:
```typescript
const todoItems = todos.filter((item): item is Todo => item.getType() === 'todo');
```

**インターフェースによる型安全性**:
```typescript
interface TaskExecutionSegment {
  todoId: string;
  todoText: string;
  minutes: number;
  color: string;
}
```

**効果**:
- コンパイル時にバグを検出
- IDEの補完機能が効果的に機能
- リファクタリングが安全

### 6. 包括的なテスト戦略

**テストケースの設計**:
- **境界値テスト**: 実行時間0、12時間ちょうど、12時間超過
- **正常系テスト**: 単一Todo、複数Todo、複数セッション
- **異常系テスト**: 実行中タスク（`end`が`null`）

**テストカバレッジ**:
- Model層の全関数をカバー
- ビジネスロジックの正確性を保証

---

## まとめ

### 実装の特徴

1. **Issue要件の完全な実装**:
   - 7つの要件全てを満たす
   - 特に要件3（日付ごとの正確な時間計算）を厳密に実装

2. **MVCアーキテクチャの遵守**:
   - ビジネスロジックをModel層に集約
   - View層は表示のみに専念
   - フェーズ2のリファクタリングで完全に準拠

3. **高いテスタビリティ**:
   - Model層の全関数に対して単体テスト
   - 17テストケース、包括的なカバレッジ

4. **保守性と拡張性**:
   - 単一責任原則の遵守
   - ビジネスロジックとUIロジックの明確な分離
   - 将来の変更が容易

5. **ユーザビリティ**:
   - 視覚的な色分け
   - ホバー時のツールチップ
   - 12時間固定縮尺による比較容易性
   - 実行時間0でもグラフを表示

### 2つのフェーズの意義

**フェーズ1（初期実装）**:
- 機能を素早く実装し、Issue要件を満たす
- ユーザーに価値を提供

**フェーズ2（MVCリファクタリング）**:
- コードベースの品質を向上
- 長期的な保守性を確保
- プロジェクトのアーキテクチャ原則に準拠

### プロジェクト全体への貢献

本実装は、以下の点でプロジェクト全体に貢献します：

1. **MVCアーキテクチャのベストプラクティス**:
   - `CLAUDE.md`で定義されたアーキテクチャを実践
   - 今後の機能実装の模範となる

2. **テスト文化の醸成**:
   - Model層の包括的なテスト
   - テストファーストの開発手法の実践

3. **ユーザー価値の提供**:
   - タスク実行時間の可視化
   - 日々の作業状況の把握が容易に

4. **コードの再利用性**:
   - `calculateStackBarDisplay`は他の画面でも再利用可能
   - DRY原則の実践

---

## 参考情報

### 関連ファイル

- Issue定義: `/Users/hirano.shigetoshi/repositories/oreno-todo/issue/0022.md`
- MVCアーキテクチャドキュメント: `/Users/hirano.shigetoshi/repositories/oreno-todo/docs/MVC-ARCHITECTURE.md`
- プロジェクトガイドライン: `/Users/hirano.shigetoshi/repositories/oreno-todo/CLAUDE.md`

### コミットハッシュ

- 初期実装: `34ace37e533493d6338870e78ffe3dd815c33653`
- MVCリファクタリング: `aa5745c386fa3d779c89cca4b1dda9f85520e872`
- 差分範囲: `b65eeab..aa5745c`

### テスト実行

```bash
# 全テストを実行
pnpm test

# taskExecutionTimeのテストのみ実行
pnpm test taskExecutionTime
```

---

## 付録: コード統計

### ファイル統計

| ファイル | 行数 | 種類 |
|---------|------|------|
| `src/utils/taskExecutionTime.ts` | 150 | Model |
| `src/utils/taskExecutionTime.test.ts` | 365 | Test |
| `src/components/TaskExecutionStackBar.tsx` | 70 | View |
| `src/components/TaskExecutionStackBar.css` | 68 | View |
| `src/components/DateGroupedTodoList.tsx` | +8 | View |

### 機能統計

- **新規追加関数**: 4
- **新規追加インターフェース**: 2
- **新規追加コンポーネント**: 1
- **テストケース**: 17
- **CSSクラス**: 8

### 変更統計（git diff）

```bash
git diff --stat b65eeab..aa5745c
```

- ファイル変更数: 6
- 追加行数: 約650行
- 削除行数: 約50行
