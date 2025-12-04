import { useCallback, useEffect, useState } from 'react';
import { useVoiceState } from '../../../../utils/voiceState';
import { InterviewReview } from '../../api/conversationHistoryService';
import '../../index.css';
import { InterviewTrainingHistoryBody } from './InterviewTrainingHistoryBody';
import { InterviewTrainingHistoryFooter } from './InterviewTrainingHistoryFooter';
import { InterviewTrainingHistoryHeader } from './InterviewTrainingHistoryHeader';

export function InterviewTrainingHistoryApp() {
  // 状态管理
  const [searchValue, setSearchValue] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [allReviews, setAllReviews] = useState<InterviewReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<InterviewReview[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 从 VoiceState 获取当前面试 ID
  const voiceState = useVoiceState();
  const interviewId = voiceState.interviewId;

  // Body 组件回调，用于获取原始数据
  const handleDataLoaded = useCallback((reviews: InterviewReview[]) => {
    setAllReviews(reviews);
  }, []);

  // 搜索过滤逻辑
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredReviews(allReviews);
      setTotalItems(allReviews.length);
    } else {
      const filtered = allReviews.filter(review => {
        const searchTerm = searchValue.toLowerCase();
        return (
          (review.askedQuestion?.toLowerCase().includes(searchTerm)) ||
          (review.candidateAnswer?.toLowerCase().includes(searchTerm)) ||
          (review.referenceAnswer?.toLowerCase().includes(searchTerm))
        );
      });
      setFilteredReviews(filtered);
      setTotalItems(filtered.length);
    }
  }, [allReviews, searchValue]);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    // 更新刷新触发器，让 Body 组件重新加载数据
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleClose = async () => {
    try {
      (window as any).electronHistoryAPI?.closeSelf?.();
    } catch {}
  };

  return (
    <div className="ai-question-app">
      <div className="ai-question-window">
        <InterviewTrainingHistoryHeader
          onClose={handleClose}
          onRefresh={handleRefresh}
          searchValue={searchValue}
          onSearchChange={handleSearch}
        />
        <InterviewTrainingHistoryBody
          interviewId={interviewId}
          onDataLoaded={handleDataLoaded}
          filteredReviews={filteredReviews}
          refreshTrigger={refreshTrigger}
        />
        <InterviewTrainingHistoryFooter
          totalItems={totalItems}
        />
      </div>
    </div>
  );
}
