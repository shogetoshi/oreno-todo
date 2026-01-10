import { useState } from 'react';
import type { ListItem } from '../models/ListItem';
import { ListItemType } from '../models/ListItem';
import { ProjectDefinitionRepository } from '../models/ProjectDefinition';
import { assignColorToItem, colorToRgba } from '../utils/taskExecutionTime';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * アイテムの状態に応じた視覚スタイルを計算する
 * @param todo ListItem（TodoまたはCalendarEvent）
 * @param projectColor プロジェクト色
 * @param isDragging ドラッグ中かどうか
 * @returns CSSスタイルオブジェクト
 */
function getItemVisualStyle(
  todo: ListItem,
  projectColor: string,
  isDragging: boolean
): React.CSSProperties {
  const isRunning = todo.isTimerRunning();
  const isCompleted = todo.isCompleted();

  // タイマー実行中の強調スタイル
  if (isRunning) {
    return {
      borderLeft: `30px solid ${projectColor}`,
      backgroundColor: colorToRgba(projectColor, 0.7),
      opacity: isDragging ? 0.5 : 1,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    };
  }

  // 完了済みの控えめなスタイル
  if (isCompleted) {
    return {
      borderLeft: `15px solid ${projectColor}`,
      backgroundColor: colorToRgba(projectColor, 0.3),
      opacity: isDragging ? 0.5 : 0.6,
    };
  }

  // デフォルトスタイル
  return {
    borderLeft: `20px solid ${projectColor}`,
    backgroundColor: colorToRgba(projectColor, 0.5),
    opacity: isDragging ? 0.5 : 1,
  };
}

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
  projectRepo: ProjectDefinitionRepository; // プロジェクト定義リポジトリ（色付け用）
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onEditTaskcode: (id: string, newTaskcode: string) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: (id: string) => void;
  onStartCalendarEvent: (id: string) => void;
  onOpenJsonEditor: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export const TodoItem = ({ todo, index, isDragging, currentDate, projectRepo, onToggle, onDelete, onEdit, onEditTaskcode, onStartTimer, onStopTimer, onStartCalendarEvent, onOpenJsonEditor, onDragStart, onDragOver, onDrop, onDragEnd }: TodoItemProps) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingTaskcode, setIsEditingTaskcode] = useState(false);
  const [editText, setEditText] = useState(todo.getText());
  const [editTaskcode, setEditTaskcode] = useState(todo.getTaskcode());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const todoId = todo.getId();
  const todoTaskcode = todo.getTaskcode();
  const todoText = todo.getText();
  const completed = todo.isCompleted();
  const isTimerRunning = todo.isTimerRunning();
  // 秒を分に変換して表示
  const executionTimeForDateMinutes = Math.floor(todo.getExecutionTimeForDate(currentDate) / 60);
  const totalExecutionTimeMinutes = Math.floor(todo.getTotalExecutionTimeInSeconds() / 60);

  // プロジェクト定義からtaskcodeに対応する色を取得（該当なしの場合は灰色）
  const projectColor = assignColorToItem(todo, currentDate, projectRepo);

  // タイマーボタンのクリックハンドラ
  const handleTimerClick = () => {
    if (todo.getType() === ListItemType.CALENDAR_EVENT) {
      onStartCalendarEvent(todoId);
    } else {
      if (isTimerRunning) {
        onStopTimer(todoId);
      } else {
        onStartTimer(todoId);
      }
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

  // 削除ボタンクリック時の処理
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  // 削除確認時の処理
  const handleConfirmDelete = () => {
    onDelete(todoId);
    setIsDeleteDialogOpen(false);
  };

  // 削除キャンセル時の処理
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  // アイテムの状態に応じたクラス名を動的生成
  const itemClassName = [
    'todo-item',
    completed && 'completed',
    isTimerRunning && 'timer-running',
    todo.getType() === ListItemType.CALENDAR_EVENT && 'calendar-event',
  ].filter(Boolean).join(' ');

  return (
    <li
      className={itemClassName}
      draggable={true}
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      onDoubleClick={() => onOpenJsonEditor(todoId)}
      style={getItemVisualStyle(todo, projectColor, isDragging)}
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
          {executionTimeForDateMinutes}/{totalExecutionTimeMinutes}
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
        <button onClick={handleDeleteClick} className="delete-button">
          🗑️
        </button>
      </div>
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="削除の確認"
        message={`「${todoText}」を削除してもよろしいですか?`}
        confirmButtonText="削除"
        cancelButtonText="キャンセル"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </li>
  );
};
