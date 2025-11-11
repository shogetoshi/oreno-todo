import { useState } from 'react';
import type { Todo } from '../types/electron';

interface TodoItemProps {
  todo: Todo;
  index: number;
  isDragging: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export const TodoItem = ({ todo, index, isDragging, onToggle, onDelete, onEdit, onStartTimer, onStopTimer, onDragStart, onDragOver, onDrop, onDragEnd }: TodoItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.getText());

  const todoId = todo.getId();
  const todoText = todo.getText();
  const completed = todo.isCompleted();
  const isTimerRunning = todo.isTimerRunning();
  const executionTimeMinutes = todo.getTotalExecutionTimeInMinutes();

  // タイマーボタンのクリックハンドラ
  const handleTimerClick = () => {
    if (isTimerRunning) {
      onStopTimer(todoId);
    } else {
      onStartTimer(todoId);
    }
  };

  // 編集モード開始時に最新のテキストを反映
  const startEditing = () => {
    setEditText(todo.getText());
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todoText) {
      onEdit(todoId, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <li
      className={`todo-item ${completed ? 'completed' : ''}`}
      draggable={true}
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEdit}
          onKeyDown={handleKeyDown}
          className="todo-edit-input"
          autoFocus
        />
      ) : (
        <div className="todo-content">
          <span
            className="todo-text"
            onDoubleClick={() => !completed && startEditing()}
          >
            {todoText}
          </span>
          {executionTimeMinutes > 0 && (
            <span className="execution-time">
              {executionTimeMinutes}分
            </span>
          )}
        </div>
      )}
      <div className="todo-actions">
        <button
          onClick={handleTimerClick}
          className={`timer-button ${isTimerRunning ? 'timer-running' : ''}`}
        >
          {isTimerRunning ? '⏸️' : '▶️'}
        </button>
        <button onClick={() => onToggle(todoId)} className="complete-button">
          ✅
        </button>
        <button onClick={() => onDelete(todoId)} className="delete-button">
          🗑️
        </button>
      </div>
    </li>
  );
};
