# Issue #0021: Drag&Drop並び替えの修正と最適化

## 1. 概要

本変更は、日付グループ化されたTODOリスト内でのドラッグ&ドロップ（D&D）による並び替え機能の不具合を修正し、さらにパフォーマンスを最適化したものです。

### ユーザー視点での変更

**修正前の問題:**
- TODOアイテムをドラッグ&ドロップしても並び順が変わらない、または意図しない位置に移動してしまう
- カレンダーイベントをTODOよりも上に移動できない制限がある

**修正後の改善:**
- すべてのアイテム（TODOとカレンダーイベント）を自由に並び替えられるようになった
- 異なる日付グループ間でも正確に並び替えが動作するようになった
- アイテム数が増えてもパフォーマンスが低下しないよう最適化された

### 技術的な修正内容

この変更は2つのコミットで構成されています:

1. **52f6ec1**: ドラッグ&ドロップの根本的なバグ修正（ローカルインデックス→グローバルインデックスへの変更）
2. **a03c332**: パフォーマンス最適化（O(n²)→O(n)への改善）


## 2. 仕様レベルの変更内容

### 変更前の振る舞い

`DateGroupedTodoList`コンポーネントは、TODOアイテムを日付ごとにグループ化して表示します。例えば:

```
【2025-12-01】
  - TODOアイテムA (全体リストでのindex: 0)
  - TODOアイテムB (全体リストでのindex: 1)
  - カレンダーイベントC (全体リストでのindex: 2)

【2025-11-30】
  - TODOアイテムD (全体リストでのindex: 3)
  - カレンダーイベントE (全体リストでのindex: 4)
```

しかし、実装では各日付グループ内でフィルタリングされたアイテムに対して、**グループ内のローカルインデックス**（0, 1, 2...）を使用していました。このため:

- 「2025-12-01」グループのカレンダーイベントC は、グループ内では index=2 として扱われる
- しかし、実際の全体リスト（`todos`配列）では index=2 の位置にある
- ドラッグ&ドロップで「TODOアイテムD」（全体リストでは index=3）とスワップしようとすると、ローカルindex=0（実際にはTODOアイテムA）とスワップされてしまう

### 変更後の振る舞い

修正後は、ドラッグ&ドロップ時に**全体リスト内での実際の位置（グローバルインデックス）**を使用するようになりました:

- 各アイテムが、全体の`todos`配列内での正しいインデックスを持つ
- ドラッグ元とドロップ先のインデックスが正確に一致する
- `onReorder(fromIndex, toIndex)`が正しいインデックスで呼び出される

これにより:
- 異なる日付グループ間でも正確に並び替えが可能
- カレンダーイベントとTODOの種別に関わらず、すべてのアイテムを自由に並び替えられる


## 3. 実装方針の説明

### なぜこのアプローチを選択したか

**方針: グローバルインデックスを使用する**

日付グループ化表示は「ビュー層の都合」であり、データモデルは単一の配列として管理されています。ドラッグ&ドロップの並び替えは、この配列の要素の順序を変更する操作です。

そのため、ビュー層でグループ化していても、**データ層の操作には全体リスト内での正確な位置情報が必要**です。

### 代替案との比較

**代替案1: グループごとに独立した配列として管理**
- 各日付グループが独立した配列を持つ
- グループ内の並び替えは簡単だが、グループ間の移動が複雑になる
- データモデルの大幅な変更が必要

**代替案2: カスタムデータ属性でグローバルインデックスを保持**
- DOM要素にdata属性としてグローバルインデックスを保存
- DOMとReactの状態が二重管理になり、保守性が低下
- React の宣言的UIの思想に反する

**選択した方針: レンダリング時にグローバルインデックスを計算**
- データモデルは変更不要
- ビュー層のみの修正で対応可能
- Reactの単一方向データフローに沿った実装


## 4. 主要なコード変更の解説

### 4.1 第一段階の修正（コミット 52f6ec1）

#### 問題の原因

修正前のコードでは、`itemsForDate.map()`の第2引数で取得される`index`をそのまま使用していました:

```typescript
{itemsForDate.map((item, index) => (
  <TodoItem
    key={item.getId()}
    todo={item}
    index={index}  // ← これはグループ内のローカルインデックス（0, 1, 2...）
    isDragging={draggedIndex === index}
    // ...
  />
))}
```

この`index`は、フィルタリングされた`itemsForDate`配列内でのインデックスであり、全体の`todos`配列内での位置とは異なります。

#### 修正内容: グローバルインデックスの取得

修正後は、`todos.findIndex()`を使用して全体リスト内での正しい位置を取得します:

```typescript
{itemsForDate.map((item) => {
  // グループ内のローカルインデックスではなく、全体のアイテムリスト内でのグローバルインデックスを取得
  const globalIndex = todos.findIndex(t => t.getId() === item.getId());

  return (
    <TodoItem
      key={item.getId()}
      todo={item}
      index={globalIndex}  // ← 全体リスト内での正しい位置
      isDragging={draggedIndex === globalIndex}
      // ...
    />
  );
})}
```

**なぜこの方法を選択したか:**
- `ListItem`インターフェースは`getId()`メソッドを提供しており、一意なIDで検索可能
- `findIndex()`は配列APIの標準メソッドで、コードの意図が明確
- ビュー層のみの修正で完結し、モデル層やコントローラー層に影響を与えない

#### ドラッグ&ドロップハンドラーの引数名変更

この修正に合わせて、ドラッグ&ドロップのハンドラー関数の引数名も明確化されました:

```diff
- const handleDragStart = (index: number) => {
-   setDraggedIndex(index);
+ const handleDragStart = (globalIndex: number) => {
+   setDraggedIndex(globalIndex);
  };

- const handleDrop = (dropIndex: number) => {
-   if (draggedIndex === null || draggedIndex === dropIndex) return;
+ const handleDrop = (globalDropIndex: number) => {
+   if (draggedIndex === null || draggedIndex === globalDropIndex) return;

-   onReorder(draggedIndex, dropIndex);
+   onReorder(draggedIndex, globalDropIndex);
    setDraggedIndex(null);
  };
```

**変更の意図:**
- 引数名を`index`→`globalIndex`に変更することで、これが全体リスト内のインデックスであることを明示
- コードレビュー時やメンテナンス時に、ローカルインデックスとの混同を防ぐ
- 変数名がドメイン概念を正確に表現するようになり、可読性が向上

### 4.2 第二段階の最適化（コミット a03c332）

#### パフォーマンス問題の発見

第一段階の修正により機能は正常に動作するようになりましたが、パフォーマンス上の問題が残っていました:

```typescript
{itemsForDate.map((item) => {
  const globalIndex = todos.findIndex(t => t.getId() === item.getId());
  // ↑ このfindIndex()がitemsForDateの各要素に対して実行される
  // ...
})}
```

**計算量の分析:**
- 外側の`dateGroups.map()`がN個の日付グループをループ
- 各グループ内で`itemsForDate.map()`がM個のアイテムをループ
- 各アイテムに対して`todos.findIndex()`がTodos配列全体（L個）を線形探索
- 最悪ケースでは**O(N × M × L) = O(n²)**の計算量（NとMとLの積がnに比例する場合）

具体例:
- TODOアイテムが100個、日付グループが35個ある場合
- レンダリングごとに最大3,500回のfindIndex()呼び出しが発生する可能性

#### 最適化内容: Map による事前インデックス構築

修正では、レンダリング前に一度だけ`Map<string, number>`を構築し、O(1)でインデックスを検索できるようにしました:

```typescript
// パフォーマンス最適化: IDからグローバルインデックスへのマップを事前構築
// O(n²)の繰り返しfindIndex()呼び出しを回避
const idToGlobalIndex = new Map<string, number>();
todos.forEach((item, index) => {
  idToGlobalIndex.set(item.getId(), index);
});

return (
  <div className="date-grouped-todo-list">
    {dateGroups.map((group) => {
      const itemsForDate = TodoRepository.filterItemsByDate(todos, group.date);

      return (
        <div key={group.date} className="date-group">
          {/* ... */}
          <ul className="todo-list">
            {itemsForDate.map((item) => {
              // Map経由でO(1)の高速検索
              const globalIndex = idToGlobalIndex.get(item.getId())!;
              // ...
            })}
          </ul>
        </div>
      );
    })}
  </div>
);
```

**改善内容の詳細:**

1. **事前インデックス構築（O(n)）:**
   ```typescript
   const idToGlobalIndex = new Map<string, number>();
   todos.forEach((item, index) => {
     idToGlobalIndex.set(item.getId(), index);
   });
   ```
   - `todos`配列を1回だけループしてMapを構築
   - 計算量: O(n)（nは全アイテム数）

2. **検索の高速化（O(1)）:**
   ```typescript
   const globalIndex = idToGlobalIndex.get(item.getId())!;
   ```
   - `Map.get()`は平均O(1)の計算量
   - `findIndex()`のO(n)線形探索と比較して劇的に高速

3. **全体の計算量:**
   - 事前構築: O(n)
   - レンダリング: O(グループ数 × グループあたりのアイテム数 × 1) = O(n)
   - **合計: O(n)**（修正前のO(n²)から改善）

**Non-null assertion operator (`!`) の使用理由:**
```typescript
const globalIndex = idToGlobalIndex.get(item.getId())!;
```

`!`演算子を使用している理由:
- `itemsForDate`の各アイテムは必ず`todos`配列から抽出されたもの
- したがって、`idToGlobalIndex.get(item.getId())`は必ず有効な数値を返す
- TypeScriptの型システムでは`Map.get()`が`number | undefined`を返すため、`!`で`undefined`でないことを明示


## 5. この変更がissue #0021をどのように解決するか

### Issue要件との対応

**要件1: 「D&Dしても並び変わらないことがある」**

**原因:**
- ローカルインデックスとグローバルインデックスの不一致により、誤った位置の要素が入れ替わっていた
- 視覚的に見えている位置と、データ上の位置がずれていた

**解決:**
- グローバルインデックスの使用により、ドラッグ元とドロップ先が全体リスト内で正確に特定される
- `onReorder(fromIndex, toIndex)`が正しいインデックスで呼び出されるようになった

**要件2: 「カレンダーイベントがtodoよりも上に来ることができないように見える」**

**原因:**
- グローバルインデックスとローカルインデックスのずれにより、カレンダーイベントをドラッグした際に意図しない位置に移動していた
- 特に、異なる日付グループ間での移動時に問題が顕著だった

**解決:**
- アイテムの種別（TODOかカレンダーイベントか）に関わらず、すべてのアイテムが同じ方法でインデックスを計算される
- `ListItem`インターフェースを実装しているすべてのアイテムが、平等に並び替え可能

### 動作の具体例

**修正前:**
```
全体リスト: [A(todo), B(todo), C(calendar), D(todo), E(calendar)]
            ↓ 日付でフィルタリング
グループ1: [A, B, C]  ← ローカルindex: 0, 1, 2
グループ2: [D, E]     ← ローカルindex: 0, 1

Cをドラッグ→Dにドロップしようとすると:
- Cのローカルindex: 2
- Dのローカルindex: 0
- onReorder(2, 0)が呼び出される
- しかし、グローバルでは C=2, D=3 なので、
  実際にはAとCが入れ替わってしまう（誤動作）
```

**修正後:**
```
全体リスト: [A(todo), B(todo), C(calendar), D(todo), E(calendar)]
            ↓ 日付でフィルタリング（表示のみ）
グループ1: [A, B, C]  ← グローバルindex: 0, 1, 2
グループ2: [D, E]     ← グローバルindex: 3, 4

Cをドラッグ→Dにドロップすると:
- Cのグローバルindex: 2
- Dのグローバルindex: 3
- onReorder(2, 3)が呼び出される
- CとDが正しく入れ替わる（正常動作）
```


## 6. issue から直接は要求されていない変更の説明

### 6.1 パフォーマンス最適化（コミット a03c332）

**変更内容:**
- `findIndex()`の繰り返し呼び出しを、事前構築した`Map`での検索に置き換え
- O(n²) → O(n) への計算量改善

**なぜこのタイミングで実施したか:**

issueには明示されていませんが、次の理由で最適化が必要と判断されたと推測されます:

1. **第一段階の修正がパフォーマンス問題を導入:**
   - 機能修正のために`findIndex()`を使用したが、これがレンダリングごとに繰り返し実行される
   - 現時点では問題にならなくても、将来的にアイテム数が増えた際にボトルネックになる

2. **プロアクティブな最適化:**
   - バグ修正と同時に、潜在的なパフォーマンス問題も解決
   - 技術的負債を残さず、クリーンなコードベースを維持

3. **MVCアーキテクチャの原則に沿った実装:**
   - ビュー層（`DateGroupedTodoList`）は表示に集中すべき
   - 重い計算はなるべく避け、効率的なレンダリングを実現

### 6.2 変数名の明確化

**変更内容:**
- `index` → `globalIndex`
- `dropIndex` → `globalDropIndex`

**なぜこの変更が必要か:**

1. **ドメイン概念の明確化:**
   - 「ローカルインデックス」と「グローバルインデックス」という2つの異なる概念が存在する
   - 変数名で区別することで、将来の開発者が混同するリスクを低減

2. **コードの自己文書化:**
   - コメントを読まなくても、変数名から意図が理解できる
   - メンテナンス時のコードリーディングコストを削減

3. **バグの予防:**
   - 型は同じ`number`だが、意味が異なるインデックスを誤って使用するミスを防ぐ
   - 特に、将来的にローカルインデックスを使う必要が出てきた場合の混同を防止

### 6.3 コメントの追加

**追加されたコメント:**

```typescript
// パフォーマンス最適化: IDからグローバルインデックスへのマップを事前構築
// O(n²)の繰り返しfindIndex()呼び出しを回避
```

```typescript
// グループ内のローカルインデックスではなく、全体のアイテムリスト内でのグローバルインデックスを取得
// Map経由でO(1)の高速検索
```

**なぜこのコメントが必要か:**

1. **技術的意図の説明:**
   - なぜMapを使用しているかの理由を明示
   - パフォーマンス最適化であることを将来の開発者に伝える

2. **計算量の明示:**
   - O(n²)とO(1)の記載により、最適化の効果を定量的に示す
   - 「なぜこの複雑な実装をしているか」の疑問に答える

3. **削除されないための防御:**
   - 将来のリファクタリング時に、「これは不要では?」と誤判断されないよう、存在理由を明記


## 7. 影響範囲と注意点

### 7.1 影響を受けるコンポーネント

**直接的な影響:**
- `DateGroupedTodoList`コンポーネントのみ

**間接的な影響:**
- `TodoItem`コンポーネント: `index` propの意味が変わる（ローカル→グローバル）
- `useTodos`フック: `onReorder()`が正しいインデックスで呼び出されるようになる
- `TodoRepository.reorderItems()`: 正しいインデックスが渡されることで、期待通りの並び替えが実行される

### 7.2 破壊的変更の有無

**破壊的変更: なし**

この変更は**バグ修正**であり、APIや外部インターフェースは変更されていません:
- `DateGroupedTodoList`のpropsインターフェースは不変
- `onReorder`コールバックのシグネチャは不変
- データモデル（`ListItem`, `Todo`, `CalendarEvent`）は不変

### 7.3 パフォーマンスへの影響

**改善内容:**
- レンダリング時の計算量: O(n²) → O(n)
- アイテム数が増えても線形的にしかコストが増加しない

**具体的な数値例:**
- 100アイテム、35日付グループの場合:
  - 修正前: 最大3,500回のfindIndex()呼び出し（O(n²)）
  - 修正後: 100回のMap.set() + 100回のMap.get()（O(n)）
  - 約35倍の高速化

**メモリへの影響:**
- `Map<string, number>`を1つ保持するため、わずかなメモリオーバーヘッド
- nアイテムに対してO(n)のメモリ使用量（許容範囲内）

### 7.4 エラーハンドリングの変化

**Non-null assertion (`!`) の使用:**
```typescript
const globalIndex = idToGlobalIndex.get(item.getId())!;
```

**潜在的なリスク:**
- `itemsForDate`のアイテムが`todos`に存在しない場合、`undefined`が返される
- `!`演算子により、この場合にエラーがスローされる

**リスクの評価:**
- `itemsForDate`は`TodoRepository.filterItemsByDate(todos, ...)`で生成される
- この関数は`todos`配列をフィルタリングするだけなので、存在しないアイテムは含まれない
- したがって、実質的にリスクは無視できる

**将来の改善案（推測）:**
- より安全性を重視する場合は、`??`演算子でフォールバック値を提供:
  ```typescript
  const globalIndex = idToGlobalIndex.get(item.getId()) ?? -1;
  if (globalIndex === -1) {
    console.error(`Item not found: ${item.getId()}`);
    return null;
  }
  ```


## 8. テスト観点

### 8.1 追加・変更されたテストコード

**現状:** このコミット範囲ではテストコードの追加・変更はありません。

### 8.2 本来あるべきテスト観点

本修正に対して、以下のテストが有効と考えられます:

#### 8.2.1 機能テスト

**ドラッグ&ドロップの正確性:**
```typescript
describe('DateGroupedTodoList - Drag and Drop', () => {
  test('同じ日付グループ内での並び替えが正しく動作する', () => {
    const todos = [
      createTodo({ id: '1', text: 'Task A', date: '2025-12-01' }),
      createTodo({ id: '2', text: 'Task B', date: '2025-12-01' }),
      createTodo({ id: '3', text: 'Task C', date: '2025-12-01' }),
    ];

    // Task A(index=0)をTask C(index=2)にドロップ
    // 期待: onReorder(0, 2)が呼ばれる
  });

  test('異なる日付グループ間での並び替えが正しく動作する', () => {
    const todos = [
      createTodo({ id: '1', text: 'Task A', date: '2025-12-01' }),
      createTodo({ id: '2', text: 'Task B', date: '2025-12-01' }),
      createTodo({ id: '3', text: 'Task C', date: '2025-11-30' }),
    ];

    // Task A(index=0)をTask C(index=2)にドロップ
    // 期待: onReorder(0, 2)が呼ばれる
  });

  test('カレンダーイベントをTODOよりも上に移動できる', () => {
    const todos = [
      createTodo({ id: '1', text: 'Task A', date: '2025-12-01' }),
      createCalendarEvent({ id: '2', text: 'Event B', date: '2025-12-01' }),
    ];

    // Event B(index=1)をTask A(index=0)の位置にドロップ
    // 期待: onReorder(1, 0)が呼ばれる
  });
});
```

#### 8.2.2 パフォーマンステスト

**計算量の検証:**
```typescript
describe('DateGroupedTodoList - Performance', () => {
  test('大量のアイテムでもレンダリングが効率的である', () => {
    const todos = Array.from({ length: 1000 }, (_, i) =>
      createTodo({ id: `${i}`, text: `Task ${i}`, date: randomDate() })
    );

    const startTime = performance.now();
    render(<DateGroupedTodoList todos={todos} {...mockHandlers} />);
    const endTime = performance.now();

    // 期待: 1000アイテムでも100ms以内にレンダリング完了
    expect(endTime - startTime).toBeLessThan(100);
  });
});
```

#### 8.2.3 統合テスト

**E2Eシナリオ:**
```typescript
describe('DateGroupedTodoList - E2E', () => {
  test('ドラッグ&ドロップ後に正しい順序で保存される', async () => {
    // 1. アイテムをレンダリング
    // 2. ドラッグ&ドロップを実行
    // 3. onReorderが正しいインデックスで呼ばれることを確認
    // 4. 保存後、リロードしても順序が維持されていることを確認
  });
});
```

#### 8.2.4 リグレッションテスト

**過去のバグの再発防止:**
```typescript
describe('DateGroupedTodoList - Regression', () => {
  test('issue #0021: ローカルインデックスとグローバルインデックスの混同が発生しない', () => {
    const todos = [
      createTodo({ id: '1', text: 'A', date: '2025-12-01' }),
      createTodo({ id: '2', text: 'B', date: '2025-12-01' }),
      createTodo({ id: '3', text: 'C', date: '2025-11-30' }),
    ];

    const onReorder = jest.fn();
    const { getByText } = render(
      <DateGroupedTodoList todos={todos} onReorder={onReorder} {...} />
    );

    // Cをドラッグ→Aにドロップ
    dragAndDrop(getByText('C'), getByText('A'));

    // 期待: onReorder(2, 0)が呼ばれる（修正前は誤ったインデックスが渡されていた）
    expect(onReorder).toHaveBeenCalledWith(2, 0);
  });
});
```


## 9. まとめ

### 解決された問題

1. **ドラッグ&ドロップの不具合:** ローカルインデックスとグローバルインデックスの混同により、並び替えが正しく動作しなかった問題を解決
2. **カレンダーイベントの制限:** すべてのアイテムタイプが平等に並び替え可能になった
3. **パフォーマンス問題:** O(n²)の計算量をO(n)に改善し、スケーラビリティを確保

### 技術的なポイント

- **最小限の変更:** ビュー層のみの修正で、モデル層やコントローラー層に影響を与えない
- **段階的な改善:** まず機能修正（52f6ec1）、次にパフォーマンス最適化（a03c332）という明確な段階
- **コードの明確性:** 変数名の変更とコメントの追加により、将来のメンテナンス性を向上

### 今後の展望（推測）

今回の修正により、ドラッグ&ドロップ機能は正常に動作するようになりましたが、以下の拡張が考えられます:

- **視覚的フィードバックの改善:** ドロップ位置のプレビュー表示
- **日付グループ間のドラッグ時の日付自動更新:** アイテムを別の日付グループにドロップした際、自動的に日付を変更
- **アンドゥ/リドゥ機能:** 並び替えを元に戻す機能
- **キーボードショートカットのサポート:** アクセシビリティの向上

これらの機能は、今回確立されたグローバルインデックスの仕組みを基盤として実装できます。
