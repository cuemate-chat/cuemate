/// 关闭按钮窗口管理
/// 负责 close-button 窗口的配置和 NSPanel 转换

use log::{info, error};
use tauri::{AppHandle, Manager, Position, PhysicalPosition};
use tauri_nspanel::WebviewWindowExt;

pub struct CloseButtonWindow {
    app_handle: AppHandle,
}

impl CloseButtonWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 配置 close-button 窗口为 NSPanel
    pub fn setup_as_panel(&self) -> Result<(), String> {
        if let Some(close_window) = self.app_handle.get_webview_window("close-button") {
            match close_window.to_panel() {
                Ok(_close_panel) => {
                    info!("close-button 窗口已转换为 NSPanel");
                    
                    // 基本的 NSPanel 配置，避免使用可能导致崩溃的 API
                    info!("close-button NSPanel 使用基本配置，避免 set_style_mask 和复杂操作");
                    
                    // 确保 always_on_top 设置
                    if let Err(e) = close_window.set_always_on_top(true) {
                        info!("设置 close-button always_on_top 失败: {}", e);
                    }
                    
                    // 自动定位 close-button 到 control-bar 的右侧
                    if let Some(control_window) = self.app_handle.get_webview_window("control-bar") {
                        if let (Ok(control_position), Ok(control_size)) = (control_window.outer_position(), control_window.inner_size()) {
                            let close_x = control_position.x + control_size.width as i32;
                            let close_y = control_position.y; // 使用相同的 y 坐标，确保在同一行
                            
                            info!("自动定位 close-button: x={}, y={} (control-bar: x={}, y={}, width={})", 
                                  close_x, close_y, control_position.x, control_position.y, control_size.width);
                            
                            if let Err(e) = close_window.set_position(Position::Physical(PhysicalPosition::new(close_x, close_y))) {
                                info!("设置 close-button 窗口位置失败: {}", e);
                            } else {
                                info!("close-button NSPanel 位置设置成功: x={}, y={}", close_x, close_y);
                            }
                        } else {
                            info!("无法获取 control-bar 位置信息，使用默认位置");
                            // 如果无法获取 control-bar 位置，使用默认位置
                            let default_x = 960; // 假设 control-bar 居中在 600，宽度 360，所以 close-button 在 960
                            let default_y = 100;
                            
                            if let Err(e) = close_window.set_position(Position::Physical(PhysicalPosition::new(default_x, default_y))) {
                                info!("设置 close-button 默认位置失败: {}", e);
                            } else {
                                info!("close-button 使用默认位置: x={}, y={}", default_x, default_y);
                            }
                        }
                    } else {
                        info!("control-bar 窗口不存在，使用默认位置");
                        // 如果 control-bar 不存在，使用默认位置
                        let default_x = 960;
                        let default_y = 100;
                        
                        if let Err(e) = close_window.set_position(Position::Physical(PhysicalPosition::new(default_x, default_y))) {
                            info!("设置 close-button 默认位置失败: {}", e);
                        } else {
                            info!("close-button 使用默认位置: x={}, y={}", default_x, default_y);
                        }
                    }
                    
                    Ok(())
                }
                Err(e) => {
                    error!("转换 close-button 为 NSPanel 失败: {}", e);
                    Err(format!("转换 close-button 为 NSPanel 失败: {}", e))
                }
            }
        } else {
            error!("未找到 close-button 窗口");
            Err("未找到 close-button 窗口".to_string())
        }
    }

    /// 显示窗口
    pub fn show(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("close-button") {
            window.show().map_err(|e| format!("显示 close-button 失败: {}", e))?;
            info!("close-button 窗口已显示");
            Ok(())
        } else {
            Err("close-button 窗口不存在".to_string())
        }
    }

    /// 隐藏窗口
    pub fn hide(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("close-button") {
            window.hide().map_err(|e| format!("隐藏 close-button 失败: {}", e))?;
            info!("close-button 窗口已隐藏");
            Ok(())
        } else {
            Err("close-button 窗口不存在".to_string())
        }
    }
}