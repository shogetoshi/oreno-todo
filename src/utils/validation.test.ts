import { describe, it, expect } from 'vitest';
import { validateTodo, validateTodos } from './validation';

describe('validation', () => {
  describe('validateTodo', () => {
    describe('正常系', () => {
      it('正しいTodoオブジェクト（最小構成）をバリデーションできる', () => {
        const validTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null
        };
        expect(validateTodo(validTodo)).toBe(true);
      });

      it('完了済みTodoをバリデーションできる', () => {
        const completedTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Completed task',
          completedAt: '2025-01-15 12:34:56'
        };
        expect(validateTodo(completedTodo)).toBe(true);
      });

      it('オプショナルプロパティ（createdAt, updatedAt）を含むTodoをバリデーションできる', () => {
        const todoWithTimestamps = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Task with timestamps',
          completedAt: null,
          createdAt: '2025-01-15 10:00:00',
          updatedAt: '2025-01-15 12:00:00'
        };
        expect(validateTodo(todoWithTimestamps)).toBe(true);
      });

      it('空のtimeRanges配列を含むTodoをバリデーションできる', () => {
        const todoWithEmptyTimeRanges = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Task with empty timeRanges',
          completedAt: null,
          timeRanges: []
        };
        expect(validateTodo(todoWithEmptyTimeRanges)).toBe(true);
      });

      it('timeRanges配列（endがnull）を含むTodoをバリデーションできる', () => {
        const todoWithRunningTimer = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Task with running timer',
          completedAt: null,
          timeRanges: [
            { start: '2025-01-15 10:00:00', end: null }
          ]
        };
        expect(validateTodo(todoWithRunningTimer)).toBe(true);
      });

      it('timeRanges配列（endが文字列）を含むTodoをバリデーションできる', () => {
        const todoWithCompletedTimer = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Task with completed timer',
          completedAt: null,
          timeRanges: [
            { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' }
          ]
        };
        expect(validateTodo(todoWithCompletedTimer)).toBe(true);
      });

      it('複数のtimeRangesを含むTodoをバリデーションできる', () => {
        const todoWithMultipleTimeRanges = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Task with multiple timers',
          completedAt: null,
          timeRanges: [
            { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' },
            { start: '2025-01-15 14:00:00', end: '2025-01-15 15:30:00' },
            { start: '2025-01-15 16:00:00', end: null }
          ]
        };
        expect(validateTodo(todoWithMultipleTimeRanges)).toBe(true);
      });

      it('空文字列のtaskcodeを含むTodoをバリデーションできる', () => {
        const todoWithEmptyTaskcode = {
          id: '123',
          taskcode: '',
          text: 'Task without taskcode',
          completedAt: null
        };
        expect(validateTodo(todoWithEmptyTaskcode)).toBe(true);
      });

      it('空文字列のtextを含むTodoをバリデーションできる', () => {
        const todoWithEmptyText = {
          id: '123',
          taskcode: 'TASK-001',
          text: '',
          completedAt: null
        };
        expect(validateTodo(todoWithEmptyText)).toBe(true);
      });

      it('追加のプロパティを含むTodoをバリデーションできる', () => {
        const todoWithExtraProps = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Task with extra props',
          completedAt: null,
          customField: 'custom value',
          anotherField: 42
        };
        expect(validateTodo(todoWithExtraProps)).toBe(true);
      });
    });

    describe('異常系 - 型が間違っている', () => {
      it('nullを渡すとfalseを返す', () => {
        expect(validateTodo(null)).toBe(false);
      });

      it('undefinedを渡すとfalseを返す', () => {
        expect(validateTodo(undefined)).toBe(false);
      });

      it('オブジェクト以外（文字列）を渡すとfalseを返す', () => {
        expect(validateTodo('not an object')).toBe(false);
      });

      it('オブジェクト以外（数値）を渡すとfalseを返す', () => {
        expect(validateTodo(123)).toBe(false);
      });

      it('オブジェクト以外（配列）を渡すとfalseを返す', () => {
        expect(validateTodo([])).toBe(false);
      });
    });

    describe('異常系 - 必須プロパティが欠けている', () => {
      it('idが欠けているとfalseを返す', () => {
        const invalidTodo = {
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('taskcodeが欠けているとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          text: 'Sample task',
          completedAt: null
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('textが欠けているとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          completedAt: null
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('completedAtが欠けているとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task'
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });
    });

    describe('異常系 - プロパティの型が間違っている', () => {
      it('idが数値だとfalseを返す', () => {
        const invalidTodo = {
          id: 123,
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('taskcodeが数値だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 123,
          text: 'Sample task',
          completedAt: null
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('textが数値だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 123,
          completedAt: null
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('completedAtが真偽値だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: true
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('createdAtが数値だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          createdAt: 1234567890
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('updatedAtがオブジェクトだとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          updatedAt: {}
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });
    });

    describe('異常系 - timeRangesの検証', () => {
      it('timeRangesが配列でないとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: 'not an array'
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('timeRangesの要素がオブジェクトでないとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: ['not an object']
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('timeRangesの要素にstartが欠けているとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: [{ end: null }]
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('timeRangesの要素にendが欠けているとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: [{ start: '2025-01-15 10:00:00' }]
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('timeRangesのstartが数値だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: [{ start: 1234567890, end: null }]
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('timeRangesのendが数値だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: [{ start: '2025-01-15 10:00:00', end: 1234567890 }]
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });

      it('複数のtimeRanges要素のうち1つでも不正だとfalseを返す', () => {
        const invalidTodo = {
          id: '123',
          taskcode: 'TASK-001',
          text: 'Sample task',
          completedAt: null,
          timeRanges: [
            { start: '2025-01-15 10:00:00', end: '2025-01-15 11:00:00' },
            { start: 123, end: null }, // 不正
            { start: '2025-01-15 16:00:00', end: null }
          ]
        };
        expect(validateTodo(invalidTodo)).toBe(false);
      });
    });
  });

  describe('validateTodos', () => {
    describe('正常系', () => {
      it('空の配列をバリデーションできる', () => {
        expect(validateTodos([])).toBe(true);
      });

      it('正しいTodo配列をバリデーションできる', () => {
        const validTodos = [
          {
            id: '1',
            taskcode: 'TASK-001',
            text: 'First task',
            completedAt: null
          },
          {
            id: '2',
            taskcode: 'TASK-002',
            text: 'Second task',
            completedAt: '2025-01-15 12:00:00'
          }
        ];
        expect(validateTodos(validTodos)).toBe(true);
      });

      it('オプショナルプロパティを含む複数のTodoをバリデーションできる', () => {
        const validTodos = [
          {
            id: '1',
            taskcode: 'TASK-001',
            text: 'Task with all fields',
            completedAt: null,
            createdAt: '2025-01-15 10:00:00',
            updatedAt: '2025-01-15 12:00:00',
            timeRanges: [
              { start: '2025-01-15 10:30:00', end: '2025-01-15 11:30:00' }
            ]
          },
          {
            id: '2',
            taskcode: '',
            text: 'Minimal task',
            completedAt: null
          }
        ];
        expect(validateTodos(validTodos)).toBe(true);
      });

      it('多数のTodoを含む配列をバリデーションできる', () => {
        const largeTodoList = Array.from({ length: 100 }, (_, i) => ({
          id: `id-${i}`,
          taskcode: `TASK-${String(i).padStart(3, '0')}`,
          text: `Task number ${i}`,
          completedAt: i % 2 === 0 ? null : '2025-01-15 12:00:00'
        }));
        expect(validateTodos(largeTodoList)).toBe(true);
      });
    });

    describe('異常系', () => {
      it('nullを渡すとfalseを返す', () => {
        expect(validateTodos(null)).toBe(false);
      });

      it('undefinedを渡すとfalseを返す', () => {
        expect(validateTodos(undefined)).toBe(false);
      });

      it('配列以外（オブジェクト）を渡すとfalseを返す', () => {
        expect(validateTodos({})).toBe(false);
      });

      it('配列以外（文字列）を渡すとfalseを返す', () => {
        expect(validateTodos('not an array')).toBe(false);
      });

      it('配列以外（数値）を渡すとfalseを返す', () => {
        expect(validateTodos(123)).toBe(false);
      });

      it('不正なTodoを含む配列だとfalseを返す', () => {
        const invalidTodos = [
          {
            id: '1',
            taskcode: 'TASK-001',
            text: 'Valid task',
            completedAt: null
          },
          {
            id: '2',
            taskcode: 'TASK-002',
            // textが欠けている
            completedAt: null
          }
        ];
        expect(validateTodos(invalidTodos)).toBe(false);
      });

      it('すべての要素が不正だとfalseを返す', () => {
        const invalidTodos = [
          { id: '1', text: 'Missing taskcode and completedAt' },
          { taskcode: 'TASK-002', text: 'Missing id and completedAt' }
        ];
        expect(validateTodos(invalidTodos)).toBe(false);
      });

      it('プリミティブ値の配列だとfalseを返す', () => {
        expect(validateTodos([1, 2, 3])).toBe(false);
        expect(validateTodos(['a', 'b', 'c'])).toBe(false);
        expect(validateTodos([true, false])).toBe(false);
      });

      it('null要素を含む配列だとfalseを返す', () => {
        const invalidTodos = [
          {
            id: '1',
            taskcode: 'TASK-001',
            text: 'Valid task',
            completedAt: null
          },
          null
        ];
        expect(validateTodos(invalidTodos)).toBe(false);
      });

      it('undefined要素を含む配列だとfalseを返す', () => {
        const invalidTodos = [
          {
            id: '1',
            taskcode: 'TASK-001',
            text: 'Valid task',
            completedAt: null
          },
          undefined
        ];
        expect(validateTodos(invalidTodos)).toBe(false);
      });
    });
  });
});
