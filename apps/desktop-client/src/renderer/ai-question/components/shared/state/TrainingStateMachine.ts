export enum TrainingState {
  IDLE = 'idle', // 空闲状态
  LISTENING_INTERVIEWER = 'listening_interviewer', // 监听面试官(扬声器)
  GENERATING_ANSWER = 'generating_answer', // 生成参考答案
  USER_LISTENING = 'user_listening', // 等待用户回答
  USER_SPEAKING = 'user_speaking', // 用户语音回答
  AI_ANALYZING = 'ai_analyzing', // AI分析用户回答
  ROUND_COMPLETE = 'round_complete', // 本轮完成
  INTERVIEW_ENDING = 'interview_ending', // 面试结束中
  GENERATING_REPORT = 'generating_report', // 生成面试报告
  COMPLETED = 'completed', // 面试完成
  ERROR = 'error', // 错误状态
}

export interface TrainingContext {
  interviewId: string;
  jobPosition: any;
  resume: any;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: string; // 面试官的问题(从扬声器识别)
  referenceAnswer: string; // AI生成的参考答案
  userResponse: string; // 用户的回答
  conversationHistory: any[];
  errorMessage?: string;
  isPaused?: boolean;
}

export interface TrainingEvent {
  type: string;
  payload?: any;
}

// 状态转换定义
const stateTransitions: Record<TrainingState, Record<string, TrainingState>> = {
  [TrainingState.IDLE]: {
    START_TRAINING: TrainingState.LISTENING_INTERVIEWER,
  },
  [TrainingState.LISTENING_INTERVIEWER]: {
    QUESTION_RECEIVED: TrainingState.GENERATING_ANSWER, // 面试官提问完毕
    LISTENING_ERROR: TrainingState.ERROR,
  },
  [TrainingState.GENERATING_ANSWER]: {
    ANSWER_GENERATED: TrainingState.USER_LISTENING,
    GENERATION_ERROR: TrainingState.ERROR,
  },
  [TrainingState.USER_LISTENING]: {
    USER_STARTED_SPEAKING: TrainingState.USER_SPEAKING,
    USER_FINISHED_SPEAKING: TrainingState.AI_ANALYZING,
    LISTENING_TIMEOUT: TrainingState.LISTENING_INTERVIEWER, // 超时重新监听面试官
    LISTENING_ERROR: TrainingState.ERROR,
  },
  [TrainingState.USER_SPEAKING]: {
    USER_FINISHED_SPEAKING: TrainingState.AI_ANALYZING,
    MANUAL_STOP: TrainingState.AI_ANALYZING,
    SPEAKING_ERROR: TrainingState.ERROR,
  },
  [TrainingState.AI_ANALYZING]: {
    ANALYSIS_COMPLETE: TrainingState.ROUND_COMPLETE,
    ANALYSIS_ERROR: TrainingState.ERROR,
  },
  [TrainingState.ROUND_COMPLETE]: {
    CONTINUE_TRAINING: TrainingState.LISTENING_INTERVIEWER, // 继续下一轮,监听面试官
    END_TRAINING: TrainingState.INTERVIEW_ENDING,
  },
  [TrainingState.INTERVIEW_ENDING]: {
    GENERATE_REPORT: TrainingState.GENERATING_REPORT,
    ENDING_ERROR: TrainingState.ERROR,
  },
  [TrainingState.GENERATING_REPORT]: {
    REPORT_COMPLETE: TrainingState.COMPLETED,
    REPORT_ERROR: TrainingState.ERROR,
  },
  [TrainingState.COMPLETED]: {
    RESTART: TrainingState.IDLE,
  },
  [TrainingState.ERROR]: {
    RETRY: TrainingState.LISTENING_INTERVIEWER,
    RESET: TrainingState.IDLE,
  },
};

export type TrainingStateChangeCallback = (state: TrainingState, context: TrainingContext) => void;

export class TrainingStateMachine {
  private currentState: TrainingState = TrainingState.IDLE;
  private context: TrainingContext;
  private stateChangeCallbacks: TrainingStateChangeCallback[] = [];

  constructor(initialContext: Partial<TrainingContext> = {}) {
    this.context = {
      interviewId: '',
      jobPosition: null,
      resume: null,
      currentQuestionIndex: 0,
      totalQuestions: 10,
      currentQuestion: '',
      referenceAnswer: '',
      userResponse: '',
      conversationHistory: [],
      ...initialContext,
    };
  }

  // 订阅状态变化
  onStateChange(callback: TrainingStateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  // 发送事件
  send(event: TrainingEvent): boolean {
    const transitions = stateTransitions[this.currentState];
    const nextState = transitions[event.type];

    if (!nextState) {
      console.warn(`Invalid transition: ${event.type} from state ${this.currentState}`);
      return false;
    }

    const stateChanged = this.currentState !== nextState;

    this.currentState = nextState;

    this.updateContext(event);

    if (stateChanged) {
      this.notifyStateChange();
    }

    return true;
  }

  // 获取当前状态
  getState(): TrainingState {
    return this.currentState;
  }

  // 获取上下文
  getContext(): TrainingContext {
    return { ...this.context };
  }

  // 恢复上下文
  restoreContext(savedContext: Partial<TrainingContext>): void {
    this.context = { ...this.context, ...savedContext };
  }

  // 部分更新上下文
  updateContextPartial(partial: Partial<TrainingContext>): void {
    this.context = { ...this.context, ...partial };
    this.notifyStateChange();
  }

  // 更新上下文
  updateContext(event: TrainingEvent): void {
    const { type, payload } = event;

    switch (type) {
      case 'START_TRAINING':
        this.context.interviewId = payload.interviewId;
        this.context.jobPosition = payload.jobPosition;
        this.context.resume = payload.resume;
        this.context.currentQuestionIndex = 0;
        this.context.conversationHistory = [];
        break;

      case 'QUESTION_RECEIVED':
        this.context.currentQuestion = payload.question;
        break;

      case 'ANSWER_GENERATED':
        this.context.referenceAnswer = payload.answer;
        break;

      case 'USER_FINISHED_SPEAKING':
      case 'MANUAL_STOP':
        this.context.userResponse = payload.response || '';
        // 记录对话历史
        this.context.conversationHistory.push({
          questionIndex: this.context.currentQuestionIndex,
          question: this.context.currentQuestion,
          userResponse: this.context.userResponse,
          referenceAnswer: this.context.referenceAnswer,
          timestamp: Date.now(),
        });
        break;

      case 'CONTINUE_TRAINING':
        this.context.currentQuestionIndex++;
        this.context.currentQuestion = '';
        this.context.referenceAnswer = '';
        this.context.userResponse = '';
        break;

      case 'LISTENING_ERROR':
      case 'GENERATION_ERROR':
      case 'ANALYSIS_ERROR':
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
    this.currentState = TrainingState.IDLE;
    this.context = {
      interviewId: '',
      jobPosition: null,
      resume: null,
      currentQuestionIndex: 0,
      totalQuestions: 10,
      currentQuestion: '',
      referenceAnswer: '',
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
    const descriptions: Record<TrainingState, string> = {
      [TrainingState.IDLE]: '等待开始面试训练',
      [TrainingState.LISTENING_INTERVIEWER]: '正在监听面试官提问...',
      [TrainingState.GENERATING_ANSWER]: '正在生成参考答案...',
      [TrainingState.USER_LISTENING]: '等待您的回答',
      [TrainingState.USER_SPEAKING]: '正在录制您的回答...',
      [TrainingState.AI_ANALYZING]: '正在分析您的回答...',
      [TrainingState.ROUND_COMPLETE]: '本轮问答完成',
      [TrainingState.INTERVIEW_ENDING]: '面试训练即将结束...',
      [TrainingState.GENERATING_REPORT]: '正在生成面试训练报告...',
      [TrainingState.COMPLETED]: '面试训练已完成',
      [TrainingState.ERROR]: '发生错误，请重试',
    };

    return descriptions[this.currentState] || this.currentState;
  }

  // 检查是否应该结束面试
  shouldEndInterview(): boolean {
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
