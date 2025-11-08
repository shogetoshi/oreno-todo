/**
 * Todoデータのバリデーション関数
 * JSONパース後のデータが正しいTodo型に準拠しているかをチェックする
 */

/**
 * 個別のTodoオブジェクトをバリデーション
 *
 * @param data - バリデーション対象のデータ
 * @returns dataがTodo型に準拠している場合true
 */
export function validateTodo(data: unknown): data is { id: string; text: string; completedAt: string | null } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 必須プロパティのチェック
  if (typeof obj.id !== 'string') {
    return false;
  }

  if (typeof obj.text !== 'string') {
    return false;
  }

  // completedAtはstring | nullを許容
  if (obj.completedAt !== null && typeof obj.completedAt !== 'string') {
    return false;
  }

  return true;
}

/**
 * Todo配列をバリデーション
 *
 * @param data - バリデーション対象のデータ
 * @returns dataがTodo配列に準拠している場合true
 */
export function validateTodos(data: unknown): data is Array<{ id: string; text: string; completedAt: string | null }> {
  if (!Array.isArray(data)) {
    return false;
  }

  // 全要素が正しいTodo型かチェック
  return data.every(item => validateTodo(item));
}
