import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { aiService } from '../../../utils/ai/aiService';
import { clearVoiceQAState, setVoiceQAState, useVoiceQAState } from '../../../utils/voiceQA';
import { conversationService } from '../../api/conversationService.ts';
import { interviewService } from '../shared/services/InterviewService';
import { VoiceQABody } from './VoiceQABody.tsx';
import { VoiceQAFooter } from './VoiceQAFooter.tsx';
import { VoiceQAHeader } from './VoiceQAHeader.tsx';

export function VoiceQAApp() {
  const [question, setQuestion] = useState('');
  const qa = useVoiceQAState();

  // 同步 voiceQA 状态到本地 question
  useEffect(() => {
    if (qa.confirmedText !== question) {
      setQuestion(qa.confirmedText);
    }
  }, [qa.confirmedText]);

  // 统一的 setQuestion 方法，同时更新两个状态
  const updateQuestion = (newQuestion: string) => {
    setQuestion(newQuestion);
    setVoiceQAState({ confirmedText: newQuestion, tempText: '' });
  };
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentConversationStatus, setCurrentConversationStatus] = useState<'active' | 'completed' | 'error' | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [heightPercentage, setHeightPercentage] = useState(75); // 默认 75%
  
  // 创建 ref 用于 VoiceQABody 实现复制 AI 回答的功能
  const copyLastAIResponseRef = useRef<(() => Promise<void>) | null>(null);

  // 组件初始化时恢复最近对话和高度设置
  useEffect(() => {
    initializeConversation();
    loadHeightSetting();
  }, []);

  // 加载高度设置
  const loadHeightSetting = async () => {
    try {
      const savedHeight = localStorage.getItem('ai-window-height-percentage');
      if (savedHeight) {
        const percentage = parseInt(savedHeight, 10);
        setHeightPercentage(percentage);
        // 同步到主进程
        if ((window as any).electronAPI?.setAIWindowHeight) {
          await (window as any).electronAPI.setAIWindowHeight(percentage);
        }
      } else {
        // 默认 75%，同步到主进程
        if ((window as any).electronAPI?.setAIWindowHeight) {
          await (window as any).electronAPI.setAIWindowHeight(75);
        }
      }
    } catch (error) {
      console.error('加载高度设置失败:', error);
    }
  };

  // 监听历史对话加载事件
  useEffect(() => {
    const handleLoadConversation = (conversationData: any) => {
      
      if (conversationData && conversationData.messages) {
        // 清空当前消息
        setMessages([]);
        
        // 加载历史消息
        const loadedMessages = conversationData.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content
        }));
        
        setMessages(loadedMessages);
        setCurrentConversationId(conversationData.conversationId);
        setCurrentConversationStatus(conversationData.status || 'active');
        setSequenceNumber(loadedMessages.length + 1);
        
      }
    };

    // 注册事件监听器
    if ((window as any).electronAPI?.onLoadConversation) {
      (window as any).electronAPI.onLoadConversation(handleLoadConversation);
    }

    // 清理函数
    return () => {
      if ((window as any).electronAPI?.removeLoadConversationListener) {
        (window as any).electronAPI.removeLoadConversationListener();
      }
    };
  }, []);

  // 监听窗口高度变化事件
  useEffect(() => {
    const handleWindowHeightChanged = (data: { heightPercentage: number }) => {
      setHeightPercentage(data.heightPercentage);
    };

    // 注册事件监听器
    if ((window as any).electronAPI?.onWindowHeightChanged) {
      (window as any).electronAPI.onWindowHeightChanged(handleWindowHeightChanged);
    }

    // 清理函数
    return () => {
      if ((window as any).electronAPI?.removeWindowHeightChangedListener) {
        (window as any).electronAPI.removeWindowHeightChangedListener();
      }
    };
  }, []);

  const initializeConversation = async () => {
    try {
      setIsInitializing(true);
      
      // 尝试获取最新的活跃对话
      const latestConversation = await conversationService.getLatestActiveConversation();
      
      if (latestConversation) {
        setCurrentConversationId(latestConversation.conversation.id);
        setCurrentConversationStatus(latestConversation.conversation.status);
        
        // 恢复消息
        const restoredMessages = latestConversation.messages.map(msg => ({
          id: msg.id.toString(),
          type: msg.message_type === 'user' ? 'user' as const : 'ai' as const,
          content: msg.content
        }));
        setMessages(restoredMessages);
        
        // 设置下一个消息的序列号
        setSequenceNumber(latestConversation.messages.length + 1);
      } else {
        setCurrentConversationId(null);
        setCurrentConversationStatus(null);
        setSequenceNumber(1);
        setMessages([]);
      }
    } catch (error) {
      console.error('初始化对话失败:', error);
      setCurrentConversationId(null);
      setCurrentConversationStatus(null);
      setSequenceNumber(1);
      setMessages([]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;
    
    // 检查当前对话状态，如果已完成则阻止提交
    if (currentConversationStatus === 'completed') {
      alert('当前对话已完成，无法继续提问。请点击"新建提问"开始新的对话。');
      return;
    }
    
    setIsLoading(true);
    const currentQuestion = question;
    updateQuestion('');
    
    let conversationId = currentConversationId;
    let currentSeq = sequenceNumber;
    
    // 如果没有当前对话，创建新对话
    if (!conversationId) {
      const title = currentQuestion.length > 50 ? currentQuestion.substring(0, 50) + '...' : currentQuestion;
      conversationId = await conversationService.createConversation(title);
      
      if (!conversationId) {
        console.error('创建对话失败');
        setIsLoading(false);
        updateQuestion(currentQuestion); // 恢复输入
        return;
      }
      
      setCurrentConversationId(conversationId);
      setCurrentConversationStatus('active');
    }
    
    // 添加用户消息到 UI
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentQuestion
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 保存用户消息到数据库
    await conversationService.saveMessage(conversationId, 'user', currentQuestion, currentSeq);
    currentSeq++;
    
    // 创建 AI 消息占位符
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage = {
      id: aiMessageId,
      type: 'ai' as const,
      content: ''
    };
    setMessages(prev => [...prev, aiMessage]);
    
    let aiResponseContent = '';
    const startTime = Date.now();

    // 用于保存 RAG 查询结果
    let ragQuestionId: string | undefined = undefined;
    let ragQuestion: string | undefined = undefined;
    let ragAnswer: string | undefined = undefined;
    let ragOtherId: string | undefined = undefined;
    let ragOtherContent: string | undefined = undefined;

    try {
      // 查询所有岗位的押题（语音提问不需要选择岗位）
      let ragResultText = '';
      try {
        const ragResult = await interviewService.findSimilarQuestionInAllJobs(
          currentQuestion,
          0.8
        );

        // 保存 RAG 查询结果，用于后续保存到 ChromaDB
        ragQuestionId = ragResult.questionId;
        ragQuestion = ragResult.question;
        ragAnswer = ragResult.answer;
        ragOtherId = ragResult.otherId;
        ragOtherContent = ragResult.otherContent;

        // 构建 RAG 增强的问题提示
        if (ragResult.answer || ragResult.otherContent) {
          ragResultText = '\n\n';
          if (ragResult.answer) {
            ragResultText += `[相关题库答案]：${ragResult.answer}\n`;
          }
          if (ragResult.otherContent) {
            ragResultText += `[相关项目资料]：${ragResult.otherContent}`;
          }
        }
      } catch (ragError) {
        // RAG 查询失败不影响正常提问流程
      }

      // 从共享状态获取选中的模型
      const selectedModelId = qa.selectedModelId;

      // 获取用户数据和模型信息
      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const userData = userDataResult?.success ? userDataResult.userData : null;

      let modelToUse = userData?.model;
      let modelParams = userData?.model_params || [];

      // 如果用户选择了自定义模型，尝试获取该模型
      if (selectedModelId && selectedModelId !== userData?.model?.id) {
        const { modelService } = await import('../../../interviewer/api/modelService');
        const modelResult = await modelService.getModels({ type: 'llm' });
        const selectedModel = modelResult.list.find((m: any) => m.id === selectedModelId);
        if (selectedModel) {
          modelToUse = selectedModel;
        }
      }

      if (!modelToUse) {
        throw new Error('请先在设置中配置 AI 模型');
      }

      // 准备模型配置
      const modelConfig = {
        provider: modelToUse.provider,
        model_name: modelToUse.model_name,
        credentials: modelToUse.credentials || '{}',
      };

      // 构建最终的用户问题（可能包含 RAG 结果）
      const finalQuestion = ragResultText ? `${currentQuestion}${ragResultText}` : currentQuestion;

      // 使用 AI 服务进行流式调用（使用自定义模型）
      await aiService.callAIStreamWithCustomModel(
        [{ role: 'user', content: finalQuestion }],
        modelConfig,
        modelParams,
        async (chunk) => {
          if (chunk.error) {
            console.error('AI 调用出错:', chunk.error);
            const errorMessage = `抱歉，AI 调用出错了：${chunk.error}`;
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: errorMessage }
                : msg
            ));
            
            // 保存错误消息到数据库
            conversationService.saveMessage(
              conversationId!,
              'assistant',
              errorMessage,
              currentSeq,
              0,
              Date.now() - startTime,
              chunk.error
            );
            
            setSequenceNumber(currentSeq + 1);
            setIsLoading(false);
            return;
          }

          if (chunk.finished) {
            // 提取 token 使用情况
            const tokenCount = chunk.usage?.totalTokens || 0;

            // 保存完整 AI 回答到数据库
            if (aiResponseContent && conversationId) {
              await conversationService.saveMessage(
                conversationId,
                'assistant',
                aiResponseContent,
                currentSeq,
                tokenCount,
                Date.now() - startTime
              );
              setSequenceNumber(currentSeq + 1);

              // 如果使用了 RAG（有押题或其他文件命中），保存到 ChromaDB 作为 AI 向量记录
              if (ragQuestionId || ragOtherId) {
                await interviewService.saveAIVectorRecord({
                  id: crypto.randomUUID(),
                  interview_id: conversationId.toString(),
                  note_type: 'voice_qa',
                  content: '',
                  question_id: ragQuestionId,
                  question: ragQuestion,
                  answer: ragAnswer,
                  asked_question: currentQuestion,
                  reference_answer: aiResponseContent,
                  other_id: ragOtherId,
                  other_content: ragOtherContent,
                  created_at: Date.now(),
                });
              }
            }

            setIsLoading(false);
            return;
          }

          // 流式更新 AI 消息内容
          if (chunk.content) {
            aiResponseContent += chunk.content;
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: aiResponseContent }
                : msg
            ));
          }
        }
      );
    } catch (error) {
      console.error('AI 调用失败:', error);
      const errorMessage = `AI 调用失败：${(error as Error).message}`;
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorMessage }
          : msg
      ));
      
      // 保存错误消息到数据库
      if (conversationId) {
        await conversationService.saveMessage(
          conversationId,
          'assistant',
          errorMessage,
          currentSeq,
          0,
          Date.now() - startTime,
          (error as Error).message
        );
        setSequenceNumber(currentSeq + 1);
      }
      
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClose = async () => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.hideAIQuestion();
      }
    } catch (error) {
      console.error('关闭 AI 问题窗口失败:', error);
    }
  };

  // 处理高度变化
  const handleHeightChange = async (percentage: number) => {
    try {
      setHeightPercentage(percentage);
      // 保存到 localStorage
      localStorage.setItem('ai-window-height-percentage', percentage.toString());
      // 同步到主进程
      if ((window as any).electronAPI?.setAIWindowHeight) {
        await (window as any).electronAPI.setAIWindowHeight(percentage);
      }
    } catch (error) {
      console.error('设置窗口高度失败:', error);
    }
  };

  // 新建提问：开始新对话
  const handleNewChat = async () => {
    if (isLoading) return;

    setCurrentConversationId(null);
    setCurrentConversationStatus(null);
    setSequenceNumber(1);
    setMessages([]);
    updateQuestion('');
    // 同步清空 voiceQA 状态
    clearVoiceQAState();
  };

  const handleAskMore = (questionText: string) => {
    // 先设置问题，然后立即提交
    updateQuestion(questionText);
    // 使用 setTimeout 确保状态更新后再提交
    setTimeout(() => {
      if (questionText.trim() && !isLoading) {
        handleSubmit();
      }
    }, 0);
  };

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <VoiceQAHeader 
          isLoading={isLoading} 
          onClose={handleClose} 
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
        />

        {/* Body - 对话区域 */}
        <VoiceQABody 
          messages={messages} 
          isLoading={isLoading || isInitializing} 
          onNewChat={handleNewChat}
          onAskMore={handleAskMore}
          onCopyLastAIResponse={copyLastAIResponseRef}
        />

        {/* Footer - 输入区域 */}
        <VoiceQAFooter
          question={question}
          isLoading={isLoading || isInitializing}
          onQuestionChange={updateQuestion}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onNewChat={handleNewChat}
          onCopyLastAIResponse={() => copyLastAIResponseRef.current?.()}
          currentConversationStatus={currentConversationStatus}
        />
      </motion.div>
    </div>
  );
}