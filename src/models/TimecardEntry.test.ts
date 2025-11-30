import { describe, it, expect } from 'vitest';
import { TimecardEntry } from './TimecardEntry';

describe('TimecardEntry', () => {
  describe('fromJSON', () => {
    it('正常なJSONから生成できる', () => {
      const json = {
        type: 'start' as const,
        time: '2024-10-18 10:59:00',
      };
      const entry = TimecardEntry.fromJSON(json);
      expect(entry.type).toBe('start');
      expect(entry.time).toBe('2024-10-18 10:59:00');
    });

    it('typeが"end"の場合も正常に生成できる', () => {
      const json = {
        type: 'end' as const,
        time: '2024-10-18 19:15:00',
      };
      const entry = TimecardEntry.fromJSON(json);
      expect(entry.type).toBe('end');
      expect(entry.time).toBe('2024-10-18 19:15:00');
    });

    it('typeが不正な場合はエラーをスローする', () => {
      const json = {
        type: 'invalid' as any,
        time: '2024-10-18 10:59:00',
      };
      expect(() => TimecardEntry.fromJSON(json)).toThrow('type は "start" または "end" である必要があります');
    });

    it('timeが不正な場合はエラーをスローする', () => {
      const json = {
        type: 'start' as const,
        time: null as any,
      };
      expect(() => TimecardEntry.fromJSON(json)).toThrow('time は文字列である必要があります');
    });
  });

  describe('toJSON', () => {
    it('JSONオブジェクトに変換できる', () => {
      const entry = new TimecardEntry('start', '2024-10-18 10:59:00');
      const json = entry.toJSON();
      expect(json).toEqual({
        type: 'start',
        time: '2024-10-18 10:59:00',
      });
    });
  });

  describe('setTime', () => {
    it('時刻を変更した新しいインスタンスを返す', () => {
      const entry = new TimecardEntry('start', '2024-10-18 10:59:00');
      const newEntry = entry.setTime('2024-10-18 11:00:00');
      expect(newEntry.time).toBe('2024-10-18 11:00:00');
      expect(newEntry.type).toBe('start');
      expect(entry.time).toBe('2024-10-18 10:59:00'); // 元のインスタンスは不変
    });
  });

  describe('setType', () => {
    it('タイプを変更した新しいインスタンスを返す', () => {
      const entry = new TimecardEntry('start', '2024-10-18 10:59:00');
      const newEntry = entry.setType('end');
      expect(newEntry.type).toBe('end');
      expect(newEntry.time).toBe('2024-10-18 10:59:00');
      expect(entry.type).toBe('start'); // 元のインスタンスは不変
    });
  });
});
