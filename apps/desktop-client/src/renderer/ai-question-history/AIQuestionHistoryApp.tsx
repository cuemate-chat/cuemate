import { useCallback, useEffect, useState } from 'react';
import { WindowBody } from './WindowBody';
import { WindowFooter } from './WindowFooter';
import { WindowHeader } from './WindowHeader';
import { ConversationDetailResponse, ConversationHistoryItem, conversationHistoryService } from './api/conversationHistoryService';
import './index.css';

export function AIQuestionHistoryApp() {
  // 状态管理
  const [conversations, setConversations] = useState<ConversationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<number>();
  
  const pageSize = 5;
  const totalPages = Math.ceil(totalItems / pageSize);

  // 加载对话历史
  const loadConversations = useCallback(async (page: number = 1, search?: string) => {
    try {
      console.log('开始加载对话历史, page:', page, 'search:', search);
      setIsLoading(true);
      const result = await conversationHistoryService.getConversationHistory(
        page, 
        pageSize, 
        'all', 
        search
      );
      
      console.log('获取对话历史结果:', result);
      console.log('conversations 数组:', result.items);
      console.log('conversations 长度:', result.items?.length);
      setConversations(result.items);
      setTotalItems(result.total);
    } catch (error) {
      console.error('加载对话历史失败:', error);
      setConversations([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // 初始化加载
  useEffect(() => {
    loadConversations(1);
  }, [loadConversations]);

  // 搜索处理
  const handleSearch = useCallback(async (value: string) => {
    setSearchValue(value);
    setCurrentPage(1); // 重置到第一页
    await loadConversations(1, value);
  }, [loadConversations]);

  // 页码变化处理
  const handlePageChange = useCallback(async (page: number) => {
    setCurrentPage(page);
    await loadConversations(page, searchValue);
  }, [loadConversations, searchValue]);

  // 对话选择处理
  const handleConversationSelect = async (conversation: ConversationHistoryItem) => {
    try {
      setSelectedConversationId(conversation.id);
      
      // 获取对话详情
      const detail: ConversationDetailResponse = await conversationHistoryService.getConversationDetail(conversation.id);
      
      // 发送消息给AI问答窗口
      if ((window as any).electronAPI?.loadConversation) {
        const messages = detail.messages.map(msg => ({
          id: msg.id.toString(),
          type: msg.message_type === 'user' ? 'user' as const : 'ai' as const,
          content: msg.content
        }));
        
        await (window as any).electronAPI.loadConversation({
          conversationId: conversation.id,
          messages: messages
        });
        
        // 显示AI问答窗口
        await (window as any).electronAPI.showAIQuestion?.();
      }
    } catch (error) {
      console.error('加载对话详情失败:', error);
    }
  };

  // 对话删除处理
  const handleConversationDelete = async (conversationId: number) => {
    try {
      const success = await conversationHistoryService.deleteConversation(conversationId);
      if (success) {
        // 重新加载当前页数据
        await loadConversations(currentPage, searchValue);
        
        // 如果删除的是当前选中的对话，清除选中状态
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(undefined);
        }
      }
    } catch (error) {
      console.error('删除对话失败:', error);
    }
  };

  const handleClose = async () => {
    try {
      (window as any).electronHistoryAPI?.closeSelf?.();
    } catch {}
  };

  return (
    <div className="ai-question-app">
      <div className="ai-question-window">
        <WindowHeader 
          onClose={handleClose} 
          searchValue={searchValue}
          onSearchChange={handleSearch}
        />
        <WindowBody 
          conversations={conversations}
          isLoading={isLoading}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
          onConversationDelete={handleConversationDelete}
        />
        <WindowFooter
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}


