/**
 * Provider 图标映射
 * 根据 provider id 获取对应的 SVG 图标
 */

import aliyunIcon from '../../assets/llm/aliyun_bai_lian_icon_svg?raw';
import anthropicIcon from '../../assets/llm/anthropic_icon_svg?raw';
import azureIcon from '../../assets/llm/azure_icon_svg?raw';
import baichuanIcon from '../../assets/llm/baichuan_icon_svg?raw';
import baiduIcon from '../../assets/llm/baidu_icon_svg?raw';
import bedrockIcon from '../../assets/llm/bedrock_icon_svg?raw';
import deepseekIcon from '../../assets/llm/deepseek_icon_svg?raw';
import geminiIcon from '../../assets/llm/gemini_icon_svg?raw';
import kimiIcon from '../../assets/llm/kimi_icon_svg?raw';
import localIcon from '../../assets/llm/local_icon_svg?raw';
import minimaxIcon from '../../assets/llm/minimax_icon_svg?raw';
import ollamaIcon from '../../assets/llm/ollama_icon_svg?raw';
import openaiIcon from '../../assets/llm/openai_icon_svg?raw';
import regoloIcon from '../../assets/llm/regolo_icon_svg?raw';
import sensenovaIcon from '../../assets/llm/sensenova_icon_svg?raw';
import siliconCloudIcon from '../../assets/llm/siliconCloud_icon_svg?raw';
import stepfunIcon from '../../assets/llm/stepfun_icon_svg?raw';
import tencentCloudIcon from '../../assets/llm/tencent_cloud_icon_svg?raw';
import tencentIcon from '../../assets/llm/tencent_icon_svg?raw';
import vllmIcon from '../../assets/llm/vllm_icon_svg?raw';
import volcanicEngineIcon from '../../assets/llm/volcanic_engine_icon_svg?raw';
import xfIcon from '../../assets/llm/xf_icon_svg?raw';
import xinferenceIcon from '../../assets/llm/xinference_icon_svg?raw';
import zhipuaiIcon from '../../assets/llm/zhipuai_icon_svg?raw';

const providerIconMap: Record<string, string> = {
  'aliyun-bailian': aliyunIcon,
  anthropic: anthropicIcon,
  'aws-bedrock': bedrockIcon,
  'azure-openai': azureIcon,
  baichuan: baichuanIcon,
  baidu: baiduIcon,
  bedrock: bedrockIcon,
  deepseek: deepseekIcon,
  gemini: geminiIcon,
  kimi: kimiIcon,
  local: localIcon,
  minimax: minimaxIcon,
  ollama: ollamaIcon,
  openai: openaiIcon,
  regolo: regoloIcon,
  sensenova: sensenovaIcon,
  siliconflow: siliconCloudIcon,
  stepfun: stepfunIcon,
  'tencent-cloud': tencentCloudIcon,
  tencent: tencentIcon,
  vllm: vllmIcon,
  volcengine: volcanicEngineIcon,
  xf: xfIcon,
  xinference: xinferenceIcon,
  zhipu: zhipuaiIcon,
};

/**
 * 根据 provider id 获取图标 SVG 字符串
 */
export function getProviderIcon(providerId: string): string | undefined {
  return providerIconMap[providerId];
}
