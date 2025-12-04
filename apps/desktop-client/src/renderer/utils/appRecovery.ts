// apps/desktop-client/src/renderer/utils/appRecovery.ts
// App startup interview recovery module
// This module runs immediately on import, independent of React component lifecycle

import { logger } from '../../utils/rendererLogger.js';
import { clearVoiceState, getVoiceState, setVoiceState } from '../../utils/voiceState';
import { interviewService } from '../interviewer/api/interviewService';
import { validateWithDatabase } from './mockInterviewManager';
import { validateTrainingWithDatabase } from './trainingManager';

// Session flag to prevent duplicate recovery runs
const SESSION_KEY = 'cuemate.recovery.session';
let recoveryPromise: Promise<void> | null = null;

/**
 * Check if recovery has already run in this session
 */
function hasRecoveryRun(): boolean {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    return sessionId === 'done';
  } catch {
    return false;
  }
}

/**
 * Mark recovery as completed for this session
 */
function markRecoveryDone(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'done');
  } catch {}
}

/**
 * Core recovery logic
 * Validates interview state from database and restores if needed
 */
async function runRecoveryInternal(): Promise<void> {
  try {
    const currentVoiceState = getVoiceState();

    // 如果没有 interviewId，不需要恢复
    if (!currentVoiceState.interviewId) {
      return;
    }

    // Validate mock interview and training data in parallel
    const [mockResult, trainingResult] = await Promise.all([
      validateWithDatabase(),
      validateTrainingWithDatabase(),
    ]);

    // 判断模拟面试状态
    const mockStatus = mockResult.interview?.status as string | undefined;
    const mockIsValid = mockResult.found && mockResult.interview &&
      mockStatus !== 'mock-interview-completed' &&
      mockStatus !== 'mock-interview-error' &&
      mockStatus !== 'mock-interview-expired';

    // 判断面试训练状态
    const trainingStatus = trainingResult.interview?.status as string | undefined;
    const trainingIsValid = trainingResult.found && trainingResult.interview &&
      trainingStatus !== 'interview-training-completed' &&
      trainingStatus !== 'interview-training-error' &&
      trainingStatus !== 'interview-training-expired';

    // Handle mock interview recovery
    if (mockIsValid && mockResult.interviewId) {
      const interviewId = mockResult.interviewId;
      logger.info(`[appRecovery] Recovering mock interview: interviewId=${interviewId}`);

      // 1. Update database to paused (audio stream is broken on restart)
      await interviewService.updateInterview(interviewId, { status: 'mock-interview-paused' });

      // 2. Set voiceState to paused
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-paused',
        interviewId,
      });

      // 3. Open the three windows and switch to mock-interview mode
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.switchToMode('mock-interview');
        await (window as any).electronAPI.showInterviewer();
        await (window as any).electronAPI.showAIQuestion();
        await (window as any).electronAPI.showAIQuestionHistory();
      }

      return;
    }

    // Handle interview training recovery
    if (trainingIsValid && trainingResult.interviewId) {
      const interviewId = trainingResult.interviewId;
      logger.info(`[appRecovery] Recovering interview training: interviewId=${interviewId}`);

      // 1. Update database to paused (audio stream is broken on restart)
      await interviewService.updateInterview(interviewId, { status: 'interview-training-paused' });

      // 2. Set voiceState to paused
      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-paused',
        interviewId,
      });

      // 3. Open the three windows and switch to interview-training mode
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.switchToMode('interview-training');
        await (window as any).electronAPI.showInterviewer();
        await (window as any).electronAPI.showAIQuestion();
        await (window as any).electronAPI.showAIQuestionHistory();
      }

      return;
    }

    // 如果有任何一个找到了记录（无论什么状态），保留数据不清除
    if (mockResult.found || trainingResult.found) {
      return;
    }

    // 只有当两个都没找到记录时才清除
    clearVoiceState();
  } catch (error) {
    logger.error(`[appRecovery] Recovery failed: ${error}`);
  }
}

/**
 * Run interview recovery
 * This function is idempotent - it only runs once per session
 */
export function runRecovery(): Promise<void> {
  // Already completed
  if (hasRecoveryRun()) {
    return Promise.resolve();
  }

  // Already running
  if (recoveryPromise) {
    return recoveryPromise;
  }

  // Start recovery with delay to ensure other initialization is complete
  recoveryPromise = new Promise((resolve) => {
    setTimeout(async () => {
      await runRecoveryInternal();
      markRecoveryDone();
      resolve();
    }, 500);
  });

  return recoveryPromise;
}

/**
 * Auto-run recovery on module import
 * This ensures recovery runs as early as possible in the app lifecycle
 */
runRecovery();
