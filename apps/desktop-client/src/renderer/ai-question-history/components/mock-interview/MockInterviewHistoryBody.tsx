import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { useEffect, useRef, useState } from 'react';
import { logger } from '../../../../utils/rendererLogger.js';
import { InterviewReview, conversationHistoryService } from '../../api/conversationHistoryService';

interface WindowBodyProps {
  interviewId?: string;
  onDataLoaded?: (reviews: InterviewReview[]) => void;
  filteredReviews?: InterviewReview[];
  refreshTrigger?: number;
}

export function MockInterviewHistoryBody({
  interviewId,
  onDataLoaded,
  filteredReviews,
  refreshTrigger
}: WindowBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<InterviewReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const isFirstLoadRef = useRef(true);

  // 处理点击历史记录卡片
  const handleReviewClick = (review: InterviewReview) => {
    setSelectedReviewId(review.id);
    // 通过 BroadcastChannel 发送消息到 AI Question 窗口
    const channel = new BroadcastChannel('mock-interview-history-click');
    channel.postMessage({
      type: 'LOAD_HISTORY_REVIEW',
      data: {
        askedQuestion: review.askedQuestion,
        aiMessage: review.referenceAnswer,
        candidateAnswer: review.candidateAnswer,
      }
    });
    channel.close();
  };

  // 监听中间窗口的取消选中消息
  useEffect(() => {
    const channel = new BroadcastChannel('mock-interview-history-click');
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CLEAR_SELECTION') {
        setSelectedReviewId(null);
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // 加载模拟面试记录
  useEffect(() => {
    // 当 interviewId 为 undefined 时，清空数据（用户退出了面试页面）
    if (!interviewId) {
      setReviews([]);
      onDataLoaded?.([]);
      return;
    }

    const loadReviews = async (showLoading = false) => {
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const data = await conversationHistoryService.getInterviewReviews(interviewId);
        setReviews(data);
        // 通知父组件原始数据
        onDataLoaded?.(data);
      } catch (error) {
        logger.error(`加载模拟面试记录失败: ${error}`);
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    };

    // 首次加载显示 loading，后续静默刷新
    const isFirstLoad = isFirstLoadRef.current;
    isFirstLoadRef.current = false;
    loadReviews(isFirstLoad);

    // 设置 30 秒自动刷新（静默刷新，不显示 loading）
    const refreshInterval = setInterval(() => {
      loadReviews(false);
    }, 30000);

    // 清理定时器
    return () => {
      clearInterval(refreshInterval);
    };
  }, [interviewId, onDataLoaded, refreshTrigger]);

  // 使用过滤后的数据进行显示
  const displayReviews = filteredReviews !== undefined ? filteredReviews : reviews;

  // 截断文本并显示省略号
  const truncateText = (text: string | undefined, maxLines: number = 2) => {
    if (!text) return '';
    const words = text.split('');
    const maxChars = maxLines * 40; // 假设每行约 40 个字符
    if (words.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  };

  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={500}>
      <div className="ai-window-body conversation-history-body" ref={containerRef}>
        {displayReviews.length === 0 && !isLoading ? (
          // 查询结果为空时显示空状态
          <div className="ai-empty-state">
            <div className="ai-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="ai-empty-title">
              {!interviewId ? '当前没有进行中的面试' : '暂无面试记录'}
            </div>
            <div className="ai-empty-description">
              {!interviewId
                ? '点击面试官窗口的"开始面试"按钮开始新的模拟面试'
                : '当前面试还没有问答记录，开始回答问题后将显示在这里'}
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
              <div
                key={review.id}
                className={`interview-review-card ${selectedReviewId === review.id ? 'interview-review-card-selected' : ''}`}
                onClick={() => handleReviewClick(review)}
                style={{ cursor: 'pointer' }}
              >
                {/* 卡片序号 */}
                <div className="card-index">{index + 1}</div>

                {/* 面试官问题 */}
                <div className="review-section interviewer-section">
                  <div className="section-header">
                    <span className="review-label interviewer-label">面试官问题:</span>
                    <span className="created-time">{new Date(review.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                  </div>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span className="review-content">
                        {truncateText(review.askedQuestion)}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="radix-tooltip-content">
                        {review.askedQuestion || '暂无内容'}
                        <Tooltip.Arrow className="radix-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>

                {/* AI 回答 */}
                <div className="review-section ai-section">
                  <div className="review-label ai-label">AI 回答:</div>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span className="review-content">
                        {truncateText(review.referenceAnswer)}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="radix-tooltip-content">
                        {review.referenceAnswer || '暂无内容'}
                        <Tooltip.Arrow className="radix-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>

                {/* 我的回答 */}
                <div className="review-section candidate-section">
                  <div className="review-label candidate-label">我的回答:</div>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span className="review-content">
                        {truncateText(review.candidateAnswer)}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="radix-tooltip-content">
                        {review.candidateAnswer || '暂无内容'}
                        <Tooltip.Arrow className="radix-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}