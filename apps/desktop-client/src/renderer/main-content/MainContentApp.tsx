import { useEffect, useState } from 'react';
import CueMate2 from '../../assets/CueMate2.png';

interface MainContentAppProps {}

export function MainContentApp({}: MainContentAppProps = {}) {
  // 圆形图标模式状态 - 默认显示大窗口
  const [isCircleMode, setIsCircleMode] = useState(false);

  // 在小圆模式下为 html 添加 circle-mode 类，触发透明样式
  useEffect(() => {
    if (isCircleMode) {
      document.documentElement.classList.add('circle-mode');
    } else {
      document.documentElement.classList.remove('circle-mode');
    }
    return () => document.documentElement.classList.remove('circle-mode');
  }, [isCircleMode]);

  // 注册全局快捷键和监听主进程事件
  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        if ((window as any).electronAPI) {
          // 监听主进程发送的圆形模式切换事件
          (window as any).electronAPI.onSwitchToCircleMode((_data: { circleSize: number }) => {
            console.log('收到圆形模式切换事件:', _data);
            setIsCircleMode(true);
            document.documentElement.classList.add('circle-mode');
          });

          (window as any).electronAPI.onSwitchToNormalMode(() => {
            console.log('收到正常模式切换事件');
            setIsCircleMode(false);
            document.documentElement.classList.remove('circle-mode');
          });
        }
      } catch (error) {
        console.error(`组件初始化失败: ${error}`);
      }
    };

    setupGlobalShortcut();
  }, []);

  // 圆形图标模式的事件处理
  const handleCircleClick = () => {
    if (isCircleMode && (window as any).electronAPI) {
      // 切换回正常模式
      (window as any).electronAPI.toggleFloatingWindows?.();
    }
  };

  // 如果是圆形图标模式，渲染圆形图标
  if (isCircleMode) {
    return (
      <div 
        className="circle-icon-container"
        onClick={handleCircleClick}
      >
        {/* 圆形图标 */}
        <div className="circle-icon">
          <img 
            src={CueMate2} 
            alt="CueMate" 
            className="circle-icon-logo"
          />
        </div>
      </div>
    );
  }

  // 正常模式渲染web应用（通过iframe）
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src="http://localhost:80"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent'
        }}
        title="CueMate Web App"
      />
    </div>
  );
}
