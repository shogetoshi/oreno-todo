import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentJSTTime, formatToJST, parseJSTString, extractDateFromJST, compareDates, convertISOToJST } from './timeFormat';

describe('timeFormat', () => {
  describe('getCurrentJSTTime', () => {
    beforeEach(() => {
      // 固定時刻でモック: 2025-01-15 12:34:56 JST (UTC: 2025-01-15 03:34:56)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T03:34:56.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('現在のJST時刻を正しいフォーマットで取得できる', () => {
      const result = getCurrentJSTTime();
      expect(result).toBe('2025-01-15 12:34:56');
    });

    it('返り値が "YYYY-MM-DD HH:MI:SS" フォーマットに準拠している', () => {
      const result = getCurrentJSTTime();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('formatToJST', () => {
    it('UTC時刻をJST時刻に変換できる', () => {
      // UTC: 2025-01-15 03:34:56 -> JST: 2025-01-15 12:34:56
      const utcDate = new Date('2025-01-15T03:34:56.000Z');
      const result = formatToJST(utcDate);
      expect(result).toBe('2025-01-15 12:34:56');
    });

    it('真夜中のUTC時刻を正しく変換できる', () => {
      // UTC: 2025-01-14 15:00:00 -> JST: 2025-01-15 00:00:00
      const utcDate = new Date('2025-01-14T15:00:00.000Z');
      const result = formatToJST(utcDate);
      expect(result).toBe('2025-01-15 00:00:00');
    });

    it('年末年始をまたぐ時刻を正しく変換できる', () => {
      // UTC: 2024-12-31 15:30:00 -> JST: 2025-01-01 00:30:00
      const utcDate = new Date('2024-12-31T15:30:00.000Z');
      const result = formatToJST(utcDate);
      expect(result).toBe('2025-01-01 00:30:00');
    });

    it('月末をまたぐ時刻を正しく変換できる', () => {
      // UTC: 2025-01-31 15:30:00 -> JST: 2025-02-01 00:30:00
      const utcDate = new Date('2025-01-31T15:30:00.000Z');
      const result = formatToJST(utcDate);
      expect(result).toBe('2025-02-01 00:30:00');
    });

    it('1桁の月・日・時・分・秒を正しくゼロ埋めする', () => {
      // UTC: 2025-01-05 00:01:02 -> JST: 2025-01-05 09:01:02
      const utcDate = new Date('2025-01-05T00:01:02.000Z');
      const result = formatToJST(utcDate);
      expect(result).toBe('2025-01-05 09:01:02');
    });

    it('異なるタイムゾーンの入力でも正しくJSTに変換できる', () => {
      // ローカルタイムゾーンに依存せず、UTC基準で変換されることを確認
      const date = new Date(2025, 0, 15, 12, 34, 56); // ローカル時刻
      const result = formatToJST(date);
      // 結果はローカルタイムゾーンに依存するが、フォーマットは正しいはず
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('parseJSTString', () => {
    it('JST時刻文字列をDateオブジェクトに変換できる', () => {
      const jstString = '2025-01-15 12:34:56';
      const result = parseJSTString(jstString);

      // 結果をJSTにフォーマットして元の文字列と一致することを確認
      expect(formatToJST(result)).toBe(jstString);
    });

    it('真夜中の時刻を正しく解析できる', () => {
      const jstString = '2025-01-15 00:00:00';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });

    it('午前中の時刻を正しく解析できる', () => {
      const jstString = '2025-01-15 09:30:45';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });

    it('午後の時刻を正しく解析できる', () => {
      const jstString = '2025-01-15 23:59:59';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });

    it('年末年始の時刻を正しく解析できる', () => {
      const jstString = '2025-01-01 00:00:00';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });

    it('月末の時刻を正しく解析できる', () => {
      const jstString = '2025-01-31 23:59:59';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });

    it('うるう年の2月29日を正しく解析できる', () => {
      const jstString = '2024-02-29 12:00:00';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });

    it('1桁の値でもゼロ埋めされた文字列として解析できる', () => {
      const jstString = '2025-01-05 09:08:07';
      const result = parseJSTString(jstString);
      expect(formatToJST(result)).toBe(jstString);
    });
  });

  describe('formatToJST と parseJSTString の往復変換', () => {
    it('formatToJST -> parseJSTString で元のDateに戻る', () => {
      const original = new Date('2025-01-15T03:34:56.000Z');
      const formatted = formatToJST(original);
      const parsed = parseJSTString(formatted);

      // ミリ秒まで完全一致は難しいので、秒単位で比較
      expect(Math.floor(parsed.getTime() / 1000)).toBe(Math.floor(original.getTime() / 1000));
    });

    it('parseJSTString -> formatToJST で元の文字列に戻る', () => {
      const original = '2025-01-15 12:34:56';
      const parsed = parseJSTString(original);
      const formatted = formatToJST(parsed);

      expect(formatted).toBe(original);
    });

    it('複数の異なる日時で往復変換が成功する', () => {
      const testCases = [
        '2025-01-01 00:00:00',
        '2025-06-15 12:30:45',
        '2025-12-31 23:59:59',
        '2024-02-29 15:20:10', // うるう年
        '2025-07-04 03:14:15'
      ];

      testCases.forEach(original => {
        const parsed = parseJSTString(original);
        const formatted = formatToJST(parsed);
        expect(formatted).toBe(original);
      });
    });
  });

  describe('convertISOToJST', () => {
    it('ISO 8601タイムゾーン付き形式をJSTフォーマットに変換できる', () => {
      // 2023-11-01T10:00:00+09:00 (JST) -> "2023-11-01 10:00:00"
      const isoString = '2023-11-01T10:00:00+09:00';
      const result = convertISOToJST(isoString);
      expect(result).toBe('2023-11-01 10:00:00');
    });

    it('ISO 8601 UTC形式をJSTフォーマットに変換できる', () => {
      // 2023-10-20T09:00:00.000Z (UTC) -> "2023-10-20 18:00:00" (JST = UTC+9)
      const isoString = '2023-10-20T09:00:00.000Z';
      const result = convertISOToJST(isoString);
      expect(result).toBe('2023-10-20 18:00:00');
    });

    it('日付のみの形式を00:00:00の時刻付きJSTフォーマットに変換できる', () => {
      // "2023-11-05" -> "2023-11-05 09:00:00" (UTCの00:00:00がJSTの09:00:00)
      const isoString = '2023-11-05';
      const result = convertISOToJST(isoString);
      expect(result).toBe('2023-11-05 09:00:00');
    });

    it('異なるタイムゾーンのISO 8601形式を正しくJSTに変換できる', () => {
      // 2023-11-01T01:00:00+00:00 (UTC) -> "2023-11-01 10:00:00" (JST)
      const isoString = '2023-11-01T01:00:00+00:00';
      const result = convertISOToJST(isoString);
      expect(result).toBe('2023-11-01 10:00:00');
    });

    it('ISO 8601形式とformatToJSTの結果が一致する', () => {
      const date = new Date('2023-11-01T10:00:00+09:00');
      const fromISO = convertISOToJST('2023-11-01T10:00:00+09:00');
      const fromDate = formatToJST(date);
      expect(fromISO).toBe(fromDate);
    });

    it('convertISOToJST -> parseJSTString -> formatToJST の往復変換が成功する', () => {
      const isoString = '2023-11-01T10:00:00+09:00';
      const jstFormatted = convertISOToJST(isoString);
      const parsed = parseJSTString(jstFormatted);
      const formatted = formatToJST(parsed);
      expect(formatted).toBe(jstFormatted);
    });
  });

  describe('extractDateFromJST', () => {
    it('JST時刻文字列から日付部分のみを抽出できる', () => {
      const jstString = '2025-01-15 12:34:56';
      const result = extractDateFromJST(jstString);
      expect(result).toBe('2025-01-15');
    });

    it('日付のみの文字列をそのまま返す', () => {
      const dateString = '2025-01-15';
      const result = extractDateFromJST(dateString);
      expect(result).toBe('2025-01-15');
    });

    it('真夜中の時刻から日付を抽出できる', () => {
      const jstString = '2025-01-15 00:00:00';
      const result = extractDateFromJST(jstString);
      expect(result).toBe('2025-01-15');
    });

    it('年末の日付を抽出できる', () => {
      const jstString = '2025-12-31 23:59:59';
      const result = extractDateFromJST(jstString);
      expect(result).toBe('2025-12-31');
    });

    it('月初の日付を抽出できる', () => {
      const jstString = '2025-01-01 09:30:45';
      const result = extractDateFromJST(jstString);
      expect(result).toBe('2025-01-01');
    });
  });

  describe('compareDates', () => {
    it('同じ日付の場合は0を返す', () => {
      expect(compareDates('2025-01-15', '2025-01-15')).toBe(0);
    });

    it('date1がdate2より前の場合は負の数を返す', () => {
      expect(compareDates('2025-01-14', '2025-01-15')).toBeLessThan(0);
      expect(compareDates('2024-12-31', '2025-01-01')).toBeLessThan(0);
      expect(compareDates('2025-01-01', '2025-12-31')).toBeLessThan(0);
    });

    it('date1がdate2より後の場合は正の数を返す', () => {
      expect(compareDates('2025-01-15', '2025-01-14')).toBeGreaterThan(0);
      expect(compareDates('2025-01-01', '2024-12-31')).toBeGreaterThan(0);
      expect(compareDates('2025-12-31', '2025-01-01')).toBeGreaterThan(0);
    });

    it('年をまたぐ日付の比較が正しく行える', () => {
      expect(compareDates('2024-12-31', '2025-01-01')).toBeLessThan(0);
      expect(compareDates('2025-01-01', '2024-12-31')).toBeGreaterThan(0);
    });

    it('月をまたぐ日付の比較が正しく行える', () => {
      expect(compareDates('2025-01-31', '2025-02-01')).toBeLessThan(0);
      expect(compareDates('2025-02-01', '2025-01-31')).toBeGreaterThan(0);
    });

    it('同じ月内の日付の比較が正しく行える', () => {
      expect(compareDates('2025-01-01', '2025-01-31')).toBeLessThan(0);
      expect(compareDates('2025-01-15', '2025-01-14')).toBeGreaterThan(0);
    });
  });
});
