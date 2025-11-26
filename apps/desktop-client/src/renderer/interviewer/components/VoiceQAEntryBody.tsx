import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown, Mic, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logger } from '../../../utils/rendererLogger.js';
import { useVoiceState } from '../../../utils/voiceState';
import { Model, modelService } from '../api/modelService';
import { userSettingsService } from '../../control-bar/api/userSettingsService';

interface VoiceQAEntryBodyProps {
  question: string;
  onVoiceToggle: () => void;
  onModelSelect?: (model: Model | null) => void;
  onLanguageSelect?: (language: 'zh-CN' | 'zh-TW' | 'en-US') => void;
}

export function VoiceQAEntryBody({ question, onVoiceToggle, onModelSelect, onLanguageSelect }: VoiceQAEntryBodyProps) {
  const vState = useVoiceState();
  const isRecording = vState.mode === 'voice-qa' && vState.subState === 'voice-speaking';

  // 模型和语言选择
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'zh-CN' | 'zh-TW' | 'en-US'>('zh-CN');
  const [loadingModels, setLoadingModels] = useState(true);

  // 加载模型列表
  useEffect(() => {
    (async () => {
      try {
        setLoadingModels(true);
        const [modelResult, userData] = await Promise.all([
          modelService.getModels({ type: 'llm' }),
          userSettingsService.getCurrentUser()
        ]);
        setModels(modelResult.list);

        // 根据用户设置选择默认模型
        if (modelResult.list.length > 0) {
          let defaultModel = modelResult.list[0]; // 备选第一个

          // 查找用户保存的模型
          if (userData?.selected_model_id) {
            const userSavedModel = modelResult.list.find((m: Model) => m.id === userData.selected_model_id);
            if (userSavedModel) {
              defaultModel = userSavedModel;
            }
          }

          setSelectedModel(defaultModel);
          onModelSelect?.(defaultModel);
        }
        setLoadingModels(false);

        // 从用户数据中读取语言设置
        if (userData?.locale) {
          setSelectedLanguage(userData.locale as 'zh-CN' | 'zh-TW' | 'en-US');
          onLanguageSelect?.(userData.locale as 'zh-CN' | 'zh-TW' | 'en-US');
        } else {
          onLanguageSelect?.(selectedLanguage);
        }
      } catch (error) {
        logger.error(`加载模型失败: ${error}`);
        setLoadingModels(false);
      }
    })();
  }, []);

  return (
    <div className="interviewer-mode-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="interviewer-mode-content" style={{ flex: 1, padding: '16px' }}>
        {/* 模型选择 */}
        <div className="job-position-select" style={{ marginBottom: '8px' }}>
          <select
            className="device-select"
            value={selectedModel?.id || ''}
            onChange={(e) => {
              const model = models.find(m => m.id === e.target.value) || null;
              setSelectedModel(model);
              onModelSelect?.(model);
            }}
            disabled={loadingModels}
          >
            {loadingModels ? (
              <option>加载模型...</option>
            ) : models.length === 0 ? (
              <option>暂无模型</option>
            ) : (
              models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.model_name})
                </option>
              ))
            )}
          </select>
          <ChevronDown size={14} className="select-icon" />
        </div>

        {/* 语言选择 */}
        <div className="job-position-select" style={{ marginBottom: '16px' }}>
          <select
            className="device-select"
            value={selectedLanguage}
            onChange={(e) => {
              const lang = e.target.value as 'zh-CN' | 'zh-TW' | 'en-US';
              setSelectedLanguage(lang);
              onLanguageSelect?.(lang);
            }}
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
            <option value="en-US">English</option>
          </select>
          <ChevronDown size={14} className="select-icon" />
        </div>

        {question && (
          <div className="recognition-result">
            <div className="recognized-text">
              {question}
            </div>
          </div>
        )}
      </div>

      {/* 底部语音按钮 - 类似微信样式 */}
      <div style={{ padding: '16px', position: 'relative', zIndex: 10 }}>
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`ai-voice-btn ${isRecording ? 'recording' : ''}`}
                style={{
                  width: '100%',
                  height: '48px',
                  border: '1px solid rgba(52, 152, 219, 0.3)',
                  borderRadius: '24px',
                  backgroundColor: isRecording ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 152, 219, 0.3)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={onVoiceToggle}
              >
                {isRecording ? (
                  <>
                    <Square size={20} />
                    <span>停止说话</span>
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    <span>按住说话</span>
                  </>
                )}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isRecording ? '点击停止说话' : '点击开始说话'}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}


