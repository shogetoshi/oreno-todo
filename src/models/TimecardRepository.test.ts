import { describe, it, expect, vi } from 'vitest';
import { TimecardRepository, TimecardData } from './TimecardRepository';
import { TimecardEntry } from './TimecardEntry';

// timeFormat.tsのモック
vi.mock('../utils/timeFormat', () => ({
  getCurrentJSTTime: vi.fn(() => '2024-10-18 10:59:00'),
}));

describe('TimecardRepository', () => {
  describe('createCheckInEntry', () => {
    it('現在時刻でstartエントリを作成する', () => {
      const entry = TimecardRepository.createCheckInEntry();
      expect(entry.type).toBe('start');
      expect(entry.time).toBe('2024-10-18 10:59:00');
    });
  });

  describe('createCheckOutEntry', () => {
    it('現在時刻でendエントリを作成する', () => {
      const entry = TimecardRepository.createCheckOutEntry();
      expect(entry.type).toBe('end');
      expect(entry.time).toBe('2024-10-18 10:59:00');
    });
  });

  describe('addCheckIn', () => {
    it('空のデータにチェックインを追加できる', () => {
      const data: TimecardData = {};
      const newData = TimecardRepository.addCheckIn(data);
      expect(newData['2024-10-18']).toHaveLength(1);
      expect(newData['2024-10-18'][0].type).toBe('start');
    });

    it('既存の日付にチェックインを追加できる', () => {
      const data: TimecardData = {
        '2024-10-18': [new TimecardEntry('start', '2024-10-18 09:00:00')],
      };
      const newData = TimecardRepository.addCheckIn(data);
      expect(newData['2024-10-18']).toHaveLength(2);
      expect(newData['2024-10-18'][1].type).toBe('start');
    });

    it('指定した日付にチェックインを追加できる', () => {
      const data: TimecardData = {};
      const newData = TimecardRepository.addCheckIn(data, '2024-10-19');
      expect(newData['2024-10-19']).toHaveLength(1);
      expect(newData['2024-10-19'][0].type).toBe('start');
    });
  });

  describe('addCheckOut', () => {
    it('空のデータにチェックアウトを追加できる', () => {
      const data: TimecardData = {};
      const newData = TimecardRepository.addCheckOut(data);
      expect(newData['2024-10-18']).toHaveLength(1);
      expect(newData['2024-10-18'][0].type).toBe('end');
    });

    it('既存の日付にチェックアウトを追加できる', () => {
      const data: TimecardData = {
        '2024-10-18': [new TimecardEntry('start', '2024-10-18 09:00:00')],
      };
      const newData = TimecardRepository.addCheckOut(data);
      expect(newData['2024-10-18']).toHaveLength(2);
      expect(newData['2024-10-18'][1].type).toBe('end');
    });
  });

  describe('deleteEntry', () => {
    it('指定されたインデックスのエントリを削除できる', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 18:00:00'),
        ],
      };
      const newData = TimecardRepository.deleteEntry(data, '2024-10-18', 0);
      expect(newData['2024-10-18']).toHaveLength(1);
      expect(newData['2024-10-18'][0].type).toBe('end');
    });

    it('エントリが空になった場合は日付自体を削除する', () => {
      const data: TimecardData = {
        '2024-10-18': [new TimecardEntry('start', '2024-10-18 09:00:00')],
      };
      const newData = TimecardRepository.deleteEntry(data, '2024-10-18', 0);
      expect(newData['2024-10-18']).toBeUndefined();
    });
  });

  describe('updateEntry', () => {
    it('指定されたインデックスのエントリを更新できる', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 18:00:00'),
        ],
      };
      const newEntry = new TimecardEntry('start', '2024-10-18 10:00:00');
      const newData = TimecardRepository.updateEntry(data, '2024-10-18', 0, newEntry);
      expect(newData['2024-10-18'][0].time).toBe('2024-10-18 10:00:00');
    });
  });

  describe('fromJSON / toJSON', () => {
    it('JSONからタイムカードデータを復元できる', () => {
      const json = {
        '2024-10-18': [
          { type: 'start' as const, time: '2024-10-18 09:00:00' },
          { type: 'end' as const, time: '2024-10-18 18:00:00' },
        ],
      };
      const data = TimecardRepository.fromJSON(json);
      expect(data['2024-10-18']).toHaveLength(2);
      expect(data['2024-10-18'][0]).toBeInstanceOf(TimecardEntry);
    });

    it('タイムカードデータをJSONに変換できる', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 18:00:00'),
        ],
      };
      const json = TimecardRepository.toJSON(data);
      expect(json['2024-10-18']).toHaveLength(2);
      expect(json['2024-10-18'][0]).toEqual({ type: 'start', time: '2024-10-18 09:00:00' });
    });
  });

  describe('fromJsonText / toJsonText', () => {
    it('JSON文字列からタイムカードデータを復元できる', () => {
      const jsonText = '{"2024-10-18":[{"type":"start","time":"2024-10-18 09:00:00"}]}';
      const data = TimecardRepository.fromJsonText(jsonText);
      expect(data['2024-10-18']).toHaveLength(1);
    });

    it('タイムカードデータをJSON文字列に変換できる', () => {
      const data: TimecardData = {
        '2024-10-18': [new TimecardEntry('start', '2024-10-18 09:00:00')],
      };
      const jsonText = TimecardRepository.toJsonText(data, false);
      expect(jsonText).toBe('{"2024-10-18":[{"type":"start","time":"2024-10-18 09:00:00"}]}');
    });
  });

  describe('getSortedDates', () => {
    it('日付を降順でソートして返す', () => {
      const data: TimecardData = {
        '2024-10-16': [],
        '2024-10-18': [],
        '2024-10-17': [],
      };
      const dates = TimecardRepository.getSortedDates(data);
      expect(dates).toEqual(['2024-10-18', '2024-10-17', '2024-10-16']);
    });
  });

  describe('calculateWorkingTimeForDate', () => {
    it('稼働がない場合はnullを返す', () => {
      const data: TimecardData = {};
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      expect(workingTime).toBe(null);
    });

    it('1つのstart-endペアで正しく計算できる', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 18:00:00'),
        ],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      // 9:00-18:00 = 9時間 = 540分
      expect(workingTime).toBe(540);
    });

    it('複数のstart-endペアで合計を計算できる', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 12:00:00'),
          new TimecardEntry('start', '2024-10-18 13:00:00'),
          new TimecardEntry('end', '2024-10-18 18:00:00'),
        ],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      // 9:00-12:00 = 3時間 = 180分
      // 13:00-18:00 = 5時間 = 300分
      // 合計 = 480分
      expect(workingTime).toBe(480);
    });

    it('ペアになっていないstartがある場合、現在時刻までを計算する（旧テスト、拡張版に移動）', () => {
      // このテストは新しい仕様では「最後がstartで終わる場合、現在時刻までを計算する」に該当
      // システム時刻をモック: 2024-10-18 10:59:00
      vi.setSystemTime(new Date('2024-10-18 10:59:00'));

      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 10:00:00'),
          new TimecardEntry('start', '2024-10-18 10:30:00'),
          // 最後のstartから現在時刻(10:59:00)まで = 29分
        ],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      // 9:00-10:00 = 60分
      // 10:30-10:59 = 29分
      // 合計 = 89分
      expect(workingTime).toBe(89);

      // モックをリセット
      vi.useRealTimers();
    });

    it('エントリが存在しない日付ではnullを返す', () => {
      const data: TimecardData = {
        '2024-10-18': [new TimecardEntry('start', '2024-10-18 09:00:00')],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-19');
      expect(workingTime).toBe(null);
    });
  });

  describe('validateTimecardEntries', () => {
    it('正常なstart-endペアの場合はtrueを返す', () => {
      const entries = [
        new TimecardEntry('start', '2024-10-18 09:00:00'),
        new TimecardEntry('end', '2024-10-18 12:00:00'),
        new TimecardEntry('start', '2024-10-18 13:00:00'),
        new TimecardEntry('end', '2024-10-18 18:00:00'),
      ];
      expect(TimecardRepository.validateTimecardEntries(entries)).toBe(true);
    });

    it('最後がstartで終わる場合はtrueを返す', () => {
      const entries = [
        new TimecardEntry('start', '2024-10-18 09:00:00'),
        new TimecardEntry('end', '2024-10-18 12:00:00'),
        new TimecardEntry('start', '2024-10-18 13:00:00'),
      ];
      expect(TimecardRepository.validateTimecardEntries(entries)).toBe(true);
    });

    it('空配列の場合はfalseを返す', () => {
      expect(TimecardRepository.validateTimecardEntries([])).toBe(false);
    });

    it('startが連続する場合はfalseを返す', () => {
      const entries = [
        new TimecardEntry('start', '2024-10-18 09:00:00'),
        new TimecardEntry('start', '2024-10-18 10:00:00'),
      ];
      expect(TimecardRepository.validateTimecardEntries(entries)).toBe(false);
    });

    it('endから始まる場合はfalseを返す', () => {
      const entries = [
        new TimecardEntry('end', '2024-10-18 12:00:00'),
        new TimecardEntry('start', '2024-10-18 13:00:00'),
      ];
      expect(TimecardRepository.validateTimecardEntries(entries)).toBe(false);
    });

    it('endが連続する場合はfalseを返す', () => {
      const entries = [
        new TimecardEntry('start', '2024-10-18 09:00:00'),
        new TimecardEntry('end', '2024-10-18 12:00:00'),
        new TimecardEntry('end', '2024-10-18 13:00:00'),
      ];
      expect(TimecardRepository.validateTimecardEntries(entries)).toBe(false);
    });
  });

  describe('calculateWorkingTimeForDate - 拡張版', () => {
    it('最後がstartで終わる場合、現在時刻までを計算する', () => {
      // システム時刻をモック: 2024-10-18 10:59:00
      vi.setSystemTime(new Date('2024-10-18 10:59:00'));

      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('end', '2024-10-18 10:00:00'),
          new TimecardEntry('start', '2024-10-18 10:30:00'),
          // 最後のstartから現在時刻(10:59:00)まで = 29分
        ],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      // 9:00-10:00 = 60分
      // 10:30-10:59 = 29分
      // 合計 = 89分
      expect(workingTime).toBe(89);

      // モックをリセット
      vi.useRealTimers();
    });

    it('異常なパターン(startが連続)の場合、nullを返す', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('start', '2024-10-18 09:00:00'),
          new TimecardEntry('start', '2024-10-18 10:00:00'),
        ],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      expect(workingTime).toBe(null);
    });

    it('異常なパターン(endから始まる)の場合、nullを返す', () => {
      const data: TimecardData = {
        '2024-10-18': [
          new TimecardEntry('end', '2024-10-18 12:00:00'),
          new TimecardEntry('start', '2024-10-18 13:00:00'),
        ],
      };
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      expect(workingTime).toBe(null);
    });

    it('エントリが存在しない場合、nullを返す', () => {
      const data: TimecardData = {};
      const workingTime = TimecardRepository.calculateWorkingTimeForDate(data, '2024-10-18');
      expect(workingTime).toBe(null);
    });
  });
});
