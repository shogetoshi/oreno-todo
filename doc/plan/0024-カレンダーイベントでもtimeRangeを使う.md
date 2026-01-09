# Issue 0024: カレンダーイベントでもtimeRangeを使う - 実装計画

## 問題の概要

スケジュールイベント（CalendarEvent）について、以下の機能を実装する：
- 完了ボタンを押すとtimeRangesに、startTime/endTimeと同じ開始・終了時刻でレコードが一組追加される
- 完了を解除するとそのレコード組は削除される

## 調査結果

### 1. 現在のCalendarEvent実装状況

- CalendarEventクラスは`startTime`と`endTime`を持つ
- `toggleCompleted()`と`setCompleted()`メソッドが実装済み
- 現状、`completedAt`フィールドのみで完了状態を管理
- **timeRangesフィールドは未実装**

### 2. 現在のTodoのtimeRanges実装

- Todoクラスは`timeRanges: TimeRange[]`を持つ
- `TimeRange`型は`{ start: string; end: string | null }`
- `startTimer()`でendがnullのレコードを追加
- `stopTimer()`で最新レコードのendを設定
- JSON変換で正しくシリアライズ/デシリアライズされる

### 3. MVCアーキテクチャのパターン

- Model層: エンティティクラスにビジネスロジックを実装
- Controller層: useTodosフックがModel層に委譲
- View層: UIのみを担当
- すべての変更はイミュータブルな設計

## 実装方針

CalendarEventにtimeRangesフィールドを追加し、完了/完了解除時に自動的にstartTime/endTimeの範囲を記録する仕組みを実装します。Todoの実装パターンを参考にしながら、CalendarEvent特有の要件（開始・終了時刻が予め決まっている）に対応します。

## 詳細実装計画

### フェーズ1: Model層の実装

#### 1.1 CalendarEventクラスにtimeRangesを追加

**ファイル**: `src/models/CalendarEvent.ts`

**変更内容**:
1. コンストラクタに`timeRanges: TimeRange[]`パラメータを追加
2. `TimeRange`型をインポート（`Todo.ts`から）
3. `setCompleted()`メソッドを修正:
   ```typescript
   setCompleted(completed: boolean): CalendarEvent {
     if (completed) {
       const completedAt = getCurrentJSTTime();
       // startTimeとendTimeがある場合、timeRangesに追加
       let newTimeRanges = this.timeRanges;
       if (this.startTime && this.endTime) {
         newTimeRanges = [...this.timeRanges, { start: this.startTime, end: this.endTime }];
       }
       return new CalendarEvent(
         this.id,
         this.taskcode,
         this.text,
         completedAt,
         this.createdAt,
         this.updatedAt,
         this.startTime,
         this.endTime,
         this.location,
         this.description,
         newTimeRanges
       );
     } else {
       // 完了解除時はtimeRangesを空にする
       return new CalendarEvent(
         this.id,
         this.taskcode,
         this.text,
         null,
         this.createdAt,
         this.updatedAt,
         this.startTime,
         this.endTime,
         this.location,
         this.description,
         []
       );
     }
   }
   ```
4. `fromJSON()`メソッドを修正: timeRangesフィールドをデシリアライズ（デフォルト値は空配列）
5. `toJSON()`メソッドを修正: timeRangesフィールドをシリアライズ
6. `fromGoogleCalendarEvent()`メソッドを修正: timeRangesを空配列で初期化
7. 他のメソッド（`setText()`, `setTaskcode()`など）でtimeRangesを保持

**設計上の注意点**:
- Todoと異なり、CalendarEventは開始・終了時刻が予め決まっている
- 完了時に1つのTimeRangeレコードのみを追加（複数の計測セッションは想定しない）
- startTimeまたはendTimeがnullの場合は、timeRangesに何も追加しない
- イミュータブルな設計を維持（新しいインスタンスを返す）

### フェーズ2: テストの実装

#### 2.1 CalendarEvent.test.tsの更新

**ファイル**: `src/models/CalendarEvent.test.ts`

**追加テストケース**:
1. `toggleCompleted()`でtimeRangesが追加されることを確認
2. `toggleCompleted()`で完了解除するとtimeRangesが空になることを確認
3. `setCompleted(true)`でstartTime/endTimeからTimeRangeが生成されることを確認
4. startTimeまたはendTimeがnullの場合、timeRangesが空のままであることを確認
5. `fromJSON()`でtimeRangesを正しく復元できることを確認
6. `toJSON()`でtimeRangesを正しくシリアライズできることを確認
7. `fromJSON()` -> `toJSON()`のラウンドトリップテスト
8. `fromGoogleCalendarEvent()`で生成されたCalendarEventのtimeRangesが空配列であることを確認
9. 完了→完了解除→完了のサイクルでtimeRangesが正しく管理されることを確認

#### 2.2 TodoRepository.test.tsの更新（必要に応じて）

**ファイル**: `src/models/TodoRepository.test.ts`

**追加テストケース**:
- `toggleItem()`でCalendarEventを完了した場合、timeRangesが追加されることを確認
- `fromJsonArrayToItems()`でCalendarEventのtimeRangesを正しく復元できることを確認

### フェーズ3: 既存JSONデータとの後方互換性は考慮しなくて良い

- **fromJSON()での後方互換性は行わない**
- 既存のJSONファイルにはtimeRangesフィールドが存在しない可能性があるがそれは無視して良い。
    - 必ずtimeRangesが存在する前提のコードで良い。

### フェーズ4: 統合テストと動作確認

#### 4.1 実際のアプリケーションでの動作確認

**確認項目**:
1. CalendarEventを完了した際にtimeRangesが追加されるか
2. 完了を解除した際にtimeRangesが削除されるか
3. JSONファイルへの保存・読み込みが正しく動作するか
5. UIで実行時間が正しく表示されるか（`getTotalExecutionTimeInMinutes()`が動作するか）

#### 4.2 エッジケースの確認

**確認項目**:
1. startTimeがnullのCalendarEventを完了した場合
2. endTimeがnullのCalendarEventを完了した場合
3. startTime/endTimeが両方nullのCalendarEventを完了した場合
4. 完了→完了解除を繰り返した場合
5. JSON編集で手動でtimeRangesを編集した場合

## 実装順序

1. **CalendarEventクラスの修正**
   - コンストラクタ、setCompleted()、fromJSON()、toJSON()の修正
   - 他のメソッドでtimeRangesを保持するよう修正

2. **単体テストの作成**
   - CalendarEvent.test.tsに新しいテストケースを追加
   - 全テストが成功することを確認

3. **TodoRepositoryの統合テスト**
   - TodoRepository.test.tsに必要なテストケースを追加

4. **動作確認**
   - アプリケーションを起動して実際の動作を確認
   - エッジケースをテスト

## 潜在的な課題と対策

### 課題1: 既存のCalendarEventデータとの互換性

**対策**: `fromJSON()`でtimeRangesが存在しない場合、空配列で初期化する。これにより既存データを壊さない。

### 課題2: startTime/endTimeがnullの場合の処理

**対策**: `setCompleted(true)`の際、startTimeまたはendTimeがnullの場合はtimeRangesに何も追加せず、空配列のままにする。エラーは発生させない。

### 課題3: 完了状態の複数回切り替え

**対策**: 完了を解除するたびにtimeRangesを空配列にリセットすることで、古いデータが残らないようにする。

### 課題4: UIでの表示

CalendarEventの実行時間表示が既に実装されている（`getTotalExecutionTimeInMinutes()`）ため、timeRangesが追加されると自動的に表示が変わる可能性がある。現在の実装では`startTime`と`endTime`の差分を計算しているが、timeRangesが追加された場合の優先順位を確認する必要がある。

**対策**:
- 現在の`getTotalExecutionTimeInMinutes()`実装を確認
- timeRangesがある場合はそれを使い、ない場合はstartTime/endTimeから計算するよう修正するか検討
- ただし、issue/0024の要件は「完了時にstartTime/endTimeと同じ時刻範囲を記録する」なので、実行時間の計算結果は変わらないはず

## テスト戦略

### 単体テストの方針

- **CalendarEvent.test.ts**: CalendarEventクラス自体の動作を検証
- **TodoRepository.test.ts**: ListItemインターフェース経由での動作を検証
- 時刻のモック化（vi.useFakeTimers）を使用して一貫性のあるテストを実施
- エッジケース（null値、空配列など）を網羅的にテスト

### テストカバレッジ目標

- CalendarEventクラスの新規実装部分: 100%
- 既存機能への影響: 既存テストが全て成功することを確認

## ドキュメント更新

### 更新対象ファイル

1. **docs/MVC-ARCHITECTURE.md**
   - CalendarEventのtimeRanges機能について説明を追加
   - 変更履歴にissue/0024の内容を追記

## 実装後のチェックリスト

- [ ] CalendarEventクラスにtimeRangesフィールドを追加
- [ ] setCompleted()メソッドを修正し、完了時にTimeRangeを追加
- [ ] fromJSON()/toJSON()メソッドを修正し、timeRangesをシリアライズ/デシリアライズ
- [ ] fromGoogleCalendarEvent()でtimeRangesを空配列で初期化
- [ ] CalendarEvent.test.tsに新しいテストケースを追加（9個以上）
- [ ] TodoRepository.test.tsに必要なテストケースを追加
- [ ] 全テストが成功することを確認
- [ ] アプリケーションを起動して動作確認
- [ ] エッジケースの動作を確認
- [ ] ドキュメントを更新

## 期待される効果

- CalendarEventでも実行時間の記録が可能になる
- TodoとCalendarEventで一貫した実行時間管理が実現する
- 完了/完了解除の操作が直感的になる
- timeRangesベースの統一的なデータ構造により、将来の拡張が容易になる
