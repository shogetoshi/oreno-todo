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
  const [editText, setEditText] = useState(todo.text);

  // 編集モード開始時に最新のテキストを反映
  const startEditing = () => {
    setEditText(todo.text);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (editText.trim() && editText !== todo.text) {
      onEdit(todo.id, editText.trim());
    } else {
      // 変更がない場合や無効な入力の場合は元に戻す
      setEditText(todo.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEdit();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="todo-checkbox"
      />
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
          onDoubleClick={() => !todo.completed && startEditing()}
        >
          {todo.text}
        </span>
      )}
      <div className="todo-actions">
        {!isEditing && !todo.completed && (
          <button onClick={startEditing} className="edit-button">
            編集
          </button>
        )}
        <button onClick={() => onDelete(todo.id)} className="delete-button">
          削除
        </button>
      </div>
    </li>
  );
};
