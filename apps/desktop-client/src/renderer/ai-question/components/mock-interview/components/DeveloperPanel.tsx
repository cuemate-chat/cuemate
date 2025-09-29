/**
 * 开发者调试面板
 * 集成测试、错误监控、状态查看等调试功能
 */

import { useState, useEffect } from 'react';
import { Bug, Settings, Activity, Database, Wifi, Volume2, EyeOff } from 'lucide-react';
import { TestRunner } from './TestRunner';
import { SystemTestManager } from './SystemTestManager';
import { ErrorList } from './ErrorDialog';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useAudioService } from '../hooks/useAudioService';
import { InterviewState } from '../state/InterviewStateMachine';
import { VoiceState } from '../voice/VoiceCoordinator';

interface DeveloperPanelProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  currentInterviewState?: InterviewState;
  currentVoiceState?: VoiceState;
  className?: string;
}

export function DeveloperPanel({
  isVisible,
  onToggleVisibility,
  currentInterviewState = InterviewState.IDLE,
  currentVoiceState = VoiceState.IDLE,
  className = ''
}: DeveloperPanelProps) {
  const [activeTab, setActiveTab] = useState<'test' | 'system' | 'errors' | 'state' | 'audio' | 'network'>('test');
  const [systemInfo, setSystemInfo] = useState<any>({});

  const errorHandler = useErrorHandler();
  const audioService = useAudioService({ autoInitialize: false });

  // 获取系统信息
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getAppInfo) {
      electronAPI.getAppInfo().then((info: any) => {
        setSystemInfo(info);
      });
    }
  }, []);

  // 标签页配置
  const tabs = [
    { id: 'test', label: '单元测试', icon: Bug },
    { id: 'system', label: '系统测试', icon: Settings },
    { id: 'errors', label: '错误', icon: Activity },
    { id: 'state', label: '状态', icon: Database },
    { id: 'audio', label: '音频', icon: Volume2 },
    { id: 'network', label: '网络', icon: Wifi }
  ];

  // 获取状态颜色
  const getStateColor = (state: string) => {
    switch (state) {
      case InterviewState.IDLE:
      case VoiceState.IDLE:
        return 'text-gray-500';
      case InterviewState.AI_THINKING:
      case InterviewState.AI_SPEAKING:
      case VoiceState.TTS_PLAYING:
        return 'text-blue-500';
      case InterviewState.USER_LISTENING:
      case InterviewState.USER_SPEAKING:
      case VoiceState.ASR_LISTENING:
      case VoiceState.USER_SPEAKING:
        return 'text-green-500';
      case InterviewState.ERROR:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // 模拟测试错误
  const simulateError = (errorType: string) => {
    const error = new Error(`模拟错误: ${errorType}`);
    errorHandler.handleError(error, { source: 'developer_panel', type: errorType });
  };

  // 渲染单元测试标签页
  const renderTestTab = () => (
    <div className="space-y-4">
      <TestRunner
        onTestCompleted={(result) => {
          console.log('单元测试完成:', result);
        }}
        onTestSuiteCompleted={(results) => {
          console.log('单元测试套件完成:', results);
        }}
      />
    </div>
  );

  // 渲染系统测试标签页
  const renderSystemTestTab = () => (
    <div className="space-y-4">
      <SystemTestManager />
    </div>
  );

  // 渲染错误标签页
  const renderErrorsTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">错误统计</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-red-50 rounded">
            <div className="text-red-600 font-medium">严重错误</div>
            <div className="text-red-800 text-lg">
              {errorHandler.hasCriticalErrors() ? '是' : '否'}
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded">
            <div className="text-yellow-600 font-medium">总错误数</div>
            <div className="text-yellow-800 text-lg">
              {errorHandler.errorHistory.length}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">模拟错误</h4>
        <div className="grid grid-cols-2 gap-2">
          {['网络错误', '音频错误', '权限错误', '服务错误'].map(type => (
            <button
              key={type}
              onClick={() => simulateError(type)}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <ErrorList
        errors={errorHandler.errorHistory}
        maxDisplayed={10}
        onErrorClick={(error) => {
          console.log('错误详情:', error);
        }}
      />
    </div>
  );

  // 渲染状态标签页
  const renderStateTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">当前状态</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>面试状态:</span>
            <span className={`font-medium ${getStateColor(currentInterviewState)}`}>
              {currentInterviewState}
            </span>
          </div>
          <div className="flex justify-between">
            <span>语音状态:</span>
            <span className={`font-medium ${getStateColor(currentVoiceState)}`}>
              {currentVoiceState}
            </span>
          </div>
          <div className="flex justify-between">
            <span>错误处理器:</span>
            <span className={`font-medium ${errorHandler.errorHandler ? 'text-green-500' : 'text-red-500'}`}>
              {errorHandler.errorHandler ? '正常' : '未初始化'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">系统信息</h4>
        <div className="space-y-1 text-xs font-mono bg-gray-50 p-3 rounded">
          {Object.entries(systemInfo).map(([key, value]) => (
            <div key={key} className="flex">
              <span className="text-gray-600 w-20">{key}:</span>
              <span className="text-gray-800">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">内存使用</h4>
        <div className="text-xs text-gray-600">
          <div>堆内存: {(performance as any).memory?.usedJSHeapSize ?
            `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` :
            '不可用'}</div>
          <div>总内存: {(performance as any).memory?.totalJSHeapSize ?
            `${Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)}MB` :
            '不可用'}</div>
        </div>
      </div>
    </div>
  );

  // 渲染音频标签页
  const renderAudioTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">音频服务状态</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>初始化状态:</span>
            <span className={`font-medium ${audioService.isInitialized ? 'text-green-500' : 'text-red-500'}`}>
              {audioService.isInitialized ? '已初始化' : '未初始化'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>TTS可用性:</span>
            <span className={`font-medium ${audioService.isTTSAvailable ? 'text-green-500' : 'text-red-500'}`}>
              {audioService.isTTSAvailable ? '可用' : '不可用'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>录音状态:</span>
            <span className={`font-medium ${audioService.isRecording ? 'text-green-500' : 'text-gray-500'}`}>
              {audioService.isRecording ? '录音中' : '未录音'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>TTS播放:</span>
            <span className={`font-medium ${audioService.isTTSPlaying ? 'text-blue-500' : 'text-gray-500'}`}>
              {audioService.isTTSPlaying ? '播放中' : '未播放'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>音频级别:</span>
            <span className="font-medium">{Math.round(audioService.audioLevel * 100)}%</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">音频控制</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => audioService.initialize()}
            disabled={audioService.isInitialized}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            初始化
          </button>
          <button
            onClick={() => audioService.playTTS('这是测试语音')}
            disabled={!audioService.isTTSAvailable}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
          >
            测试TTS
          </button>
          <button
            onClick={() => audioService.startRecording()}
            disabled={!audioService.isReady || audioService.isRecording}
            className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
          >
            开始录音
          </button>
          <button
            onClick={() => audioService.stopRecording()}
            disabled={!audioService.isRecording}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
          >
            停止录音
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染网络标签页
  const renderNetworkTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">连接状态</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>在线状态:</span>
            <span className={`font-medium ${navigator.onLine ? 'text-green-500' : 'text-red-500'}`}>
              {navigator.onLine ? '在线' : '离线'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>连接类型:</span>
            <span className="font-medium">
              {(navigator as any).connection?.effectiveType || '未知'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">系统健康检查</h4>
        <div className="flex space-x-2 mb-2">
          <button
            onClick={async () => {
              try {
                const { SystemHealthCheck } = await import('../testing/SystemHealthCheck');
                const healthChecker = new SystemHealthCheck();
                const report = await healthChecker.runFullHealthCheck();
                console.log('系统健康报告:', report);
                alert(`健康检查完成:\n总体状态: ${report.overall}\n成功: ${report.summary.healthy}/${report.summary.total}`);
                healthChecker.destroy();
              } catch (error) {
                console.error('健康检查失败:', error);
                alert('健康检查失败，请查看控制台');
              }
            }}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            运行健康检查
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">API端点测试</h4>
        <div className="space-y-2">
          {[
            { name: 'Web API', url: 'http://localhost:3001/health' },
            { name: 'LLM Router', url: 'http://localhost:3002/health' },
            { name: 'RAG Service', url: 'http://localhost:3003/health' }
          ].map(service => (
            <div key={service.name} className="flex justify-between items-center">
              <span className="text-sm">{service.name}:</span>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(service.url);
                    console.log(`${service.name} 状态:`, response.status);
                  } catch (error) {
                    console.error(`${service.name} 连接失败:`, error);
                  }
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                测试
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="显示开发者面板"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <div className={`developer-panel fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border z-50 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-medium text-gray-900">开发者面板</h3>
        <button
          onClick={onToggleVisibility}
          className="text-gray-400 hover:text-gray-600"
          title="隐藏面板"
        >
          <EyeOff size={16} />
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 text-xs font-medium ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 内容区域 */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {activeTab === 'test' && renderTestTab()}
        {activeTab === 'system' && renderSystemTestTab()}
        {activeTab === 'errors' && renderErrorsTab()}
        {activeTab === 'state' && renderStateTab()}
        {activeTab === 'audio' && renderAudioTab()}
        {activeTab === 'network' && renderNetworkTab()}
      </div>
    </div>
  );
}