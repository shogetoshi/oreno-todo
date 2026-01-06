import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoRepository } from './TodoRepository';
import { Todo } from './Todo';
import { CalendarEvent } from './CalendarEvent';

describe('TodoRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createTodo', () => {
    it('新しいTodoを作成できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');

      expect(todo.getTaskcode()).toBe('TASK-001');
      expect(todo.getText()).toBe('Sample task');
      expect(todo.isCompleted()).toBe(false);
      expect(todo.getCompletedAt()).toBe(null);
    });

    it('作成されたTodoにはUUIDが設定される', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const id = todo.getId();

      // UUID形式（xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('作成されたTodoには現在時刻のタイムスタンプが設定される', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');

      expect(todo.createdAt).toBe('2025-01-15 12:34:56');
      expect(todo.updatedAt).toBe('2025-01-15 12:34:56');
    });

    it('作成されたTodoにはtimeRangesが空配列で初期化される', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const json = todo.toJSON();

      expect(json.timeRanges).toEqual([]);
    });

    it('空文字列のタスクコードでTodoを作成できる', () => {
      const todo = TodoRepository.createTodo('', 'Sample task');

      expect(todo.getTaskcode()).toBe('');
      expect(todo.getText()).toBe('Sample task');
    });

    it('空文字列のテキストでTodoを作成できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', '');

      expect(todo.getTaskcode()).toBe('TASK-001');
      expect(todo.getText()).toBe('');
    });

    it('複数回呼び出すと異なるIDが生成される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');

      expect(todo1.getId()).not.toBe(todo2.getId());
    });
  });

  describe('addTodo', () => {
    it('空の配列にTodoを追加できる', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.addTodo(todos, 'TASK-001', 'First task');

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getTaskcode()).toBe('TASK-001');
      expect(newTodos[0].getText()).toBe('First task');
    });

    it('既存の配列にTodoを追加できる', () => {
      const existingTodo = TodoRepository.createTodo('TASK-001', 'Existing task');
      const todos = [existingTodo];

      const newTodos = TodoRepository.addTodo(todos, 'TASK-002', 'New task');

      expect(newTodos).toHaveLength(2);
      expect(newTodos[0].getTaskcode()).toBe('TASK-002');
      expect(newTodos[1].getTaskcode()).toBe('TASK-001');
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todos = [TodoRepository.createTodo('TASK-001', 'Task 1')];
      const newTodos = TodoRepository.addTodo(todos, 'TASK-002', 'Task 2');

      expect(todos).toHaveLength(1);
      expect(newTodos).toHaveLength(2);
    });

    it('追加されたTodoは配列の先頭に配置される', () => {
      const todos = [
        TodoRepository.createTodo('TASK-001', 'Task 1'),
        TodoRepository.createTodo('TASK-002', 'Task 2')
      ];

      const newTodos = TodoRepository.addTodo(todos, 'TASK-003', 'Task 3');

      expect(newTodos[0].getTaskcode()).toBe('TASK-003');
      expect(newTodos[0].getText()).toBe('Task 3');
    });
  });

  describe('toggleTodo', () => {
    it('指定IDのTodoの完了状態を切り替えられる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.toggleItem(todos, todo.getId());

      expect(newTodos[0].isCompleted()).toBe(true);
    });

    it('完了済みTodoを未完了に切り替えられる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').toggleCompleted();
      const todos = [todo];

      const newTodos = TodoRepository.toggleItem(todos, todo.getId());

      expect(newTodos[0].isCompleted()).toBe(false);
    });

    it('複数Todoのうち指定したもののみが切り替わる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.toggleItem(todos, todo1.getId());

      expect(newTodos[0].isCompleted()).toBe(true);
      expect(newTodos[1].isCompleted()).toBe(false); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.toggleItem(todos, todo.getId());

      expect(todos[0].isCompleted()).toBe(false);
      expect(newTodos[0].isCompleted()).toBe(true);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.toggleItem(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].isCompleted()).toBe(false);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.toggleItem(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });

    it('計測中のTodoを完了にすると、タイマーが停止する', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.toggleItem(todos, todo.getId());

      expect(newTodos[0].isCompleted()).toBe(true);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('完了済みTodoを未完了に戻してもタイマーは開始しない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer().stopTimer().toggleCompleted();
      const todos = [todo];

      const newTodos = TodoRepository.toggleItem(todos, todo.getId());

      expect(newTodos[0].isCompleted()).toBe(false);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });
  });

  describe('deleteTodo', () => {
    it('指定IDのTodoを削除できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.deleteItem(todos, todo.getId());

      expect(newTodos).toHaveLength(0);
    });

    it('複数Todoのうち指定したもののみが削除される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.deleteItem(todos, todo2.getId());

      expect(newTodos).toHaveLength(2);
      expect(newTodos[0].getId()).toBe(todo1.getId());
      expect(newTodos[1].getId()).toBe(todo3.getId());
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.deleteItem(todos, todo.getId());

      expect(todos).toHaveLength(1);
      expect(newTodos).toHaveLength(0);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.deleteItem(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.deleteItem(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });

    it('先頭のTodoを削除できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.deleteItem(todos, todo1.getId());

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getId()).toBe(todo2.getId());
    });

    it('末尾のTodoを削除できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.deleteItem(todos, todo2.getId());

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getId()).toBe(todo1.getId());
    });
  });

  describe('editTodoText', () => {
    it('指定IDのTodoのテキストを編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editItemText(todos, todo.getId(), 'Updated text');

      expect(newTodos[0].getText()).toBe('Updated text');
    });

    it('複数Todoのうち指定したもののみが編集される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.editItemText(todos, todo1.getId(), 'Updated Task 1');

      expect(newTodos[0].getText()).toBe('Updated Task 1');
      expect(newTodos[1].getText()).toBe('Task 2'); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editItemText(todos, todo.getId(), 'Updated text');

      expect(todos[0].getText()).toBe('Original text');
      expect(newTodos[0].getText()).toBe('Updated text');
    });

    it('空文字列に編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editItemText(todos, todo.getId(), '');

      expect(newTodos[0].getText()).toBe('');
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editItemText(todos, 'non-existent-id', 'Updated text');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].getText()).toBe('Original text');
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.editItemText(todos, 'any-id', 'Updated text');

      expect(newTodos).toEqual([]);
    });
  });

  describe('editTodoTaskcode', () => {
    it('指定IDのTodoのタスクコードを編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editItemTaskcode(todos, todo.getId(), 'TASK-999');

      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
    });

    it('複数Todoのうち指定したもののみが編集される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.editItemTaskcode(todos, todo1.getId(), 'TASK-999');

      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
      expect(newTodos[1].getTaskcode()).toBe('TASK-002'); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editItemTaskcode(todos, todo.getId(), 'TASK-999');

      expect(todos[0].getTaskcode()).toBe('TASK-001');
      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
    });

    it('空文字列に編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editItemTaskcode(todos, todo.getId(), '');

      expect(newTodos[0].getTaskcode()).toBe('');
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editItemTaskcode(todos, 'non-existent-id', 'TASK-999');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].getTaskcode()).toBe('TASK-001');
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.editItemTaskcode(todos, 'any-id', 'TASK-999');

      expect(newTodos).toEqual([]);
    });
  });

  describe('reorderTodos', () => {
    it('先頭から末尾へ移動できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.reorderItems(todos, 0, 2);

      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo3.getId());
      expect(newTodos[2].getId()).toBe(todo1.getId());
    });

    it('末尾から先頭へ移動できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.reorderItems(todos, 2, 0);

      expect(newTodos[0].getId()).toBe(todo3.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
      expect(newTodos[2].getId()).toBe(todo2.getId());
    });

    it('中間位置へ移動できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.reorderItems(todos, 0, 1);

      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
      expect(newTodos[2].getId()).toBe(todo3.getId());
    });

    it('同じ位置への移動（変更なし）', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.reorderItems(todos, 0, 0);

      expect(newTodos[0].getId()).toBe(todo1.getId());
      expect(newTodos[1].getId()).toBe(todo2.getId());
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.reorderItems(todos, 0, 1);

      expect(todos[0].getId()).toBe(todo1.getId());
      expect(todos[1].getId()).toBe(todo2.getId());
      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
    });

    it('2要素の配列で順序を入れ替えられる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.reorderItems(todos, 1, 0);

      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
    });

    it('5要素の配列で正しく並び替えられる', () => {
      const todos = Array.from({ length: 5 }, (_, i) =>
        TodoRepository.createTodo(`TASK-${i}`, `Task ${i}`)
      );

      const newTodos = TodoRepository.reorderItems(todos, 1, 3);

      expect(newTodos[0].getTaskcode()).toBe('TASK-0');
      expect(newTodos[1].getTaskcode()).toBe('TASK-2');
      expect(newTodos[2].getTaskcode()).toBe('TASK-3');
      expect(newTodos[3].getTaskcode()).toBe('TASK-1');
      expect(newTodos[4].getTaskcode()).toBe('TASK-4');
    });
  });

  describe('startTimer', () => {
    it('指定IDのTodoのタイマーを開始できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.startItemTimer(todos, todo.getId());

      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('複数Todoのうち指定したもののみがタイマー開始される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.startItemTimer(todos, todo1.getId());

      expect(newTodos[0].isTimerRunning()).toBe(true);
      expect(newTodos[1].isTimerRunning()).toBe(false);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.startItemTimer(todos, todo.getId());

      expect(todos[0].isTimerRunning()).toBe(false);
      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.startItemTimer(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.startItemTimer(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });
  });

  describe('stopTimer', () => {
    it('指定IDのTodoのタイマーを停止できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopItemTimer(todos, todo.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('複数Todoのうち指定したもののみがタイマー停止される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2').startTimer();
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.stopItemTimer(todos, todo1.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false);
      expect(newTodos[1].isTimerRunning()).toBe(true);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopItemTimer(todos, todo.getId());

      expect(todos[0].isTimerRunning()).toBe(true);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('タイマーが動いていないTodoを停止しても影響ない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.stopItemTimer(todos, todo.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopItemTimer(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.stopItemTimer(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });
  });

  describe('startItemTimerExclusive', () => {
    it('他に実行中のアイテムがない場合、正常にタイマーが開始される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.startItemTimerExclusive(todos, todo1.getId());

      expect(newTodos[0].isTimerRunning()).toBe(true);
      expect(newTodos[1].isTimerRunning()).toBe(false);
    });

    it('他に実行中のアイテムがある場合、そのアイテムのタイマーが停止され、指定アイテムのタイマーが開始される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.startItemTimerExclusive(todos, todo2.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false); // 停止された
      expect(newTodos[1].isTimerRunning()).toBe(true);  // 開始された
    });

    it('複数の実行中アイテムがある場合、すべてのアイテムのタイマーが停止される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2').startTimer();
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.startItemTimerExclusive(todos, todo3.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false); // 停止された
      expect(newTodos[1].isTimerRunning()).toBe(false); // 停止された
      expect(newTodos[2].isTimerRunning()).toBe(true);  // 開始された
    });

    it('既に実行中のアイテムを再度開始しても正常に動作する', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo1];

      const newTodos = TodoRepository.startItemTimerExclusive(todos, todo1.getId());

      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.startItemTimerExclusive(todos, todo2.getId());

      expect(todos[0].isTimerRunning()).toBe(true);
      expect(todos[1].isTimerRunning()).toBe(false);
      expect(newTodos[0].isTimerRunning()).toBe(false);
      expect(newTodos[1].isTimerRunning()).toBe(true);
    });

    it('存在しないIDを指定しても他のタイマーは停止される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo1];

      const newTodos = TodoRepository.startItemTimerExclusive(todos, 'non-existent-id');

      // 実行中タイマーは停止される
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.startItemTimerExclusive(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });

    it('CalendarEventとTodoが混在していても正しく動作する', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-002',
        'Meeting',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-20 14:00:00',
        '2025-01-20 15:00:00',
        []
      );
      const items = [todo, calendarEvent];

      const newItems = TodoRepository.startItemTimerExclusive(items, calendarEvent.getId());

      expect(newItems[0].isTimerRunning()).toBe(false); // Todoのタイマーが停止
      expect(newItems[1].isTimerRunning()).toBe(false); // CalendarEventはタイマーを持たない
    });
  });

  describe('fromJsonArray', () => {
    it('JSONデータ配列からTodoリストを生成できる', () => {
      const jsonArray = [
        {
          id: 'id-1',
          taskcode: 'TASK-001',
          text: 'Task 1',
          completedAt: null,
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 10:00:00',
          timeRanges: []
        },
        {
          id: 'id-2',
          taskcode: 'TASK-002',
          text: 'Task 2',
          completedAt: '2025-01-15 11:00:00',
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 11:00:00',
          timeRanges: []
        }
      ];

      const todos = TodoRepository.fromJsonArray(jsonArray);

      expect(todos).toHaveLength(2);
      expect(todos[0].getId()).toBe('id-1');
      expect(todos[0].getTaskcode()).toBe('TASK-001');
      expect(todos[1].getId()).toBe('id-2');
      expect(todos[1].isCompleted()).toBe(true);
    });

    it('空の配列からTodoリストを生成できる', () => {
      const jsonArray: any[] = [];
      const todos = TodoRepository.fromJsonArray(jsonArray);

      expect(todos).toEqual([]);
    });

    it('不正なJSONデータに対してエラーをスローする', () => {
      const invalidJson = [
        {
          id: 'id-1',
          taskcode: 'TASK-001',
          text: 'Valid task',
          completedAt: null
        },
        {
          id: 'id-2',
          // taskcode が欠けている
          text: 'Invalid task',
          completedAt: null
        }
      ];

      expect(() => TodoRepository.fromJsonArray(invalidJson)).toThrow(
        'JSONの形式が正しくありません。各TODOには id, taskcode, text, completedAt が必要です'
      );
    });

    it('配列でないデータに対してエラーをスローする', () => {
      const notArray = {
        id: 'id-1',
        taskcode: 'TASK-001',
        text: 'Task 1',
        completedAt: null
      };

      expect(() => TodoRepository.fromJsonArray(notArray)).toThrow();
    });

    it('nullに対してエラーをスローする', () => {
      expect(() => TodoRepository.fromJsonArray(null)).toThrow();
    });

    it('undefinedに対してエラーをスローする', () => {
      expect(() => TodoRepository.fromJsonArray(undefined)).toThrow();
    });
  });

  describe('toJsonArray', () => {
    it('TodoリストをJSON配列に変換できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const jsonArray = TodoRepository.toJsonArray(todos);

      expect(jsonArray).toHaveLength(2);
      expect(jsonArray[0].id).toBe(todo1.getId());
      expect(jsonArray[0].taskcode).toBe('TASK-001');
      expect(jsonArray[1].taskcode).toBe('TASK-002');
    });

    it('空のTodoリストを空配列に変換できる', () => {
      const todos: Todo[] = [];
      const jsonArray = TodoRepository.toJsonArray(todos);

      expect(jsonArray).toEqual([]);
    });

    it('fromJsonArray -> toJsonArray で元のデータと同じになる', () => {
      const original = [
        {
          id: 'id-1',
          type: 'todo',
          taskcode: 'TASK-001',
          text: 'Task 1',
          completedAt: null,
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 10:00:00',
          timeRanges: []
        },
        {
          id: 'id-2',
          type: 'todo',
          taskcode: 'TASK-002',
          text: 'Task 2',
          completedAt: '2025-01-15 11:00:00',
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 11:00:00',
          timeRanges: [
            { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' }
          ]
        }
      ];

      const todos = TodoRepository.fromJsonArray(original);
      const jsonArray = TodoRepository.toJsonArray(todos);

      expect(jsonArray).toEqual(original);
    });
  });

  describe('fromJsonText', () => {
    it('JSON文字列からTodoリストを復元できる', () => {
      const jsonText = JSON.stringify([
        {
          id: 'id-1',
          taskcode: 'TASK-001',
          text: 'Task 1',
          completedAt: null,
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 10:00:00',
          timeRanges: []
        }
      ]);

      const todos = TodoRepository.fromJsonText(jsonText);

      expect(todos).toHaveLength(1);
      expect(todos[0].getId()).toBe('id-1');
      expect(todos[0].getTaskcode()).toBe('TASK-001');
    });

    it('空の配列のJSON文字列を処理できる', () => {
      const jsonText = '[]';
      const todos = TodoRepository.fromJsonText(jsonText);

      expect(todos).toEqual([]);
    });

    it('不正なJSON文字列に対してエラーをスローする', () => {
      const invalidJson = '{ invalid json }';

      expect(() => TodoRepository.fromJsonText(invalidJson)).toThrow();
    });

    it('JSONパースは成功するが不正な形式の場合エラーをスローする', () => {
      const invalidTodoJson = JSON.stringify([
        {
          id: 'id-1',
          // taskcode が欠けている
          text: 'Invalid task',
          completedAt: null
        }
      ]);

      expect(() => TodoRepository.fromJsonText(invalidTodoJson)).toThrow(
        'JSONの形式が正しくありません。各TODOには id, taskcode, text, completedAt が必要です'
      );
    });

    it('整形されたJSON文字列を処理できる', () => {
      const jsonText = `[
  {
    "id": "id-1",
    "taskcode": "TASK-001",
    "text": "Task 1",
    "completedAt": null,
    "createdAt": "2025-01-15 10:00:00",
    "updatedAt": "2025-01-15 10:00:00",
    "timeRanges": []
  }
]`;

      const todos = TodoRepository.fromJsonText(jsonText);

      expect(todos).toHaveLength(1);
      expect(todos[0].getId()).toBe('id-1');
    });
  });

  describe('toJsonText', () => {
    it('TodoリストをJSON文字列に変換できる（整形あり）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const jsonText = TodoRepository.toJsonText(todos, true);

      expect(jsonText).toContain('"id"');
      expect(jsonText).toContain('"taskcode": "TASK-001"');
      expect(jsonText).toContain('"text": "Task 1"');
      // 整形されているので改行が含まれる
      expect(jsonText).toContain('\n');
    });

    it('TodoリストをJSON文字列に変換できる（整形なし）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const jsonText = TodoRepository.toJsonText(todos, false);

      expect(jsonText).toContain('"taskcode":"TASK-001"');
      // 整形されていないので改行はない
      expect(jsonText).not.toContain('\n  ');
    });

    it('デフォルトで整形される', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const jsonText = TodoRepository.toJsonText(todos);

      // 整形されているので改行が含まれる
      expect(jsonText).toContain('\n');
    });

    it('空のTodoリストを空配列の文字列に変換できる', () => {
      const todos: Todo[] = [];
      const jsonText = TodoRepository.toJsonText(todos, true);

      expect(jsonText).toBe('[]');
    });

    it('fromJsonText -> toJsonText で元の文字列と同じ構造になる', () => {
      const original = [
        {
          id: 'id-1',
          type: 'todo',
          taskcode: 'TASK-001',
          text: 'Task 1',
          completedAt: null,
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 10:00:00',
          timeRanges: []
        }
      ];

      const originalText = JSON.stringify(original, null, 2);
      const todos = TodoRepository.fromJsonText(originalText);
      const jsonText = TodoRepository.toJsonText(todos, true);

      expect(jsonText).toBe(originalText);
    });

    it('複数のTodoを正しくシリアライズできる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const jsonText = TodoRepository.toJsonText(todos, false);
      const parsed = JSON.parse(jsonText);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].taskcode).toBe('TASK-001');
      expect(parsed[1].taskcode).toBe('TASK-002');
    });
  });

  describe('shouldDisplayOnDate', () => {
    describe('通常のTodo - 未完了', () => {
      it('作成日と同じ日付の場合は表示する', () => {
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
        // createdAt = 2025-01-15 12:34:56
        expect(TodoRepository.shouldDisplayOnDate(todo, '2025-01-15')).toBe(true);
      });

      it('作成日より後の日付の場合は表示する', () => {
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
        // createdAt = 2025-01-15 12:34:56
        expect(TodoRepository.shouldDisplayOnDate(todo, '2025-01-16')).toBe(true);
        expect(TodoRepository.shouldDisplayOnDate(todo, '2025-12-31')).toBe(true);
      });

      it('作成日より前の日付の場合は表示しない', () => {
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
        // createdAt = 2025-01-15 12:34:56
        expect(TodoRepository.shouldDisplayOnDate(todo, '2025-01-14')).toBe(false);
        expect(TodoRepository.shouldDisplayOnDate(todo, '2025-01-01')).toBe(false);
        expect(TodoRepository.shouldDisplayOnDate(todo, '2024-12-31')).toBe(false);
      });
    });

    describe('通常のTodo - 完了済み', () => {
      it('作成日と完了日が同じ場合、その日付に表示する', () => {
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1').toggleCompleted();
        // createdAt = completedAt = 2025-01-15 12:34:56
        expect(TodoRepository.shouldDisplayOnDate(todo, '2025-01-15')).toBe(true);
      });

      it('作成日と完了日の間の日付に表示する', () => {
        vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
        // createdAt = 2025-01-15 12:34:56

        vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
        const completedTodo = todo.toggleCompleted();
        // completedAt = 2025-01-20 12:34:56

        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-01-15')).toBe(true);
        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-01-17')).toBe(true);
        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-01-20')).toBe(true);
      });

      it('作成日より前の日付には表示しない', () => {
        vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1');

        vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
        const completedTodo = todo.toggleCompleted();

        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-01-14')).toBe(false);
        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-01-01')).toBe(false);
      });

      it('完了日より後の日付には表示しない', () => {
        vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
        const todo = TodoRepository.createTodo('TASK-001', 'Task 1');

        vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
        const completedTodo = todo.toggleCompleted();

        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-01-21')).toBe(false);
        expect(TodoRepository.shouldDisplayOnDate(completedTodo, '2025-12-31')).toBe(false);
      });
    });

    describe('カレンダーイベント', () => {
      it('startTimeと同じ日付の場合は表示する', () => {
        const calendarEvent = new CalendarEvent(
          'event-1',
          'TASK-001',
          'Meeting',
          null,
          '2025-01-15 10:00:00',
          '2025-01-15 10:00:00',
          '2025-01-20 14:00:00',
          '2025-01-20 15:00:00',
          []
        );

        expect(TodoRepository.shouldDisplayOnDate(calendarEvent, '2025-01-20')).toBe(true);
      });

      it('startTimeと異なる日付の場合は表示しない', () => {
        const calendarEvent = new CalendarEvent(
          'event-1',
          'TASK-001',
          'Meeting',
          null,
          '2025-01-15 10:00:00',
          '2025-01-15 10:00:00',
          '2025-01-20 14:00:00',
          '2025-01-20 15:00:00',
          []
        );

        expect(TodoRepository.shouldDisplayOnDate(calendarEvent, '2025-01-19')).toBe(false);
        expect(TodoRepository.shouldDisplayOnDate(calendarEvent, '2025-01-21')).toBe(false);
      });

      it('startTimeがnullの場合は表示しない', () => {
        const calendarEvent = new CalendarEvent(
          'event-1',
          'TASK-001',
          'Meeting',
          null,
          '2025-01-15 10:00:00',
          '2025-01-15 10:00:00',
          null,
          null,
          []
        );

        expect(TodoRepository.shouldDisplayOnDate(calendarEvent, '2025-01-20')).toBe(false);
      });
    });
  });

  describe('editSingleItemFromJson', () => {
    it('指定IDのTodoをJSON文字列から編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original task');
      const todos = [todo];

      const newJson = JSON.stringify({
        id: todo.getId(),
        type: 'todo',
        taskcode: 'TASK-999',
        text: 'Updated task',
        completedAt: null,
        createdAt: todo.createdAt,
        updatedAt: '2025-01-15 13:00:00',
        timeRanges: []
      });

      const newTodos = TodoRepository.editSingleItemFromJson(todos, todo.getId(), newJson);

      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
      expect(newTodos[0].getText()).toBe('Updated task');
    });

    it('CalendarEventをJSON文字列から編集できる', () => {
      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-001',
        'Original meeting',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-20 14:00:00',
        '2025-01-20 15:00:00',
        []
      );
      const items = [calendarEvent];

      const newJson = JSON.stringify({
        id: 'event-1',
        type: 'calendar_event',
        taskcode: 'TASK-999',
        text: 'Updated meeting',
        completedAt: null,
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 11:00:00',
        startTime: '2025-01-21 14:00:00',
        endTime: '2025-01-21 15:00:00'
      });

      const newItems = TodoRepository.editSingleItemFromJson(items, 'event-1', newJson);

      expect(newItems[0].getText()).toBe('Updated meeting');
      expect(newItems[0].getTaskcode()).toBe('TASK-999');
    });

    it('複数アイテムのうち指定したもののみが編集される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newJson = JSON.stringify({
        id: todo1.getId(),
        type: 'todo',
        taskcode: 'TASK-999',
        text: 'Updated Task 1',
        completedAt: null,
        createdAt: todo1.createdAt,
        updatedAt: '2025-01-15 13:00:00',
        timeRanges: []
      });

      const newTodos = TodoRepository.editSingleItemFromJson(todos, todo1.getId(), newJson);

      expect(newTodos[0].getText()).toBe('Updated Task 1');
      expect(newTodos[1].getText()).toBe('Task 2'); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original task');
      const todos = [todo];

      const newJson = JSON.stringify({
        id: todo.getId(),
        type: 'todo',
        taskcode: 'TASK-999',
        text: 'Updated task',
        completedAt: null,
        createdAt: todo.createdAt,
        updatedAt: '2025-01-15 13:00:00',
        timeRanges: []
      });

      const newTodos = TodoRepository.editSingleItemFromJson(todos, todo.getId(), newJson);

      expect(todos[0].getText()).toBe('Original task');
      expect(newTodos[0].getText()).toBe('Updated task');
    });

    it('JSONのIDが指定IDと一致しない場合はエラーをスローする', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task');
      const todos = [todo];

      const newJson = JSON.stringify({
        id: 'different-id',
        type: 'todo',
        taskcode: 'TASK-999',
        text: 'Updated task',
        completedAt: null,
        createdAt: todo.createdAt,
        updatedAt: '2025-01-15 13:00:00',
        timeRanges: []
      });

      expect(() => TodoRepository.editSingleItemFromJson(todos, todo.getId(), newJson)).toThrow(
        /IDが一致しません/
      );
    });

    it('不正なJSON文字列に対してエラーをスローする', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task');
      const todos = [todo];

      const invalidJson = '{ invalid json }';

      expect(() => TodoRepository.editSingleItemFromJson(todos, todo.getId(), invalidJson)).toThrow();
    });

    it('存在しないIDを指定しても他のアイテムは変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task');
      const todos = [todo];

      const newJson = JSON.stringify({
        id: 'non-existent-id',
        type: 'todo',
        taskcode: 'TASK-999',
        text: 'Updated task',
        completedAt: null,
        createdAt: todo.createdAt,
        updatedAt: '2025-01-15 13:00:00',
        timeRanges: []
      });

      const newTodos = TodoRepository.editSingleItemFromJson(todos, 'non-existent-id', newJson);

      expect(newTodos[0].getText()).toBe('Task'); // 変わらない
    });
  });

  describe('findRunningItem', () => {
    it('タイマー実行中のTodoを正しく検出できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2').startTimer();
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const runningItem = TodoRepository.findRunningItem(todos);

      expect(runningItem).not.toBeNull();
      expect(runningItem?.getId()).toBe(todo2.getId());
      expect(runningItem?.isTimerRunning()).toBe(true);
    });

    it('タイマー実行中のTodoがない場合nullを返す', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const runningItem = TodoRepository.findRunningItem(todos);

      expect(runningItem).toBeNull();
    });

    it('空の配列の場合nullを返す', () => {
      const todos: Todo[] = [];
      const runningItem = TodoRepository.findRunningItem(todos);

      expect(runningItem).toBeNull();
    });

    it('複数のタイマー実行中のTodoがある場合、最初のものを返す', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2').startTimer();
      const todos = [todo1, todo2];

      const runningItem = TodoRepository.findRunningItem(todos);

      expect(runningItem).not.toBeNull();
      expect(runningItem?.getId()).toBe(todo1.getId());
    });

    it('TodoとCalendarEventが混在している場合、Todoのタイマーを検出できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-002',
        'Meeting',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-20 14:00:00',
        '2025-01-20 15:00:00',
        []
      );
      const items = [calendarEvent, todo];

      const runningItem = TodoRepository.findRunningItem(items);

      expect(runningItem).not.toBeNull();
      expect(runningItem?.getId()).toBe(todo.getId());
    });
  });

  describe('stopAllRunningItems', () => {
    it('すべての実行中タイマーを停止できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3').startTimer();
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.stopAllRunningItems(todos);

      expect(newTodos[0].isTimerRunning()).toBe(false);
      expect(newTodos[1].isTimerRunning()).toBe(false);
      expect(newTodos[2].isTimerRunning()).toBe(false);
    });

    it('実行中タイマーがない場合は変更しない', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.stopAllRunningItems(todos);

      expect(newTodos[0].isTimerRunning()).toBe(false);
      expect(newTodos[1].isTimerRunning()).toBe(false);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.stopAllRunningItems(todos);

      expect(newTodos).toEqual([]);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopAllRunningItems(todos);

      expect(todos[0].isTimerRunning()).toBe(true);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('CalendarEventとTodoが混在していても正しく動作する', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-002',
        'Meeting',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-20 14:00:00',
        '2025-01-20 15:00:00',
        []
      );
      const items = [todo, calendarEvent];

      const newItems = TodoRepository.stopAllRunningItems(items);

      expect(newItems[0].isTimerRunning()).toBe(false);
      expect(newItems[1].isTimerRunning()).toBe(false); // CalendarEventは元々false
    });
  });

  describe('filterItemsByDate', () => {
    it('指定日に表示すべきアイテムのみをフィルタリングする', () => {
      // 2025-01-15に作成された未完了Todo
      vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');

      // 2025-01-20に作成された未完了Todo
      vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');

      const todos = [todo1, todo2];

      // 2025-01-15: todo1のみ表示（todo2は未作成）
      const filtered15 = TodoRepository.filterItemsByDate(todos, '2025-01-15');
      expect(filtered15).toHaveLength(1);
      expect(filtered15[0].getId()).toBe(todo1.getId());

      // 2025-01-20: 両方表示
      const filtered20 = TodoRepository.filterItemsByDate(todos, '2025-01-20');
      expect(filtered20).toHaveLength(2);

      // 2025-01-10: どちらも表示しない（両方とも未作成）
      const filtered10 = TodoRepository.filterItemsByDate(todos, '2025-01-10');
      expect(filtered10).toHaveLength(0);
    });

    it('完了済みTodoは作成日から完了日までの範囲でフィルタリングされる', () => {
      vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');

      vi.setSystemTime(new Date('2025-01-20T03:34:56.000Z')); // JST: 2025-01-20 12:34:56
      const completedTodo = todo.toggleCompleted();

      const todos = [completedTodo];

      // 2025-01-14: 表示しない（作成前）
      expect(TodoRepository.filterItemsByDate(todos, '2025-01-14')).toHaveLength(0);

      // 2025-01-15: 表示する（作成日）
      expect(TodoRepository.filterItemsByDate(todos, '2025-01-15')).toHaveLength(1);

      // 2025-01-17: 表示する（作成日と完了日の間）
      expect(TodoRepository.filterItemsByDate(todos, '2025-01-17')).toHaveLength(1);

      // 2025-01-20: 表示する（完了日）
      expect(TodoRepository.filterItemsByDate(todos, '2025-01-20')).toHaveLength(1);

      // 2025-01-21: 表示しない（完了後）
      expect(TodoRepository.filterItemsByDate(todos, '2025-01-21')).toHaveLength(0);
    });

    it('空の配列に対して空の配列を返す', () => {
      const todos: Todo[] = [];
      const filtered = TodoRepository.filterItemsByDate(todos, '2025-11-24');

      expect(filtered).toEqual([]);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo1];

      const filtered = TodoRepository.filterItemsByDate(todos, '2025-01-15');

      expect(filtered).not.toBe(todos); // 参照が異なることを確認
    });
  });

});
