import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoRepository } from './TodoRepository';
import { Todo } from './Todo';
import { CalendarEvent } from '../types/calendar';

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
      expect(newTodos[0].getTaskcode()).toBe('TASK-001');
      expect(newTodos[1].getTaskcode()).toBe('TASK-002');
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todos = [TodoRepository.createTodo('TASK-001', 'Task 1')];
      const newTodos = TodoRepository.addTodo(todos, 'TASK-002', 'Task 2');

      expect(todos).toHaveLength(1);
      expect(newTodos).toHaveLength(2);
    });

    it('追加されたTodoは配列の末尾に配置される', () => {
      const todos = [
        TodoRepository.createTodo('TASK-001', 'Task 1'),
        TodoRepository.createTodo('TASK-002', 'Task 2')
      ];

      const newTodos = TodoRepository.addTodo(todos, 'TASK-003', 'Task 3');

      expect(newTodos[2].getTaskcode()).toBe('TASK-003');
      expect(newTodos[2].getText()).toBe('Task 3');
    });
  });

  describe('toggleTodo', () => {
    it('指定IDのTodoの完了状態を切り替えられる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.toggleTodo(todos, todo.getId());

      expect(newTodos[0].isCompleted()).toBe(true);
    });

    it('完了済みTodoを未完了に切り替えられる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').toggleCompleted();
      const todos = [todo];

      const newTodos = TodoRepository.toggleTodo(todos, todo.getId());

      expect(newTodos[0].isCompleted()).toBe(false);
    });

    it('複数Todoのうち指定したもののみが切り替わる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.toggleTodo(todos, todo1.getId());

      expect(newTodos[0].isCompleted()).toBe(true);
      expect(newTodos[1].isCompleted()).toBe(false); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.toggleTodo(todos, todo.getId());

      expect(todos[0].isCompleted()).toBe(false);
      expect(newTodos[0].isCompleted()).toBe(true);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.toggleTodo(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].isCompleted()).toBe(false);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.toggleTodo(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });
  });

  describe('deleteTodo', () => {
    it('指定IDのTodoを削除できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.deleteTodo(todos, todo.getId());

      expect(newTodos).toHaveLength(0);
    });

    it('複数Todoのうち指定したもののみが削除される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.deleteTodo(todos, todo2.getId());

      expect(newTodos).toHaveLength(2);
      expect(newTodos[0].getId()).toBe(todo1.getId());
      expect(newTodos[1].getId()).toBe(todo3.getId());
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.deleteTodo(todos, todo.getId());

      expect(todos).toHaveLength(1);
      expect(newTodos).toHaveLength(0);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.deleteTodo(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.deleteTodo(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });

    it('先頭のTodoを削除できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.deleteTodo(todos, todo1.getId());

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getId()).toBe(todo2.getId());
    });

    it('末尾のTodoを削除できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.deleteTodo(todos, todo2.getId());

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getId()).toBe(todo1.getId());
    });
  });

  describe('editTodoText', () => {
    it('指定IDのTodoのテキストを編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoText(todos, todo.getId(), 'Updated text');

      expect(newTodos[0].getText()).toBe('Updated text');
    });

    it('複数Todoのうち指定したもののみが編集される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.editTodoText(todos, todo1.getId(), 'Updated Task 1');

      expect(newTodos[0].getText()).toBe('Updated Task 1');
      expect(newTodos[1].getText()).toBe('Task 2'); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoText(todos, todo.getId(), 'Updated text');

      expect(todos[0].getText()).toBe('Original text');
      expect(newTodos[0].getText()).toBe('Updated text');
    });

    it('空文字列に編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoText(todos, todo.getId(), '');

      expect(newTodos[0].getText()).toBe('');
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Original text');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoText(todos, 'non-existent-id', 'Updated text');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].getText()).toBe('Original text');
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.editTodoText(todos, 'any-id', 'Updated text');

      expect(newTodos).toEqual([]);
    });
  });

  describe('editTodoTaskcode', () => {
    it('指定IDのTodoのタスクコードを編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoTaskcode(todos, todo.getId(), 'TASK-999');

      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
    });

    it('複数Todoのうち指定したもののみが編集される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.editTodoTaskcode(todos, todo1.getId(), 'TASK-999');

      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
      expect(newTodos[1].getTaskcode()).toBe('TASK-002'); // 変わらない
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoTaskcode(todos, todo.getId(), 'TASK-999');

      expect(todos[0].getTaskcode()).toBe('TASK-001');
      expect(newTodos[0].getTaskcode()).toBe('TASK-999');
    });

    it('空文字列に編集できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoTaskcode(todos, todo.getId(), '');

      expect(newTodos[0].getTaskcode()).toBe('');
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Sample task');
      const todos = [todo];

      const newTodos = TodoRepository.editTodoTaskcode(todos, 'non-existent-id', 'TASK-999');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].getTaskcode()).toBe('TASK-001');
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.editTodoTaskcode(todos, 'any-id', 'TASK-999');

      expect(newTodos).toEqual([]);
    });
  });

  describe('reorderTodos', () => {
    it('先頭から末尾へ移動できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.reorderTodos(todos, 0, 2);

      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo3.getId());
      expect(newTodos[2].getId()).toBe(todo1.getId());
    });

    it('末尾から先頭へ移動できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.reorderTodos(todos, 2, 0);

      expect(newTodos[0].getId()).toBe(todo3.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
      expect(newTodos[2].getId()).toBe(todo2.getId());
    });

    it('中間位置へ移動できる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todo3 = TodoRepository.createTodo('TASK-003', 'Task 3');
      const todos = [todo1, todo2, todo3];

      const newTodos = TodoRepository.reorderTodos(todos, 0, 1);

      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
      expect(newTodos[2].getId()).toBe(todo3.getId());
    });

    it('同じ位置への移動（変更なし）', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.reorderTodos(todos, 0, 0);

      expect(newTodos[0].getId()).toBe(todo1.getId());
      expect(newTodos[1].getId()).toBe(todo2.getId());
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.reorderTodos(todos, 0, 1);

      expect(todos[0].getId()).toBe(todo1.getId());
      expect(todos[1].getId()).toBe(todo2.getId());
      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
    });

    it('2要素の配列で順序を入れ替えられる', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.reorderTodos(todos, 1, 0);

      expect(newTodos[0].getId()).toBe(todo2.getId());
      expect(newTodos[1].getId()).toBe(todo1.getId());
    });

    it('5要素の配列で正しく並び替えられる', () => {
      const todos = Array.from({ length: 5 }, (_, i) =>
        TodoRepository.createTodo(`TASK-${i}`, `Task ${i}`)
      );

      const newTodos = TodoRepository.reorderTodos(todos, 1, 3);

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

      const newTodos = TodoRepository.startTimer(todos, todo.getId());

      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('複数Todoのうち指定したもののみがタイマー開始される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2');
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.startTimer(todos, todo1.getId());

      expect(newTodos[0].isTimerRunning()).toBe(true);
      expect(newTodos[1].isTimerRunning()).toBe(false);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.startTimer(todos, todo.getId());

      expect(todos[0].isTimerRunning()).toBe(false);
      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.startTimer(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.startTimer(todos, 'any-id');

      expect(newTodos).toEqual([]);
    });
  });

  describe('stopTimer', () => {
    it('指定IDのTodoのタイマーを停止できる', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopTimer(todos, todo.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('複数Todoのうち指定したもののみがタイマー停止される', () => {
      const todo1 = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todo2 = TodoRepository.createTodo('TASK-002', 'Task 2').startTimer();
      const todos = [todo1, todo2];

      const newTodos = TodoRepository.stopTimer(todos, todo1.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false);
      expect(newTodos[1].isTimerRunning()).toBe(true);
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopTimer(todos, todo.getId());

      expect(todos[0].isTimerRunning()).toBe(true);
      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('タイマーが動いていないTodoを停止しても影響ない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1');
      const todos = [todo];

      const newTodos = TodoRepository.stopTimer(todos, todo.getId());

      expect(newTodos[0].isTimerRunning()).toBe(false);
    });

    it('存在しないIDを指定しても配列は変更されない', () => {
      const todo = TodoRepository.createTodo('TASK-001', 'Task 1').startTimer();
      const todos = [todo];

      const newTodos = TodoRepository.stopTimer(todos, 'non-existent-id');

      expect(newTodos).toEqual(todos);
      expect(newTodos[0].isTimerRunning()).toBe(true);
    });

    it('空の配列に対して実行してもエラーにならない', () => {
      const todos: Todo[] = [];
      const newTodos = TodoRepository.stopTimer(todos, 'any-id');

      expect(newTodos).toEqual([]);
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

  describe('createTodoFromCalendarEvent', () => {
    it('カレンダーイベントからTodoを生成できる', () => {
      const event: CalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: '週次定例ミーティング',
        description: 'プロジェクトAの進捗確認',
        location: 'オンライン (Zoom)',
        creator: {
          email: 'user@example.com',
          self: true
        },
        organizer: {
          email: 'user@example.com',
          self: true
        },
        start: {
          dateTime: '2023-11-01T10:00:00+09:00',
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: '2023-11-01T11:00:00+09:00',
          timeZone: 'Asia/Tokyo'
        },
        iCalUID: '12345abcde67890fghij12345@google.com',
        sequence: 0,
        eventType: 'default'
      };

      const todo = TodoRepository.createTodoFromCalendarEvent(event);

      expect(todo.getTaskcode()).toBe('');
      expect(todo.getText()).toBe('週次定例ミーティング');
      expect(todo.isCompleted()).toBe(false);
      expect(todo.getCompletedAt()).toBe(null);
      expect(todo.createdAt).toBe('2023-10-20T09:00:00.000Z');
      expect(todo.updatedAt).toBe('2023-10-20T09:30:00.000Z');
    });

    it('終日イベントからTodoを生成できる', () => {
      const event: CalendarEvent = {
        kind: 'calendar#event',
        etag: '"3987654321098765"',
        id: '98765zyxwv43210utsrq98765',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=yyyyyyy',
        created: '2023-10-21T15:00:00.000Z',
        updated: '2023-10-21T15:00:00.000Z',
        summary: '誕生日（終日イベントの例）',
        creator: {
          email: 'user@example.com',
          self: true
        },
        organizer: {
          email: 'user@example.com',
          self: true
        },
        start: {
          date: '2023-11-05'
        },
        end: {
          date: '2023-11-06'
        },
        transparency: 'transparent',
        iCalUID: '98765zyxwv43210utsrq98765@google.com',
        sequence: 0,
        reminders: {
          useDefault: true
        },
        eventType: 'default'
      };

      const todo = TodoRepository.createTodoFromCalendarEvent(event);

      expect(todo.getTaskcode()).toBe('');
      expect(todo.getText()).toBe('誕生日（終日イベントの例）');
      expect(todo.isCompleted()).toBe(false);
      expect(todo.getCompletedAt()).toBe(null);
    });

    it('生成されたTodoにはUUIDが設定される', () => {
      const event: CalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: 'テストイベント',
        creator: {
          email: 'user@example.com'
        },
        organizer: {
          email: 'user@example.com'
        },
        start: {
          dateTime: '2023-11-01T10:00:00+09:00'
        },
        end: {
          dateTime: '2023-11-01T11:00:00+09:00'
        },
        iCalUID: '12345abcde67890fghij12345@google.com',
        sequence: 0,
        eventType: 'default'
      };

      const todo = TodoRepository.createTodoFromCalendarEvent(event);
      const id = todo.getId();

      // UUID形式
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('生成されたTodoにはtimeRangesが空配列で初期化される', () => {
      const event: CalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: 'テストイベント',
        creator: {
          email: 'user@example.com'
        },
        organizer: {
          email: 'user@example.com'
        },
        start: {
          dateTime: '2023-11-01T10:00:00+09:00'
        },
        end: {
          dateTime: '2023-11-01T11:00:00+09:00'
        },
        iCalUID: '12345abcde67890fghij12345@google.com',
        sequence: 0,
        eventType: 'default'
      };

      const todo = TodoRepository.createTodoFromCalendarEvent(event);
      const json = todo.toJSON();

      expect(json.timeRanges).toEqual([]);
    });

    it('rawDataにはカレンダーイベントのJSONがそのまま格納される', () => {
      const event: CalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: '週次定例ミーティング',
        description: 'プロジェクトAの進捗確認',
        location: 'オンライン (Zoom)',
        creator: {
          email: 'user@example.com',
          self: true
        },
        organizer: {
          email: 'user@example.com',
          self: true
        },
        start: {
          dateTime: '2023-11-01T10:00:00+09:00',
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: '2023-11-01T11:00:00+09:00',
          timeZone: 'Asia/Tokyo'
        },
        iCalUID: '12345abcde67890fghij12345@google.com',
        sequence: 0,
        attendees: [
          {
            email: 'member1@example.com',
            responseStatus: 'accepted'
          }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'email',
              minutes: 30
            }
          ]
        },
        eventType: 'default'
      };

      const todo = TodoRepository.createTodoFromCalendarEvent(event);
      const json = todo.toJSON();

      // rawDataにカレンダーイベントの情報が格納されていることを確認
      expect(json.kind).toBe('calendar#event');
      expect(json.summary).toBe('週次定例ミーティング');
      expect(json.description).toBe('プロジェクトAの進捗確認');
      expect(json.location).toBe('オンライン (Zoom)');
      expect(json.start).toEqual({
        dateTime: '2023-11-01T10:00:00+09:00',
        timeZone: 'Asia/Tokyo'
      });
      expect(json.end).toEqual({
        dateTime: '2023-11-01T11:00:00+09:00',
        timeZone: 'Asia/Tokyo'
      });
      expect(json.attendees).toHaveLength(1);
      expect(json.reminders).toBeDefined();
    });
  });

  describe('createTodosFromCalendarEvents', () => {
    it('カレンダーイベント配列からTodoリストを生成できる', () => {
      const events: CalendarEvent[] = [
        {
          kind: 'calendar#event',
          etag: '"3123456789012345"',
          id: '12345abcde67890fghij12345',
          status: 'confirmed',
          htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
          created: '2023-10-20T09:00:00.000Z',
          updated: '2023-10-20T09:30:00.000Z',
          summary: '週次定例ミーティング',
          creator: {
            email: 'user@example.com'
          },
          organizer: {
            email: 'user@example.com'
          },
          start: {
            dateTime: '2023-11-01T10:00:00+09:00'
          },
          end: {
            dateTime: '2023-11-01T11:00:00+09:00'
          },
          iCalUID: '12345abcde67890fghij12345@google.com',
          sequence: 0,
          eventType: 'default'
        },
        {
          kind: 'calendar#event',
          etag: '"3987654321098765"',
          id: '98765zyxwv43210utsrq98765',
          status: 'confirmed',
          htmlLink: 'https://www.google.com/calendar/event?eid=yyyyyyy',
          created: '2023-10-21T15:00:00.000Z',
          updated: '2023-10-21T15:00:00.000Z',
          summary: '誕生日',
          creator: {
            email: 'user@example.com'
          },
          organizer: {
            email: 'user@example.com'
          },
          start: {
            date: '2023-11-05'
          },
          end: {
            date: '2023-11-06'
          },
          iCalUID: '98765zyxwv43210utsrq98765@google.com',
          sequence: 0,
          eventType: 'default'
        }
      ];

      const todos = TodoRepository.createTodosFromCalendarEvents(events);

      expect(todos).toHaveLength(2);
      expect(todos[0].getText()).toBe('週次定例ミーティング');
      expect(todos[1].getText()).toBe('誕生日');
    });

    it('空の配列からは空のTodoリストが生成される', () => {
      const events: CalendarEvent[] = [];
      const todos = TodoRepository.createTodosFromCalendarEvents(events);

      expect(todos).toEqual([]);
    });
  });

  describe('addTodosFromCalendarEvents', () => {
    it('既存のTodoリストにカレンダーイベントからTodoを追加できる', () => {
      const existingTodo = TodoRepository.createTodo('TASK-001', 'Existing task');
      const todos = [existingTodo];

      const events: CalendarEvent[] = [
        {
          kind: 'calendar#event',
          etag: '"3123456789012345"',
          id: '12345abcde67890fghij12345',
          status: 'confirmed',
          htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
          created: '2023-10-20T09:00:00.000Z',
          updated: '2023-10-20T09:30:00.000Z',
          summary: '週次定例ミーティング',
          creator: {
            email: 'user@example.com'
          },
          organizer: {
            email: 'user@example.com'
          },
          start: {
            dateTime: '2023-11-01T10:00:00+09:00'
          },
          end: {
            dateTime: '2023-11-01T11:00:00+09:00'
          },
          iCalUID: '12345abcde67890fghij12345@google.com',
          sequence: 0,
          eventType: 'default'
        }
      ];

      const newTodos = TodoRepository.addTodosFromCalendarEvents(todos, events);

      expect(newTodos).toHaveLength(2);
      expect(newTodos[0].getText()).toBe('Existing task');
      expect(newTodos[1].getText()).toBe('週次定例ミーティング');
    });

    it('元の配列は変更されない（イミュータブル）', () => {
      const existingTodo = TodoRepository.createTodo('TASK-001', 'Existing task');
      const todos = [existingTodo];

      const events: CalendarEvent[] = [
        {
          kind: 'calendar#event',
          etag: '"3123456789012345"',
          id: '12345abcde67890fghij12345',
          status: 'confirmed',
          htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
          created: '2023-10-20T09:00:00.000Z',
          updated: '2023-10-20T09:30:00.000Z',
          summary: '週次定例ミーティング',
          creator: {
            email: 'user@example.com'
          },
          organizer: {
            email: 'user@example.com'
          },
          start: {
            dateTime: '2023-11-01T10:00:00+09:00'
          },
          end: {
            dateTime: '2023-11-01T11:00:00+09:00'
          },
          iCalUID: '12345abcde67890fghij12345@google.com',
          sequence: 0,
          eventType: 'default'
        }
      ];

      const newTodos = TodoRepository.addTodosFromCalendarEvents(todos, events);

      expect(todos).toHaveLength(1);
      expect(newTodos).toHaveLength(2);
    });

    it('空のイベント配列を追加しても既存のTodoリストは変わらない', () => {
      const existingTodo = TodoRepository.createTodo('TASK-001', 'Existing task');
      const todos = [existingTodo];

      const events: CalendarEvent[] = [];
      const newTodos = TodoRepository.addTodosFromCalendarEvents(todos, events);

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getText()).toBe('Existing task');
    });

    it('空のTodoリストにカレンダーイベントを追加できる', () => {
      const todos: Todo[] = [];

      const events: CalendarEvent[] = [
        {
          kind: 'calendar#event',
          etag: '"3123456789012345"',
          id: '12345abcde67890fghij12345',
          status: 'confirmed',
          htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
          created: '2023-10-20T09:00:00.000Z',
          updated: '2023-10-20T09:30:00.000Z',
          summary: '週次定例ミーティング',
          creator: {
            email: 'user@example.com'
          },
          organizer: {
            email: 'user@example.com'
          },
          start: {
            dateTime: '2023-11-01T10:00:00+09:00'
          },
          end: {
            dateTime: '2023-11-01T11:00:00+09:00'
          },
          iCalUID: '12345abcde67890fghij12345@google.com',
          sequence: 0,
          eventType: 'default'
        }
      ];

      const newTodos = TodoRepository.addTodosFromCalendarEvents(todos, events);

      expect(newTodos).toHaveLength(1);
      expect(newTodos[0].getText()).toBe('週次定例ミーティング');
    });
  });
});
