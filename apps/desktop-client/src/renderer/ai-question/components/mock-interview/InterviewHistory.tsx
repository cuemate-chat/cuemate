import { ChevronDown, ChevronUp, Clock, MessageSquare, Mic, Brain, CheckCircle, Star } from 'lucide-react';
import { useState } from 'react';

export interface InterviewQuestion {
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
    score?: number;
  };
  timestamp: number;
  isComplete: boolean;
  responseTime?: number;
}

interface InterviewHistoryProps {
  questions: InterviewQuestion[];
  className?: string;
  showAnalysis?: boolean;
  onQuestionSelect?: (sequence: number) => void;
  expandedByDefault?: boolean;
}

export function InterviewHistory({
  questions,
  className = '',
  showAnalysis = true,
  onQuestionSelect,
  expandedByDefault = false
}: InterviewHistoryProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    expandedByDefault ? new Set(questions.map(q => q.sequence)) : new Set()
  );

  const toggleQuestion = (sequence: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(sequence)) {
      newExpanded.delete(sequence);
    } else {
      newExpanded.add(sequence);
    }
    setExpandedQuestions(newExpanded);
  };

  const formatResponseTime = (milliseconds?: number): string => {
    if (!milliseconds) return '--';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const getScoreColor = (score?: number): string => {
    if (!score) return '#666';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score?: number): string => {
    if (!score) return '未评分';
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '需改进';
  };

  if (questions.length === 0) {
    return (
      <div className={`interview-history-empty ${className}`}>
        <div className="empty-icon">
          <MessageSquare size={48} color="#d1d5db" />
        </div>
        <div className="empty-text">暂无面试记录</div>
        <div className="empty-subtitle">开始面试后，问答记录将在这里显示</div>
      </div>
    );
  }

  return (
    <div className={`interview-history ${className}`}>
      <div className="history-header">
        <div className="header-title">
          <MessageSquare size={20} />
          <span>面试记录</span>
          <span className="question-count">({questions.length})</span>
        </div>
        <div className="header-stats">
          <span className="completed-count">
            已完成: {questions.filter(q => q.isComplete).length}
          </span>
        </div>
      </div>

      <div className="history-content">
        {questions.map((question) => {
          const isExpanded = expandedQuestions.has(question.sequence);
          const hasAnalysis = question.analysis && showAnalysis;

          return (
            <div
              key={question.sequence}
              className={`question-item ${isExpanded ? 'expanded' : ''} ${question.isComplete ? 'completed' : 'incomplete'}`}
            >
              {/* 问题头部 */}
              <div
                className="question-header"
                onClick={() => {
                  toggleQuestion(question.sequence);
                  onQuestionSelect?.(question.sequence);
                }}
              >
                <div className="question-number">
                  <span className="number">Q{question.sequence + 1}</span>
                  {question.isComplete && (
                    <CheckCircle size={16} className="complete-icon" />
                  )}
                </div>

                <div className="question-preview">
                  <div className="question-text">
                    {question.question.length > 60
                      ? `${question.question.substring(0, 60)}...`
                      : question.question}
                  </div>
                  <div className="question-meta">
                    <span className="timestamp">
                      <Clock size={12} />
                      {new Date(question.timestamp).toLocaleTimeString()}
                    </span>
                    {question.responseTime && (
                      <span className="response-time">
                        回答用时: {formatResponseTime(question.responseTime)}
                      </span>
                    )}
                    {question.analysis?.score && (
                      <span
                        className="question-score"
                        style={{ color: getScoreColor(question.analysis.score) }}
                      >
                        <Star size={12} />
                        {question.analysis.score}分 ({getScoreLabel(question.analysis.score)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="expand-button">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* 问题详细内容 */}
              {isExpanded && (
                <div className="question-details">
                  {/* 完整问题 */}
                  <div className="detail-section question-section">
                    <div className="section-header">
                      <MessageSquare size={16} />
                      <span>面试官提问</span>
                    </div>
                    <div className="section-content question-content">
                      {question.question}
                    </div>
                  </div>

                  {/* 用户回答 */}
                  {question.userResponse && (
                    <div className="detail-section user-response-section">
                      <div className="section-header">
                        <Mic size={16} />
                        <span>您的回答</span>
                        {question.responseTime && (
                          <span className="response-time-detail">
                            ({formatResponseTime(question.responseTime)})
                          </span>
                        )}
                      </div>
                      <div className="section-content user-response-content">
                        {question.userResponse}
                      </div>
                    </div>
                  )}

                  {/* 参考答案 */}
                  {question.answer && (
                    <div className="detail-section reference-answer-section">
                      <div className="section-header">
                        <Brain size={16} />
                        <span>参考答案</span>
                      </div>
                      <div className="section-content reference-answer-content">
                        {question.answer}
                      </div>
                    </div>
                  )}

                  {/* AI分析 */}
                  {hasAnalysis && (
                    <div className="detail-section analysis-section">
                      <div className="section-header">
                        <Brain size={16} />
                        <span>AI分析报告</span>
                        {question.analysis?.score && (
                          <span
                            className="analysis-score"
                            style={{ color: getScoreColor(question.analysis.score) }}
                          >
                            综合评分: {question.analysis.score}分
                          </span>
                        )}
                      </div>
                      <div className="section-content analysis-content">
                        {question.analysis?.assessment && (
                          <div className="analysis-item assessment">
                            <div className="analysis-label">整体评价</div>
                            <div className="analysis-text">{question.analysis.assessment}</div>
                          </div>
                        )}

                        {question.analysis?.pros && (
                          <div className="analysis-item pros">
                            <div className="analysis-label">回答亮点</div>
                            <div className="analysis-text">{question.analysis.pros}</div>
                          </div>
                        )}

                        {question.analysis?.cons && (
                          <div className="analysis-item cons">
                            <div className="analysis-label">待改进点</div>
                            <div className="analysis-text">{question.analysis.cons}</div>
                          </div>
                        )}

                        {question.analysis?.suggestions && (
                          <div className="analysis-item suggestions">
                            <div className="analysis-label">改进建议</div>
                            <div className="analysis-text">{question.analysis.suggestions}</div>
                          </div>
                        )}

                        {question.analysis?.keyPoints && (
                          <div className="analysis-item key-points">
                            <div className="analysis-label">关键要点</div>
                            <div className="analysis-text">{question.analysis.keyPoints}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 未完成提示 */}
                  {!question.isComplete && (
                    <div className="detail-section incomplete-section">
                      <div className="incomplete-notice">
                        这道题目还未完成，请继续进行面试
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 历史记录统计 */}
      <div className="history-summary">
        <div className="summary-item">
          <span className="summary-label">总题数:</span>
          <span className="summary-value">{questions.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">已完成:</span>
          <span className="summary-value">{questions.filter(q => q.isComplete).length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">有分析:</span>
          <span className="summary-value">{questions.filter(q => q.analysis).length}</span>
        </div>
        {questions.some(q => q.analysis?.score) && (
          <div className="summary-item">
            <span className="summary-label">平均分:</span>
            <span className="summary-value">
              {Math.round(
                questions
                  .filter(q => q.analysis?.score)
                  .reduce((sum, q) => sum + (q.analysis?.score || 0), 0) /
                questions.filter(q => q.analysis?.score).length
              )}分
            </span>
          </div>
        )}
      </div>
    </div>
  );
}