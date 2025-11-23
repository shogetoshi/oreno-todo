import { useState, useEffect, useCallback } from 'react';
import { ListItem } from '../models/ListItem';
import { TodoRepository } from '../models/TodoRepository';
import { fetchCalendarEventsSample } from '../utils/calendarSample';

/**
 * Controller Layer: useTodos Hook
 * View層とModel層を仲介し、状態管理とIPC通信を担当する
 * ビジネスロジックはTodoRepositoryに委譲する
 */
export const useTodos = () => {
  const [todos, setTodos] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にTODO/CalendarEventを読み込む
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const jsonArray = await window.electronAPI.loadTodos();
        const todos = TodoRepository.fromJsonArrayToItems(jsonArray);
        setTodos(todos);
      } catch (error) {
        console.error('Failed to load todos:', error);
        setTodos([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, []);

  // 状態更新と永続化を統合した単一のエントリーポイント
  const setTodosWithPersist = useCallback(async (updater: (prev: ListItem[]) => ListItem[]) => {
    setTodos((prevTodos) => {
      const newTodos = updater(prevTodos);
      const prevTodosSnapshot = prevTodos;

      // 楽観的更新: 先にUIを更新してから非同期で保存
      const jsonArray = TodoRepository.itemsToJsonArray(newTodos);
      window.electronAPI.saveTodos(jsonArray).catch((error) => {
        console.error('Failed to save todos:', error);
        // 保存失敗時はロールバック
        setTodos(prevTodosSnapshot);
      });

      return newTodos;
    });
  }, []);

  // 新しいTODOを追加
  const addTodo = useCallback((taskcode: string, text: string) => {
    setTodosWithPersist((prev) => [...prev, TodoRepository.createTodo(taskcode, text)]);
  }, [setTodosWithPersist]);

  // HTTPサーバー経由のTODO追加リクエストを受信
  useEffect(() => {
    window.electronAPI.onAddTodoRequest((taskcode: string, text: string) => {
      addTodo(taskcode, text);
    });
  }, [addTodo]);

  // アイテムの完了状態を切り替え
  const toggleTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.toggleItem(prev, id));
  }, [setTodosWithPersist]);

  // アイテムを削除
  const deleteTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.deleteItem(prev, id));
  }, [setTodosWithPersist]);

  // アイテムのテキストを編集
  const editTodo = useCallback((id: string, newText: string) => {
    setTodosWithPersist((prev) => TodoRepository.editItemText(prev, id, newText));
  }, [setTodosWithPersist]);

  // アイテムのタスクコードを編集
  const editTaskcode = useCallback((id: string, newTaskcode: string) => {
    setTodosWithPersist((prev) => TodoRepository.editItemTaskcode(prev, id, newTaskcode));
  }, [setTodosWithPersist]);

  // アイテムの順序を並び替え
  const reorderTodos = useCallback((fromIndex: number, toIndex: number) => {
    setTodosWithPersist((prev) => TodoRepository.reorderItems(prev, fromIndex, toIndex));
  }, [setTodosWithPersist]);

  // JSONテキストからアイテムリストを復元
  const replaceFromJson = useCallback(async (jsonText: string) => {
    const jsonArray = JSON.parse(jsonText);
    const newItems = TodoRepository.fromJsonArrayToItems(jsonArray);
    setTodosWithPersist(() => newItems);
  }, [setTodosWithPersist]);

  // タイマーを開始
  const startTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.startItemTimer(prev, id));
  }, [setTodosWithPersist]);

  // タイマーを停止
  const stopTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.stopItemTimer(prev, id));
  }, [setTodosWithPersist]);

  // Googleカレンダーからイベントを取得してCalendarEventを追加
  const importCalendarEvents = useCallback(() => {
    const events = fetchCalendarEventsSample();
    setTodosWithPersist((prev) => TodoRepository.addCalendarEventsToItems(prev, events));
  }, [setTodosWithPersist]);

  return {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    editTaskcode,
    reorderTodos,
    replaceFromJson,
    startTimer,
    stopTimer,
    importCalendarEvents,
  };
};
