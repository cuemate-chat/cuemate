import Icon from '../../assets/llm/bedrock_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'aws-bedrock',
  name: 'Amazon Bedrock',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/bedrock_icon_svg',
  modelNamePlaceholder:
    '如 anthropic.claude-sonnet-4-5-20250929-v1:0 / amazon.nova-pro-v1:0',
  baseModels: [
    // ========== Anthropic Claude 系列 ==========
    // Claude 4.5 系列
    {
      name: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '65536', default_value: '65536', extra: { min: 256, max: 65536, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-haiku-4-5-20251001-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '65536', default_value: '65536', extra: { min: 256, max: 65536, step: 128 } },
      ],
    },
    // Claude 4 系列
    {
      name: 'anthropic.claude-opus-4-1-20250805-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '32768', default_value: '32768', extra: { min: 256, max: 32768, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-opus-4-20250514-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '32768', default_value: '32768', extra: { min: 256, max: 32768, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-sonnet-4-20250514-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '65536', default_value: '65536', extra: { min: 256, max: 65536, step: 128 } },
      ],
    },
    // Claude 3.7 系列
    {
      name: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '65536', default_value: '65536', extra: { min: 256, max: 65536, step: 128 } },
      ],
    },
    // Claude 3.5 系列
    {
      name: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '65536', default_value: '65536', extra: { min: 256, max: 65536, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '65536', default_value: '65536', extra: { min: 256, max: 65536, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    // Claude 3 系列
    {
      name: 'anthropic.claude-3-opus-20240229-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-3-sonnet-20240229-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },
    {
      name: 'anthropic.claude-3-haiku-20240307-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },

    // ========== Amazon Nova 系列 ==========
    {
      name: 'amazon.nova-premier-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'amazon.nova-pro-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'amazon.nova-lite-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'amazon.nova-micro-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'amazon.nova-sonic-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },

    // ========== Amazon Titan 系列 ==========
    {
      name: 'amazon.titan-text-premier-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'amazon.titan-text-express-v1',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'amazon.titan-text-lite-v1',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },

    // ========== AI21 Labs Jamba 系列 ==========
    {
      name: 'ai21.jamba-1-5-large-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },
    {
      name: 'ai21.jamba-1-5-mini-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },

    // ========== Cohere Command 系列 ==========
    {
      name: 'cohere.command-r-plus-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },
    {
      name: 'cohere.command-r-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },

    // ========== DeepSeek 系列 ==========
    {
      name: 'deepseek.r1-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'deepseek.v3-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },

    // ========== Meta Llama 系列 ==========
    {
      name: 'meta.llama4-scout-17b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama4-maverick-17b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-3-70b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-2-90b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-2-11b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-2-3b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '2048', default_value: '2048', extra: { min: 256, max: 2048, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-2-1b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '2048', default_value: '2048', extra: { min: 256, max: 2048, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-1-405b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-1-70b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-1-8b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-70b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '2048', default_value: '2048', extra: { min: 256, max: 2048, step: 128 } },
      ],
    },
    {
      name: 'meta.llama3-8b-instruct-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '2048', default_value: '2048', extra: { min: 256, max: 2048, step: 128 } },
      ],
    },

    // ========== Mistral AI 系列 ==========
    {
      name: 'mistral.pixtral-large-2502-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'mistral.mistral-large-2407-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'mistral.mistral-large-2402-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'mistral.mistral-small-2402-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'mistral.mixtral-8x7b-instruct-v0:1',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },
    {
      name: 'mistral.mistral-7b-instruct-v0:2',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },

    // ========== OpenAI 系列 ==========
    {
      name: 'openai.gpt-oss-120b-1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },
    {
      name: 'openai.gpt-oss-20b-1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '4096', default_value: '4096', extra: { min: 256, max: 4096, step: 128 } },
      ],
    },

    // ========== Qwen 系列 ==========
    {
      name: 'qwen.qwen3-coder-480b-a35b-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'qwen.qwen3-235b-a22b-2507-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'qwen.qwen3-coder-30b-a3b-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
    {
      name: 'qwen.qwen3-32b-v1:0',
      default_params: [
        { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 2, step: 0.1 } },
        { label: '输出最大 tokens', param_key: 'max_tokens', ui_type: 'slider', value: '8192', default_value: '8192', extra: { min: 256, max: 8192, step: 128 } },
      ],
    },
  ],
  credentialFields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: '从 AWS Bedrock 控制台生成的 API 密钥',
    },
    {
      key: 'aws_region',
      label: 'AWS Region',
      type: 'text',
      required: true,
      placeholder: '如 us-east-1',
      defaultValue: 'us-east-1',
    },
  ],
};

export default manifest;
