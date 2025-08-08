import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type DisplayMode = 'concise' | 'points' | 'detailed';

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface Answer {
  outline?: string[];  // 要点提纲
  fullAnswer?: string; // 完整答案
  timestamp: number;
}

interface AppState {
  // 连接状态
  isConnected: boolean;
  connectionError: string | null;
  
  // 录音状态
  isRecording: boolean;
  selectedAudioDevice: string | null;
  audioDevices: string[];
  
  // 显示模式
  displayMode: DisplayMode;
  
  // 转写数据
  currentTranscript: string;
  transcriptHistory: TranscriptSegment[];
  
  // 答案数据
  currentAnswer: Answer | null;
  answerHistory: Answer[];
  
  // RAG 相关
  ragEnabled: boolean;
  ragSources: Array<{ title: string; content: string; score: number }>;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  toggleRecording: () => void;
  setSelectedAudioDevice: (device: string) => void;
  setAudioDevices: (devices: string[]) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  updateTranscript: (text: string, isFinal: boolean) => void;
  updateAnswer: (answer: Answer) => void;
  setRagEnabled: (enabled: boolean) => void;
  addRagSource: (source: any) => void;
  clearRagSources: () => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  connectionError: null,
  isRecording: false,
  selectedAudioDevice: null,
  audioDevices: [],
  displayMode: 'points' as DisplayMode,
  currentTranscript: '',
  transcriptHistory: [],
  currentAnswer: null,
  answerHistory: [],
  ragEnabled: true,
  ragSources: [],
};

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      setConnectionError: (error) => set({ connectionError: error }),
      
      toggleRecording: () => set((state) => ({ isRecording: !state.isRecording })),
      
      setSelectedAudioDevice: (device) => set({ selectedAudioDevice: device }),
      
      setAudioDevices: (devices) => set({ audioDevices: devices }),
      
      setDisplayMode: (mode) => set({ displayMode: mode }),
      
      updateTranscript: (text, isFinal) => {
        const timestamp = Date.now();
        const segment: TranscriptSegment = {
          id: `seg-${timestamp}`,
          text,
          timestamp,
          isFinal,
        };
        
        set((state) => ({
          currentTranscript: text,
          transcriptHistory: isFinal 
            ? [...state.transcriptHistory, segment]
            : state.transcriptHistory,
        }));
      },
      
      updateAnswer: (answer) => {
        set((state) => ({
          currentAnswer: answer,
          answerHistory: [...state.answerHistory, answer],
        }));
      },
      
      setRagEnabled: (enabled) => set({ ragEnabled: enabled }),
      
      addRagSource: (source) => {
        set((state) => ({
          ragSources: [...state.ragSources, source],
        }));
      },
      
      clearRagSources: () => set({ ragSources: [] }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'cuemate-store',
    },
  ),
);
