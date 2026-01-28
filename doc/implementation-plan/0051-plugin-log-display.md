# 実装計画書: プラグインのログ表示機能

**Issue**: `doc/issue/0051-プラグインのログ表示.md`
**作成日**: 2026-01-22

## 要件概要

本アプリおよびpluginからのエラーメッセージを表示する領域を作成する。

- **表示位置**: 上部のボタンの下、日付ごとの表示の上
- **トグル機能**: 表示/非表示を切り替え可能
- **表示内容**: プラグイン実行時のエラーやアプリケーションログ

## アーキテクチャ設計

MVCアーキテクチャに従い、各層の責務を明確に分離する。

### 1. Model層（ドメインロジック）

#### 1.1 LogEntry モデルの作成

**ファイル**: `src/models/LogEntry.ts`

```typescript
export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntryJSON {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export class LogEntry {
  constructor(
    private id: string,
    private timestamp: string,
    private level: LogLevel,
    private source: string,
    private message: string
  ) {}

  static create(level: LogLevel, source: string, message: string): LogEntry {
    return new LogEntry(
      crypto.randomUUID(),
      new Date().toISOString(),
      level,
      source,
      message
    );
  }

  static fromJSON(json: LogEntryJSON): LogEntry {
    return new LogEntry(
      json.id,
      json.timestamp,
      json.level,
      json.source,
      json.message
    );
  }

  toJSON(): LogEntryJSON {
    return {
      id: this.id,
      timestamp: this.timestamp,
      level: this.level,
      source: this.source,
      message: this.message
    };
  }

  getId(): string { return this.id; }
  getTimestamp(): string { return this.timestamp; }
  getLevel(): LogLevel { return this.level; }
  getSource(): string { return this.source; }
  getMessage(): string { return this.message; }

  getFormattedTimestamp(): string {
    const date = new Date(this.timestamp);
    return date.toLocaleString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
```

#### 1.2 LogRepository の作成

**ファイル**: `src/models/LogRepository.ts`

```typescript
import { LogEntry, LogLevel, LogEntryJSON } from './LogEntry';

export class LogRepository {
  /**
   * JSONデータ配列からLogEntry配列を復元
   */
  static fromJsonArray(jsonArray: LogEntryJSON[]): LogEntry[] {
    return jsonArray.map(json => LogEntry.fromJSON(json));
  }

  /**
   * LogEntry配列をJSON配列に変換
   */
  static toJsonArray(logs: LogEntry[]): LogEntryJSON[] {
    return logs.map(log => log.toJSON());
  }

  /**
   * 新しいログエントリを追加（最新が先頭）
   */
  static addLog(
    logs: LogEntry[],
    level: LogLevel,
    source: string,
    message: string
  ): LogEntry[] {
    const newLog = LogEntry.create(level, source, message);
    return [newLog, ...logs];
  }

  /**
   * ログをクリア
   */
  static clearLogs(): LogEntry[] {
    return [];
  }

  /**
   * 最大件数を超えるログを削除（古いものから削除）
   */
  static limitLogs(logs: LogEntry[], maxCount: number): LogEntry[] {
    if (logs.length <= maxCount) {
      return logs;
    }
    return logs.slice(0, maxCount);
  }
}
```

#### 1.3 テストファイルの作成

**ファイル**: `src/models/LogEntry.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { LogEntry } from './LogEntry';

describe('LogEntry', () => {
  it('should create a new log entry', () => {
    const log = LogEntry.create('error', 'plugin-test', 'Test error message');
    expect(log.getLevel()).toBe('error');
    expect(log.getSource()).toBe('plugin-test');
    expect(log.getMessage()).toBe('Test error message');
  });

  it('should convert to JSON and back', () => {
    const log = LogEntry.create('warning', 'app', 'Test warning');
    const json = log.toJSON();
    const restored = LogEntry.fromJSON(json);

    expect(restored.getLevel()).toBe(log.getLevel());
    expect(restored.getSource()).toBe(log.getSource());
    expect(restored.getMessage()).toBe(log.getMessage());
  });
});
```

**ファイル**: `src/models/LogRepository.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { LogRepository } from './LogRepository';
import { LogEntry } from './LogEntry';

describe('LogRepository', () => {
  it('should add a new log entry at the beginning', () => {
    const logs = [LogEntry.create('info', 'app', 'First log')];
    const newLogs = LogRepository.addLog(logs, 'error', 'plugin', 'Second log');

    expect(newLogs.length).toBe(2);
    expect(newLogs[0].getMessage()).toBe('Second log');
    expect(newLogs[1].getMessage()).toBe('First log');
  });

  it('should limit logs to max count', () => {
    const logs = [
      LogEntry.create('info', 'app', 'Log 1'),
      LogEntry.create('info', 'app', 'Log 2'),
      LogEntry.create('info', 'app', 'Log 3'),
    ];
    const limited = LogRepository.limitLogs(logs, 2);

    expect(limited.length).toBe(2);
    expect(limited[0].getMessage()).toBe('Log 1');
    expect(limited[1].getMessage()).toBe('Log 2');
  });

  it('should clear all logs', () => {
    const logs = [LogEntry.create('info', 'app', 'Test')];
    const cleared = LogRepository.clearLogs();

    expect(cleared.length).toBe(0);
  });
});
```

### 2. Controller層（状態管理・IPC通信）

#### 2.1 useLogs Hook の作成

**ファイル**: `src/hooks/useLogs.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { LogEntry } from '../models/LogEntry';
import { LogRepository } from '../models/LogRepository';
import type { LogLevel } from '../models/LogEntry';

/**
 * Controller Layer: useLogs Hook
 * ログ表示機能の状態管理を担当
 * ビジネスロジックはLogRepositoryに委譲
 */
export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const MAX_LOG_COUNT = 100;

  // ログを追加
  const addLog = useCallback((level: LogLevel, source: string, message: string) => {
    setLogs((prev) => {
      const newLogs = LogRepository.addLog(prev, level, source, message);
      return LogRepository.limitLogs(newLogs, MAX_LOG_COUNT);
    });
  }, []);

  // ログをクリア
  const clearLogs = useCallback(() => {
    setLogs(LogRepository.clearLogs());
  }, []);

  // 表示/非表示をトグル
  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  // Main Processからのログメッセージを受信
  useEffect(() => {
    if (window.electronAPI.onLogMessage) {
      window.electronAPI.onLogMessage((level: LogLevel, source: string, message: string) => {
        addLog(level, source, message);
      });
    }
  }, [addLog]);

  return {
    logs,
    isVisible,
    addLog,
    clearLogs,
    toggleVisibility
  };
};
```

#### 2.2 既存 useTodos Hook の修正

**ファイル**: `src/hooks/useTodos.ts`

既存の `startTimer` 関数を修正し、プラグインエラーをログに記録する。

```typescript
// useLogs hookをimport
import { useLogs } from './useLogs';

// useTodos内で useLogs を使用
export const useTodos = () => {
  // ... 既存のコード ...

  // startTimer関数を修正してログ記録を追加
  const startTimer = useCallback(async (id: string, addLog?: (level: LogLevel, source: string, message: string) => void) => {
    const targetItem = todos.find(item => item.getId() === id);
    setTodosWithPersist((prev) => TodoRepository.startItemTimerExclusive(prev, id));

    if (targetItem) {
      try {
        const result = await window.electronAPI.notifyTimerStart(targetItem.toJSON());
        if (!result.success && addLog) {
          addLog('error', 'plugin-system', 'プラグインへの通知に失敗しました');
        }
      } catch (error) {
        if (addLog) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          addLog('error', 'plugin-system', `プラグインエラー: ${errorMessage}`);
        }
        console.error('Failed to notify plugins:', error);
      }
    }
  }, [setTodosWithPersist, todos]);

  // ... 既存のコード ...
};
```

### 3. Electron Main Process層（プラグイン実行・ログ送信）

#### 3.1 PluginManager の修正

**ファイル**: `electron/pluginManager.ts`

プラグイン実行時のエラーを記録し、Renderer Processに送信できるようにする。

```typescript
/**
 * プラグインマネージャー
 * エラーログをコールバック経由で通知
 */
export class PluginManager {
  private plugins: Plugin[] = [];
  private pluginDir: string;
  private onLogMessage?: (level: string, source: string, message: string) => void;

  constructor(onLogMessage?: (level: string, source: string, message: string) => void) {
    const userDataDir = app.getPath('userData');
    const orenoTodoDir = path.join(path.dirname(userDataDir), 'oreno-todo');
    this.pluginDir = path.join(orenoTodoDir, 'plugins');
    this.onLogMessage = onLogMessage;
  }

  private log(level: string, source: string, message: string): void {
    console.log(`[${level.toUpperCase()}] ${source}: ${message}`);
    if (this.onLogMessage) {
      this.onLogMessage(level, source, message);
    }
  }

  async loadPlugins(): Promise<void> {
    try {
      await fsPromises.mkdir(this.pluginDir, { recursive: true });
      const files = await fsPromises.readdir(this.pluginDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));

      this.log('info', 'plugin-system', `Loading ${jsFiles.length} plugin(s)`);

      for (const file of jsFiles) {
        const pluginPath = path.join(this.pluginDir, file);
        try {
          const plugin = require(pluginPath) as Plugin;

          if (!plugin.name) {
            this.log('error', 'plugin-system', `Plugin ${file} does not have a name property`);
            continue;
          }

          this.plugins.push(plugin);
          this.log('info', 'plugin-system', `Loaded plugin: ${plugin.name}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log('error', file, `Failed to load: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', 'plugin-system', `Failed to load plugins: ${errorMessage}`);
    }
  }

  async notifyTimerStart(itemData: any): Promise<void> {
    const context: PluginContext = {
      event: 'timer-start',
      data: itemData
    };

    for (const plugin of this.plugins) {
      if (plugin.onTimerStart) {
        try {
          await Promise.resolve(plugin.onTimerStart(context));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log('error', plugin.name, `Failed on timer-start: ${errorMessage}`);
        }
      }
    }
  }

  // 他のnotifyメソッドも同様に修正...
}
```

#### 3.2 main.ts の修正

**ファイル**: `electron/main.ts`

PluginManagerからのログをRenderer Processに送信する。

```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { PluginManager } from './pluginManager';

let pluginManager: PluginManager;
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ... 既存のコード ...
}

// ログメッセージをRenderer Processに送信
function sendLogToRenderer(level: string, source: string, message: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', level, source, message);
  }
}

app.whenReady().then(async () => {
  createWindow();

  // プラグインマネージャーを初期化（ログコールバック付き）
  pluginManager = new PluginManager(sendLogToRenderer);
  await pluginManager.loadPlugins();

  startHttpServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ... 既存のコード ...
```

#### 3.3 preload.ts の修正

**ファイル**: `electron/preload.ts`

```typescript
const electronAPI: ElectronAPI = {
  // ... 既存のコード ...

  // ログメッセージ受信用
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (_event, level, source, message) =>
      callback(level, source, message)
    );
  },
};
```

#### 3.4 electron.d.ts の修正

**ファイル**: `src/types/electron.d.ts`

```typescript
export interface ElectronAPI {
  // ... 既存のコード ...

  // ログメッセージ受信用
  onLogMessage?: (callback: (level: string, source: string, message: string) => void) => void;
}
```

### 4. View層（UI表示）

#### 4.1 LogDisplay コンポーネントの作成

**ファイル**: `src/components/LogDisplay.tsx`

```typescript
import React from 'react';
import { LogEntry } from '../models/LogEntry';
import './LogDisplay.css';

interface LogDisplayProps {
  logs: LogEntry[];
  isVisible: boolean;
  onToggle: () => void;
  onClear: () => void;
}

/**
 * View Layer: LogDisplay Component
 * ログメッセージの表示・制御UIを提供
 */
export const LogDisplay: React.FC<LogDisplayProps> = ({
  logs,
  isVisible,
  onToggle,
  onClear
}) => {
  return (
    <div className="log-display-container">
      <div className="log-display-header">
        <button className="log-toggle-button" onClick={onToggle}>
          {isVisible ? '▼' : '▶'} ログ ({logs.length})
        </button>
        {isVisible && (
          <button className="log-clear-button" onClick={onClear}>
            クリア
          </button>
        )}
      </div>

      {isVisible && (
        <div className="log-display-content">
          {logs.length === 0 ? (
            <div className="log-empty">ログはありません</div>
          ) : (
            <div className="log-entries">
              {logs.map((log) => (
                <div
                  key={log.getId()}
                  className={`log-entry log-level-${log.getLevel()}`}
                >
                  <span className="log-timestamp">
                    {log.getFormattedTimestamp()}
                  </span>
                  <span className="log-level">[{log.getLevel().toUpperCase()}]</span>
                  <span className="log-source">{log.getSource()}:</span>
                  <span className="log-message">{log.getMessage()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 4.2 LogDisplay.css の作成

**ファイル**: `src/components/LogDisplay.css`

```css
.log-display-container {
  width: 100%;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.log-display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f0f0f0;
  border-bottom: 1px solid #ddd;
}

.log-toggle-button {
  font-size: 14px;
  font-weight: bold;
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  padding: 4px 8px;
}

.log-toggle-button:hover {
  background: #e0e0e0;
  border-radius: 4px;
}

.log-clear-button {
  font-size: 12px;
  padding: 4px 12px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.log-clear-button:hover {
  background: #ff5252;
}

.log-display-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
}

.log-empty {
  text-align: center;
  color: #999;
  padding: 20px;
}

.log-entries {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-entry {
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 2px;
  display: flex;
  gap: 8px;
}

.log-level-info {
  background: #e3f2fd;
}

.log-level-warning {
  background: #fff3e0;
}

.log-level-error {
  background: #ffebee;
}

.log-timestamp {
  color: #666;
  font-weight: bold;
}

.log-level {
  font-weight: bold;
}

.log-level-info .log-level {
  color: #1976d2;
}

.log-level-warning .log-level {
  color: #f57c00;
}

.log-level-error .log-level {
  color: #d32f2f;
}

.log-source {
  color: #555;
  font-weight: bold;
}

.log-message {
  color: #333;
  flex: 1;
  word-break: break-word;
}
```

#### 4.3 App.tsx の修正

**ファイル**: `src/App.tsx`

```typescript
import { useLogs } from './hooks/useLogs';
import { LogDisplay } from './components/LogDisplay';

function App() {
  const { todos, isLoading, addTodo, ..., startTimer, ... } = useTodos();
  const { logs, isVisible, addLog, clearLogs, toggleVisibility } = useLogs();
  // ... 既存のコード ...

  // startTimerをラップしてログ機能を追加
  const handleStartTimer = useCallback((id: string) => {
    startTimer(id, addLog);
  }, [startTimer, addLog]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>OrenoTodo</h1>
      </header>

      <main className="app-main">
        <div className="app-header-controls">
          <TodoInput onAdd={addTodo} />
          <div className="control-buttons">
            {/* 既存のボタン */}
          </div>
        </div>

        {/* ログ表示を追加（上部のボタンの下、Todoリストの上） */}
        <LogDisplay
          logs={logs}
          isVisible={isVisible}
          onToggle={toggleVisibility}
          onClear={clearLogs}
        />

        <DateGroupedTodoList
          todos={todos}
          // ... 既存のprops ...
          onStartTimer={handleStartTimer}
          // ... 既存のprops ...
        />

        {/* 既存のモーダルコード */}
      </main>
    </div>
  );
}
```

## 実装チェックポイント

### Model層
- [ ] `LogEntry.ts` を作成し、ログエントリのドメインモデルを実装
- [ ] `LogRepository.ts` を作成し、ログ操作のビジネスロジックを実装
- [ ] `LogEntry.test.ts` を作成し、LogEntryの単体テストを実装
- [ ] `LogRepository.test.ts` を作成し、LogRepositoryの単体テストを実装
- [ ] テストが全て成功することを確認

### Controller層
- [ ] `useLogs.ts` を作成し、ログ表示の状態管理を実装
- [ ] `useTodos.ts` を修正し、`startTimer`にログ記録機能を追加
- [ ] ElectronAPIのIPC通信設定を追加

### Electron Main Process層
- [ ] `pluginManager.ts` を修正し、ログコールバック機能を追加
- [ ] `main.ts` を修正し、PluginManagerからのログをRenderer Processに送信
- [ ] `preload.ts` を修正し、`onLogMessage` APIを公開
- [ ] `electron.d.ts` を修正し、型定義を追加

### View層
- [ ] `LogDisplay.tsx` を作成し、ログ表示UIコンポーネントを実装
- [ ] `LogDisplay.css` を作成し、ログ表示のスタイルを実装
- [ ] `App.tsx` を修正し、LogDisplayコンポーネントを配置
- [ ] UIの配置が要件通り（上部ボタンの下、日付表示の上）であることを確認
- [ ] トグルボタンで表示/非表示が切り替わることを確認

### 統合テスト
- [ ] アプリを起動し、プラグインが正常に読み込まれることを確認
- [ ] プラグインディレクトリに意図的にエラーを含むプラグインを配置
- [ ] エラーがログ表示領域に表示されることを確認
- [ ] ログのクリア機能が動作することを確認
- [ ] ログの表示/非表示トグルが動作することを確認
- [ ] 最大100件のログ制限が機能することを確認
- [ ] ログのレベル別表示（info/warning/error）が正しく色分けされることを確認

### ドキュメント
- [ ] CLAUDE.mdにログ機能の説明を追加
- [ ] 必要に応じてMVC-ARCHITECTURE.mdを更新

## 実装順序

1. **Model層の実装**（LogEntry, LogRepository, テスト）
2. **Electron Main Process層の修正**（pluginManager, main.ts, preload.ts, 型定義）
3. **Controller層の実装**（useLogs, useTodsの修正）
4. **View層の実装**（LogDisplay, App.tsx）
5. **統合テスト・動作確認**

## 注意事項

- **MVCレイヤーの遵守**: ビジネスロジックはすべてModel層（LogRepository）に実装
- **イミュータブル設計**: LogRepositoryは新しい配列を返す設計を維持
- **最大ログ件数**: メモリ使用量を考慮し、最大100件に制限
- **エラーハンドリング**: プラグインエラーがアプリ全体に影響しないようにする
- **UI配置**: 要件通りの位置（上部ボタンの下、日付表示の上）に配置
- **パフォーマンス**: ログ表示が非表示の場合はDOMレンダリングを最小限にする
