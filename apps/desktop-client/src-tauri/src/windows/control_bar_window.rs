/// 控制栏窗口管理
/// 负责 control-bar 窗口的创建、配置和 NSPanel 转换

use log::{info, error};
use tauri::{AppHandle, Manager, Position, PhysicalPosition};
use tauri_nspanel::WebviewWindowExt;

pub struct ControlBarWindow {
    app_handle: AppHandle,
}

impl ControlBarWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 配置 control-bar 窗口为 NSPanel
    pub fn setup_as_panel(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("control-bar") {
            match window.to_panel() {
                Ok(_panel) => {
                    info!("control-bar 窗口已转换为 NSPanel");
                    
                    // 基本的 NSPanel 配置，避免使用可能导致崩溃的 API
                    info!("control-bar NSPanel 使用基本配置，避免 set_style_mask 和复杂操作");
                    
                    // 确保 always_on_top 设置
                    if let Err(e) = window.set_always_on_top(true) {
                        info!("设置 control-bar always_on_top 失败: {}", e);
                    } else {
                        info!("control-bar NSPanel always_on_top 设置成功");
                    }
                    
                    // 设置窗口位置
                    if let Err(e) = self.position_window(&window) {
                        info!("设置 control-bar 窗口位置失败: {}", e);
                    } else {
                        info!("control-bar NSPanel 位置设置成功");
                    }
                    
                    Ok(())
                }
                Err(e) => {
                    error!("转换 control-bar 为 NSPanel 失败: {}", e);
                    Err(format!("转换 control-bar 为 NSPanel 失败: {}", e))
                }
            }
        } else {
            error!("未找到 control-bar 窗口");
            Err("未找到 control-bar 窗口".to_string())
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
                        info!("获取 control-bar 窗口大小失败: {}", e);
                        return Ok(()); // 跳过位置设置
                    }
                };
                
                let x = (screen_size.width - window_size.width) / 2;
                let y = 100;
                
                if let Err(e) = window.set_position(Position::Physical(PhysicalPosition::new(x as i32, y))) {
                    info!("设置 control-bar 窗口位置失败: {}", e);
                } else {
                    info!("control-bar NSPanel 位置设置成功: x={}, y={}", x, y);
                }
            }
        }
        Ok(())
    }

    /// 显示窗口
    pub fn show(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("control-bar") {
            window.show().map_err(|e| format!("显示 control-bar 失败: {}", e))?;
            info!("control-bar 窗口已显示");
            Ok(())
        } else {
            Err("control-bar 窗口不存在".to_string())
        }
    }

    /// 隐藏窗口
    pub fn hide(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("control-bar") {
            window.hide().map_err(|e| format!("隐藏 control-bar 失败: {}", e))?;
            info!("control-bar 窗口已隐藏");
            Ok(())
        } else {
            Err("control-bar 窗口不存在".to_string())
        }
    }
}