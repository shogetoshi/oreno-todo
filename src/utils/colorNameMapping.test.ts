import { describe, it, expect } from 'vitest';
import { getColorNameRgb, COLOR_NAME_TO_RGB } from './colorNameMapping';

describe('colorNameMapping', () => {
  describe('getColorNameRgb', () => {
    it('基本的な色名をRGB値に変換できる', () => {
      expect(getColorNameRgb('red')).toEqual({ r: 255, g: 0, b: 0 });
      expect(getColorNameRgb('green')).toEqual({ r: 0, g: 128, b: 0 });
      expect(getColorNameRgb('blue')).toEqual({ r: 0, g: 0, b: 255 });
      expect(getColorNameRgb('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(getColorNameRgb('black')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('大文字小文字を区別しない', () => {
      expect(getColorNameRgb('RED')).toEqual({ r: 255, g: 0, b: 0 });
      expect(getColorNameRgb('Red')).toEqual({ r: 255, g: 0, b: 0 });
      expect(getColorNameRgb('rEd')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('前後の空白を無視する', () => {
      expect(getColorNameRgb(' red ')).toEqual({ r: 255, g: 0, b: 0 });
      expect(getColorNameRgb('  blue  ')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('存在しない色名の場合はnullを返す', () => {
      expect(getColorNameRgb('notacolor')).toBeNull();
      expect(getColorNameRgb('xyz123')).toBeNull();
      expect(getColorNameRgb('')).toBeNull();
    });

    it('147色すべてのマッピングが存在する', () => {
      // issueに記載された色名をサンプルチェック
      expect(getColorNameRgb('aliceblue')).toEqual({ r: 240, g: 248, b: 255 });
      expect(getColorNameRgb('antiquewhite')).toEqual({ r: 250, g: 235, b: 215 });
      expect(getColorNameRgb('aqua')).toEqual({ r: 0, g: 255, b: 255 });
      expect(getColorNameRgb('yellowgreen')).toEqual({ r: 154, g: 205, b: 50 });

      // gray/greyのような同義語もサポート
      expect(getColorNameRgb('gray')).toEqual({ r: 128, g: 128, b: 128 });
      expect(getColorNameRgb('grey')).toEqual({ r: 128, g: 128, b: 128 });
    });

    it('色名テーブルの要素数が148であることを確認', () => {
      // issueファイルに記載されている色の数は実際には148色
      expect(Object.keys(COLOR_NAME_TO_RGB).length).toBe(148);
    });
  });
});
