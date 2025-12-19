import { useState, useEffect, useCallback } from 'react';
import { ListItem } from '../models/ListItem';
import { TodoRepository } from '../models/TodoRepository';
import { useProjectDefinitions } from './useProjectDefinitions';
import { getCurrentJSTTime } from '../utils/timeFormat';

/**
 * Controller Layer: useTodos Hook
 * View層とModel層を仲介し、状態管理とIPC通信を担当する
 * ビジネスロジックはTodoRepositoryに委譲する
 */
export const useTodos = () => {
  const [todos, setTodos] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { projectRepo } = useProjectDefinitions();

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
    setTodosWithPersist((_prev) => newItems);
  }, [setTodosWithPersist]);

  // 指定IDのアイテムをJSON文字列から編集
  const editSingleItemFromJson = useCallback(async (id: string, jsonText: string) => {
    setTodosWithPersist((prev) => TodoRepository.editSingleItemFromJson(prev, id, jsonText));
  }, [setTodosWithPersist]);

  // 指定日付のアイテムをJSON文字列から置き換え
  const replaceItemsForDate = useCallback(async (date: string, jsonText: string) => {
    setTodosWithPersist((prev) => {
      // その日付に表示されるアイテムのIDリストを取得
      const itemsForDate = TodoRepository.filterItemsByDate(prev, date);
      const targetIds = itemsForDate.map(item => item.getId());

      // IDベースで一括更新・追加・削除
      return TodoRepository.replaceItemsById(prev, jsonText, targetIds);
    });
  }, [setTodosWithPersist]);

  // タイマーを開始
  const startTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.startItemTimer(prev, id));
  }, [setTodosWithPersist]);

  // タイマーを停止
  const stopTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.stopItemTimer(prev, id));
  }, [setTodosWithPersist]);

  // 現在進行中のTodoを停止する
  const stopRunningTodo = useCallback(() => {
    setTodosWithPersist((prev) => TodoRepository.stopAllRunningItems(prev));
  }, [setTodosWithPersist]);

  // HTTPサーバー経由の停止リクエストを受信
  useEffect(() => {
    window.electronAPI.onStopRunningTodoRequest(() => {
      stopRunningTodo();
    });
  }, [stopRunningTodo]);

  // Googleカレンダーからイベントを取得してCalendarEventを追加
  const importCalendarEvents = useCallback(async (date?: string) => {
    const result = await window.electronAPI.fetchCalendarEvents(date);
    if (result.success && result.events) {
      setTodosWithPersist((prev) =>
        TodoRepository.addCalendarEventsToItems(prev, result.events!, projectRepo)
      );
    } else {
      console.error('Failed to fetch calendar events:', result.error);
      throw new Error(result.error || 'カレンダーイベントの取得に失敗しました');
    }
  }, [setTodosWithPersist, projectRepo]);

  // クイックタスクを作成して即座に開始する（リストの先頭に追加）
  const addQuickTask = useCallback(() => {
    setTodosWithPersist((prev) => {
      const currentTime = getCurrentJSTTime();
      const newTodo = TodoRepository.createTodo('', currentTime);
      const todoWithTimer = newTodo.startTimer();
      return [todoWithTimer, ...prev];
    });
  }, [setTodosWithPersist]);

  return {
    todos,
    isLoading,
    addTodo,
    addQuickTask,
    toggleTodo,
    deleteTodo,
    editTodo,
    editTaskcode,
    reorderTodos,
    replaceFromJson,
    editSingleItemFromJson,
    replaceItemsForDate,
    startTimer,
    stopTimer,
    importCalendarEvents,
  };
};
