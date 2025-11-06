import { useState } from 'react';
import type { Todo } from '../types/electron';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}

export const TodoItem = ({ todo, onToggle, onDelete, onEdit }: TodoItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.getText());

  const todoId = todo.getId();
  const todoText = todo.getText();
  const completed = todo.isCompleted();

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
    <li className={`todo-item ${completed ? 'completed' : ''}`}>
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
        <span
          className="todo-text"
          onDoubleClick={() => !completed && startEditing()}
        >
          {todoText}
        </span>
      )}
      <div className="todo-actions">
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
