import { useState } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { TodoRepository } from './models/TodoRepository';
import './App.css';

/**
 * View Layer: App Component
 * アプリケーションのメインUIとJSON編集モーダルを提供
 * JSON編集関連のローカル状態のみを管理
 */
function App() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, editTaskcode, reorderTodos, replaceFromJson, startTimer, stopTimer } = useTodos();
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleOpenJsonEditor = () => {
    setJsonText(TodoRepository.toJsonText(todos));
    setJsonError('');
    setIsJsonEditorOpen(true);
  };

  const handleCloseJsonEditor = () => {
    setIsJsonEditorOpen(false);
    setJsonText('');
    setJsonError('');
  };

  const handleSaveJson = async () => {
    try {
      await replaceFromJson(jsonText);
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
          <button
            className="json-edit-button"
            onClick={handleOpenJsonEditor}
          >
            JSON編集
          </button>
        </div>

        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onEdit={editTodo}
          onEditTaskcode={editTaskcode}
          onReorder={reorderTodos}
          onStartTimer={startTimer}
          onStopTimer={stopTimer}
        />

        {isJsonEditorOpen && (
          <div className="modal-overlay" onClick={handleCloseJsonEditor}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>JSON編集</h2>
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
