import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { InterviewReview, conversationHistoryService } from '../../api/conversationHistoryService';

interface WindowBodyProps {
  interviewId?: string;
  onDataLoaded?: (reviews: InterviewReview[]) => void;
  filteredReviews?: InterviewReview[];
}

export function MockInterviewHistoryBody({
  interviewId,
  onDataLoaded,
  filteredReviews
}: WindowBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<InterviewReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载模拟面试记录
  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      try {
        const data = !interviewId ? [] : await conversationHistoryService.getInterviewReviews(interviewId);
        setReviews(data);
        // 通知父组件原始数据
        onDataLoaded?.(data);
      } catch (error) {
        console.error('加载模拟面试记录失败:', error);
        setReviews([]);
        onDataLoaded?.([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();
  }, [interviewId, onDataLoaded]);

  // 使用过滤后的数据进行显示
  const displayReviews = filteredReviews !== undefined ? filteredReviews : reviews;

  // 截断文本并显示省略号
  const truncateText = (text: string | undefined, maxLines: number = 2) => {
    if (!text) return '';
    const words = text.split('');
    const maxChars = maxLines * 40; // 假设每行约40个字符
    if (words.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  };

  return (
    <div className="ai-window-body conversation-history-body" ref={containerRef}>
      {displayReviews.length === 0 && !isLoading ? (
        // 查询结果为空时显示空状态
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ai-empty-title">暂无面试记录</div>
          <div className="ai-empty-description">
            请开始面试以生成模拟面试记录
          </div>
        </div>
      ) : isLoading ? (
        // 加载状态
        <div className="ai-loading-state">
          <div className="ai-loading-spinner" />
          <div className="ai-loading-text">加载面试记录中...</div>
        </div>
      ) : (
        // 面试记录卡片列表
        <div className="conversation-list">
          {displayReviews.map((review, index) => (
            <Tooltip.Provider key={review.id}>
              <div className="interview-review-card">
                {/* 卡片序号 */}
                <div className="card-index">{index + 1}</div>

                {/* 面试官问题 */}
                <div className="review-section interviewer-section">
                  <div className="section-header">
                    <span className="review-label interviewer-label">面试官问题:</span>
                    <div className="time-with-tooltip">
                      <span className="created-time">{new Date(review.created_at * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Info size={14} className="tooltip-icon" />
                        </Tooltip.Trigger>
                        <Tooltip.Content className="radix-tooltip-content max-w-lg">
                          <div className="tooltip-content">
                            <div className="tooltip-section">
                              <strong className="interviewer-label">面试官问题:</strong>
                              <p>{review.asked_question}</p>
                            </div>
                            <div className="tooltip-section">
                              <strong className="ai-label">AI 回答:</strong>
                              <p>{review.reference_answer}</p>
                            </div>
                            <div className="tooltip-section">
                              <strong className="candidate-label">我的回答:</strong>
                              <p>{review.candidate_answer}</p>
                            </div>
                          </div>
                          <Tooltip.Arrow className="radix-tooltip-arrow" />
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </div>
                  </div>
                  <div className="review-content">
                    {truncateText(review.asked_question)}
                  </div>
                </div>

                {/* AI 回答 */}
                <div className="review-section ai-section">
                  <div className="review-label ai-label">AI 回答:</div>
                  <div className="review-content">
                    {truncateText(review.reference_answer)}
                  </div>
                </div>

                {/* 我的回答 */}
                <div className="review-section candidate-section">
                  <div className="review-label candidate-label">我的回答:</div>
                  <div className="review-content">
                    {truncateText(review.candidate_answer)}
                  </div>
                </div>
              </div>
            </Tooltip.Provider>
          ))}
        </div>
      )}
    </div>
  );
}