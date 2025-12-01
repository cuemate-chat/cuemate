/**
 * 字符串处理工具函数
 * 用于处理 LLM 返回的 JSON 数据格式问题
 */

/**
 * 将数组或其他类型转换为字符串
 * 用于处理 LLM 可能返回数组而非字符串的情况
 *
 * @param value - 需要转换的值，可能是字符串、数组或其他类型
 * @returns 转换后的字符串
 *
 * @example
 * ensureString("hello") // "hello"
 * ensureString(["a", "b", "c"]) // "1. a\n2. b\n3. c"
 * ensureString({key: "value"}) // '{\n  "key": "value"\n}'
 * ensureString(null) // ""
 */
export function ensureString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    // 数组转换为编号列表格式的字符串
    return value.map((item, index) => `${index + 1}. ${String(item)}`).join('\n');
  }
  if (typeof value === 'object' && value !== null) {
    // 对象转换为 JSON 字符串
    return JSON.stringify(value, null, 2);
  }
  // 其他类型（包括 null、undefined）转为空字符串或字符串形式
  return String(value ?? '');
}

/**
 * 清理 markdown 代码块标记
 * 用于处理 LLM 返回的 JSON 被 ```json ``` 包裹的情况
 *
 * @param content - 可能包含 markdown 代码块标记的字符串
 * @returns 清理后的字符串
 *
 * @example
 * cleanJsonWrapper("```json\n{\"key\": \"value\"}\n```") // '{"key": "value"}'
 * cleanJsonWrapper("```\n{\"key\": \"value\"}\n```") // '{"key": "value"}'
 * cleanJsonWrapper("{\"key\": \"value\"}") // '{"key": "value"}'
 */
export function cleanJsonWrapper(content: string): string {
  let result = content.trim();

  // 移除开头的 ```json 或 ```
  if (result.startsWith('```json')) {
    result = result.slice(7);
  } else if (result.startsWith('```')) {
    result = result.slice(3);
  }

  // 移除结尾的 ```
  if (result.endsWith('```')) {
    result = result.slice(0, -3);
  }

  return result.trim();
}

/**
 * 安全解析 JSON 字符串
 * 自动处理 markdown 代码块包裹的情况
 *
 * @param content - JSON 字符串，可能被 markdown 代码块包裹
 * @returns 解析后的对象，解析失败返回 null
 */
export function safeParseJson<T = any>(content: string): T | null {
  try {
    // 先尝试直接解析
    return JSON.parse(content);
  } catch {
    // 尝试清理 markdown 标记后解析
    const cleaned = cleanJsonWrapper(content);
    try {
      return JSON.parse(cleaned);
    } catch {
      // 尝试提取 JSON 对象
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
