/**
 * Test: Date Grouping Utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateDateGroups, formatDateToYYYYMMDD, formatDateForDisplay } from './dateGrouping';

describe('dateGrouping', () => {
  beforeEach(() => {
    // テストごとに新しい環境をセットアップ
  });

  afterEach(() => {
    // テスト後のクリーンアップ
  });

  describe('formatDateToYYYYMMDD', () => {
    it('YYYY-MM-DD形式の文字列を返す', () => {
      const date = new Date(2025, 10, 24); // 2025年11月24日（月は0始まり）
      const result = formatDateToYYYYMMDD(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/); // フォーマットの確認
      expect(result).toContain('2025'); // 年の確認
    });

    it('1桁の月日を0埋めする', () => {
      const date = new Date('2025-01-05T00:00:00'); // ISO形式で正確に指定
      const result = formatDateToYYYYMMDD(date);
      expect(result).toBe('2025-01-05');
    });
  });

  describe('formatDateForDisplay', () => {
    it('0日前の場合は「今日」を含む文字列を返す', () => {
      const date = new Date('2025-11-24T00:00:00');
      const result = formatDateForDisplay(date, 0);
      expect(result).toContain('今日');
      expect(result).toContain('2025-11-24');
    });

    it('1日前の場合は「昨日」を含む文字列を返す', () => {
      const date = new Date('2025-11-23T00:00:00');
      const result = formatDateForDisplay(date, 1);
      expect(result).toContain('昨日');
      expect(result).toContain('2025-11-23');
    });

    it('2日以上前の場合は日付のみを返す', () => {
      const date = new Date('2025-11-22T00:00:00');
      const result = formatDateForDisplay(date, 2);
      expect(result).toBe('2025-11-22');
    });
  });

  describe('generateDateGroups', () => {
    it('デフォルトで35日分の日付グループを生成する', () => {
      const groups = generateDateGroups();
      expect(groups).toHaveLength(36); // 今日を含めて36日分
    });

    it('指定した日数分の日付グループを生成する', () => {
      const groups = generateDateGroups(7);
      expect(groups).toHaveLength(8); // 今日を含めて8日分
    });

    it('今日から過去に向かって日付が並ぶ', () => {
      const groups = generateDateGroups(2);
      expect(groups[0].displayDate).toContain('今日');
      expect(groups[1].displayDate).toContain('昨日');
      expect(groups[2].displayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('各グループにdateとdisplayDateが含まれる', () => {
      const groups = generateDateGroups(1);
      expect(groups[0]).toHaveProperty('date');
      expect(groups[0]).toHaveProperty('displayDate');
      expect(typeof groups[0].date).toBe('string');
      expect(typeof groups[0].displayDate).toBe('string');
    });

    it('日付グループが正しい順序で生成される', () => {
      const groups = generateDateGroups(3);

      // 各グループの日付が1日ずつ遡っていることを確認
      for (let i = 0; i < groups.length - 1; i++) {
        const currentDate = new Date(groups[i].date);
        const nextDate = new Date(groups[i + 1].date);
        const diffInDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffInDays).toBe(1);
      }
    });
  });
});
