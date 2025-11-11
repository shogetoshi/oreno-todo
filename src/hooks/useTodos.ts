import { useState, useEffect, useCallback } from 'react';
import { Todo } from '../models/Todo';
import { validateTodos } from '../utils/validation';
import { getCurrentJSTTime } from '../utils/timeFormat';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にTODOを読み込む
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const jsonArray = await window.electronAPI.loadTodos();

        // レンダラープロセスでバリデーション
        if (!validateTodos(jsonArray)) {
          console.error('Invalid data format received from main process');
          setTodos([]);
          return;
        }

        const todos = jsonArray.map((json: any) => Todo.fromJSON(json));
        setTodos(todos);
      } catch (error) {
        console.error('Failed to load todos:', error);
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
      const jsonArray = newTodos.map(todo => todo.toJSON());
      window.electronAPI.saveTodos(jsonArray).catch((error) => {
        console.error('Failed to save todos:', error);
        // 保存失敗時はロールバック
        setTodos(prevTodosSnapshot);
      });

      return newTodos;
    });
  }, []);

  // 新しいTODOを追加
  const addTodo = useCallback((text: string) => {
    const id = crypto.randomUUID();
    const now = getCurrentJSTTime();
    const newTodo = new Todo(id, text, null, now, now, { id, text, completedAt: null, createdAt: now, updatedAt: now, timeRanges: [] });
    setTodosWithPersist((prev) => [...prev, newTodo]);
  }, [setTodosWithPersist]);

  // HTTPサーバー経由のTODO追加リクエストを受信
  useEffect(() => {
    window.electronAPI.onAddTodoRequest((text: string) => {
      addTodo(text);
    });
  }, [addTodo]);

  // TODOの完了状態を切り替え
  const toggleTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) =>
      prev.map((todo) =>
        todo.getId() === id ? todo.toggleCompleted() : todo
      )
    );
  }, [setTodosWithPersist]);

  // TODOを削除
  const deleteTodo = useCallback((id: string) => {
    setTodosWithPersist((prev) => prev.filter((todo) => todo.getId() !== id));
  }, [setTodosWithPersist]);

  // TODOのテキストを編集
  const editTodo = useCallback((id: string, newText: string) => {
    setTodosWithPersist((prev) =>
      prev.map((todo) =>
        todo.getId() === id ? todo.setText(newText) : todo
      )
    );
  }, [setTodosWithPersist]);

  // TODOの順序を並び替え
  const reorderTodos = useCallback((newOrder: Todo[]) => {
    setTodosWithPersist(() => newOrder);
  }, [setTodosWithPersist]);

  // JSONテキストからTODOリストを復元
  const replaceFromJson = useCallback(async (jsonText: string) => {
    // JSONのバリデーション
    const parsed = JSON.parse(jsonText);

    if (!validateTodos(parsed)) {
      throw new Error('JSONの形式が正しくありません。各TODOには id, text, completedAt が必要です');
    }

    // Todoオブジェクトに変換
    const newTodos = parsed.map((json: any) => Todo.fromJSON(json));

    // 状態更新と保存
    setTodosWithPersist(() => newTodos);
  }, [setTodosWithPersist]);

  // タイマーを開始
  const startTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) =>
      prev.map((todo) =>
        todo.getId() === id ? todo.startTimer() : todo
      )
    );
  }, [setTodosWithPersist]);

  // タイマーを停止
  const stopTimer = useCallback((id: string) => {
    setTodosWithPersist((prev) =>
      prev.map((todo) =>
        todo.getId() === id ? todo.stopTimer() : todo
      )
    );
  }, [setTodosWithPersist]);

  return {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    reorderTodos,
    replaceFromJson,
    startTimer,
    stopTimer,
  };
};
