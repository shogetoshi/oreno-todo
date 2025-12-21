# Issue #0040: 今日のタイムカードを取得するAPI

## Issue概要

今日のタイムカードを取得するHTTP APIエンドポイントを追加する。

### 要件
- APIエンドポイント: `GET /api/timecard/today`
- オプショナルの引数として日付を受け取る（クエリパラメータ`date`）
- 日付指定がないときは今日の日付（JST）
- タイムカードの指定日付の部分だけを返す
- 戻り値のJSONは直下に`"type"`フィールドを持つ

## 実装内容

### 1. Model層: TimecardRepository に指定日付のエントリ取得メソッドを追加

**ファイル**: `src/models/TimecardRepository.ts`

指定日付のタイムカードエントリをJSON形式で取得する静的メソッド`getEntriesForDateAsJSON()`を追加します。このメソッドは以下の仕様を持ちます:

- 引数: `data: TimecardData`, `date: string`
- 戻り値: 指定日付のエントリのJSON配列（`TimecardEntryJSON[]`）
- 指定日付のエントリが存在しない場合は空配列を返す

### 2. HTTP APIエンドポイントの追加

**ファイル**: `electron/main.ts`

`GET /api/timecard/today` エンドポイントを追加します。このエンドポイントは:

- HTTPメソッド: `GET`
- クエリパラメータ:
  - `date` (optional): YYYY-MM-DD形式の日付文字列
- レスポンス形式:
  ```json
  {
    "type": "timecard",
    "date": "2024-12-21",
    "entries": [
      { "type": "start", "time": "2024-12-21 09:00:00" },
      { "type": "end", "time": "2024-12-21 12:00:00" }
    ]
  }
  ```

処理の流れ:
1. クエリパラメータ`date`を取得（省略時は今日の日付をJST形式で取得）
2. IPCを使って`load-timecard`でタイムカードデータを読み込む
3. `TimecardRepository.fromJSON()`でデータを復元
4. `TimecardRepository.getEntriesForDateAsJSON()`で指定日付のエントリを取得
5. レスポンスJSONに`type: "timecard"`、`date`、`entries`を含めて返却

### 3. ユーティリティ関数の追加

**ファイル**: `electron/googleCalendar.ts`（既存ファイル）

既存の`getTodayDateString()`関数を利用します。この関数は既にJSTの今日の日付をYYYY-MM-DD形式で返す実装があります。

必要に応じて、この関数を他のファイルからも利用できるように既に`export`されています。

### 4. テストの追加

**ファイル**: `src/models/TimecardRepository.test.ts`

`getEntriesForDateAsJSON()`メソッドの単体テストを追加します:

- 指定日付のエントリが存在する場合の取得テスト
- 指定日付のエントリが存在しない場合は空配列を返すテスト
- 複数日付が存在する場合に正しく指定日付のみを返すテスト

### 5. ドキュメントの更新

**ファイル**: `CLAUDE.md`

HTTP APIセクションに新しいエンドポイントの説明を追加します:

```markdown
#### `GET /api/timecard/today`
指定日付のタイムカードエントリを取得します。

**クエリパラメータ**:
- `date` (optional): YYYY-MM-DD形式の日付。省略時は今日の日付（JST）

**レスポンス**:
```json
{
  "type": "timecard",
  "date": "2024-12-21",
  "entries": [
    { "type": "start", "time": "2024-12-21 09:00:00" },
    { "type": "end", "time": "2024-12-21 12:00:00" }
  ]
}
```
```

## 考慮事項

### HTTPエンドポイントを経由した操作の原則

CLAUDE.mdの特記事項に記載されている通り、HTTPエンドポイントを経由した操作は以下の原則を守ります:

- main.tsでの処理は、命令をロジック側に橋渡しするだけの最低限にする
- 可能な限り早くUI操作による操作と同じ処理フローに合流する
- 今回はデータ取得のみなので、既存のIPC `load-timecard` と Model層の `TimecardRepository` を直接利用する

### データ形式

- レスポンスJSONの直下に`"type": "timecard"`フィールドを含めることで、将来的に複数種類のレスポンスを扱う場合に識別可能にする
- 日付は`"date"`フィールドに含め、どの日付のデータかを明確にする
- エントリ配列は`"entries"`フィールドに含める

### エラーハンドリング

- 不正な日付フォーマットの場合は400エラーを返す
- タイムカードデータの読み込みに失敗した場合は500エラーを返す
- 指定日付にエントリが存在しない場合でも200を返し、`entries`は空配列とする

### 日付の取り扱い

- 日付指定がない場合は`getTodayDateString()`を使用してJSTの今日の日付を取得
- クエリパラメータで日付を指定する場合はYYYY-MM-DD形式を期待
- タイムスタンプは既存の形式（YYYY-MM-DD HH:mm:ss）を維持

## 影響範囲

- **新規ファイル**: なし
- **変更ファイル**:
  - `electron/main.ts`: HTTP APIエンドポイントの追加
  - `src/models/TimecardRepository.ts`: 新規メソッドの追加
  - `src/models/TimecardRepository.test.ts`: テストケースの追加
  - `CLAUDE.md`: ドキュメントの更新

## 実装順序

1. Model層: `TimecardRepository.getEntriesForDateAsJSON()`メソッドの実装とテスト
2. HTTP API: `GET /api/timecard/today`エンドポイントの実装
3. ドキュメント更新: `CLAUDE.md`の更新

## 補足

この実装により、外部アプリケーションから今日のタイムカードデータを取得できるようになります。既存のチェックイン/チェックアウトAPIと組み合わせることで、外部からのタイムカード管理が完結します。
