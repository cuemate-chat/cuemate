import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { aiService } from '../../api/aiService.ts';
import { conversationService } from '../../api/conversationService.ts';
import { InterviewTrainingBody } from './InterviewTrainingBody.tsx';
import { InterviewTrainingFooter } from './InterviewTrainingFooter.tsx';
import { InterviewTrainingHeader } from './InterviewTrainingHeader.tsx';
import { TrainingAudioServiceManager } from './audio/TrainingAudioServiceManager';
import { InterviewState } from '../mock-interview/state/InterviewStateMachine';
import { VoiceState } from '../mock-interview/voice/VoiceCoordinator';
import { MockInterviewErrorHandler } from '../mock-interview/error/MockInterviewErrorHandler';
import { ErrorType, ErrorSeverity } from '../mock-interview/error/ErrorHandler';
import { SystemHealthCheck, SystemHealthReport } from '../mock-interview/testing/SystemHealthCheck';
import { DeveloperPanel } from '../mock-interview/components/DeveloperPanel';
import { interviewTrainingDataService } from './data/InterviewTrainingDataService';

export function InterviewTrainingApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai' | 'interviewer', content: string}>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentConversationStatus, setCurrentConversationStatus] = useState<'active' | 'completed' | 'error' | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [heightPercentage, setHeightPercentage] = useState(75); // 默认75%

  // 音频服务状态
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [audioLevel, setAudioLevel] = useState(0);
  const [systemAudioLevel, setSystemAudioLevel] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isSystemAudioListening, setIsSystemAudioListening] = useState(false);
  const audioServiceRef = useRef<TrainingAudioServiceManager | null>(null);

  // 错误处理状态
  const [errorNotification, setErrorNotification] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
    duration: number;
  } | null>(null);
  const errorHandlerRef = useRef<MockInterviewErrorHandler | null>(null);

  // 开发者面板状态
  const [isDeveloperPanelVisible, setIsDeveloperPanelVisible] = useState(false);

  // 系统健康检查状态
  const [, setSystemHealthReport] = useState<SystemHealthReport | null>(null);
  const healthCheckRef = useRef<SystemHealthCheck | null>(null);

  // 面试训练特定状态
  const [currentInterviewState] = useState<InterviewState>(InterviewState.IDLE);
  const [interviewerQuestions, setInterviewerQuestions] = useState<Array<{
    id: string;
    content: string;
    timestamp: number;
  }>>([]);
  const [userAnswers, setUserAnswers] = useState<Array<{
    id: string;
    questionId: string;
    content: string;
    timestamp: number;
  }>>([]);

  // 面试训练数据状态
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [isTrainingComplete, setIsTrainingComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 创建 ref 用于 VoiceQABody 实现复制AI回答的功能
  const copyLastAIResponseRef = useRef<(() => Promise<void>) | null>(null);

  // 组件初始化时恢复最近对话和高度设置
  useEffect(() => {
    initializeConversation();
    loadHeightSetting();
    initializeSystemHealthCheck();
    initializeErrorHandler();
    initializeAudioService();
    initializeTrainingData();
  }, []);

  // 初始化面试训练数据
  const initializeTrainingData = () => {
    const interviewId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    interviewTrainingDataService.initializeTraining(interviewId);
    console.log('面试训练数据服务已初始化:', interviewId);
  };

  // 初始化系统健康检查
  const initializeSystemHealthCheck = async () => {
    healthCheckRef.current = new SystemHealthCheck();

    healthCheckRef.current.addEventListener('healthCheckCompleted', ((event: CustomEvent) => {
      const report = event.detail as SystemHealthReport;
      setSystemHealthReport(report);

      // 根据健康状态显示通知
      if (report.overall === 'critical') {
        setErrorNotification({
          type: 'error',
          message: '系统检查发现严重问题，部分功能可能不可用',
          duration: 8000
        });
      } else if (report.overall === 'degraded') {
        setErrorNotification({
          type: 'warning',
          message: '系统检查发现一些问题，建议检查服务状态',
          duration: 5000
        });
      }

      console.log('📋 面试训练系统健康检查完成:', report);
    }) as EventListener);

    try {
      await healthCheckRef.current.runFullHealthCheck();
    } catch (error) {
      console.error('系统健康检查失败:', error);
    }
  };

  // 初始化错误处理器
  const initializeErrorHandler = () => {
    errorHandlerRef.current = new MockInterviewErrorHandler({
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      retryDelay: 2000,
      showErrorNotifications: true,
      logErrorDetails: true
    });

    // 监听错误事件
    errorHandlerRef.current.addEventListener('errorOccurred', ((event: CustomEvent) => {
      const { error, type, severity } = event.detail;
      console.error('面试训练错误:', error, { type, severity });

      // 显示错误通知
      setErrorNotification({
        type: 'error',
        message: `训练错误: ${error.message}`,
        duration: 5000
      });
    }) as EventListener);

    errorHandlerRef.current.addEventListener('errorRecovered', ((event: CustomEvent) => {
      const { error, recovery } = event.detail;
      console.log('面试训练错误已恢复:', error, recovery);

      setErrorNotification({
        type: 'success',
        message: `训练错误已自动恢复: ${recovery.action}`,
        duration: 3000
      });
    }) as EventListener);
  };

  // 初始化音频服务
  const initializeAudioService = async () => {
    try {
      audioServiceRef.current = new TrainingAudioServiceManager(
        {
          serverUrl: 'ws://localhost:10095',
          language: 'zh',
          sampleRate: 16000
        },
        {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        {
          enableSystemAudioCapture: true,
          volumeThreshold: 0.01
        }
      );

      // 监听音频服务事件
      audioServiceRef.current.addEventListener('serviceInitialized', (() => {
        setIsAudioReady(true);
        console.log('面试训练音频服务初始化完成');
      }) as EventListener);

      audioServiceRef.current.addEventListener('voiceStateChanged', ((event: CustomEvent) => {
        setVoiceState(event.detail.state);
      }) as EventListener);

      audioServiceRef.current.addEventListener('audioLevelChanged', ((event: CustomEvent) => {
        setAudioLevel(event.detail.level);
      }) as EventListener);

      audioServiceRef.current.addEventListener('systemAudioLevelChanged', ((event: CustomEvent) => {
        setSystemAudioLevel(event.detail.level);
      }) as EventListener);

      audioServiceRef.current.addEventListener('systemAudioListeningStarted', (() => {
        setIsSystemAudioListening(true);
      }) as EventListener);

      audioServiceRef.current.addEventListener('systemAudioListeningStopped', (() => {
        setIsSystemAudioListening(false);
      }) as EventListener);

      audioServiceRef.current.addEventListener('interviewerSpeechRecognized', ((event: CustomEvent) => {
        const { text } = event.detail;
        handleInterviewerSpeaking(text);
      }) as EventListener);

      audioServiceRef.current.addEventListener('userFinishedSpeaking', ((event: CustomEvent) => {
        const { text } = event.detail;
        handleUserAnswer(text || '用户回答内容');
      }) as EventListener);

      audioServiceRef.current.addEventListener('serviceError', ((event: CustomEvent) => {
        const { type, severity, error } = event.detail;
        if (errorHandlerRef.current) {
          errorHandlerRef.current.reportError(error, type, severity);
        }
      }) as EventListener);

      await audioServiceRef.current.initialize();
    } catch (error) {
      console.error('面试训练音频服务初始化失败:', error);
      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorType.AUDIO_INITIALIZATION_FAILED,
          ErrorSeverity.HIGH
        );
      }
    }
  };

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
        // 默认75%，同步到主进程
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
    setQuestion('');
    
    let conversationId = currentConversationId;
    let currentSeq = sequenceNumber;
    
    // 如果没有当前对话，创建新对话
    if (!conversationId) {
      const title = currentQuestion.length > 50 ? currentQuestion.substring(0, 50) + '...' : currentQuestion;
      conversationId = await conversationService.createConversation(title);
      
      if (!conversationId) {
        console.error('创建对话失败');
        setIsLoading(false);
        setQuestion(currentQuestion); // 恢复输入
        return;
      }
      
      setCurrentConversationId(conversationId);
      setCurrentConversationStatus('active');
    }
    
    // 添加用户消息到UI
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentQuestion
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 保存用户消息到数据库
    await conversationService.saveMessage(conversationId, 'user', currentQuestion, currentSeq);
    currentSeq++;
    
    // 创建AI消息占位符
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage = {
      id: aiMessageId,
      type: 'ai' as const,
      content: ''
    };
    setMessages(prev => [...prev, aiMessage]);
    
    let aiResponseContent = '';
    const startTime = Date.now();
    
    try {
      // 使用 AI 服务进行流式调用
      await aiService.callAIStream(
        [{ role: 'user', content: currentQuestion }],
        (chunk) => {
          if (chunk.error) {
            console.error('AI调用出错:', chunk.error);
            const errorMessage = `抱歉，AI调用出错了：${chunk.error}`;
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
            
            // 保存完整AI回答到数据库
            if (aiResponseContent && conversationId) {
              conversationService.saveMessage(
                conversationId,
                'assistant',
                aiResponseContent,
                currentSeq,
                0, // token数量暂时为0，后续可以计算
                Date.now() - startTime
              );
              setSequenceNumber(currentSeq + 1);
            }
            
            setIsLoading(false);
            return;
          }

          // 流式更新AI消息内容
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
      console.error('AI调用失败:', error);
      const errorMessage = `AI调用失败：${(error as Error).message}`;
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
      console.error('关闭AI问题窗口失败:', error);
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

  // handleNewChat 函数已经被 resetTraining 替代

  const handleAskMore = (questionText: string) => {
    // 先设置问题，然后立即提交
    setQuestion(questionText);
    // 使用 setTimeout 确保状态更新后再提交
    setTimeout(() => {
      if (questionText.trim() && !isLoading) {
        handleSubmit();
      }
    }, 0);
  };

  // 处理面试官说话事件
  const handleInterviewerSpeaking = (text: string) => {
    try {
      // 使用数据服务添加问题
      const questionId = interviewTrainingDataService.addInterviewerQuestion(text);

      const question = {
        id: questionId,
        content: text,
        timestamp: Date.now()
      };

      // 添加到本地状态
      setInterviewerQuestions(prev => [...prev, question]);

      // 添加到消息历史
      const message = {
        id: `msg_${Date.now()}`,
        type: 'interviewer' as const,
        content: text
      };
      setMessages(prev => [...prev, message]);

      // 设置训练为活跃状态
      if (!isTrainingActive) {
        setIsTrainingActive(true);
      }

      console.log('面试官问题已记录:', { questionId, text });
    } catch (error) {
      console.error('处理面试官说话失败:', error);
      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorType.AUDIO_SERVICE_ERROR,
          ErrorSeverity.MEDIUM
        );
      }
    }
  };

  // 处理用户回答事件
  const handleUserAnswer = (text: string) => {
    try {
      const latestQuestion = interviewerQuestions[interviewerQuestions.length - 1];
      if (!latestQuestion) {
        console.warn('没有找到对应的面试官问题');
        return;
      }

      // 使用数据服务添加回答
      const answerId = interviewTrainingDataService.addUserAnswer(latestQuestion.id, text);

      const answer = {
        id: answerId,
        questionId: latestQuestion.id,
        content: text,
        timestamp: Date.now()
      };

      // 添加到本地状态
      setUserAnswers(prev => [...prev, answer]);

      // 添加到消息历史
      const message = {
        id: `msg_${Date.now()}`,
        type: 'user' as const,
        content: text
      };
      setMessages(prev => [...prev, message]);

      // 更新训练统计信息会在getTrainingProgress中动态获取

      console.log('用户回答已记录:', { answerId, questionId: latestQuestion.id, text });
    } catch (error) {
      console.error('处理用户回答失败:', error);
      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorType.AUDIO_SERVICE_ERROR,
          ErrorSeverity.MEDIUM
        );
      }
    }
  };

  // 启动系统音频监听
  const startSystemAudioListening = async () => {
    if (audioServiceRef.current) {
      try {
        await audioServiceRef.current.startSystemAudioListening();
      } catch (error) {
        console.error('启动系统音频监听失败:', error);
      }
    }
  };

  // 停止系统音频监听
  const stopSystemAudioListening = () => {
    if (audioServiceRef.current) {
      audioServiceRef.current.stopSystemAudioListening();
    }
  };

  // 开始录音
  const startRecording = async () => {
    if (audioServiceRef.current) {
      try {
        await audioServiceRef.current.startRecording();
      } catch (error) {
        console.error('开始录音失败:', error);
      }
    }
  };

  // 停止录音
  const stopRecording = async () => {
    if (audioServiceRef.current) {
      try {
        await audioServiceRef.current.stopRecording();
      } catch (error) {
        console.error('停止录音失败:', error);
      }
    }
  };

  // 结束面试训练
  const finishTraining = async () => {
    try {
      console.log('开始结束面试训练流程');

      // 1. 结束数据收集
      interviewTrainingDataService.finishTraining();
      setIsTrainingComplete(true);

      // 2. 检查是否可以进行分析
      if (!interviewTrainingDataService.canStartAnalysis()) {
        console.warn('数据不足，无法进行分析');
        setErrorNotification({
          type: 'warning',
          message: '面试数据不足，无法生成分析报告',
          duration: 5000
        });
        return;
      }

      // 3. 开始AI分析
      setIsAnalyzing(true);
      setErrorNotification({
        type: 'success',
        message: '面试训练已结束，正在生成AI分析报告...',
        duration: 3000
      });

      // 4. 执行分析
      const result = await interviewTrainingDataService.performAnalysis();

      setAnalysisResult(result);
      setIsAnalyzing(false);

      setErrorNotification({
        type: 'success',
        message: `面试分析完成！总分：${result.analysis.overallScore}分`,
        duration: 8000
      });

      console.log('面试训练分析完成:', result);

    } catch (error) {
      console.error('结束面试训练失败:', error);
      setIsAnalyzing(false);

      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorType.ANSWER_ANALYSIS_FAILED,
          ErrorSeverity.HIGH
        );
      }

      setErrorNotification({
        type: 'error',
        message: `面试分析失败: ${error instanceof Error ? error.message : String(error)}`,
        duration: 8000
      });
    }
  };

  // 获取训练进度信息
  const getTrainingProgress = () => {
    const stats = interviewTrainingDataService.getTrainingStats();
    const analysisProgress = interviewTrainingDataService.getAnalysisProgress();

    return {
      questionCount: stats?.totalQuestions || 0,
      answerCount: stats?.totalAnswers || 0,
      duration: stats?.duration || 0,
      isActive: isTrainingActive,
      isComplete: isTrainingComplete,
      isAnalyzing: isAnalyzing || analysisProgress.isAnalyzing,
      analysisPhase: analysisProgress.phase,
      hasResult: !!analysisResult
    };
  };

  // 重置训练状态
  const resetTraining = () => {
    try {
      interviewTrainingDataService.cleanup();
      setIsTrainingActive(false);
      setIsTrainingComplete(false);
      setAnalysisResult(null);
      setInterviewerQuestions([]);
      setUserAnswers([]);
      setMessages([]);

      // 重新初始化
      initializeTrainingData();

      console.log('面试训练状态已重置');
    } catch (error) {
      console.error('重置训练状态失败:', error);
    }
  };

  // 清理函数
  useEffect(() => {
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.destroy();
      }
      if (errorHandlerRef.current) {
        errorHandlerRef.current.destroy();
      }
      if (healthCheckRef.current) {
        healthCheckRef.current.destroy();
      }

      // 清理训练数据
      interviewTrainingDataService.cleanup();
    };
  }, []);

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <InterviewTrainingHeader 
          isLoading={isLoading} 
          onClose={handleClose} 
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
        />

        {/* Body - 对话区域 */}
        <InterviewTrainingBody
          messages={messages}
          isLoading={isLoading || isInitializing}
          onNewChat={resetTraining}
          onAskMore={handleAskMore}
          onCopyLastAIResponse={copyLastAIResponseRef}
          // 面试训练特有属性
          voiceState={voiceState}
          audioLevel={audioLevel}
          systemAudioLevel={systemAudioLevel}
          isSystemAudioListening={isSystemAudioListening}
          interviewerQuestions={interviewerQuestions}
          userAnswers={userAnswers}
          currentInterviewState={currentInterviewState}
          // 新增训练状态属性
          trainingProgress={getTrainingProgress()}
          onFinishTraining={finishTraining}
          analysisResult={analysisResult}
        />

        {/* Footer - 输入区域 */}
        <InterviewTrainingFooter
          question={question}
          isLoading={isLoading || isInitializing}
          onQuestionChange={setQuestion}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onNewChat={resetTraining}
          onCopyLastAIResponse={() => copyLastAIResponseRef.current?.()}
          currentConversationStatus={currentConversationStatus}
          // 面试训练特有属性
          voiceState={voiceState}
          isAudioReady={isAudioReady}
          isRecording={audioServiceRef.current?.isRecording || false}
          isSystemAudioListening={isSystemAudioListening}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onStartSystemAudioListening={startSystemAudioListening}
          onStopSystemAudioListening={stopSystemAudioListening}
          // 新增训练状态属性
          trainingProgress={getTrainingProgress()}
          onFinishTraining={finishTraining}
        />
      </motion.div>

      {/* 错误通知 */}
      {errorNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          errorNotification.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
          errorNotification.type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
          'bg-green-100 border border-green-400 text-green-700'
        }`}>
          <div className="flex items-center space-x-2">
            {errorNotification.type === 'error' && <span>❌</span>}
            {errorNotification.type === 'warning' && <span>⚠️</span>}
            {errorNotification.type === 'success' && <span>✅</span>}
            <span>{errorNotification.message}</span>
            <button
              onClick={() => setErrorNotification(null)}
              className="ml-auto text-lg font-bold opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 开发者面板 */}
      <DeveloperPanel
        isVisible={isDeveloperPanelVisible}
        onToggleVisibility={() => setIsDeveloperPanelVisible(!isDeveloperPanelVisible)}
        currentInterviewState={currentInterviewState}
        currentVoiceState={voiceState}
      />
    </div>
  );
}