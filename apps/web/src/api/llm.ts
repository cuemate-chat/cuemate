import { config } from '../config';
import { storage } from './http';

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
export async function optimizeResumeWithLLM(params: OptimizeResumeRequest): Promise<OptimizeResumeResponse> {
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
  
  // 构建优化提示词
  const optimizePrompt = `作为一名专业的简历优化师，请根据目标岗位要求对以下简历进行全面优化。

**重要要求：**
1. 优化后的简历内容必须详细完整，字数不能少于原简历的80%
2. 保留原简历的所有重要信息，在此基础上进行增强和改进
3. 针对目标岗位要求，重点突出相关技能和经验
4. 优化语言表达，使用更专业和有说服力的词汇
5. 完善简历结构，确保逻辑清晰、重点突出

**目标岗位描述：**
${params.jobDescription}

**当前简历内容（${params.resumeContent.length}字）：**
${params.resumeContent}

**请提供：**
1. **优化建议**：列出5-10条具体的优化建议，说明为什么要这样改进
2. **优化后的完整简历**：基于原简历进行全面优化，确保内容丰富详细，字数不少于原简历的80%

**输出格式（JSON）：**
{
  "suggestions": "1. [具体建议1]\\n2. [具体建议2]\\n3. [具体建议3]\\n...",
  "optimizedResume": "[完整的优化后简历内容，必须详细完整，不能过于简化]"
}

**注意：优化后的简历必须保持原有的详细程度，在此基础上进行改进，绝不能简化或缩短内容。**`;
  
  // 直接调用 LLM Router 并传递动态 provider 参数
  const llmResponse = await fetch(`${config.LLM_ROUTER_URL}/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的简历优化助手，擅长根据岗位要求优化简历内容。',
        },
        {
          role: 'user',
          content: optimizePrompt,
        },
      ],
      temperature: modelParams.temperature || 0.7,
      maxTokens: Math.max(modelParams.max_tokens || 4000, 4000),
      // 动态 provider 配置参数
      provider: model.provider,
      model: model.model_name,
      apiKey: model.api_key,
      baseUrl: model.base_url,
    }),
  });
  
  if (!llmResponse.ok) {
    const errorText = await llmResponse.text();
    throw new Error(`LLM Router 调用失败: ${llmResponse.status} - ${errorText}`);
  }
  
  const llmResult = await llmResponse.json();
  const content = llmResult.content;
  
  if (!content) {
    throw new Error('LLM Router 返回内容为空');
  }
  
  // 尝试解析JSON格式的回复
  let result;
  try {
    result = JSON.parse(content);
  } catch (e) {
    // 如果不是JSON格式，则简单处理
    result = {
      suggestions: '优化建议：' + content.substring(0, 500),
      optimizedResume: content,
    };
  }
  
  return {
    suggestions: result.suggestions || '暂无具体建议',
    optimizedResume: result.optimizedResume || content,
  };
}