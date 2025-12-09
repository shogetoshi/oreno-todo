# Issue 0033: Projectごとの色付け 実装計画

## Issue概要

各Todo/カレンダーイベントをProjectのカラーで色付けする機能を実装します。

### 要件
- プロジェクトに設定されたカラーを利用
- 同一taskcodeでもプロジェクトやカラー指定は月ごとに変更されうる（日付を考慮）
- 該当プロジェクトがない場合、またはカラーが指定されていない場合は灰色にする

## 現状分析

### 既存の色付け実装（TaskExecutionStackBar）
issue 0032で実装済みの積み上げ棒グラフの色付けは以下の構造で実装されている:
- `assignColorToItem(item, date, projectRepo)` 関数が色を解決
- `ProjectDefinitionRepository.getColorForTaskcode(projectRepo, date, taskcode)` でtaskcodeから色を取得
- 該当なしの場合は `#808080`（灰色）を返す

### 色付け対象
- `TodoItem.tsx` コンポーネント内の `<li>` 要素
- 視覚的な統一性のため、左ボーダーに色を適用する方針を採用

## 実装内容

### 1. TodoItemコンポーネントにprojectRepoプロップを追加

**ファイル**: `src/components/TodoItem.tsx`

TodoItemPropsインターフェースに`projectRepo`を追加し、色を取得して左ボーダーに適用する。

```typescript
interface TodoItemProps {
  // ... 既存のprops
  projectRepo: ProjectDefinitionRepository; // 追加
}
```

コンポーネント内で`assignColorToItem`を呼び出し、取得した色を`<li>`要素の`style`に適用:

```typescript
const projectColor = assignColorToItem(todo, currentDate, projectRepo);

<li
  className={`todo-item ${completed ? 'completed' : ''}`}
  style={{
    borderLeft: `4px solid ${projectColor}`,
    opacity: isDragging ? 0.5 : 1
  }}
  // ... 他の属性
>
```

### 2. DateGroupedTodoListからTodoItemへprojectRepoを渡す

**ファイル**: `src/components/DateGroupedTodoList.tsx`

既にDateGroupedTodoListは`projectRepo`をpropsとして受け取っている（L18, L35）。
TodoItemの呼び出し箇所（L144-161）に`projectRepo`を追加する:

```typescript
<TodoItem
  key={item.getId()}
  todo={item}
  index={globalIndex}
  isDragging={draggedIndex === globalIndex}
  currentDate={group.date}
  projectRepo={projectRepo}  // 追加
  // ... 他のprops
/>
```

### 3. CSSの調整

**ファイル**: `src/App.css`

`.todo-item`のスタイルを調整し、左ボーダーのデフォルト値を設定:

```css
.todo-item {
  /* 既存のスタイル */
  border-left: 4px solid #808080; /* デフォルトの灰色ボーダー（inline styleで上書きされる） */
}
```

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/TodoItem.tsx` | projectRepoプロップ追加、色付けロジック実装 |
| `src/components/DateGroupedTodoList.tsx` | TodoItemにprojectRepoを渡す |
| `src/App.css` | .todo-itemに左ボーダースタイル追加 |

## 考慮事項

1. **月ごとの色変更対応**: `currentDate`（YYYY-MM-DD形式）を`assignColorToItem`に渡すことで、日付から月を抽出して適切なプロジェクト定義を参照する（既存の`assignColorToItem`が対応済み）

2. **完了状態との相互作用**: 完了状態（`.todo-item.completed`）のopacity: 0.6は左ボーダーにも適用されるため、自然な視覚効果が得られる

3. **既存機能との整合性**: TaskExecutionStackBarと同じ`assignColorToItem`関数を使用することで、色付けロジックが統一される

4. **パフォーマンス**: 色の計算はレンダリング時に行われるが、軽量な処理のため問題なし
