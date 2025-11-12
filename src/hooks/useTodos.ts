import { useState, useEffect, useCallback } from 'react';
import { Todo } from '../models/Todo';
import { TodoRepository } from '../models/TodoRepository';

/**
 * Controller Layer: useTodos Hook
 * View層とModel層を仲介し、状態管理とIPC通信を担当する
 * ビジネスロジックはTodoRepositoryに委譲する
 */
export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にTODOを読み込む
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const jsonArray = await window.electronAPI.loadTodos();
        const todos = TodoRepository.fromJsonArray(jsonArray);
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
  const setTodosWithPersist = useCallback(async (updater: (prev: Todo[]) => Todo[]) => {
    setTodos((prevTodos) => {
      const newTodos = updater(prevTodos);
      const prevTodosSnapshot = prevTodos;

      // 楽観的更新: 先にUIを更新してから非同期で保存
      const jsonArray = TodoRepository.toJsonArray(newTodos);
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
    setTodosWithPersist((prev) => TodoRepository.addTodo(prev, taskcode, text));
  }, [setTodosWithPersist]);

  // HTTPサーバー経由のTODO追加リクエストを受信
  useEffect(() => {
    window.electronAPI.onAddTodoRequest((taskcode: string, text: string) => {
      addTodo(taskcode, text);
    });
  }, [addTodo]);

  // TODOの完了状態を切り替え
  const toggleTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.toggleTodo(prev, id));
  }, [setTodosWithPersist]);

  // TODOを削除
  const deleteTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.deleteTodo(prev, id));
  }, [setTodosWithPersist]);

  // TODOのテキストを編集
  const editTodo = useCallback((id: string, newText: string) => {
    setTodosWithPersist((prev) => TodoRepository.editTodoText(prev, id, newText));
  }, [setTodosWithPersist]);

  // TODOのタスクコードを編集
  const editTaskcode = useCallback((id: string, newTaskcode: string) => {
    setTodosWithPersist((prev) => TodoRepository.editTodoTaskcode(prev, id, newTaskcode));
  }, [setTodosWithPersist]);

  // TODOの順序を並び替え
  const reorderTodos = useCallback((fromIndex: number, toIndex: number) => {
    setTodosWithPersist((prev) => TodoRepository.reorderTodos(prev, fromIndex, toIndex));
  }, [setTodosWithPersist]);

  // JSONテキストからTODOリストを復元
  const replaceFromJson = useCallback(async (jsonText: string) => {
    const newTodos = TodoRepository.fromJsonText(jsonText);
    setTodosWithPersist(() => newTodos);
  }, [setTodosWithPersist]);

  // タイマーを開始
  const startTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.startTimer(prev, id));
  }, [setTodosWithPersist]);

  // タイマーを停止
  const stopTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) => TodoRepository.stopTimer(prev, id));
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
  };
};
