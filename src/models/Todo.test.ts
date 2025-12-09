import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Todo } from './Todo';

describe('Todo', () => {
  // 固定時刻を使用するテストのセットアップ
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('すべてのプロパティを持つTodoインスタンスを作成できる', () => {
      const todo = new Todo(
        'id-123',
        'TASK-001',
        'Sample task',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        []
      );

      expect(todo.id).toBe('id-123');
      expect(todo.taskcode).toBe('TASK-001');
      expect(todo.text).toBe('Sample task');
      expect(todo.completedAt).toBe(null);
      expect(todo.createdAt).toBe('2025-01-15 10:00:00');
      expect(todo.updatedAt).toBe('2025-01-15 10:00:00');
    });

    it('timeRangesを指定しない場合、デフォルト値で初期化される', () => {
      const todo = new Todo(
        'id-123',
        'TASK-001',
        'Sample task',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        []
      );

      const json = todo.toJSON();
      expect(json.timeRanges).toEqual([]);
      expect(json.id).toBe('id-123');
    });

    it('timeRangesを指定した場合、それが保持される', () => {
      const timeRanges = [{ start: '2025-01-15 10:00:00', end: null }];

      const todo = new Todo(
        'id-123',
        'TASK-001',
        'Sample task',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        timeRanges
      );

      const json = todo.toJSON();
      expect(json.timeRanges).toHaveLength(1);
      expect(json.timeRanges[0].start).toBe('2025-01-15 10:00:00');
      expect(json.timeRanges[0].end).toBe(null);
    });
  });

  describe('getter methods', () => {
    it('getId() でIDを取得できる', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.getId()).toBe('id-123');
    });

    it('getTaskcode() でタスクコードを取得できる', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.getTaskcode()).toBe('TASK-001');
    });

    it('getText() でテキストを取得できる', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.getText()).toBe('Sample task');
    });

    it('getCompletedAt() で完了日時を取得できる', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', '2025-01-15 11:00:00', '2025-01-15 10:00:00', '2025-01-15 11:00:00', []);
      expect(todo.getCompletedAt()).toBe('2025-01-15 11:00:00');
    });

    it('getCompletedAt() で未完了の場合nullを返す', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.getCompletedAt()).toBe(null);
    });
  });

  describe('isCompleted', () => {
    it('completedAtがnullでない場合、trueを返す', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', '2025-01-15 11:00:00', '2025-01-15 10:00:00', '2025-01-15 11:00:00', []);
      expect(todo.isCompleted()).toBe(true);
    });

    it('completedAtがnullの場合、falseを返す', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.isCompleted()).toBe(false);
    });
  });

  describe('setTaskcode', () => {
    it('新しいタスクコードで新しいTodoインスタンスを返す', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setTaskcode('TASK-999');

      expect(updated.getTaskcode()).toBe('TASK-999');
      expect(updated.getId()).toBe('id-123'); // 他のプロパティは変わらない
      expect(updated.getText()).toBe('Sample task');
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setTaskcode('TASK-999');

      expect(original.getTaskcode()).toBe('TASK-001'); // 元は変わらない
      expect(updated.getTaskcode()).toBe('TASK-999');
    });

    it('updatedAtが現在時刻に更新される', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setTaskcode('TASK-999');

      expect(updated.updatedAt).toBe('2025-01-15 12:34:56'); // 現在時刻（JST）
    });

  });

  describe('setText', () => {
    it('新しいテキストで新しいTodoインスタンスを返す', () => {
      const original = new Todo('id-123', 'TASK-001', 'Original text', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setText('Updated text');

      expect(updated.getText()).toBe('Updated text');
      expect(updated.getId()).toBe('id-123');
      expect(updated.getTaskcode()).toBe('TASK-001');
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const original = new Todo('id-123', 'TASK-001', 'Original text', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setText('Updated text');

      expect(original.getText()).toBe('Original text');
      expect(updated.getText()).toBe('Updated text');
    });

    it('updatedAtが現在時刻に更新される', () => {
      const original = new Todo('id-123', 'TASK-001', 'Original text', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setText('Updated text');

      expect(updated.updatedAt).toBe('2025-01-15 12:34:56');
    });

    it('空文字列を設定できる', () => {
      const original = new Todo('id-123', 'TASK-001', 'Original text', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setText('');

      expect(updated.getText()).toBe('');
    });
  });

  describe('toggleCompleted', () => {
    it('未完了のTodoを完了にできる', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.toggleCompleted();

      expect(updated.isCompleted()).toBe(true);
      expect(updated.getCompletedAt()).toBe('2025-01-15 12:34:56');
    });

    it('完了済みのTodoを未完了にできる', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', '2025-01-15 11:00:00', '2025-01-15 10:00:00', '2025-01-15 11:00:00', []);
      const updated = original.toggleCompleted();

      expect(updated.isCompleted()).toBe(false);
      expect(updated.getCompletedAt()).toBe(null);
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.toggleCompleted();

      expect(original.isCompleted()).toBe(false);
      expect(updated.isCompleted()).toBe(true);
    });

    it('updatedAtが現在時刻に更新される', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.toggleCompleted();

      expect(updated.updatedAt).toBe('2025-01-15 12:34:56');
    });

    it('トグルを2回行うと元の状態に戻る', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const toggled1 = original.toggleCompleted();
      const toggled2 = toggled1.toggleCompleted();

      expect(original.isCompleted()).toBe(false);
      expect(toggled1.isCompleted()).toBe(true);
      expect(toggled2.isCompleted()).toBe(false);
    });
  });

  describe('setCompleted', () => {
    it('未完了のTodoを完了に設定できる', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setCompleted(true);

      expect(updated.isCompleted()).toBe(true);
      expect(updated.getCompletedAt()).toBe('2025-01-15 12:34:56');
    });

    it('完了済みのTodoを未完了に設定できる', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', '2025-01-15 11:00:00', '2025-01-15 10:00:00', '2025-01-15 11:00:00', []);
      const updated = original.setCompleted(false);

      expect(updated.isCompleted()).toBe(false);
      expect(updated.getCompletedAt()).toBe(null);
    });

    it('すでに完了済みのTodoに完了を設定しても問題ない', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', '2025-01-15 11:00:00', '2025-01-15 10:00:00', '2025-01-15 11:00:00', []);
      const updated = original.setCompleted(true);

      expect(updated.isCompleted()).toBe(true);
      expect(updated.getCompletedAt()).toBe('2025-01-15 12:34:56'); // 新しい時刻
    });

    it('すでに未完了のTodoに未完了を設定しても問題ない', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setCompleted(false);

      expect(updated.isCompleted()).toBe(false);
      expect(updated.getCompletedAt()).toBe(null);
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.setCompleted(true);

      expect(original.isCompleted()).toBe(false);
      expect(updated.isCompleted()).toBe(true);
    });
  });

  describe('startTimer', () => {
    it('timeRangesに新しい要素を追加できる', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.startTimer();

      const json = updated.toJSON();
      expect(json.timeRanges).toHaveLength(1);
      expect(json.timeRanges[0].start).toBe('2025-01-15 12:34:56');
      expect(json.timeRanges[0].end).toBe(null);
    });

    it('すでにtimeRangesがある場合、新しい要素を追加する', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' }
        ];

      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      const updated = original.startTimer();

      const json = updated.toJSON();
      expect(json.timeRanges).toHaveLength(2);
      expect(json.timeRanges[1].start).toBe('2025-01-15 12:34:56');
      expect(json.timeRanges[1].end).toBe(null);
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.startTimer();

      const originalJson = original.toJSON();
      const updatedJson = updated.toJSON();

      expect(originalJson.timeRanges).toHaveLength(0);
      expect(updatedJson.timeRanges).toHaveLength(1);
    });

    it('updatedAtが現在時刻に更新される', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.startTimer();

      expect(updated.updatedAt).toBe('2025-01-15 12:34:56');
    });
  });

  describe('stopTimer', () => {
    it('実行中のタイマーを停止できる', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: null }
        ];

      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      const updated = original.stopTimer();

      const json = updated.toJSON();
      expect(json.timeRanges).toHaveLength(1);
      expect(json.timeRanges[0].start).toBe('2025-01-15 10:00:00');
      expect(json.timeRanges[0].end).toBe('2025-01-15 12:34:56');
    });

    it('timeRangesが空の場合、何もしない', () => {
      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      const updated = original.stopTimer();

      expect(updated).toBe(original); // 同じインスタンスを返す
    });

    it('すでに停止済みのタイマーの場合、何もしない', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' }
        ];

      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      const updated = original.stopTimer();

      expect(updated).toBe(original); // 同じインスタンスを返す
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: null }
        ];

      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      const updated = original.stopTimer();

      const originalJson = original.toJSON();
      const updatedJson = updated.toJSON();

      expect(originalJson.timeRanges[0].end).toBe(null);
      expect(updatedJson.timeRanges[0].end).toBe('2025-01-15 12:34:56');
    });

    it('updatedAtが現在時刻に更新される', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: null }
        ];

      const original = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      const updated = original.stopTimer();

      expect(updated.updatedAt).toBe('2025-01-15 12:34:56');
    });
  });

  describe('isTimerRunning', () => {
    it('タイマーが実行中の場合trueを返す', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: null }
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.isTimerRunning()).toBe(true);
    });

    it('タイマーが停止済みの場合falseを返す', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' }
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.isTimerRunning()).toBe(false);
    });

    it('timeRangesが空の場合falseを返す', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.isTimerRunning()).toBe(false);
    });

    it('複数のtimeRangesがある場合、最新のendがnullならtrueを返す', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' },
          { start: '2025-01-15 12:00:00', end: null }
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.isTimerRunning()).toBe(true);
    });
  });

  describe('getTotalExecutionTimeInMinutes', () => {
    it('timeRangesが空の場合0を返す', () => {
      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', []);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(0);
    });

    it('1時間の実行時間を正しく計算できる', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' } // 60分
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(60);
    });

    it('30分の実行時間を正しく計算できる', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 10:30:00' } // 30分
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(30);
    });

    it('複数のtimeRangesの合計を計算できる', () => {
      const timeRanges = [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 10:30:00' }, // 30分
          { start: '2025-01-15 11:00:00', end: '2025-01-15 11:45:00' }  // 45分
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(75); // 30 + 45 = 75
    });

    it('実行中のタイマー（endがnull）を現在時刻まで計算できる', () => {
      // 現在時刻: 2025-01-15 12:34:56 (JST)
      const timeRanges = [
          { start: '2025-01-15 12:00:00', end: null } // 34分56秒 ≈ 35分
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(35); // 四捨五入で35分
    });

    it('59秒は1分として計算される', () => {
      const timeRanges = [
          { start: '2025-01-15 12:34:00', end: '2025-01-15 12:34:59' } // 59秒
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(1); // 59/60 = 0.98... -> 四捨五入で1分
    });

    it('61秒は1分として計算される', () => {
      const timeRanges = [
          { start: '2025-01-15 12:34:00', end: '2025-01-15 12:35:01' } // 61秒
        ];

      const todo = new Todo('id-123', 'TASK-001', 'Sample task', null, '2025-01-15 10:00:00', '2025-01-15 10:00:00', timeRanges);
      expect(todo.getTotalExecutionTimeInMinutes()).toBe(1); // 61/60 = 1.01... -> 四捨五入で1分
    });
  });

  describe('fromJSON', () => {
    it('最小構成のJSONからTodoを作成できる', () => {
      const json = {
        id: 'id-123',
        taskcode: 'TASK-001',
        text: 'Sample task',
        completedAt: null
      };

      const todo = Todo.fromJSON(json);

      expect(todo.getId()).toBe('id-123');
      expect(todo.getTaskcode()).toBe('TASK-001');
      expect(todo.getText()).toBe('Sample task');
      expect(todo.getCompletedAt()).toBe(null);
    });

    it('完了済みTodoを正しく復元できる', () => {
      const json = {
        id: 'id-123',
        taskcode: 'TASK-001',
        text: 'Completed task',
        completedAt: '2025-01-15 11:00:00',
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 11:00:00'
      };

      const todo = Todo.fromJSON(json);

      expect(todo.isCompleted()).toBe(true);
      expect(todo.getCompletedAt()).toBe('2025-01-15 11:00:00');
    });

    it('taskcodeが欠けている場合、空文字列で初期化される', () => {
      const json = {
        id: 'id-123',
        text: 'Sample task',
        completedAt: null
      };

      const todo = Todo.fromJSON(json);

      expect(todo.getTaskcode()).toBe('');
    });

    it('createdAtが欠けている場合、現在時刻で初期化される', () => {
      const json = {
        id: 'id-123',
        taskcode: 'TASK-001',
        text: 'Sample task',
        completedAt: null
      };

      const todo = Todo.fromJSON(json);

      expect(todo.createdAt).toBe('2025-01-15 12:34:56'); // 現在時刻（JST）
    });

    it('updatedAtが欠けている場合、現在時刻で初期化される', () => {
      const json = {
        id: 'id-123',
        taskcode: 'TASK-001',
        text: 'Sample task',
        completedAt: null
      };

      const todo = Todo.fromJSON(json);

      expect(todo.updatedAt).toBe('2025-01-15 12:34:56'); // 現在時刻（JST）
    });

    it('timeRangesが欠けている場合、空配列で初期化される', () => {
      const json = {
        id: 'id-123',
        taskcode: 'TASK-001',
        text: 'Sample task',
        completedAt: null
      };

      const todo = Todo.fromJSON(json);
      const jsonOutput = todo.toJSON();

      expect(jsonOutput.timeRanges).toEqual([]);
    });

    it('timeRangesを含むJSONを正しく復元できる', () => {
      const json = {
        id: 'id-123',
        taskcode: 'TASK-001',
        text: 'Sample task',
        completedAt: null,
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 12:00:00',
        timeRanges: [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' },
          { start: '2025-01-15 11:30:00', end: null }
        ]
      };

      const todo = Todo.fromJSON(json);
      const jsonOutput = todo.toJSON();

      expect(jsonOutput.timeRanges).toHaveLength(2);
      expect(jsonOutput.timeRanges[0].start).toBe('2025-01-15 10:00:00');
      expect(jsonOutput.timeRanges[1].end).toBe(null);
    });

  });

  describe('toJSON', () => {
    it('TodoをJSON形式に変換できる', () => {
      const todo = new Todo(
        'id-123',
        'TASK-001',
        'Sample task',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        []
      );

      const json = todo.toJSON();

      expect(json.id).toBe('id-123');
      expect(json.type).toBe('todo');
      expect(json.taskcode).toBe('TASK-001');
      expect(json.text).toBe('Sample task');
      expect(json.completedAt).toBe(null);
      expect(json.createdAt).toBe('2025-01-15 10:00:00');
      expect(json.updatedAt).toBe('2025-01-15 10:00:00');
      expect(json.timeRanges).toEqual([]);
    });

    it('fromJSON -> toJSON で元のJSONと同じになる', () => {
      const original = {
        id: 'id-123',
        type: 'todo',
        taskcode: 'TASK-001',
        text: 'Sample task',
        completedAt: '2025-01-15 11:00:00',
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 11:00:00',
        timeRanges: [
          { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' }
        ]
      };

      const todo = Todo.fromJSON(original);
      const json = todo.toJSON();

      expect(json).toEqual(original);
    });

    it('更新されたプロパティが正しく反映される', () => {
      const original = new Todo(
        'id-123',
        'TASK-001',
        'Original text',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        []
      );

      const updated = original.setText('Updated text');
      const json = updated.toJSON();

      expect(json.text).toBe('Updated text');
      expect(json.updatedAt).toBe('2025-01-15 12:34:56');
    });
  });

  describe('getExecutionTimeForDate', () => {
    it('指定日付に実行時間がない場合は0を返す', () => {
      const todo = new Todo(
        'test-id',
        'TASK001',
        'Test task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        []
      );

      const result = todo.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(0);
    });

    it('指定日付の実行時間を正しく計算する', () => {
      const todo = new Todo(
        'test-id',
        'TASK001',
        'Test task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:30:00' // 90分
          }
        ]
      );

      const result = todo.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(90);
    });

    it('複数のtimeRangesがある場合は合計時間を返す', () => {
      const todo = new Todo(
        'test-id',
        'TASK001',
        'Test task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:00:00' // 60分
          },
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 15:30:00' // 90分
          }
        ]
      );

      const result = todo.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(150);
    });

    it('異なる日付のtimeRangesは除外する', () => {
      const todo = new Todo(
        'test-id',
        'TASK001',
        'Test task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:00:00' // 60分(2025-11-28)
          },
          {
            start: '2025-11-29 14:00:00',
            end: '2025-11-29 15:00:00' // 60分(2025-11-29)
          }
        ]
      );

      const result = todo.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(60);

      const result2 = todo.getExecutionTimeForDate('2025-11-29');
      expect(result2).toBe(60);
    });

    it('endがnullの場合は現在時刻までの時間を計算する', () => {
      // 固定時刻: 2025-01-15 12:34:56(vitest beforeEachで設定済み)
      const todo = new Todo(
        'test-id',
        'TASK001',
        'Test task',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        [
          {
            start: '2025-01-15 10:00:00',
            end: null
          }
        ]
      );

      // 10:00:00 から 12:34:56 まで = 154分
      const result = todo.getExecutionTimeForDate('2025-01-15');
      expect(result).toBe(154);
    });
  });
});
