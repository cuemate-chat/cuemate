import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { MessageSquare } from 'lucide-react';

const TranscriptDisplay: React.FC = () => {
  const { currentTranscript, transcriptHistory } = useAppStore();

  if (!currentTranscript && transcriptHistory.length === 0) {
    return (
      <div className="transcript-display bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-center text-gray-500">
          <MessageSquare className="w-5 h-5 mr-2" />
          <span className="text-sm">等待语音输入...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-display bg-gray-800/50 rounded-lg p-4 max-h-32 overflow-y-auto">
      <div className="text-xs text-gray-400 mb-2">实时转写</div>
      
      {/* 历史转写 */}
      <div className="space-y-1 mb-2">
        {transcriptHistory.slice(-3).map((segment) => (
          <div
            key={segment.id}
            className="text-sm text-gray-400 opacity-60"
          >
            {segment.text}
          </div>
        ))}
      </div>

      {/* 当前转写 */}
      <AnimatePresence mode="wait">
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="text-sm text-white font-medium"
          >
            {currentTranscript}
            <span className="inline-block w-1 h-4 bg-blue-500 ml-1 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TranscriptDisplay;
