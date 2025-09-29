import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { Copy, MoreHorizontal, Plus, Target, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useScrollFadeEffect } from '../../../hooks/useScrollFadeEffect';
import { MessageData, ScrollFadeMessageList } from '../../../shared/components/ScrollFadeMessage';

// 使用现代化的公共组件架构
// 所有ScrollAnimation和渐变功能已提取为独立组件

interface TrainingProgress {
  questionCount: number;
  answerCount: number;
  duration: number;
  isActive: boolean;
  isComplete: boolean;
  isAnalyzing: boolean;
  analysisPhase?: string;
  hasResult: boolean;
}

interface WindowBodyProps {
  messages: Array<{id: string, type: 'user' | 'ai' | 'interviewer', content: string}>;
  isLoading: boolean;
  onNewChat?: () => void;
  onAskMore?: (question: string) => void;
  onCopyLastAIResponse?: React.MutableRefObject<(() => Promise<void>) | null>;
  // 面试训练特有属性（可选）
  voiceState?: any;
  audioLevel?: number;
  systemAudioLevel?: number;
  isSystemAudioListening?: boolean;
  interviewerQuestions?: Array<{id: string, content: string, timestamp: number}>;
  userAnswers?: Array<{id: string, questionId: string, content: string, timestamp: number}>;
  currentInterviewState?: any;
  // 新增训练状态属性
  trainingProgress?: TrainingProgress;
  onFinishTraining?: () => void;
  analysisResult?: any;
}

export function InterviewTrainingBody({
  messages,
  isLoading,
  onNewChat,
  onAskMore,
  onCopyLastAIResponse,
  trainingProgress,
  onFinishTraining,
  analysisResult
}: WindowBodyProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  // 实现复制最近一次AI回答的逻辑
  const handleCopyLastAIResponse = async () => {
    try {
      const lastAIMessage = messages.filter(m => m.type === 'ai').pop();
      if (lastAIMessage) {
        await navigator.clipboard.writeText(lastAIMessage.content);
      }
    } catch (e) {
      console.error('复制AI回答失败:', e);
    }
  };

  // 将实现的方法传递给父组件
  useEffect(() => {
    if (onCopyLastAIResponse) {
      onCopyLastAIResponse.current = handleCopyLastAIResponse;
    }
  }, [messages, onCopyLastAIResponse]);

  // 转换消息格式为MessageData类型，过滤出支持的类型
  const messageData: MessageData[] = messages
    .filter(msg => msg.type === 'user' || msg.type === 'ai')
    .map(msg => ({
      id: msg.id,
      type: msg.type as 'user' | 'ai',
      content: msg.content
    }));

  // 使用滚动渐变效果Hook
  useScrollFadeEffect(messagesRef, {
    fadeZoneHeight: 60,
    minAlpha: 0.5,
    stepSize: 10,
    alphaStep: 0.1
  });

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesRef.current) {
      const scrollElement = messagesRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages, isLoading]);

  // 格式化时长显示
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 渲染训练进度面板
  const renderTrainingProgress = () => {
    if (!trainingProgress) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Target size={16} className="text-blue-600" />
            面试训练进度
          </h3>
          {trainingProgress.isComplete && !trainingProgress.isAnalyzing && !trainingProgress.hasResult && (
            <button
              onClick={onFinishTraining}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-md flex items-center gap-1 transition-colors"
            >
              <TrendingUp size={12} />
              生成分析报告
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{trainingProgress.questionCount}</div>
            <div className="text-gray-600">面试官问题</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{trainingProgress.answerCount}</div>
            <div className="text-gray-600">我的回答</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600 flex items-center justify-center gap-1">
              <Clock size={14} />
              {formatDuration(trainingProgress.duration)}
            </div>
            <div className="text-gray-600">面试时长</div>
          </div>
        </div>

        {trainingProgress.isAnalyzing && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800">
              <div className="animate-spin w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
              <span className="text-sm font-medium">{trainingProgress.analysisPhase || 'AI分析中...'}</span>
            </div>
          </div>
        )}

        {trainingProgress.hasResult && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">分析报告已生成</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染分析结果
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const { analysis } = analysisResult;

    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-600" />
          面试分析报告
        </h3>

        <div className="space-y-3">
          {/* 总分 */}
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{analysis.overallScore}</div>
            <div className="text-sm text-gray-600">总分 (100分制)</div>
          </div>

          {/* 雷达图评分 */}
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-center">
              <div className="font-bold text-purple-600">{analysis.radarScores.interactivity}</div>
              <div className="text-gray-600">互动性</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600">{analysis.radarScores.confidence}</div>
              <div className="text-gray-600">自信度</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600">{analysis.radarScores.professionalism}</div>
              <div className="text-gray-600">专业性</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-yellow-600">{analysis.radarScores.relevance}</div>
              <div className="text-gray-600">相关性</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-600">{analysis.radarScores.clarity}</div>
              <div className="text-gray-600">清晰度</div>
            </div>
          </div>

          {/* 总结 */}
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-xs font-medium text-gray-700 mb-2">AI总结</div>
            <div className="text-xs text-gray-600 leading-relaxed">{analysis.summary}</div>
          </div>

          {/* 建议 */}
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-xs font-medium text-gray-700 mb-2">改进建议</div>
            <div className="text-xs text-gray-600 leading-relaxed">{analysis.suggestions}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-window-body" ref={messagesRef}>
      {/* 训练进度面板 */}
      {renderTrainingProgress()}

      {/* 分析结果 */}
      {renderAnalysisResult()}

      {messages.length === 0 && !isLoading ? (
        // 空状态显示
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ai-empty-title">开始面试训练</div>
          <div className="ai-empty-description">
            开启音频监听，捕获面试官的问题和您的回答
          </div>
        </div>
      ) : (
        // 消息列表
        <ScrollFadeMessageList
          messages={messageData}
          isLoading={isLoading}
          containerClassName=""
          messagesClassName="ai-messages"
          animationProps={{
            animationType: 'animate__fadeInUp',
            duration: 0.6,
            delayStep: 30,
            maxDelay: 500,
            animateOnce: true,
            initiallyVisible: true,
            offset: 0
          }}
          renderOptions={{
            lineClassName: 'message-line',
            codeBlockClassName: 'ai-code-block',
            inlineCodeClassName: 'ai-inline-code'
          }}
          loadingComponent={
            <div className="ai-message ai-message-ai">
              <div className="ai-message-content">
                <div className="ai-loading-spinner" />
              </div>
            </div>
          }
        />
      )}
      
      {/* 底部居中悬浮分段按钮 - 仅在有消息时显示 */}
      {(messages.length > 0 || isLoading) && (
        <div className="ai-floating-actions">
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <div className="ai-segmented">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className="ai-segmented-btn ai-segmented-btn-left"
                    onClick={() => {
                      if (trainingProgress?.isComplete && !trainingProgress.hasResult && onFinishTraining) {
                        onFinishTraining();
                      } else {
                        const lastUserMessage = messages.filter(m => m.type === 'user').pop();
                        if (lastUserMessage && onAskMore) {
                          const moreQuestion = `告诉我更多关于"${lastUserMessage.content}"的信息`;
                          onAskMore(moreQuestion);
                        }
                      }
                    }}
                    disabled={messages.filter(m => m.type === 'user').length === 0 && !trainingProgress?.isComplete}
                    title={trainingProgress?.isComplete && !trainingProgress.hasResult ? "生成分析报告" : "告诉我关于该问题的更多内容"}
                  >
                    {trainingProgress?.isComplete && !trainingProgress.hasResult ? (
                      <TrendingUp size={16} />
                    ) : (
                      <MoreHorizontal size={16} />
                    )}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    {trainingProgress?.isComplete && !trainingProgress.hasResult
                      ? "生成AI分析报告"
                      : "告诉我关于该问题的更多内容"}
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <div className="ai-separator" />
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className="ai-segmented-btn ai-segmented-btn-middle"
                    onClick={() => onNewChat?.()}
                    disabled={isLoading || trainingProgress?.isAnalyzing}
                    title={trainingProgress?.isActive ? "重置训练" : "新建提问"}
                  >
                    <Plus size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    {trainingProgress?.isActive
                      ? "重置当前训练会话"
                      : "点击停止当前窗口提问，新建提问"}
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <div className="ai-separator" />
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className="ai-segmented-btn ai-segmented-btn-right"
                    onClick={async () => {
                      try {
                        const text = messages
                          .map(m => `${m.type === 'user' ? '用户' : 'AI'}: ${m.content}`)
                          .join('\n\n');
                        await navigator.clipboard.writeText(text);
                      } catch (e) {
                        console.error('复制对话失败:', e);
                      }
                    }}
                    title="复制所有对话内容"
                  >
                    <Copy size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    复制以上所有对话内容
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </div>
      )}
    </div>
  );
}