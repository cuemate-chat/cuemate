/**
 * 面试系统 IPC 事件类型定义
 */

// IPC 通信事件类型
export enum InterviewIPCEvents {
  // 面试状态相关
  INTERVIEW_STATE_CHANGED = 'interview:state-changed',
  INTERVIEW_STARTED = 'interview:started',
  INTERVIEW_ENDED = 'interview:ended',
  INTERVIEW_PROGRESS_UPDATED = 'interview:progress-updated',

  // 语音状态相关
  VOICE_STATE_CHANGED = 'interview:voice-state-changed',
  AUDIO_LEVEL_UPDATED = 'interview:audio-level-updated',

  // 问答数据相关
  QUESTION_GENERATED = 'interview:question-generated',
  ANSWER_GENERATED = 'interview:answer-generated',
  USER_RESPONSE_RECORDED = 'interview:user-response-recorded',
  ANALYSIS_COMPLETED = 'interview:analysis-completed',

  // 控制指令
  TOGGLE_AUTO_MODE = 'interview:toggle-auto-mode',
  SKIP_QUESTION = 'interview:skip-question',
  END_INTERVIEW = 'interview:end-interview',

  // 窗口控制
  SHOW_CONTROL_BAR = 'interview:show-control-bar',
  HIDE_CONTROL_BAR = 'interview:hide-control-bar',
  UPDATE_CONTROL_BAR_STATUS = 'interview:update-control-bar-status',

  // 数据同步
  SYNC_INTERVIEW_DATA = 'interview:sync-data',
  REQUEST_CURRENT_STATE = 'interview:request-current-state',
  PROVIDE_CURRENT_STATE = 'interview:provide-current-state',
}
