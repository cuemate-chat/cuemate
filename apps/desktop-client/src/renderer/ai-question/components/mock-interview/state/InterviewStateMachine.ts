export enum InterviewState {
  IDLE = 'idle', // 空闲状态
  INITIALIZING = 'initializing', // 初始化面试信息
  AI_THINKING = 'ai_thinking', // AI分析信息生成问题
  AI_SPEAKING = 'ai_speaking', // AI语音提问
  USER_LISTENING = 'user_listening', // 等待用户回答
  USER_SPEAKING = 'user_speaking', // 用户语音回答
  AI_ANALYZING = 'ai_analyzing', // AI分析用户回答
  GENERATING_ANSWER = 'generating_answer', // 生成参考答案
  ROUND_COMPLETE = 'round_complete', // 本轮完成
  INTERVIEW_ENDING = 'interview_ending', // 面试结束中
  GENERATING_REPORT = 'generating_report', // 生成面试报告
  COMPLETED = 'completed', // 面试完成
  ERROR = 'error', // 错误状态
}

export interface InterviewContext {
  interviewId: string;
  jobPosition: any;
  resume: any;
  questionsBank: any[];
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: string;
  currentAnswer: string;
  userResponse: string;
  conversationHistory: any[];
  errorMessage?: string;
  initPrompt?: string;
}

export interface InterviewEvent {
  type: string;
  payload?: any;
}

// 状态转换定义
const stateTransitions: Record<InterviewState, Record<string, InterviewState>> = {
  [InterviewState.IDLE]: {
    START_INTERVIEW: InterviewState.INITIALIZING,
  },
  [InterviewState.INITIALIZING]: {
    INIT_SUCCESS: InterviewState.AI_THINKING,
    INIT_ERROR: InterviewState.ERROR,
  },
  [InterviewState.AI_THINKING]: {
    QUESTION_GENERATED: InterviewState.AI_SPEAKING,
    THINKING_ERROR: InterviewState.ERROR,
  },
  [InterviewState.AI_SPEAKING]: {
    SPEAKING_COMPLETE: InterviewState.USER_LISTENING, // 播放完成后直接进入用户监听,答案在后台生成
    SPEAKING_ERROR: InterviewState.ERROR,
  },
  [InterviewState.GENERATING_ANSWER]: {
    ANSWER_GENERATED: InterviewState.USER_LISTENING,
    GENERATION_ERROR: InterviewState.ERROR,
  },
  [InterviewState.USER_LISTENING]: {
    USER_STARTED_SPEAKING: InterviewState.USER_SPEAKING,
    USER_FINISHED_SPEAKING: InterviewState.AI_ANALYZING, // 支持直接从监听状态到分析状态
    LISTENING_TIMEOUT: InterviewState.AI_THINKING, // 超时重新提问
    LISTENING_ERROR: InterviewState.ERROR,
    ANSWER_GENERATED: InterviewState.USER_LISTENING, // 答案在后台生成完成,保持当前状态
  },
  [InterviewState.USER_SPEAKING]: {
    USER_FINISHED_SPEAKING: InterviewState.AI_ANALYZING,
    MANUAL_STOP: InterviewState.AI_ANALYZING,
    SPEAKING_ERROR: InterviewState.ERROR,
    ANSWER_GENERATED: InterviewState.USER_SPEAKING, // 答案在后台生成完成,保持当前状态
  },
  [InterviewState.AI_ANALYZING]: {
    ANALYSIS_COMPLETE: InterviewState.ROUND_COMPLETE,
    ANALYSIS_ERROR: InterviewState.ERROR,
  },
  [InterviewState.ROUND_COMPLETE]: {
    CONTINUE_INTERVIEW: InterviewState.AI_THINKING,
    END_INTERVIEW: InterviewState.INTERVIEW_ENDING,
  },
  [InterviewState.INTERVIEW_ENDING]: {
    GENERATE_REPORT: InterviewState.GENERATING_REPORT,
    ENDING_ERROR: InterviewState.ERROR,
  },
  [InterviewState.GENERATING_REPORT]: {
    REPORT_COMPLETE: InterviewState.COMPLETED,
    REPORT_ERROR: InterviewState.ERROR,
  },
  [InterviewState.COMPLETED]: {
    RESTART: InterviewState.IDLE,
  },
  [InterviewState.ERROR]: {
    RETRY: InterviewState.AI_THINKING,
    RESET: InterviewState.IDLE,
  },
};

export type StateChangeCallback = (state: InterviewState, context: InterviewContext) => void;

export class InterviewStateMachine {
  private currentState: InterviewState = InterviewState.IDLE;
  private context: InterviewContext;
  private stateChangeCallbacks: StateChangeCallback[] = [];

  constructor(initialContext: Partial<InterviewContext> = {}) {
    this.context = {
      interviewId: '',
      jobPosition: null,
      resume: null,
      questionsBank: [],
      currentQuestionIndex: 0,
      totalQuestions: 10, // 默认10个问题
      currentQuestion: '',
      currentAnswer: '',
      userResponse: '',
      conversationHistory: [],
      ...initialContext,
    };
  }

  // 订阅状态变化
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  // 发送事件
  send(event: InterviewEvent): boolean {
    const transitions = stateTransitions[this.currentState];
    const nextState = transitions[event.type];

    if (!nextState) {
      console.warn(`Invalid transition: ${event.type} from state ${this.currentState}`);
      return false;
    }

    // 执行状态转换
    this.currentState = nextState;

    // 根据事件更新上下文
    this.updateContext(event);

    // 通知状态变化监听器
    this.notifyStateChange();

    return true;
  }

  // 获取当前状态
  getState(): InterviewState {
    return this.currentState;
  }

  // 获取上下文
  getContext(): InterviewContext {
    return { ...this.context };
  }

  // 更新上下文
  updateContext(event: InterviewEvent): void {
    const { type, payload } = event;

    switch (type) {
      case 'START_INTERVIEW':
        this.context.interviewId = payload.interviewId;
        this.context.jobPosition = payload.jobPosition;
        this.context.resume = payload.resume;
        this.context.questionsBank = payload.questionsBank || [];
        this.context.currentQuestionIndex = 0;
        this.context.conversationHistory = [];
        break;

      case 'QUESTION_GENERATED':
        this.context.currentQuestion = payload.question;
        break;

      case 'USER_FINISHED_SPEAKING':
      case 'MANUAL_STOP':
        this.context.userResponse = payload.response || '';
        break;

      case 'ANSWER_GENERATED':
        this.context.currentAnswer = payload.answer;
        // 记录对话历史
        this.context.conversationHistory.push({
          questionIndex: this.context.currentQuestionIndex,
          question: this.context.currentQuestion,
          userResponse: this.context.userResponse,
          referenceAnswer: this.context.currentAnswer,
          timestamp: Date.now(),
        });
        break;

      case 'CONTINUE_INTERVIEW':
        this.context.currentQuestionIndex++;
        this.context.currentQuestion = '';
        this.context.currentAnswer = '';
        this.context.userResponse = '';
        break;

      case 'INIT_ERROR':
      case 'THINKING_ERROR':
      case 'SPEAKING_ERROR':
      case 'LISTENING_ERROR':
      case 'ANALYSIS_ERROR':
      case 'GENERATION_ERROR':
      case 'ENDING_ERROR':
      case 'REPORT_ERROR':
        this.context.errorMessage = payload?.error || '未知错误';
        break;

      case 'RETRY':
      case 'RESET':
        this.context.errorMessage = undefined;
        break;
    }
  }

  // 通知状态变化
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(this.currentState, this.context);
      } catch (error) {
        console.error('State change callback error:', error);
      }
    });
  }

  // 重置状态机
  reset(): void {
    this.currentState = InterviewState.IDLE;
    this.context = {
      interviewId: '',
      jobPosition: null,
      resume: null,
      questionsBank: [],
      currentQuestionIndex: 0,
      totalQuestions: 10,
      currentQuestion: '',
      currentAnswer: '',
      userResponse: '',
      conversationHistory: [],
    };
    this.notifyStateChange();
  }

  // 检查是否可以执行某个事件
  canSend(eventType: string): boolean {
    const transitions = stateTransitions[this.currentState];
    return !!transitions[eventType];
  }

  // 获取当前状态可用的事件
  getAvailableEvents(): string[] {
    const transitions = stateTransitions[this.currentState];
    return Object.keys(transitions);
  }

  // 获取状态描述
  getStateDescription(): string {
    const descriptions: Record<InterviewState, string> = {
      [InterviewState.IDLE]: '等待开始面试',
      [InterviewState.INITIALIZING]: '正在初始化面试信息...',
      [InterviewState.AI_THINKING]: 'AI面试官正在思考问题...',
      [InterviewState.AI_SPEAKING]: 'AI面试官正在提问...',
      [InterviewState.GENERATING_ANSWER]: '正在生成参考答案...',
      [InterviewState.USER_LISTENING]: '等待您的回答',
      [InterviewState.USER_SPEAKING]: '正在录制您的回答...',
      [InterviewState.AI_ANALYZING]: '正在分析您的回答...',
      [InterviewState.ROUND_COMPLETE]: '本轮问答完成',
      [InterviewState.INTERVIEW_ENDING]: '面试即将结束...',
      [InterviewState.GENERATING_REPORT]: '正在生成面试报告...',
      [InterviewState.COMPLETED]: '面试已完成',
      [InterviewState.ERROR]: '发生错误，请重试',
    };

    return descriptions[this.currentState] || this.currentState;
  }

  // 检查是否应该结束面试
  shouldEndInterview(): boolean {
    // currentQuestionIndex 从0开始,所以第1个问题是index=0
    // 如果 totalQuestions=1,那么index=0时就是最后一个问题
    return this.context.currentQuestionIndex + 1 >= this.context.totalQuestions;
  }

  // 获取面试进度
  getProgress(): { current: number; total: number; percentage: number } {
    const current = Math.min(this.context.currentQuestionIndex + 1, this.context.totalQuestions);
    const total = this.context.totalQuestions;
    const percentage = Math.round((current / total) * 100);
    return { current, total, percentage };
  }
}
