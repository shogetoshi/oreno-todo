# OrenoTodo

Electron + React + TypeScript で作られたデスクトップTODO管理アプリケーション

## 特徴

- ✅ JSONファイルでのデータ永続化
- ✅ Electronデスクトップアプリケーション（ブラウザ非対応）
- ✅ React + TypeScript
- ✅ カスタムフック（useTodos）
- ✅ Viteによる高速ビルド
- ✅ electron-builderによるパッケージング

## 開発環境

### 必要な環境

- Node.js 18以上
- npm

### セットアップ

```bash
# 依存関係のインストール
npm install
```

### 開発

```bash
# 開発モードで起動（ホットリロード付き）
npm run electron:dev
```

### ビルド

#### npmコマンドを使用

```bash
# プロジェクトをビルド
npm run build

# Electronアプリケーションをパッケージング
npm run electron:build
```

#### ビルドスクリプトを使用（推奨）

```bash
# 通常ビルド
./build.sh

# クリーンビルド（既存の成果物を削除してからビルド）
./build.sh clean

# ビルド + パッケージング
./build.sh package

# ヘルプを表示
./build.sh help
```

パッケージングされたアプリケーションは `release` ディレクトリに生成されます。

## 使い方

### タスクの追加
- 上部の入力欄にタスクを入力して「追加」ボタンをクリック

### タスクの完了
- チェックボックスをクリックしてタスクを完了/未完了に切り替え

### タスクの編集
- タスクテキストをダブルクリックするか、「編集」ボタンをクリック
- 編集後はEnterキーで確定、Escキーでキャンセル

### タスクの削除
- 「削除」ボタンをクリック

## データ保存

TODOデータは以下の場所にJSONファイルとして保存されます：

- macOS: `~/Library/Application Support/oreno-todo/todos.json`
- Windows: `%APPDATA%/oreno-todo/todos.json`
- Linux: `~/.config/oreno-todo/todos.json`

## 技術スタック

- **Electron**: デスクトップアプリケーション化
- **React**: UIフレームワーク
- **TypeScript**: 型安全な開発
- **Vite**: 高速ビルドツール
- **electron-builder**: アプリケーションパッケージング

## ライセンス

MIT
