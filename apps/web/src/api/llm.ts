import { config } from '../config';
import { storage } from './http';
import { getPrompt } from './prompts';

export interface OptimizeResumeRequest {
  jobDescription: string;
  resumeContent: string;
}

export interface OptimizeResumeResponse {
  suggestions: string;
  optimizedResume: string;
}

/**
 * 直接调用 LLM Router 优化简历
 */
export async function optimizeResumeWithLLM(
  params: OptimizeResumeRequest,
): Promise<OptimizeResumeResponse> {
  // 从 localStorage 获取用户的完整模型配置
  const userData = storage.getUser();
  if (!userData?.model) {
    throw new Error('请先在设置中配置大模型');
  }

  const { model, model_params } = userData;

  // 构建参数对象
  const modelParams: Record<string, any> = {};
  model_params?.forEach((param: any) => {
    const value = param.value;
    // 尝试将字符串转换为数字（对于 temperature、max_tokens 等）
    if (!isNaN(Number(value))) {
      modelParams[param.param_key] = Number(value);
    } else {
      modelParams[param.param_key] = value;
    }
  });

  // 从数据库获取优化提示词模板
  const promptData = await getPrompt('OptimizeResumePrompt');
  const template = promptData.prompt.content;

  // 渲染模板变量
  const renderTemplate = (tmpl: string, vars: Record<string, any>): string => {
    const varNames = Object.keys(vars);
    const varValues = Object.values(vars);
    try {
      // 转义模板中的特殊字符，防止在 new Function 中出错
      const escapedTmpl = tmpl
        .replace(/\\/g, '\\\\')  // 转义反斜杠
        .replace(/`/g, '\\`')    // 转义反引号
        .replace(/\$/g, '\\$');  // 转义美元符号

      const func = new Function(...varNames, `return \`${escapedTmpl}\`;`);
      return func(...varValues);
    } catch (error) {
      throw new Error('Failed to render prompt template');
    }
  };

  const optimizePrompt = renderTemplate(template, {
    jobDescription: params.jobDescription,
    resumeContent: params.resumeContent,
    resumeLength: params.resumeContent.length,
  });

  // 构建 credentials 对象，从 model.credentials 中解析
  const finalCredentials = model.credentials ? JSON.parse(model.credentials) : {};

  // 直接传递用户配置的 model_params 数组
  const finalModelParams =
    model_params?.map((param: any) => ({
      param_key: param.param_key,
      value: !isNaN(Number(param.value)) ? Number(param.value) : param.value,
    })) || [];

  // 直接调用 LLM Router 并传递动态 provider 参数
  const llmResponse = await fetch(`${config.LLM_ROUTER_URL}/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: model.provider,
      model: model.model_name,
      credentials: finalCredentials,
      model_params: finalModelParams,
      messages: [
        {
          role: 'user',
          content: optimizePrompt,
        },
      ],
    }),
  });

  if (!llmResponse.ok) {
    const errorText = await llmResponse.text();
    throw new Error(`LLM Router 调用失败: ${llmResponse.status} - ${errorText}`);
  }

  const llmResult = await llmResponse.json();

  // LLM Router 返回的格式是 {content: "JSON 字符串", usage: {...}, ...}
  const content = llmResult.content;

  if (!content) {
    throw new Error('LLM Router 返回内容为空');
  }

  // 清理 markdown 代码块标记
  let cleanContent = content
    .trim()
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // 提取 JSON 对象
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 返回格式错误：无法找到有效的 JSON 对象');
  }

  let result;
  try {
    result = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`AI 返回格式错误：JSON 解析失败。原因：${e instanceof Error ? e.message : String(e)}`);
  }

  // 验证返回的结果格式
  if (!result || typeof result !== 'object') {
    throw new Error('AI 返回格式错误：解析后的结果不是对象');
  }

  if (!result.suggestions || !result.optimizedResume) {
    const missing = [];
    if (!result.suggestions) missing.push('suggestions');
    if (!result.optimizedResume) missing.push('optimizedResume');
    throw new Error(`AI 返回格式错误：缺少必需字段 ${missing.join(', ')}`);
  }

  // 处理 suggestions：如果是数组，转换为字符串
  let suggestions = '暂无具体建议';
  if (result.suggestions) {
    if (Array.isArray(result.suggestions)) {
      suggestions = result.suggestions.join('\n');
    } else if (typeof result.suggestions === 'string') {
      suggestions = result.suggestions;
    } else {
      suggestions = '提示：AI 返回的优化建议格式不正确';
    }
  }

  // 返回结果，确保 optimizedResume 也清理了 markdown 标记
  let optimizedResume = result.optimizedResume || '';

  // 再次清理 optimizedResume 中可能存在的 markdown 标记
  if (typeof optimizedResume === 'string') {
    optimizedResume = optimizedResume
      .replace(/^```json\s*/gm, '')
      .replace(/^```\s*/gm, '')
      .replace(/```\s*$/gm, '')
      .trim();
  } else {
    throw new Error(`AI 返回格式错误：optimizedResume 不是字符串类型（实际类型：${typeof optimizedResume}）`);
  }

  return {
    suggestions: suggestions,
    optimizedResume: optimizedResume,
  };
}
