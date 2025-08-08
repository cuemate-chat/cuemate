import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { Sparkles, BookOpen, FileText, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface AnswerDisplayProps {
  mode: 'concise' | 'points' | 'detailed';
}

const AnswerDisplay: React.FC<AnswerDisplayProps> = ({ mode }) => {
  const { currentAnswer, ragSources } = useAppStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  if (!currentAnswer) {
    return (
      <div className="answer-display bg-gray-800/30 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">等待生成答案...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'concise':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-xs text-gray-400 mb-2">
              <FileText className="w-3 h-3 mr-1" />
              一句话总结
            </div>
            <p className="text-white text-sm leading-relaxed">
              {currentAnswer.outline?.[0] || '生成中...'}
            </p>
          </div>
        );

      case 'points':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-xs text-gray-400 mb-2">
              <BookOpen className="w-3 h-3 mr-1" />
              核心要点
            </div>
            <ul className="space-y-1">
              {currentAnswer.outline?.map((point, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start text-sm text-white"
                >
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="flex-1">{point}</span>
                </motion.li>
              )) || (
                <li className="text-gray-400 text-sm">生成要点中...</li>
              )}
            </ul>
          </div>
        );

      case 'detailed':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-xs text-gray-400 mb-2">
              <Sparkles className="w-3 h-3 mr-1" />
              完整答案
            </div>
            <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {currentAnswer.fullAnswer || '详细答案生成中...'}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="answer-display bg-gray-800/30 rounded-lg p-4 min-h-[200px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* RAG 来源显示 */}
      {ragSources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">参考来源</div>
          <div className="space-y-1">
            {ragSources.slice(0, 2).map((source, index) => (
              <div
                key={index}
                className="text-xs bg-gray-700/30 rounded px-2 py-1 text-gray-300"
              >
                {source.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 复制按钮 */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            const text = mode === 'detailed' 
              ? currentAnswer.fullAnswer 
              : currentAnswer.outline?.join('\n');
            if (text) handleCopy(text);
          }}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-green-400">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">复制</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnswerDisplay;
