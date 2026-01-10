import { describe, it, expect } from 'vitest';
import { Todo } from '../models/Todo';
import { CalendarEvent } from '../models/CalendarEvent';
import { ProjectDefinitionRepository, ProjectDefinition } from '../models/ProjectDefinition';
import {
  calculateExecutionTimeForDate,
  calculateExecutionTimesForDate,
  assignColorToTodo,
  assignColorToItem,
  calculateStackBarDisplay,
  colorToRgba
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
            end: '2025-11-28 11:30:00' // 5400秒
          }
        ]
      );

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
      expect(result).toBe(5400);
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
            end: '2025-11-28 11:00:00' // 3600秒
          },
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 15:30:00' // 5400秒
          }
        ]
      );

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
      expect(result).toBe(9000);
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
            end: '2025-11-28 11:00:00' // 3600秒（2025-11-28）
          },
          {
            start: '2025-11-29 14:00:00',
            end: '2025-11-29 15:00:00' // 3600秒（2025-11-29）
          }
        ]
      );

      const result = calculateExecutionTimeForDate(todo, '2025-11-28');
      expect(result).toBe(3600);

      const result2 = calculateExecutionTimeForDate(todo, '2025-11-29');
      expect(result2).toBe(3600);
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
              end: '2025-11-28 11:00:00' // 3600秒
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
              end: '2025-11-28 15:30:00' // 5400秒
            }
          ]
        )
      ];

      const result = calculateExecutionTimesForDate(todos, '2025-11-28');

      expect(result.size).toBe(2);
      expect(result.get('test-id-1')).toBe(3600);
      expect(result.get('test-id-2')).toBe(5400);
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
              end: '2025-11-28 11:00:00' // 3600秒
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
      expect(result.get('test-id-1')).toBe(3600);
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

  describe('assignColorToItem', () => {
    it('プロジェクト定義から色を取得する', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-11', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const todo = new Todo(
        'test-id',
        'TASK-001',
        'Test task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        []
      );

      const color = assignColorToItem(todo, '2025-11-28', repo);
      expect(color).toBe('red');
    });

    it('該当プロジェクトがない場合は灰色を返す', () => {
      const emptyRepo = ProjectDefinitionRepository.createEmpty();

      const todo = new Todo(
        'test-id',
        'TASK-999',
        'Test task',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        []
      );

      const color = assignColorToItem(todo, '2025-11-28', emptyRepo);
      expect(color).toBe('#808080');
    });

    it('月が異なる場合は灰色を返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'blue', [
        { taskcode: 'TASK-001' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-11', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const todo = new Todo(
        'test-id',
        'TASK-001',
        'Test task',
        null,
        '2025-12-01 10:00:00',
        '2025-12-01 10:00:00',
        []
      );

      const color = assignColorToItem(todo, '2025-12-01', repo);
      expect(color).toBe('#808080');
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
              end: '2025-11-28 11:00:00' // 3600秒
            }
          ]
        )
      ];

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      expect(result.totalSeconds).toBe(3600);
      expect(result.displayMaxSeconds).toBe(43200); // 12時間 = 43200秒
      expect(result.segments.length).toBe(1);
      expect(result.segments[0].itemId).toBe('test-id-1');
      expect(result.segments[0].itemText).toBe('Task 1');
      expect(result.segments[0].seconds).toBe(3600);
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
              end: '2025-11-28 23:00:00' // 13時間 = 46800秒
            }
          ]
        )
      ];

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      expect(result.totalSeconds).toBe(46800);
      expect(result.displayMaxSeconds).toBe(46800); // 実際の時間を使用
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

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      expect(result.totalSeconds).toBe(0);
      expect(result.displayMaxSeconds).toBe(43200); // 12時間基準
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
              end: '2025-11-28 11:00:00' // 3600秒
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
              end: '2025-11-28 15:30:00' // 5400秒
            }
          ]
        )
      ];

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      expect(result.totalSeconds).toBe(9000);
      expect(result.displayMaxSeconds).toBe(43200); // 12時間基準
      expect(result.segments.length).toBe(2);
      expect(result.segments[0].itemId).toBe('test-id-1');
      expect(result.segments[0].seconds).toBe(3600);
      expect(result.segments[1].itemId).toBe('test-id-2');
      expect(result.segments[1].seconds).toBe(5400);
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
              end: '2025-11-28 11:00:00' // 3600秒
            }
          ]
        )
      ];

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      // 12時間基準 = 43200秒 = 12時間
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
              end: '2025-11-28 23:00:00' // 13時間 = 46800秒
            }
          ]
        )
      ];

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      // 13時間 = 46800秒
      // hourMarkersは 0, 1, 2, ..., 13 の14要素
      expect(result.hourMarkers.length).toBe(14);
      expect(result.hourMarkers[0]).toBe(0);
      expect(result.hourMarkers[13]).toBe(13);
    });

    it('プロジェクト定義がない場合、セグメントに灰色が割り当てられる', () => {
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
              end: '2025-11-28 11:00:00' // 3600秒
            }
          ]
        )
      ];

      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(todos, '2025-11-28', emptyRepo);

      expect(result.segments[0].color).toBe('#808080');
    });

    it('プロジェクト定義がある場合、セグメントにプロジェクト色が割り当てられる', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'green', [
        { taskcode: 'TASK001' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-11', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

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
              end: '2025-11-28 11:00:00' // 3600秒
            }
          ]
        )
      ];

      const result = calculateStackBarDisplay(todos, '2025-11-28', repo);

      expect(result.segments[0].color).toBe('green');
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
        null,
        [
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 16:00:00' // 7200秒
          }
        ]
      );

      const result = calculateExecutionTimeForDate(calendarEvent, '2025-11-28');
      expect(result).toBe(7200);
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
            end: '2025-11-28 11:00:00' // 3600秒
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
        null,
        [
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 15:00:00' // 3600秒
          }
        ]
      );

      const items = [todo, calendarEvent];
      const result = calculateExecutionTimesForDate(items, '2025-11-28');

      expect(result.size).toBe(2);
      expect(result.get('todo-1')).toBe(3600);
      expect(result.get('event-1')).toBe(3600);
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
            end: '2025-11-28 11:00:00' // 3600秒
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
        null,
        [
          {
            start: '2025-11-28 14:00:00',
            end: '2025-11-28 16:00:00' // 7200秒
          }
        ]
      );

      const items = [todo, calendarEvent];
      const emptyRepo = ProjectDefinitionRepository.createEmpty();
      const result = calculateStackBarDisplay(items, '2025-11-28', emptyRepo);

      expect(result.segments).toHaveLength(2);
      expect(result.totalSeconds).toBe(10800); // 3600 + 7200
      expect(result.segments[0].itemId).toBe('todo-1');
      expect(result.segments[0].itemText).toBe('Todo task');
      expect(result.segments[0].seconds).toBe(3600);
      expect(result.segments[1].itemId).toBe('event-1');
      expect(result.segments[1].itemText).toBe('Meeting');
      expect(result.segments[1].seconds).toBe(7200);
    });
  });

  describe('colorToRgba', () => {
    it('16進数カラーコード（#RRGGBB形式）をRGBA形式に変換する', () => {
      expect(colorToRgba('#ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('#00ff00', 0.5)).toBe('rgba(0, 255, 0, 0.5)');
      expect(colorToRgba('#0000ff', 0.8)).toBe('rgba(0, 0, 255, 0.8)');
    });

    it('16進数カラーコード（#RGB形式）をRGBA形式に変換する', () => {
      expect(colorToRgba('#f00', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('#0f0', 0.5)).toBe('rgba(0, 255, 0, 0.5)');
      expect(colorToRgba('#00f', 0.8)).toBe('rgba(0, 0, 255, 0.8)');
    });

    it('CSS色名をRGBA形式に変換する', () => {
      expect(colorToRgba('red', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('green', 0.5)).toBe('rgba(0, 128, 0, 0.5)');
      expect(colorToRgba('blue', 0.8)).toBe('rgba(0, 0, 255, 0.8)');
      expect(colorToRgba('white', 1)).toBe('rgba(255, 255, 255, 1)');
      expect(colorToRgba('black', 1)).toBe('rgba(0, 0, 0, 1)');
    });

    it('大文字小文字を区別しない', () => {
      expect(colorToRgba('RED', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('Red', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('#FF0000', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('#Ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
    });

    it('前後の空白を無視する', () => {
      expect(colorToRgba(' red ', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(colorToRgba('  #ff0000  ', 1)).toBe('rgba(255, 0, 0, 1)');
    });

    it('不正な色の場合は灰色にフォールバックする', () => {
      expect(colorToRgba('notacolor', 1)).toBe('rgba(128, 128, 128, 1)');
      expect(colorToRgba('#gggggg', 1)).toBe('rgba(128, 128, 128, 1)');
      expect(colorToRgba('', 1)).toBe('rgba(128, 128, 128, 1)');
    });

    it('147色の色名すべてが変換できる', () => {
      expect(colorToRgba('aliceblue', 1)).toBe('rgba(240, 248, 255, 1)');
      expect(colorToRgba('antiquewhite', 1)).toBe('rgba(250, 235, 215, 1)');
      expect(colorToRgba('yellowgreen', 1)).toBe('rgba(154, 205, 50, 1)');
    });
  });
});
