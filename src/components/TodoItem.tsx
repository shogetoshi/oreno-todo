import { useState } from 'react';
import type { ListItem } from '../models/ListItem';

/**
 * View Layer: TodoItem Component
 * 個別のアイテム（TodoまたはCalendarEvent）の表示と編集UIを提供
 * 編集中のローカル状態のみを管理
 */
interface TodoItemProps {
  todo: ListItem;
  index: number;
  isDragging: boolean;
  currentDate: string; // YYYY-MM-DD形式
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onEditTaskcode: (id: string, newTaskcode: string) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: (id: string) => void;
  onOpenJsonEditor: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export const TodoItem = ({ todo, index, isDragging, currentDate, onToggle, onDelete, onEdit, onEditTaskcode, onStartTimer, onStopTimer, onOpenJsonEditor, onDragStart, onDragOver, onDrop, onDragEnd }: TodoItemProps) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingTaskcode, setIsEditingTaskcode] = useState(false);
  const [editText, setEditText] = useState(todo.getText());
  const [editTaskcode, setEditTaskcode] = useState(todo.getTaskcode());

  const todoId = todo.getId();
  const todoTaskcode = todo.getTaskcode();
  const todoText = todo.getText();
  const completed = todo.isCompleted();
  const isTimerRunning = todo.isTimerRunning();
  const executionTimeForDate = todo.getExecutionTimeForDate(currentDate);
  const totalExecutionTime = todo.getTotalExecutionTimeInMinutes();

  // タイマーボタンのクリックハンドラ
  const handleTimerClick = () => {
    if (isTimerRunning) {
      onStopTimer(todoId);
    } else {
      onStartTimer(todoId);
    }
  };

  // テキスト編集モード開始時に最新のテキストを反映
  const startEditingText = () => {
    setEditText(todo.getText());
    setIsEditingText(true);
  };

  const cancelEditText = () => {
    setIsEditingText(false);
  };

  const handleEditText = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todoText) {
      onEdit(todoId, trimmed);
    }
    setIsEditingText(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditText();
    } else if (e.key === 'Escape') {
      cancelEditText();
    }
  };

  // タスクコード編集モード開始時に最新のタスクコードを反映
  const startEditingTaskcode = () => {
    setEditTaskcode(todo.getTaskcode());
    setIsEditingTaskcode(true);
  };

  const cancelEditTaskcode = () => {
    setIsEditingTaskcode(false);
  };

  const handleEditTaskcode = () => {
    if (editTaskcode !== todoTaskcode) {
      onEditTaskcode(todoId, editTaskcode);
    }
    setIsEditingTaskcode(false);
  };

  const handleTaskcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditTaskcode();
    } else if (e.key === 'Escape') {
      cancelEditTaskcode();
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
      onDoubleClick={() => onOpenJsonEditor(todoId)}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="todo-content">
        {isEditingTaskcode ? (
          <input
            type="text"
            value={editTaskcode}
            onChange={(e) => setEditTaskcode(e.target.value)}
            onBlur={handleEditTaskcode}
            onKeyDown={handleTaskcodeKeyDown}
            className="todo-edit-input taskcode-edit"
            autoFocus
          />
        ) : (
          <span
            className="todo-taskcode"
            onDoubleClick={() => !completed && startEditingTaskcode()}
          >
            {todoTaskcode}
          </span>
        )}
        {isEditingText ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditText}
            onKeyDown={handleTextKeyDown}
            className="todo-edit-input text-edit"
            autoFocus
          />
        ) : (
          <span
            className="todo-text"
            onDoubleClick={() => !completed && startEditingText()}
          >
            {todoText}
          </span>
        )}
        <span className="execution-time">
          {executionTimeForDate}/{totalExecutionTime}
        </span>
      </div>
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
