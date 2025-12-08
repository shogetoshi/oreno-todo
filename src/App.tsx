import { useState } from 'react';
import { useTodos } from './hooks/useTodos';
import { useTimecard } from './hooks/useTimecard';
import { TodoInput } from './components/TodoInput';
import { DateGroupedTodoList } from './components/DateGroupedTodoList';
import { TodoRepository } from './models/TodoRepository';
import { TimecardRepository } from './models/TimecardRepository';
import type { ListItem } from './models/ListItem';
import './App.css';

/**
 * View Layer: App Component
 * アプリケーションのメインUIとJSON編集モーダルを提供
 * JSON編集関連のローカル状態のみを管理
 */
function App() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, editTodo, editTaskcode, reorderTodos, replaceFromJson, editSingleItemFromJson, replaceItemsForDate, startTimer, stopTimer, importCalendarEvents } = useTodos();
  const { timecardData, isLoading: isTimecardLoading, checkIn, checkOut, replaceFromJson: replaceTimecardFromJson, replaceTimecardForDate } = useTimecard();
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isTimecardJsonEditor, setIsTimecardJsonEditor] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingTimecardDate, setEditingTimecardDate] = useState<string | null>(null);

  const handleOpenJsonEditor = () => {
    setJsonText(JSON.stringify(TodoRepository.itemsToJsonArray(todos), null, 2));
    setJsonError('');
    setEditingItemId(null);
    setIsTimecardJsonEditor(false);
    setEditingDate(null);
    setEditingTimecardDate(null);
    setIsJsonEditorOpen(true);
  };

  const handleOpenTimecardJsonEditor = () => {
    setJsonText(TimecardRepository.toJsonText(timecardData));
    setJsonError('');
    setEditingItemId(null);
    setIsTimecardJsonEditor(true);
    setEditingDate(null);
    setEditingTimecardDate(null);
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
    setIsTimecardJsonEditor(false);
    setEditingDate(null);
    setEditingTimecardDate(null);
    setIsJsonEditorOpen(true);
  };

  const handleOpenJsonEditorForDate = (date: string, items: ListItem[]) => {
    setJsonText(JSON.stringify(TodoRepository.itemsToJsonArray(items), null, 2));
    setJsonError('');
    setEditingDate(date);
    setEditingItemId(null);
    setIsTimecardJsonEditor(false);
    setEditingTimecardDate(null);
    setIsJsonEditorOpen(true);
  };

  const handleOpenTimecardEditorForDate = (date: string) => {
    const entriesForDate = timecardData[date] || [];
    setJsonText(JSON.stringify(entriesForDate.map(entry => entry.toJSON()), null, 2));
    setJsonError('');
    setEditingTimecardDate(date);
    setEditingDate(null);
    setEditingItemId(null);
    setIsTimecardJsonEditor(false);
    setIsJsonEditorOpen(true);
  };

  const handleCloseJsonEditor = () => {
    setIsJsonEditorOpen(false);
    setJsonText('');
    setJsonError('');
    setEditingItemId(null);
    setIsTimecardJsonEditor(false);
    setEditingDate(null);
    setEditingTimecardDate(null);
  };

  const handleSaveJson = async () => {
    try {
      if (isTimecardJsonEditor) {
        // タイムカードJSONの置き換え
        await replaceTimecardFromJson(jsonText);
      } else if (editingTimecardDate) {
        // 日付別タイムカードの編集
        await replaceTimecardForDate(editingTimecardDate, jsonText);
      } else if (editingDate) {
        // 日付別の編集
        await replaceItemsForDate(editingDate, jsonText);
      } else if (editingItemId) {
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

  if (isLoading || isTimecardLoading) {
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
        <div className="app-header-controls">
          <TodoInput onAdd={addTodo} />
          <div className="control-buttons">
            <button className="check-in-button" onClick={checkIn}>
              🟢
            </button>
            <button className="check-out-button" onClick={checkOut}>
              ⚪
            </button>
            <button className="json-edit-button" onClick={handleOpenJsonEditor}>
              Todo JSON編集
            </button>
            <button className="json-edit-button" onClick={handleOpenTimecardJsonEditor}>
              タイムカードJSON編集
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
          onImportCalendarEvents={importCalendarEvents}
          onOpenJsonEditorForDate={handleOpenJsonEditorForDate}
          onOpenTimecardEditorForDate={handleOpenTimecardEditorForDate}
        />

        {isJsonEditorOpen && (
          <div className="modal-overlay" onClick={handleCloseJsonEditor}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {isTimecardJsonEditor
                    ? 'タイムカードのJSON編集'
                    : editingItemId
                    ? 'アイテムのJSON編集'
                    : 'JSON編集'}
                </h2>
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
