/**
 * Token 估算工具
 * 当 LLM 服务未返回准确的 token 统计时，使用本地估算
 */

/**
 * 估算文本的 token 数量
 *
 * 估算规则：
 * - 英文：平均 1 token ≈ 4 个字符
 * - 中文：平均 1 个汉字 ≈ 1.5-2 tokens
 * - 标点符号：通常 1 个 token
 * - 空格和换行：通常忽略或计为 0.25 token
 *
 * @param text 输入文本
 * @returns 估算的 token 数量
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  let tokenCount = 0;

  // 统计中文字符（包括中文标点）
  const chineseChars = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;

  // 统计英文字符（移除中文后的剩余字符）
  const nonChineseText = text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '');
  const englishCount = nonChineseText.length;

  // 中文：1 个汉字 ≈ 1.8 tokens（保守估计）
  tokenCount += chineseCount * 1.8;

  // 英文：4 个字符 ≈ 1 token
  tokenCount += englishCount / 4;

  // 向上取整
  return Math.ceil(tokenCount);
}

/**
 * 估算对话的总 token 消耗
 *
 * @param userMessage 用户消息内容
 * @param assistantMessage AI 回答内容
 * @returns 估算的总 token 数量
 */
export function estimateConversationTokens(
  userMessage: string,
  assistantMessage: string,
): number {
  const inputTokens = estimateTokens(userMessage);
  const outputTokens = estimateTokens(assistantMessage);

  // 总 token = 输入 + 输出 + 额外开销（约 10%）
  const totalTokens = Math.ceil((inputTokens + outputTokens) * 1.1);

  return totalTokens;
}

/**
 * 批量估算多条消息的 token 消耗
 *
 * @param messages 消息列表，格式 [{ role: 'user' | 'assistant', content: string }]
 * @returns 估算的总 token 数量
 */
export function estimateBatchTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  let totalTokens = 0;

  for (const message of messages) {
    totalTokens += estimateTokens(message.content);
  }

  // 添加对话上下文的额外开销（约 15%）
  return Math.ceil(totalTokens * 1.15);
}
