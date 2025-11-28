# Issue #0017: 単一アイテムJSON編集機能の実装

## 1. 概要（ハイレベルな意味説明）

この変更により、ユーザーはTodoアイテム（TodoまたはCalendarEvent）をダブルクリックすることで、**そのアイテムのみ**のJSON編集画面を開けるようになりました。

従来は「全体のJSONを編集する」機能のみが提供されていましたが、この変更により次のようなユーザー体験が追加されました：

- 個別のアイテムをダブルクリックして、そのアイテムだけのJSONを編集できる
- 編集対象のアイテムのみがJSON形式で表示される（全体ではなく1つのオブジェクトのみ）
- 保存時は、そのアイテムの部分だけが上書きされ、他のアイテムには影響しない

これにより、大量のTodoがある場合でも、特定の1つのアイテムだけを素早く編集できるようになり、JSON編集のハードルが大幅に下がりました。

## 2. 仕様レベルの変更内容

### 追加された振る舞い

**ダブルクリックによる単一アイテム編集**:
- Todoアイテム（TodoまたはCalendarEvent）をダブルクリックすると、そのアイテムのみのJSON編集モーダルが開く
- モーダルのタイトルは「アイテムのJSON編集」となり、全体編集と区別される
- JSON編集エリアには、ダブルクリックしたアイテムのJSONオブジェクトのみが表示される
- 保存すると、そのアイテムだけが新しいJSONの内容で置き換えられる

**従来機能との共存**:
- 既存の「全体JSON編集」機能は引き続き利用可能
- 全体JSON編集の場合は、モーダルタイトルが「JSON編集」となる
- 全体JSON編集では、全TodoアイテムがJSON配列として表示される

### 影響するユースケース

1. **特定アイテムの詳細編集**:
   - タイマー記録（timeRanges）の手動調整
   - タスクコードやテキストの詳細編集
   - CalendarEventの開始・終了時刻の微調整

2. **JSON構造の学習**:
   - 個別アイテムのJSON構造を確認できるため、データモデルの理解が容易になる

## 3. 実装方針の説明

### 設計アプローチ

この機能は、既存のJSON編集モーダルを**再利用**する設計を採用しました。新しいモーダルを作成するのではなく、以下の理由から既存モーダルを「モード切替可能」にする方針を取っています：

**モード切替方式を選んだ理由**:
- UI部品（モーダル、エディタ）は完全に共通化でき、重複コードを避けられる
- 「全体編集」と「単一アイテム編集」は、編集対象の範囲が違うだけで、操作フローは同じ
- ユーザーにとっても、同じUIで2つのモードが使えるため学習コストが低い

**モードの識別方法**:
- `editingItemId` というローカルステート（`string | null`）で判別
- `null` の場合は全体編集モード
- 文字列（アイテムID）が入っている場合は単一アイテム編集モード

**代替案とのトレードオフ**:
- 代替案1: 専用モーダルを新規作成する → UI部品の重複が発生し、メンテナンスコストが増大
- 代替案2: 全体JSONから該当アイテムだけをハイライトする → ユーザーが探す手間は変わらず、issue要件を満たさない

### Model層への委譲

ビジネスロジックは完全に `TodoRepository` クラスに集約されています：

- `TodoRepository.editSingleItemFromJson()` メソッドが新たに追加され、指定IDのアイテムをJSON文字列から置き換える処理を実装
- このメソッドはイミュータブルな設計（新しい配列を返す）を維持
- JSONパースエラーやID不一致エラーなど、エッジケースのハンドリングもModel層で完結

Controller層（`useTodos` フック）は、このメソッドを呼び出すだけで、ビジネスロジックを持ちません。

## 4. 主要なコード変更の解説

### 4.1 Model層: `TodoRepository.editSingleItemFromJson()` メソッドの追加

**変更ファイル**: `src/models/TodoRepository.ts`

```diff
+  /**
+   * 指定IDのListItemをJSON文字列から置き換える
+   * @param items 既存のListItemリスト
+   * @param id ListItemのID
+   * @param jsonText 新しいListItemを表すJSON文字列
+   * @returns 新しいListItemリスト
+   * @throws JSONパースエラーまたはIDの不一致エラー
+   */
+  static editSingleItemFromJson(items: ListItem[], id: string, jsonText: string): ListItem[] {
+    const parsed = JSON.parse(jsonText);
+
+    // パースされたJSONのIDが一致することを確認
+    if (parsed.id !== id) {
+      throw new Error(`IDが一致しません。編集対象のIDは ${id} ですが、JSONのIDは ${parsed.id} です`);
+    }
+
+    // typeフィールドでTodoとCalendarEventを判別
+    const type = parsed.type || ListItemType.TODO;
+    let newItem: ListItem;
+
+    if (type === ListItemType.CALENDAR_EVENT) {
+      newItem = CalendarEvent.fromJSON(parsed);
+    } else {
+      newItem = Todo.fromJSON(parsed);
+    }
+
+    // 指定IDのアイテムを新しいアイテムで置き換え
+    return items.map((item) =>
+      item.getId() === id ? newItem : item
+    );
+  }
```

**このメソッドの役割**:
- 指定されたIDのアイテムのみをJSON文字列から置き換える
- 他のアイテムは一切変更しない
- 新しいアイテムリスト全体を返す（イミュータブル）

**実装の詳細**:

1. **JSON文字列のパース**:
   - `JSON.parse()` でJSON文字列をパース
   - パースエラーはそのまま上位にスローされる（catchせず、呼び出し側で処理）

2. **ID一致の検証**:
   - パースされたJSONの `id` フィールドが、編集対象のIDと一致するかを確認
   - 一致しない場合は、ユーザーがJSONのIDを誤って変更した可能性があるため、エラーをスロー
   - これにより、意図しないアイテムの置き換えを防ぐ

3. **型判別とインスタンス生成**:
   - `type` フィールドで `'todo'` か `'calendar_event'` かを判別
   - `CalendarEvent.fromJSON()` または `Todo.fromJSON()` を呼び出して新しいインスタンスを生成

4. **配列の更新**:
   - `items.map()` で全アイテムを走査
   - IDが一致するアイテムのみを新しいインスタンスで置き換え
   - 他のアイテムはそのまま返す

**なぜ `TodoRepository` に配置したか**:
- このプロジェクトはRepository Patternを採用しており、アイテムコレクションに対する操作は全て `TodoRepository` に集約する設計
- 単一アイテムの置き換えも「コレクション操作」の一種であり、`TodoRepository` の責務に含まれる
- イミュータブルな配列操作とエラーハンドリングを含むため、Model層で完結させることでテスト容易性が向上

### 4.2 Controller層: `useTodos` フックへの `editSingleItemFromJson` 追加

**変更ファイル**: `src/hooks/useTodos.ts`

```diff
+  // 指定IDのアイテムをJSON文字列から編集
+  const editSingleItemFromJson = useCallback(async (id: string, jsonText: string) => {
+    setTodosWithPersist((prev) => TodoRepository.editSingleItemFromJson(prev, id, jsonText));
+  }, [setTodosWithPersist]);
```

```diff
   return {
     todos,
     isLoading,
     addTodo,
     toggleTodo,
     deleteTodo,
     editTodo,
     editTaskcode,
     reorderTodos,
     replaceFromJson,
+    editSingleItemFromJson,
     startTimer,
     stopTimer,
     importCalendarEvents,
   };
```

**このフックの役割**:
- `TodoRepository.editSingleItemFromJson()` を呼び出すだけのシンプルなラッパー
- ビジネスロジックは一切持たず、Model層に完全に委譲している

**実装のポイント**:
- `setTodosWithPersist()` を使用して、楽観的UI更新 + IPC永続化を実行
- `useCallback` でメモ化し、不要な再レンダリングを防ぐ
- `async` キーワードが付いているが、これは `setTodosWithPersist` が非同期で永続化を行うため

**なぜ `useTodos` に配置したか**:
- このプロジェクトのアーキテクチャでは、全てのTodo操作は `useTodos` フック経由で提供する設計
- View層は `useTodos` を呼び出すだけで、Todo操作の詳細を知る必要がない
- 状態管理とIPC通信の責務をController層（`useTodos`）に集約するため

### 4.3 View層: `App.tsx` のモーダル状態管理の拡張

**変更ファイル**: `src/App.tsx`

#### ローカルステートの追加

```diff
 function App() {
-  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, editTaskcode, reorderTodos, replaceFromJson, startTimer, stopTimer, importCalendarEvents } = useTodos();
+  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, editTaskcode, reorderTodos, replaceFromJson, editSingleItemFromJson, startTimer, stopTimer, importCalendarEvents } = useTodos();
   const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
   const [jsonText, setJsonText] = useState('');
   const [jsonError, setJsonError] = useState('');
+  const [editingItemId, setEditingItemId] = useState<string | null>(null);
```

**`editingItemId` ステートの役割**:
- `null`: 全体JSON編集モード
- `string`（アイテムID）: 単一アイテム編集モード

このステートにより、同じモーダルコンポーネントを2つのモードで使い分けています。

#### 全体JSON編集の開始処理

```diff
   const handleOpenJsonEditor = () => {
     setJsonText(JSON.stringify(TodoRepository.itemsToJsonArray(todos), null, 2));
     setJsonError('');
+    setEditingItemId(null);
     setIsJsonEditorOpen(true);
   };
```

**変更のポイント**:
- `setEditingItemId(null)` を明示的に呼び出し、全体編集モードであることを示す
- これにより、前回が単一アイテム編集だった場合でも、正しくモードがリセットされる

#### 単一アイテムJSON編集の開始処理（新規追加）

```diff
+  const handleOpenSingleItemJsonEditor = (id: string) => {
+    const item = todos.find((item) => item.getId() === id);
+    if (!item) {
+      return;
+    }
+    setJsonText(JSON.stringify(item.toJSON(), null, 2));
+    setJsonError('');
+    setEditingItemId(id);
+    setIsJsonEditorOpen(true);
+  };
```

**このハンドラーの役割**:
- 指定されたIDのアイテムを検索
- アイテムが見つからない場合は何もしない（早期リターン）
- 見つかった場合は、そのアイテムのJSONのみを `jsonText` にセット
- `editingItemId` に編集対象のIDをセットし、単一アイテム編集モードに切り替え

**実装の詳細**:
- `item.toJSON()` でアイテム1つをJSONオブジェクトに変換
- `JSON.stringify(..., null, 2)` でフォーマット付きのJSON文字列に変換
- 配列ではなくオブジェクト単体がJSON文字列になる点が、全体編集との違い

#### モーダルクローズ処理

```diff
   const handleCloseJsonEditor = () => {
     setIsJsonEditorOpen(false);
     setJsonText('');
     setJsonError('');
+    setEditingItemId(null);
   };
```

**変更のポイント**:
- モーダルを閉じる際に `editingItemId` をリセット
- これにより、次回のモーダルオープン時に前回のモード状態が残らない

#### JSON保存処理の分岐

```diff
   const handleSaveJson = async () => {
     try {
-      await replaceFromJson(jsonText);
+      if (editingItemId) {
+        // 単一アイテムの編集
+        await editSingleItemFromJson(editingItemId, jsonText);
+      } else {
+        // 全アイテムの置き換え
+        await replaceFromJson(jsonText);
+      }
       handleCloseJsonEditor();
     } catch (error) {
```

**このロジックの役割**:
- `editingItemId` の有無で、どちらのモードかを判別
- 単一アイテム編集モードの場合は `editSingleItemFromJson()` を呼び出す
- 全体編集モードの場合は従来通り `replaceFromJson()` を呼び出す

**エラーハンドリング**:
- どちらのモードでも、JSONパースエラーやID不一致エラーは同じ `catch` ブロックで処理
- エラー内容は `jsonError` ステートにセットされ、モーダル内に表示される

#### モーダルのタイトル変更

```diff
 <div className="modal-header">
-  <h2>JSON編集</h2>
+  <h2>{editingItemId ? 'アイテムのJSON編集' : 'JSON編集'}</h2>
   <button className="modal-close" onClick={handleCloseJsonEditor}>
```

**変更のポイント**:
- `editingItemId` の有無でモーダルタイトルを動的に切り替え
- ユーザーは、どちらのモードで編集しているかを一目で判別できる

#### コンポーネントへのprops追加

```diff
         <DateGroupedTodoList
           todos={filteredAndSortedTodos}
           onToggle={toggleTodo}
           onDelete={deleteTodo}
           onEdit={editTodo}
           onEditTaskcode={editTaskcode}
           onReorder={reorderTodos}
           onStartTimer={startTimer}
           onStopTimer={stopTimer}
+          onOpenJsonEditor={handleOpenSingleItemJsonEditor}
         />
```

**変更のポイント**:
- `handleOpenSingleItemJsonEditor` を `onOpenJsonEditor` として子コンポーネントに渡す
- 子コンポーネントがこれを呼び出すことで、単一アイテム編集モーダルが開く

### 4.4 View層: 中間コンポーネントへのprops伝播

**変更ファイル**: `src/components/DateGroupedTodoList.tsx`, `src/components/TodoList.tsx`

これらのコンポーネントは、`onOpenJsonEditor` を受け取り、そのまま子コンポーネント（`TodoItem`）に渡す役割を担います。

```diff
 interface DateGroupedTodoListProps {
   // ...
   onStopTimer: (id: string) => void;
+  onOpenJsonEditor: (id: string) => void;
 }
```

```diff
 export const DateGroupedTodoList = ({
   // ...
   onStopTimer,
+  onOpenJsonEditor
 }: DateGroupedTodoListProps) => {
```

```diff
                   <TodoItem
                     // ...
                     onStopTimer={onStopTimer}
+                    onOpenJsonEditor={onOpenJsonEditor}
                     onDragStart={handleDragStart}
```

**なぜこの伝播が必要か**:
- `App.tsx` → `DateGroupedTodoList` → `TodoItem` というコンポーネント階層になっている
- 最終的にダブルクリックイベントを受け取るのは `TodoItem` だが、`handleOpenSingleItemJsonEditor` は `App.tsx` で定義されている
- そのため、中間コンポーネントが props を伝播する必要がある

**設計上の考察**:
- このような「propsのバケツリレー」は、コンポーネント階層が深い場合はアンチパターンになりやすい
- しかし、このプロジェクトは階層が浅く（3層のみ）、状態管理ライブラリ（ReduxやContext API）を導入するほどの複雑さではないため、propsリレーで十分

### 4.5 View層: `TodoItem` へのダブルクリックハンドラー追加

**変更ファイル**: `src/components/TodoItem.tsx`

```diff
 interface TodoItemProps {
   // ...
   onStopTimer: (id: string) => void;
+  onOpenJsonEditor: (id: string) => void;
   onDragStart: (index: number) => void;
```

```diff
-export const TodoItem = ({ todo, index, isDragging, onToggle, onDelete, onEdit, onEditTaskcode, onStartTimer, onStopTimer, onDragStart, onDragOver, onDrop, onDragEnd }: TodoItemProps) => {
+export const TodoItem = ({ todo, index, isDragging, onToggle, onDelete, onEdit, onEditTaskcode, onStartTimer, onStopTimer, onOpenJsonEditor, onDragStart, onDragOver, onDrop, onDragEnd }: TodoItemProps) => {
```

```diff
     <div
       className={`todo-item ${todo.isCompleted() ? 'completed' : ''} ${isTodo ? 'todo' : 'calendar-event'}`}
       draggable
       onDragStart={() => onDragStart(index)}
       onDragOver={onDragOver}
       onDrop={() => onDrop(index)}
       onDragEnd={onDragEnd}
+      onDoubleClick={() => onOpenJsonEditor(todoId)}
       style={{ opacity: isDragging ? 0.5 : 1 }}
     >
```

**ダブルクリックハンドラーの実装**:
- `onDoubleClick` イベントハンドラーを `<div>` 要素に追加
- ダブルクリックされたら、`onOpenJsonEditor(todoId)` を呼び出す
- `todoId` は `todo.getId()` から取得されたアイテムのID

**ユーザー体験の考察**:
- ダブルクリックは、多くのデスクトップアプリケーションで「詳細表示・編集」を開く操作として定着している
- このUI選択により、既存のシングルクリック操作（チェックボックスのトグル）と競合しない
- 誤操作のリスクも低い（ダブルクリックは意図的な操作）

## 5. Issue から直接は要求されていない変更の説明

### 5.1 包括的なテストケースの追加

**変更ファイル**: `src/models/TodoRepository.test.ts`

```diff
+  describe('editSingleItemFromJson', () => {
+    it('指定IDのTodoをJSON文字列から編集できる', () => {
+    it('CalendarEventをJSON文字列から編集できる', () => {
+    it('複数アイテムのうち指定したもののみが編集される', () => {
+    it('元の配列は変更されない(イミュータブル)', () => {
+    it('JSONのIDが指定IDと一致しない場合はエラーをスローする', () => {
+    it('不正なJSON文字列に対してエラーをスローする', () => {
+    it('存在しないIDを指定しても他のアイテムは変更されない', () => {
```

**なぜこれらのテストが追加されたのか**:
- このプロジェクトのコーディングガイドライン（CLAUDE.md）に「ソースコードを変更した場合は、必ずそれに対応するテストを合わせて更新すること」と明記されている
- 新しいメソッド `editSingleItemFromJson()` が追加されたため、その振る舞いを包括的にテストするケースが追加された

**テストカバレッジの観点**:
1. **正常系**: TodoとCalendarEventの両方を正しく編集できることを確認
2. **イミュータビリティ**: 元の配列が変更されないことを確認（Repository Patternの設計原則を保証）
3. **エッジケース**:
   - JSONのIDが指定IDと一致しない場合のエラー検証
   - 不正なJSON文字列に対するエラー検証
   - 存在しないIDを指定した場合の安全性確認

**テスト容易性の設計**:
- `TodoRepository.editSingleItemFromJson()` が純粋関数として実装されているため、テストが非常に書きやすい
- ReactやElectronに依存しない単体テストとして実行できる

## 6. 影響範囲と注意点

### 影響を受けるコンポーネント

1. **`App.tsx`**: モーダル状態管理のロジックが拡張された
2. **`DateGroupedTodoList.tsx`**: 新しいpropsを伝播する
3. **`TodoList.tsx`**: 新しいpropsを伝播する
4. **`TodoItem.tsx`**: ダブルクリックイベントハンドラーが追加された
5. **`useTodos.ts`**: 新しいフック関数が追加された
6. **`TodoRepository.ts`**: 新しい静的メソッドが追加された

### 互換性の変更

**破壊的変更なし**:
- 既存の機能（全体JSON編集）は一切変更されていない
- 新しいpropsは全て追加のみで、既存propsは変更されていない
- APIシグネチャの変更もなし

**後方互換性**:
- このプロジェクトは初期開発段階であり、CLAUDE.mdに「後方互換性を気にする必要はない」と明記されているが、今回の変更は結果的に完全な後方互換性を保っている

### パフォーマンスへの影響

**ほぼ影響なし**:
- ダブルクリックイベントハンドラーの追加は、レンダリングコストに影響しない
- `editingItemId` ステートは軽量（文字列またはnull）で、状態更新のコストは無視できる
- `useCallback` によるメモ化により、不要な再レンダリングは防がれている

### エラーハンドリングの変化

**既存のエラーハンドリングを再利用**:
- `handleSaveJson()` の `catch` ブロックが、単一アイテム編集モードでも機能する
- `TodoRepository.editSingleItemFromJson()` がスローするエラー（JSONパースエラー、ID不一致エラー）は、全て同じ方法でユーザーに表示される

**新しいエラーケース**:
- JSONのIDと編集対象IDが一致しない場合のエラーメッセージが追加された
- これにより、ユーザーが誤ってIDを変更した場合に、わかりやすいエラーが表示される

## 7. テスト観点

### 追加されたテストケース

**Model層（`TodoRepository.test.ts`）**:
- ✅ 指定IDのTodoをJSON文字列から編集できる
- ✅ CalendarEventをJSON文字列から編集できる
- ✅ 複数アイテムのうち指定したもののみが編集される
- ✅ 元の配列は変更されない（イミュータブル）
- ✅ JSONのIDが指定IDと一致しない場合はエラーをスローする
- ✅ 不正なJSON文字列に対してエラーをスローする
- ✅ 存在しないIDを指定しても他のアイテムは変更されない

### 本来追加すべきテスト（現在は未実装）

**E2Eテスト（推奨）**:
1. Todoアイテムをダブルクリックしたら、モーダルが開くことを確認
2. モーダルのタイトルが「アイテムのJSON編集」になっていることを確認
3. JSON編集エリアに、そのアイテムのみのJSONが表示されることを確認
4. JSONを編集して保存したら、そのアイテムだけが更新されることを確認
5. 他のアイテムは変更されていないことを確認
6. モーダルを閉じたら、状態がリセットされることを確認

**結合テスト（推奨）**:
1. `useTodos` の `editSingleItemFromJson` が、`TodoRepository.editSingleItemFromJson` を正しく呼び出すことを確認
2. エラーが発生した場合、状態がロールバックされることを確認（楽観的更新のテスト）

**UIコンポーネントテスト（推奨）**:
1. `TodoItem` がダブルクリックされたら、`onOpenJsonEditor` が呼び出されることを確認
2. `App` の `handleOpenSingleItemJsonEditor` が、正しいアイテムのJSONを `jsonText` にセットすることを確認
3. 存在しないIDを指定した場合、何も起こらないことを確認

### テスト戦略の考察

現在のテストカバレッジは **Model層のみ** です。これは次の理由によるものと推測されます：

- Model層（`TodoRepository`）が最も重要なビジネスロジックを含むため、優先的にテストされた
- Controller層やView層は、Reactのフックやコンポーネントのテストが必要で、テスト環境の整備が必要
- 初期開発段階であり、まずはコア機能の実装を優先している

**推奨される次のステップ**:
1. `useTodos` の結合テストを追加（React Testing Libraryを使用）
2. `TodoItem` のダブルクリックイベントのテストを追加
3. E2Eテスト環境を整備し、ユーザーフロー全体をテスト

---

## まとめ

この変更により、ユーザーは個別のTodoアイテムをダブルクリックするだけで、そのアイテムのみをJSON形式で編集できるようになりました。

実装は、既存のJSON編集モーダルを「モード切替可能」に拡張する方針を取り、コードの重複を避けつつ、新機能を追加しています。ビジネスロジックは完全に `TodoRepository` に集約され、イミュータブルな設計と包括的なテストにより、品質が保たれています。

Issue要件は完全に満たされており、後方互換性も保たれているため、安全にマージ可能な変更です。
