import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { aiService } from '../../api/aiService.ts';
import { conversationService } from '../../api/conversationService.ts';
import { MockInterviewBody } from './MockInterviewBody.tsx';
import { MockInterviewFooter } from './MockInterviewFooter.tsx';
import { MockInterviewHeader } from './MockInterviewHeader.tsx';
import { InterviewState } from './state/InterviewStateMachine.ts';
import { AudioServiceManager, ASRConfig, TTSConfig, AudioConfig } from './audio/AudioServiceManager.ts';
import { VoiceState } from './voice/VoiceCoordinator.ts';
import { MockInterviewErrorHandler, MockInterviewContext } from './error/MockInterviewErrorHandler.ts';
import { ErrorType, ErrorSeverity } from './error/ErrorHandler.ts';

export function MockInterviewApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentConversationStatus, setCurrentConversationStatus] = useState<'active' | 'completed' | 'error' | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [heightPercentage, setHeightPercentage] = useState(75); // 默认75%

  // 音频服务状态
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  // const [audioLevel, setAudioLevel] = useState(0); // 暂时注释掉未使用的变量
  const [speechText, setSpeechText] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const audioServiceRef = useRef<AudioServiceManager | null>(null);


  // 错误处理状态
  const [errorNotification, setErrorNotification] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
    duration: number;
  } | null>(null);
  const errorHandlerRef = useRef<MockInterviewErrorHandler | null>(null);


  

  // 组件初始化时恢复最近对话和高度设置
  useEffect(() => {
    initializeConversation();
    loadHeightSetting();
    initializeErrorHandler();
    initializeAudioService();
  }, []);


  // 初始化错误处理器
  const initializeErrorHandler = () => {
    errorHandlerRef.current = new MockInterviewErrorHandler({
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      retryDelay: 2000,
      showErrorNotifications: true,
      logErrorDetails: true
    });

    // 设置错误处理事件监听器
    setupErrorEventListeners();

    console.log('Error handler initialized');
  };

  // 设置错误处理事件监听器
  const setupErrorEventListeners = () => {
    if (!errorHandlerRef.current) return;

    // 错误发生
    errorHandlerRef.current.addEventListener('errorOccurred', ((event: CustomEvent) => {
      console.error('Interview error occurred:', event.detail);
    }) as EventListener);

    // 恢复成功
    errorHandlerRef.current.addEventListener('recoverySuccessful', ((event: CustomEvent) => {
      console.log('Error recovery successful:', event.detail);
    }) as EventListener);

    // 恢复失败
    errorHandlerRef.current.addEventListener('recoveryFailed', ((event: CustomEvent) => {
      console.error('Error recovery failed:', event.detail);
    }) as EventListener);

    // 显示通知
    errorHandlerRef.current.addEventListener('showNotification', ((event: CustomEvent) => {
      const { type, message, duration } = event.detail;
      setErrorNotification({ type, message, duration });

      // 自动隐藏通知
      setTimeout(() => {
        setErrorNotification(null);
      }, duration);
    }) as EventListener);

    // 最大重试次数超出
    errorHandlerRef.current.addEventListener('maxRetriesExceeded', ((event: CustomEvent) => {
      console.error('Max retries exceeded:', event.detail);
      setErrorNotification({
        type: 'error',
        message: '系统遇到持续性问题，请刷新页面重试',
        duration: 10000
      });
    }) as EventListener);
  };

  // 初始化音频服务
  const initializeAudioService = async () => {
    try {
      const asrConfig: ASRConfig = {
        serverUrl: 'ws://localhost:10095',
        language: 'zh',
        sampleRate: 16000
      };

      const ttsConfig: TTSConfig = {
        language: 'zh-CN',
        voiceModel: 'zh-CN-female-huayan',
        speed: 1.0,
        volume: 1.0
      };

      const audioConfig: AudioConfig = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      audioServiceRef.current = new AudioServiceManager(asrConfig, ttsConfig, audioConfig);

      // 设置事件监听器
      setupAudioEventListeners();

      // 初始化音频服务
      await audioServiceRef.current.initialize();
      setIsAudioReady(true);

      // 更新错误处理器的上下文
      updateErrorContext();

      console.log('Audio service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      setIsAudioReady(false);

      // 报告初始化错误
      if (errorHandlerRef.current) {
        if (error instanceof Error && error.message.includes('麦克风')) {
          errorHandlerRef.current.reportError(error, ErrorType.MICROPHONE_ACCESS_DENIED, ErrorSeverity.HIGH);
        } else if (error instanceof Error && error.message.includes('ASR')) {
          errorHandlerRef.current.reportError(error, ErrorType.ASR_CONNECTION_FAILED, ErrorSeverity.MEDIUM);
        } else {
          errorHandlerRef.current.reportError(error instanceof Error ? error : new Error(String(error)), ErrorType.AUDIO_INITIALIZATION_FAILED, ErrorSeverity.MEDIUM);
        }
      }
    }
  };

  // 设置音频事件监听器
  const setupAudioEventListeners = () => {
    if (!audioServiceRef.current) return;

    // 语音状态变化
    audioServiceRef.current.addEventListener('voiceStateChanged', ((event: CustomEvent) => {
      setVoiceState(event.detail);
    }) as EventListener);

    // 音频级别变化
    audioServiceRef.current.addEventListener('audioLevel', ((_event: CustomEvent) => {
      // setAudioLevel(event.detail.level); // 暂时注释掉
    }) as EventListener);

    // 语音识别结果
    audioServiceRef.current.addEventListener('speechRecognized', ((event: CustomEvent) => {
      const result = event.detail;
      setSpeechText(result.text);
      setQuestion(result.text); // 将识别结果设置为当前问题
    }) as EventListener);

    // ASR结果（实时更新）
    audioServiceRef.current.addEventListener('asrResult', ((event: CustomEvent) => {
      const result = event.detail;
      if (!result.isFinal) {
        setSpeechText(result.text); // 实时显示临时结果
      }
    }) as EventListener);

    // TTS播放完成
    audioServiceRef.current.addEventListener('ttsCompleted', ((event: CustomEvent) => {
      console.log('TTS playback completed:', event.detail);
    }) as EventListener);

    // 错误处理
    audioServiceRef.current.addEventListener('error', ((event: CustomEvent) => {
      console.error('Audio service error:', event.detail);

      // 报告音频服务错误
      if (errorHandlerRef.current) {
        const error = event.detail;
        if (error instanceof Error) {
          errorHandlerRef.current.reportError(error, ErrorType.AUDIO_SERVICE_ERROR, ErrorSeverity.MEDIUM);
        }
      }
    }) as EventListener);

    // ASR断开连接
    audioServiceRef.current.addEventListener('asrDisconnected', (() => {
      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          new Error('ASR服务连接断开'),
          ErrorType.ASR_CONNECTION_FAILED,
          ErrorSeverity.MEDIUM
        );
      }
      updateErrorContext();
    }) as EventListener);

    // TTS不可用
    audioServiceRef.current.addEventListener('ttsUnavailable', (() => {
      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          new Error('TTS服务不可用'),
          ErrorType.TTS_SERVICE_UNAVAILABLE,
          ErrorSeverity.LOW
        );
      }
      updateErrorContext();
    }) as EventListener);
  };

  // 更新错误处理器上下文
  const updateErrorContext = () => {
    if (!errorHandlerRef.current) return;

    const context: MockInterviewContext = {
      interviewState: isLoading ? InterviewState.AI_THINKING : InterviewState.IDLE,
      voiceState: voiceState,
      currentQuestion: messages.filter(m => m.type === 'ai').pop()?.content,
      isAudioReady: isAudioReady,
      isASRConnected: audioServiceRef.current?.isReady() || false,
      isTTSAvailable: true // 假设TTS总是可用，实际应该检查
    };

    errorHandlerRef.current.setContext(context);
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

      // 报告AI调用错误
      if (errorHandlerRef.current) {
        errorHandlerRef.current.reportError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorType.ANSWER_ANALYSIS_FAILED,
          ErrorSeverity.MEDIUM
        );
      }

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

  // 添加TTS播放AI回答的功能（保留以供将来使用）
  // const playAIResponse = async (text: string) => {
  //   if (!audioServiceRef.current || !text.trim()) return;

  //   try {
  //     await audioServiceRef.current.playTTS(text);
  //   } catch (error) {
  //     console.error('Failed to play TTS:', error);
  //   }
  // };

  // 组件卸载时清理服务
  useEffect(() => {
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.destroy();
        audioServiceRef.current = null;
      }
      if (errorHandlerRef.current) {
        errorHandlerRef.current.destroy();
        errorHandlerRef.current = null;
      }
    };
  }, []);

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



  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <MockInterviewHeader 
          isLoading={isLoading} 
          onClose={handleClose} 
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
        />

        {/* Body - 对话区域 */}
        <MockInterviewBody
          aiMessage={messages.filter(m => m.type === 'ai').pop()?.content}
          isLoading={isLoading || isInitializing}
        />

        {/* Footer - 语音识别区域 */}
        <MockInterviewFooter
          speechText={speechText || question}
          isLoading={isLoading || isInitializing}
          onResponseComplete={async () => {
            if (question.trim()) {
              await handleSubmit();
            }
          }}
        />

        {/* 错误通知 */}
        {errorNotification && (
          <motion.div
            className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
              errorNotification.type === 'error'
                ? 'bg-red-500 text-white'
                : errorNotification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-yellow-500 text-white'
            }`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <span className="mr-2">{errorNotification.message}</span>
              <button
                onClick={() => setErrorNotification(null)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}