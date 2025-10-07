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
    // 尝试将字符串转换为数字（对于temperature、max_tokens等）
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
      const func = new Function(...varNames, `return \`${tmpl}\`;`);
      return func(...varValues);
    } catch (error) {
      console.error('Failed to render template:', error);
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

  // LLM Router 返回的格式是 {content: "JSON字符串", usage: {...}, ...}
  const content = llmResult.content;

  if (!content) {
    throw new Error('LLM Router 返回内容为空');
  }

  // 尝试解析JSON格式的回复
  let result;
  try {
    // 解析 content 中的 JSON 字符串
    result = JSON.parse(content);
  } catch (e) {
    // 如果不是JSON格式，则简单处理
    result = {
      suggestions: '优化建议：AI返回的内容不是标准JSON格式',
      optimizedResume: content,
    };
  }

  return {
    suggestions: result.suggestions || '暂无具体建议',
    optimizedResume: result.optimizedResume || content,
  };
}
