import ReactECharts from 'echarts-for-react';
import { ArrowLeft, Check, ChevronDown, Eye, EyeOff, Ghost, LogOut, MousePointer2, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logger } from '../../../utils/rendererLogger.js';
import logoBackground from '../../../assets/logo-background.png';
import { getProviderIcon } from '../../shared/providerIcons';
import { getModelList, getTrainingStats, getUserSettings, getVectorSyncStatus, updateUserSettings } from '../api/trayMenuService';
import '../styles/tray-menu.css';

export function TrayMenuApp() {
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDockIcon, setShowDockIcon] = useState(false);

  // 同步进度数据
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });

  // 使用统计数据
  const [usageStats, setUsageStats] = useState({
    interviews: 0, // 训练总数
    hours: 0, // 总时长（小时）
    conversations: 0, // 平均对话数
  });

  // 用户设置
  const [currentLocale, setCurrentLocale] = useState('zh-CN');
  const [currentTheme, setCurrentTheme] = useState('light');
  const [currentModelId, setCurrentModelId] = useState('');

  // 模型列表
  const [modelList, setModelList] = useState<any[]>([]);

  // 模型下拉框状态
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // 获取应用状态
  const fetchAppState = async () => {
    try {
      if ((window as any).electronAPI?.getAppState) {
        const result = await (window as any).electronAPI.getAppState();
        if (result.success && result.data) {
          setIsAppVisible(result.data.isControlBarVisible);
          setIsClickThrough(result.data.isClickThrough || false);
        }
      }
      // 获取 Dock 图标配置
      if ((window as any).electronAPI?.getDockIconVisible) {
        const visible = await (window as any).electronAPI.getDockIconVisible();
        setShowDockIcon(visible);
      }
    } catch (error) {
      logger.error(`获取应用状态失败: ${error}`);
    }
  };

  // 获取数据
  const fetchData = async () => {
    // 获取向量同步状态
    const syncStatus = await getVectorSyncStatus();
    setSyncProgress(syncStatus);

    // 获取训练统计数据
    const stats = await getTrainingStats();
    setUsageStats(stats);

    // 获取用户设置
    const settings = await getUserSettings();
    setCurrentLocale(settings.locale || 'zh-CN');
    setCurrentTheme(settings.theme || 'light');
    setCurrentModelId(settings.selected_model_id || '');

    // 获取模型列表
    const models = await getModelList();
    setModelList(models);
  };

  useEffect(() => {
    // 初始加载
    fetchAppState();
    fetchData();

    // 1. 轮询 - 每 10 秒重新获取数据
    const pollingInterval = setInterval(() => {
      fetchData();
    }, 10000);

    // 监听点击穿透模式变化
    const unsubscribeClickThrough = (window as any).electronAPI?.onClickThroughChanged?.(
      (enabled: boolean) => {
        setIsClickThrough(enabled);
      },
    );

    // 监听应用显示/隐藏状态变化
    const unsubscribeVisibility = (window as any).electronAPI?.onAppVisibilityChanged?.(
      (visible: boolean) => {
        setIsAppVisible(visible);
      },
    );

    // 2. IPC 事件监听 - 主窗口修改设置后刷新
    const unsubscribeSettings = (window as any).electronAPI?.onSettingsChanged?.(() => {
      fetchData();
    });

    // 3. 托盘菜单显示时刷新
    const unsubscribeTrayShown = (window as any).electronAPI?.onTrayMenuShown?.(() => {
      fetchAppState();
      fetchData();
    });

    // 清理监听器和定时器
    return () => {
      clearInterval(pollingInterval);
      unsubscribeClickThrough?.();
      unsubscribeVisibility?.();
      unsubscribeSettings?.();
      unsubscribeTrayShown?.();
    };
  }, []);

  // 点击外部关闭模型下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShowApp = async () => {
    try {
      await (window as any).electronAPI?.showApp?.();
      setIsAppVisible(true);
    } catch (error) {
      logger.error(`显示应用失败: ${error}`);
    }
  };

  const handleHideApp = async () => {
    try {
      await (window as any).electronAPI?.hideApp?.();
      setIsAppVisible(false);
    } catch (error) {
      logger.error(`隐藏应用失败: ${error}`);
    }
  };

  const handleInteractiveMode = async () => {
    try {
      await (window as any).electronAPI?.setInteractiveMode?.();
      setIsClickThrough(false);
    } catch (error) {
      logger.error(`设置交互模式失败: ${error}`);
    }
  };

  const handleClickThroughMode = async () => {
    try {
      await (window as any).electronAPI?.setClickThroughMode?.();
      setIsClickThrough(true);
    } catch (error) {
      logger.error(`设置穿透模式失败: ${error}`);
    }
  };

  const handleQuit = async () => {
    try {
      await (window as any).electronAPI?.quitApp?.();
    } catch (error) {
      logger.error(`退出应用失败: ${error}`);
    }
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleBack = () => {
    setShowSettings(false);
  };

  const handleToggleDockIcon = async (visible: boolean) => {
    try {
      if ((window as any).electronAPI?.setDockIconVisible) {
        await (window as any).electronAPI.setDockIconVisible(visible);
        setShowDockIcon(visible);
      }
    } catch (error) {
      logger.error(`设置 Dock 图标失败: ${error}`);
    }
  };

  const syncPercentage = syncProgress.total > 0 ? Math.round((syncProgress.synced / syncProgress.total) * 100) : 0;

  // 使用统计 - 简单柱状图
  const barChart = {
    grid: { left: '10%', right: '10%', top: '25%', bottom: '15%' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const param = params[0];
        const units = ['次', '小时', '次/平均'];
        return `${param.name}: ${param.value} ${units[param.dataIndex]}`;
      },
    },
    xAxis: {
      type: 'category',
      data: ['训练', '时长', '对话'],
      axisLabel: { fontSize: 10, color: '#999' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: { show: false },
    series: [
      {
        type: 'bar',
        data: [
          { value: usageStats.interviews, itemStyle: { color: '#667eea' } },
          { value: usageStats.hours, itemStyle: { color: '#764ba2' } },
          { value: usageStats.conversations, itemStyle: { color: '#667eea' } },
        ],
        barWidth: 12,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#333',
        },
      },
    ],
  };

  // 设置页面
  if (showSettings) {
    return (
      <div className="tray-menu-container">
        {/* 设置页面顶部栏 */}
        <div className="tray-header">
          <button className="settings-icon" onClick={handleBack}>
            <ArrowLeft size={16} />
          </button>
          <span className="settings-title">系统偏好设置</span>
          <div style={{ width: 28 }} /> {/* 占位，保持居中 */}
        </div>

        {/* 设置内容 */}
        <div className="settings-content">
          <div className="settings-section">
            <div className="settings-section-title">系统设置</div>

            {/* 大模型 - 放在最上面 */}
            <div className="setting-row">
              <span className="setting-label">大模型:</span>
              <div className="custom-select-wrapper" ref={modelDropdownRef}>
                <div
                  className="custom-select-trigger"
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                >
                  {currentModelId ? (
                    <>
                      {(() => {
                        const model = modelList.find((m) => m.id === currentModelId);
                        const icon = model?.provider ? getProviderIcon(model.provider) : undefined;
                        return (
                          <>
                            {icon && (
                              <img
                                src={`data:image/svg+xml;utf8,${encodeURIComponent(icon)}`}
                                alt=""
                                className="model-icon"
                              />
                            )}
                            <span className="model-name">
                              {model?.name} ({model?.model_name})
                            </span>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="model-placeholder">请选择模型</span>
                  )}
                  <ChevronDown size={14} className="select-arrow" />
                </div>
                {modelDropdownOpen && (
                  <div className="custom-select-dropdown">
                    {modelList.map((model) => {
                      const icon = model.provider ? getProviderIcon(model.provider) : undefined;
                      return (
                        <div
                          key={model.id}
                          className={`custom-select-option ${model.id === currentModelId ? 'selected' : ''}`}
                          onClick={async () => {
                            setCurrentModelId(model.id);
                            setModelDropdownOpen(false);
                            await updateUserSettings({ selected_model_id: model.id });
                          }}
                        >
                          {icon && (
                            <img
                              src={`data:image/svg+xml;utf8,${encodeURIComponent(icon)}`}
                              alt=""
                              className="model-icon"
                            />
                          )}
                          <span className="model-name">
                            {model.name} ({model.model_name})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 语言 */}
            <div className="setting-row">
              <span className="setting-label">语言:</span>
              <div className="select-wrapper">
                <select
                  className="setting-select"
                  value={currentLocale}
                  onChange={async (e) => {
                    const newLocale = e.target.value;
                    setCurrentLocale(newLocale);
                    await updateUserSettings({ locale: newLocale });
                  }}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="en-US">English</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            {/* 主题 */}
            <div className="setting-row">
              <span className="setting-label">主题:</span>
              <div className="theme-buttons">
                <button
                  className={`theme-btn ${currentTheme === 'light' ? 'active' : ''}`}
                  onClick={async () => {
                    setCurrentTheme('light');
                    await updateUserSettings({ theme: 'light' });
                  }}
                >
                  浅色
                </button>
                <button
                  className={`theme-btn ${currentTheme === 'dark' ? 'active' : ''}`}
                  onClick={async () => {
                    setCurrentTheme('dark');
                    await updateUserSettings({ theme: 'dark' });
                  }}
                >
                  深色
                </button>
                <button
                  className={`theme-btn ${currentTheme === 'system' ? 'active' : ''}`}
                  onClick={async () => {
                    setCurrentTheme('system');
                    await updateUserSettings({ theme: 'system' });
                  }}
                >
                  自动
                </button>
              </div>
            </div>

            {/* Dock 图标 */}
            <div className="setting-row">
              <span className="setting-label">Dock 图标:</span>
              <div className="theme-buttons">
                <button
                  className={`theme-btn ${!showDockIcon ? 'active' : ''}`}
                  onClick={() => handleToggleDockIcon(false)}
                >
                  隐藏
                </button>
                <button
                  className={`theme-btn ${showDockIcon ? 'active' : ''}`}
                  onClick={() => handleToggleDockIcon(true)}
                >
                  显示
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主界面
  return (
    <div className="tray-menu-container">
      {/* 顶部栏 */}
      <div className="tray-header">
        <img src={logoBackground} alt="CueMate" className="cuemate-logo" />
        <button className="settings-icon" onClick={handleSettings}>
          <Settings size={16} />
        </button>
      </div>

      {/* 数据图表区域 */}
      <div className="charts-area">
        {/* 左侧卡片 - 同步进度 */}
        <div className="chart-card">
          <div className="card-title">向量知识库</div>
          <div className="card-content sync-progress-content">
            <div className="sync-stats">
              <div className="sync-stat-item">
                <div className="sync-stat-value-fz">{syncProgress.synced}</div>
                <div className="sync-stat-label">已同步</div>
              </div>
              <div className="sync-stat-divider">/</div>
              <div className="sync-stat-item">
                <div className="sync-stat-value">{syncProgress.total}</div>
                <div className="sync-stat-label">总数据量</div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${syncPercentage}%` }} />
              </div>
              <div className="progress-percentage">{syncPercentage}%</div>
            </div>
          </div>
        </div>

        {/* 右侧卡片 - 使用统计 */}
        <div className="chart-card">
          <div className="card-title">使用统计</div>
          <div className="card-content">
            <ReactECharts option={barChart} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* 按钮区域 - 统一卡片 */}
      <div className="buttons-wrapper">
        <div className="buttons-card">
          <div className="card-title">实用工具</div>
          <div className="buttons-grid">
            <button className={`tool-button ${isAppVisible ? 'active' : ''}`} onClick={handleShowApp}>
              <div className="tool-icon">
                <Eye size={16} />
                {isAppVisible && (
                  <div className="check-badge">
                    <Check size={10} />
                  </div>
                )}
              </div>
              <span>显示模式</span>
            </button>

            <button className={`tool-button ${!isAppVisible ? 'active' : ''}`} onClick={handleHideApp}>
              <div className="tool-icon">
                <EyeOff size={16} />
                {!isAppVisible && (
                  <div className="check-badge">
                    <Check size={10} />
                  </div>
                )}
              </div>
              <span>隐藏模式</span>
            </button>

            <button className={`tool-button ${!isClickThrough ? 'active' : ''}`} onClick={handleInteractiveMode}>
              <div className="tool-icon">
                <MousePointer2 size={16} />
                {!isClickThrough && (
                  <div className="check-badge">
                    <Check size={10} />
                  </div>
                )}
              </div>
              <span>交互模式</span>
            </button>

            <button className={`tool-button ${isClickThrough ? 'active' : ''}`} onClick={handleClickThroughMode}>
              <div className="tool-icon">
                <Ghost size={16} />
                {isClickThrough && (
                  <div className="check-badge">
                    <Check size={10} />
                  </div>
                )}
              </div>
              <span>穿透模式</span>
            </button>

            <button className="tool-button" onClick={handleQuit}>
              <div className="tool-icon">
                <LogOut size={16} />
              </div>
              <span>退出</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
