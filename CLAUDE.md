# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Electron + React + TypeScriptで構築されたデスクトップTODO管理アプリケーション。JSONファイルによるローカルデータ永続化を実装。

## 開発コマンド

### 開発環境の起動
```bash
npm run electron:dev  # Vite開発サーバー + Electronを同時起動（ホットリロード有効）
```

### ビルド
```bash
npm run build         # TypeScriptコンパイル + Viteビルド + Electronコード生成
npm run electron:build  # 上記ビルド + electron-builderでパッケージング
```

ビルドスクリプト（推奨）:
```bash
./build.sh           # 通常ビルド
./build.sh clean     # クリーンビルド
./build.sh package   # ビルド + パッケージング
```

## アーキテクチャ

### プロセス構造（Electron）

- **Main Process** (`electron/main.ts`): IPCハンドラーの登録、ウィンドウ管理、ファイルI/O処理
- **Preload Script** (`electron/preload.ts`): `contextBridge`経由で安全なAPIをレンダラーに公開
- **Renderer Process** (`src/`): React UIコンポーネント、状態管理

### データフロー

1. **初期化**: `useTodos` → `window.electronAPI.loadTodos()` → Main Process (`load-todos` IPC) → ファイル読み込み
2. **更新**: ユーザー操作 → `useTodos` → `setTodosWithPersist` → 楽観的UI更新 + 非同期保存 → Main Process (`save-todos` IPC) → アトミックな書き込み
3. **エラー処理**: 保存失敗時は自動ロールバック（`useTodos.ts:31-35`）

### 重要な実装パターン

#### 楽観的更新 + ロールバック
`useTodos.ts:25-39`の`setTodosWithPersist`は、UIを即座に更新してから非同期で保存。失敗時は前の状態に戻す。

#### アトミックなファイル書き込み
`electron/main.ts:64-82`は一時ファイル経由で書き込み、`rename`でアトミックに上書き。データ破損を防ぐ。

#### データ破損時の自動バックアップ
`electron/main.ts:47-55`でJSONパースエラー時、タイムスタンプ付きバックアップを作成。

### データ保存場所

- macOS: `~/Library/Application Support/oreno-todo/todos.json`
- Windows: `%APPDATA%/oreno-todo/todos.json`
- Linux: `~/.config/oreno-todo/todos.json`

## コーディングガイドライン

### IPC通信の追加
1. `src/types/electron.d.ts`にAPIメソッド定義を追加
2. `electron/preload.ts`で`ipcRenderer.invoke`呼び出しを実装
3. `electron/main.ts`に`ipcMain.handle`を登録
4. `src/hooks/useTodos.ts`でフックに統合

### 新機能の実装
- すべてのTODO操作は`useTodos`フック経由で実装すること
- `setTodosWithPersist`を使用して状態更新と永続化を同時実行
- エラーハンドリングは楽観的更新のロールバックパターンに従う

### TypeScript設定
- `tsconfig.json`: React UIコード（`src/`）
- `tsconfig.electron.json`: Electronプロセスコード（`electron/`）
- `tsconfig.node.json`: Node.js関連の設定

## 注意事項

- ブラウザでは動作しない（Electron専用）
- `contextIsolation: true`, `nodeIntegration: false`によるセキュアな設定
- 開発時は`http://localhost:5173`、本番時は`dist/index.html`をロード
