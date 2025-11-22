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
        '2025-01-16 15:00:00'
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
        null
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
      expect(event.getStartTime()).toBe('2023-11-01T10:00:00+09:00');
      expect(event.getEndTime()).toBe('2023-11-01T11:00:00+09:00');
      expect(event.isCompleted()).toBe(false);
      expect(event.getId()).toMatch(/^cal-/);
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
        null
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
        null
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
        '2025-01-15 11:00:00'
      );

      expect(event.getTotalExecutionTimeInMinutes()).toBe(60);
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
        null
      );

      expect(event.getTotalExecutionTimeInMinutes()).toBe(0);
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
        '2025-01-16 15:00:00'
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

    it('fromJSON -> toJSON で元のJSONと同じになる', () => {
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

      expect(json).toEqual(original);
    });
  });
});
