import 'animate.css/animate.min.css';
import { useEffect, useRef, useState } from 'react';
import { InterviewState } from './state/InterviewStateMachine';

interface InterviewQuestion {
  sequence: number;
  question: string;
  answer?: string;
  userResponse?: string;
  analysis?: {
    pros: string;
    cons: string;
    suggestions: string;
    keyPoints: string;
    assessment: string;
  };
  timestamp: number;
  isComplete: boolean;
}

interface MockInterviewBodyProps {
  interviewState: InterviewState;
  currentQuestion?: string;
  currentAnswer?: string;
  streamingAnswer?: string;
  isGeneratingAnswer?: boolean;
  questionsHistory?: InterviewQuestion[];
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  onScrollToBottom?: () => void;
}

export function MockInterviewBody({
  interviewState,
  currentQuestion,
  currentAnswer,
  streamingAnswer,
  isGeneratingAnswer,
  questionsHistory = [],
  progress,
  onScrollToBottom
}: MockInterviewBodyProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayedAnswer, setDisplayedAnswer] = useState('');
  const [showStreamingCursor, setShowStreamingCursor] = useState(false);

  // 处理流式答案显示
  useEffect(() => {
    if (streamingAnswer) {
      setDisplayedAnswer(streamingAnswer);
      setShowStreamingCursor(true);
    } else if (currentAnswer) {
      setDisplayedAnswer(currentAnswer);
      setShowStreamingCursor(false);
    } else {
      setDisplayedAnswer('');
      setShowStreamingCursor(false);
    }
  }, [streamingAnswer, currentAnswer]);

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
      onScrollToBottom?.();
    }
  }, [displayedAnswer, questionsHistory, onScrollToBottom]);

  // 获取状态描述
  const getStateDescription = (state: InterviewState): string => {
    const descriptions: Record<InterviewState, string> = {
      [InterviewState.IDLE]: '等待开始面试',
      [InterviewState.INITIALIZING]: '正在初始化面试...',
      [InterviewState.AI_THINKING]: '面试官正在思考问题...',
      [InterviewState.AI_SPEAKING]: '面试官正在提问...',
      [InterviewState.USER_LISTENING]: '等待您的回答',
      [InterviewState.USER_SPEAKING]: '正在录制您的回答...',
      [InterviewState.AI_ANALYZING]: '正在分析您的回答...',
      [InterviewState.GENERATING_ANSWER]: '正在生成参考答案...',
      [InterviewState.ROUND_COMPLETE]: '本轮问答完成',
      [InterviewState.INTERVIEW_ENDING]: '面试即将结束...',
      [InterviewState.GENERATING_REPORT]: '正在生成面试报告...',
      [InterviewState.COMPLETED]: '面试已完成',
      [InterviewState.ERROR]: '发生错误',
    };
    return descriptions[state] || state;
  };

  // 获取状态对应的图标
  const getStateIcon = (state: InterviewState): JSX.Element => {
    switch (state) {
      case InterviewState.IDLE:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <polygon fill="currentColor" points="10,8 16,12 10,16"/>
          </svg>
        );
      case InterviewState.INITIALIZING:
      case InterviewState.AI_THINKING:
      case InterviewState.GENERATING_ANSWER:
        return (
          <div className="ai-loading-spinner">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        );
      case InterviewState.AI_SPEAKING:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15v5s3-1 6-3-6-3-6-3M12 15l-2-2m2 2l2-2M12 15V9a3 3 0 013-3v0a3 3 0 013 3v2"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case InterviewState.USER_LISTENING:
      case InterviewState.USER_SPEAKING:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 1v0a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3v0zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case InterviewState.COMPLETED:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case InterviewState.ERROR:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      default:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        );
    }
  };

  // 渲染问题历史
  const renderQuestionsHistory = () => {
    if (questionsHistory.length === 0) {
      return null;
    }

    return (
      <div className="interview-questions-history">
        {questionsHistory.map((item) => (
          <div key={item.sequence} className="interview-question-item">
            <div className="question-header">
              <span className="question-number">问题 {item.sequence + 1}</span>
              <span className="question-timestamp">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              {item.isComplete && (
                <span className="question-status completed">已完成</span>
              )}
            </div>

            <div className="question-content">
              <div className="question-text">
                <strong>面试官：</strong>
                {item.question}
              </div>

              {item.answer && (
                <div className="answer-section">
                  <div className="answer-label">参考答案：</div>
                  <div className="answer-text">{item.answer}</div>
                </div>
              )}

              {item.userResponse && (
                <div className="user-response-section">
                  <div className="response-label">您的回答：</div>
                  <div className="response-text">{item.userResponse}</div>
                </div>
              )}

              {item.analysis && (
                <div className="analysis-section">
                  <details className="analysis-details">
                    <summary>AI分析</summary>
                    <div className="analysis-content">
                      {item.analysis.pros && (
                        <div className="analysis-item pros">
                          <strong>优点：</strong>
                          <p>{item.analysis.pros}</p>
                        </div>
                      )}
                      {item.analysis.cons && (
                        <div className="analysis-item cons">
                          <strong>不足：</strong>
                          <p>{item.analysis.cons}</p>
                        </div>
                      )}
                      {item.analysis.suggestions && (
                        <div className="analysis-item suggestions">
                          <strong>建议：</strong>
                          <p>{item.analysis.suggestions}</p>
                        </div>
                      )}
                      {item.analysis.assessment && (
                        <div className="analysis-item assessment">
                          <strong>评价：</strong>
                          <p>{item.analysis.assessment}</p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染当前问题和答案
  const renderCurrentSession = () => {
    if (!currentQuestion && interviewState === InterviewState.IDLE) {
      return (
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            {getStateIcon(interviewState)}
          </div>
          <div className="ai-empty-title">准备开始面试</div>
          <div className="ai-empty-description">
            选择岗位和模型后点击"开始模拟面试"
          </div>
        </div>
      );
    }

    return (
      <div className="current-interview-session">
        {/* 当前问题 */}
        {currentQuestion && (
          <div className="current-question animate__animated animate__fadeInUp">
            <div className="question-header">
              <span className="question-label">当前问题</span>
              {progress && (
                <span className="question-progress">
                  {progress.current}/{progress.total} ({progress.percentage}%)
                </span>
              )}
            </div>
            <div className="question-content">
              <strong>面试官：</strong>
              {currentQuestion}
            </div>
          </div>
        )}

        {/* 当前参考答案 */}
        {(displayedAnswer || isGeneratingAnswer) && (
          <div className="current-answer animate__animated animate__fadeInUp">
            <div className="answer-header">
              <span className="answer-label">
                {isGeneratingAnswer ? '正在生成参考答案...' : '参考答案'}
              </span>
            </div>
            <div className="answer-content">
              {displayedAnswer && (
                <>
                  {displayedAnswer.split('\n').map((line, index) => (
                    <div key={index} className="answer-line">
                      {line || '\u00A0'}
                    </div>
                  ))}
                  {showStreamingCursor && (
                    <span className="streaming-cursor">▌</span>
                  )}
                </>
              )}
              {isGeneratingAnswer && !displayedAnswer && (
                <div className="ai-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 状态指示器 */}
        {interviewState !== InterviewState.IDLE && interviewState !== InterviewState.COMPLETED && (
          <div className="interview-status-indicator">
            <div className="status-icon">
              {getStateIcon(interviewState)}
            </div>
            <div className="status-text">
              {getStateDescription(interviewState)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ai-window-body mock-interview-body" ref={contentRef}>
      {/* 进度条 */}
      {progress && progress.total > 0 && (
        <div className="interview-progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.percentage}%` }}
          />
          <div className="progress-text">
            面试进度: {progress.current}/{progress.total}
          </div>
        </div>
      )}

      {/* 问题历史 */}
      {renderQuestionsHistory()}

      {/* 当前会话 */}
      {renderCurrentSession()}
    </div>
  );
}