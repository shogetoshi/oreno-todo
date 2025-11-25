# Issue 0016: 日付ごとにListItemをフィルタリングするロジックの実装

## 1. 概要（ハイレベルな意味説明）

本変更により、TODOアプリケーションのユーザーは「特定の日付に表示すべきアイテム」のみを見ることができるようになりました。これまではプレースホルダーとして全てのアイテムを表示していましたが、今回の実装で以下のような実際のユースケースに対応できるようになります。

- **未完了タスクの表示**: 作成されたタスクは、その作成日から未来の日付において継続的に表示される
- **完了タスクの記録**: 完了したタスクは、作成日から完了日までの期間に限定して表示される（「この日に作業していた」履歴を確認できる）
- **カレンダーイベントの当日表示**: Googleカレンダーから取得したイベントは、その開始日当日のみ表示される

この変更により、ユーザーは過去の特定日における「作業中だったタスク」と「その日のイベント」を正確に振り返ることができるようになります。また、未来の日付では「まだ作成されていないタスク」が表示されることがなくなり、時系列の整合性が保たれます。

## 2. 仕様レベルの変更内容

### 2.1 フィルタリングルールの定義

issue 0016では、日付ごとのアイテム表示条件として以下の3つのシナリオが定義されています。

#### 通常のTodo（未完了）

未完了のタスクは「作成日以降の全ての日付」に表示されます。

- 例: 1月15日に作成されたタスクは、1月15日、1月16日、1月17日...と未来の全ての日付で表示され続ける
- これにより「今やるべきタスク」が常に表示される状態を維持

#### 通常のTodo（完了済み）

完了したタスクは「作成日から完了日までの期間」にのみ表示されます。

- 例: 1月15日に作成され、1月20日に完了したタスクは、1月15日～1月20日の範囲でのみ表示される
- 1月14日（作成前）や1月21日以降（完了後）には表示されない
- これにより「その日に作業していたタスク」の履歴を正確に振り返ることが可能

#### カレンダーイベント

カレンダーイベントは「開始日（startTime）と同一の日付」のみに表示されます。

- 例: 1月20日14:00-15:00のミーティングは、1月20日のみに表示される
- 1月19日や1月21日には表示されない
- これによりイベントは「その日の予定」としてのみ扱われる

### 2.2 日付比較の仕様

全ての比較は「日付レベル」で行われ、時刻は考慮されません。

- `2025-01-15 09:00:00` と `2025-01-15 23:59:59` は同じ日付として扱われる
- これによりUIでの日単位のカレンダー表示と整合性が取れる

### 2.3 影響を受けるユースケース

以下のユースケースがこの変更により正しく動作するようになります。

1. **今日のビュー**: 今日作成されたタスク + 今日完了した既存タスク + 今日のイベント
2. **過去日のビュー**: その日に存在していた（作成済みかつ未完了 or 完了）タスク + その日のイベント
3. **未来日のビュー**: 既に作成された未完了タスク（未来に作成されるタスクは表示されない）

## 3. 実装方針の説明

### 3.1 設計アプローチ

この機能は以下のような設計方針で実装されています。

#### Repository Patternの遵守

全てのビジネスロジックは`TodoRepository`クラスに集約されています。これにより、

- ロジックの再利用性が高まる（UIコンポーネントから独立）
- 単体テストが容易になる（フレームワークへの依存なし）
- 変更の影響範囲が限定される（Repositoryのみを修正すれば良い）

#### ユーティリティ関数の分離

日付に関する汎用的な処理（`extractDateFromJST`, `compareDates`）は`timeFormat.ts`に配置されています。これは、

- 日付処理のロジックを再利用可能にする（他の機能でも利用可能）
- 単一責任の原則を守る（TodoRepositoryは「日付を比較する方法」を知る必要がない）
- テストを独立して実行できる

#### イミュータブルな実装

`filterItemsByDate`メソッドは元の配列を変更せず、新しい配列を返します。これにより、

- Reactの状態管理と相性が良い（再レンダリングの検出が正確）
- 副作用がなく、テストがしやすい
- バグの混入リスクが低い

### 3.2 代替案との比較

この実装では「ListItem配列全体をフィルタリングする」アプローチを取っていますが、以下のような代替案も考えられます。

#### 代替案1: データベースレベルでのフィルタリング

JSONファイルではなくSQLiteなどのデータベースを使用し、SQL WHERE句でフィルタリングする方法。しかし、本アプリケーションの現在のアーキテクチャ（JSONファイルベース）では過剰な変更となるため、採用していません。

#### 代替案2: 各アイテムにフィルタリングロジックを持たせる

`Todo`や`CalendarEvent`クラスに`shouldDisplayOnDate`メソッドを実装する方法。しかし、これはRepositoryパターンの「コレクション管理ロジックの集約」という方針に反するため、採用していません。

## 4. 主要なコード変更の解説

### 4.1 `TodoRepository.shouldDisplayOnDate`メソッドの実装

このメソッドは、1つの`ListItem`が指定された日付に表示されるべきかどうかを判定します。

```diff
+  static shouldDisplayOnDate(item: ListItem, date: string): boolean {
+    const itemType = item.getType();
+
+    if (itemType === ListItemType.TODO) {
+      // 通常のTodoの場合
+      const todo = item as Todo;
+      const createdDate = extractDateFromJST(todo.createdAt);
+
+      if (!todo.isCompleted()) {
+        // 未完了: 該当日がcreatedAt以降なら表示
+        return compareDates(date, createdDate) >= 0;
+      } else {
+        // 完了: 該当日がcreatedAt以降かつcompletedAt以前なら表示
+        const completedDate = todo.completedAt ? extractDateFromJST(todo.completedAt) : null;
+        if (!completedDate) {
+          // completedAtがnullの場合は表示しない（データ不整合）
+          return false;
+        }
+        return compareDates(date, createdDate) >= 0 && compareDates(date, completedDate) <= 0;
+      }
+    } else if (itemType === ListItemType.CALENDAR_EVENT) {
+      // カレンダーイベントの場合
+      const calendarEvent = item as CalendarEvent;
+      const startTime = calendarEvent.getStartTime();
+
+      if (!startTime) {
+        // startTimeがnullの場合は表示しない
+        return false;
+      }
+
+      const startDate = extractDateFromJST(startTime);
+      // 該当日がstartTime日付と同一の場合のみ表示
+      return compareDates(date, startDate) === 0;
+    }
+
+    // 未知のタイプの場合は表示しない
+    return false;
+  }
```

#### なぜこのファイルに配置したのか

`TodoRepository`は「Todoコレクションに対する操作」を提供するクラスであり、フィルタリングロジックもその責務の一部です。このメソッドは`filterItemsByDate`の実装詳細として使用されるため、同じクラス内に配置することで凝集度が高まります。

#### 実装の詳細

##### アイテムタイプによる分岐

まず`item.getType()`でアイテムの種類（Todo or CalendarEvent）を判定します。これは`ListItem`インターフェースの多態性を利用した設計です。各タイプには異なる表示ルールがあるため、この分岐は必須です。

##### 通常のTodo（未完了）の判定

```typescript
if (!todo.isCompleted()) {
  return compareDates(date, createdDate) >= 0;
}
```

未完了のTodoは「作成日以降」に表示されます。`compareDates(date, createdDate) >= 0`は「指定日が作成日と同じか、それより後」を意味します。

- `compareDates`の戻り値が0: 同じ日付 → 表示する
- `compareDates`の戻り値が正: 指定日が作成日より後 → 表示する
- `compareDates`の戻り値が負: 指定日が作成日より前 → 表示しない

##### 通常のTodo（完了済み）の判定

```typescript
const completedDate = todo.completedAt ? extractDateFromJST(todo.completedAt) : null;
if (!completedDate) {
  return false;
}
return compareDates(date, createdDate) >= 0 && compareDates(date, completedDate) <= 0;
```

完了済みのTodoは「作成日から完了日までの範囲」に表示されます。

- まず`completedAt`がnullでないことを確認します（データ整合性チェック）
- `compareDates(date, createdDate) >= 0`: 指定日が作成日以降
- `compareDates(date, completedDate) <= 0`: 指定日が完了日以前
- 両方が真の場合のみ表示する

この実装により、完了したタスクは「その期間に作業していた」という履歴として残ります。

##### カレンダーイベントの判定

```typescript
const startTime = calendarEvent.getStartTime();
if (!startTime) {
  return false;
}
const startDate = extractDateFromJST(startTime);
return compareDates(date, startDate) === 0;
```

カレンダーイベントは「開始日当日のみ」に表示されます。

- まず`startTime`がnullでないことを確認します（nullの場合は表示しない）
- `extractDateFromJST`で開始日時から日付部分のみを抽出
- `compareDates(date, startDate) === 0`で完全一致を確認（同じ日付のみ）

この実装により、イベントは「その日の予定」としてのみ扱われ、前日や翌日に表示されることはありません。

##### 未知のタイプへの対応

```typescript
// 未知のタイプの場合は表示しない
return false;
```

将来的に新しいアイテムタイプが追加された場合、デフォルトで「表示しない」という安全側の挙動を取ります。これにより、実装漏れがあっても誤ってアイテムを表示してしまうことを防ぎます。

### 4.2 `TodoRepository.filterItemsByDate`メソッドの変更

このメソッドは、`ListItem`配列全体をフィルタリングして、指定日に表示すべきアイテムのみを返します。

```diff
   static filterItemsByDate(items: ListItem[], date: string): ListItem[] {
-    // TODO: 後から実装する。現在は全てのアイテムを表示する
-    return items;
+    return items.filter((item) => TodoRepository.shouldDisplayOnDate(item, date));
   }
```

#### 変更内容

プレースホルダーとして「全てのアイテムをそのまま返す」実装から、`shouldDisplayOnDate`を使った実際のフィルタリング実装に変更されました。

#### なぜこのような実装なのか

- `Array.prototype.filter`を使用することで、宣言的で読みやすいコードになる
- `shouldDisplayOnDate`に判定ロジックを委譲することで、`filterItemsByDate`は「フィルタリングを実行する」という単一の責務のみを持つ
- イミュータブルな実装（新しい配列を返す）により、元の配列を変更しない安全な操作となる

### 4.3 日付処理ユーティリティ関数の追加（`timeFormat.ts`）

日付に関する汎用的な処理として、2つの新しい関数が追加されました。

#### `extractDateFromJST`関数

JST時刻文字列から日付部分のみを抽出します。

```diff
+/**
+ * JST時刻文字列から日付部分のみを抽出する（YYYY-MM-DD形式）
+ * @param jstString JST時刻文字列（"YYYY-MM-DD HH:MI:SS" or "YYYY-MM-DD"）
+ * @returns 日付文字列（"YYYY-MM-DD"）
+ */
+export function extractDateFromJST(jstString: string): string {
+  if (jstString.includes(' ')) {
+    return jstString.split(' ')[0];
+  }
+  return jstString;
+}
```

##### なぜこの関数が必要なのか

本アプリケーションでは、`Todo`の`createdAt`や`completedAt`は`"2025-01-15 12:34:56"`のような時刻付き文字列で保存されています。しかし、issueの仕様では「日付レベル」での比較のみを行うため、時刻部分を除去する処理が必要です。

##### 実装の詳細

- スペース文字の有無で時刻付き文字列かどうかを判定
- スペースがある場合は`split(' ')[0]`で日付部分のみを取得
- スペースがない場合（既に日付のみの文字列）はそのまま返す

この実装により、`"2025-01-15 12:34:56"` → `"2025-01-15"` や `"2025-01-15"` → `"2025-01-15"` のような柔軟な処理が可能になります。

##### なぜ`timeFormat.ts`に配置したのか

`timeFormat.ts`は時刻に関する処理を集約するユーティリティファイルです。日付抽出は時刻処理の一部であり、このファイルに配置することで以下のメリットがあります。

- 関連する処理が1箇所にまとまる（`getCurrentJSTTime`, `formatToJST`, `parseJSTString`と同じ場所）
- 他の機能でも日付抽出が必要になった際に再利用できる
- テストも`timeFormat.test.ts`にまとめられる

#### `compareDates`関数

2つの日付文字列を比較します。

```diff
+/**
+ * 日付文字列の比較（YYYY-MM-DD形式）
+ * @param date1 日付文字列1
+ * @param date2 日付文字列2
+ * @returns date1 < date2 なら負の数、date1 === date2 なら0、date1 > date2 なら正の数
+ */
+export function compareDates(date1: string, date2: string): number {
+  return date1.localeCompare(date2);
+}
```

##### なぜこの関数が必要なのか

日付の大小比較は`shouldDisplayOnDate`メソッド内で頻繁に使用されます。専用の関数として分離することで、

- コードの可読性が向上する（`compareDates(a, b) >= 0`は「aがb以降」という意図が明確）
- 将来的に比較ロジックを変更する場合、1箇所の修正で済む
- テストが独立して実行できる

##### 実装の詳細

`String.prototype.localeCompare`を使用しています。これは、

- `"YYYY-MM-DD"`形式の文字列を辞書順で比較すると、正しく日付の大小関係が判定される
  - 例: `"2025-01-15".localeCompare("2025-01-20")` → 負の数（15の方が小さい）
  - 例: `"2025-01-15".localeCompare("2025-01-15")` → 0（同じ）
  - 例: `"2025-01-20".localeCompare("2025-01-15")` → 正の数（20の方が大きい）
- `Date`オブジェクトへの変換が不要で、高速
- 年をまたぐ比較も正しく動作する（例: `"2024-12-31" < "2025-01-01"`）

この実装により、シンプルかつ効率的な日付比較が実現されています。

### 4.4 importの追加

`TodoRepository.ts`で新しいユーティリティ関数を使用するため、importが追加されました。

```diff
-import { getCurrentJSTTime } from '../utils/timeFormat';
+import { getCurrentJSTTime, extractDateFromJST, compareDates } from '../utils/timeFormat';
```

この変更により、`shouldDisplayOnDate`メソッド内で`extractDateFromJST`と`compareDates`を使用できるようになります。

## 5. issue から直接は要求されていない変更の説明

### 5.1 テストコードの大幅な拡充

`TodoRepository.test.ts`と`timeFormat.test.ts`において、テストケースが大幅に追加されました。これはissueで明示的に要求されてはいませんが、以下の理由から必須の変更です。

#### `shouldDisplayOnDate`メソッドのテスト拡充

```diff
   describe('shouldDisplayOnDate', () => {
-    it('現在はプレースホルダーとして常にtrueを返す', () => {
-      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
-      expect(TodoRepository.shouldDisplayOnDate(todo, '2025-11-24')).toBe(true);
-    });
+    describe('通常のTodo - 未完了', () => {
+      it('作成日と同じ日付の場合は表示する', () => { ... });
+      it('作成日より後の日付の場合は表示する', () => { ... });
+      it('作成日より前の日付の場合は表示しない', () => { ... });
+    });
+
+    describe('通常のTodo - 完了済み', () => {
+      it('作成日と完了日が同じ場合、その日付に表示する', () => { ... });
+      it('作成日と完了日の間の日付に表示する', () => { ... });
+      it('作成日より前の日付には表示しない', () => { ... });
+      it('完了日より後の日付には表示しない', () => { ... });
+    });
+
+    describe('カレンダーイベント', () => {
+      it('startTimeと同じ日付の場合は表示する', () => { ... });
+      it('startTimeと異なる日付の場合は表示しない', () => { ... });
+      it('startTimeがnullの場合は表示しない', () => { ... });
+    });
+  });
```

##### 変更の理由

- **プレースホルダーからの移行**: 実装がプレースホルダーから実際のロジックに変わったため、テストも実際の仕様をカバーする内容に変更する必要がある
- **バグ防止**: 日付比較のロジックは境界値のバグが発生しやすいため、網羅的なテストが必須
- **仕様の明確化**: テストケースがそのまま仕様書の役割を果たす（「作成日より前の日付には表示しない」など）

##### テストの構成

テストケースは以下のように構造化されています。

- **通常のTodo - 未完了**: 作成日との比較パターン（同日、前、後）
- **通常のTodo - 完了済み**: 作成日と完了日の範囲パターン（範囲内、範囲外）
- **カレンダーイベント**: 開始日との比較パターン（同日、異なる日、nullの場合）

この構造により、issueで定義された3つのシナリオ全てがカバーされています。

#### `filterItemsByDate`メソッドのテスト拡充

```diff
   describe('filterItemsByDate', () => {
-    it('現在は全てのアイテムを返す（プレースホルダー）', () => {
+    it('指定日に表示すべきアイテムのみをフィルタリングする', () => {
+      // 2025-01-15に作成された未完了Todo
+      vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
       const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
+
+      // 2025-01-20に作成された未完了Todo
+      vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
       const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
+
       const todos = [todo1, todo2];

-      const filtered = TodoRepository.filterItemsByDate(todos, '2025-11-24');
+      // 2025-01-15: todo1のみ表示（todo2は未作成）
+      const filtered15 = TodoRepository.filterItemsByDate(todos, '2025-01-15');
+      expect(filtered15).toHaveLength(1);
+      expect(filtered15[0].getId()).toBe(todo1.getId());
+
+      // 2025-01-20: 両方表示
+      const filtered20 = TodoRepository.filterItemsByDate(todos, '2025-01-20');
+      expect(filtered20).toHaveLength(2);

-      expect(filtered).toHaveLength(2);
-      expect(filtered).toEqual(todos);
+      // 2025-01-10: どちらも表示しない（両方とも未作成）
+      const filtered10 = TodoRepository.filterItemsByDate(todos, '2025-01-10');
+      expect(filtered10).toHaveLength(0);
+    });
+
+    it('完了済みTodoは作成日から完了日までの範囲でフィルタリングされる', () => {
+      vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
+      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
+
+      vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
+      const completedTodo = todo.toggleCompleted();
+
+      const todos = [completedTodo];
+
+      // 2025-01-14: 表示しない（作成前）
+      expect(TodoRepository.filterItemsByDate(todos, '2025-01-14')).toHaveLength(0);
+
+      // 2025-01-15: 表示する（作成日）
+      expect(TodoRepository.filterItemsByDate(todos, '2025-01-15')).toHaveLength(1);
+
+      // 2025-01-17: 表示する（作成日と完了日の間）
+      expect(TodoRepository.filterItemsByDate(todos, '2025-01-17')).toHaveLength(1);
+
+      // 2025-01-20: 表示する（完了日）
+      expect(TodoRepository.filterItemsByDate(todos, '2025-01-20')).toHaveLength(1);
+
+      // 2025-01-21: 表示しない（完了後）
+      expect(TodoRepository.filterItemsByDate(todos, '2025-01-21')).toHaveLength(0);
     });
   });
```

##### 変更の理由

- **統合テスト的な役割**: `filterItemsByDate`は`shouldDisplayOnDate`を使用するため、両者の統合が正しく動作することを確認する必要がある
- **複数アイテムのシナリオ**: 実際のアプリケーションでは複数のTodoが混在するため、それらが正しくフィルタリングされることを確認
- **時系列の整合性**: 時刻を変更しながらTodoを作成・完了させ、各時点でのフィルタリング結果を確認

##### テストの工夫点

`vi.setSystemTime`を使用して、異なる時点でのTodo作成をシミュレートしています。これにより、実際のユーザー操作（「今日Todoを作成 → 5日後に完了」など）に近いシナリオでテストできます。

#### 新規ユーティリティ関数のテスト追加

`timeFormat.test.ts`に`extractDateFromJST`と`compareDates`のテストが追加されました。

```diff
+  describe('extractDateFromJST', () => {
+    it('JST時刻文字列から日付部分のみを抽出できる', () => { ... });
+    it('日付のみの文字列をそのまま返す', () => { ... });
+    it('真夜中の時刻から日付を抽出できる', () => { ... });
+    it('年末の日付を抽出できる', () => { ... });
+    it('月初の日付を抽出できる', () => { ... });
+  });
+
+  describe('compareDates', () => {
+    it('同じ日付の場合は0を返す', () => { ... });
+    it('date1がdate2より前の場合は負の数を返す', () => { ... });
+    it('date1がdate2より後の場合は正の数を返す', () => { ... });
+    it('年をまたぐ日付の比較が正しく行える', () => { ... });
+    it('月をまたぐ日付の比較が正しく行える', () => { ... });
+    it('同じ月内の日付の比較が正しく行える', () => { ... });
+  });
```

##### 変更の理由

- **単体テストの原則**: 新しい関数には必ずテストを追加する（プロジェクトのコーディングガイドラインに従う）
- **エッジケースの検証**: 年末年始、月末月初など、日付処理で問題が起きやすいパターンを網羅
- **文字列比較の検証**: `localeCompare`が期待通りに動作することを明示的に確認

### 5.2 `CalendarEvent`のimport追加

`TodoRepository.test.ts`の冒頭に`CalendarEvent`のimportが追加されました。

```diff
 import { TodoRepository } from './TodoRepository';
 import { Todo } from './Todo';
+import { CalendarEvent } from './CalendarEvent';
```

##### 変更の理由

新しく追加された`shouldDisplayOnDate`のテストでカレンダーイベントのテストケースを追加したため、`CalendarEvent`クラスをimportする必要があります。これは実装の変更に伴う必然的な変更です。

### 5.3 テストケースの期待値の更新

既存のテスト「元の配列を変更しないことの確認」において、期待値が更新されました。

```diff
     it('元の配列を変更しない（イミュータブル）', () => {
       const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
       const todos = [todo1];

-      const filtered = TodoRepository.filterItemsByDate(todos, '2025-11-24');
+      const filtered = TodoRepository.filterItemsByDate(todos, '2025-01-15');

       expect(filtered).not.toBe(todos); // 参照が異なることを確認
-      expect(filtered).toEqual(todos); // 内容は同じ
     });
```

##### 変更の理由

- **日付の整合性**: プレースホルダー時代は任意の日付でテストできたが、実装後は「Todoが実際に表示される日付」でテストする必要がある
  - `2025-11-24`は未来の日付でTodoが表示されないため、`2025-01-15`（作成日と同じ）に変更
- **期待値の削除**: `expect(filtered).toEqual(todos)`は「全てのアイテムが返される」前提のテストだったため、実装変更後は不要になり削除

この変更により、テストは「元の配列を変更しないこと（イミュータブル性）」のみを検証する本来の目的に絞られています。

## 6. 影響範囲と注意点

### 6.1 影響を受ける機能・モジュール

以下の機能・モジュールがこの変更の影響を受けます。

#### `useTodos`フック（`src/hooks/useTodos.ts`）

`filterItemsByDate`メソッドを使用している箇所で、実際のフィルタリングが行われるようになります。これにより、UIコンポーネントに渡されるアイテムリストが変化します。

#### UIコンポーネント（`src/App.tsx`, `src/components/*.tsx`）

日付選択UIを持つコンポーネント（カレンダービューなど）では、選択日に応じて表示されるアイテム数が変化します。特に、

- 過去の日付を選択した際に「未来のTodo」が表示されなくなる
- 完了したTodoが「完了後の日付」に表示されなくなる

という挙動の変化が発生します。

### 6.2 互換性の変更（破壊的変更）

プロジェクトのコーディングガイドラインに「後方互換性を気にする必要はない」と明記されているため、以下の破壊的変更が含まれています。

#### `shouldDisplayOnDate`の挙動変更

- **変更前**: 常に`true`を返す
- **変更後**: 実際の日付ロジックに基づいて判定

この変更により、既に`shouldDisplayOnDate`を使用している箇所がある場合、その挙動が変わります。

#### `filterItemsByDate`の挙動変更

- **変更前**: 全てのアイテムをそのまま返す
- **変更後**: 日付条件に基づいてフィルタリング

この変更により、UIに表示されるアイテム数が変化する可能性があります。

### 6.3 パフォーマンスへの影響

#### フィルタリングのコスト

`filterItemsByDate`は配列全体を走査するため、O(n)の時間計算量がかかります。ただし、

- Todoアプリケーションで扱うアイテム数は通常数十～数百程度
- 各アイテムの判定処理は単純な日付比較のみ
- Reactの再レンダリングサイクルに組み込まれるため、ユーザーが体感できるほどの遅延は発生しない

と考えられるため、パフォーマンス上の問題はないと推測されます。

#### 最適化の余地

将来的にアイテム数が数千以上になった場合、以下のような最適化が考えられます。

- インデックスを使った高速検索（日付ごとにアイテムをグループ化）
- メモ化（同じ日付での複数回のフィルタリングをキャッシュ）

ただし、現時点ではこれらの最適化は過剰設計であり、実装していません。

### 6.4 エラーハンドリングの考慮

#### データ不整合のケース

以下のようなデータ不整合があった場合、安全側（表示しない）の挙動を取ります。

- 完了済みTodoで`completedAt`が`null`の場合 → 表示しない
- カレンダーイベントで`startTime`が`null`の場合 → 表示しない

これにより、不正なデータによってUIが崩れることを防ぎます。

#### 日付フォーマットの前提

`extractDateFromJST`と`compareDates`は、入力が`"YYYY-MM-DD"`形式であることを前提としています。異なるフォーマット（例: `"MM/DD/YYYY"`）が入力された場合、正しく動作しない可能性があります。

ただし、本アプリケーションでは全ての日付文字列が`getCurrentJSTTime`や`formatToJST`によって生成されるため、フォーマット不整合は通常発生しません。

### 6.5 今後の拡張性

#### 新しいアイテムタイプの追加

将来的に`ListItem`の新しいタイプが追加された場合、以下の対応が必要です。

1. `shouldDisplayOnDate`メソッドに新しいタイプの分岐を追加
2. 新しいタイプ用のテストケースを追加

現在の実装では未知のタイプに対して`false`を返すため、実装漏れがあっても安全です。

#### 表示条件のカスタマイズ

将来的に「完了済みTodoを常に表示したい」などのユーザー設定が追加される場合、`shouldDisplayOnDate`メソッドに設定パラメータを渡す形で拡張できます。

```typescript
static shouldDisplayOnDate(item: ListItem, date: string, options?: DisplayOptions): boolean {
  // options.showAllCompleted が true なら完了済みも常に表示、など
}
```

## 7. テスト観点

### 7.1 追加されたテストコードのカバー範囲

今回の変更で追加されたテストは、以下の観点を網羅しています。

#### `shouldDisplayOnDate`メソッド

- **通常のTodo - 未完了**:
  - 作成日と同じ日付
  - 作成日より後の日付
  - 作成日より前の日付
- **通常のTodo - 完了済み**:
  - 作成日と完了日が同じ
  - 作成日と完了日の間の日付
  - 作成日より前の日付
  - 完了日より後の日付
- **カレンダーイベント**:
  - 開始日と同じ日付
  - 開始日と異なる日付
  - `startTime`が`null`の場合

#### `filterItemsByDate`メソッド

- 複数アイテムの混在（異なる作成日のTodo）
- 完了済みTodoのフィルタリング（作成日から完了日までの範囲）
- 空の配列に対する処理
- イミュータブル性の確認

#### ユーティリティ関数

- **`extractDateFromJST`**:
  - 時刻付き文字列からの日付抽出
  - 日付のみの文字列の処理
  - エッジケース（真夜中、年末、月初）
- **`compareDates`**:
  - 同じ日付の比較
  - 前後の日付の比較
  - 年またぎ、月またぎのケース

### 7.2 テストされていない観点（今後追加すべきテスト）

以下のテスト観点は現在カバーされていません。

#### 不正な日付フォーマット

- `extractDateFromJST`に`"2025/01/15"`のような異なるフォーマットが渡された場合
- `compareDates`に`"01-15-2025"`のような異なるフォーマットが渡された場合

これらは現在の実装では発生しないため、テストを追加していません。ただし、将来的に外部データソースから日付を取得する場合は、バリデーションとテストが必要になる可能性があります。

#### 境界値のエッジケース

- うるう年の2月29日を含む日付比較
- タイムゾーンをまたぐ日付（JST以外のタイムゾーンから変換された日付）

これらは現在のアプリケーションのスコープ外ですが、将来的に国際化対応をする場合は考慮が必要です。

#### パフォーマンステスト

- 数千件のアイテムに対する`filterItemsByDate`の実行時間

現在のアプリケーションではアイテム数が少ないため、パフォーマンステストは実装していません。

### 7.3 手動テストで確認すべき観点

自動テストでカバーされていない以下の観点は、手動テストで確認することを推奨します。

#### UIの挙動

- カレンダービューで過去の日付を選択した際、未来に作成されたTodoが表示されないこと
- カレンダービューで未来の日付を選択した際、既存の未完了Todoが表示されること
- Todoを完了した後、翌日のビューでそのTodoが表示されないこと

#### データ永続化との連携

- アプリケーションを再起動した後も、フィルタリングが正しく動作すること
- 異なる日付を跨いでアプリケーションを使用した際、日付の境界で正しくフィルタリングが切り替わること

#### エッジケースのユーザー操作

- 真夜中（0時）をまたいでアプリケーションを使用した際、日付の切り替わりが正しく反映されること
- システム時刻を手動で変更した場合の挙動

これらの手動テストにより、実際のユーザー体験レベルでの品質を確認できます。
