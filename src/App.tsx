import { useState } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { DateGroupedTodoList } from './components/DateGroupedTodoList';
import { TodoRepository } from './models/TodoRepository';
import './App.css';

/**
 * View Layer: App Component
 * アプリケーションのメインUIとJSON編集モーダルを提供
 * JSON編集関連のローカル状態のみを管理
 */
function App() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, editTaskcode, reorderTodos, replaceFromJson, editSingleItemFromJson, startTimer, stopTimer, importCalendarEvents } = useTodos();
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleOpenJsonEditor = () => {
    setJsonText(JSON.stringify(TodoRepository.itemsToJsonArray(todos), null, 2));
    setJsonError('');
    setEditingItemId(null);
    setIsJsonEditorOpen(true);
  };

  const handleOpenSingleItemJsonEditor = (id: string) => {
    const item = todos.find((item) => item.getId() === id);
    if (!item) {
      return;
    }
    setJsonText(JSON.stringify(item.toJSON(), null, 2));
    setJsonError('');
    setEditingItemId(id);
    setIsJsonEditorOpen(true);
  };

  const handleCloseJsonEditor = () => {
    setIsJsonEditorOpen(false);
    setJsonText('');
    setJsonError('');
    setEditingItemId(null);
  };

  const handleSaveJson = async () => {
    try {
      if (editingItemId) {
        // 単一アイテムの編集
        await editSingleItemFromJson(editingItemId, jsonText);
      } else {
        // 全アイテムの置き換え
        await replaceFromJson(jsonText);
      }
      handleCloseJsonEditor();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError('JSONの形式が正しくありません: ' + error.message);
      } else if (error instanceof Error) {
        setJsonError(error.message);
      } else {
        setJsonError('保存に失敗しました');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>OrenoTodo</h1>
      </header>

      <main className="app-main">
        <div className="input-header">
          <TodoInput onAdd={addTodo} />
          <div className="input-header-buttons">
            <button
              className="json-edit-button"
              onClick={handleOpenJsonEditor}
            >
              JSON編集
            </button>
            <button
              className="calendar-import-button"
              onClick={importCalendarEvents}
            >
              カレンダーから取得
            </button>
          </div>
        </div>

        <DateGroupedTodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onEdit={editTodo}
          onEditTaskcode={editTaskcode}
          onReorder={reorderTodos}
          onStartTimer={startTimer}
          onStopTimer={stopTimer}
          onOpenJsonEditor={handleOpenSingleItemJsonEditor}
        />

        {isJsonEditorOpen && (
          <div className="modal-overlay" onClick={handleCloseJsonEditor}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingItemId ? 'アイテムのJSON編集' : 'JSON編集'}</h2>
                <button className="modal-close" onClick={handleCloseJsonEditor}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <textarea
                  className="json-textarea"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="TODOデータのJSON配列を入力..."
                />
                {jsonError && <div className="error-message">{jsonError}</div>}
              </div>
              <div className="modal-footer">
                <button className="modal-cancel-button" onClick={handleCloseJsonEditor}>
                  キャンセル
                </button>
                <button className="modal-save-button" onClick={handleSaveJson}>
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
