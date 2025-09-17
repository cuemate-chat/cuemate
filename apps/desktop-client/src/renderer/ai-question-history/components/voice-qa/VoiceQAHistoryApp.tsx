import { useCallback, useEffect, useState } from 'react';
import { ConversationDetailResponse, ConversationHistoryItem, conversationHistoryService } from '../../api/conversationHistoryService';
import '../../index.css';
import { VoiceQAHistoryBody } from './VoiceQAHistoryBody';
import { VoiceQAHistoryFooter } from './VoiceQAHistoryFooter';
import { VoiceQAHistoryHeader } from './VoiceQAHistoryHeader';

export function VoiceQAHistoryApp() {
  // 状态管理
  const [conversations, setConversations] = useState<ConversationHistoryItem[]>([]);
  const [allConversations, setAllConversations] = useState<ConversationHistoryItem[]>([]); // 存储所有对话，用于前端过滤
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<number>();
  
  const pageSize = 5;

  // 加载所有对话历史（用于前端过滤）
  const loadAllConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      // 加载大量数据，假设最多1000条
      const result = await conversationHistoryService.getConversationHistory(
        1, 
        1000, 
        'all'
      );
      
      setAllConversations(result.items);
      // 如果没有搜索，显示第一页数据
      if (!searchValue) {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setConversations(result.items.slice(startIndex, endIndex));
        setTotalItems(result.items.length);
      } else {
        // 如果有搜索，应用过滤
        filterConversations(searchValue, result.items);
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
      setAllConversations([]);
      setConversations([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, currentPage, searchValue]);

  // 前端过滤对话
  const filterConversations = useCallback((searchTerm: string, allItems?: ConversationHistoryItem[]) => {
    const items = allItems || allConversations;
    if (!searchTerm.trim()) {
      // 没有搜索词，显示分页数据
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      setConversations(items.slice(startIndex, endIndex));
      setTotalItems(items.length);
    } else {
      // 有搜索词，过滤数据
      const filtered = items.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model_provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // 应用分页到过滤后的数据
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      setConversations(filtered.slice(startIndex, endIndex));
      setTotalItems(filtered.length);
    }
  }, [allConversations, currentPage, pageSize]);

  // 初始化加载
  useEffect(() => {
    loadAllConversations();
  }, []);

  // 当页码或搜索词变化时，重新过滤数据
  useEffect(() => {
    if (allConversations.length > 0) {
      filterConversations(searchValue);
    }
  }, [currentPage, searchValue, allConversations, filterConversations]);

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    setCurrentPage(1); // 重置到第一页
    // 不需要await，因为useEffect会处理过滤
  }, []);

  // 页码变化处理
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // 不需要await，因为useEffect会处理过滤
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    loadAllConversations();
  }, [loadAllConversations]);

  // 对话选择处理
  const handleConversationSelect = async (conversation: ConversationHistoryItem) => {
    try {
      setSelectedConversationId(conversation.id);
      
      // 获取对话详情
      const detail: ConversationDetailResponse = await conversationHistoryService.getConversationDetail(conversation.id);
      
      // 发送消息给AI问答窗口
      if ((window as any).electronHistoryAPI?.loadConversation) {
        const messages = detail.messages.map(msg => ({
          id: msg.id.toString(),
          type: msg.message_type === 'user' ? 'user' as const : 'ai' as const,
          content: msg.content
        }));
        
        await (window as any).electronHistoryAPI.loadConversation({
          conversationId: conversation.id,
          status: detail.conversation.status,
          messages: messages
        });
      }
      
      // 显示AI问答窗口
      if ((window as any).electronHistoryAPI?.showAIQuestion) {
        await (window as any).electronHistoryAPI.showAIQuestion();
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
        // 重新加载数据
        handleRefresh();
        
        // 如果删除的是当前选中的对话，清除选中状态
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(undefined);
        }
      }
    } catch (error) {
      console.error('删除对话失败:', error);
    }
  };

  // 对话停止处理
  const handleConversationStop = async (conversationId: number) => {
    try {
      const success = await conversationHistoryService.stopConversation(conversationId);
      if (success) {
        // 重新加载数据以更新状态显示
        handleRefresh();
      }
    } catch (error) {
      console.error('停止对话失败:', error);
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
        <VoiceQAHistoryHeader 
          onClose={handleClose}
          onRefresh={handleRefresh}
          searchValue={searchValue}
          onSearchChange={handleSearch}
        />
        <VoiceQAHistoryBody 
          conversations={conversations}
          isLoading={isLoading}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
          onConversationDelete={handleConversationDelete}
          onConversationStop={handleConversationStop}
        />
        <VoiceQAHistoryFooter
          currentPage={currentPage}
          onPageChange={handlePageChange}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
