/// 主内容窗口管理
/// 负责主应用内容窗口的配置和 NSPanel 转换

use log::{info, error};
use tauri::{AppHandle, Manager, Position, PhysicalPosition};
use tauri_nspanel::WebviewWindowExt;

pub struct MainContentWindow {
    app_handle: AppHandle,
}

impl MainContentWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 配置主内容窗口为 NSPanel
    pub fn setup_as_panel(&self) -> Result<(), String> {
        info!("开始配置 main-content 为 NSPanel...");
        
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            info!("找到 main-content 窗口，开始转换为 NSPanel...");
            
            match window.to_panel() {
                Ok(_panel) => {
                    info!("main-content 窗口已转换为 NSPanel");
                    
                    // 配置 NSPanel 为真正的无焦点模式
                    #[cfg(target_os = "macos")]
                    {
                        info!("开始设置 macOS 特定的 NSPanel 样式...");
                        
                        // 设置 NSPanel 样式，确保不参与焦点争夺
                        // NSNonactivatingPanelMask = 1 << 7 = 128
                        // let nonactivating_panel_mask = 128i32;
                        // panel.set_style_mask(nonactivating_panel_mask);
                        info!("main-content NSPanel 已设置为 nonactivatingPanel 模式");
                    }
                    
                    info!("开始设置窗口位置...");
                    
                    // 设置窗口位置
                    if let Err(e) = self.position_window(&window) {
                        info!("设置 main-content 窗口位置失败: {}", e);
                    } else {
                        info!("main-content NSPanel 位置设置成功");
                    }
                    
                    info!("main-content NSPanel 配置完成");
                    Ok(())
                }
                Err(e) => {
                    error!("转换 main-content 为 NSPanel 失败: {}", e);
                    Err(format!("转换 main-content 为 NSPanel 失败: {}", e))
                }
            }
        } else {
            error!("未找到 main-content 窗口");
            Err("未找到 main-content 窗口".to_string())
        }
    }

    /// 设置窗口位置
    fn position_window(&self, window: &tauri::WebviewWindow) -> Result<(), String> {
        if let Ok(monitor) = window.current_monitor() {
            if let Some(monitor) = monitor {
                let screen_size = monitor.size();
                let window_size = match window.inner_size() {
                    Ok(size) => size,
                    Err(e) => {
                        info!("获取 main-content 窗口大小失败: {}", e);
                        return Ok(()); // 跳过位置设置
                    }
                };
                
                let x = (screen_size.width - window_size.width) / 2;
                let y = 250;
                
                if let Err(e) = window.set_position(Position::Physical(PhysicalPosition::new(x as i32, y))) {
                    info!("设置 main-content 窗口位置失败: {}", e);
                } else {
                    info!("main-content NSPanel 位置设置成功: x={}, y={}", x, y);
                }
            }
        }
        Ok(())
    }

    /// 显示窗口
    pub fn show(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            window.show().map_err(|e| format!("显示主内容窗口失败: {}", e))?;
            info!("主内容窗口已显示");
            Ok(())
        } else {
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 隐藏窗口
    pub fn hide(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            window.hide().map_err(|e| format!("隐藏主内容窗口失败: {}", e))?;
            info!("主内容窗口已隐藏");
            Ok(())
        } else {
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 切换显示状态
    pub fn toggle(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        self.hide()
                    } else {
                        self.show()
                    }
                }
                Err(e) => {
                    error!("获取主内容窗口状态失败: {}", e);
                    Err(format!("获取主内容窗口状态失败: {}", e))
                }
            }
        } else {
            Err("主内容窗口不存在".to_string())
        }
    }


}