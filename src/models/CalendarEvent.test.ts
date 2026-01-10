import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarEvent } from './CalendarEvent';
import { ListItemType } from './ListItem';
import { CalendarEvent as GoogleCalendarEvent } from '../types/calendar';

describe('CalendarEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z')); // JST: 2025-01-15 12:34:56
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('すべてのプロパティを持つCalendarEventインスタンスを作成できる', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        []
      );

      expect(event.getId()).toBe('cal-123');
      expect(event.getType()).toBe(ListItemType.CALENDAR_EVENT);
      expect(event.getTaskcode()).toBe('');
      expect(event.getText()).toBe('ミーティング');
      expect(event.isCompleted()).toBe(false);
      expect(event.getStartTime()).toBe('2025-01-16 14:00:00');
      expect(event.getEndTime()).toBe('2025-01-16 15:00:00');
    });
  });

  describe('getType', () => {
    it('CALENDAR_EVENTタイプを返す', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'イベント',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        null,
        null,
        null,
        []
      );

      expect(event.getType()).toBe(ListItemType.CALENDAR_EVENT);
      expect(event.getType()).toBe('calendar_event');
    });
  });

  describe('fromGoogleCalendarEvent', () => {
    it('GoogleカレンダーイベントからCalendarEventを生成できる', () => {
      const googleEvent: GoogleCalendarEvent = {
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

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      expect(event.getText()).toBe('週次定例ミーティング');
      expect(event.getStartTime()).toBe('2023-11-01 10:00:00');
      expect(event.getEndTime()).toBe('2023-11-01 11:00:00');
      expect(event.isCompleted()).toBe(false);
      expect(event.getId()).toMatch(/^cal-/);
    });

    it('startTimeとendTimeがJSTフォーマット（YYYY-MM-DD HH:MI:SS）に変換される', () => {
      const googleEvent: GoogleCalendarEvent = {
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
          dateTime: '2023-11-01T10:00:00+09:00',
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: '2023-11-01T11:30:00+09:00',
          timeZone: 'Asia/Tokyo'
        },
        iCalUID: '12345abcde67890fghij12345@google.com',
        sequence: 0,
        eventType: 'default'
      };

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      // ISO 8601形式からJSTフォーマットに変換されていることを確認
      expect(event.getStartTime()).toBe('2023-11-01 10:00:00');
      expect(event.getEndTime()).toBe('2023-11-01 11:30:00');
      expect(event.getStartTime()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(event.getEndTime()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('createdAtとupdatedAtがJSTフォーマット（YYYY-MM-DD HH:MI:SS）に変換される', () => {
      const googleEvent: GoogleCalendarEvent = {
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

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      // ISO 8601 UTC形式からJSTフォーマットに変換されていることを確認
      expect(event.createdAt).toBe('2023-10-20 18:00:00');
      expect(event.updatedAt).toBe('2023-10-20 18:30:00');
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(event.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('終日イベント（dateのみ）を正しく変換できる', () => {
      const googleEvent: GoogleCalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: '終日イベント',
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
        iCalUID: '12345abcde67890fghij12345@google.com',
        sequence: 0,
        eventType: 'default'
      };

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      // 日付のみの場合は 09:00:00 (UTC 00:00:00 -> JST 09:00:00) として変換される
      expect(event.getStartTime()).toBe('2023-11-05 09:00:00');
      expect(event.getEndTime()).toBe('2023-11-06 09:00:00');
    });

    it('同じGoogleイベントからは常に同じIDが生成される', () => {
      const googleEvent: GoogleCalendarEvent = {
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

      const event1 = CalendarEvent.fromGoogleCalendarEvent(googleEvent);
      const event2 = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      expect(event1.getId()).toBe(event2.getId());
    });

    it('taskcode引数を指定すると、そのtaskcodeが設定される', () => {
      const googleEvent: GoogleCalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: 'ProjectA ミーティング',
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

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent, 'TASK-001');

      expect(event.getTaskcode()).toBe('TASK-001');
    });

    it('taskcode引数を指定しない場合は空文字列が設定される', () => {
      const googleEvent: GoogleCalendarEvent = {
        kind: 'calendar#event',
        etag: '"3123456789012345"',
        id: '12345abcde67890fghij12345',
        status: 'confirmed',
        htmlLink: 'https://www.google.com/calendar/event?eid=xxxxxxxx',
        created: '2023-10-20T09:00:00.000Z',
        updated: '2023-10-20T09:30:00.000Z',
        summary: 'ミーティング',
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

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      expect(event.getTaskcode()).toBe('');
    });
  });

  describe('toggleCompleted', () => {
    it('完了状態を切り替えられる', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'イベント',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        null,
        null,
        null,
        []
      );

      const completed = event.toggleCompleted();
      expect(completed.isCompleted()).toBe(true);
      expect(completed.getCompletedAt()).toBe('2025-01-15 12:34:56');

      const uncompleted = completed.toggleCompleted();
      expect(uncompleted.isCompleted()).toBe(false);
      expect(uncompleted.getCompletedAt()).toBe(null);
    });
  });

  describe('タイマー機能', () => {
    it('タイマーは常に停止状態（CalendarEventではタイマー機能を使用しない）', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'イベント',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        null,
        null,
        null,
        []
      );

      expect(event.isTimerRunning()).toBe(false);

      const withTimer = event.startTimer();
      expect(withTimer.isTimerRunning()).toBe(false);

      const stopped = event.stopTimer();
      expect(stopped.isTimerRunning()).toBe(false);
    });

    it('startTimeとendTimeから実行時間を計算できる', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'イベント',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-15 11:00:00',
        null,
        []
      );

      expect(event.getTotalExecutionTimeInSeconds()).toBe(3600);
    });

    it('startTimeまたはendTimeがnullの場合は0を返す', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'イベント',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        null,
        null,
        null,
        []
      );

      expect(event.getTotalExecutionTimeInSeconds()).toBe(0);
    });
  });

  describe('toJSON', () => {
    it('JSON形式に変換できる', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        []
      );

      const json = event.toJSON();

      expect(json.id).toBe('cal-123');
      expect(json.type).toBe('calendar_event');
      expect(json.text).toBe('ミーティング');
      expect(json.startTime).toBe('2025-01-16 14:00:00');
      expect(json.endTime).toBe('2025-01-16 15:00:00');
    });
  });

  describe('fromJSON', () => {
    it('JSONからCalendarEventを復元できる', () => {
      const json = {
        id: 'cal-123',
        type: 'calendar_event',
        taskcode: '',
        text: 'ミーティング',
        completedAt: null,
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 10:00:00',
        startTime: '2025-01-16 14:00:00',
        endTime: '2025-01-16 15:00:00'
      };

      const event = CalendarEvent.fromJSON(json);

      expect(event.getId()).toBe('cal-123');
      expect(event.getText()).toBe('ミーティング');
      expect(event.getStartTime()).toBe('2025-01-16 14:00:00');
      expect(event.getEndTime()).toBe('2025-01-16 15:00:00');
    });

    it('fromJSON -> toJSON で元のJSONと同じになる（timeRangesが追加される）', () => {
      const original = {
        id: 'cal-123',
        type: 'calendar_event',
        taskcode: '',
        text: 'ミーティング',
        completedAt: null,
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 10:00:00',
        startTime: '2025-01-16 14:00:00',
        endTime: '2025-01-16 15:00:00'
      };

      const event = CalendarEvent.fromJSON(original);
      const json = event.toJSON();

      // timeRangesフィールドとmeetingUrlフィールドが追加されることを期待
      expect(json).toEqual({
        ...original,
        timeRanges: [],
        meetingUrl: null
      });
    });
  });

  describe('timeRanges管理', () => {
    it('完了時にstartTime/endTimeからTimeRangeが追加される', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        []
      );

      const completed = event.setCompleted(true);

      expect(completed.timeRanges).toHaveLength(1);
      expect(completed.timeRanges[0].start).toBe('2025-01-16 14:00:00');
      expect(completed.timeRanges[0].end).toBe('2025-01-16 15:00:00');
    });

    it('完了解除時にtimeRangesが空配列にリセットされる', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        [{ start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }]
      );

      const uncompleted = event.setCompleted(false);

      expect(uncompleted.timeRanges).toHaveLength(0);
      expect(uncompleted.timeRanges).toEqual([]);
    });

    it('toggleCompleted()で完了時にtimeRangeが追加される', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        []
      );

      const completed = event.toggleCompleted();

      expect(completed.timeRanges).toHaveLength(1);
      expect(completed.timeRanges[0].start).toBe('2025-01-16 14:00:00');
      expect(completed.timeRanges[0].end).toBe('2025-01-16 15:00:00');
    });

    it('toggleCompleted()で完了解除時にtimeRangesが削除される', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        '2025-01-15 12:34:56',
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        [{ start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }]
      );

      const uncompleted = event.toggleCompleted();

      expect(uncompleted.timeRanges).toHaveLength(0);
    });

    it('startTimeがnullの場合、完了してもtimeRangesは空のまま', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        null,
        '2025-01-16 15:00:00',
        null,
        []
      );

      const completed = event.setCompleted(true);

      expect(completed.timeRanges).toHaveLength(0);
      expect(completed.isCompleted()).toBe(true);
    });

    it('endTimeがnullの場合、完了してもtimeRangesは空のまま', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        null,
        null,
        []
      );

      const completed = event.setCompleted(true);

      expect(completed.timeRanges).toHaveLength(0);
      expect(completed.isCompleted()).toBe(true);
    });

    it('startTime/endTimeが両方nullの場合、完了してもtimeRangesは空のまま', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        null,
        null,
        null,
        []
      );

      const completed = event.setCompleted(true);

      expect(completed.timeRanges).toHaveLength(0);
      expect(completed.isCompleted()).toBe(true);
    });

    it('完了→完了解除→完了のサイクルでtimeRangesが正しく管理される', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        []
      );

      // 最初の完了
      const completed1 = event.setCompleted(true);
      expect(completed1.timeRanges).toHaveLength(1);

      // 完了解除
      const uncompleted = completed1.setCompleted(false);
      expect(uncompleted.timeRanges).toHaveLength(0);

      // 再度完了
      const completed2 = uncompleted.setCompleted(true);
      expect(completed2.timeRanges).toHaveLength(1);
      expect(completed2.timeRanges[0].start).toBe('2025-01-16 14:00:00');
      expect(completed2.timeRanges[0].end).toBe('2025-01-16 15:00:00');
    });

    it('setText()でtimeRangesが保持される', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        [{ start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }]
      );

      const updated = event.setText('新しいタイトル');

      expect(updated.timeRanges).toHaveLength(1);
      expect(updated.timeRanges[0].start).toBe('2025-01-16 14:00:00');
    });

    it('setTaskcode()でtimeRangesが保持される', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        [{ start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }]
      );

      const updated = event.setTaskcode('ABC-123');

      expect(updated.timeRanges).toHaveLength(1);
      expect(updated.timeRanges[0].start).toBe('2025-01-16 14:00:00');
    });

    it('fromGoogleCalendarEvent()で生成されたCalendarEventのtimeRangesは空配列', () => {
      const googleEvent: GoogleCalendarEvent = {
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

      const event = CalendarEvent.fromGoogleCalendarEvent(googleEvent);

      expect(event.timeRanges).toHaveLength(0);
      expect(event.timeRanges).toEqual([]);
    });

    it('fromJSON()でtimeRangesを正しく復元できる', () => {
      const json = {
        id: 'cal-123',
        type: 'calendar_event',
        taskcode: '',
        text: 'ミーティング',
        completedAt: '2025-01-15 12:34:56',
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 12:34:56',
        startTime: '2025-01-16 14:00:00',
        endTime: '2025-01-16 15:00:00',
        timeRanges: [{ start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }]
      };

      const event = CalendarEvent.fromJSON(json);

      expect(event.timeRanges).toHaveLength(1);
      expect(event.timeRanges[0].start).toBe('2025-01-16 14:00:00');
      expect(event.timeRanges[0].end).toBe('2025-01-16 15:00:00');
    });

    it('fromJSON()でtimeRangesがない場合は空配列になる', () => {
      const json = {
        id: 'cal-123',
        type: 'calendar_event',
        taskcode: '',
        text: 'ミーティング',
        completedAt: null,
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 10:00:00',
        startTime: '2025-01-16 14:00:00',
        endTime: '2025-01-16 15:00:00'
      };

      const event = CalendarEvent.fromJSON(json);

      expect(event.timeRanges).toHaveLength(0);
      expect(event.timeRanges).toEqual([]);
    });

    it('toJSON()でtimeRangesを正しくシリアライズできる', () => {
      const event = new CalendarEvent(
        'cal-123',
        '',
        'ミーティング',
        '2025-01-15 12:34:56',
        '2025-01-15 10:00:00',
        '2025-01-15 12:34:56',
        '2025-01-16 14:00:00',
        '2025-01-16 15:00:00',
        null,
        [{ start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }]
      );

      const json = event.toJSON();

      expect(json.timeRanges).toHaveLength(1);
      expect(json.timeRanges[0].start).toBe('2025-01-16 14:00:00');
      expect(json.timeRanges[0].end).toBe('2025-01-16 15:00:00');
    });

    it('fromJSON() -> toJSON()のラウンドトリップでtimeRangesが保持される', () => {
      const original = {
        id: 'cal-123',
        type: 'calendar_event',
        taskcode: '',
        text: 'ミーティング',
        completedAt: '2025-01-15 12:34:56',
        createdAt: '2025-01-15 10:00:00',
        updatedAt: '2025-01-15 12:34:56',
        startTime: '2025-01-16 14:00:00',
        endTime: '2025-01-16 15:00:00',
        meetingUrl: null,
        timeRanges: [
          { start: '2025-01-16 14:00:00', end: '2025-01-16 15:00:00' }
        ]
      };

      const event = CalendarEvent.fromJSON(original);
      const json = event.toJSON();

      expect(json).toEqual(original);
      expect(json.timeRanges).toEqual(original.timeRanges);
    });
  });

  describe('getExecutionTimeForDate', () => {
    it('指定日付に実行時間がない場合は0を返す', () => {
      const event = new CalendarEvent(
        'test-id',
        '',
        'Test event',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 11:00:00',
        null,
        []
      );

      const result = event.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(0);
    });

    it('指定日付の実行時間を正しく計算する', () => {
      const event = new CalendarEvent(
        'test-id',
        '',
        'Test event',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 11:00:00',
        null,
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:30:00' // 5400秒
          }
        ]
      );

      const result = event.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(5400);
    });

    it('複数のtimeRangesがある場合は合計時間を返す', () => {
      const event = new CalendarEvent(
        'test-id',
        '',
        'Test event',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 11:00:00',
        null,
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

      const result = event.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(9000);
    });

    it('異なる日付のtimeRangesは除外する', () => {
      const event = new CalendarEvent(
        'test-id',
        '',
        'Test event',
        null,
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 10:00:00',
        '2025-11-28 11:00:00',
        null,
        [
          {
            start: '2025-11-28 10:00:00',
            end: '2025-11-28 11:00:00' // 3600秒(2025-11-28)
          },
          {
            start: '2025-11-29 14:00:00',
            end: '2025-11-29 15:00:00' // 3600秒(2025-11-29)
          }
        ]
      );

      const result = event.getExecutionTimeForDate('2025-11-28');
      expect(result).toBe(3600);

      const result2 = event.getExecutionTimeForDate('2025-11-29');
      expect(result2).toBe(3600);
    });

    it('endがnullの場合は現在時刻までの時間を計算する', () => {
      // 固定時刻: 2025-01-15 12:34:56(vitest beforeEachで設定済み)
      const event = new CalendarEvent(
        'test-id',
        '',
        'Test event',
        null,
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-15 10:00:00',
        '2025-01-15 11:00:00',
        null,
        [
          {
            start: '2025-01-15 10:00:00',
            end: null
          }
        ]
      );

      // 10:00:00 から 12:34:56 まで = 9296秒
      const result = event.getExecutionTimeForDate('2025-01-15');
      expect(result).toBe(9296);
    });
  });
});
