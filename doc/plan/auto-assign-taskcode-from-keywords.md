# 実装計画: Googleカレンダーイベントへのtaskcode自動割り当て機能

## Issue概要

Googleカレンダーからイベント取得時に、プロジェクト定義の`keywords`に基づいて自動的に`taskcode`を割り当てる機能を実装する。

### 要件
- プロジェクト定義のtaskcodes項目に`keywords`配列を追加
- イベント名に指定されたキーワードが含まれていれば、そのtaskcodeを自動設定
- 複数該当する場合は最初に見つかったものを使用

### 設定ファイル例
```json
{
  "2025-12": [
    {
      "projectcode": "ProjectA",
      "color": "red",
      "assign": 0.6,
      "taskcodes": [
        {
          "taskcode": "ProjectA",
          "keywords": ["ProjectA", "prja"],
          "quickTasks": ["ProjectA"]
        }
      ]
    },
    {
      "projectcode": "genAI",
      "color": "pink",
      "assign": 0,
      "taskcodes": [
        {
          "taskcode": "genAI",
          "keywords": ["生成AI", "genAI"],
          "quickTasks": ["genAI"]
        }
      ]
    }
  ]
}
```

## 影響を受けるファイル

### Model層
1. **src/models/ProjectDefinition.ts**
   - `ProjectDefinition`クラスの構造変更
   - `fromJSON()`メソッドでkeywordsを読み込み
   - `toJSON()`メソッドでkeywordsを出力
   - `ProjectDefinitionRepository`に新規メソッド追加

2. **src/models/CalendarEvent.ts**
   - `fromGoogleCalendarEvent()`メソッドの拡張
   - taskcode割り当てロジックを追加するための引数拡張

3. **src/models/TodoRepository.ts**
   - `createCalendarEventFromGoogleEvent()`メソッドの拡張
   - `addCalendarEventsToItems()`メソッドの拡張

### Controller層
4. **src/hooks/useTodos.ts**
   - `importCalendarEvents()`関数の拡張
   - プロジェクト定義を渡すための処理追加

5. **src/hooks/useProjectDefinitions.ts**
   - プロジェクト定義を取得するための関数追加（必要に応じて）

### View層
6. **src/App.tsx**
   - `importCalendarEvents`呼び出し時にプロジェクト定義を渡す

### テスト
7. **src/models/ProjectDefinition.test.ts**
   - keywords関連のテストケース追加

8. **src/models/CalendarEvent.test.ts**
   - taskcode自動割り当てのテストケース追加

## 実装内容

実装はissueを解決するために必要な順序、すなわちデータの流れに沿って行います。

### 1. Model層: ProjectDefinition の拡張

#### 1.1 ProjectDefinition クラスの構造変更

**ファイル**: `src/models/ProjectDefinition.ts`

**変更内容**:
- `ProjectDefinition`クラスのコンストラクタを変更し、taskcodeの配列から詳細情報を持つオブジェクトの配列に変更
- 新しい型定義`TaskcodeDefinition`を追加:
  ```typescript
  interface TaskcodeDefinition {
    taskcode: string;
    keywords?: string[];
    quickTasks?: string[];
  }
  ```

#### 1.2 fromJSON/toJSON メソッドの更新

**変更内容**:
- `fromJSON()`メソッド: taskcodes配列の各要素からkeywords, quickTasksを含む完全な情報を保持
- `toJSON()`メソッド: keywords, quickTasksをJSON出力に含める

#### 1.3 ProjectDefinitionRepository に新規メソッドを追加

**新規メソッド**: `findTaskcodeByKeyword()`

**役割**: イベントのテキスト（タイトル）からキーワードにマッチするtaskcodeを検索

**シグネチャ**:
```typescript
static findTaskcodeByKeyword(
  repo: ProjectDefinitionRepository,
  date: string,
  eventText: string
): string | null
```

**処理内容**:
1. dateから月（YYYY-MM）を抽出
2. repo.definitions.get(month)で該当月のプロジェクト定義を取得
3. 各ProjectDefinitionのtaskcodesを順に確認
4. 各taskcodeのkeywords配列をループし、eventTextに含まれるかチェック
5. 最初にマッチしたtaskcodeを返す
6. マッチしない場合はnullを返す

### 2. Model層: CalendarEvent の拡張

#### 2.1 fromGoogleCalendarEvent メソッドの拡張

**ファイル**: `src/models/CalendarEvent.ts`

**変更内容**:
- `fromGoogleCalendarEvent()`メソッドにオプショナルな引数`taskcode?: string`を追加
- 引数で渡されたtaskcodeがあればそれを使用、なければ空文字列を使用

**新しいシグネチャ**:
```typescript
static fromGoogleCalendarEvent(event: CalendarEventType, taskcode?: string): CalendarEvent
```

#### 2.2 extractTaskcodeFromGoogleEvent メソッドの削除

**変更内容**:
- `extractTaskcodeFromGoogleEvent()`メソッドは使用されなくなるため、削除または引数から取得するように変更

### 3. Model層: TodoRepository の拡張

#### 3.1 createCalendarEventFromGoogleEvent メソッドの拡張

**ファイル**: `src/models/TodoRepository.ts`

**変更内容**:
- メソッドシグネチャを拡張し、`ProjectDefinitionRepository`を受け取る
- イベントのsummaryとプロジェクト定義を使って、`ProjectDefinitionRepository.findTaskcodeByKeyword()`を呼び出す
- 見つかったtaskcodeを`CalendarEvent.fromGoogleCalendarEvent()`に渡す

**新しいシグネチャ**:
```typescript
static createCalendarEventFromGoogleEvent(
  event: GoogleCalendarEvent,
  projectRepo?: ProjectDefinitionRepository
): CalendarEvent
```

**処理内容**:
1. projectRepoがある場合、イベントの開始日時から日付を抽出
2. `ProjectDefinitionRepository.findTaskcodeByKeyword()`でtaskcodeを検索
3. 見つかったtaskcodeを`CalendarEvent.fromGoogleCalendarEvent()`に渡す

#### 3.2 createCalendarEventsFromGoogleEvents メソッドの拡張

**変更内容**:
- メソッドシグネチャを拡張し、`ProjectDefinitionRepository`を受け取る
- `createCalendarEventFromGoogleEvent()`にprojectRepoを渡す

**新しいシグネチャ**:
```typescript
static createCalendarEventsFromGoogleEvents(
  events: GoogleCalendarEvent[],
  projectRepo?: ProjectDefinitionRepository
): CalendarEvent[]
```

#### 3.3 addCalendarEventsToItems メソッドの拡張

**変更内容**:
- メソッドシグネチャを拡張し、`ProjectDefinitionRepository`を受け取る
- `createCalendarEventsFromGoogleEvents()`にprojectRepoを渡す

**新しいシグネチャ**:
```typescript
static addCalendarEventsToItems(
  items: ListItem[],
  events: GoogleCalendarEvent[],
  projectRepo?: ProjectDefinitionRepository
): ListItem[]
```

### 4. Controller層: useTodos の拡張

#### 4.1 importCalendarEvents 関数の拡張

**ファイル**: `src/hooks/useTodos.ts`

**変更内容**:
- `useProjectDefinitions()`フックをインポート
- `importCalendarEvents()`関数内で`projectRepo`を取得
- `TodoRepository.addCalendarEventsToItems()`にprojectRepoを渡す

**処理内容**:
1. `useProjectDefinitions()`から`projectRepo`を取得
2. `importCalendarEvents()`内で`TodoRepository.addCalendarEventsToItems(prev, result.events!, projectRepo)`を呼び出す

### 5. テスト: ProjectDefinition のテスト追加

#### 5.1 keywords を含む fromJSON/toJSON のテスト

**ファイル**: `src/models/ProjectDefinition.test.ts`

**追加テスト**:
- keywordsを含むJSONからインスタンスを生成できることを確認
- toJSON()でkeywordsが正しく出力されることを確認

#### 5.2 findTaskcodeByKeyword のテスト

**追加テスト**:
- キーワードにマッチするtaskcodeが返されることを確認
- 複数のキーワードがある場合、最初にマッチしたものが返されることを確認
- マッチしない場合はnullが返されることを確認
- 大文字小文字が区別されることを確認（または区別しない仕様にする場合はその確認）

### 6. テスト: CalendarEvent のテスト追加

#### 6.1 taskcode自動割り当てのテスト

**ファイル**: `src/models/CalendarEvent.test.ts`

**追加テスト**:
- `fromGoogleCalendarEvent()`にtaskcodeを渡すと、そのtaskcodeが設定されることを確認
- taskcodeを渡さない場合は空文字列が設定されることを確認

## 実装手順

1. **Model層の実装**
   1. `ProjectDefinition.ts`の型定義とメソッドを更新
   2. `ProjectDefinitionRepository.findTaskcodeByKeyword()`を実装
   3. `CalendarEvent.fromGoogleCalendarEvent()`を拡張
   4. `TodoRepository`の各メソッドを拡張

2. **Controller層の実装**
   1. `useTodos.ts`の`importCalendarEvents()`を拡張

3. **テストの実装**
   1. `ProjectDefinition.test.ts`にテストケースを追加
   2. `CalendarEvent.test.ts`にテストケースを追加

4. **動作確認**
   1. 開発環境でアプリを起動
   2. プロジェクト定義にkeywordsを設定
   3. Googleカレンダーからイベントをインポート
   4. キーワードに基づいてtaskcodeが自動割り当てされることを確認

## 考慮事項

### 後方互換性
- 既存のプロジェクト定義ファイル（keywordsがない）でも動作するように、keywords配列が存在しない場合はスキップする
- `ProjectDefinitionRepository.findTaskcodeByKeyword()`がundefinedやnullを安全に扱う

### エラーハンドリング
- プロジェクト定義の読み込みに失敗した場合でも、カレンダーイベントのインポートは続行する
- taskcodeが見つからない場合は空文字列を設定（既存の動作を維持）

### パフォーマンス
- キーワードマッチングは単純な文字列検索（`eventText.includes(keyword)`）を使用
- プロジェクト定義の数が少ない想定のため、最適化は不要

### マッチングルール
- キーワードは部分一致で検索
- 複数のtaskcodeにマッチする場合は、最初に見つかったものを使用（プロジェクト定義の順序に依存）
- 大文字小文字は区別する（必要に応じて将来的に変更可能）

### UI/UX
- カレンダーイベントのインポート時、自動的にtaskcodeが設定される
- ユーザーは後から手動でtaskcodeを変更可能（既存機能）
- キーワードにマッチしなかった場合は、従来通り空のtaskcodeが設定される

## 注意事項

- 既存のプロジェクト定義ファイル形式を破壊的に変更しない
- テストを必ず追加し、既存の動作が変わらないことを確認
- MVCアーキテクチャを遵守し、ビジネスロジックはModel層に実装
- Controller層はModel層に委譲するのみ

## 完了条件

- [ ] `ProjectDefinition`がkeywordsを扱えるようになっている
- [ ] `ProjectDefinitionRepository.findTaskcodeByKeyword()`が実装されている
- [ ] `CalendarEvent.fromGoogleCalendarEvent()`がtaskcode引数を受け取れる
- [ ] `TodoRepository`の関連メソッドがprojectRepoを受け取れる
- [ ] `useTodos.importCalendarEvents()`がprojectRepoを使用している
- [ ] テストが追加され、すべてパスしている
- [ ] 既存のテストがすべてパスしている
- [ ] 実際にGoogleカレンダーイベントのインポートでtaskcodeが自動設定される
