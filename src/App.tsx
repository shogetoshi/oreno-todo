import { useState } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { Todo } from './models/Todo';
import { validateTodos } from './utils/validation';
import './App.css';

function App() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, reorderTodos } = useTodos();
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleOpenJsonEditor = () => {
    const jsonArray = todos.map(todo => todo.toJSON());
    setJsonText(JSON.stringify(jsonArray, null, 2));
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
      // JSONのバリデーション
      const parsed = JSON.parse(jsonText);

      if (!validateTodos(parsed)) {
        setJsonError('JSONの形式が正しくありません。各TODOには id, text, completedAt が必要です');
        return;
      }

      // Todoオブジェクトに変換
      const newTodos = parsed.map((json: any) => Todo.fromJSON(json));

      // 保存処理
      const jsonArray = newTodos.map(todo => todo.toJSON());
      await window.electronAPI.saveTodos(jsonArray);

      // UIを更新（ページをリロードして最新状態を読み込む）
      window.location.reload();
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
          onReorder={reorderTodos}
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
