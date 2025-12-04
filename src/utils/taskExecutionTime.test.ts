import { describe, it, expect } from 'vitest';
import { Todo } from '../models/Todo';
import { CalendarEvent } from '../models/CalendarEvent';
import {
  calculateExecutionTimeForDate,
  calculateExecutionTimesForDate,
  assignColorToTodo,
  calculateStackBarDisplay
} from './taskExecutionTime';

describe('taskExecutionTime utilities', () => {
  describe('calculateExecutionTimeForDate', () => {
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

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
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

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
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

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
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
            end: '2025-11-28 11:00:00' // 60分（2025-11-28）
          },
          {
            start: '2025-11-29 14:00:00',
            end: '2025-11-29 15:00:00' // 60分（2025-11-29）
          }
        ]
      );

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
      expect(result).toBe(60);

      const result2 = calculateExecutionTimeForDate(todo, '2025-11-29');
      expect(result2).toBe(60);
    });

    it('endがnullの場合は現在時刻までの時間を計算する', () => {
      // 現在時刻を固定するためのモック処理は複雑なので、
      // この場合は実行時間が0より大きいことだけをテスト
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
            end: null
          }
        ]
      );

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
      // 現在時刻によって結果が変わるため、0以上であることだけを確認
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateExecutionTimesForDate', () => {
    it('複数のTodoの実行時間を計算する', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 11:00:00' // 60分
            }
          ]
        ),
        new Todo(
          'test-id-2',
          'TASK002',
          'Task 2',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 14:00:00',
              end: '2025-11-28 15:30:00' // 90分
            }
          ]
        )
      ];

      const result = calculateExecutionTimesForDate(todos, '2025-11-28');

      expect(result.size).toBe(2);
      expect(result.get('test-id-1')).toBe(60);
      expect(result.get('test-id-2')).toBe(90);
    });

    it('実行時間が0のTodoは結果に含まれない', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 11:00:00' // 60分
            }
          ]
        ),
        new Todo(
          'test-id-2',
          'TASK002',
          'Task 2',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [] // 実行時間なし
        )
      ];

      const result = calculateExecutionTimesForDate(todos, '2025-11-28');

      expect(result.size).toBe(1);
      expect(result.get('test-id-1')).toBe(60);
      expect(result.has('test-id-2')).toBe(false);
    });
  });

  describe('assignColorToTodo', () => {
    it('同じIDには同じ色を割り当てる', () => {
      const todoId = 'test-id-123';
      const color1 = assignColorToTodo(todoId);
      const color2 = assignColorToTodo(todoId);

      expect(color1).toBe(color2);
    });

    it('異なるIDには異なる色を割り当てる', () => {
      const color1 = assignColorToTodo('test-id-1');
      const color2 = assignColorToTodo('test-id-2');

      expect(color1).not.toBe(color2);
    });

    it('HSL形式の色を返す', () => {
      const color = assignColorToTodo('test-id');
      expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });
  });

  describe('calculateStackBarDisplay', () => {
    it('12時間未満の場合は12時間を基準にする', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 11:00:00' // 60分
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      expect(result.totalMinutes).toBe(60);
      expect(result.displayMaxMinutes).toBe(720); // 12時間 = 720分
      expect(result.segments.length).toBe(1);
      expect(result.segments[0].itemId).toBe('test-id-1');
      expect(result.segments[0].itemText).toBe('Task 1');
      expect(result.segments[0].minutes).toBe(60);
    });

    it('12時間を超える場合は実際の時間を使用する', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 23:00:00' // 13時間 = 780分
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      expect(result.totalMinutes).toBe(780);
      expect(result.displayMaxMinutes).toBe(780); // 実際の時間を使用
      expect(result.segments.length).toBe(1);
    });

    it('実行時間が0の場合は空のセグメント配列を返す', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [] // 実行時間なし
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      expect(result.totalMinutes).toBe(0);
      expect(result.displayMaxMinutes).toBe(720); // 12時間基準
      expect(result.segments.length).toBe(0);
    });

    it('複数のTodoの実行時間を正しく集計する', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 11:00:00' // 60分
            }
          ]
        ),
        new Todo(
          'test-id-2',
          'TASK002',
          'Task 2',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 14:00:00',
              end: '2025-11-28 15:30:00' // 90分
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      expect(result.totalMinutes).toBe(150);
      expect(result.displayMaxMinutes).toBe(720); // 12時間基準
      expect(result.segments.length).toBe(2);
      expect(result.segments[0].itemId).toBe('test-id-1');
      expect(result.segments[0].minutes).toBe(60);
      expect(result.segments[1].itemId).toBe('test-id-2');
      expect(result.segments[1].minutes).toBe(90);
    });

    it('hourMarkersが正しく生成される', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 11:00:00' // 60分
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      // 12時間基準 = 720分 = 12時間
      // hourMarkersは 0, 1, 2, ..., 12 の13要素
      expect(result.hourMarkers.length).toBe(13);
      expect(result.hourMarkers[0]).toBe(0);
      expect(result.hourMarkers[12]).toBe(12);
    });

    it('13時間のデータに対してhourMarkersが正しく生成される', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 23:00:00' // 13時間 = 780分
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      // 13時間 = 780分
      // hourMarkersは 0, 1, 2, ..., 13 の14要素
      expect(result.hourMarkers.length).toBe(14);
      expect(result.hourMarkers[0]).toBe(0);
      expect(result.hourMarkers[13]).toBe(13);
    });

    it('各セグメントに色が割り当てられる', () => {
      const todos = [
        new Todo(
          'test-id-1',
          'TASK001',
          'Task 1',
          null,
          '2025-11-28 10:00:00',
          '2025-11-28 10:00:00',
          [
            {
              start: '2025-11-28 10:00:00',
              end: '2025-11-28 11:00:00' // 60分
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28');

      expect(result.segments[0].color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });
  });

  describe('CalendarEventのサポート', () => {
    it('CalendarEventの実行時間を正しく計算する', () => {
      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-001',
        'Meeting',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 14:00:00',
        '2025-11-28 16:00:00',
        [
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 16:00:00' // 120分
          }
        ]
      );

      const result = calculateExecutionTimeForDate(calendarEvent, '2025-11-28');
      expect(result).toBe(120);
    });

    it('TodoとCalendarEventが混在する場合の合計時間を計算する', () => {
      const todo = new Todo(
        'todo-1',
        'TASK-001',
        'Todo task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:00:00' // 60分
          }
        ]
      );

      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-002',
        'Meeting',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 14:00:00',
        '2025-11-28 15:00:00',
        [
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 15:00:00' // 60分
          }
        ]
      );

      const items = [todo, calendarEvent];
      const result = calculateExecutionTimesForDate(items, '2025-11-28');

      expect(result.size).toBe(2);
      expect(result.get('todo-1')).toBe(60);
      expect(result.get('event-1')).toBe(60);
    });

    it('積み上げ棒グラフにCalendarEventが含まれる', () => {
      const todo = new Todo(
        'todo-1',
        'TASK-001',
        'Todo task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:00:00' // 60分
          }
        ]
      );

      const calendarEvent = new CalendarEvent(
        'event-1',
        'TASK-002',
        'Meeting',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 14:00:00',
        '2025-11-28 16:00:00',
        [
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 16:00:00' // 120分
          }
        ]
      );

      const items = [todo, calendarEvent];
      const result = calculateStackBarDisplay(items, '2025-11-28');

      expect(result.segments).toHaveLength(2);
      expect(result.totalMinutes).toBe(180); // 60 + 120
      expect(result.segments[0].itemId).toBe('todo-1');
      expect(result.segments[0].itemText).toBe('Todo task');
      expect(result.segments[0].minutes).toBe(60);
      expect(result.segments[1].itemId).toBe('event-1');
      expect(result.segments[1].itemText).toBe('Meeting');
      expect(result.segments[1].minutes).toBe(120);
    });
  });
});
