# Issue: Todo削除時の確認ダイアログ実装計画

## Issue概要

Todo及びカレンダーイベント削除時に確認ダイアログを表示する機能を追加します。

### 要件
- Todo削除時に確認ダイアログを表示する
- カレンダーイベント削除時にも同様に確認ダイアログを表示する
- ユーザーが「キャンセル」を選択した場合は削除を中止する
- ユーザーが「削除」を確認した場合のみ削除処理を実行する

## 現状の実装調査結果

### 削除処理の流れ

現在の削除処理は以下の流れで実装されています:

1. **View層 (`TodoItem.tsx`)**:
   - 174行目: 削除ボタン（🗑️）がクリックされると`onDelete(todoId)`を呼び出す
   - 現在は確認なしで即座に削除処理を実行

2. **View層 (`App.tsx`)**:
   - 19行目: `useTodos`フックから`deleteTodo`関数を取得
   - 190行目: `DateGroupedTodoList`に`onDelete={deleteTodo}`を渡す

3. **Controller層 (`useTodos.ts`)**:
   - 71-73行目: `deleteTodo`関数がTodoRepositoryの`deleteItem`メソッドを呼び出す
   - 楽観的更新パターンを使用（即座にUI更新、非同期で永続化）

4. **Model層 (`TodoRepository.ts`)**:
   - 58-60行目: `deleteItem`メソッドがListItem配列から指定IDのアイテムを削除
   - イミュータブルな実装（新しい配列を返す）

### 既存のモーダル実装

`App.tsx`には既にJSON編集用のモーダルが実装されています（202-238行目）:
- `isJsonEditorOpen`ステートでモーダルの開閉を管理
- `.modal-overlay`と`.modal-content`を使用したオーバーレイ表示
- モーダル外クリックで閉じる機能
- キャンセル・保存ボタン

このスタイルと構造を参考に削除確認ダイアログを実装できます。

## 実装方針

### アーキテクチャ上の配置

MVCアーキテクチャに従い、以下のレイヤーに機能を配置します:

- **View層**: 確認ダイアログのUI表示と状態管理
- **Controller層**: 変更なし（削除処理の呼び出しはViewで制御）
- **Model層**: 変更なし（削除ロジックは既存のまま）

確認ダイアログはUI状態管理の一部であり、ビジネスロジックには影響しないため、View層のみの変更で実装します。

### 実装方法の選択

以下の2つの実装方法を検討しました:

#### 方法A: `window.confirm()`を使用（簡易実装）
**利点**:
- 実装が非常にシンプル
- 追加のコンポーネントが不要
- コード変更が最小限

**欠点**:
- ブラウザネイティブのダイアログでスタイルをカスタマイズできない
- アプリのデザインと統一感がない
- テストが困難

#### 方法B: カスタム確認モーダルコンポーネントを作成（推奨）
**利点**:
- アプリのデザインと統一感を保てる
- スタイルを完全にカスタマイズ可能
- テスト可能
- 将来的な拡張性が高い（メッセージのカスタマイズなど）

**欠点**:
- 実装コード量が増える
- 状態管理が必要

**採用方針**: 方法Bを採用します。理由は、既存のJSON編集モーダルと同様のデザインパターンを使用でき、アプリ全体のUI統一性を保てるためです。

## 実装内容

### 1. View層: 確認ダイアログコンポーネントの作成

**ファイル**: `src/components/ConfirmDialog.tsx`（新規作成）

汎用的な確認ダイアログコンポーネントを作成します:

```typescript
/**
 * View Layer: ConfirmDialog Component
 * 確認ダイアログのUI表示
 * ローカルな表示状態のみを管理
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**機能**:
- `isOpen`プロパティでダイアログの表示/非表示を制御
- `title`でダイアログタイトルを表示
- `message`で確認メッセージを表示
- `confirmButtonText`と`cancelButtonText`でボタンラベルをカスタマイズ可能（デフォルト値あり）
- `onConfirm`で確認ボタンクリック時のコールバック
- `onCancel`でキャンセルボタンクリック時とオーバーレイクリック時のコールバック

**スタイル**:
- 既存の`.modal-overlay`と`.modal-content`クラスを再利用
- 削除確認用の`.confirm-dialog-button`クラスを追加（危険操作を示す赤色）

### 2. View層: TodoItemコンポーネントの修正

**ファイル**: `src/components/TodoItem.tsx`

削除ボタンクリック時の処理を変更します:

**変更前**:
```typescript
<button onClick={() => onDelete(todoId)} className="delete-button">
  🗑️
</button>
```

**変更後**:
1. ローカル状態として`isDeleteDialogOpen`を追加
2. 削除ボタンクリック時にダイアログを開く
3. 確認ダイアログコンポーネントを配置
4. 確認時のみ`onDelete(todoId)`を呼び出す

```typescript
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

const handleDeleteClick = () => {
  setIsDeleteDialogOpen(true);
};

const handleConfirmDelete = () => {
  onDelete(todoId);
  setIsDeleteDialogOpen(false);
};

const handleCancelDelete = () => {
  setIsDeleteDialogOpen(false);
};
```

### 3. スタイルの追加

**ファイル**: `src/App.css`

確認ダイアログ用のスタイルを追加します:

```css
/* 確認ダイアログボタン（危険操作を示す赤色） */
.confirm-dialog-button {
  background-color: #dc3545;
  color: white;
}

.confirm-dialog-button:hover {
  background-color: #c82333;
}

/* 確認ダイアログメッセージ */
.confirm-dialog-message {
  padding: 20px;
  text-align: center;
  font-size: 16px;
  line-height: 1.5;
}
```

既存の`.modal-overlay`、`.modal-content`、`.modal-header`、`.modal-footer`、`.modal-close`、`.modal-cancel-button`スタイルは再利用します。

### 4. テストの追加

**ファイル**: `src/components/ConfirmDialog.test.tsx`（新規作成）

`ConfirmDialog`コンポーネントの単体テストを追加します:

- ダイアログが`isOpen=true`の時に表示されることをテスト
- ダイアログが`isOpen=false`の時に非表示になることをテスト
- 確認ボタンクリック時に`onConfirm`が呼ばれることをテスト
- キャンセルボタンクリック時に`onCancel`が呼ばれることをテスト
- オーバーレイクリック時に`onCancel`が呼ばれることをテスト
- カスタムボタンテキストが表示されることをテスト

**ファイル**: `src/components/TodoItem.test.tsx`（新規作成）

`TodoItem`コンポーネントの削除機能のテストを追加します:

- 削除ボタンクリック時に確認ダイアログが表示されることをテスト
- 確認ダイアログで確認した時のみ`onDelete`が呼ばれることをテスト
- 確認ダイアログでキャンセルした時は`onDelete`が呼ばれないことをテスト

### 5. ドキュメントの更新

**ファイル**: `docs/MVC-ARCHITECTURE.md`

View層のコンポーネント一覧に`ConfirmDialog.tsx`を追加します:

```markdown
#### `src/components/ConfirmDialog.tsx`
- **役割**: 汎用的な確認ダイアログ
- **内容**:
  - 確認メッセージの表示
  - 確認/キャンセルボタン
  - オーバーレイクリックでキャンセル
- **ローカル状態**: なし（親コンポーネントで管理）
```

## 実装の詳細設計

### ConfirmDialogコンポーネントの完全な仕様

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;                    // ダイアログの表示/非表示
  title: string;                      // ダイアログのタイトル
  message: string;                    // 確認メッセージ
  confirmButtonText?: string;         // 確認ボタンのテキスト（デフォルト: "削除"）
  cancelButtonText?: string;          // キャンセルボタンのテキスト（デフォルト: "キャンセル"）
  onConfirm: () => void;              // 確認ボタンクリック時のコールバック
  onCancel: () => void;               // キャンセル時のコールバック
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmButtonText = "削除",
  cancelButtonText = "キャンセル",
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel-button" onClick={onCancel}>
            {cancelButtonText}
          </button>
          <button className="confirm-dialog-button" onClick={onConfirm}>
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### TodoItemコンポーネントの変更内容

```typescript
// 削除確認ダイアログの状態を追加
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

// 削除ボタンクリック時の処理
const handleDeleteClick = () => {
  setIsDeleteDialogOpen(true);
};

// 削除確認時の処理
const handleConfirmDelete = () => {
  onDelete(todoId);
  setIsDeleteDialogOpen(false);
};

// 削除キャンセル時の処理
const handleCancelDelete = () => {
  setIsDeleteDialogOpen(false);
};

// JSX内の削除ボタン
<button onClick={handleDeleteClick} className="delete-button">
  🗑️
</button>

// JSX内に確認ダイアログを追加
<ConfirmDialog
  isOpen={isDeleteDialogOpen}
  title="削除の確認"
  message={`「${todoText}」を削除してもよろしいですか?`}
  confirmButtonText="削除"
  cancelButtonText="キャンセル"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
/>
```

### カレンダーイベントとTodoの違い

カレンダーイベントもTodoと同じく`ListItem`インターフェースを実装しているため、`TodoItem`コンポーネントで統一的に処理されます。したがって、上記の実装により自動的にカレンダーイベントの削除時にも確認ダイアログが表示されます。

### エッジケース

1. **ダイアログが開いている状態でアイテムが削除された場合**
   - アイテムが再レンダリングされないため、ダイアログは自動的に閉じます

2. **複数のアイテムの削除ダイアログを同時に開こうとした場合**
   - 各`TodoItem`がローカル状態で管理しているため、技術的には複数開くことが可能
   - ただし、モーダルオーバーレイのz-indexが同じため、視覚的には最後に開いたものが最前面に表示されます
   - 通常の使用では1つずつ削除するため、問題にはなりません

3. **編集中に削除ボタンをクリックした場合**
   - 現在の実装では編集中でも削除ボタンはクリック可能
   - 確認ダイアログでキャンセルすれば編集を継続できます
   - 確認して削除すれば、編集内容は破棄されアイテムが削除されます

## 影響範囲

### 新規ファイル
- `src/components/ConfirmDialog.tsx` - 確認ダイアログコンポーネント
- `src/components/ConfirmDialog.test.tsx` - 確認ダイアログのテスト
- `src/components/TodoItem.test.tsx` - TodoItemコンポーネントのテスト

### 変更ファイル
- `src/components/TodoItem.tsx` - 削除ボタンの処理を変更
- `src/App.css` - 確認ダイアログ用のスタイルを追加
- `docs/MVC-ARCHITECTURE.md` - ドキュメント更新

### 変更なし
- `src/hooks/useTodos.ts` - Controller層は変更不要
- `src/models/TodoRepository.ts` - Model層は変更不要
- 削除処理のビジネスロジックは変更なし

## 実装順序

1. **確認ダイアログコンポーネントの作成**
   - `src/components/ConfirmDialog.tsx`の実装
   - スタイル追加（`src/App.css`）
   - 単体テスト作成（`src/components/ConfirmDialog.test.tsx`）

2. **TodoItemコンポーネントの修正**
   - 削除確認ダイアログの統合
   - 単体テスト作成（`src/components/TodoItem.test.tsx`）

3. **動作確認**
   - Todo削除時の確認ダイアログ動作確認
   - カレンダーイベント削除時の確認ダイアログ動作確認
   - キャンセル時の動作確認
   - 既存機能の回帰テスト

4. **ドキュメント更新**
   - `docs/MVC-ARCHITECTURE.md`の更新

## テスト戦略

### 単体テスト

#### ConfirmDialog.test.tsx
```typescript
describe('ConfirmDialog', () => {
  it('isOpen=trueの時に表示される', () => { ... });
  it('isOpen=falseの時に非表示になる', () => { ... });
  it('確認ボタンクリック時にonConfirmが呼ばれる', () => { ... });
  it('キャンセルボタンクリック時にonCancelが呼ばれる', () => { ... });
  it('オーバーレイクリック時にonCancelが呼ばれる', () => { ... });
  it('モーダル内クリック時にイベント伝播が止まる', () => { ... });
  it('カスタムボタンテキストが表示される', () => { ... });
  it('デフォルトボタンテキストが表示される', () => { ... });
});
```

#### TodoItem.test.tsx
```typescript
describe('TodoItem 削除確認機能', () => {
  it('削除ボタンクリック時に確認ダイアログが表示される', () => { ... });
  it('確認ダイアログで確認するとonDeleteが呼ばれる', () => { ... });
  it('確認ダイアログでキャンセルするとonDeleteが呼ばれない', () => { ... });
  it('確認ダイアログのメッセージにTodoテキストが含まれる', () => { ... });
});
```

### 統合テスト（手動）

1. **基本的な削除フロー**
   - Todoを作成
   - 削除ボタンをクリック
   - 確認ダイアログが表示されることを確認
   - 「削除」ボタンをクリック
   - Todoが削除されることを確認

2. **キャンセルフロー**
   - Todoを作成
   - 削除ボタンをクリック
   - 確認ダイアログが表示されることを確認
   - 「キャンセル」ボタンをクリック
   - Todoが削除されないことを確認
   - ダイアログが閉じることを確認

3. **オーバーレイクリックでのキャンセル**
   - Todoを作成
   - 削除ボタンをクリック
   - ダイアログ外（オーバーレイ）をクリック
   - Todoが削除されないことを確認
   - ダイアログが閉じることを確認

4. **カレンダーイベントの削除**
   - カレンダーイベントをインポート
   - 削除ボタンをクリック
   - 確認ダイアログが表示されることを確認
   - 確認して削除できることを確認

5. **複数アイテムの削除**
   - 複数のTodoを作成
   - 1つ目を削除（確認して実行）
   - 2つ目を削除（キャンセル）
   - 3つ目を削除（確認して実行）
   - 意図通りの動作をすることを確認

## 考慮事項

### パフォーマンス

- 各`TodoItem`がローカル状態を持つが、軽量なbooleanフラグのみなのでパフォーマンスへの影響は最小限
- モーダルコンポーネントは`isOpen=false`の時に`null`を返すため、DOM要素が作成されない（効率的）

### アクセシビリティ

以下のアクセシビリティ考慮を追加することを推奨します（将来的な改善）:

- モーダルが開いた時にフォーカスを移動
- Escキーでダイアログを閉じる機能
- aria-labelやrole属性の追加
- キーボードナビゲーションのサポート

### 国際化（i18n）

現在はハードコードされた日本語メッセージを使用していますが、将来的に多言語対応が必要になった場合は:

- メッセージを定数ファイルに分離
- i18nライブラリを導入
- `ConfirmDialog`コンポーネントは既にメッセージをpropsで受け取る設計なので、変更は最小限

### 既存機能への影響

- 削除処理のビジネスロジック（Model層、Controller層）は一切変更しない
- View層のみの変更なので、既存の単体テストは影響を受けない
- 楽観的更新パターンも変更なし（確認後に削除が実行されるだけ）

## 将来の拡張性

この実装により、以下の将来的な拡張が容易になります:

1. **他の危険操作への適用**
   - 完了したTodoのクリア機能
   - タイムカードエントリの削除
   - プロジェクト定義の削除

2. **確認ダイアログのバリエーション**
   - 警告レベル（info, warning, danger）の追加
   - 複数選択削除の確認
   - 削除理由の入力フィールド追加

3. **アニメーション**
   - フェードイン/フェードアウト
   - スライドアニメーション

## まとめ

この実装計画は:

- ✅ MVCアーキテクチャを維持（View層のみの変更）
- ✅ 既存のビジネスロジックに影響なし
- ✅ 既存のモーダルデザインと統一性を保つ
- ✅ TodoとCalendarEventの両方に対応
- ✅ テスト可能な設計
- ✅ 将来の拡張性を考慮

すべての変更はView層に限定されており、Model層とController層のビジネスロジックは一切変更しません。
